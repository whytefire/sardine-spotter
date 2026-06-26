import { Router, Response } from "express";
import { authenticate, authenticateOptional, AuthRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import { notifyNewSighting, notifyNewLike } from "../services/notifications";
import { logModeration } from "../services/moderation";
import { censor } from "../lib/profanity";

const router = Router();

router.get("/", authenticateOptional, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius = 50, page = 1, limit = 20 } = req.query;
    const pool = await getPool();

    const offset = (Number(page) - 1) * Number(limit);
    const viewerId = req.user?.userId ?? 0; // 0 → never matches a real user, so likedByMe is always 0 for guests

    let query: string;
    const request = pool.request()
      .input("limit", Number(limit))
      .input("offset", offset)
      .input("viewerId", viewerId);

    if (lat && lng) {
      query = `
        SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) AS comment_count,
          (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id) AS like_count,
          CAST(CASE WHEN EXISTS (
            SELECT 1 FROM SightingLikes l
            WHERE l.sighting_id = s.id AND l.user_id = @viewerId
          ) THEN 1 ELSE 0 END AS BIT) AS liked_by_me,
          geography::Point(s.latitude, s.longitude, 4326).STDistance(
            geography::Point(@lat, @lng, 4326)
          ) / 1000.0 AS distance_km
        FROM Sightings s
        JOIN Users u ON s.user_id = u.id
        WHERE s.is_active = 1
          AND (
            s.is_pinned = 1
            OR (
              s.created_at >= DATEADD(hour, -24, GETDATE())
              AND geography::Point(s.latitude, s.longitude, 4326).STDistance(
                geography::Point(@lat, @lng, 4326)
              ) / 1000.0 <= @radius
            )
          )
        ORDER BY s.is_pinned DESC, s.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
      request.input("lat", Number(lat));
      request.input("lng", Number(lng));
      request.input("radius", Number(radius));
    } else {
      query = `
        SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) AS comment_count,
          (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id) AS like_count,
          CAST(CASE WHEN EXISTS (
            SELECT 1 FROM SightingLikes l
            WHERE l.sighting_id = s.id AND l.user_id = @viewerId
          ) THEN 1 ELSE 0 END AS BIT) AS liked_by_me
        FROM Sightings s
        JOIN Users u ON s.user_id = u.id
        WHERE s.is_active = 1
          AND (s.is_pinned = 1 OR s.created_at >= DATEADD(hour, -24, GETDATE()))
        ORDER BY s.is_pinned DESC, s.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
    }

    const result = await request.query(query);

    const isAdmin = req.user?.role === "admin";

    res.json({
      success: true,
      data: result.recordset.map((row: Record<string, unknown>) => ({
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
        distanceKm: row.distance_km ?? null,
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

router.get("/:id", authenticateOptional, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const viewerId = req.user?.userId ?? 0;

    const result = await pool
      .request()
      .input("id", Number(req.params.id))
      .input("viewerId", viewerId)
      .query(
        `SELECT s.*, u.nickname, u.avatar_url,
          (SELECT COUNT(*) FROM Comments c WHERE c.sighting_id = s.id) AS comment_count,
          (SELECT COUNT(*) FROM SightingLikes l WHERE l.sighting_id = s.id) AS like_count,
          CAST(CASE WHEN EXISTS (
            SELECT 1 FROM SightingLikes l
            WHERE l.sighting_id = s.id AND l.user_id = @viewerId
          ) THEN 1 ELSE 0 END AS BIT) AS liked_by_me
         FROM Sightings s
         JOIN Users u ON s.user_id = u.id
         WHERE s.id = @id AND s.is_active = 1`
      );

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const row = result.recordset[0];
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

/**
 * Like a sighting. Idempotent — re-POSTing has no effect after the first call.
 * The first time a given user likes a sighting, the author gets a push
 * notification (unless the author is liking their own sighting).
 */
router.post("/:id/like", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    const userId = req.user!.userId;
    const pool = await getPool();

    // Confirm sighting exists + grab author id for the notification
    const check = await pool
      .request()
      .input("id", sightingId)
      .query("SELECT user_id FROM Sightings WHERE id = @id");

    if (check.recordset.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const authorId = check.recordset[0].user_id as number;

    // INSERT … WHERE NOT EXISTS is an atomic, deduped insert. OUTPUT tells us
    // whether a row was actually inserted (i.e. this is a fresh like and we
    // should fire a notification).
    const inserted = await pool
      .request()
      .input("sightingId", sightingId)
      .input("userId", userId)
      .query(`
        INSERT INTO SightingLikes (sighting_id, user_id, created_at)
        OUTPUT INSERTED.id
        SELECT @sightingId, @userId, GETDATE()
        WHERE NOT EXISTS (
          SELECT 1 FROM SightingLikes
          WHERE sighting_id = @sightingId AND user_id = @userId
        )
      `);

    // Fan-out only on a real insert AND only when the liker isn't the author
    if (inserted.recordset.length > 0 && authorId !== userId) {
      const actorResult = await pool
        .request()
        .input("uid", userId)
        .query("SELECT nickname FROM Users WHERE id = @uid");
      const actorNickname = actorResult.recordset[0]?.nickname || "Someone";

      notifyNewLike({
        sightingId,
        authorId,
        actorUserId: userId,
        actorNickname,
      }).catch((err) => console.error("Like notification error:", err));
    }

    // Always return the current count so the client can sync
    const count = await pool
      .request()
      .input("sightingId", sightingId)
      .query<{ c: number }>(
        "SELECT COUNT(*) AS c FROM SightingLikes WHERE sighting_id = @sightingId"
      );

    res.status(201).json({
      success: true,
      data: { likeCount: count.recordset[0].c, likedByMe: true },
    });
  } catch (err) {
    console.error("Like sighting error:", err);
    res.status(500).json({ error: "Failed to like sighting" });
  }
});

/** Unlike a sighting. Idempotent. Does NOT undo the original notification. */
router.delete("/:id/like", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    const userId = req.user!.userId;
    const pool = await getPool();

    await pool
      .request()
      .input("sightingId", sightingId)
      .input("userId", userId)
      .query(
        "DELETE FROM SightingLikes WHERE sighting_id = @sightingId AND user_id = @userId"
      );

    const count = await pool
      .request()
      .input("sightingId", sightingId)
      .query<{ c: number }>(
        "SELECT COUNT(*) AS c FROM SightingLikes WHERE sighting_id = @sightingId"
      );

    res.json({
      success: true,
      data: { likeCount: count.recordset[0].c, likedByMe: false },
    });
  } catch (err) {
    console.error("Unlike sighting error:", err);
    res.status(500).json({ error: "Failed to unlike sighting" });
  }
});

/**
 * Remove a sighting. Two different behaviours depending on who calls it:
 *
 *   Owner (reporter)
 *     → Hard DELETE. It's their content, POPIA gives them the right to
 *       fully erase it. No audit log entry needed (self-action).
 *
 *   Admin moderating someone else's content
 *     → Soft-delete: sets is_active = 0 so the row is preserved as
 *       evidence (useful for SAHRC / Equality Court matters) but the
 *       sighting disappears from the public feed and map immediately.
 *     → Writes a ModerationLog row containing a full snapshot of the
 *       sighting at the time of deactivation, plus the admin's reason.
 *     → The sighting can be reinstated via PUT /api/sightings/:id/reinstate.
 *
 * Body (optional):
 *   { reason?: string }   moderator's note, stored on the audit log
 */
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sightingId = Number(req.params.id);
    if (!Number.isFinite(sightingId)) {
      res.status(400).json({ error: "Invalid sighting id" });
      return;
    }

    const pool = await getPool();

    const check = await pool
      .request()
      .input("id", sightingId)
      .query(
        `SELECT id, user_id, description, category, latitude, longitude,
                photo_url, is_active, created_at
           FROM Sightings WHERE id = @id`
      );

    if (check.recordset.length === 0) {
      res.status(404).json({ error: "Sighting not found" });
      return;
    }

    const row = check.recordset[0];
    const isOwner = row.user_id === req.user!.userId;
    const isModerator = req.user!.role === "admin";

    if (!isOwner && !isModerator) {
      res.status(403).json({ error: "Not authorized to delete this sighting" });
      return;
    }

    if (isOwner && !isModerator) {
      // Owner removing their own content — hard delete
      await pool
        .request()
        .input("id", sightingId)
        .query("DELETE FROM Sightings WHERE id = @id");
    } else {
      // Admin moderating someone else's content — soft deactivate
      await pool
        .request()
        .input("id", sightingId)
        .query("UPDATE Sightings SET is_active = 0 WHERE id = @id");

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
 * PUT /api/sightings/:id/pin   { pinned: true | false }
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
    await pool
      .request()
      .input("id", sightingId)
      .input("pinned", pinned ? 1 : 0)
      .query("UPDATE Sightings SET is_pinned = @pinned WHERE id = @id");
    res.json({ success: true, isPinned: pinned });
  } catch (err) {
    console.error("Pin sighting error:", err);
    res.status(500).json({ error: "Failed to update pin status" });
  }
});

/**
 * Reinstate a sighting that was soft-deactivated by a moderator.
 * Admin only — sets is_active back to 1.
 */
router.put("/:id/reinstate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const sightingId = Number(req.params.id);
    const pool = await getPool();
    await pool
      .request()
      .input("id", sightingId)
      .query("UPDATE Sightings SET is_active = 1 WHERE id = @id");
    res.json({ success: true });
  } catch (err) {
    console.error("Reinstate sighting error:", err);
    res.status(500).json({ error: "Failed to reinstate sighting" });
  }
});

export default router;
