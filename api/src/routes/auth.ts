import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { getPool } from "../config/database";
import { generateToken, authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      res
        .status(400)
        .json({ error: "Email, password, and nickname are required" });
      return;
    }

    const pool = await getPool();

    const existing = await pool
      .request()
      .input("email", email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (existing.recordset.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool
      .request()
      .input("email", email)
      .input("password", hashedPassword)
      .input("nickname", nickname)
      .query(
        `INSERT INTO Users (email, password, nickname, role, radius, created_at, last_active)
         OUTPUT INSERTED.id
         VALUES (@email, @password, @nickname, 'user', 50, GETDATE(), GETDATE())`,
      );

    const userId = result.recordset[0].id;
    const token = generateToken({ userId, email, role: "user" });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: userId, email, nickname, role: "user", radius: 50 },
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("email", email)
      .query(
        `SELECT id, email, password, nickname, role, radius, avatar_url,
                is_active, ban_reason
         FROM Users WHERE email = @email`,
      );

    if (result.recordset.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check ban AFTER verifying password — prevents user enumeration
    // (a bad actor can't probe whether an email exists by getting different
    // error codes for wrong-password vs banned).
    if (!user.is_active) {
      res.status(403).json({
        error: "banned",
        banReason: user.ban_reason || "Your account has been suspended.",
      });
      return;
    }

    await pool
      .request()
      .input("id", user.id)
      .query("UPDATE Users SET last_active = GETDATE() WHERE id = @id");

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          radius: user.radius,
          avatarUrl: user.avatar_url,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * Update profile (nickname and/or avatar URL). Anything not in the body is
 * left untouched. Returns the fresh user record.
 */
router.put(
  "/profile",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { nickname, avatarUrl } = req.body ?? {};

      if (nickname !== undefined) {
        const trimmed = String(nickname).trim();
        if (trimmed.length < 2 || trimmed.length > 100) {
          res.status(400).json({ error: "Nickname must be 2-100 characters" });
          return;
        }
      }

      if (avatarUrl !== undefined && avatarUrl !== null) {
        const v = String(avatarUrl);
        if (v.length > 500) {
          res.status(400).json({ error: "Avatar URL too long" });
          return;
        }
      }

      const pool = await getPool();
      await pool
        .request()
        .input("id", req.user!.userId)
        .input(
          "nickname",
          nickname !== undefined ? String(nickname).trim() : null,
        )
        .input(
          "avatarUrl",
          avatarUrl === undefined
            ? null
            : avatarUrl === null
              ? null
              : String(avatarUrl),
        )
        .input("nicknameSet", nickname !== undefined ? 1 : 0)
        .input("avatarSet", avatarUrl !== undefined ? 1 : 0).query(`
        UPDATE Users SET
          nickname   = CASE WHEN @nicknameSet = 1 THEN @nickname ELSE nickname END,
          avatar_url = CASE WHEN @avatarSet = 1 THEN @avatarUrl ELSE avatar_url END
        WHERE id = @id
      `);

      const fresh = await pool
        .request()
        .input("id", req.user!.userId)
        .query(
          `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
         FROM Users WHERE id = @id`,
        );

      const u = fresh.recordset[0];
      res.json({
        success: true,
        data: {
          id: u.id,
          email: u.email,
          nickname: u.nickname,
          role: u.role,
          radius: u.radius,
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
          lastActive: u.last_active,
        },
      });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
);

/**
 * Update email. Requires current password as a confirmation, and re-emits the
 * JWT because the email is embedded in it. Returns { token, user }.
 */
router.put("/email", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res
        .status(400)
        .json({ error: "Email and current password are required" });
      return;
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ||
      trimmedEmail.length > 255
    ) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    const pool = await getPool();

    const userResult = await pool
      .request()
      .input("id", req.user!.userId)
      .query("SELECT id, password FROM Users WHERE id = @id");

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(password, userResult.recordset[0].password);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Make sure the new email isn't taken by someone else
    const collision = await pool
      .request()
      .input("email", trimmedEmail)
      .input("id", req.user!.userId)
      .query("SELECT id FROM Users WHERE email = @email AND id <> @id");

    if (collision.recordset.length > 0) {
      res.status(409).json({ error: "That email is already in use" });
      return;
    }

    await pool
      .request()
      .input("id", req.user!.userId)
      .input("email", trimmedEmail)
      .query("UPDATE Users SET email = @email WHERE id = @id");

    const fresh = await pool
      .request()
      .input("id", req.user!.userId)
      .query(
        `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
         FROM Users WHERE id = @id`,
      );

    const u = fresh.recordset[0];
    const token = generateToken({ userId: u.id, email: u.email, role: u.role });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: u.id,
          email: u.email,
          nickname: u.nickname,
          role: u.role,
          radius: u.radius,
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
          lastActive: u.last_active,
        },
      },
    });
  } catch (err) {
    console.error("Update email error:", err);
    res.status(500).json({ error: "Failed to update email" });
  }
});

