import { getPool } from "../config/database";

/**
 * Records a single moderation action to the audit log.
 */
export type ModerationAction = "deactivate_sighting" | "delete_comment";

export interface ModerationEntry {
  moderatorId: number;
  moderatorRole: string;
  action: ModerationAction;
  targetKind: "sighting" | "comment";
  targetId: number;
  targetUserId: number | null;
  targetSnapshot: unknown;
  reason?: string | null;
}

export async function logModeration(entry: ModerationEntry): Promise<void> {
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO ModerationLog
         (moderator_id, moderator_role, action, target_kind, target_id,
          target_user_id, target_snapshot, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        entry.moderatorId,
        entry.moderatorRole,
        entry.action,
        entry.targetKind,
        entry.targetId,
        entry.targetUserId,
        JSON.stringify(entry.targetSnapshot ?? null),
        entry.reason ?? null,
      ]
    );
  } catch (err) {
    console.error("[moderation] Failed to write audit log:", err);
  }
}
