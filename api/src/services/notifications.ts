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
  const idList = userIds.join(",");

  const subs = await pool.request().query<PushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth
       FROM PushSubscriptions
      WHERE user_id IN (${idList})`
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

  for (const sub of subs.recordset) {
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

  // Clean up just the expired endpoints, not the whole user's push state
  if (expiredIds.length > 0) {
    await pool
      .request()
      .query(`DELETE FROM PushSubscriptions WHERE id IN (${expiredIds.join(",")})`);
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

  // Every active user except the reporter gets an in-app notification.
  // We insert one row per recipient.
  await pool
    .request()
    .input("reporterId", sighting.userId)
    .input("sightingId", sighting.id)
    .query(`
      INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, is_read, created_at)
      SELECT u.id, @sightingId, 'sighting', @reporterId, 0, GETDATE()
        FROM Users u
       WHERE u.id <> @reporterId
         AND u.is_active = 1
    `);

  // Collect those same user ids for the push fan-out.
  const recipients = await pool
    .request()
    .input("reporterId", sighting.userId)
    .query<{ id: number }>(
      "SELECT id FROM Users WHERE id <> @reporterId AND is_active = 1"
    );

  const userIds = recipients.recordset.map((r) => r.id);

  return sendPushToUsers(userIds, {
    title: `${sighting.nickname} spotted sardines!`,
    body: sighting.description,
    url: `/app?sighting=${sighting.id}`,
    tag: `sighting-${sighting.id}`,
  });
}

/**
 * Fires when someone comments on a sighting (Facebook-style).
 * Recipients: the sighting author + everyone else who has previously
 * commented on the same sighting, MINUS the commenter themselves.
 */
export async function notifyNewComment(comment: CommentInput): Promise<number> {
  const pool = await getPool();

  // Build the recipient list:
  //   sighting author + distinct previous commenters
  //   minus the commenter themselves
  //   minus inactive users
  const recipients = await pool
    .request()
    .input("sightingId", comment.sightingId)
    .input("actorId", comment.actorUserId)
    .query<{ id: number }>(`
      SELECT DISTINCT u.id
        FROM Users u
        JOIN (
          SELECT s.user_id AS uid FROM Sightings s WHERE s.id = @sightingId
          UNION
          SELECT c.user_id FROM Comments c WHERE c.sighting_id = @sightingId
        ) participants ON participants.uid = u.id
       WHERE u.is_active = 1
         AND u.id <> @actorId
    `);

  const userIds = recipients.recordset.map((r) => r.id);
  if (userIds.length === 0) return 0;

  // Bulk insert the in-app notification rows
  const userTable = userIds.map((id) => `(${id})`).join(",");
  await pool
    .request()
    .input("sightingId", comment.sightingId)
    .input("commentId", comment.id)
    .input("actorId", comment.actorUserId)
    .query(`
      INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, comment_id, is_read, created_at)
      SELECT v.user_id, @sightingId, 'comment', @actorId, @commentId, 0, GETDATE()
        FROM (VALUES ${userTable}) AS v(user_id)
    `);

  return sendPushToUsers(userIds, {
    title: `${comment.actorNickname} commented`,
    body: comment.text,
    url: `/app?sighting=${comment.sightingId}`,
    tag: `comment-${comment.id}`,
  });
}

/**
 * Fires the first time a given user likes a given sighting. The route already
 * filters out self-likes and only calls us on a fresh INSERT, so this function
 * unconditionally notifies the author. We also dedupe at the in-app layer in
 * case the same liker re-likes after an unlike — only one notification row per
 * (recipient, sighting, actor, kind='like').
 */
export async function notifyNewLike(like: LikeInput): Promise<number> {
  const pool = await getPool();

  // Idempotent insert: if there's already a 'like' notification from this actor
  // to this author for this sighting, we skip. Cap at one notification per
  // unique like pairing — same way Facebook does it.
  const inserted = await pool
    .request()
    .input("authorId", like.authorId)
    .input("sightingId", like.sightingId)
    .input("actorId", like.actorUserId)
    .query(`
      INSERT INTO Notifications (user_id, sighting_id, kind, actor_id, is_read, created_at)
      OUTPUT INSERTED.id
      SELECT @authorId, @sightingId, 'like', @actorId, 0, GETDATE()
      WHERE NOT EXISTS (
        SELECT 1 FROM Notifications
        WHERE user_id = @authorId
          AND sighting_id = @sightingId
          AND kind = 'like'
          AND actor_id = @actorId
      )
    `);

  // No fresh row → already notified for this pairing, don't push again.
  if (inserted.recordset.length === 0) return 0;

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