/**
 * Change password. Requires the current password as a confirmation.
 * Does NOT invalidate existing tokens — that's a separate concern.
 */
router.put(
  "/password",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};

      if (!currentPassword || !newPassword) {
        res
          .status(400)
          .json({ error: "Current and new passwords are required" });
        return;
      }

      if (String(newPassword).length < 8) {
        res
          .status(400)
          .json({ error: "New password must be at least 8 characters" });
        return;
      }

      const pool = await getPool();
      const userResult = await pool
        .request()
        .input("id", req.user!.userId)
        .query("SELECT id, password FROM Users WHERE id = @id");

      if (userResult.recordset.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const ok = await bcrypt.compare(
        currentPassword,
        userResult.recordset[0].password,
      );
      if (!ok) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await pool
        .request()
        .input("id", req.user!.userId)
        .input("password", hashed)
        .query("UPDATE Users SET password = @password WHERE id = @id");

      res.json({ success: true });
    } catch (err) {
      console.error("Update password error:", err);
      res.status(500).json({ error: "Failed to update password" });
    }
  },
);

/**
 * POPIA Section 23 — Right of access. Returns ALL personal information we
 * hold about the authenticated user, in a portable JSON envelope the user
 * can download and inspect. The frontend exposes this as
 * "Download my data" in Settings → Account.
 *
 * Excludes anything that isn't personal data about *this* user (e.g. likes
 * by other users on this user's sightings — that's their data, not yours).
 */
