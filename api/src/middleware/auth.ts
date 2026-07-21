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
  // takes effect immediately.
  try {
    const pool = await getPool();
    const result = await pool.query(
      "SELECT is_active, ban_reason FROM Users WHERE id = $1",
      [payload.userId]
    );

    const row = result.rows[0];
    if (!row || !row.is_active) {
      res.status(403).json({
        error: "banned",
        banReason: row?.ban_reason || "Your account has been suspended.",
      });
      return;
    }
  } catch {
    // If the DB check fails, still allow the request through.
  }

  req.user = payload;
  next();
}

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
