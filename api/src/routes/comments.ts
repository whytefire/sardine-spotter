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

    const isAdmin = (req as AuthRequest).user?.role === "admin";

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id,
        sightingId: row.sighting_id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        // Admins see the original text; everyone else gets a censored copy
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

/**
 * Delete a comment. Allowed if either:
 *   - the caller authored the comment, OR
 *   - the caller is an admin (community moderation).
 *
 * When a moderator removes someone else's comment we record the action
 * in ModerationLog so the deletion is auditable. The comment row is
 * hard-deleted; ON DELETE CASCADE on Notifications.comment_id (see
 * migration 003) cleans up any "X commented on your sighting" rows.
 *
 * Body (optional):
 *   { reason?: string }   moderator's note, stored on the audit log
 */
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = Number(req.params.id);
    if (!Number.isFinite(commentId)) {
      res.status(400).json({ error: "Invalid comment id" });
      return;
    }

    const pool = await getPool();
    const lookup = await pool
      .request()
      .input("id", commentId)
      .query(
        `SELECT id, sighting_id, user_id, text, created_at
           FROM Comments WHERE id = @id`
      );

    if (lookup.recordset.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const row = lookup.recordset[0];
    const isOwner = row.user_id === req.user!.userId;
    const isModerator = req.user!.role === "admin";

    if (!isOwner && !isModerator) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    // Tidy up notifications that point at this comment first. The FK on
    // Notifications.comment_id is ON DELETE SET NULL (not CASCADE — see the
    // explainer in schema.sql), so if we skipped this we'd be left with
    // "X commented on your sighting" rows whose comment_id is null and that
    // can't be opened. Removing them keeps the inbox tidy.
    await pool
      .request()
      .input("id", commentId)
      .query("DELETE FROM Notifications WHERE comment_id = @id");

    await pool
      .request()
      .input("id", commentId)
      .query("DELETE FROM Comments WHERE id = @id");

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
