import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
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

export function generateToken(payload: AuthPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, process.env.JWT_SECRET || "fallback-secret", {
    expiresIn,
  });
}
