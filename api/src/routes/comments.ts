import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { notifyNewComment } from "../services/notifications";

const router = Router();

router.get("/:sightingId", async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("sightingId", Number(req.params.sightingId))
      .query(
        `SELECT c.*, u.nickname, u.avatar_url
         FROM Comments c
         JOIN Users u ON c.user_id = u.id
         WHERE c.sighting_id = @sightingId
         ORDER BY c.created_at ASC`
      );

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id,
        sightingId: row.sighting_id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        text: row.text,
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

    const result = await pool
      .request()
      .input("sightingId", Number(req.params.sightingId))
      .input("userId", req.user!.userId)
      .input("text", text.trim())
      .query(
        `INSERT INTO Comments (sighting_id, user_id, text, created_at)
         OUTPUT INSERTED.id, INSERTED.created_at
         VALUES (@sightingId, @userId, @text, GETDATE())`
      );

    const comment = result.recordset[0];

    // Look up the commenter's nickname for the push payload
    const actorResult = await pool
      .request()
      .input("uid", req.user!.userId)
      .query("SELECT nickname FROM Users WHERE id = @uid");
    const actorNickname = actorResult.recordset[0]?.nickname || "Someone";

    // Fire-and-forget: in-app + push to sighting author + previous commenters
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

export default router;
