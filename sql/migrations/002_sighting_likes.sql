-- Migration 002: SightingLikes table for the heart button
-- Safe to re-run (idempotent).
--
-- One row per (user, sighting). UNIQUE constraint makes the "did this user
-- like this sighting" check a single index seek.
--
-- Notifications.kind is just a string column so 'like' is a value, not a schema
-- change — nothing to alter on Notifications.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SightingLikes')
BEGIN
    CREATE TABLE SightingLikes (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        sighting_id INT             NOT NULL REFERENCES Sightings(id) ON DELETE CASCADE,
        user_id     INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        created_at  DATETIME        NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_SightingLikes_Sighting_User UNIQUE (sighting_id, user_id)
    );

    CREATE NONCLUSTERED INDEX IX_SightingLikes_Sighting
        ON SightingLikes (sighting_id)
        INCLUDE (user_id);
END
GO

PRINT 'Migration 002 applied: SightingLikes table';
GO
