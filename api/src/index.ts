// Must be first so env vars are present before any other module loads
// (e.g. services/notifications reads VAPID_PUBLIC_KEY at module-init time).
import "dotenv/config";
import path from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import sightingsRoutes from "./routes/sightings";
import commentsRoutes from "./routes/comments";
import notificationsRoutes from "./routes/notifications";
import uploadRoutes from "./routes/upload";
import adminRoutes from "./routes/admin";
import contactRoutes from "./routes/contact";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
  "http://localhost:3000",
  "https://sardinewatch.co.za",
  "https://www.sardinewatch.co.za",
  "https://sardinewatch.vercel.app",
  // Allow all Vercel preview deployment URLs for this project
  /^https:\/\/sardinewatch[a-z0-9-]*\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/sightings", sightingsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SardineWatch API running on port ${PORT}`);
});

export default app;
