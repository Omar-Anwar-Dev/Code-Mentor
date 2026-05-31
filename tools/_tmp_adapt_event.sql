SET QUOTED_IDENTIFIER ON;
INSERT INTO PathAdaptationEvents
(Id, PathId, UserId, TriggeredAt, [Trigger], SignalLevel, BeforeStateJson, AfterStateJson, AIReasoningText, ConfidenceScore, ActionsJson, LearnerDecision, RespondedAt, AIPromptVersion, TokensInput, TokensOutput, IdempotencyKey)
VALUES
(NEWID(),
 'B499E321-725C-4CC4-A0C1-82E208B0A22C',
 '4F954F6A-2FF1-460A-8158-E65F215464E9',
 SYSUTCDATETIME(),
 'ScoreSwing',
 'Medium',
 N'[]',
 N'[]',
 N'Based on your recent submissions, your OOP score swung from 50 to 70. Recommended: push the harder OOP task earlier so you stay challenged at the right level, and swap the third task for a slightly higher-difficulty Backend task to strengthen your weaker Database area.',
 0.86,
 N'[{"type":"reorder","targetPosition":1,"newTaskId":null,"newOrderIndex":2,"reason":"Move the harder OOP task earlier to match your jump in OOP score.","confidence":0.88},{"type":"swap","targetPosition":3,"newTaskId":"4ADDCE9A-0D7E-4132-8475-B7F0FC87A4A7","newOrderIndex":null,"reason":"Swap the third task for a slightly higher-difficulty Backend task targeting your weaker Database area.","confidence":0.84}]',
 'Pending',
 NULL,
 'adapt_path_v1',
 1450,
 380,
 CONVERT(varchar(100), NEWID()));
SELECT 'Pending events for learner=' + CONVERT(varchar, COUNT(*)) FROM PathAdaptationEvents WHERE UserId='4F954F6A-2FF1-460A-8158-E65F215464E9' AND LearnerDecision='Pending';
