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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.APP_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/sightings", sightingsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Sardine Spotter API running on port ${PORT}`);
});

export default app;
