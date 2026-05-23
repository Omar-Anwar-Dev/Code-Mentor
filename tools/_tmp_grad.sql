SET QUOTED_IDENTIFIER ON;
-- Mark in-progress task as Completed
UPDATE PathTasks SET Status='Completed', CompletedAt=SYSUTCDATETIME() WHERE Id='0704FAE6-52B3-4DFD-8CF0-0477E3E4BB69';

-- Set path to 100% + populate InitialSkillProfileJson (pre-path 'Before' snapshot)
UPDATE LearningPaths
SET ProgressPercent=100,
    InitialSkillProfileJson=N'[{"category":"DataStructures","smoothedScore":42},{"category":"Algorithms","smoothedScore":48},{"category":"OOP","smoothedScore":55},{"category":"Databases","smoothedScore":40},{"category":"Security","smoothedScore":45}]'
WHERE Id='B499E321-725C-4CC4-A0C1-82E208B0A22C';

SELECT 'Path Progress=' + CONVERT(varchar, ProgressPercent) FROM LearningPaths WHERE Id='B499E321-725C-4CC4-A0C1-82E208B0A22C';
SELECT 'Current LSP rows:';
SELECT Category, SmoothedScore FROM LearnerSkillProfiles WHERE UserId='4F954F6A-2FF1-460A-8158-E65F215464E9' ORDER BY Category;
