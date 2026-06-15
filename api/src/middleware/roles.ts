import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Gate an endpoint to admins only. Use after `authenticate` so `req.user`
 * is populated. A non-admin caller gets HTTP 403.
 *
 * SardineWatch only has two roles — admin and user — so this is the
 * single role-check middleware the codebase needs.
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
