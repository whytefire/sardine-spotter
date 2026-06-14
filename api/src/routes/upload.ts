import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// `kind` is taken from the URL via a route-level field on the request — see
// the route handlers below. Defaults to 'sighting' for /photo.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const kind = (req as AuthRequest & { uploadKind?: string }).uploadKind ?? "sighting";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${kind}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — covers sighting photos and avatars
});

const router = Router();

function tagUploadKind(kind: "sighting" | "avatar") {
  return (req: AuthRequest, _res: Response, next: () => void) => {
    (req as AuthRequest & { uploadKind?: string }).uploadKind = kind;
    next();
  };
}

router.post(
  "/photo",
  authenticate,
  tagUploadKind("sighting"),
  upload.single("photo"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        data: { photoUrl, filename: req.file.filename },
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * Avatar upload. Same constraints as photo upload, but files are prefixed
 * `avatar-...` so they're trivially distinguishable on disk. The returned
 * URL is meant to be passed straight to PUT /api/auth/profile.
 */
router.post(
  "/avatar",
  authenticate,
  tagUploadKind("avatar"),
  upload.single("avatar"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const avatarUrl = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        data: { avatarUrl, filename: req.file.filename },
      });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ error: "Avatar upload failed" });
    }
  }
);

export default router;
