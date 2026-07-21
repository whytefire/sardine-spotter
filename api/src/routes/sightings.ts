import { Router, Response } from "express";
import { authenticate, authenticateOptional, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { notifyNewSighting, notifyNewLike } from "../services/notifications";
import { logModeration } from "../services/moderation";
import { censor } from "../lib/profanity";

const router = Router();

router.get("/", authenticateOptional, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, page = 1, limit = 20 } = req.query;
    const pool = await getPool();

    const offset = (Number(page) - 1) * Number(limit);
    const viewerId = req.user?.userId ?? 0;

    let result;

    if (lat && lng) {
      // Use Haversine formula for distance calculation (no PostGIS needed)
      result = await pool.query(
        `SELECT s.*, u.nickname, u.avatar_url,
           (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id)::int AS comment_count,
           (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id)::int AS like_count,
           EXISTS (
             SELECT 1 FROM SightingLikes l
             WHERE l.sighting_id = s.id AND l.user_id = $3
           ) AS liked_by_me,
           6371 * acos(
             LEAST(1, cos(radians($1)) * cos(radians(s.latitude))
               * cos(radians(s.longitude) - radians($2))
               + sin(radians($1)) * sin(radians(s.latitude)))
           ) AS distance_km
         FROM Sightings s
         JOIN Users u ON s.user_id = u.id
         WHERE s.is_active = TRUE
           AND (s.is_pinned = TRUE OR s.created_at >= NOW() - INTERVAL '48 hours')
         ORDER BY s.is_pinned DESC, s.created_at DESC
         LIMIT $4 OFFSET $5`,
        [Number(lat), Number(lng), viewerId, Number(limit), offset]
      );
    } else {
      result = await pool.query(
        `SELECT s.*, u.nickname, u.avatar_url,
           (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id)::int AS comment_count,
           (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id)::int AS like_count,
           EXISTS (
             SELECT 1 FROM SightingLikes l
             WHERE l.sighting_id = s.id AND l.user_id = $1
           ) AS liked_by_me
         FROM Sightings s
         JOIN Users u ON s.user_id = u.id
         WHERE s.is_active = TRUE
           AND (s.is_pinned = TRUE OR s.created_at >= NOW() - INTERVAL '48 hours')
         ORDER BY s.is_pinned DESC, s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [viewerId, Number(limit), offset]
      );
    }

    const isAdmin = req.user?.role === "admin";

    res.json({
      success: true,
      data: result.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        description: isAdmin ? row.description : censor(row.description as string),
        latitude: row.latitude,
        longitude: row.longitude,
        photoUrl: row.photo_url,
        category: row.category,
        createdAt: row.created_at,
        distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
        commentCount: row.comment_count,
        likeCount: row.like_count,
        likedByMe: !!row.liked_by_me,
        isPinned: !!row.is_pinned,
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

    const result = await pool.query(
      `INSERT INTO Sightings (user_id, description, latitude, longitude, category, photo_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, created_at`,
      [
        req.user!.userId,
        description,
        latitude,
        longitude,
        category || "sardine_sighting",
        photoUrl || null,
      ]
    );

    const sighting = result.rows[0];

    const userResult = await pool.query(
      "SELECT nickname FROM Users WHERE id = $1",
      [req.user!.userId]
    );
    const nickname = userResult.rows[0]?.nickname || "Someone";

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

/**
 * Edit a sighting's description, photo, or category.
 * Allowed for the original reporter and for admins.
 * Does NOT send push notifications.
 */
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    if (!Number.isFinite(sightingId)) {
      res.status(400).json({ error: "Invalid sighting id" });
      return;
    }

    const pool = await getPool();

    const check = await pool.query(
      "SELECT id, user_id FROM Sightings WHERE id = $1 AND is_active = TRUE",
      [sightingId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const isOwner = check.rows[0].user_id === req.user!.userId;
    const isAdmin = req.user!.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Not authorized to edit this sighting" });
      return;
    }

    const { description, photoUrl, category } = req.body;

    if (description !== undefined && description.trim().length < 10) {
      res.status(400).json({ error: "Description must be at least 10 characters" });
      return;
    }

    const setParts: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (description !== undefined) {
      setParts.push(`description = $${idx++}`);
      values.push(description.trim());
    }
    if (photoUrl !== undefined) {
      setParts.push(`photo_url = $${idx++}`);
      values.push(photoUrl || null);
    }
    if (category !== undefined) {
      setParts.push(`category = $${idx++}`);
      values.push(category);
    }

    if (setParts.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    values.push(sightingId);
    await pool.query(
      `UPDATE Sightings SET ${setParts.join(", ")} WHERE id = $${idx}`,
      values
    );

    const updated = await pool.query(
      "SELECT * FROM Sightings WHERE id = $1",
      [sightingId]
    );

    const row = updated.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        description: row.description,
        photoUrl: row.photo_url,
        category: row.category,
      },
    });
  } catch (err) {
    console.error("Edit sighting error:", err);
    res.status(500).json({ error: "Failed to edit sighting" });
  }
});

router.get("/:id", authenticateOptional, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const viewerId = req.user?.userId ?? 0;

    const result = await pool.query(
      `SELECT s.*, u.nickname, u.avatar_url,
         (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id)::int AS comment_count,
         (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id)::int AS like_count,
         EXISTS (
           SELECT 1 FROM SightingLikes l
           WHERE l.sighting_id = s.id AND l.user_id = $2
         ) AS liked_by_me
       FROM Sightings s
       JOIN Users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.is_active = TRUE`,
      [Number(req.params.id), viewerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const row = result.rows[0];
    const isAdmin = req.user?.role === "admin";
    res.json({
      success: true,
      data: {
        id: row.id,
        userId: row.user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        description: isAdmin ? row.description : censor(row.description as string),
        latitude: row.latitude,
        longitude: row.longitude,
        photoUrl: row.photo_url,
        category: row.category,
        createdAt: row.created_at,
        commentCount: row.comment_count,
        likeCount: row.like_count,
        likedByMe: !!row.liked_by_me,
      },
    });
  } catch (err) {
    console.error("Get sighting error:", err);
    res.status(500).json({ error: "Failed to get sighting" });
  }
});

router.post("/:id/like", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    const userId = req.user!.userId;
    const pool = await getPool();

    const check = await pool.query(
      "SELECT user_id FROM Sightings WHERE id = $1",
      [sightingId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const authorId = check.rows[0].user_id as number;

    // INSERT ... ON CONFLICT DO NOTHING is idempotent
    const inserted = await pool.query(
      `INSERT INTO SightingLikes (sighting_id, user_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (sighting_id, user_id) DO NOTHING
       RETURNING id`,
      [sightingId, userId]
    );

    if (inserted.rows.length > 0 && authorId !== userId) {
      const actorResult = await pool.query(
        "SELECT nickname FROM Users WHERE id = $1",
        [userId]
      );
      const actorNickname = actorResult.rows[0]?.nickname || "Someone";

      notifyNewLike({
        sightingId,
        authorId,
        actorUserId: userId,
        actorNickname,
      }).catch((err) => console.error("Like notification error:", err));
    }

    const count = await pool.query(
      "SELECT COUNT(*)::int AS c FROM SightingLikes WHERE sighting_id = $1",
      [sightingId]
    );

    res.status(201).json({
      success: true,
      data: { likeCount: count.rows[0].c, likedByMe: true },
    });
  } catch (err) {
    console.error("Like sighting error:", err);
    res.status(500).json({ error: "Failed to like sighting" });
  }
});

router.delete("/:id/like", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    const userId = req.user!.userId;
    const pool = await getPool();

    await pool.query(
      "DELETE FROM SightingLikes WHERE sighting_id = $1 AND user_id = $2",
      [sightingId, userId]
    );

    const count = await pool.query(
      "SELECT COUNT(*)::int AS c FROM SightingLikes WHERE sighting_id = $1",
      [sightingId]
    );

    res.json({
      success: true,
      data: { likeCount: count.rows[0].c, likedByMe: false },
    });
  } catch (err) {
    console.error("Unlike sighting error:", err);
    res.status(500).json({ error: "Failed to unlike sighting" });
  }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    if (!Number.isFinite(sightingId)) {
      res.status(400).json({ error: "Invalid sighting id" });
      return;
    }

    const pool = await getPool();

    const check = await pool.query(
      `SELECT id, user_id, description, category, latitude, longitude,
              photo_url, is_active, created_at
       FROM Sightings WHERE id = $1`,
      [sightingId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const row = check.rows[0];
    const isOwner = row.user_id === req.user!.userId;
    const isModerator = req.user!.role === "admin";

    if (!isOwner && !isModerator) {
      res.status(403).json({ error: "Not authorized to delete this sighting" });
      return;
    }

    if (isOwner && !isModerator) {
      await pool.query("DELETE FROM Sightings WHERE id = $1", [sightingId]);
    } else {
      await pool.query("UPDATE Sightings SET is_active = FALSE WHERE id = $1", [sightingId]);

      logModeration({
        moderatorId: req.user!.userId,
        moderatorRole: req.user!.role,
        action: "deactivate_sighting",
        targetKind: "sighting",
        targetId: row.id,
        targetUserId: row.user_id,
        targetSnapshot: {
          description: row.description,
          category: row.category,
          latitude: row.latitude,
          longitude: row.longitude,
          photoUrl: row.photo_url,
          createdAt: row.created_at,
        },
        reason: typeof req.body?.reason === "string" ? req.body.reason : null,
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete sighting error:", err);
    res.status(500).json({ error: "Failed to delete sighting" });
  }
});

/**
 * Pin or unpin a sighting. Admin only.
 */
router.put("/:id/pin", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const sightingId = Number(req.params.id);
    if (!Number.isFinite(sightingId)) {
      res.status(400).json({ error: "Invalid sighting id" });
      return;
    }
    const pinned = req.body?.pinned === true || req.body?.pinned === 1;
    const pool = await getPool();
    await pool.query("UPDATE Sightings SET is_pinned = $1 WHERE id = $2", [pinned, sightingId]);
    res.json({ success: true, isPinned: pinned });
  } catch (err) {
    console.error("Pin sighting error:", err);
    res.status(500).json({ error: "Failed to update pin status" });
  }
});

/**
 * Reinstate a soft-deactivated sighting. Admin only.
 */
router.put("/:id/reinstate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const sightingId = Number(req.params.id);
    const pool = await getPool();
    await pool.query("UPDATE Sightings SET is_active = TRUE WHERE id = $1", [sightingId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Reinstate sighting error:", err);
    res.status(500).json({ error: "Failed to reinstate sighting" });
  }
});

export default router;
