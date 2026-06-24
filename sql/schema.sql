-- =====================================================================
-- SardineWatch — canonical schema
-- =====================================================================
-- This is the SINGLE source of truth for the database structure. If you
-- need to change anything (new column, new table, new index), edit this
-- file. There are no migration files.
--
-- Workflow:
--   1. Run sql/teardown.sql to drop everything.
--   2. Run sql/schema.sql to recreate it from scratch.
--
-- Every CREATE is guarded by IF NOT EXISTS so the script is also safe
-- to run on an empty database without a teardown.
--
-- Roles
--   'admin' — can moderate all content, manage other users
--   'user'  — regular community member
-- =====================================================================

-- ---------------------------------------------------------------------
-- First-time SQL Server setup (uncomment & run ONCE before this script)
-- ---------------------------------------------------------------------
-- This creates the application's SQL login. Skip if it already exists
-- or if your API uses a different connection user.
/*
CREATE DATABASE SardineSpotter;
GO

CREATE LOGIN SardineSpotterUser WITH PASSWORD = 'Sardine@2026!';
GO

USE SardineSpotter;
GO

CREATE USER SardineSpotterUser FOR LOGIN SardineSpotterUser;
GO

ALTER ROLE db_owner ADD MEMBER SardineSpotterUser;
GO
*/

USE SardineSpotter;
GO

PRINT '=== Building SardineWatch schema ===';
GO

-- =====================================================================
-- USERS
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE Users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    email           NVARCHAR(255)   NOT NULL UNIQUE,
    password        NVARCHAR(255)   NOT NULL,         -- bcrypt hash, never plaintext
    nickname        NVARCHAR(100)   NOT NULL,
    role            NVARCHAR(20)    NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
    radius          INT             NOT NULL DEFAULT 50,       -- km, default notification radius
    avatar_url      NVARCHAR(500)   NULL,
    is_active       BIT             NOT NULL DEFAULT 1,
    ban_reason      NVARCHAR(500)   NULL,               -- set when is_active = 0; shown to user on next login
    activated_at    DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    last_active     DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- =====================================================================
-- SIGHTINGS (community reports)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Sightings')
CREATE TABLE Sightings (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id),
    description     NVARCHAR(2000)  NOT NULL,
    latitude        FLOAT           NOT NULL,
    longitude       FLOAT           NOT NULL,
    photo_url       NVARCHAR(500)   NULL,
    category        NVARCHAR(50)    NOT NULL DEFAULT 'sardine_sighting',
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_Sightings_CreatedAt
    ON Sightings (created_at DESC)
    INCLUDE (latitude, longitude, category, user_id);
GO

CREATE NONCLUSTERED INDEX IX_Sightings_UserId
    ON Sightings (user_id);
GO

-- =====================================================================
-- COMMENTS
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Comments')
CREATE TABLE Comments (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    sighting_id     INT             NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
    user_id         INT             NOT NULL REFERENCES Users(id),
    text            NVARCHAR(1000)  NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_Comments_SightingId
    ON Comments (sighting_id)
    INCLUDE (user_id, created_at);
GO

-- =====================================================================
-- NOTIFICATIONS (in-app inbox)
-- =====================================================================
-- kind:        'sighting' | 'comment' | 'like'
-- user_id:     who RECEIVES the notification
-- actor_id:    who DID the action (reporter / commenter / liker)
-- comment_id:  set only when kind = 'comment'
--
-- FK design note — why the two FKs have different actions:
--   sighting_id  -> ON DELETE CASCADE     (deleting a sighting wipes its notifications)
--   comment_id   -> ON DELETE NO ACTION   (handled by the API instead)
--
-- SQL Server refuses to create more than one cascading path to the same
-- table (it flags it as "multiple cascade paths" because Comments already
-- cascades to Sightings). Even ON DELETE SET NULL counts as a cascade
-- path — so we have to make this one NO ACTION and clear the rows in
-- application code instead. The comment-delete route deletes the matching
-- notification rows before deleting the comment, so the NO ACTION FK
-- never blocks anything in practice.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
CREATE TABLE Notifications (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id),
    sighting_id     INT             NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
    kind            NVARCHAR(20)    NOT NULL DEFAULT 'sighting',
    actor_id        INT             NULL REFERENCES Users(id),
    comment_id      INT             NULL REFERENCES Comments(id) ON DELETE NO ACTION,
    is_read         BIT             NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_Notifications_UserId
    ON Notifications (user_id, is_read)
    INCLUDE (sighting_id, created_at);
GO

CREATE NONCLUSTERED INDEX IX_Notifications_UserKind
    ON Notifications (user_id, kind, created_at DESC);
GO

-- =====================================================================
-- SIGHTING LIKES (one row per user per sighting)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SightingLikes')
CREATE TABLE SightingLikes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    sighting_id     INT             NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_SightingLikes_Sighting_User UNIQUE (sighting_id, user_id)
);
GO

CREATE NONCLUSTERED INDEX IX_SightingLikes_Sighting
    ON SightingLikes (sighting_id)
    INCLUDE (user_id);
