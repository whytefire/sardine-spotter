import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPool } from "../config/database";

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.split(" ")[1];

  let payload: AuthPayload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Check the user is still active on every authenticated request so a ban
  // takes effect immediately — the banned user's next API call gets a 403
  // and the frontend clears their session and redirects to login.
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", payload.userId)
      .query("SELECT is_active, ban_reason FROM Users WHERE id = @id");

    const row = result.recordset[0];
    if (!row || !row.is_active) {
      res.status(403).json({
        error: "banned",
        banReason: row?.ban_reason || "Your account has been suspended.",
      });
      return;
    }
  } catch {
    // If the DB check fails for any reason, still allow the request through
    // rather than locking everyone out during a connectivity blip.
  }

  req.user = payload;
  next();
}

/**
 * Like `authenticate`, but doesn't 401 when the caller is anonymous.
 * Sets `req.user` when a valid token is present, otherwise leaves it undefined.
 * Use on endpoints that need to vary their response by login state (e.g.
 * "did THIS user like this sighting?") but still work for guests.
 */
export function authenticateOptional(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as AuthPayload;
  } catch {
    // Bad/expired token on an OPTIONAL endpoint is treated like "no token".
  }
  next();
}

export function generateToken(payload: AuthPayload, rememberMe = false): string {
  const defaultExpiry = process.env.JWT_EXPIRES_IN || "7d";
  const expiresIn = (rememberMe ? "30d" : defaultExpiry) as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, process.env.JWT_SECRET || "fallback-secret", {
    expiresIn,
  });
}
