-- SardineWatch PostgreSQL Schema (Neon.tech)
-- Migrated from SQL Server — run this once to create all tables.

-- Users
CREATE TABLE IF NOT EXISTS Users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  nickname    VARCHAR(100) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'user',
  radius      INTEGER      NOT NULL DEFAULT 50,
  avatar_url  VARCHAR(500),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  ban_reason  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sightings
CREATE TABLE IF NOT EXISTS Sightings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  description TEXT         NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  photo_url   VARCHAR(500),
  category    VARCHAR(50)  NOT NULL DEFAULT 'sardine_sighting',
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_pinned   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON Sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_active      ON Sightings(is_active, is_pinned, created_at DESC);

-- Comments
CREATE TABLE IF NOT EXISTS Comments (
  id          SERIAL PRIMARY KEY,
  sighting_id INTEGER      NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
  user_id     INTEGER      NOT NULL REFERENCES Users(id)     ON DELETE CASCADE,
  text        TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_sighting ON Comments(sighting_id);

-- SightingLikes
CREATE TABLE IF NOT EXISTS SightingLikes (
  id          SERIAL PRIMARY KEY,
  sighting_id INTEGER      NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
  user_id     INTEGER      NOT NULL REFERENCES Users(id)     ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (sighting_id, user_id)
);

-- PushSubscriptions
CREATE TABLE IF NOT EXISTS PushSubscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  endpoint    TEXT         NOT NULL UNIQUE,
  p256dh      TEXT         NOT NULL,
  auth        TEXT         NOT NULL,
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS Notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES Users(id)    ON DELETE CASCADE,
  sighting_id INTEGER      NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
  kind        VARCHAR(20)  NOT NULL DEFAULT 'sighting',
  actor_id    INTEGER      REFERENCES Users(id)    ON DELETE SET NULL,
  comment_id  INTEGER      REFERENCES Comments(id) ON DELETE SET NULL,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id, created_at DESC);

-- ModerationLog
CREATE TABLE IF NOT EXISTS ModerationLog (
  id             SERIAL PRIMARY KEY,
  moderator_id   INTEGER      REFERENCES Users(id) ON DELETE SET NULL,
  moderator_role VARCHAR(20)  NOT NULL,
  action         VARCHAR(50)  NOT NULL,
  target_kind    VARCHAR(20)  NOT NULL,
  target_id      INTEGER      NOT NULL,
  target_user_id INTEGER      REFERENCES Users(id) ON DELETE SET NULL,
  target_snapshot JSONB,
  reason         TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- PasswordResetTokens
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64)  NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON PasswordResetTokens(token_hash);

-- FeedPreferences (used by account deletion)
CREATE TABLE IF NOT EXISTS FeedPreferences (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE
);
