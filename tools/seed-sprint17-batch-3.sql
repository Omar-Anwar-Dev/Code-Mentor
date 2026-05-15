-- Sprint 17 content batch 3 -- applied via run_content_batch_s17.py at 2026-05-14T22:58:50Z
-- BatchId: ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8
-- Drafts: 15 expected (5 cats Ã— 3 diffs Ã— 1)
-- Reviewer: Claude single-reviewer per ADR-056 (extended to S17 by ADR-057)
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b551f6f5-0894-450e-8a7a-26adf7839158', N'Which data structure allows you to push and pop values at one end in O(1) time but does not let you remove the oldest inserted value without reprocessing newer ones?', 1, N'DataStructures',
     N'["Stack", "Queue", "Hash table", "Binary search tree"]', N'A', N'A stack only exposes the top end, so push/pop stay O(1); a queue can remove the oldest entry directly without touching newer ones, so it does not match the restriction.',
     SYSUTCDATETIME(), 1,
     1.000, -1.500, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('8238e093-e76c-4ba3-9dd0-ac8a9fc9a691', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 0, N'Approved',
     N'Which data structure allows you to push and pop values at one end in O(1) time but does not let you remove the oldest inserted value without reprocessing newer ones?', NULL, NULL,
     N'["Stack", "Queue", "Hash table", "Binary search tree"]', N'A', N'A stack only exposes the top end, so push/pop stay O(1); a queue can remove the oldest entry directly without touching newer ones, so it does not match the restriction.',
     1.000, -1.500, N'An easy concept with clear discrimination between stack and queue behavior justifies a moderate irtA and low irtB.', N'DataStructures', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which data structure allows you to push and pop values at one end in O(1) time but does not let you remove the oldest inserted value without reprocessing newer ones?", "codeSnippet": null, "codeLanguage": null, "options": ["Stack", "Queue", "Hash table", "Binary search tree"], "correctAnswer": "A", "explanation": "A stack only exposes the top end, so push/pop stay O(1); a queue can remove the oldest entry directly without touching newer ones, so it does not match the restriction.", "irtA": 1.0, "irtB": -1.5, "rationale": "An easy concept with clear discrimination between stack and queue behavior justifies a moderate irtA and low irtB.", "category": "DataStructures", "difficulty": 1}',
     'b551f6f5-0894-450e-8a7a-26adf7839158');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('5dd0c015-54cd-41fc-abf4-1d64e5b6a6ff', N'Given this circular buffer implementation, what is the maximum number of enqueues that can succeed before `is_full()` returns True, and why?', 2, N'DataStructures',
     N'["capacity - 1, because one slot stays empty to distinguish full from empty", "capacity, since head and tail overlap only after a full cycle", "capacity + 1, because the modulo wrap adds an extra usable slot", "capacity // 2, due to halving when tail advances past head"]', N'A', N'The queue uses a reserved slot so head==tail always means empty; leaving one space ensures full detection, while the nearest distractor wrongly assumes head==tail only on wrap-around.',
     SYSUTCDATETIME(), 1,
     1.200, 0.100, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class CircularQueue:
    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.tail = 0

    def is_full(self):
        return (self.tail + 1) % self.capacity == self.head

    def enqueue(self, item):
        if self.is_full():
            raise OverflowError
        self.buffer[self.tail] = item
        self.tail = (self.tail + 1) % self.capacity', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('7438d98e-1b20-4397-b837-4aae8763f9ad', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 1, N'Approved',
     N'Given this circular buffer implementation, what is the maximum number of enqueues that can succeed before `is_full()` returns True, and why?', N'class CircularQueue:
    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.tail = 0

    def is_full(self):
        return (self.tail + 1) % self.capacity == self.head

    def enqueue(self, item):
        if self.is_full():
            raise OverflowError
        self.buffer[self.tail] = item
        self.tail = (self.tail + 1) % self.capacity', N'python',
     N'["capacity - 1, because one slot stays empty to distinguish full from empty", "capacity, since head and tail overlap only after a full cycle", "capacity + 1, because the modulo wrap adds an extra usable slot", "capacity // 2, due to halving when tail advances past head"]', N'A', N'The queue uses a reserved slot so head==tail always means empty; leaving one space ensures full detection, while the nearest distractor wrongly assumes head==tail only on wrap-around.',
     1.200, 0.100, N'Medium discrimination because understanding the reserved slot distinction distinguishes students who have internalized circular-buffer design.', N'DataStructures', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given this circular buffer implementation, what is the maximum number of enqueues that can succeed before `is_full()` returns True, and why?", "codeSnippet": "class CircularQueue:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.buffer = [None] * capacity\n        self.head = 0\n        self.tail = 0\n\n    def is_full(self):\n        return (self.tail + 1) % self.capacity == self.head\n\n    def enqueue(self, item):\n        if self.is_full():\n            raise OverflowError\n        self.buffer[self.tail] = item\n        self.tail = (self.tail + 1) % self.capacity", "codeLanguage": "python", "options": ["capacity - 1, because one slot stays empty to distinguish full from empty", "capacity, since head and tail overlap only after a full cycle", "capacity + 1, because the modulo wrap adds an extra usable slot", "capacity // 2, due to halving when tail advances past head"], "correctAnswer": "A", "explanation": "The queue uses a reserved slot so head==tail always means empty; leaving one space ensures full detection, while the nearest distractor wrongly assumes head==tail only on wrap-around.", "irtA": 1.2, "irtB": 0.1, "rationale": "Medium discrimination because understanding the reserved slot distinction distinguishes students who have internalized circular-buffer design.", "category": "DataStructures", "difficulty": 2}',
     '5dd0c015-54cd-41fc-abf4-1d64e5b6a6ff');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('5bfd073c-aee3-4324-ae4e-2a1b452c7dd7', N'The `isBST` helper below only compares each node to its immediate children. Why can it still return true on some nonâ€‘BSTs, and what change would guarantee correctness?', 3, N'DataStructures',
     N'["Track allowable min/max values for each subtree during recursion", "Store each node''s subtree size and reject if left size â‰¥ right size", "Only inspect the parent pointer to ensure left<parent<right", "Rebalance the tree during validation so local checks suffice"]', N'A', N'Passing min/max bounds ensures every descendant respects the BST order, whereas comparing subtree sizes (option B) or only parents (option C) still lets distant descendants violate the order.',
     SYSUTCDATETIME(), 1,
     1.600, 1.100, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class Node { int value; Node left, right; }
boolean isBST(Node node) {
  if (node == null) return true;
  if (node.left != null && node.left.value > node.value) return false;
  if (node.right != null && node.right.value < node.value) return false;
  return isBST(node.left) && isBST(node.right);
}', N'java',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('c0020409-46ae-4256-b5da-5198bbd0f7a6', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 2, N'Approved',
     N'The `isBST` helper below only compares each node to its immediate children. Why can it still return true on some nonâ€‘BSTs, and what change would guarantee correctness?', N'class Node { int value; Node left, right; }
boolean isBST(Node node) {
  if (node == null) return true;
  if (node.left != null && node.left.value > node.value) return false;
  if (node.right != null && node.right.value < node.value) return false;
  return isBST(node.left) && isBST(node.right);
}', N'java',
     N'["Track allowable min/max values for each subtree during recursion", "Store each node''s subtree size and reject if left size â‰¥ right size", "Only inspect the parent pointer to ensure left<parent<right", "Rebalance the tree during validation so local checks suffice"]', N'A', N'Passing min/max bounds ensures every descendant respects the BST order, whereas comparing subtree sizes (option B) or only parents (option C) still lets distant descendants violate the order.',
     1.600, 1.100, N'Hard question requiring reasoning about ancestor constraints, so high discrimination and above-average difficulty.', N'DataStructures', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The `isBST` helper below only compares each node to its immediate children. Why can it still return true on some nonâ€‘BSTs, and what change would guarantee correctness?", "codeSnippet": "class Node { int value; Node left, right; }\nboolean isBST(Node node) {\n  if (node == null) return true;\n  if (node.left != null && node.left.value > node.value) return false;\n  if (node.right != null && node.right.value < node.value) return false;\n  return isBST(node.left) && isBST(node.right);\n}", "codeLanguage": "java", "options": ["Track allowable min/max values for each subtree during recursion", "Store each node''s subtree size and reject if left size â‰¥ right size", "Only inspect the parent pointer to ensure left<parent<right", "Rebalance the tree during validation so local checks suffice"], "correctAnswer": "A", "explanation": "Passing min/max bounds ensures every descendant respects the BST order, whereas comparing subtree sizes (option B) or only parents (option C) still lets distant descendants violate the order.", "irtA": 1.6, "irtB": 1.1, "rationale": "Hard question requiring reasoning about ancestor constraints, so high discrimination and above-average difficulty.", "category": "DataStructures", "difficulty": 3}',
     '5bfd073c-aee3-4324-ae4e-2a1b452c7dd7');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b57af332-b930-43b1-a121-7b49b9e31c9c', N'Which algorithmic strategy splits a problem into smaller independent subproblems, solves each recursively, and then merges their results?', 1, N'Algorithms',
     N'["Divide and conquer", "Greedy selection", "Dynamic programming with memoization", "Backtracking with explicit search"]', N'A', N'Divide and conquer explicitly breaks the input into independent halves and merges their solutions; greedy algorithms build up a solution step-by-step without solving subproblems, so they do not follow this recursive divide-merge pattern.',
     SYSUTCDATETIME(), 1,
     1.100, -1.400, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d869cbde-f073-42c6-8d63-c0b53ec4458f', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 3, N'Approved',
     N'Which algorithmic strategy splits a problem into smaller independent subproblems, solves each recursively, and then merges their results?', NULL, NULL,
     N'["Divide and conquer", "Greedy selection", "Dynamic programming with memoization", "Backtracking with explicit search"]', N'A', N'Divide and conquer explicitly breaks the input into independent halves and merges their solutions; greedy algorithms build up a solution step-by-step without solving subproblems, so they do not follow this recursive divide-merge pattern.',
     1.100, -1.400, N'A basic conceptual question distinguishing divide-and-conquer from other high-level strategies deserves moderate discrimination and an easy difficulty setting.', N'Algorithms', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which algorithmic strategy splits a problem into smaller independent subproblems, solves each recursively, and then merges their results?", "codeSnippet": null, "codeLanguage": null, "options": ["Divide and conquer", "Greedy selection", "Dynamic programming with memoization", "Backtracking with explicit search"], "correctAnswer": "A", "explanation": "Divide and conquer explicitly breaks the input into independent halves and merges their solutions; greedy algorithms build up a solution step-by-step without solving subproblems, so they do not follow this recursive divide-merge pattern.", "irtA": 1.1, "irtB": -1.4, "rationale": "A basic conceptual question distinguishing divide-and-conquer from other high-level strategies deserves moderate discrimination and an easy difficulty setting.", "category": "Algorithms", "difficulty": 1}',
     'b57af332-b930-43b1-a121-7b49b9e31c9c');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('ad3ee918-c926-4a66-b85d-ba24d8e8be70', N'Given that `arr` was produced by rotating a sorted ascending list, what invariant keeps the minimum element inside the search window `[lo, hi]` as the loop shrinks it?', 2, N'Algorithms',
     N'["If arr[mid] > arr[hi], the min is right of mid; otherwise it is at or left of mid, so each branch keeps the min in [lo, hi].", "Because arr[lo:hi+1] stays sorted, comparing arr[mid] and arr[hi] safely discards half of it every time.", "arr[mid] and arr[hi] always straddle the rotation point, so moving lo/hi based on their order keeps mid as a candidate.", "Each iteration only removes one index, so eventually lo == hi points to the minimum."]', N'A', N'When arr[mid] > arr[hi] the pivot must be between mid and hi so the minimum lies there; otherwise it lies at or before mid, keeping the min inside [lo, hi]. The most plausible distractor wrongly assumes [lo:hi+1] stays sorted despite the rotation, so halving based on that incorrect premise can discard the minimum.',
     SYSUTCDATETIME(), 1,
     1.300, 0.300, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'def min_in_rotated(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] > arr[hi]:
            lo = mid + 1
        else:
            hi = mid
    return arr[lo]', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('83971408-837b-44cf-9db3-a9973ff73bef', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 4, N'Approved',
     N'Given that `arr` was produced by rotating a sorted ascending list, what invariant keeps the minimum element inside the search window `[lo, hi]` as the loop shrinks it?', N'def min_in_rotated(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] > arr[hi]:
            lo = mid + 1
        else:
            hi = mid
    return arr[lo]', N'python',
     N'["If arr[mid] > arr[hi], the min is right of mid; otherwise it is at or left of mid, so each branch keeps the min in [lo, hi].", "Because arr[lo:hi+1] stays sorted, comparing arr[mid] and arr[hi] safely discards half of it every time.", "arr[mid] and arr[hi] always straddle the rotation point, so moving lo/hi based on their order keeps mid as a candidate.", "Each iteration only removes one index, so eventually lo == hi points to the minimum."]', N'A', N'When arr[mid] > arr[hi] the pivot must be between mid and hi so the minimum lies there; otherwise it lies at or before mid, keeping the min inside [lo, hi]. The most plausible distractor wrongly assumes [lo:hi+1] stays sorted despite the rotation, so halving based on that incorrect premise can discard the minimum.',
     1.300, 0.300, N'The invariant sharply separates learners who understand how the rotation affects comparisons, so a medium discriminator is appropriate.', N'Algorithms', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given that `arr` was produced by rotating a sorted ascending list, what invariant keeps the minimum element inside the search window `[lo, hi]` as the loop shrinks it?", "codeSnippet": "def min_in_rotated(arr):\n    lo, hi = 0, len(arr) - 1\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] > arr[hi]:\n            lo = mid + 1\n        else:\n            hi = mid\n    return arr[lo]", "codeLanguage": "python", "options": ["If arr[mid] > arr[hi], the min is right of mid; otherwise it is at or left of mid, so each branch keeps the min in [lo, hi].", "Because arr[lo:hi+1] stays sorted, comparing arr[mid] and arr[hi] safely discards half of it every time.", "arr[mid] and arr[hi] always straddle the rotation point, so moving lo/hi based on their order keeps mid as a candidate.", "Each iteration only removes one index, so eventually lo == hi points to the minimum."], "correctAnswer": "A", "explanation": "When arr[mid] > arr[hi] the pivot must be between mid and hi so the minimum lies there; otherwise it lies at or before mid, keeping the min inside [lo, hi]. The most plausible distractor wrongly assumes [lo:hi+1] stays sorted despite the rotation, so halving based on that incorrect premise can discard the minimum.", "irtA": 1.3, "irtB": 0.3, "rationale": "The invariant sharply separates learners who understand how the rotation affects comparisons, so a medium discriminator is appropriate.", "category": "Algorithms", "difficulty": 2}',
     'ad3ee918-c926-4a66-b85d-ba24d8e8be70');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('f7d4a205-fda8-49d8-a5b3-f7514ae04317', N'Given the `count_paths` function below that explores only rightward or downward steps, what is its worst-case time complexity in terms of R rows and C columns when the grid contains no obstacles?', 3, N'Algorithms',
     N'["O(R * C)", "O(2^(R + C))", "O(R * C * log(R * C))", "O(R * C^2)"]', N'A', N'Memoization ensures each cellâ€™s dfs is evaluated once and each call processes at most two neighbors, yielding O(R*C); the most plausible distractor (C) adds an unnecessary log factor, which doesnâ€™t appear in the recursion or memo lookups.',
     SYSUTCDATETIME(), 1,
     1.400, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'def count_paths(grid):
    R = len(grid)
    C = len(grid[0])
    memo = {}
    def dfs(r, c):
        if (r, c) in memo:
            return memo[(r, c)]
        if r == R - 1 and c == C - 1:
            return 1
        total = 0
        for dr, dc in ((1, 0), (0, 1)):
            nr, nc = r + dr, c + dc
            if nr < R and nc < C and grid[nr][nc] == 0:
                total += dfs(nr, nc)
        memo[(r, c)] = total
        return total
    return dfs(0, 0)', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('b2c10b82-54ba-49c6-8bf8-b6076358590d', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 5, N'Approved',
     N'Given the `count_paths` function below that explores only rightward or downward steps, what is its worst-case time complexity in terms of R rows and C columns when the grid contains no obstacles?', N'def count_paths(grid):
    R = len(grid)
    C = len(grid[0])
    memo = {}
    def dfs(r, c):
        if (r, c) in memo:
            return memo[(r, c)]
        if r == R - 1 and c == C - 1:
            return 1
        total = 0
        for dr, dc in ((1, 0), (0, 1)):
            nr, nc = r + dr, c + dc
            if nr < R and nc < C and grid[nr][nc] == 0:
                total += dfs(nr, nc)
        memo[(r, c)] = total
        return total
    return dfs(0, 0)', N'python',
     N'["O(R * C)", "O(2^(R + C))", "O(R * C * log(R * C))", "O(R * C^2)"]', N'A', N'Memoization ensures each cellâ€™s dfs is evaluated once and each call processes at most two neighbors, yielding O(R*C); the most plausible distractor (C) adds an unnecessary log factor, which doesnâ€™t appear in the recursion or memo lookups.',
     1.400, 1.200, N'This question sharply discriminates students who understand memoized DFS complexity versus those who overcount, so a higher irtA and a difficulty-aligned irtB are appropriate.', N'Algorithms', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the `count_paths` function below that explores only rightward or downward steps, what is its worst-case time complexity in terms of R rows and C columns when the grid contains no obstacles?", "codeSnippet": "def count_paths(grid):\n    R = len(grid)\n    C = len(grid[0])\n    memo = {}\n    def dfs(r, c):\n        if (r, c) in memo:\n            return memo[(r, c)]\n        if r == R - 1 and c == C - 1:\n            return 1\n        total = 0\n        for dr, dc in ((1, 0), (0, 1)):\n            nr, nc = r + dr, c + dc\n            if nr < R and nc < C and grid[nr][nc] == 0:\n                total += dfs(nr, nc)\n        memo[(r, c)] = total\n        return total\n    return dfs(0, 0)", "codeLanguage": "python", "options": ["O(R * C)", "O(2^(R + C))", "O(R * C * log(R * C))", "O(R * C^2)"], "correctAnswer": "A", "explanation": "Memoization ensures each cellâ€™s dfs is evaluated once and each call processes at most two neighbors, yielding O(R*C); the most plausible distractor (C) adds an unnecessary log factor, which doesnâ€™t appear in the recursion or memo lookups.", "irtA": 1.4, "irtB": 1.2, "rationale": "This question sharply discriminates students who understand memoized DFS complexity versus those who overcount, so a higher irtA and a difficulty-aligned irtB are appropriate.", "category": "Algorithms", "difficulty": 3}',
     'f7d4a205-fda8-49d8-a5b3-f7514ae04317');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('a0845295-f5ae-444c-a7fa-349c6e1da032', N'What must be true so that invoking a method on a base-class reference uses the override defined in a derived class?', 1, N'OOP',
     N'["The base method is virtual and the derived class overrides it, enabling dynamic dispatch.", "The derived class defines the same method; the reference must be cast to derived before calling.", "Calling through a base reference always invokes the base implementation regardless of overrides.", "The derived override must explicitly call the base implementation when the base reference is used."]', N'A', N'Dynamic dispatch requires the base method be virtual and the derived class override it; casting (B) isnâ€™t needed when overriding is already in place.',
     SYSUTCDATETIME(), 1,
     1.000, -1.500, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d84d3e03-1016-4eb2-a58f-19cfd3a9485e', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 6, N'Approved',
     N'What must be true so that invoking a method on a base-class reference uses the override defined in a derived class?', NULL, NULL,
     N'["The base method is virtual and the derived class overrides it, enabling dynamic dispatch.", "The derived class defines the same method; the reference must be cast to derived before calling.", "Calling through a base reference always invokes the base implementation regardless of overrides.", "The derived override must explicitly call the base implementation when the base reference is used."]', N'A', N'Dynamic dispatch requires the base method be virtual and the derived class override it; casting (B) isnâ€™t needed when overriding is already in place.',
     1.000, -1.500, N'Difficulty is easy because it checks core virtual/override behavior, so average discrimination suffices.', N'OOP', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "What must be true so that invoking a method on a base-class reference uses the override defined in a derived class?", "codeSnippet": null, "codeLanguage": null, "options": ["The base method is virtual and the derived class overrides it, enabling dynamic dispatch.", "The derived class defines the same method; the reference must be cast to derived before calling.", "Calling through a base reference always invokes the base implementation regardless of overrides.", "The derived override must explicitly call the base implementation when the base reference is used."], "correctAnswer": "A", "explanation": "Dynamic dispatch requires the base method be virtual and the derived class override it; casting (B) isnâ€™t needed when overriding is already in place.", "irtA": 1.0, "irtB": -1.5, "rationale": "Difficulty is easy because it checks core virtual/override behavior, so average discrimination suffices.", "category": "OOP", "difficulty": 1}',
     'a0845295-f5ae-444c-a7fa-349c6e1da032');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('cecc4b69-8654-4d6a-9035-db0889523cc7', N'Given the following hierarchy, what prevents CustomLogger from overriding Identifier()?', 2, N'OOP',
     N'["BaseLogger is itself sealed, so no overrides are allowed", "FileLogger seals the overridden Identifier, stopping further overrides", "Identifier is private in BaseLogger, so CustomLogger canâ€™t see it", "Only abstract methods can be overridden, and Identifier has a body"]', N'B', N'FileLogger marks Identifier with sealed override, preventing any further overrides; option D is plausible but wrong because Identifier is virtual and thus overrideable unless sealed.',
     SYSUTCDATETIME(), 1,
     1.200, 0.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class BaseLogger {
    public virtual string Identifier() => "Base";
}

class FileLogger : BaseLogger {
    public sealed override string Identifier() => "File";
}

class CustomLogger : FileLogger {
    public override string Identifier() => "Custom"; // compiler error here
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('b2f70093-1c4a-4678-83a4-5db02b172f85', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 7, N'Approved',
     N'Given the following hierarchy, what prevents CustomLogger from overriding Identifier()?', N'class BaseLogger {
    public virtual string Identifier() => "Base";
}

class FileLogger : BaseLogger {
    public sealed override string Identifier() => "File";
}

class CustomLogger : FileLogger {
    public override string Identifier() => "Custom"; // compiler error here
}', N'csharp',
     N'["BaseLogger is itself sealed, so no overrides are allowed", "FileLogger seals the overridden Identifier, stopping further overrides", "Identifier is private in BaseLogger, so CustomLogger canâ€™t see it", "Only abstract methods can be overridden, and Identifier has a body"]', N'B', N'FileLogger marks Identifier with sealed override, preventing any further overrides; option D is plausible but wrong because Identifier is virtual and thus overrideable unless sealed.',
     1.200, 0.200, N'The question hinges on recognising sealed overrides, so it separates understanding at a medium discrimination level.', N'OOP', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the following hierarchy, what prevents CustomLogger from overriding Identifier()?", "codeSnippet": "class BaseLogger {\n    public virtual string Identifier() => \"Base\";\n}\n\nclass FileLogger : BaseLogger {\n    public sealed override string Identifier() => \"File\";\n}\n\nclass CustomLogger : FileLogger {\n    public override string Identifier() => \"Custom\"; // compiler error here\n}", "codeLanguage": "csharp", "options": ["BaseLogger is itself sealed, so no overrides are allowed", "FileLogger seals the overridden Identifier, stopping further overrides", "Identifier is private in BaseLogger, so CustomLogger canâ€™t see it", "Only abstract methods can be overridden, and Identifier has a body"], "correctAnswer": "B", "explanation": "FileLogger marks Identifier with sealed override, preventing any further overrides; option D is plausible but wrong because Identifier is virtual and thus overrideable unless sealed.", "irtA": 1.2, "irtB": 0.2, "rationale": "The question hinges on recognising sealed overrides, so it separates understanding at a medium discrimination level.", "category": "OOP", "difficulty": 2}',
     'cecc4b69-8654-4d6a-9035-db0889523cc7');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('ab139a4a-cdf8-49df-82fa-8bf9a6276916', N'In the snippet, what is the best explanation for the tag printed by `logger.Log` when a `SpecialLogger` instance is stored in a `LoggerBase` reference?', 3, N'OOP',
     N'["LoggerBase.Log is nonvirtual, so it always reads FileLogger''s overridden Tag.", "The Tag call resolves to the last override in the actual inheritance chain, which is FileLogger, since SpecialLogger hides, not overrides.", "Interface dispatch requires SpecialLogger to implement Tag explicitly, otherwise the base override is used.", "Because SpecialLogger declares Tag with new, LoggerBase.Log keeps using FileLogger''s override due to virtual dispatch rules."]', N'D', N'Tag is virtual in LoggerBase and overridden by FileLogger; SpecialLogger only hides it with new, so the virtual call still reaches FileLogger, unlike option B which misstates overriding as ''resolving to last override.''',
     SYSUTCDATETIME(), 1,
     1.400, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'using System;
interface ILogger { void Log(string msg); }
abstract class LoggerBase : ILogger {
    public virtual string Tag => "base";
    public void Log(string msg) => Console.WriteLine($"[{Tag}] {msg}");
}
class FileLogger : LoggerBase {
    public override string Tag => "file";
}
class SpecialLogger : FileLogger {
    public new string Tag => "special";
}
class Program {
    static void Main() {
        LoggerBase logger = new SpecialLogger();
        logger.Log("hi");
    }
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('a9942f54-18a8-4eb0-b95b-2acb9ac55af5', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 8, N'Approved',
     N'In the snippet, what is the best explanation for the tag printed by `logger.Log` when a `SpecialLogger` instance is stored in a `LoggerBase` reference?', N'using System;
interface ILogger { void Log(string msg); }
abstract class LoggerBase : ILogger {
    public virtual string Tag => "base";
    public void Log(string msg) => Console.WriteLine($"[{Tag}] {msg}");
}
class FileLogger : LoggerBase {
    public override string Tag => "file";
}
class SpecialLogger : FileLogger {
    public new string Tag => "special";
}
class Program {
    static void Main() {
        LoggerBase logger = new SpecialLogger();
        logger.Log("hi");
    }
}', N'csharp',
     N'["LoggerBase.Log is nonvirtual, so it always reads FileLogger''s overridden Tag.", "The Tag call resolves to the last override in the actual inheritance chain, which is FileLogger, since SpecialLogger hides, not overrides.", "Interface dispatch requires SpecialLogger to implement Tag explicitly, otherwise the base override is used.", "Because SpecialLogger declares Tag with new, LoggerBase.Log keeps using FileLogger''s override due to virtual dispatch rules."]', N'D', N'Tag is virtual in LoggerBase and overridden by FileLogger; SpecialLogger only hides it with new, so the virtual call still reaches FileLogger, unlike option B which misstates overriding as ''resolving to last override.''',
     1.400, 1.200, N'This question requires distinguishing hiding from overriding in a polymorphic call, so it discriminates well at a hard level.', N'OOP', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the snippet, what is the best explanation for the tag printed by `logger.Log` when a `SpecialLogger` instance is stored in a `LoggerBase` reference?", "codeSnippet": "using System;\ninterface ILogger { void Log(string msg); }\nabstract class LoggerBase : ILogger {\n    public virtual string Tag => \"base\";\n    public void Log(string msg) => Console.WriteLine($\"[{Tag}] {msg}\");\n}\nclass FileLogger : LoggerBase {\n    public override string Tag => \"file\";\n}\nclass SpecialLogger : FileLogger {\n    public new string Tag => \"special\";\n}\nclass Program {\n    static void Main() {\n        LoggerBase logger = new SpecialLogger();\n        logger.Log(\"hi\");\n    }\n}", "codeLanguage": "csharp", "options": ["LoggerBase.Log is nonvirtual, so it always reads FileLogger''s overridden Tag.", "The Tag call resolves to the last override in the actual inheritance chain, which is FileLogger, since SpecialLogger hides, not overrides.", "Interface dispatch requires SpecialLogger to implement Tag explicitly, otherwise the base override is used.", "Because SpecialLogger declares Tag with new, LoggerBase.Log keeps using FileLogger''s override due to virtual dispatch rules."], "correctAnswer": "D", "explanation": "Tag is virtual in LoggerBase and overridden by FileLogger; SpecialLogger only hides it with new, so the virtual call still reaches FileLogger, unlike option B which misstates overriding as ''resolving to last override.''", "irtA": 1.4, "irtB": 1.2, "rationale": "This question requires distinguishing hiding from overriding in a polymorphic call, so it discriminates well at a hard level.", "category": "OOP", "difficulty": 3}',
     'ab139a4a-cdf8-49df-82fa-8bf9a6276916');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('d92d4d09-8888-480a-bc69-4e21a9336b12', N'In a SQL query that both filters rows and computes aggregates, which clause removes rows before the aggregation step runs?', 1, N'Databases',
     N'["WHERE clause to filter rows before aggregation", "HAVING clause after grouping", "ORDER BY clause before aggregates", "GROUP BY clause to drop rows"]', N'A', N'WHERE filters rows before aggregates, while HAVING filters only after grouping so it cannot remove rows prior to aggregation.',
     SYSUTCDATETIME(), 1,
     1.000, -1.500, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('3af281aa-6537-457e-a10f-60e1988a52c3', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 9, N'Approved',
     N'In a SQL query that both filters rows and computes aggregates, which clause removes rows before the aggregation step runs?', NULL, NULL,
     N'["WHERE clause to filter rows before aggregation", "HAVING clause after grouping", "ORDER BY clause before aggregates", "GROUP BY clause to drop rows"]', N'A', N'WHERE filters rows before aggregates, while HAVING filters only after grouping so it cannot remove rows prior to aggregation.',
     1.000, -1.500, N'Simple concept with a clear pre-aggregation order, so standard discrimination and a low difficulty rating fit the easy level.', N'Databases', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In a SQL query that both filters rows and computes aggregates, which clause removes rows before the aggregation step runs?", "codeSnippet": null, "codeLanguage": null, "options": ["WHERE clause to filter rows before aggregation", "HAVING clause after grouping", "ORDER BY clause before aggregates", "GROUP BY clause to drop rows"], "correctAnswer": "A", "explanation": "WHERE filters rows before aggregates, while HAVING filters only after grouping so it cannot remove rows prior to aggregation.", "irtA": 1.0, "irtB": -1.5, "rationale": "Simple concept with a clear pre-aggregation order, so standard discrimination and a low difficulty rating fit the easy level.", "category": "Databases", "difficulty": 1}',
     'd92d4d09-8888-480a-bc69-4e21a9336b12');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('1f3cbff1-bd95-4689-85c8-db20ceec9bdc', N'Given the query below, which index best supports the WHERE filter and GROUP BY so the planner can avoid full scans before aggregation?', 2, N'Databases',
     N'["A composite index on (sale_date, region)", "A single-column index on (region)", "A composite index on (region, sale_date)", "A single-column index on (amount)"]', N'A', N'Indexing (sale_date, region) lets the optimizer first narrow rows by date filter and then quickly group by region; (region, sale_date) canâ€™t efficiently exploit the leading date filter, so itâ€™s less helpful.',
     SYSUTCDATETIME(), 1,
     1.000, 0.000, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'CREATE TABLE Sales (
  sale_id SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  region TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

SELECT region, SUM(amount)
FROM Sales
WHERE sale_date >= ''2024-01-01'' AND sale_date < ''2024-04-01''
GROUP BY region;', N'sql',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('fcdccc9c-b921-4541-afff-fb86bad4c222', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 10, N'Approved',
     N'Given the query below, which index best supports the WHERE filter and GROUP BY so the planner can avoid full scans before aggregation?', N'CREATE TABLE Sales (
  sale_id SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  region TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

SELECT region, SUM(amount)
FROM Sales
WHERE sale_date >= ''2024-01-01'' AND sale_date < ''2024-04-01''
GROUP BY region;', N'sql',
     N'["A composite index on (sale_date, region)", "A single-column index on (region)", "A composite index on (region, sale_date)", "A single-column index on (amount)"]', N'A', N'Indexing (sale_date, region) lets the optimizer first narrow rows by date filter and then quickly group by region; (region, sale_date) canâ€™t efficiently exploit the leading date filter, so itâ€™s less helpful.',
     1.000, 0.000, N'The question requires understanding which composite index ordering matches the WHERE clause and grouping, making standard discrimination and medium difficulty appropriate.', N'Databases', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the query below, which index best supports the WHERE filter and GROUP BY so the planner can avoid full scans before aggregation?", "codeSnippet": "CREATE TABLE Sales (\n  sale_id SERIAL PRIMARY KEY,\n  sale_date DATE NOT NULL,\n  region TEXT NOT NULL,\n  amount NUMERIC NOT NULL\n);\n\nSELECT region, SUM(amount)\nFROM Sales\nWHERE sale_date >= ''2024-01-01'' AND sale_date < ''2024-04-01''\nGROUP BY region;", "codeLanguage": "sql", "options": ["A composite index on (sale_date, region)", "A single-column index on (region)", "A composite index on (region, sale_date)", "A single-column index on (amount)"], "correctAnswer": "A", "explanation": "Indexing (sale_date, region) lets the optimizer first narrow rows by date filter and then quickly group by region; (region, sale_date) canâ€™t efficiently exploit the leading date filter, so itâ€™s less helpful.", "irtA": 1.0, "irtB": 0.0, "rationale": "The question requires understanding which composite index ordering matches the WHERE clause and grouping, making standard discrimination and medium difficulty appropriate.", "category": "Databases", "difficulty": 2}',
     '1f3cbff1-bd95-4689-85c8-db20ceec9bdc');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('74539584-187d-4c02-8879-d4bc895d31d7', N'A `WorkshopDetails(workshop_id PK, topic, presenter, language, slot)` table stores the languages and time slots that a workshop supports, but those two attributes vary independently (a workshop may offer any combination). Which redesign best enforces Fourth Normal Form while still allowing listing every language and slot per workshop?', 3, N'Databases',
     N'["Create WorkshopLanguages(workshop_id FK, language) and WorkshopSlots(workshop_id FK, slot) tables", "Keep WorkshopDetails but use PK(workshop_id, language, slot) so each combo is unique", "Introduce WorkshopVariants(workshop_id, language, slot) and allow duplicates to record each option", "Move language and slot into separate lookup tables without linking them to workshops"]', N'A', N'Option A removes the independent multi-valued attributes into separate tables so there is no multi-valued dependency per relation, while option B still keeps every languageâ€“slot combination in one relation and violates 4NF.',
     SYSUTCDATETIME(), 1,
     1.600, 1.400, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('e15d3a5b-7653-4f96-b91d-ec143418b11d', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 11, N'Approved',
     N'A `WorkshopDetails(workshop_id PK, topic, presenter, language, slot)` table stores the languages and time slots that a workshop supports, but those two attributes vary independently (a workshop may offer any combination). Which redesign best enforces Fourth Normal Form while still allowing listing every language and slot per workshop?', NULL, NULL,
     N'["Create WorkshopLanguages(workshop_id FK, language) and WorkshopSlots(workshop_id FK, slot) tables", "Keep WorkshopDetails but use PK(workshop_id, language, slot) so each combo is unique", "Introduce WorkshopVariants(workshop_id, language, slot) and allow duplicates to record each option", "Move language and slot into separate lookup tables without linking them to workshops"]', N'A', N'Option A removes the independent multi-valued attributes into separate tables so there is no multi-valued dependency per relation, while option B still keeps every languageâ€“slot combination in one relation and violates 4NF.',
     1.600, 1.400, N'Distinguishing independent multi-valued attributes is central to 4NF, so the question sharply discriminates and is above-average difficulty.', N'Databases', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "A `WorkshopDetails(workshop_id PK, topic, presenter, language, slot)` table stores the languages and time slots that a workshop supports, but those two attributes vary independently (a workshop may offer any combination). Which redesign best enforces Fourth Normal Form while still allowing listing every language and slot per workshop?", "codeSnippet": null, "codeLanguage": null, "options": ["Create WorkshopLanguages(workshop_id FK, language) and WorkshopSlots(workshop_id FK, slot) tables", "Keep WorkshopDetails but use PK(workshop_id, language, slot) so each combo is unique", "Introduce WorkshopVariants(workshop_id, language, slot) and allow duplicates to record each option", "Move language and slot into separate lookup tables without linking them to workshops"], "correctAnswer": "A", "explanation": "Option A removes the independent multi-valued attributes into separate tables so there is no multi-valued dependency per relation, while option B still keeps every languageâ€“slot combination in one relation and violates 4NF.", "irtA": 1.6, "irtB": 1.4, "rationale": "Distinguishing independent multi-valued attributes is central to 4NF, so the question sharply discriminates and is above-average difficulty.", "category": "Databases", "difficulty": 3}',
     '74539584-187d-4c02-8879-d4bc895d31d7');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('43da21dd-bce1-48b5-a6c8-ab92aa2ddb28', N'Which property distinguishes cryptographic hashing from encryption when storing passwords?', 1, N'Security',
     N'["Hashing is one-way while encryption can be reversed with the right key", "Hashing uses a shared secret key, so the digest can be decrypted later", "Encryption runs faster than hashing for long password lists", "Only encryption guarantees the integrity of stored data"]', N'A', N'Hashing is designed to be irreversible, so stored password hashes cannot be decrypted, whereas encryption is reversible with its key; option B wrongly treats hashing as key-based reversible transformation.',
     SYSUTCDATETIME(), 1,
     1.100, -1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('802830f7-392d-4e85-b1ae-cf14dc107c99', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 12, N'Approved',
     N'Which property distinguishes cryptographic hashing from encryption when storing passwords?', NULL, NULL,
     N'["Hashing is one-way while encryption can be reversed with the right key", "Hashing uses a shared secret key, so the digest can be decrypted later", "Encryption runs faster than hashing for long password lists", "Only encryption guarantees the integrity of stored data"]', N'A', N'Hashing is designed to be irreversible, so stored password hashes cannot be decrypted, whereas encryption is reversible with its key; option B wrongly treats hashing as key-based reversible transformation.',
     1.100, -1.200, N'The question is quite focused on a single conceptual distinction, so a moderate discriminator around 1.1 and a low difficulty bias reflect that.', N'Security', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which property distinguishes cryptographic hashing from encryption when storing passwords?", "codeSnippet": null, "codeLanguage": null, "options": ["Hashing is one-way while encryption can be reversed with the right key", "Hashing uses a shared secret key, so the digest can be decrypted later", "Encryption runs faster than hashing for long password lists", "Only encryption guarantees the integrity of stored data"], "correctAnswer": "A", "explanation": "Hashing is designed to be irreversible, so stored password hashes cannot be decrypted, whereas encryption is reversible with its key; option B wrongly treats hashing as key-based reversible transformation.", "irtA": 1.1, "irtB": -1.2, "rationale": "The question is quite focused on a single conceptual distinction, so a moderate discriminator around 1.1 and a low difficulty bias reflect that.", "category": "Security", "difficulty": 1}',
     '43da21dd-bce1-48b5-a6c8-ab92aa2ddb28');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('988abb1a-3801-4ed9-ab34-070ed63fdb7e', N'The server reads a CSRF token stored in a cookie and compares it with the form-submitted token using `==`. Why is the comparison still risky?', 2, N'Security',
     N'["Use a constant-time comparison (e.g., hmac.compare_digest) to avoid leaking the token via timing", "Trim whitespace from both tokens to avoid mismatches caused by encoding issues", "Store the token in a server-side session so the client cannot tamper with it", "Hash the submitted token before comparing to protect it from exposure in transit"]', N'A', N'The direct `==` comparison leaks how many leading bytes match through timing, so a constant-time compare closes that side-channel; simply trimming whitespace (B) doesnâ€™t prevent the timing information leak.',
     SYSUTCDATETIME(), 1,
     1.200, 0.000, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'import hmac

def check_csrf(request):
    cookie_token = request.cookies.get("csrf")
    form_token = request.form["csrf"]
    return cookie_token == form_token', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('86b19bd5-07c9-4b70-ba1b-405d2cb2b65d', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 13, N'Approved',
     N'The server reads a CSRF token stored in a cookie and compares it with the form-submitted token using `==`. Why is the comparison still risky?', N'import hmac

def check_csrf(request):
    cookie_token = request.cookies.get("csrf")
    form_token = request.form["csrf"]
    return cookie_token == form_token', N'python',
     N'["Use a constant-time comparison (e.g., hmac.compare_digest) to avoid leaking the token via timing", "Trim whitespace from both tokens to avoid mismatches caused by encoding issues", "Store the token in a server-side session so the client cannot tamper with it", "Hash the submitted token before comparing to protect it from exposure in transit"]', N'A', N'The direct `==` comparison leaks how many leading bytes match through timing, so a constant-time compare closes that side-channel; simply trimming whitespace (B) doesnâ€™t prevent the timing information leak.',
     1.200, 0.000, N'The question differentiates learners who know about timing channels, so a moderate discrimination and difficulty rating fits.', N'Security', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The server reads a CSRF token stored in a cookie and compares it with the form-submitted token using `==`. Why is the comparison still risky?", "codeSnippet": "import hmac\n\ndef check_csrf(request):\n    cookie_token = request.cookies.get(\"csrf\")\n    form_token = request.form[\"csrf\"]\n    return cookie_token == form_token", "codeLanguage": "python", "options": ["Use a constant-time comparison (e.g., hmac.compare_digest) to avoid leaking the token via timing", "Trim whitespace from both tokens to avoid mismatches caused by encoding issues", "Store the token in a server-side session so the client cannot tamper with it", "Hash the submitted token before comparing to protect it from exposure in transit"], "correctAnswer": "A", "explanation": "The direct `==` comparison leaks how many leading bytes match through timing, so a constant-time compare closes that side-channel; simply trimming whitespace (B) doesnâ€™t prevent the timing information leak.", "irtA": 1.2, "irtB": 0.0, "rationale": "The question differentiates learners who know about timing channels, so a moderate discrimination and difficulty rating fits.", "category": "Security", "difficulty": 2}',
     '988abb1a-3801-4ed9-ab34-070ed63fdb7e');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('4acb86e2-4a72-4a87-a75f-19e552c0378c', N'The following function checks an HMAC-bearing token. Why does this comparison still leak whether the first bytes of the signature match, and how should it be fixed?', 3, N'Security',
     N'["Use a constant-time comparison so every byte is compared before returning", "Hash the payload twice before computing HMAC to obscure byte prefixes", "Reject tokens whose header fields mismatch before computing the signature", "Rotate the signing key frequently to limit the attack window"]', N'A', N'A constant-time comparison prevents attackers from learning how many leading bytes match via timing, whereas hashing twice still lets unequal prefixes terminate early and leaks the same timing signal.',
     SYSUTCDATETIME(), 1,
     1.500, 1.000, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'const crypto = require(''crypto'');
const secret = ''top-secret'';
function isTokenValid(payload, signature) {
  const expected = crypto
    .createHmac(''sha256'', secret)
    .update(payload)
    .digest(''hex'');
  return expected === signature;
}', N'javascript',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('8ffca508-4893-4ad1-baef-d23567fadab5', 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8', 14, N'Approved',
     N'The following function checks an HMAC-bearing token. Why does this comparison still leak whether the first bytes of the signature match, and how should it be fixed?', N'const crypto = require(''crypto'');
const secret = ''top-secret'';
function isTokenValid(payload, signature) {
  const expected = crypto
    .createHmac(''sha256'', secret)
    .update(payload)
    .digest(''hex'');
  return expected === signature;
}', N'javascript',
     N'["Use a constant-time comparison so every byte is compared before returning", "Hash the payload twice before computing HMAC to obscure byte prefixes", "Reject tokens whose header fields mismatch before computing the signature", "Rotate the signing key frequently to limit the attack window"]', N'A', N'A constant-time comparison prevents attackers from learning how many leading bytes match via timing, whereas hashing twice still lets unequal prefixes terminate early and leaks the same timing signal.',
     1.500, 1.000, N'Hard reasoning about timing side channels merits a sharp discriminator and high difficulty rating.', N'Security', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The following function checks an HMAC-bearing token. Why does this comparison still leak whether the first bytes of the signature match, and how should it be fixed?", "codeSnippet": "const crypto = require(''crypto'');\nconst secret = ''top-secret'';\nfunction isTokenValid(payload, signature) {\n  const expected = crypto\n    .createHmac(''sha256'', secret)\n    .update(payload)\n    .digest(''hex'');\n  return expected === signature;\n}", "codeLanguage": "javascript", "options": ["Use a constant-time comparison so every byte is compared before returning", "Hash the payload twice before computing HMAC to obscure byte prefixes", "Reject tokens whose header fields mismatch before computing the signature", "Rotate the signing key frequently to limit the attack window"], "correctAnswer": "A", "explanation": "A constant-time comparison prevents attackers from learning how many leading bytes match via timing, whereas hashing twice still lets unequal prefixes terminate early and leaks the same timing signal.", "irtA": 1.5, "irtB": 1.0, "rationale": "Hard reasoning about timing side channels merits a sharp discriminator and high difficulty rating.", "category": "Security", "difficulty": 3}',
     '4acb86e2-4a72-4a87-a75f-19e552c0378c');

COMMIT TRANSACTION;

-- Verification:
SELECT COUNT(*) AS ApprovedCount FROM QuestionDrafts WHERE BatchId = 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8' AND Status = 'Approved';
SELECT COUNT(*) AS RejectedCount FROM QuestionDrafts WHERE BatchId = 'ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8' AND Status = 'Rejected';
SELECT COUNT(*) AS BankSize FROM Questions WHERE IsActive = 1;