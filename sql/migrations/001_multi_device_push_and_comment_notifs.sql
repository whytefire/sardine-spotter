-- Migration 001: multi-device push subscriptions + comment notifications
-- Safe to re-run (idempotent).
--
-- Changes:
--   1. New table PushSubscriptions (one row per device, not per user)
--   2. Backfill existing Users.push_endpoint rows into PushSubscriptions
--   3. Notifications table gains: kind, actor_id, comment_id
--      'sighting' notifications: actor_id = reporter, comment_id NULL
--      'comment'  notifications: actor_id = commenter, comment_id set

-- =============================================
-- 1. PUSH SUBSCRIPTIONS TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PushSubscriptions')
BEGIN
    CREATE TABLE PushSubscriptions (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        endpoint    NVARCHAR(500)   NOT NULL UNIQUE,
        p256dh      NVARCHAR(500)   NOT NULL,
        auth        NVARCHAR(255)   NOT NULL,
        user_agent  NVARCHAR(500)   NULL,
        created_at  DATETIME        NOT NULL DEFAULT GETDATE(),
        last_used_at DATETIME       NOT NULL DEFAULT GETDATE()
    );

    CREATE NONCLUSTERED INDEX IX_PushSubscriptions_UserId
        ON PushSubscriptions (user_id)
        INCLUDE (endpoint, p256dh, auth);
END
GO

-- =============================================
-- 2. BACKFILL FROM Users.push_endpoint
-- =============================================
-- Copy any existing single-device subscriptions into the new table.
-- The unique index on endpoint protects against duplicates if this migration
-- is re-run after the user has re-subscribed.
INSERT INTO PushSubscriptions (user_id, endpoint, p256dh, auth, created_at, last_used_at)
SELECT u.id, u.push_endpoint, u.push_p256dh, u.push_auth, GETDATE(), GETDATE()
FROM Users u
WHERE u.push_endpoint IS NOT NULL
  AND u.push_p256dh IS NOT NULL
  AND u.push_auth IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM PushSubscriptions ps WHERE ps.endpoint = u.push_endpoint
  );
GO

-- =============================================
-- 3. NOTIFICATIONS TABLE ENHANCEMENTS
-- =============================================
-- kind: 'sighting' (new report) | 'comment' (someone commented)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'kind')
    ALTER TABLE Notifications ADD kind NVARCHAR(20) NOT NULL CONSTRAINT DF_Notifications_kind DEFAULT 'sighting';
GO

-- actor_id: who DID the action (reporter for sighting, commenter for comment)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'actor_id')
    ALTER TABLE Notifications ADD actor_id INT NULL REFERENCES Users(id);
GO

-- comment_id: only set when kind = 'comment'.
-- NB: no ON DELETE CASCADE here — SQL Server rejects multiple cascade paths to
-- the same parent (Notifications already cascades from Sightings). We clean up
-- comment notifications at the application level if a comment is ever deleted.
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'comment_id')
    ALTER TABLE Notifications ADD comment_id INT NULL REFERENCES Comments(id);
GO

-- Backfill: existing notifications were all 'sighting' kind. actor_id is the
-- sighting reporter (the user who owns the Sighting row).
UPDATE n
   SET actor_id = s.user_id
  FROM Notifications n
  JOIN Sightings s ON s.id = n.sighting_id
 WHERE n.actor_id IS NULL;
GO

-- Index to speed up "fetch my alerts" queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notifications_UserKind' AND object_id = OBJECT_ID('Notifications'))
    CREATE NONCLUSTERED INDEX IX_Notifications_UserKind
        ON Notifications (user_id, kind, created_at DESC);
GO

PRINT 'Migration 001 applied: PushSubscriptions + Notifications.kind/actor_id/comment_id';
GO
