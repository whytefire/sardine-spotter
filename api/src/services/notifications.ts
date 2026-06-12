import webpush from "web-push";
import { getPool } from "../config/database";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:info@sardinespotter.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface SightingData {
  id: number;
  userId: number;
  nickname: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
}

export async function notifyNearbyUsers(sighting: SightingData): Promise<number> {
  const pool = await getPool();

  // Notify every active user (other than the reporter) who has a push
  // subscription on file. Email alerts intentionally not supported —
  // everything is driven through the app + browser push.
  const result = await pool
    .request()
    .input("reporterId", sighting.userId)
    .query(`
      SELECT id, push_endpoint, push_p256dh, push_auth, nickname
      FROM Users
      WHERE id != @reporterId
        AND is_active = 1
        AND push_endpoint IS NOT NULL
    `);

  // For each eligible user, check if sighting is within their radius
  // and create a notification + send push
  let sentCount = 0;

  for (const user of result.recordset) {
    try {
      // Create in-app notification
      await pool
        .request()
        .input("userId", user.id)
        .input("sightingId", sighting.id)
        .query(`
          INSERT INTO Notifications (user_id, sighting_id, is_read, created_at)
          VALUES (@userId, @sightingId, 0, GETDATE())
        `);

      // Send push notification if subscribed
      if (user.push_endpoint && user.push_p256dh && user.push_auth) {
        const subscription = {
          endpoint: user.push_endpoint,
          keys: {
            p256dh: user.push_p256dh,
            auth: user.push_auth,
          },
        };

        const truncatedDesc =
          sighting.description.length > 80
            ? sighting.description.substring(0, 80) + "..."
            : sighting.description;

        const payload = JSON.stringify({
          title: `${sighting.nickname} spotted sardines!`,
          body: truncatedDesc,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          data: {
            sightingId: sighting.id,
            url: `/app?sighting=${sighting.id}`,
          },
          tag: `sighting-${sighting.id}`,
        });

        await webpush.sendNotification(subscription, payload);
        sentCount++;
      }
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — clean it up
        await pool
          .request()
          .input("userId", user.id)
          .query(
            "UPDATE Users SET push_endpoint = NULL, push_p256dh = NULL, push_auth = NULL WHERE id = @userId"
          );
      }
      console.error(`Push failed for user ${user.id}:`, err);
    }
  }

  return sentCount;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
