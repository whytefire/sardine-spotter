import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getPool } from "../config/database";
import { generateToken, authenticate, AuthRequest } from "../middleware/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({ error: "Email, password, and nickname are required" });
      return;
    }

    const pool = await getPool();

    const existing = await pool.query(
      "SELECT id FROM Users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO Users (email, password, nickname, role, radius, created_at, last_active)
       VALUES ($1, $2, $3, 'user', 50, NOW(), NOW())
       RETURNING id`,
      [email, hashedPassword, nickname]
    );

    const userId = result.rows[0].id;
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
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const pool = await getPool();

    const result = await pool.query(
      `SELECT id, email, password, nickname, role, radius, avatar_url,
              is_active, ban_reason
       FROM Users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        error: "banned",
        banReason: user.ban_reason || "Your account has been suspended.",
      });
      return;
    }

    await pool.query("UPDATE Users SET last_active = NOW() WHERE id = $1", [user.id]);

    const token = generateToken(
      { userId: user.id, email: user.email, role: user.role },
      !!rememberMe
    );

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

router.put("/profile", authenticate, async (req: AuthRequest, res: Response) => {
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
    const nicknameSet = nickname !== undefined;
    const avatarSet = avatarUrl !== undefined;

    await pool.query(
      `UPDATE Users SET
        nickname   = CASE WHEN $1 THEN $2 ELSE nickname END,
        avatar_url = CASE WHEN $3 THEN $4 ELSE avatar_url END
       WHERE id = $5`,
      [
        nicknameSet,
        nicknameSet ? String(nickname).trim() : null,
        avatarSet,
        avatarSet ? (avatarUrl === null ? null : String(avatarUrl)) : null,
        req.user!.userId,
      ]
    );

    const fresh = await pool.query(
      `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
       FROM Users WHERE id = $1`,
      [req.user!.userId]
    );

    const u = fresh.rows[0];
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
});

router.put("/email", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and current password are required" });
      return;
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    const pool = await getPool();

    const userResult = await pool.query(
      "SELECT id, password FROM Users WHERE id = $1",
      [req.user!.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(password, userResult.rows[0].password);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const collision = await pool.query(
      "SELECT id FROM Users WHERE email = $1 AND id <> $2",
      [trimmedEmail, req.user!.userId]
    );

    if (collision.rows.length > 0) {
      res.status(409).json({ error: "That email is already in use" });
      return;
    }

    await pool.query("UPDATE Users SET email = $1 WHERE id = $2", [
      trimmedEmail,
      req.user!.userId,
    ]);

    const fresh = await pool.query(
      `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
       FROM Users WHERE id = $1`,
      [req.user!.userId]
    );

    const u = fresh.rows[0];
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

router.put("/password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new passwords are required" });
      return;
    }

    if (String(newPassword).length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const pool = await getPool();
    const userResult = await pool.query(
      "SELECT id, password FROM Users WHERE id = $1",
      [req.user!.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE Users SET password = $1 WHERE id = $2", [
      hashed,
      req.user!.userId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

router.get("/me/export", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const pool = await getPool();

    const userResult = await pool.query(
      `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
       FROM Users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const u = userResult.rows[0];

    const [sightings, comments, likes, subscriptions, notifications] =
      await Promise.all([
        pool.query(
          `SELECT id, description, latitude, longitude, category, photo_url, is_active, created_at
           FROM Sightings WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        pool.query(
          `SELECT id, sighting_id, text, created_at
           FROM Comments WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        pool.query(
          `SELECT sighting_id, created_at
           FROM SightingLikes WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        pool.query(
          `SELECT id, endpoint, user_agent, created_at, last_used_at
           FROM PushSubscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        pool.query(
          `SELECT id, kind, sighting_id, actor_id, comment_id, is_read, created_at
           FROM Notifications WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
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
      sightings: sightings.rows,
      comments: comments.rows,
      likes: likes.rows,
      pushSubscriptions: subscriptions.rows.map(
        (s: { endpoint: string; [k: string]: unknown }) => ({
          ...s,
          endpoint:
            typeof s.endpoint === "string"
              ? s.endpoint.slice(0, 60) + "…"
              : s.endpoint,
        })
      ),
      notifications: notifications.rows,
    };

    const filename = `sardine-spotter-export-${userId}-${Date.now()}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("Data export error:", err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

router.delete("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body ?? {};

    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password confirmation required" });
      return;
    }

    const pool = await getPool();

    const userRes = await pool.query(
      "SELECT id, password FROM Users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(password, userRes.rows[0].password);
    if (!ok) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }

    // Find or create the "deleted user" sentinel
    let sentinelId: number;
    const sentinelLookup = await pool.query(
      "SELECT id FROM Users WHERE email = 'deleted@sardinespotter.local'"
    );

    if (sentinelLookup.rows.length > 0) {
      sentinelId = sentinelLookup.rows[0].id;
    } else {
      const sentinelPwd = await bcrypt.hash(
        Math.random().toString(36) + Math.random().toString(36),
        10
      );
      const sentinelInsert = await pool.query(
        `INSERT INTO Users (email, password, nickname, role, radius, created_at)
         VALUES ('deleted@sardinespotter.local', $1, '[deleted user]', 'user', 50, NOW())
         RETURNING id`,
        [sentinelPwd]
      );
      sentinelId = sentinelInsert.rows[0].id;
    }

    // Run the deletion in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE Sightings SET user_id = $1 WHERE user_id = $2", [sentinelId, userId]);
      await client.query("UPDATE Comments  SET user_id = $1 WHERE user_id = $2", [sentinelId, userId]);
      await client.query("DELETE FROM SightingLikes     WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM PushSubscriptions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM Notifications     WHERE user_id = $1 OR actor_id = $1", [userId]);
      await client.query("DELETE FROM FeedPreferences   WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM Users             WHERE id = $1", [userId]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
       FROM Users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = result.rows[0];
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

// ── Forgot password ──────────────────────────────────────────────────────────
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const pool = await getPool();
    const result = await pool.query(
      "SELECT id, email, nickname FROM Users WHERE email = $1 AND is_active = TRUE",
      [email]
    );

    if (result.rows.length === 0) {
      res.json({ success: true });
      return;
    }

    const user = result.rows[0];

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "DELETE FROM PasswordResetTokens WHERE user_id = $1 AND used_at IS NULL",
      [user.id]
    );

    await pool.query(
      "INSERT INTO PasswordResetTokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || "https://sardinewatch.co.za"}/reset-password?token=${rawToken}`;

    await resend.emails.send({
      from: "SardineWatch <noreply@sardinewatch.co.za>",
      to: user.email,
      subject: "Reset your SardineWatch password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0e7490; font-size: 24px; margin: 0;">🐟 SardineWatch</h1>
          </div>
          <h2 style="color: #1e293b; font-size: 20px;">Reset your password</h2>
          <p style="color: #475569;">Hi ${user.nickname},</p>
          <p style="color: #475569;">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #0e7490; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">Reset Password</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 12px; text-align: center;">SardineWatch · sardinewatch.co.za</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const pool = await getPool();

    const result = await pool.query(
      `SELECT t.id, t.user_id FROM PasswordResetTokens t
       WHERE t.token_hash = $1
         AND t.expires_at > NOW()
         AND t.used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }

    const { id: tokenId, user_id: userId } = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query("UPDATE Users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    await pool.query("UPDATE PasswordResetTokens SET used_at = NOW() WHERE id = $1", [
      tokenId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
