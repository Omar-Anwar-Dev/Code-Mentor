-- S15-T4 (2026-05-14): backfill IRT_B on the 60 seed questions for live DBs
-- that already exist before the AddIrtAndAiColumnsToQuestions migration was
-- applied. Per ADR-049 / ADR-050 / ADR-055, the backfill rule is:
--
--   Difficulty 1 -> IRT_B = -1.0
--   Difficulty 2 -> IRT_B =  0.0   (already the migration default — no-op)
--   Difficulty 3 -> IRT_B = +1.0
--
-- IRT_A stays at 1.0 (the migration default), CalibrationSource stays at
-- 'AI' (placeholder pending Sprint 16 AI Generator + Sprint 17+ empirical
-- recalibration), and Source stays at 'Manual' (these are hand-authored).
--
-- WHY THIS SCRIPT EXISTS:
--   `DbInitializer.SeedQuestionsAsync()` short-circuits when Questions
--   already exist, so simply updating QuestionSeedData.cs (with the
--   new BuildSeed transformation) won't touch a live DB. This script
--   provides the matching one-shot backfill via UPDATE statements.
--
-- IDEMPOTENCY:
--   Each UPDATE is gated on `IRT_B = 0.0` (the migration default). Re-running
--   the script after the first apply finds zero rows to update — no rows are
--   re-touched, no values are overwritten if an admin has manually adjusted
--   them, and no new IRT_B values are clobbered after Sprint 17 recalibration.
--
-- HOW TO RUN (Windows PowerShell from the repo root):
--   sqlcmd -S localhost -d CodeMentor -E -i tools\seed-question-irt-backfill.sql
--
-- After running, the verification SELECT at the bottom should print 20 rows
-- per difficulty level (60 / 3) with the expected IRT_B values.

SET NOCOUNT ON;
USE [CodeMentor];
GO

PRINT '=== S15-T4 backfill: setting IRT_B from Difficulty for seed questions ===';
PRINT '';

-- Difficulty 1 questions -> IRT_B = -1.0 (only update rows still at the default)
UPDATE [Questions]
SET    [IRT_B] = -1.0
WHERE  [Difficulty] = 1
  AND  [IRT_B] = 0.0
  AND  [Source] = 'Manual';
PRINT CONCAT('  Difficulty 1 (IRT_B = -1.0): ', @@ROWCOUNT, ' rows updated.');

-- Difficulty 3 questions -> IRT_B = +1.0
UPDATE [Questions]
SET    [IRT_B] = 1.0
WHERE  [Difficulty] = 3
  AND  [IRT_B] = 0.0
  AND  [Source] = 'Manual';
PRINT CONCAT('  Difficulty 3 (IRT_B = +1.0): ', @@ROWCOUNT, ' rows updated.');

-- Difficulty 2 questions -> IRT_B = 0.0 (already the migration default; no UPDATE needed).
PRINT '  Difficulty 2 (IRT_B =  0.0): no-op (already at migration default).';
PRINT '';

-- ========================================================================
-- Verification: count seed questions by (Difficulty, IRT_B) and confirm the
-- distribution matches the expected backfill rule.
-- ========================================================================

PRINT '=== Verification: distribution of seed questions per (Difficulty, IRT_B) ===';
SELECT
    [Difficulty],
    [IRT_B],
    COUNT(*) AS [QuestionCount],
    [CalibrationSource],
    [Source]
FROM [Questions]
WHERE [Source] = 'Manual'
GROUP BY [Difficulty], [IRT_B], [CalibrationSource], [Source]
ORDER BY [Difficulty];

PRINT '';
PRINT '=== Sample 10 questions for spot-check ===';
SELECT TOP 10
    LEFT([Content], 70) AS [ContentSnippet],
    [Category],
    [Difficulty],
    [IRT_A],
    [IRT_B],
    [CalibrationSource],
    [Source]
FROM [Questions]
WHERE [Source] = 'Manual'
ORDER BY NEWID();
GO
