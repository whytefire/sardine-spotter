import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { getVapidPublicKey } from "../services/notifications";

const router = Router();

router.get("/vapid-key", (_req, res: Response) => {
  res.json({ success: true, data: { publicKey: getVapidPublicKey() } });
});

router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid push subscription" });
      return;
    }

    const userAgent = req.get("user-agent")?.substring(0, 500) || null;
    const pool = await getPool();

    // Upsert — same endpoint never duplicates, key rotations are picked up
    await pool.query(
      `INSERT INTO PushSubscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id      = EXCLUDED.user_id,
         p256dh       = EXCLUDED.p256dh,
         auth         = EXCLUDED.auth,
         user_agent   = EXCLUDED.user_agent,
         last_used_at = NOW()`,
      [req.user!.userId, endpoint, keys.p256dh, keys.auth, userAgent]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Subscribe push error:", err);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

router.post("/unsubscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body ?? {};
    const pool = await getPool();

    if (endpoint) {
      await pool.query(
        "DELETE FROM PushSubscriptions WHERE user_id = $1 AND endpoint = $2",
        [req.user!.userId, endpoint]
      );
    } else {
      await pool.query(
        "DELETE FROM PushSubscriptions WHERE user_id = $1",
        [req.user!.userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe push error:", err);
    res.status(500).json({ error: "Failed to remove push subscription" });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { unread_only } = req.query;
    const pool = await getPool();

    const whereClause = unread_only === "true" ? "AND n.is_read = FALSE" : "";

    const result = await pool.query(
      `SELECT n.id, n.is_read, n.created_at, n.kind, n.comment_id,
              actor.id AS actor_id, actor.nickname AS actor_nickname, actor.avatar_url AS actor_avatar,
              s.id AS sighting_id, s.description AS sighting_description,
              s.latitude, s.longitude, s.category, s.photo_url,
              s.created_at AS sighting_created_at,
              s.user_id AS sighting_user_id,
              author.nickname AS sighting_author_nickname,
              author.avatar_url AS sighting_author_avatar,
              c.text AS comment_text
         FROM Notifications n
         JOIN Sightings s ON n.sighting_id = s.id
         JOIN Users author ON s.user_id = author.id
    LEFT JOIN Users actor ON n.actor_id = actor.id
    LEFT JOIN Comments c ON n.comment_id = c.id
        WHERE n.user_id = $1 ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT 100`,
      [req.user!.userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        read: !!row.is_read,
        createdAt: row.created_at,
        kind: row.kind || "sighting",
        actor: row.actor_id
          ? {
              id: row.actor_id,
              nickname: row.actor_nickname,
              avatarUrl: row.actor_avatar,
            }
          : null,
        sighting: {
          id: row.sighting_id,
          description: row.sighting_description,
          latitude: row.latitude,
          longitude: row.longitude,
          category: row.category,
          photoUrl: row.photo_url,
          createdAt: row.sighting_created_at,
          nickname: row.sighting_author_nickname,
          avatarUrl: row.sighting_author_avatar,
        },
        comment:
          row.kind === "comment" && row.comment_id
            ? { id: row.comment_id, text: row.comment_text }
            : null,
      })),
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

router.put("/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    await pool.query(
      "UPDATE Notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
      [req.user!.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.put("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    await pool.query(
      "UPDATE Notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [Number(req.params.id), req.user!.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