GO

-- =====================================================================
-- PUSH SUBSCRIPTIONS (one row per device per user)
-- =====================================================================
-- Multi-device support: a single user can have Chrome on desktop,
-- Firefox on laptop, and the PWA on their phone all subscribed at once.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PushSubscriptions')
CREATE TABLE PushSubscriptions (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    endpoint        NVARCHAR(500)   NOT NULL UNIQUE,
    p256dh          NVARCHAR(500)   NOT NULL,
    auth            NVARCHAR(255)   NOT NULL,
    user_agent      NVARCHAR(500)   NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    last_used_at    DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_PushSubscriptions_UserId
    ON PushSubscriptions (user_id)
    INCLUDE (endpoint, p256dh, auth);
GO

-- =====================================================================
-- MODERATION LOG (audit trail for admin deletions)
-- =====================================================================
-- Append-only record of every moderation action so we can answer
-- "who deleted this and why?" and produce evidence for SAHRC /
-- Equality Court matters when SardineWatch has to prove it acted
-- on reported hate speech. POPIA s.19 (security safeguards) is also
-- satisfied by having this audit trail.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ModerationLog')
CREATE TABLE ModerationLog (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    moderator_id    INT             NOT NULL REFERENCES Users(id),
    moderator_role  NVARCHAR(20)    NOT NULL,           -- 'admin'
    action          NVARCHAR(40)    NOT NULL,           -- delete_sighting | delete_comment
    target_kind     NVARCHAR(20)    NOT NULL,           -- sighting | comment
    target_id       INT             NOT NULL,           -- original row id (no FK; row will be gone)
    target_user_id  INT             NULL,               -- the author whose content was removed
    target_snapshot NVARCHAR(MAX)   NULL,               -- JSON copy of the row at time of deletion
    reason          NVARCHAR(500)   NULL,               -- moderator's optional note
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_ModerationLog_CreatedAt
    ON ModerationLog (created_at DESC)
    INCLUDE (moderator_id, target_kind, target_id);
GO

CREATE NONCLUSTERED INDEX IX_ModerationLog_Moderator
    ON ModerationLog (moderator_id, created_at DESC);
GO

-- =====================================================================
-- BAD WORDS (profanity filter)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BadWords')
CREATE TABLE BadWords (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    word            NVARCHAR(100)   NOT NULL UNIQUE
);
GO

-- =====================================================================
-- FEED PREFERENCES (per-user feed settings)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeedPreferences')
CREATE TABLE FeedPreferences (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) UNIQUE,
    show_sardines   BIT             NOT NULL DEFAULT 1,
    sort_by         NVARCHAR(20)    NOT NULL DEFAULT 'time'    -- 'time' | 'distance'
);
GO

-- =====================================================================
-- SEED DATA
-- =====================================================================
-- Single admin account for first login. Change the password immediately
-- after you sign in for the first time (Settings → Account → Password).
--
--   Email:    admin@sardinespotter.com
--   Password: Admin@2026!
--   Role:     admin
--
-- The bcrypt hash below is for 'Admin@2026!' specifically — if you need
-- to change the seeded password before first run, generate a new hash
-- with: node -e "console.log(require('bcryptjs').hashSync('YOUR_PW', 12))"
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'admin@sardinespotter.com')
INSERT INTO Users (email, password, nickname, role, radius)
VALUES (
    'admin@sardinespotter.com',
    '$2b$12$WPa.e/mqKhUFa5/9SwEgluIgGUan.p03pT6Zfh8Ihi/RkwugXhUUu',
    'Admin',
    'admin',
    40000
);
GO

-- =====================================================================
-- POST-CREATION ALTERATIONS
-- =====================================================================
-- Add new columns / indexes here as ALTER TABLE statements.
-- Each one is guarded so the script is safe to re-run at any time
-- without dropping or recreating any table.
-- Format:
--   IF NOT EXISTS (SELECT 1 FROM sys.columns
--                  WHERE object_id = OBJECT_ID('TableName') AND name = 'column_name')
--       ALTER TABLE TableName ADD column_name <type> <constraints>;
--   GO
-- =====================================================================

-- 2026-06-15: ban reason shown to suspended users on login
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('Users') AND name = 'ban_reason')
    ALTER TABLE Users ADD ban_reason NVARCHAR(500) NULL;
GO

-- 2026-06-24: password reset tokens
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PasswordResetTokens')
CREATE TABLE PasswordResetTokens (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token_hash  NVARCHAR(128)   NOT NULL UNIQUE,   -- SHA-256 hex of the raw token
    expires_at  DATETIME        NOT NULL,
    used_at     DATETIME        NULL,              -- set when consumed; prevents reuse
    created_at  DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

CREATE NONCLUSTERED INDEX IX_PasswordResetTokens_Hash
    ON PasswordResetTokens (token_hash)
    INCLUDE (user_id, expires_at, used_at);
GO

PRINT '=== SardineWatch schema ready ===';
PRINT 'Admin login: admin@sardinespotter.com / Admin@2026!';
GO
