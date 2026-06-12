import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { notifyNewSighting } from "../services/notifications";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius = 50, page = 1, limit = 20 } = req.query;
    const pool = await getPool();

    const offset = (Number(page) - 1) * Number(limit);

    let query: string;
    const request = pool.request()
      .input("limit", Number(limit))
      .input("offset", offset);

    if (lat && lng) {
      query = `
        SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) as comment_count,
          geography::Point(s.latitude, s.longitude, 4326).STDistance(
            geography::Point(@lat, @lng, 4326)
          ) / 1000.0 as distance_km
        FROM Sightings s
        JOIN Users u ON s.user_id = u.id
        WHERE s.created_at >= DATEADD(hour, -24, GETDATE())
          AND geography::Point(s.latitude, s.longitude, 4326).STDistance(
            geography::Point(@lat, @lng, 4326)
          ) / 1000.0 <= @radius
        ORDER BY s.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
      request.input("lat", Number(lat));
      request.input("lng", Number(lng));
      request.input("radius", Number(radius));
    } else {
      query = `
        SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) as comment_count
        FROM Sightings s
        JOIN Users u ON s.user_id = u.id
        WHERE s.created_at >= DATEADD(hour, -24, GETDATE())
        ORDER BY s.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
    }

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
        id: row.id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
        photoUrl: row.photo_url,
        category: row.category,
        createdAt: row.created_at,
        distanceKm: row.distance_km ?? null,
        commentCount: row.comment_count,
      })),
    });
  } catch (err) {
    console.error("Get sightings error:", err);
    res.status(500).json({ error: "Failed to get sightings" });
  }
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { description, latitude, longitude, category, photoUrl } = req.body;

    if (!description || !latitude || !longitude) {
      res.status(400).json({ error: "Description and location are required" });
      return;
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("userId", req.user!.userId)
      .input("description", description)
      .input("latitude", latitude)
      .input("longitude", longitude)
      .input("category", category || "sardine_sighting")
      .input("photoUrl", photoUrl || null)
      .query(
        `INSERT INTO Sightings (user_id, description, latitude, longitude, category, photo_url, created_at)
         OUTPUT INSERTED.id, INSERTED.created_at
         VALUES (@userId, @description, @latitude, @longitude, @category, @photoUrl, GETDATE())`
      );

    const sighting = result.recordset[0];

    // Fetch the user's nickname for the notification
    const userResult = await pool
      .request()
      .input("uid", req.user!.userId)
      .query("SELECT nickname FROM Users WHERE id = @uid");
    const nickname = userResult.recordset[0]?.nickname || "Someone";

    // Fire-and-forget: in-app + push to every other active user
    notifyNewSighting({
      id: sighting.id,
      userId: req.user!.userId,
      nickname,
      description,
    }).catch((err) => console.error("Push notification error:", err));

    res.status(201).json({
      success: true,
      data: {
        id: sighting.id,
        userId: req.user!.userId,
        description,
        latitude,
        longitude,
        category: category || "sardine_sighting",
        photoUrl: photoUrl || null,
        createdAt: sighting.created_at,
      },
    });
  } catch (err) {
    console.error("Create sighting error:", err);
    res.status(500).json({ error: "Failed to create sighting" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", Number(req.params.id))
      .query(
        `SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) as comment_count
         FROM Sightings s
         JOIN Users u ON s.user_id = u.id
         WHERE s.id = @id`
      );

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const row = result.recordset[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
        photoUrl: row.photo_url,
        category: row.category,
        createdAt: row.created_at,
        commentCount: row.comment_count,
      },
    });
  } catch (err) {
    console.error("Get sighting error:", err);
    res.status(500).json({ error: "Failed to get sighting" });
  }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();

    const check = await pool
      .request()
      .input("id", Number(req.params.id))
      .input("userId", req.user!.userId)
      .query(
        `SELECT id, user_id FROM Sightings WHERE id = @id`
      );

    if (check.recordset.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    if (check.recordset[0].user_id !== req.user!.userId && req.user!.role !== "god" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Not authorized to delete this sighting" });
      return;
    }

    await pool
      .request()
      .input("id", Number(req.params.id))
      .query("DELETE FROM Sightings WHERE id = @id");

    res.json({ success: true });
  } catch (err) {
    console.error("Delete sighting error:", err);
    res.status(500).json({ error: "Failed to delete sighting" });
  }
});

export default router;
