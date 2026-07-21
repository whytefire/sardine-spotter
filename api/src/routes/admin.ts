import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/roles";
import { getPool } from "../config/database";

const router = Router();

router.get("/users", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT id, email, nickname, role, radius, is_active, ban_reason,
              created_at, last_active
       FROM Users
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        email: r.email,
        nickname: r.nickname,
        role: r.role,
        radius: r.radius,
        isActive: r.is_active,
        banReason: r.ban_reason,
        createdAt: r.created_at,
        lastActive: r.last_active,
      })),
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.put("/users/:id/role", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ["admin", "user"];

    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
      return;
    }

    const pool = await getPool();
    await pool.query("UPDATE Users SET role = $1 WHERE id = $2", [
      role,
      Number(req.params.id),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

router.put("/users/:id/ban", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user!.userId) {
      res.status(400).json({ error: "Cannot ban your own account" });
      return;
    }
    const reason: string = req.body?.reason?.trim() || "Banned by administrator";
    const pool = await getPool();
    await pool.query(
      "UPDATE Users SET is_active = FALSE, ban_reason = $1 WHERE id = $2",
      [reason, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Ban user error:", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

router.put("/users/:id/unban", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    await pool.query(
      "UPDATE Users SET is_active = TRUE, ban_reason = NULL WHERE id = $1",
      [Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Unban user error:", err);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

router.delete("/users/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Number(req.params.id);

    if (targetId === req.user!.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const pool = await getPool();
    await pool.query("DELETE FROM Users WHERE id = $1", [targetId]);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.put("/users/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role, nickname } = req.body ?? {};
    const validRoles = ["admin", "user"];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
      return;
    }
    const pool = await getPool();
    await pool.query(
      `UPDATE Users SET
         role     = COALESCE($1, role),
         nickname = COALESCE($2, nickname)
       WHERE id = $3`,
      [role ?? null, nickname?.trim() ?? null, Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/sightings", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT s.id, s.description, s.latitude, s.longitude, s.category,
              s.photo_url, s.is_active, s.created_at,
              u.nickname, u.id AS user_id,
              (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id)::int AS comment_count,
              (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id)::int AS like_count
         FROM Sightings s
         JOIN Users u ON u.id = s.user_id
        ORDER BY s.is_active DESC, s.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        description: r.description,
        latitude: r.latitude,
        longitude: r.longitude,
        category: r.category,
        photoUrl: r.photo_url,
        isActive: r.is_active,
        createdAt: r.created_at,
        userId: r.user_id,
        nickname: r.nickname,
        commentCount: r.comment_count,
        likeCount: r.like_count,
      })),
    });
  } catch (err) {
    console.error("Admin list sightings error:", err);
    res.status(500).json({ error: "Failed to list sightings" });
  }
});

router.put("/sightings/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.body ?? {};
    if (!description?.trim()) {
      res.status(400).json({ error: "Description is required" });
      return;
    }
    const pool = await getPool();
    await pool.query(
      "UPDATE Sightings SET description = $1 WHERE id = $2",
      [description.trim(), Number(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update sighting error:", err);
    res.status(500).json({ error: "Failed to update sighting" });
  }
});

router.get("/moderation-log", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = Number(req.query.before) || 0;

    const pool = await getPool();
    const result = await pool.query(
      `SELECT ml.id,
              ml.moderator_id,
              ml.moderator_role,
              ml.action,
              ml.target_kind,
              ml.target_id,
              ml.target_user_id,
              ml.target_snapshot,
              ml.reason,
              ml.created_at,
              mod.nickname AS moderator_nickname,
              author.nickname AS target_author_nickname
         FROM ModerationLog ml
         LEFT JOIN Users mod    ON mod.id    = ml.moderator_id
         LEFT JOIN Users author ON author.id = ml.target_user_id
        WHERE ($1 = 0 OR ml.id < $1)
        ORDER BY ml.id DESC
        LIMIT $2`,
      [before, limit]
    );

    res.json({
      success: true,
      data: result.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        moderatorId: r.moderator_id,
        moderatorRole: r.moderator_role,
        moderatorNickname: r.moderator_nickname,
        action: r.action,
        targetKind: r.target_kind,
        targetId: r.target_id,
        targetUserId: r.target_user_id,
        targetAuthorNickname: r.target_author_nickname,
        targetSnapshot:
          typeof r.target_snapshot === "string"
            ? safeJson(r.target_snapshot)
            : r.target_snapshot,
        reason: r.reason,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("Get moderation log error:", err);
    res.status(500).json({ error: "Failed to load moderation log" });
  }
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export default router;
