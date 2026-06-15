import { getPool } from "../config/database";

/**
 * Records a single moderation action to the audit log.
 *
 * Designed to be fire-and-forget from the route handler — if the log write
 * fails we still return success to the user (the content is already gone),
 * but the failure is reported to stderr so it can be investigated.
 *
 * Why an audit log at all:
 *   - POPIA s.19 requires us to "take appropriate, reasonable technical
 *     and organisational measures to prevent unlawful access" — an audit
 *     log is the standard way to demonstrate moderator actions are
 *     accountable and reviewable.
 *   - Under the SA Equality Act we may be asked by SAHRC to show that
 *     we acted on reported hate speech in good time. The timestamps in
 *     this table are the evidence.
 *   - And practically: if a user disputes a deletion, we want a record
 *     of who removed what and why.
 */
export type ModerationAction = "deactivate_sighting" | "delete_comment";

export interface ModerationEntry {
  moderatorId: number;
  moderatorRole: string;
  action: ModerationAction;
  targetKind: "sighting" | "comment";
  targetId: number;
  targetUserId: number | null;
  /** Anything JSON-stringifiable; gets stored as-is. Keep it small. */
  targetSnapshot: unknown;
  reason?: string | null;
}

export async function logModeration(entry: ModerationEntry): Promise<void> {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("moderatorId", entry.moderatorId)
      .input("moderatorRole", entry.moderatorRole)
      .input("action", entry.action)
      .input("targetKind", entry.targetKind)
      .input("targetId", entry.targetId)
      .input("targetUserId", entry.targetUserId)
      .input("targetSnapshot", JSON.stringify(entry.targetSnapshot ?? null))
      .input("reason", entry.reason ?? null)
      .query(
        `INSERT INTO ModerationLog
           (moderator_id, moderator_role, action, target_kind, target_id,
            target_user_id, target_snapshot, reason, created_at)
         VALUES
           (@moderatorId, @moderatorRole, @action, @targetKind, @targetId,
            @targetUserId, @targetSnapshot, @reason, GETDATE())`
      );
  } catch (err) {
    console.error("[moderation] Failed to write audit log:", err);
  }
}
