import webpush from "web-push";
import { getPool } from "../config/database";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:info@sardinespotter.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log(`[notifications] VAPID configured (pub: ${VAPID_PUBLIC_KEY.slice(0, 12)}…)`);
} else {
  console.warn("[notifications] VAPID keys not set — push notifications disabled");
}

interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface SightingInput {
  id: number;
  userId: number;
  nickname: string;
  description: string;
}

interface CommentInput {
  id: number;
  sightingId: number;
  actorUserId: number;
  actorNickname: string;
  text: string;
}

interface LikeInput {
  sightingId: number;
  authorId: number;
  actorUserId: number;
  actorNickname: string;
}

/** Send a push notification to all subscriptions for a set of users. */
async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0) return 0;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const pool = await getPool();

  const subsResult = await pool.query<PushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth
       FROM PushSubscriptions
      WHERE user_id = ANY($1)`,
    [userIds]
  );

  const body =
    payload.body.length > 120 ? payload.body.substring(0, 120) + "…" : payload.body;

  const encoded = JSON.stringify({
    title: payload.title,
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { url: payload.url },
    tag: payload.tag,
  });

  let sent = 0;
  const expiredIds: number[] = [];

  for (const sub of subsResult.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        encoded
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        expiredIds.push(sub.id);
      } else {
        console.error(`Push failed (subscription ${sub.id}):`, err);
      }
    }
  }

  if (expiredIds.length > 0) {
    await pool.query(
      `DELETE FROM PushSubscriptions WHERE id = ANY($1)`,
      [expiredIds]
    );
    console.log(`[notifications] pruned ${expiredIds.length} expired subscription(s)`);
  }

  return sent;
}

/**
 * Fires when a new sighting is reported.
 * In-app + push notification to every active user who is not the reporter.
 */
export async function notifyNewSighting(sighting: SightingInput): Promise<number> {
  const pool = await getPool();

  await pool.query(
    `INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, is_read, created_at)
     SELECT u.id, $1, 'sighting', $2, FALSE, NOW()
       FROM Users u
      WHERE u.id <> $2
        AND u.is_active = TRUE`,
    [sighting.id, sighting.userId]
  );

  const recipientsResult = await pool.query<{ id: number }>(
    "SELECT id FROM Users WHERE id <> $1 AND is_active = TRUE",
    [sighting.userId]
  );

  const userIds = recipientsResult.rows.map((r) => r.id);

  return sendPushToUsers(userIds, {
    title: `${sighting.nickname} spotted sardines!`,
    body: sighting.description,
    url: `/app?sighting=${sighting.id}`,
    tag: `sighting-${sighting.id}`,
  });
}

/**
 * Fires when someone comments on a sighting.
 * Recipients: the sighting author + everyone else who has previously
 * commented on the same sighting, MINUS the commenter themselves.
 */
export async function notifyNewComment(comment: CommentInput): Promise<number> {
  const pool = await getPool();

  const recipientsResult = await pool.query<{ id: number }>(
    `SELECT DISTINCT u.id
       FROM Users u
       JOIN (
         SELECT s.user_id AS uid FROM Sightings s WHERE s.id = $1
         UNION
         SELECT c.user_id FROM Comments c WHERE c.sighting_id = $1
       ) participants ON participants.uid = u.id
      WHERE u.is_active = TRUE
        AND u.id <> $2`,
    [comment.sightingId, comment.actorUserId]
  );

  const userIds = recipientsResult.rows.map((r) => r.id);
  if (userIds.length === 0) return 0;

  // Bulk insert in-app notifications
  for (const userId of userIds) {
    await pool.query(
      `INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, comment_id, is_read, created_at)
       VALUES ($1, $2, 'comment', $3, $4, FALSE, NOW())`,
      [userId, comment.sightingId, comment.actorUserId, comment.id]
    );
  }

  return sendPushToUsers(userIds, {
    title: `${comment.actorNickname} commented`,
    body: comment.text,
    url: `/app?sighting=${comment.sightingId}`,
    tag: `comment-${comment.id}`,
  });
}

/**
 * Fires the first time a given user likes a given sighting.
 */
export async function notifyNewLike(like: LikeInput): Promise<number> {
  const pool = await getPool();

  // Idempotent: only insert if no like notification already exists for this pairing
  const result = await pool.query(
    `INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, is_read, created_at)
     SELECT $1, $2, 'like', $3, FALSE, NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM Notifications
       WHERE user_id = $1
         AND sighting_id = $2
         AND kind = 'like'
         AND actor_id = $3
     )
     RETURNING id`,
    [like.authorId, like.sightingId, like.actorUserId]
  );

  if (result.rows.length === 0) return 0;

  return sendPushToUsers([like.authorId], {
    title: `${like.actorNickname} liked your sighting`,
    body: "Tap to view it",
    url: `/app?sighting=${like.sightingId}`,
    tag: `like-${like.sightingId}-${like.actorUserId}`,
  });
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
