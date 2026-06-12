import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireGod, requireAdminOrGod } from "../middleware/roles";
import { getPool } from "../config/database";

const router = Router();

router.get(
  "/users",
  authenticate,
  requireAdminOrGod,
  async (req: AuthRequest, res: Response) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(
        `SELECT id, email, nickname, role, radius, is_active, created_at, last_active
         FROM Users
         ORDER BY created_at DESC`
      );

      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error("List users error:", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  }
);

router.put(
  "/users/:id/role",
  authenticate,
  requireGod,
  async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      const validRoles = ["god", "admin", "user"];

      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
        return;
      }

      const pool = await getPool();
      await pool
        .request()
        .input("id", Number(req.params.id))
        .input("role", role)
        .query("UPDATE Users SET role = @role WHERE id = @id");

      res.json({ success: true });
    } catch (err) {
      console.error("Update role error:", err);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }
);

router.put(
  "/users/:id/toggle-active",
  authenticate,
  requireGod,
  async (req: AuthRequest, res: Response) => {
    try {
      const pool = await getPool();
      await pool
        .request()
        .input("id", Number(req.params.id))
        .query("UPDATE Users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = @id");

      res.json({ success: true });
    } catch (err) {
      console.error("Toggle active error:", err);
      res.status(500).json({ error: "Failed to toggle user" });
    }
  }
);

router.delete(
  "/users/:id",
  authenticate,
  requireGod,
  async (req: AuthRequest, res: Response) => {
    try {
      const targetId = Number(req.params.id);

      if (targetId === req.user!.userId) {
        res.status(400).json({ error: "Cannot delete your own account" });
        return;
      }

      const pool = await getPool();
      await pool
        .request()
        .input("id", targetId)
        .query("DELETE FROM Users WHERE id = @id");

      res.json({ success: true });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

export default router;
