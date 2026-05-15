-- Sprint 17 content batch 4 -- applied via run_content_batch_s17.py at 2026-05-14T23:02:50Z
-- BatchId: 9271946e-ce60-4419-bacd-66a4873e13f8
-- Drafts: 15 expected (5 cats Ã— 3 diffs Ã— 1)
-- Reviewer: Claude single-reviewer per ADR-056 (extended to S17 by ADR-057)
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('25e73fe1-c433-4778-b9e0-6b9d334d4367', N'A singly linked list keeps both head and tail pointers. Why does appending a node still run in constant time?', 1, N'DataStructures',
     N'["Because you update tail->next and tail directly, without walking the list", "Because each node stores both next and previous pointers for faster appends", "Because nodes live in contiguous memory so you can compute the end index", "Because you must traverse from head to reach the tail before linking the new node"]', N'A', N'Option A describes the actual O(1) append when a tail pointer lets you link the new node immediately; option D is wrong because maintaining the tail pointer avoids any traversal.',
     SYSUTCDATETIME(), 1,
     0.900, -1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('4622d87b-402e-4dea-add2-8e9bd4938da5', '9271946e-ce60-4419-bacd-66a4873e13f8', 0, N'Approved',
     N'A singly linked list keeps both head and tail pointers. Why does appending a node still run in constant time?', NULL, NULL,
     N'["Because you update tail->next and tail directly, without walking the list", "Because each node stores both next and previous pointers for faster appends", "Because nodes live in contiguous memory so you can compute the end index", "Because you must traverse from head to reach the tail before linking the new node"]', N'A', N'Option A describes the actual O(1) append when a tail pointer lets you link the new node immediately; option D is wrong because maintaining the tail pointer avoids any traversal.',
     0.900, -1.200, N'Easy recognition question so moderate discrimination (â‰ˆ0.9) and low difficulty (âˆ’1.2) reflect that students either know or guess.', N'DataStructures', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "A singly linked list keeps both head and tail pointers. Why does appending a node still run in constant time?", "codeSnippet": null, "codeLanguage": null, "options": ["Because you update tail->next and tail directly, without walking the list", "Because each node stores both next and previous pointers for faster appends", "Because nodes live in contiguous memory so you can compute the end index", "Because you must traverse from head to reach the tail before linking the new node"], "correctAnswer": "A", "explanation": "Option A describes the actual O(1) append when a tail pointer lets you link the new node immediately; option D is wrong because maintaining the tail pointer avoids any traversal.", "irtA": 0.9, "irtB": -1.2, "rationale": "Easy recognition question so moderate discrimination (â‰ˆ0.9) and low difficulty (âˆ’1.2) reflect that students either know or guess.", "category": "DataStructures", "difficulty": 1}',
     '25e73fe1-c433-4778-b9e0-6b9d334d4367');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b3ee5c81-6bbb-450e-b9db-c1014937a4c5', N'Given the queue implemented with two stacks below, what is the amortized time complexity of enqueue and dequeue over n operations?', 2, N'DataStructures',
     N'["Amortized O(1) because each element moves between stacks at most once", "Worst-case O(n) per operation since each dequeue may move every element", "O(log n) because stack transfers halve the number of elements each time", "Amortized O(n) since the out_stack is emptied and refilled frequently"]', N'A', N'Each item only moves from in_stack to out_stack once, so the average per operation is O(1); the worst-case move of n items during a dequeue (option B) is real but does not persist across the sequence.',
     SYSUTCDATETIME(), 1,
     1.100, 0.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class TwoStackQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []
    def enqueue(self, value):
        self.in_stack.append(value)
    def dequeue(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack.pop()', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('c70b1600-ca68-4618-b344-b58667f590b9', '9271946e-ce60-4419-bacd-66a4873e13f8', 1, N'Approved',
     N'Given the queue implemented with two stacks below, what is the amortized time complexity of enqueue and dequeue over n operations?', N'class TwoStackQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []
    def enqueue(self, value):
        self.in_stack.append(value)
    def dequeue(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack.pop()', N'python',
     N'["Amortized O(1) because each element moves between stacks at most once", "Worst-case O(n) per operation since each dequeue may move every element", "O(log n) because stack transfers halve the number of elements each time", "Amortized O(n) since the out_stack is emptied and refilled frequently"]', N'A', N'Each item only moves from in_stack to out_stack once, so the average per operation is O(1); the worst-case move of n items during a dequeue (option B) is real but does not persist across the sequence.',
     1.100, 0.200, N'Moderate discrimination with a typical medium difficulty level fitting amortized analysis.', N'DataStructures', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the queue implemented with two stacks below, what is the amortized time complexity of enqueue and dequeue over n operations?", "codeSnippet": "class TwoStackQueue:\n    def __init__(self):\n        self.in_stack = []\n        self.out_stack = []\n    def enqueue(self, value):\n        self.in_stack.append(value)\n    def dequeue(self):\n        if not self.out_stack:\n            while self.in_stack:\n                self.out_stack.append(self.in_stack.pop())\n        return self.out_stack.pop()", "codeLanguage": "python", "options": ["Amortized O(1) because each element moves between stacks at most once", "Worst-case O(n) per operation since each dequeue may move every element", "O(log n) because stack transfers halve the number of elements each time", "Amortized O(n) since the out_stack is emptied and refilled frequently"], "correctAnswer": "A", "explanation": "Each item only moves from in_stack to out_stack once, so the average per operation is O(1); the worst-case move of n items during a dequeue (option B) is real but does not persist across the sequence.", "irtA": 1.1, "irtB": 0.2, "rationale": "Moderate discrimination with a typical medium difficulty level fitting amortized analysis.", "category": "DataStructures", "difficulty": 2}',
     'b3ee5c81-6bbb-450e-b9db-c1014937a4c5');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('308d6147-9740-40a9-a3a4-b73fb21aac44', N'Given the ArrayList-backed adjacency lists in the snippet, what is the worst-case time complexity of `removeVertex(v)` in terms of the degree d of v (assuming all neighbors also have Î˜(d) edges)?', 3, N'DataStructures',
     N'["O(d^2), because each neighbor removal scans its list of size Î˜(d)", "O(d log d), because removing from ArrayList can be binary searched", "O(d), because each neighbor is visited exactly once", "O(d + n), because removing v touches all adjacency lists in the graph"]', N'A', N'Removing v visits Î˜(d) neighbors, but each `remove` from an ArrayList-backed adjacency list scans the neighborâ€™s list (Î˜(d)), so the total is Î˜(d^2); the plausible O(d) claim ignores that the removals scan each neighbor list, not constant time.',
     SYSUTCDATETIME(), 1,
     1.400, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class Graph {
  List<Integer>[] adj;
  Graph(int n) {
    adj = new List[n];
    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
  }
  void addEdge(int u, int v) {
    adj[u].add(v);
    adj[v].add(u);
  }
  boolean removeVertex(int v) {
    if (adj[v] == null) return false;
    for (int neighbor : adj[v]) {
      adj[neighbor].remove((Integer) v);
    }
    adj[v] = null;
    return true;
  }
}', N'java',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('3c8a8d98-fac4-40ea-91ad-1d14f404daef', '9271946e-ce60-4419-bacd-66a4873e13f8', 2, N'Approved',
     N'Given the ArrayList-backed adjacency lists in the snippet, what is the worst-case time complexity of `removeVertex(v)` in terms of the degree d of v (assuming all neighbors also have Î˜(d) edges)?', N'class Graph {
  List<Integer>[] adj;
  Graph(int n) {
    adj = new List[n];
    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
  }
  void addEdge(int u, int v) {
    adj[u].add(v);
    adj[v].add(u);
  }
  boolean removeVertex(int v) {
    if (adj[v] == null) return false;
    for (int neighbor : adj[v]) {
      adj[neighbor].remove((Integer) v);
    }
    adj[v] = null;
    return true;
  }
}', N'java',
     N'["O(d^2), because each neighbor removal scans its list of size Î˜(d)", "O(d log d), because removing from ArrayList can be binary searched", "O(d), because each neighbor is visited exactly once", "O(d + n), because removing v touches all adjacency lists in the graph"]', N'A', N'Removing v visits Î˜(d) neighbors, but each `remove` from an ArrayList-backed adjacency list scans the neighborâ€™s list (Î˜(d)), so the total is Î˜(d^2); the plausible O(d) claim ignores that the removals scan each neighbor list, not constant time.',
     1.400, 1.200, N'High discrimination (1.4) because the question hinges on recognizing the quadratic cost from nested degree work, and an irtB of 1.2 matches the hard difficulty.', N'DataStructures', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the ArrayList-backed adjacency lists in the snippet, what is the worst-case time complexity of `removeVertex(v)` in terms of the degree d of v (assuming all neighbors also have Î˜(d) edges)?", "codeSnippet": "class Graph {\n  List<Integer>[] adj;\n  Graph(int n) {\n    adj = new List[n];\n    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();\n  }\n  void addEdge(int u, int v) {\n    adj[u].add(v);\n    adj[v].add(u);\n  }\n  boolean removeVertex(int v) {\n    if (adj[v] == null) return false;\n    for (int neighbor : adj[v]) {\n      adj[neighbor].remove((Integer) v);\n    }\n    adj[v] = null;\n    return true;\n  }\n}", "codeLanguage": "java", "options": ["O(d^2), because each neighbor removal scans its list of size Î˜(d)", "O(d log d), because removing from ArrayList can be binary searched", "O(d), because each neighbor is visited exactly once", "O(d + n), because removing v touches all adjacency lists in the graph"], "correctAnswer": "A", "explanation": "Removing v visits Î˜(d) neighbors, but each `remove` from an ArrayList-backed adjacency list scans the neighborâ€™s list (Î˜(d)), so the total is Î˜(d^2); the plausible O(d) claim ignores that the removals scan each neighbor list, not constant time.", "irtA": 1.4, "irtB": 1.2, "rationale": "High discrimination (1.4) because the question hinges on recognizing the quadratic cost from nested degree work, and an irtB of 1.2 matches the hard difficulty.", "category": "DataStructures", "difficulty": 3}',
     '308d6147-9740-40a9-a3a4-b73fb21aac44');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('bbe191ea-1227-4783-b1ab-3f846477c5f1', N'Which algorithmic property makes merge sort reliably run in O(n log n) time even for already sorted input?', 1, N'Algorithms',
     N'["It always splits the input into two halves, processes both, and merges the sorted halves", "It skips processing when it detects the subarray is already sorted", "It selects a pivot and partitions so each recursive call handles fewer than n elements", "It repeatedly removes the smallest remaining element into a growing output"]', N'A', N'Merge sort consistently splits the array into halves and merges, giving O(n log n) regardless of input; the plausible distractor B is wrong because detecting already sorted data would require extra checks and doesnâ€™t happen in standard merge sort.',
     SYSUTCDATETIME(), 1,
     1.000, -1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('4c2135c8-17aa-492c-bc88-cda081d57783', '9271946e-ce60-4419-bacd-66a4873e13f8', 3, N'Approved',
     N'Which algorithmic property makes merge sort reliably run in O(n log n) time even for already sorted input?', NULL, NULL,
     N'["It always splits the input into two halves, processes both, and merges the sorted halves", "It skips processing when it detects the subarray is already sorted", "It selects a pivot and partitions so each recursive call handles fewer than n elements", "It repeatedly removes the smallest remaining element into a growing output"]', N'A', N'Merge sort consistently splits the array into halves and merges, giving O(n log n) regardless of input; the plausible distractor B is wrong because detecting already sorted data would require extra checks and doesnâ€™t happen in standard merge sort.',
     1.000, -1.200, N'A basic conceptual question contrasting merge sortâ€™s divide-and-conquer structure with other sorting strategies.', N'Algorithms', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which algorithmic property makes merge sort reliably run in O(n log n) time even for already sorted input?", "codeSnippet": null, "codeLanguage": null, "options": ["It always splits the input into two halves, processes both, and merges the sorted halves", "It skips processing when it detects the subarray is already sorted", "It selects a pivot and partitions so each recursive call handles fewer than n elements", "It repeatedly removes the smallest remaining element into a growing output"], "correctAnswer": "A", "explanation": "Merge sort consistently splits the array into halves and merges, giving O(n log n) regardless of input; the plausible distractor B is wrong because detecting already sorted data would require extra checks and doesnâ€™t happen in standard merge sort.", "irtA": 1.0, "irtB": -1.2, "rationale": "A basic conceptual question contrasting merge sortâ€™s divide-and-conquer structure with other sorting strategies.", "category": "Algorithms", "difficulty": 1}',
     'bbe191ea-1227-4783-b1ab-3f846477c5f1');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('d3ae4c12-88b2-47d3-a1f8-8412089bbcc6', N'In the naive recursive Fibonacci function below, what explains the exponential growth in running time as n increases?', 2, N'Algorithms',
     N'["It recomputes the same subproblems over and over, producing about 2â¿ recursive calls", "Each call splits the input evenly, so the recursion depth is logarithmic", "It visits every integer up to n exactly once after the base cases", "Tail recursion keeps the stack shallow and thus the work stays linear"]', N'A', N'The recurrence T(n)=T(nâˆ’1)+T(nâˆ’2)+O(1) builds a recursion tree with about 2â¿ leaves, so repeated subproblems drive exponential time, while the misleading option assumes even splits that do not happen here.',
     SYSUTCDATETIME(), 1,
     1.200, 0.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'def naive_fib(n):
    if n <= 1:
        return n
    return naive_fib(n - 1) + naive_fib(n - 2)', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('04b0aade-fa0f-40d9-bbc1-37121414c7e4', '9271946e-ce60-4419-bacd-66a4873e13f8', 4, N'Approved',
     N'In the naive recursive Fibonacci function below, what explains the exponential growth in running time as n increases?', N'def naive_fib(n):
    if n <= 1:
        return n
    return naive_fib(n - 1) + naive_fib(n - 2)', N'python',
     N'["It recomputes the same subproblems over and over, producing about 2â¿ recursive calls", "Each call splits the input evenly, so the recursion depth is logarithmic", "It visits every integer up to n exactly once after the base cases", "Tail recursion keeps the stack shallow and thus the work stays linear"]', N'A', N'The recurrence T(n)=T(nâˆ’1)+T(nâˆ’2)+O(1) builds a recursion tree with about 2â¿ leaves, so repeated subproblems drive exponential time, while the misleading option assumes even splits that do not happen here.',
     1.200, 0.200, N'The question contrasts repeated subproblem work with misconceived log-depth splits, so it should discriminate moderately.', N'Algorithms', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the naive recursive Fibonacci function below, what explains the exponential growth in running time as n increases?", "codeSnippet": "def naive_fib(n):\n    if n <= 1:\n        return n\n    return naive_fib(n - 1) + naive_fib(n - 2)", "codeLanguage": "python", "options": ["It recomputes the same subproblems over and over, producing about 2â¿ recursive calls", "Each call splits the input evenly, so the recursion depth is logarithmic", "It visits every integer up to n exactly once after the base cases", "Tail recursion keeps the stack shallow and thus the work stays linear"], "correctAnswer": "A", "explanation": "The recurrence T(n)=T(nâˆ’1)+T(nâˆ’2)+O(1) builds a recursion tree with about 2â¿ leaves, so repeated subproblems drive exponential time, while the misleading option assumes even splits that do not happen here.", "irtA": 1.2, "irtB": 0.2, "rationale": "The question contrasts repeated subproblem work with misconceived log-depth splits, so it should discriminate moderately.", "category": "Algorithms", "difficulty": 2}',
     'd3ae4c12-88b2-47d3-a1f8-8412089bbcc6');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('168a80c5-b6fb-4a1f-85cf-6ed8a8f42b6e', N'Given the memoized recursion below, what is the tightest upper bound on the number of unique helper invocations when n grows large?', 3, N'Algorithms',
     N'["O(n)", "O(n log n)", "O(n^2)", "O(log n)"]', N'A', N'Each helper call caches its result, and the only new arguments are integers between 0 and n, so memoized calls are Î˜(n); the halving step doesnâ€™t add more than Î˜(n) distinct states, so O(n log n) is too large.',
     SYSUTCDATETIME(), 1,
     1.600, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'def count_tilings(n):
    memo = {0: 1}
    def helper(k):
        if k in memo:
            return memo[k]
        ways = helper(k - 1) + helper(k - 2)
        if k % 2 == 0:
            ways += helper(k // 2)
        memo[k] = ways
        return ways
    return helper(n)', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d5d1b747-cc70-4304-8710-7a3e96f64674', '9271946e-ce60-4419-bacd-66a4873e13f8', 5, N'Approved',
     N'Given the memoized recursion below, what is the tightest upper bound on the number of unique helper invocations when n grows large?', N'def count_tilings(n):
    memo = {0: 1}
    def helper(k):
        if k in memo:
            return memo[k]
        ways = helper(k - 1) + helper(k - 2)
        if k % 2 == 0:
            ways += helper(k // 2)
        memo[k] = ways
        return ways
    return helper(n)', N'python',
     N'["O(n)", "O(n log n)", "O(n^2)", "O(log n)"]', N'A', N'Each helper call caches its result, and the only new arguments are integers between 0 and n, so memoized calls are Î˜(n); the halving step doesnâ€™t add more than Î˜(n) distinct states, so O(n log n) is too large.',
     1.600, 1.200, N'The question sharply distinguishes learners who understand memoized state counts from those who overcount branching, so a high discrimination makes sense, and the halving keeps difficulty in the upper range.', N'Algorithms', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the memoized recursion below, what is the tightest upper bound on the number of unique helper invocations when n grows large?", "codeSnippet": "def count_tilings(n):\n    memo = {0: 1}\n    def helper(k):\n        if k in memo:\n            return memo[k]\n        ways = helper(k - 1) + helper(k - 2)\n        if k % 2 == 0:\n            ways += helper(k // 2)\n        memo[k] = ways\n        return ways\n    return helper(n)", "codeLanguage": "python", "options": ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], "correctAnswer": "A", "explanation": "Each helper call caches its result, and the only new arguments are integers between 0 and n, so memoized calls are Î˜(n); the halving step doesnâ€™t add more than Î˜(n) distinct states, so O(n log n) is too large.", "irtA": 1.6, "irtB": 1.2, "rationale": "The question sharply distinguishes learners who understand memoized state counts from those who overcount branching, so a high discrimination makes sense, and the halving keeps difficulty in the upper range.", "category": "Algorithms", "difficulty": 3}',
     '168a80c5-b6fb-4a1f-85cf-6ed8a8f42b6e');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b291cb99-093a-45e0-8df9-3630d39806d0', N'Which statement best distinguishes method overriding from method overloading in OOP?', 1, N'OOP',
     N'["Overriding redefines a base method in a subclass, while overloading declares several same-name methods with different params.", "Overloading redefines a base method in a subclass, while overriding declares several same-name methods with different params.", "Overriding only applies to constructors, while overloading applies to regular instance methods.", "Overriding depends on public access, while overloading only uses private helpers."]', N'A', N'Overriding replaces a base-class implementation in a derived class so runtime dispatch picks the new version, whereas overloading is creating multiple signatures; option B reverses the roles and is therefore incorrect.',
     SYSUTCDATETIME(), 1,
     1.100, -1.600, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('f2b907fb-1dec-43f7-97f4-b1c8744df421', '9271946e-ce60-4419-bacd-66a4873e13f8', 6, N'Approved',
     N'Which statement best distinguishes method overriding from method overloading in OOP?', NULL, NULL,
     N'["Overriding redefines a base method in a subclass, while overloading declares several same-name methods with different params.", "Overloading redefines a base method in a subclass, while overriding declares several same-name methods with different params.", "Overriding only applies to constructors, while overloading applies to regular instance methods.", "Overriding depends on public access, while overloading only uses private helpers."]', N'A', N'Overriding replaces a base-class implementation in a derived class so runtime dispatch picks the new version, whereas overloading is creating multiple signatures; option B reverses the roles and is therefore incorrect.',
     1.100, -1.600, N'An easy conceptual question with a clear correct interpretation, so moderate discrimination and low difficulty feel appropriate.', N'OOP', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which statement best distinguishes method overriding from method overloading in OOP?", "codeSnippet": null, "codeLanguage": null, "options": ["Overriding redefines a base method in a subclass, while overloading declares several same-name methods with different params.", "Overloading redefines a base method in a subclass, while overriding declares several same-name methods with different params.", "Overriding only applies to constructors, while overloading applies to regular instance methods.", "Overriding depends on public access, while overloading only uses private helpers."], "correctAnswer": "A", "explanation": "Overriding replaces a base-class implementation in a derived class so runtime dispatch picks the new version, whereas overloading is creating multiple signatures; option B reverses the roles and is therefore incorrect.", "irtA": 1.1, "irtB": -1.6, "rationale": "An easy conceptual question with a clear correct interpretation, so moderate discrimination and low difficulty feel appropriate.", "category": "OOP", "difficulty": 1}',
     'b291cb99-093a-45e0-8df9-3630d39806d0');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('14f5e9f7-6317-49d0-8a32-4c4a3850a1fb', N'In the following code, what text does `Console.WriteLine(printer.Render());` print and why?', 2, N'OOP',
     N'["Base, because Render calls the base Format implementation since Format is not virtual", "Fancy, because the instance is FancyPrinter so its Format hides the base method", "Base, because new methods cannot override inherited methods even if they share the signature", "Fancy, because hiding a method still changes the dispatch target when called via inheritance"]', N'A', N'Render invokes the non-virtual Format defined in Printer, so even on a FancyPrinter the base implementation runs; Option B is plausible but wrong because hiding does not affect calls through the inherited method.',
     SYSUTCDATETIME(), 1,
     1.300, 0.100, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'class Printer
{
    public string Render() => Format();
    public string Format() => "Base";
}

class FancyPrinter : Printer
{
    public new string Format() => "Fancy";
}

var printer = new FancyPrinter();
Console.WriteLine(printer.Render());', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('c7b57eea-228a-44dd-b16a-84a3ca1034ae', '9271946e-ce60-4419-bacd-66a4873e13f8', 7, N'Approved',
     N'In the following code, what text does `Console.WriteLine(printer.Render());` print and why?', N'class Printer
{
    public string Render() => Format();
    public string Format() => "Base";
}

class FancyPrinter : Printer
{
    public new string Format() => "Fancy";
}

var printer = new FancyPrinter();
Console.WriteLine(printer.Render());', N'csharp',
     N'["Base, because Render calls the base Format implementation since Format is not virtual", "Fancy, because the instance is FancyPrinter so its Format hides the base method", "Base, because new methods cannot override inherited methods even if they share the signature", "Fancy, because hiding a method still changes the dispatch target when called via inheritance"]', N'A', N'Render invokes the non-virtual Format defined in Printer, so even on a FancyPrinter the base implementation runs; Option B is plausible but wrong because hiding does not affect calls through the inherited method.',
     1.300, 0.100, N'Medium discrimination because understanding method hiding vs overriding separates learners; difficulty around average aligns with irtB near 0.', N'OOP', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the following code, what text does `Console.WriteLine(printer.Render());` print and why?", "codeSnippet": "class Printer\n{\n    public string Render() => Format();\n    public string Format() => \"Base\";\n}\n\nclass FancyPrinter : Printer\n{\n    public new string Format() => \"Fancy\";\n}\n\nvar printer = new FancyPrinter();\nConsole.WriteLine(printer.Render());", "codeLanguage": "csharp", "options": ["Base, because Render calls the base Format implementation since Format is not virtual", "Fancy, because the instance is FancyPrinter so its Format hides the base method", "Base, because new methods cannot override inherited methods even if they share the signature", "Fancy, because hiding a method still changes the dispatch target when called via inheritance"], "correctAnswer": "A", "explanation": "Render invokes the non-virtual Format defined in Printer, so even on a FancyPrinter the base implementation runs; Option B is plausible but wrong because hiding does not affect calls through the inherited method.", "irtA": 1.3, "irtB": 0.1, "rationale": "Medium discrimination because understanding method hiding vs overriding separates learners; difficulty around average aligns with irtB near 0.", "category": "OOP", "difficulty": 2}',
     '14f5e9f7-6317-49d0-8a32-4c4a3850a1fb');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('9f4a8ed7-eb16-4250-93eb-1ac01fcd9817', N'Given the hierarchy below, what explains why `RacingEngine.Start()` always prints `Base configure` before `Race run`, even though `RacingEngine` overrides `Run()`?', 3, N'OOP',
     N'["Sealing `BaseEngine.Configure` ensures `Start` always calls the `BaseEngine` implementation before `Run`, so `RacingEngine` cannot change that first step.", "`Configure` is virtual, so `Start` picks the runtime override; the base implementation still runs because the sealed modifier only affects `Run`.", "`Start` is non-virtual, so each derived class must re-implement it; here `RacingEngine` inherits `Start` without modification, leaving `Configure` unchanged.", "`Run` is abstract but `Configure` is not, so sealing `Configure` prevents `Run` from being overridden multiple times."]', N'A', N'Because `BaseEngine` seals its override of `Configure`, `Start` will always invoke the `BaseEngine` version even when `Start` is called on `RacingEngine`; the most plausible distractor wrongly attributes the behavior to `Start` being non-virtual.',
     SYSUTCDATETIME(), 1,
     1.600, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'using System;
abstract class Engine {
    public void Start() {
        Configure();
        Run();
    }
    protected virtual void Configure() => Console.WriteLine("Engine configure");
    protected abstract void Run();
}
class BaseEngine : Engine {
    protected sealed override void Configure() => Console.WriteLine("Base configure");
    protected override void Run() => Console.WriteLine("Base run");
}
class RacingEngine : BaseEngine {
    protected override void Run() => Console.WriteLine("Race run");
    // protected override void Configure() => Console.WriteLine("Race configure"); // not allowed
}
class Program { static void Main() => new RacingEngine().Start(); }', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('22b5f45c-e77f-4931-9279-d02924e5f7dd', '9271946e-ce60-4419-bacd-66a4873e13f8', 8, N'Approved',
     N'Given the hierarchy below, what explains why `RacingEngine.Start()` always prints `Base configure` before `Race run`, even though `RacingEngine` overrides `Run()`?', N'using System;
abstract class Engine {
    public void Start() {
        Configure();
        Run();
    }
    protected virtual void Configure() => Console.WriteLine("Engine configure");
    protected abstract void Run();
}
class BaseEngine : Engine {
    protected sealed override void Configure() => Console.WriteLine("Base configure");
    protected override void Run() => Console.WriteLine("Base run");
}
class RacingEngine : BaseEngine {
    protected override void Run() => Console.WriteLine("Race run");
    // protected override void Configure() => Console.WriteLine("Race configure"); // not allowed
}
class Program { static void Main() => new RacingEngine().Start(); }', N'csharp',
     N'["Sealing `BaseEngine.Configure` ensures `Start` always calls the `BaseEngine` implementation before `Run`, so `RacingEngine` cannot change that first step.", "`Configure` is virtual, so `Start` picks the runtime override; the base implementation still runs because the sealed modifier only affects `Run`.", "`Start` is non-virtual, so each derived class must re-implement it; here `RacingEngine` inherits `Start` without modification, leaving `Configure` unchanged.", "`Run` is abstract but `Configure` is not, so sealing `Configure` prevents `Run` from being overridden multiple times."]', N'A', N'Because `BaseEngine` seals its override of `Configure`, `Start` will always invoke the `BaseEngine` version even when `Start` is called on `RacingEngine`; the most plausible distractor wrongly attributes the behavior to `Start` being non-virtual.',
     1.600, 1.200, N'Sealing a virtual method in an intermediate class sharply restricts further overrides while the template method in the base class still calls it, so the question discriminates by testing that multi-step reasoning.', N'OOP', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the hierarchy below, what explains why `RacingEngine.Start()` always prints `Base configure` before `Race run`, even though `RacingEngine` overrides `Run()`?", "codeSnippet": "using System;\nabstract class Engine {\n    public void Start() {\n        Configure();\n        Run();\n    }\n    protected virtual void Configure() => Console.WriteLine(\"Engine configure\");\n    protected abstract void Run();\n}\nclass BaseEngine : Engine {\n    protected sealed override void Configure() => Console.WriteLine(\"Base configure\");\n    protected override void Run() => Console.WriteLine(\"Base run\");\n}\nclass RacingEngine : BaseEngine {\n    protected override void Run() => Console.WriteLine(\"Race run\");\n    // protected override void Configure() => Console.WriteLine(\"Race configure\"); // not allowed\n}\nclass Program { static void Main() => new RacingEngine().Start(); }", "codeLanguage": "csharp", "options": ["Sealing `BaseEngine.Configure` ensures `Start` always calls the `BaseEngine` implementation before `Run`, so `RacingEngine` cannot change that first step.", "`Configure` is virtual, so `Start` picks the runtime override; the base implementation still runs because the sealed modifier only affects `Run`.", "`Start` is non-virtual, so each derived class must re-implement it; here `RacingEngine` inherits `Start` without modification, leaving `Configure` unchanged.", "`Run` is abstract but `Configure` is not, so sealing `Configure` prevents `Run` from being overridden multiple times."], "correctAnswer": "A", "explanation": "Because `BaseEngine` seals its override of `Configure`, `Start` will always invoke the `BaseEngine` version even when `Start` is called on `RacingEngine`; the most plausible distractor wrongly attributes the behavior to `Start` being non-virtual.", "irtA": 1.6, "irtB": 1.2, "rationale": "Sealing a virtual method in an intermediate class sharply restricts further overrides while the template method in the base class still calls it, so the question discriminates by testing that multi-step reasoning.", "category": "OOP", "difficulty": 3}',
     '9f4a8ed7-eb16-4250-93eb-1ac01fcd9817');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('4aa3d822-c288-4ad1-819e-f4da91412b1e', N'What is the main purpose of declaring a foreign key from a child table to a parent table?', 1, N'Databases',
     N'["Ensure each child row refers to an existing parent row", "Prevent deleting parent rows even when children exist", "Automatically index the child column for faster joins", "Allow the child table to store duplicates of the parent key"]', N'A', N'A foreign key enforces referential integrity by requiring each child value match a parent row; preventing deletes when children exist (option B) needs an explicit ON DELETE clause but is not the core purpose.',
     SYSUTCDATETIME(), 1,
     1.000, -1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('0a2b6210-f19c-48df-9774-9cb4070888bb', '9271946e-ce60-4419-bacd-66a4873e13f8', 9, N'Approved',
     N'What is the main purpose of declaring a foreign key from a child table to a parent table?', NULL, NULL,
     N'["Ensure each child row refers to an existing parent row", "Prevent deleting parent rows even when children exist", "Automatically index the child column for faster joins", "Allow the child table to store duplicates of the parent key"]', N'A', N'A foreign key enforces referential integrity by requiring each child value match a parent row; preventing deletes when children exist (option B) needs an explicit ON DELETE clause but is not the core purpose.',
     1.000, -1.200, N'This easy question is a basic recall of referential integrity, so a standard discrimination (1.0) and low difficulty (-1.2) suffice.', N'Databases', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "What is the main purpose of declaring a foreign key from a child table to a parent table?", "codeSnippet": null, "codeLanguage": null, "options": ["Ensure each child row refers to an existing parent row", "Prevent deleting parent rows even when children exist", "Automatically index the child column for faster joins", "Allow the child table to store duplicates of the parent key"], "correctAnswer": "A", "explanation": "A foreign key enforces referential integrity by requiring each child value match a parent row; preventing deletes when children exist (option B) needs an explicit ON DELETE clause but is not the core purpose.", "irtA": 1.0, "irtB": -1.2, "rationale": "This easy question is a basic recall of referential integrity, so a standard discrimination (1.0) and low difficulty (-1.2) suffice.", "category": "Databases", "difficulty": 1}',
     '4aa3d822-c288-4ad1-819e-f4da91412b1e');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('220e7605-0921-49ed-a1f3-bee2a339f757', N'Given the Orders table storing customer_location attributes and the Customers table owning the authoritative city/region data, which schema change best removes redundancy while still allowing reports to show each orderâ€™s customer region?', 2, N'Databases',
     N'["Drop customer_city and customer_region from Orders and rely on the FK join for those attributes", "Add a CHECK that customer_region equals the corresponding Customers.region value", "Keep the location columns and build a materialized view that joins Orders to Customers", "Add a trigger that copies Customers.city and .region into Orders whenever a customer changes"]', N'A', N'Removing the redundant columns and relying on the FK join keeps Orders normalized; the CHECK constraint still duplicates data and only guards consistency without eliminating redundancy.',
     SYSUTCDATETIME(), 1,
     1.200, 0.000, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'CREATE TABLE Customers (
  customer_id INT PRIMARY KEY,
  customer_name VARCHAR(80),
  city VARCHAR(50),
  region VARCHAR(20)
);

CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  customer_id INT REFERENCES Customers(customer_id),
  order_total DECIMAL(10,2),
  customer_city VARCHAR(50),
  customer_region VARCHAR(20)
);', N'sql',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('9da73454-7073-42fa-a132-7cfc35a54474', '9271946e-ce60-4419-bacd-66a4873e13f8', 10, N'Approved',
     N'Given the Orders table storing customer_location attributes and the Customers table owning the authoritative city/region data, which schema change best removes redundancy while still allowing reports to show each orderâ€™s customer region?', N'CREATE TABLE Customers (
  customer_id INT PRIMARY KEY,
  customer_name VARCHAR(80),
  city VARCHAR(50),
  region VARCHAR(20)
);

CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  customer_id INT REFERENCES Customers(customer_id),
  order_total DECIMAL(10,2),
  customer_city VARCHAR(50),
  customer_region VARCHAR(20)
);', N'sql',
     N'["Drop customer_city and customer_region from Orders and rely on the FK join for those attributes", "Add a CHECK that customer_region equals the corresponding Customers.region value", "Keep the location columns and build a materialized view that joins Orders to Customers", "Add a trigger that copies Customers.city and .region into Orders whenever a customer changes"]', N'A', N'Removing the redundant columns and relying on the FK join keeps Orders normalized; the CHECK constraint still duplicates data and only guards consistency without eliminating redundancy.',
     1.200, 0.000, N'Moderate discrimination: selecting the normalized schema requires applying the FK join idea, so A=1.2, B=0.0 reflects medium difficulty.', N'Databases', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the Orders table storing customer_location attributes and the Customers table owning the authoritative city/region data, which schema change best removes redundancy while still allowing reports to show each orderâ€™s customer region?", "codeSnippet": "CREATE TABLE Customers (\n  customer_id INT PRIMARY KEY,\n  customer_name VARCHAR(80),\n  city VARCHAR(50),\n  region VARCHAR(20)\n);\n\nCREATE TABLE Orders (\n  order_id INT PRIMARY KEY,\n  customer_id INT REFERENCES Customers(customer_id),\n  order_total DECIMAL(10,2),\n  customer_city VARCHAR(50),\n  customer_region VARCHAR(20)\n);", "codeLanguage": "sql", "options": ["Drop customer_city and customer_region from Orders and rely on the FK join for those attributes", "Add a CHECK that customer_region equals the corresponding Customers.region value", "Keep the location columns and build a materialized view that joins Orders to Customers", "Add a trigger that copies Customers.city and .region into Orders whenever a customer changes"], "correctAnswer": "A", "explanation": "Removing the redundant columns and relying on the FK join keeps Orders normalized; the CHECK constraint still duplicates data and only guards consistency without eliminating redundancy.", "irtA": 1.2, "irtB": 0.0, "rationale": "Moderate discrimination: selecting the normalized schema requires applying the FK join idea, so A=1.2, B=0.0 reflects medium difficulty.", "category": "Databases", "difficulty": 2}',
     '220e7605-0921-49ed-a1f3-bee2a339f757');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('fa5714b4-5b98-4046-a148-9c7141242e52', N'An Orders table has columns (order_id PK, customer_id FK, status, placed_at, total). A frequent reporting query filters by placed_at range and status IN (''shipped'',''delivered''), groups by customer_id and status, and orders by customer_id. Which single index best lets the planner satisfy the filter, grouping, and ordering without extra sorting?', 3, N'Databases',
     N'["A composite index on (status, placed_at, customer_id)", "A composite index on (placed_at, customer_id, status)", "A composite index on (customer_id, status, placed_at)", "Separate indexes on placed_at and on status"]', N'A', N'An index on (status, placed_at, customer_id) lets the engine apply the equality filter on status before the placed_at range and then read customer_id in order for the GROUP BY/ORDER BY, whereas (placed_at, customer_id, status) still needs to examine status after the range scan and (customer_id, status, placed_at) cannot efficiently filter by placed_at range before grouping.',
     SYSUTCDATETIME(), 1,
     1.500, 1.400, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('da0e1a37-18cb-4602-b01c-33a651af8875', '9271946e-ce60-4419-bacd-66a4873e13f8', 11, N'Approved',
     N'An Orders table has columns (order_id PK, customer_id FK, status, placed_at, total). A frequent reporting query filters by placed_at range and status IN (''shipped'',''delivered''), groups by customer_id and status, and orders by customer_id. Which single index best lets the planner satisfy the filter, grouping, and ordering without extra sorting?', NULL, NULL,
     N'["A composite index on (status, placed_at, customer_id)", "A composite index on (placed_at, customer_id, status)", "A composite index on (customer_id, status, placed_at)", "Separate indexes on placed_at and on status"]', N'A', N'An index on (status, placed_at, customer_id) lets the engine apply the equality filter on status before the placed_at range and then read customer_id in order for the GROUP BY/ORDER BY, whereas (placed_at, customer_id, status) still needs to examine status after the range scan and (customer_id, status, placed_at) cannot efficiently filter by placed_at range before grouping.',
     1.500, 1.400, N'High discrimination since only the correct column ordering provides the required filter+grouping benefits, and IRT B reflects the hard reasoning about equality vs range column order.', N'Databases', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "An Orders table has columns (order_id PK, customer_id FK, status, placed_at, total). A frequent reporting query filters by placed_at range and status IN (''shipped'',''delivered''), groups by customer_id and status, and orders by customer_id. Which single index best lets the planner satisfy the filter, grouping, and ordering without extra sorting?", "codeSnippet": null, "codeLanguage": null, "options": ["A composite index on (status, placed_at, customer_id)", "A composite index on (placed_at, customer_id, status)", "A composite index on (customer_id, status, placed_at)", "Separate indexes on placed_at and on status"], "correctAnswer": "A", "explanation": "An index on (status, placed_at, customer_id) lets the engine apply the equality filter on status before the placed_at range and then read customer_id in order for the GROUP BY/ORDER BY, whereas (placed_at, customer_id, status) still needs to examine status after the range scan and (customer_id, status, placed_at) cannot efficiently filter by placed_at range before grouping.", "irtA": 1.5, "irtB": 1.4, "rationale": "High discrimination since only the correct column ordering provides the required filter+grouping benefits, and IRT B reflects the hard reasoning about equality vs range column order.", "category": "Databases", "difficulty": 3}',
     'fa5714b4-5b98-4046-a148-9c7141242e52');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('85bf58b3-57d5-4ae1-ae7b-8f816670b8a2', N'Why should a session cookie have the SameSite attribute set to "Lax" or "Strict"?', 1, N'Security',
     N'["It blocks the cookie from being sent along with cross-site requests to reduce CSRF risk", "It encrypts the cookie contents so an attacker cannot read the session ID", "It forces the browser to refresh the cookie on every request for better freshness", "It ties the cookie to the userâ€™s IP address to prevent session hijacking"]', N'A', N'SameSite prevents browsers from sending the cookie on cross-site requests, which lowers CSRF exposure; the most plausible distractor (encryption) confuses cookie flags with payload protection.',
     SYSUTCDATETIME(), 1,
     0.900, -1.100, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('b66519c1-b408-4d22-abfb-b26ebcf0cd32', '9271946e-ce60-4419-bacd-66a4873e13f8', 12, N'Approved',
     N'Why should a session cookie have the SameSite attribute set to "Lax" or "Strict"?', NULL, NULL,
     N'["It blocks the cookie from being sent along with cross-site requests to reduce CSRF risk", "It encrypts the cookie contents so an attacker cannot read the session ID", "It forces the browser to refresh the cookie on every request for better freshness", "It ties the cookie to the userâ€™s IP address to prevent session hijacking"]', N'A', N'SameSite prevents browsers from sending the cookie on cross-site requests, which lowers CSRF exposure; the most plausible distractor (encryption) confuses cookie flags with payload protection.',
     0.900, -1.100, N'An easy question about a single flag, so moderate discrimination and low difficulty.', N'Security', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Why should a session cookie have the SameSite attribute set to \"Lax\" or \"Strict\"?", "codeSnippet": null, "codeLanguage": null, "options": ["It blocks the cookie from being sent along with cross-site requests to reduce CSRF risk", "It encrypts the cookie contents so an attacker cannot read the session ID", "It forces the browser to refresh the cookie on every request for better freshness", "It ties the cookie to the userâ€™s IP address to prevent session hijacking"], "correctAnswer": "A", "explanation": "SameSite prevents browsers from sending the cookie on cross-site requests, which lowers CSRF exposure; the most plausible distractor (encryption) confuses cookie flags with payload protection.", "irtA": 0.9, "irtB": -1.1, "rationale": "An easy question about a single flag, so moderate discrimination and low difficulty.", "category": "Security", "difficulty": 1}',
     '85bf58b3-57d5-4ae1-ae7b-8f816670b8a2');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('4b40af2d-d9d6-452f-8055-c88afb766490', N'The frontend stores a JWT in `localStorage` and sends it via an Authorization header as shown. Which attack does this pattern leave the token exposed to?', 2, N'Security',
     N'["A: Cross-site scripting that can read localStorage and send the token elsewhere", "B: Cross-site request forgery that reuses the Authorization header on a forged form", "C: SQL injection via the Authorization header contents", "D: Brute-force guessing of the token by repeatedly calling the endpoint"]', N'A', N'LocalStorage is readable by scripts on the page, so a successful XSS can steal the token; CSRF is less relevant because the token isnâ€™t in an automatically sent cookie.',
     SYSUTCDATETIME(), 1,
     1.200, 0.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'token = localStorage.getItem("session")
fetch("/api/data", {
    headers: {"Authorization": f"Bearer {token}"}
})', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('87b4f689-02ea-4849-bd98-258156b7efb4', '9271946e-ce60-4419-bacd-66a4873e13f8', 13, N'Approved',
     N'The frontend stores a JWT in `localStorage` and sends it via an Authorization header as shown. Which attack does this pattern leave the token exposed to?', N'token = localStorage.getItem("session")
fetch("/api/data", {
    headers: {"Authorization": f"Bearer {token}"}
})', N'python',
     N'["A: Cross-site scripting that can read localStorage and send the token elsewhere", "B: Cross-site request forgery that reuses the Authorization header on a forged form", "C: SQL injection via the Authorization header contents", "D: Brute-force guessing of the token by repeatedly calling the endpoint"]', N'A', N'LocalStorage is readable by scripts on the page, so a successful XSS can steal the token; CSRF is less relevant because the token isnâ€™t in an automatically sent cookie.',
     1.200, 0.200, N'Recognizing that accessible storage exposes tokens to XSS is moderately discriminating, so a slightly above-average slope and near-zero difficulty suit this medium question.', N'Security', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The frontend stores a JWT in `localStorage` and sends it via an Authorization header as shown. Which attack does this pattern leave the token exposed to?", "codeSnippet": "token = localStorage.getItem(\"session\")\nfetch(\"/api/data\", {\n    headers: {\"Authorization\": f\"Bearer {token}\"}\n})", "codeLanguage": "python", "options": ["A: Cross-site scripting that can read localStorage and send the token elsewhere", "B: Cross-site request forgery that reuses the Authorization header on a forged form", "C: SQL injection via the Authorization header contents", "D: Brute-force guessing of the token by repeatedly calling the endpoint"], "correctAnswer": "A", "explanation": "LocalStorage is readable by scripts on the page, so a successful XSS can steal the token; CSRF is less relevant because the token isnâ€™t in an automatically sent cookie.", "irtA": 1.2, "irtB": 0.2, "rationale": "Recognizing that accessible storage exposes tokens to XSS is moderately discriminating, so a slightly above-average slope and near-zero difficulty suit this medium question.", "category": "Security", "difficulty": 2}',
     '4b40af2d-d9d6-452f-8055-c88afb766490');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('e2495e6d-8d3e-4f36-bce8-f50882653278', N'In the OAuth handshake below, why does a constant `state` value fail to stop CSRF attacks, and what change restores the protection?', 3, N'Security',
     N'["Use a fresh cryptographically random state per login saved in the user session and checked on callback", "Include the client IP address in the constant state so attackers guessing it are blocked", "Drop the state parameter and depend on SameSite cookies for CSRF protection", "Keep the constant state but also verify the OAuth referer header to prove the request came from the provider"]', N'A', N'A random per-login state bound to the session stops attackers from forging callback requests, whereas option B still leaks a fixed value and relies on IP stability, so it does not reinstate CSRF protection.',
     SYSUTCDATETIME(), 1,
     1.700, 1.200, N'AI', N'AI',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(),
     N'const express = require(''express'');
const app = express();
app.get(''/login'', (req, res) => {
  const state = ''abc123'';
  res.redirect(`https://auth.example.com/authorize?state=${state}`);
});
app.get(''/oauth/callback'', (req, res) => {
  if (req.query.state !== ''abc123'') {
    return res.status(403).end();
  }
  res.send(''Logged in'');
});', N'javascript',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('611bca26-02df-4d20-a4c7-199883cf249f', '9271946e-ce60-4419-bacd-66a4873e13f8', 14, N'Approved',
     N'In the OAuth handshake below, why does a constant `state` value fail to stop CSRF attacks, and what change restores the protection?', N'const express = require(''express'');
const app = express();
app.get(''/login'', (req, res) => {
  const state = ''abc123'';
  res.redirect(`https://auth.example.com/authorize?state=${state}`);
});
app.get(''/oauth/callback'', (req, res) => {
  if (req.query.state !== ''abc123'') {
    return res.status(403).end();
  }
  res.send(''Logged in'');
});', N'javascript',
     N'["Use a fresh cryptographically random state per login saved in the user session and checked on callback", "Include the client IP address in the constant state so attackers guessing it are blocked", "Drop the state parameter and depend on SameSite cookies for CSRF protection", "Keep the constant state but also verify the OAuth referer header to prove the request came from the provider"]', N'A', N'A random per-login state bound to the session stops attackers from forging callback requests, whereas option B still leaks a fixed value and relies on IP stability, so it does not reinstate CSRF protection.',
     1.700, 1.200, N'This requires multi-step reasoning about CSRF tokens and why predictability weakens them, so a higher discrimination and above mid difficulty rating fit.', N'Security', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '11111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the OAuth handshake below, why does a constant `state` value fail to stop CSRF attacks, and what change restores the protection?", "codeSnippet": "const express = require(''express'');\nconst app = express();\napp.get(''/login'', (req, res) => {\n  const state = ''abc123'';\n  res.redirect(`https://auth.example.com/authorize?state=${state}`);\n});\napp.get(''/oauth/callback'', (req, res) => {\n  if (req.query.state !== ''abc123'') {\n    return res.status(403).end();\n  }\n  res.send(''Logged in'');\n});", "codeLanguage": "javascript", "options": ["Use a fresh cryptographically random state per login saved in the user session and checked on callback", "Include the client IP address in the constant state so attackers guessing it are blocked", "Drop the state parameter and depend on SameSite cookies for CSRF protection", "Keep the constant state but also verify the OAuth referer header to prove the request came from the provider"], "correctAnswer": "A", "explanation": "A random per-login state bound to the session stops attackers from forging callback requests, whereas option B still leaks a fixed value and relies on IP stability, so it does not reinstate CSRF protection.", "irtA": 1.7, "irtB": 1.2, "rationale": "This requires multi-step reasoning about CSRF tokens and why predictability weakens them, so a higher discrimination and above mid difficulty rating fit.", "category": "Security", "difficulty": 3}',
     'e2495e6d-8d3e-4f36-bce8-f50882653278');

COMMIT TRANSACTION;

-- Verification:
SELECT COUNT(*) AS ApprovedCount FROM QuestionDrafts WHERE BatchId = '9271946e-ce60-4419-bacd-66a4873e13f8' AND Status = 'Approved';
SELECT COUNT(*) AS RejectedCount FROM QuestionDrafts WHERE BatchId = '9271946e-ce60-4419-bacd-66a4873e13f8' AND Status = 'Rejected';
SELECT COUNT(*) AS BankSize FROM Questions WHERE IsActive = 1;