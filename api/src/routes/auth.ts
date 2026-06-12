import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { getPool } from "../config/database";
import { generateToken, authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({ error: "Email, password, and nickname are required" });
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
         VALUES (@email, @password, @nickname, 'user', 50, GETDATE(), GETDATE())`
      );

    const userId = result.recordset[0].id;
    const token = generateToken({ userId, email, role: "user" });

    res.status(201).json({
      success: true,
      data: { token, user: { id: userId, email, nickname, role: "user", radius: 50 } },
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
        `SELECT id, email, password, nickname, role, radius, avatar_url
         FROM Users WHERE email = @email`
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

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", req.user!.userId)
      .query(
        `SELECT id, email, nickname, role, radius, avatar_url, created_at, last_active
         FROM Users WHERE id = @id`
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
