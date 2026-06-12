import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function requireGod(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "god") {
    res.status(403).json({ error: "God mode access required" });
    return;
  }
  next();
}

export function requireAdminOrGod(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "god" && req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
