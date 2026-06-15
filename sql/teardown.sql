-- =====================================================================
-- SardineWatch — teardown
-- =====================================================================
-- Drops EVERY object created by schema.sql so you can rebuild from
-- scratch. Run this first, then run schema.sql.
--
-- Order matters: child tables (those with foreign keys pointing at
-- another table) must be dropped before their parents. The DROP TABLE
-- statements below are sequenced bottom-up through the FK graph.
--
-- Safe to re-run — every DROP is guarded with IF OBJECT_ID(...) IS NOT
-- NULL so missing objects don't raise an error.
-- =====================================================================

USE SardineSpotter;
GO

PRINT '=== Tearing down SardineWatch schema ===';
GO

-- ---------------------------------------------------------------------
-- Stored procedures (none ship today; left as a sweep for safety)
-- ---------------------------------------------------------------------
-- SQL Server's EXEC('...' + fn(...)) syntax rejects function calls in the
-- concatenation, so build the DROP statement into a variable and execute
-- it via sp_executesql instead.
DECLARE @sp SYSNAME;
DECLARE @sql NVARCHAR(500);
DECLARE proc_cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT name FROM sys.procedures WHERE is_ms_shipped = 0;
OPEN proc_cur;
FETCH NEXT FROM proc_cur INTO @sp;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'DROP PROCEDURE ' + QUOTENAME(@sp);
    EXEC sp_executesql @sql;
    FETCH NEXT FROM proc_cur INTO @sp;
END
CLOSE proc_cur;
DEALLOCATE proc_cur;
GO

-- ---------------------------------------------------------------------
-- Tables — leaves first, roots last
-- ---------------------------------------------------------------------
IF OBJECT_ID('ModerationLog', 'U')     IS NOT NULL DROP TABLE ModerationLog;
IF OBJECT_ID('FeedPreferences', 'U')   IS NOT NULL DROP TABLE FeedPreferences;
IF OBJECT_ID('BadWords', 'U')          IS NOT NULL DROP TABLE BadWords;
IF OBJECT_ID('PushSubscriptions', 'U') IS NOT NULL DROP TABLE PushSubscriptions;
IF OBJECT_ID('SightingLikes', 'U')     IS NOT NULL DROP TABLE SightingLikes;
IF OBJECT_ID('Notifications', 'U')     IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('Comments', 'U')          IS NOT NULL DROP TABLE Comments;
IF OBJECT_ID('Sightings', 'U')         IS NOT NULL DROP TABLE Sightings;
IF OBJECT_ID('Users', 'U')             IS NOT NULL DROP TABLE Users;
GO

PRINT '=== Teardown complete. Now run schema.sql ===';
GO
