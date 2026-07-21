import { Router, Response } from "express";
import { authenticate, authenticateOptional, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { notifyNewComment } from "../services/notifications";
import { logModeration } from "../services/moderation";
import { censor } from "../lib/profanity";

const router = Router();

router.get("/:sightingId", authenticateOptional, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool.query(
      `SELECT c.*, u.nickname, u.avatar_url
       FROM Comments c
       JOIN Users u ON c.user_id = u.id
       WHERE c.sighting_id = $1
       ORDER BY c.created_at ASC`,
      [Number(req.params.sightingId)]
    );

    const isAdmin = (req as AuthRequest).user?.role === "admin";

    res.json({
      success: true,
      data: result.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        sightingId: row.sighting_id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        text: isAdmin ? row.text : censor(row.text as string),
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Failed to get comments" });
  }
});

router.post("/:sightingId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }

    const pool = await getPool();

    const result = await pool.query(
      `INSERT INTO Comments (sighting_id, user_id, text, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, created_at`,
      [Number(req.params.sightingId), req.user!.userId, text.trim()]
    );

    const comment = result.rows[0];

    const actorResult = await pool.query(
      "SELECT nickname FROM Users WHERE id = $1",
      [req.user!.userId]
    );
    const actorNickname = actorResult.rows[0]?.nickname || "Someone";

    notifyNewComment({
      id: comment.id,
      sightingId: Number(req.params.sightingId),
      actorUserId: req.user!.userId,
      actorNickname,
      text: text.trim(),
    }).catch((err) => console.error("Comment notification error:", err));

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        sightingId: Number(req.params.sightingId),
        userId: req.user!.userId,
        text: text.trim(),
        createdAt: comment.created_at,
      },
    });
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = Number(req.params.id);
    if (!Number.isFinite(commentId)) {
      res.status(400).json({ error: "Invalid comment id" });
      return;
    }

    const pool = await getPool();
    const lookup = await pool.query(
      `SELECT id, sighting_id, user_id, text, created_at
       FROM Comments WHERE id = $1`,
      [commentId]
    );

    if (lookup.rows.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const row = lookup.rows[0];
    const isOwner = row.user_id === req.user!.userId;
    const isModerator = req.user!.role === "admin";

    if (!isOwner && !isModerator) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    await pool.query("DELETE FROM Notifications WHERE comment_id = $1", [commentId]);
    await pool.query("DELETE FROM Comments WHERE id = $1", [commentId]);

    if (isModerator && !isOwner) {
      logModeration({
        moderatorId: req.user!.userId,
        moderatorRole: req.user!.role,
        action: "delete_comment",
        targetKind: "comment",
        targetId: row.id,
        targetUserId: row.user_id,
        targetSnapshot: {
          sightingId: row.sighting_id,
          text: row.text,
          createdAt: row.created_at,
        },
        reason: typeof req.body?.reason === "string" ? req.body.reason : null,
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
