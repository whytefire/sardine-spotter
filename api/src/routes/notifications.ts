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

    const pool = await getPool();
    await pool
      .request()
      .input("userId", req.user!.userId)
      .input("endpoint", endpoint)
      .input("p256dh", keys.p256dh)
      .input("auth", keys.auth)
      .query(
        `UPDATE Users
         SET push_endpoint = @endpoint, push_p256dh = @p256dh, push_auth = @auth
         WHERE id = @userId`
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Subscribe push error:", err);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

router.post("/unsubscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", req.user!.userId)
      .query(
        "UPDATE Users SET push_endpoint = NULL, push_p256dh = NULL, push_auth = NULL WHERE id = @userId"
      );

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

    const whereClause = unread_only === "true" ? "AND n.is_read = 0" : "";

    const result = await pool
      .request()
      .input("userId", req.user!.userId)
      .query(`
        SELECT n.id, n.is_read, n.created_at,
               s.id as sighting_id, s.description, s.latitude, s.longitude,
               s.category, s.photo_url, s.created_at as sighting_created_at,
               u.nickname, u.avatar_url
        FROM Notifications n
        JOIN Sightings s ON n.sighting_id = s.id
        JOIN Users u ON s.user_id = u.id
        WHERE n.user_id = @userId ${whereClause}
        ORDER BY n.created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id,
        read: row.is_read,
        createdAt: row.created_at,
        sighting: {
          id: row.sighting_id,
          description: row.description,
          latitude: row.latitude,
          longitude: row.longitude,
          category: row.category,
          photoUrl: row.photo_url,
          createdAt: row.sighting_created_at,
          nickname: row.nickname,
          avatarUrl: row.avatar_url,
        },
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
