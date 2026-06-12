-- Sardine Spotter - Clean Database Schema
-- Stripped of all GoldenRadar legacy code
-- SQL Server compatible

-- =============================================
-- USERS
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE Users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    email           NVARCHAR(255)   NOT NULL UNIQUE,
    password        NVARCHAR(255)   NOT NULL,
    nickname        NVARCHAR(100)   NOT NULL,
    role            NVARCHAR(20)    NOT NULL DEFAULT 'user',  -- 'god' | 'admin' | 'user'
    radius          INT             NOT NULL DEFAULT 50,       -- km
    avatar_url      NVARCHAR(500)   NULL,
    push_endpoint   NVARCHAR(500)   NULL,
    push_p256dh     NVARCHAR(500)   NULL,
    push_auth       NVARCHAR(255)   NULL,
    email_alerts    BIT             NOT NULL DEFAULT 0,
    is_active       BIT             NOT NULL DEFAULT 1,
    activated_at    DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    last_active     DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- =============================================
-- SIGHTINGS (reports)
-- =============================================
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

-- =============================================
-- COMMENTS
-- =============================================
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

-- =============================================
-- NOTIFICATIONS
-- =============================================
-- kind: 'sighting' (new report) | 'comment' (someone commented on a sighting)
-- actor_id: who did the action (reporter for sighting, commenter for comment)
-- comment_id: set only when kind = 'comment'
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
CREATE TABLE Notifications (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id),
    sighting_id     INT             NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
    kind            NVARCHAR(20)    NOT NULL DEFAULT 'sighting',
    actor_id        INT             NULL REFERENCES Users(id),
    comment_id      INT             NULL REFERENCES Comments(id),
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

-- =============================================
-- PUSH SUBSCRIPTIONS (one row per device per user)
-- =============================================
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

-- =============================================
-- BAD WORDS (profanity filter)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BadWords')
CREATE TABLE BadWords (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    word            NVARCHAR(100)   NOT NULL UNIQUE
);
GO

-- =============================================
-- FEED PREFERENCES
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeedPreferences')
CREATE TABLE FeedPreferences (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) UNIQUE,
    show_sardines   BIT             NOT NULL DEFAULT 1,
    sort_by         NVARCHAR(20)    NOT NULL DEFAULT 'time'  -- 'time' | 'distance'
);
GO

-- =============================================
-- SEED DATA
-- =============================================

-- GOD mode user (full control — manage users, delete anything, admin panel)
-- Password: Admin@2026!  (CHANGE THIS after first login)
INSERT INTO Users (email, password, nickname, role, radius)
VALUES (
    'admin@sardinespotter.com',
    '$2b$12$WPa.e/mqKhUFa5/9SwEgluIgGUan.p03pT6Zfh8Ihi/RkwugXhUUu',
    'GodMode',
    'god',
    40000
);
GO

-- Standard web user (regular community member)
-- Password: User@2026!  (CHANGE THIS after first login)
INSERT INTO Users (email, password, nickname, role, radius)
VALUES (
    'user@sardinespotter.com',
    '$2b$12$dWipNFn2w/B72ySHeU6ypeHfb2GjxkkMIsFYLF6/qbFABzqD/sNQW',
    'WebUser',
    'user',
    50
);
GO

PRINT 'Sardine Spotter schema and seed data created successfully.';
GO