router.get(
  "/me/export",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const pool = await getPool();

      const userResult = await pool
        .request()
        .input("id", userId)
        .query(
          `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
         FROM Users WHERE id = @id`,
        );

      if (userResult.recordset.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const u = userResult.recordset[0];

      const [sightings, comments, likes, subscriptions, notifications] =
        await Promise.all([
          pool
            .request()
            .input("uid", userId)
            .query(
              `SELECT id, description, latitude, longitude, category, photo_url, is_active, created_at
             FROM Sightings WHERE user_id = @uid ORDER BY created_at DESC`,
            ),
          pool
            .request()
            .input("uid", userId)
            .query(
              `SELECT id, sighting_id, text, created_at
             FROM Comments WHERE user_id = @uid ORDER BY created_at DESC`,
            ),
          pool
            .request()
            .input("uid", userId)
            .query(
              `SELECT sighting_id, created_at
             FROM SightingLikes WHERE user_id = @uid ORDER BY created_at DESC`,
            ),
          pool
            .request()
            .input("uid", userId)
            .query(
              `SELECT id, endpoint, user_agent, created_at, last_used_at
             FROM PushSubscriptions WHERE user_id = @uid ORDER BY created_at DESC`,
            ),
          pool
            .request()
            .input("uid", userId)
            .query(
              `SELECT id, kind, sighting_id, actor_id, comment_id, is_read, created_at
             FROM Notifications WHERE user_id = @uid ORDER BY created_at DESC`,
            ),
        ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        formatVersion: "1.0",
        account: {
          id: u.id,
          email: u.email,
          nickname: u.nickname,
          role: u.role,
          notificationRadiusKm: u.radius,
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
          lastActive: u.last_active,
        },
        sightings: sightings.recordset,
        comments: comments.recordset,
        likes: likes.recordset,
        pushSubscriptions: subscriptions.recordset.map(
          (s: { endpoint: string; [k: string]: unknown }) => ({
            ...s,
            // Truncate the endpoint URL — the full one is a credential.
            endpoint:
              typeof s.endpoint === "string"
                ? s.endpoint.slice(0, 60) + "…"
                : s.endpoint,
          }),
        ),
        notifications: notifications.recordset,
      };

      const filename = `sardine-spotter-export-${userId}-${Date.now()}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("Data export error:", err);
      res.status(500).json({ error: "Failed to export data" });
    }
  },
);

/**
 * POPIA Section 24 — Right to erasure. Hard-deletes the user's account
 * and the personally identifiable data attached to it. Sightings and
 * comments authored by the user are anonymised (user_id repointed to a
 * sentinel "deleted user" account) rather than removed, so the community
 * record stays intact — this is the standard pattern used by Reddit /
 * Stack Overflow / GitHub.
 *
 * Caller must supply their current password as a confirmation step to
 * stop a stolen token from nuking the account.
 */
router.delete("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body ?? {};

    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password confirmation required" });
      return;
    }

    const pool = await getPool();

    const userRes = await pool
      .request()
      .input("id", userId)
      .query("SELECT id, password FROM Users WHERE id = @id");

    if (userRes.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(password, userRes.recordset[0].password);
    if (!ok) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }

    // Find or create the "deleted user" sentinel that we repoint orphan
    // content to. The email/nickname are deterministic and not real.
    let sentinelId: number;
    const sentinelLookup = await pool
      .request()
      .query(
        "SELECT id FROM Users WHERE email = 'deleted@sardinespotter.local'",
      );

    if (sentinelLookup.recordset.length > 0) {
      sentinelId = sentinelLookup.recordset[0].id;
    } else {
      const sentinelPwd = await bcrypt.hash(
        Math.random().toString(36) + Math.random().toString(36),
        10,
      );
      const sentinelInsert = await pool
        .request()
        .input("email", "deleted@sardinespotter.local")
        .input("password", sentinelPwd)
        .input("nickname", "[deleted user]")
        .input("role", "user")
        .input("radius", 50)
        .query(
          `INSERT INTO Users (email, password, nickname, role, radius, created_at)
           OUTPUT INSERTED.id
           VALUES (@email, @password, @nickname, @role, @radius, GETDATE())`,
        );
      sentinelId = sentinelInsert.recordset[0].id;
    }

    // Anonymise authored content, then nuke account-scoped rows, then the user.
    // Wrap in an explicit transaction so a partial failure rolls back instead
    // of leaving the account half-deleted.
    //
    // Order matters because most FKs to Users(id) are NOT ON DELETE CASCADE:
    //   - Sightings / Comments / FeedPreferences block the user delete unless
    //     we repoint or remove their rows first.
    //   - Notifications has FKs on both user_id and actor_id pointing at Users.
    //   - SightingLikes & PushSubscriptions ARE cascade, but we delete them
    //     explicitly so they participate in the transaction.
    await pool.request().input("uid", userId).input("sentinel", sentinelId)
      .query(`
        BEGIN TRANSACTION;
        BEGIN TRY
          UPDATE Sightings SET user_id = @sentinel WHERE user_id = @uid;
          UPDATE Comments  SET user_id = @sentinel WHERE user_id = @uid;
          DELETE FROM SightingLikes      WHERE user_id = @uid;
          DELETE FROM PushSubscriptions  WHERE user_id = @uid;
          DELETE FROM Notifications      WHERE user_id = @uid OR actor_id = @uid;
          DELETE FROM FeedPreferences    WHERE user_id = @uid;
          DELETE FROM Users              WHERE id = @uid;
          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH;
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", req.user!.userId)
      .query(
        `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
         FROM Users WHERE id = @id`,
      );

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = result.recordset[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        radius: user.radius,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastActive: user.last_active,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
