import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { getVapidPublicKey } from "../services/notifications";

const router = Router();

router.get("/vapid-key", (_req, res: Response) => {
  res.json({ success: true, data: { publicKey: getVapidPublicKey() } });
});

/**
 * Save a push subscription for the current device.
 * Uses endpoint as the unique key — same device hitting subscribe twice is a
 * no-op (keys may rotate so we update them). Different devices for the same
 * user produce different rows.
 */
router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid push subscription" });
      return;
    }

    const userAgent = req.get("user-agent")?.substring(0, 500) || null;
    const pool = await getPool();

    // MERGE so the same endpoint never duplicates, and key rotations are picked up.
    await pool
      .request()
      .input("userId", req.user!.userId)
      .input("endpoint", endpoint)
      .input("p256dh", keys.p256dh)
      .input("auth", keys.auth)
      .input("userAgent", userAgent)
      .query(`
        MERGE PushSubscriptions AS target
        USING (SELECT @endpoint AS endpoint) AS src
           ON target.endpoint = src.endpoint
        WHEN MATCHED THEN UPDATE SET
              user_id      = @userId,
              p256dh       = @p256dh,
              auth         = @auth,
              user_agent   = @userAgent,
              last_used_at = GETDATE()
        WHEN NOT MATCHED THEN INSERT (user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
              VALUES (@userId, @endpoint, @p256dh, @auth, @userAgent, GETDATE(), GETDATE());
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Subscribe push error:", err);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

/**
 * Remove a push subscription.
 *   - If body contains an endpoint, only that device is unsubscribed.
 *   - If no endpoint is supplied (legacy), ALL of the user's subscriptions
 *     are cleared.
 */
router.post("/unsubscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body ?? {};
    const pool = await getPool();

    if (endpoint) {
      await pool
        .request()
        .input("userId", req.user!.userId)
        .input("endpoint", endpoint)
        .query(
          "DELETE FROM PushSubscriptions WHERE user_id = @userId AND endpoint = @endpoint"
        );
    } else {
      await pool
        .request()
        .input("userId", req.user!.userId)
        .query("DELETE FROM PushSubscriptions WHERE user_id = @userId");
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe push error:", err);
    res.status(500).json({ error: "Failed to remove push subscription" });
  }
});

/**
 * List the current user's in-app notifications.
 * Returns both kinds ('sighting' and 'comment') in a unified envelope.
 */
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { unread_only } = req.query;
    const pool = await getPool();

    const whereClause = unread_only === "true" ? "AND n.is_read = 0" : "";

    const result = await pool
      .request()
      .input("userId", req.user!.userId)
      .query(`
        SELECT TOP 100
               n.id, n.is_read, n.created_at, n.kind, n.comment_id,
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
         WHERE n.user_id = @userId ${whereClause}
         ORDER BY n.created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
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
          // For "X commented on Y's sighting", we expose the sighting author here
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
    await pool
      .request()
      .input("userId", req.user!.userId)
      .query("UPDATE Notifications SET is_read = 1 WHERE user_id = @userId AND is_read = 0");

    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.put("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("id", Number(req.params.id))
      .input("userId", req.user!.userId)
      .query("UPDATE Notifications SET is_read = 1 WHERE id = @id AND user_id = @userId");

    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
