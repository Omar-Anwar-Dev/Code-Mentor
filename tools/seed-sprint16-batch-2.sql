-- Sprint 16 content batch 2 â€” applied via run_content_batch.py at 2026-05-14T20:35:01Z
-- BatchId: 88191759-1cb8-4d8d-8122-d835cae837c7
-- Drafts: 30 expected (5 cats Ã— 3 diffs Ã— 2)
-- Reviewer: Claude single-reviewer per ADR-056
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('ab2d165a-d020-4620-a055-35bb2252ff1c', N'When an array-backed dynamic list doubles its capacity each time it runs out of space, what is the amortized cost per append?', 1, N'DataStructures',
     N'["O(1) amortized because few resizes happen for many appends", "O(log n) because capacity grows geometrically", "O(n) because resizing copies all elements each time", "O(n log n) combining copies and growth"]', N'A', N'Doubling ensures that expensive resizes happen infrequently, so the aggregate work averages to constant time; the most plausible distractor, copying all elements each time, overlooks that copies become rarer as capacity grows.',
     SYSUTCDATETIME(), 1,
     1.000, -1.000, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('5c1a3c41-ba6e-4d91-b880-ea4a520da968', '88191759-1cb8-4d8d-8122-d835cae837c7', 0, N'Approved',
     N'When an array-backed dynamic list doubles its capacity each time it runs out of space, what is the amortized cost per append?', NULL, NULL,
     N'["O(1) amortized because few resizes happen for many appends", "O(log n) because capacity grows geometrically", "O(n) because resizing copies all elements each time", "O(n log n) combining copies and growth"]', N'A', N'Doubling ensures that expensive resizes happen infrequently, so the aggregate work averages to constant time; the most plausible distractor, copying all elements each time, overlooks that copies become rarer as capacity grows.',
     1.000, -1.000, N'This simple amortized-analysis question sharply separates learners who understand geometric growth from those who only see the occasional copy.', N'DataStructures', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "When an array-backed dynamic list doubles its capacity each time it runs out of space, what is the amortized cost per append?", "codeSnippet": null, "codeLanguage": null, "options": ["O(1) amortized because few resizes happen for many appends", "O(log n) because capacity grows geometrically", "O(n) because resizing copies all elements each time", "O(n log n) combining copies and growth"], "correctAnswer": "A", "explanation": "Doubling ensures that expensive resizes happen infrequently, so the aggregate work averages to constant time; the most plausible distractor, copying all elements each time, overlooks that copies become rarer as capacity grows.", "irtA": 1.0, "irtB": -1.0, "rationale": "This simple amortized-analysis question sharply separates learners who understand geometric growth from those who only see the occasional copy.", "category": "DataStructures", "difficulty": 1}',
     'ab2d165a-d020-4620-a055-35bb2252ff1c');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('57663073-bd66-45eb-a4f9-242cc636f532', N'Which characteristic of a hash set makes membership checks average constant time?', 1, N'DataStructures',
     N'["Direct indexing via a hash function that distributes values into buckets", "Keeping elements sorted so binary search finds membership fast", "Linking each element to the next for sequential scans", "Resizing to a power of two so indexes shrink logarithmically"]', N'A', N'A hash function maps elements to buckets so membership just inspects one bucket, while sorting and binary search is log-time and sequential scans are linear, making them inferior distractors.',
     SYSUTCDATETIME(), 1,
     1.000, -1.300, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('6ea732f2-5b8b-49f3-a543-8719e03d0b8f', '88191759-1cb8-4d8d-8122-d835cae837c7', 1, N'Approved',
     N'Which characteristic of a hash set makes membership checks average constant time?', NULL, NULL,
     N'["Direct indexing via a hash function that distributes values into buckets", "Keeping elements sorted so binary search finds membership fast", "Linking each element to the next for sequential scans", "Resizing to a power of two so indexes shrink logarithmically"]', N'A', N'A hash function maps elements to buckets so membership just inspects one bucket, while sorting and binary search is log-time and sequential scans are linear, making them inferior distractors.',
     1.000, -1.300, N'Recognizing how hashing creates constant-time lookups is a straightforward signal for early learners, so normal discrimination applies.', N'DataStructures', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which characteristic of a hash set makes membership checks average constant time?", "codeSnippet": null, "codeLanguage": null, "options": ["Direct indexing via a hash function that distributes values into buckets", "Keeping elements sorted so binary search finds membership fast", "Linking each element to the next for sequential scans", "Resizing to a power of two so indexes shrink logarithmically"], "correctAnswer": "A", "explanation": "A hash function maps elements to buckets so membership just inspects one bucket, while sorting and binary search is log-time and sequential scans are linear, making them inferior distractors.", "irtA": 1.0, "irtB": -1.3, "rationale": "Recognizing how hashing creates constant-time lookups is a straightforward signal for early learners, so normal discrimination applies.", "category": "DataStructures", "difficulty": 1}',
     '57663073-bd66-45eb-a4f9-242cc636f532');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('75475921-c29f-4c4c-9192-dbe34686b215', N'In the TaskQueue class below, what is the worst-case time complexity of dequeue() relative to the number of queued tasks?', 2, N'DataStructures',
     N'["O(n)", "O(1)", "O(log n)", "O(1) amortized"]', N'A', N'Removing from the front of a Python list requires shifting all later elements, so dequeue is O(n); the plausible distractor O(1) is wrong because pop(0) is not constant-time.',
     SYSUTCDATETIME(), 1,
     1.100, 0.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'from collections import deque

class TaskQueue:
    def __init__(self):
        self.items = []

    def enqueue(self, task):
        self.items.append(task)

    def dequeue(self):
        if not self.items:
            return None
        return self.items.pop(0)', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('ac0f06ba-919a-491c-b3f4-2c8c41d1442f', '88191759-1cb8-4d8d-8122-d835cae837c7', 2, N'Approved',
     N'In the TaskQueue class below, what is the worst-case time complexity of dequeue() relative to the number of queued tasks?', N'from collections import deque

class TaskQueue:
    def __init__(self):
        self.items = []

    def enqueue(self, task):
        self.items.append(task)

    def dequeue(self):
        if not self.items:
            return None
        return self.items.pop(0)', N'python',
     N'["O(n)", "O(1)", "O(log n)", "O(1) amortized"]', N'A', N'Removing from the front of a Python list requires shifting all later elements, so dequeue is O(n); the plausible distractor O(1) is wrong because pop(0) is not constant-time.',
     1.100, 0.100, N'The question tests understanding of Python list operations and discriminates well at a medium level, so use a slightly above-default irtA and near-zero irtB.', N'DataStructures', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the TaskQueue class below, what is the worst-case time complexity of dequeue() relative to the number of queued tasks?", "codeSnippet": "from collections import deque\n\nclass TaskQueue:\n    def __init__(self):\n        self.items = []\n\n    def enqueue(self, task):\n        self.items.append(task)\n\n    def dequeue(self):\n        if not self.items:\n            return None\n        return self.items.pop(0)", "codeLanguage": "python", "options": ["O(n)", "O(1)", "O(log n)", "O(1) amortized"], "correctAnswer": "A", "explanation": "Removing from the front of a Python list requires shifting all later elements, so dequeue is O(n); the plausible distractor O(1) is wrong because pop(0) is not constant-time.", "irtA": 1.1, "irtB": 0.1, "rationale": "The question tests understanding of Python list operations and discriminates well at a medium level, so use a slightly above-default irtA and near-zero irtB.", "category": "DataStructures", "difficulty": 2}',
     '75475921-c29f-4c4c-9192-dbe34686b215');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('47c0656c-bce7-4f31-ae21-c0a0b4a7d011', N'Given this BFS implementation, what is the overall time complexity in terms of vertices V and edges E when the graph is stored as an adjacency list?', 2, N'DataStructures',
     N'["O(V + E)", "O(V^2)", "O(E log V)", "O(E + V^2)"]', N'A', N'Adjacency lists let BFS examine each vertex once and each edge twice in undirected graphs, yielding O(V+E), while O(V^2) wrongly assumes dense adjacency matrices.',
     SYSUTCDATETIME(), 1,
     1.200, 0.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'from collections import deque

graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0, 3],
    3: [1, 2]
}

def bfs(start):
    queue = deque([start])
    visited = {start}
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('8431022e-07d8-45c8-932c-37de8d71c1a1', '88191759-1cb8-4d8d-8122-d835cae837c7', 3, N'Approved',
     N'Given this BFS implementation, what is the overall time complexity in terms of vertices V and edges E when the graph is stored as an adjacency list?', N'from collections import deque

graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0, 3],
    3: [1, 2]
}

def bfs(start):
    queue = deque([start])
    visited = {start}
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)', N'python',
     N'["O(V + E)", "O(V^2)", "O(E log V)", "O(E + V^2)"]', N'A', N'Adjacency lists let BFS examine each vertex once and each edge twice in undirected graphs, yielding O(V+E), while O(V^2) wrongly assumes dense adjacency matrices.',
     1.200, 0.200, N'This BFS complexity question cleanly separates students who grasp adjacency lists from those who guess, so I chose a moderate irtA and slightly positive irtB for medium difficulty.', N'DataStructures', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given this BFS implementation, what is the overall time complexity in terms of vertices V and edges E when the graph is stored as an adjacency list?", "codeSnippet": "from collections import deque\n\ngraph = {\n    0: [1, 2],\n    1: [0, 3],\n    2: [0, 3],\n    3: [1, 2]\n}\n\ndef bfs(start):\n    queue = deque([start])\n    visited = {start}\n    while queue:\n        node = queue.popleft()\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)", "codeLanguage": "python", "options": ["O(V + E)", "O(V^2)", "O(E log V)", "O(E + V^2)"], "correctAnswer": "A", "explanation": "Adjacency lists let BFS examine each vertex once and each edge twice in undirected graphs, yielding O(V+E), while O(V^2) wrongly assumes dense adjacency matrices.", "irtA": 1.2, "irtB": 0.2, "rationale": "This BFS complexity question cleanly separates students who grasp adjacency lists from those who guess, so I chose a moderate irtA and slightly positive irtB for medium difficulty.", "category": "DataStructures", "difficulty": 2}',
     '47c0656c-bce7-4f31-ae21-c0a0b4a7d011');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('7cde86e7-c22f-40a4-8930-85bce7a36932', N'The custom dynamic array below doubles its capacity whenever `size == capacity`. Why does repeated calls to `add` still run in amortized O(1) time even though resizing copies the array?', 3, N'DataStructures',
     N'["A: Each element participates in at most one expensive copy per doubling, bounding total work to O(n)", "B: Resizing happens only when size == capacity, so there are fewer than n copies overall", "C: The check `size == data.length` makes the resize branch predictable, so execution stays constant", "D: Doubling capacity ensures we never copy more than one element per add"]', N'A', N'Doubling bounds total copies to a geometric series (~2n), so average per add is constant; option B mistakes number of copies for number of copy operations and ignores that each resizing copies all current elements.',
     SYSUTCDATETIME(), 1,
     1.800, 1.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'class DynamicArray {
    private int[] data = new int[2];
    private int size = 0;

    void add(int value) {
        if (size == data.length) {
            int[] newData = new int[data.length * 2];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
        data[size++] = value;
    }
}', N'java',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('f8938568-6258-477a-87cd-791708a24bb6', '88191759-1cb8-4d8d-8122-d835cae837c7', 4, N'Approved',
     N'The custom dynamic array below doubles its capacity whenever `size == capacity`. Why does repeated calls to `add` still run in amortized O(1) time even though resizing copies the array?', N'class DynamicArray {
    private int[] data = new int[2];
    private int size = 0;

    void add(int value) {
        if (size == data.length) {
            int[] newData = new int[data.length * 2];
            System.arraycopy(data, 0, newData, 0, data.length);
            data = newData;
        }
        data[size++] = value;
    }
}', N'java',
     N'["A: Each element participates in at most one expensive copy per doubling, bounding total work to O(n)", "B: Resizing happens only when size == capacity, so there are fewer than n copies overall", "C: The check `size == data.length` makes the resize branch predictable, so execution stays constant", "D: Doubling capacity ensures we never copy more than one element per add"]', N'A', N'Doubling bounds total copies to a geometric series (~2n), so average per add is constant; option B mistakes number of copies for number of copy operations and ignores that each resizing copies all current elements.',
     1.800, 1.100, N'This question sharply distinguishes students who understand amortized analysis (high irtA) and is quite hard (irtB >1).', N'DataStructures', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The custom dynamic array below doubles its capacity whenever `size == capacity`. Why does repeated calls to `add` still run in amortized O(1) time even though resizing copies the array?", "codeSnippet": "class DynamicArray {\n    private int[] data = new int[2];\n    private int size = 0;\n\n    void add(int value) {\n        if (size == data.length) {\n            int[] newData = new int[data.length * 2];\n            System.arraycopy(data, 0, newData, 0, data.length);\n            data = newData;\n        }\n        data[size++] = value;\n    }\n}", "codeLanguage": "java", "options": ["A: Each element participates in at most one expensive copy per doubling, bounding total work to O(n)", "B: Resizing happens only when size == capacity, so there are fewer than n copies overall", "C: The check `size == data.length` makes the resize branch predictable, so execution stays constant", "D: Doubling capacity ensures we never copy more than one element per add"], "correctAnswer": "A", "explanation": "Doubling bounds total copies to a geometric series (~2n), so average per add is constant; option B mistakes number of copies for number of copy operations and ignores that each resizing copies all current elements.", "irtA": 1.8, "irtB": 1.1, "rationale": "This question sharply distinguishes students who understand amortized analysis (high irtA) and is quite hard (irtB >1).", "category": "DataStructures", "difficulty": 3}',
     '7cde86e7-c22f-40a4-8930-85bce7a36932');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('9add3184-34af-4647-ab4f-c4e966dbc809', N'Given the min-heap approach below to track the k largest values from a stream, what is the overall runtime to process n items when k â‰ª n?', 3, N'DataStructures',
     N'["A: O(n log k), because every item triggers at most one insert/removal on a heap of size â‰¤ k", "B: O(n log n), because each insertion happens in a heap that can grow to n before pruning", "C: O(k log n), since only the final k values dominate the heap operations", "D: O(n + k log n), because we pay a linear scan plus k expensive heap adjustments"]', N'A', N'Maintaining a heap capped at k means each of the n items incurs O(log k) work, so total O(n log k); option D wrongly treats final heap adjustments as dependent on n, ignoring the size cap.',
     SYSUTCDATETIME(), 1,
     1.500, 1.300, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'import java.util.PriorityQueue;

List<Integer> topK(int[] stream, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int value : stream) {
        heap.offer(value);
        if (heap.size() > k) {
            heap.poll();
        }
    }
    return new ArrayList<>(heap);
}', N'java',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('af428b57-631e-49fc-863e-2dcdfbea4eee', '88191759-1cb8-4d8d-8122-d835cae837c7', 5, N'Approved',
     N'Given the min-heap approach below to track the k largest values from a stream, what is the overall runtime to process n items when k â‰ª n?', N'import java.util.PriorityQueue;

List<Integer> topK(int[] stream, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int value : stream) {
        heap.offer(value);
        if (heap.size() > k) {
            heap.poll();
        }
    }
    return new ArrayList<>(heap);
}', N'java',
     N'["A: O(n log k), because every item triggers at most one insert/removal on a heap of size â‰¤ k", "B: O(n log n), because each insertion happens in a heap that can grow to n before pruning", "C: O(k log n), since only the final k values dominate the heap operations", "D: O(n + k log n), because we pay a linear scan plus k expensive heap adjustments"]', N'A', N'Maintaining a heap capped at k means each of the n items incurs O(log k) work, so total O(n log k); option D wrongly treats final heap adjustments as dependent on n, ignoring the size cap.',
     1.500, 1.300, N'The discrimination is moderate-high since understanding runtime requires reasoning about the bounded heap size, and difficulty is substantial.', N'DataStructures', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the min-heap approach below to track the k largest values from a stream, what is the overall runtime to process n items when k â‰ª n?", "codeSnippet": "import java.util.PriorityQueue;\n\nList<Integer> topK(int[] stream, int k) {\n    PriorityQueue<Integer> heap = new PriorityQueue<>();\n    for (int value : stream) {\n        heap.offer(value);\n        if (heap.size() > k) {\n            heap.poll();\n        }\n    }\n    return new ArrayList<>(heap);\n}", "codeLanguage": "java", "options": ["A: O(n log k), because every item triggers at most one insert/removal on a heap of size â‰¤ k", "B: O(n log n), because each insertion happens in a heap that can grow to n before pruning", "C: O(k log n), since only the final k values dominate the heap operations", "D: O(n + k log n), because we pay a linear scan plus k expensive heap adjustments"], "correctAnswer": "A", "explanation": "Maintaining a heap capped at k means each of the n items incurs O(log k) work, so total O(n log k); option D wrongly treats final heap adjustments as dependent on n, ignoring the size cap.", "irtA": 1.5, "irtB": 1.3, "rationale": "The discrimination is moderate-high since understanding runtime requires reasoning about the bounded heap size, and difficulty is substantial.", "category": "DataStructures", "difficulty": 3}',
     '9add3184-34af-4647-ab4f-c4e966dbc809');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('86b8ac01-50b4-4bd4-88c0-5beb7a25794a', N'What prerequisite must hold before applying binary search to find a target in an array?', 1, N'Algorithms',
     N'["The array elements must be in a consistent sorted order.", "The array length must be a power of two.", "Every value in the array must be unique.", "The target is guaranteed to exist in the array."]', N'A', N'Binary search requires the array to be sorted so each comparison discards half the search space; uniqueness and guaranteed existence are not required and length need not be a power of two.',
     SYSUTCDATETIME(), 1,
     1.000, -1.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('b42770fd-4bc4-4af4-9854-e590d83b8101', '88191759-1cb8-4d8d-8122-d835cae837c7', 6, N'Approved',
     N'What prerequisite must hold before applying binary search to find a target in an array?', NULL, NULL,
     N'["The array elements must be in a consistent sorted order.", "The array length must be a power of two.", "Every value in the array must be unique.", "The target is guaranteed to exist in the array."]', N'A', N'Binary search requires the array to be sorted so each comparison discards half the search space; uniqueness and guaranteed existence are not required and length need not be a power of two.',
     1.000, -1.200, N'Simple conceptual check with clear discriminator, so a mid-range irtA of 1.0 and easy difficulty bias irtB near -1.2 works.', N'Algorithms', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "What prerequisite must hold before applying binary search to find a target in an array?", "codeSnippet": null, "codeLanguage": null, "options": ["The array elements must be in a consistent sorted order.", "The array length must be a power of two.", "Every value in the array must be unique.", "The target is guaranteed to exist in the array."], "correctAnswer": "A", "explanation": "Binary search requires the array to be sorted so each comparison discards half the search space; uniqueness and guaranteed existence are not required and length need not be a power of two.", "irtA": 1.0, "irtB": -1.2, "rationale": "Simple conceptual check with clear discriminator, so a mid-range irtA of 1.0 and easy difficulty bias irtB near -1.2 works.", "category": "Algorithms", "difficulty": 1}',
     '86b8ac01-50b4-4bd4-88c0-5beb7a25794a');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('ebcdb402-ce08-4f06-b336-1944c2e3a1c5', N'Why does mergesort maintain O(n log n) worst-case time, even though it repeatedly splits the list?', 1, N'Algorithms',
     N'["Each split reduces problem size, and merging two sorted halves costs O(n) each level.", "Splitting requires scanning the whole list, so merging becomes negligible.", "Only the first split influences complexity; later merges operate on constants.", "The split step sorts the halves, so merging just concatenates them."]', N'A', N'Mergesort recurses on halves (log n levels) and each level merges all n elements, giving O(n log n); the other options misstate that splitting or merging are constant time or unnecessary.',
     SYSUTCDATETIME(), 1,
     1.100, -1.000, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d6415a9d-7325-48bb-8551-5dc07a6dfc8c', '88191759-1cb8-4d8d-8122-d835cae837c7', 7, N'Approved',
     N'Why does mergesort maintain O(n log n) worst-case time, even though it repeatedly splits the list?', NULL, NULL,
     N'["Each split reduces problem size, and merging two sorted halves costs O(n) each level.", "Splitting requires scanning the whole list, so merging becomes negligible.", "Only the first split influences complexity; later merges operate on constants.", "The split step sorts the halves, so merging just concatenates them."]', N'A', N'Mergesort recurses on halves (log n levels) and each level merges all n elements, giving O(n log n); the other options misstate that splitting or merging are constant time or unnecessary.',
     1.100, -1.000, N'The question tests basic understanding of divide-and-conquer cost structure, so a standard irtA near 1.1 and easy irtB around -1.0 reflects expected discrimination.', N'Algorithms', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Why does mergesort maintain O(n log n) worst-case time, even though it repeatedly splits the list?", "codeSnippet": null, "codeLanguage": null, "options": ["Each split reduces problem size, and merging two sorted halves costs O(n) each level.", "Splitting requires scanning the whole list, so merging becomes negligible.", "Only the first split influences complexity; later merges operate on constants.", "The split step sorts the halves, so merging just concatenates them."], "correctAnswer": "A", "explanation": "Mergesort recurses on halves (log n levels) and each level merges all n elements, giving O(n log n); the other options misstate that splitting or merging are constant time or unnecessary.", "irtA": 1.1, "irtB": -1.0, "rationale": "The question tests basic understanding of divide-and-conquer cost structure, so a standard irtA near 1.1 and easy irtB around -1.0 reflects expected discrimination.", "category": "Algorithms", "difficulty": 1}',
     'ebcdb402-ce08-4f06-b336-1944c2e3a1c5');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('258c60a5-616b-4540-b25c-970e8ddc6170', N'In the DFS-based cycle detector below, why does the algorithm run in O(V + E) time rather than revisiting nodes multiple times?', 2, N'Algorithms',
     N'["The recursion stack ensures no node can be entered twice before it unwinds", "Skipping neighbors already in visited prevents re-examining edges after the first visit", "Removing node from stack avoids exploring its neighbors again later", "Using adjacency lists hides the cost of repeated edge checks"]', N'B', N'Marking nodes as visited before recursing ensures each edge is followed at most once; option A only prevents immediate backtracking, not revisits after returning.',
     SYSUTCDATETIME(), 1,
     1.100, 0.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'def has_cycle(adj):
    visited = set()
    stack = set()

    def dfs(node):
        if node in stack:
            return True
        if node in visited:
            return False
        visited.add(node)
        stack.add(node)
        for neighbor in adj[node]:
            if dfs(neighbor):
                return True
        stack.remove(node)
        return False

    for node in adj:
        if dfs(node):
            return True
    return False', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d6bf590b-fb0f-45c8-b234-52725407e9ad', '88191759-1cb8-4d8d-8122-d835cae837c7', 8, N'Approved',
     N'In the DFS-based cycle detector below, why does the algorithm run in O(V + E) time rather than revisiting nodes multiple times?', N'def has_cycle(adj):
    visited = set()
    stack = set()

    def dfs(node):
        if node in stack:
            return True
        if node in visited:
            return False
        visited.add(node)
        stack.add(node)
        for neighbor in adj[node]:
            if dfs(neighbor):
                return True
        stack.remove(node)
        return False

    for node in adj:
        if dfs(node):
            return True
    return False', N'python',
     N'["The recursion stack ensures no node can be entered twice before it unwinds", "Skipping neighbors already in visited prevents re-examining edges after the first visit", "Removing node from stack avoids exploring its neighbors again later", "Using adjacency lists hides the cost of repeated edge checks"]', N'B', N'Marking nodes as visited before recursing ensures each edge is followed at most once; option A only prevents immediate backtracking, not revisits after returning.',
     1.100, 0.100, N'The question focuses on traversal cost, so moderate discrimination and near-average difficulty seems right.', N'Algorithms', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the DFS-based cycle detector below, why does the algorithm run in O(V + E) time rather than revisiting nodes multiple times?", "codeSnippet": "def has_cycle(adj):\n    visited = set()\n    stack = set()\n\n    def dfs(node):\n        if node in stack:\n            return True\n        if node in visited:\n            return False\n        visited.add(node)\n        stack.add(node)\n        for neighbor in adj[node]:\n            if dfs(neighbor):\n                return True\n        stack.remove(node)\n        return False\n\n    for node in adj:\n        if dfs(node):\n            return True\n    return False", "codeLanguage": "python", "options": ["The recursion stack ensures no node can be entered twice before it unwinds", "Skipping neighbors already in visited prevents re-examining edges after the first visit", "Removing node from stack avoids exploring its neighbors again later", "Using adjacency lists hides the cost of repeated edge checks"], "correctAnswer": "B", "explanation": "Marking nodes as visited before recursing ensures each edge is followed at most once; option A only prevents immediate backtracking, not revisits after returning.", "irtA": 1.1, "irtB": 0.1, "rationale": "The question focuses on traversal cost, so moderate discrimination and near-average difficulty seems right.", "category": "Algorithms", "difficulty": 2}',
     '258c60a5-616b-4540-b25c-970e8ddc6170');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('ff890869-2e23-443d-8c02-8fda5fe33710', N'The schedule builder below picks tasks sorted by finish time. Which insight explains why it always finds the maximum number of non-overlapping tasks?', 2, N'Algorithms',
     N'["Selecting the earliest-finishing task leaves the most room for future tasks", "Sorting by start time guarantees that completing one task forces the cheapest follow-up", "Greedy choice backs out when a longer task overlaps with a shorter one", "Choosing tasks in input order ensures stable selection of eligible intervals"]', N'A', N'Picking the earliest finish frees up the timeline for later tasks; option C misstates the algorithm since it never removes an already selected task.',
     SYSUTCDATETIME(), 1,
     1.300, 0.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'tasks = [(1, 4), (2, 3), (3, 5), (5, 6)]
tasks.sort(key=lambda x: x[1])
selected = []
end = -float(''inf'')
for start, finish in tasks:
    if start >= end:
        selected.append((start, finish))
        end = finish', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('ab552f89-d579-46e2-8e5e-5907e55e7a82', '88191759-1cb8-4d8d-8122-d835cae837c7', 9, N'Approved',
     N'The schedule builder below picks tasks sorted by finish time. Which insight explains why it always finds the maximum number of non-overlapping tasks?', N'tasks = [(1, 4), (2, 3), (3, 5), (5, 6)]
tasks.sort(key=lambda x: x[1])
selected = []
end = -float(''inf'')
for start, finish in tasks:
    if start >= end:
        selected.append((start, finish))
        end = finish', N'python',
     N'["Selecting the earliest-finishing task leaves the most room for future tasks", "Sorting by start time guarantees that completing one task forces the cheapest follow-up", "Greedy choice backs out when a longer task overlaps with a shorter one", "Choosing tasks in input order ensures stable selection of eligible intervals"]', N'A', N'Picking the earliest finish frees up the timeline for later tasks; option C misstates the algorithm since it never removes an already selected task.',
     1.300, 0.200, N'Greedy interval scheduling cleanly distinguishes correct reasoning, so slightly stronger discrimination is appropriate.', N'Algorithms', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The schedule builder below picks tasks sorted by finish time. Which insight explains why it always finds the maximum number of non-overlapping tasks?", "codeSnippet": "tasks = [(1, 4), (2, 3), (3, 5), (5, 6)]\ntasks.sort(key=lambda x: x[1])\nselected = []\nend = -float(''inf'')\nfor start, finish in tasks:\n    if start >= end:\n        selected.append((start, finish))\n        end = finish", "codeLanguage": "python", "options": ["Selecting the earliest-finishing task leaves the most room for future tasks", "Sorting by start time guarantees that completing one task forces the cheapest follow-up", "Greedy choice backs out when a longer task overlaps with a shorter one", "Choosing tasks in input order ensures stable selection of eligible intervals"], "correctAnswer": "A", "explanation": "Picking the earliest finish frees up the timeline for later tasks; option C misstates the algorithm since it never removes an already selected task.", "irtA": 1.3, "irtB": 0.2, "rationale": "Greedy interval scheduling cleanly distinguishes correct reasoning, so slightly stronger discrimination is appropriate.", "category": "Algorithms", "difficulty": 2}',
     'ff890869-2e23-443d-8c02-8fda5fe33710');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('e7654cbe-4c50-49a9-9d8a-7d7f4e36ef4b', N'Consider the hybrid sorting function below. What is the tightest worst-case asymptotic time complexity of `hybrid_sort` for an input array of length n?', 3, N'Algorithms',
     N'["O(n log n)", "O(n)", "O(n log log n)", "O(n^2)"]', N'A', N'Even though small subarrays are handled by `sorted`, the recursion depth is still Î˜(log n) and each level merges Î˜(n) elements, so the worst-case cost remains Î˜(n log n); the O(n log log n) distractor ignores the linear merge cost per level.',
     SYSUTCDATETIME(), 1,
     1.200, 0.700, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'def hybrid_sort(arr):
    if len(arr) <= 16:
        return sorted(arr)
    mid = len(arr) // 2
    left = hybrid_sort(arr[:mid])
    right = hybrid_sort(arr[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('9840e24c-f110-4d71-a7aa-488d2db33ad1', '88191759-1cb8-4d8d-8122-d835cae837c7', 10, N'Approved',
     N'Consider the hybrid sorting function below. What is the tightest worst-case asymptotic time complexity of `hybrid_sort` for an input array of length n?', N'def hybrid_sort(arr):
    if len(arr) <= 16:
        return sorted(arr)
    mid = len(arr) // 2
    left = hybrid_sort(arr[:mid])
    right = hybrid_sort(arr[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged', N'python',
     N'["O(n log n)", "O(n)", "O(n log log n)", "O(n^2)"]', N'A', N'Even though small subarrays are handled by `sorted`, the recursion depth is still Î˜(log n) and each level merges Î˜(n) elements, so the worst-case cost remains Î˜(n log n); the O(n log log n) distractor ignores the linear merge cost per level.',
     1.200, 0.700, N'The question sharply distinguishes students who understand hybrid divide-and-conquer from those who overvalue the small-case optimization, so a moderate discrimination is warranted.', N'Algorithms', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Consider the hybrid sorting function below. What is the tightest worst-case asymptotic time complexity of `hybrid_sort` for an input array of length n?", "codeSnippet": "def hybrid_sort(arr):\n    if len(arr) <= 16:\n        return sorted(arr)\n    mid = len(arr) // 2\n    left = hybrid_sort(arr[:mid])\n    right = hybrid_sort(arr[mid:])\n    merged = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] < right[j]:\n            merged.append(left[i]); i += 1\n        else:\n            merged.append(right[j]); j += 1\n    merged.extend(left[i:])\n    merged.extend(right[j:])\n    return merged", "codeLanguage": "python", "options": ["O(n log n)", "O(n)", "O(n log log n)", "O(n^2)"], "correctAnswer": "A", "explanation": "Even though small subarrays are handled by `sorted`, the recursion depth is still Î˜(log n) and each level merges Î˜(n) elements, so the worst-case cost remains Î˜(n log n); the O(n log log n) distractor ignores the linear merge cost per level.", "irtA": 1.2, "irtB": 0.7, "rationale": "The question sharply distinguishes students who understand hybrid divide-and-conquer from those who overvalue the small-case optimization, so a moderate discrimination is warranted.", "category": "Algorithms", "difficulty": 3}',
     'e7654cbe-4c50-49a9-9d8a-7d7f4e36ef4b');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b401cb24-0859-4d95-94b1-15d8bfc90e5c', N'The recursive `longest_path` function below memoizes results for each node. What must hold for the function to always terminate and return the correct longest simple path length?', 3, N'Algorithms',
     N'["The directed graph contains no cycles.", "Edge weights are all positive.", "All nodes are reachable from a single source.", "Graph edges are sorted by destination."]', N'A', N'Memoization only prevents repeated work, but if a cycle exists the recursion never bottoms out; the other options are irrelevant to termination or correctness of longest simple path computation.',
     SYSUTCDATETIME(), 1,
     1.600, 1.300, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'def longest_path(node, graph, memo):
    if node in memo:
        return memo[node]
    best = 0
    for neighbor in graph.get(node, []):
        best = max(best, 1 + longest_path(neighbor, graph, memo))
    memo[node] = best
    return best', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('442dd181-d4f8-49e3-8aed-f6612a54ef85', '88191759-1cb8-4d8d-8122-d835cae837c7', 11, N'Approved',
     N'The recursive `longest_path` function below memoizes results for each node. What must hold for the function to always terminate and return the correct longest simple path length?', N'def longest_path(node, graph, memo):
    if node in memo:
        return memo[node]
    best = 0
    for neighbor in graph.get(node, []):
        best = max(best, 1 + longest_path(neighbor, graph, memo))
    memo[node] = best
    return best', N'python',
     N'["The directed graph contains no cycles.", "Edge weights are all positive.", "All nodes are reachable from a single source.", "Graph edges are sorted by destination."]', N'A', N'Memoization only prevents repeated work, but if a cycle exists the recursion never bottoms out; the other options are irrelevant to termination or correctness of longest simple path computation.',
     1.600, 1.300, N'The prompt requires recognizing the role of acyclicity in recursion over DAGs, which sharply discriminates between those who understand memoized DFS and those who don''t.', N'Algorithms', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "The recursive `longest_path` function below memoizes results for each node. What must hold for the function to always terminate and return the correct longest simple path length?", "codeSnippet": "def longest_path(node, graph, memo):\n    if node in memo:\n        return memo[node]\n    best = 0\n    for neighbor in graph.get(node, []):\n        best = max(best, 1 + longest_path(neighbor, graph, memo))\n    memo[node] = best\n    return best", "codeLanguage": "python", "options": ["The directed graph contains no cycles.", "Edge weights are all positive.", "All nodes are reachable from a single source.", "Graph edges are sorted by destination."], "correctAnswer": "A", "explanation": "Memoization only prevents repeated work, but if a cycle exists the recursion never bottoms out; the other options are irrelevant to termination or correctness of longest simple path computation.", "irtA": 1.6, "irtB": 1.3, "rationale": "The prompt requires recognizing the role of acyclicity in recursion over DAGs, which sharply discriminates between those who understand memoized DFS and those who don''t.", "category": "Algorithms", "difficulty": 3}',
     'b401cb24-0859-4d95-94b1-15d8bfc90e5c');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('fb65ab37-6175-4019-97b8-1c87eef29f07', N'Which statement best captures a practical difference between an abstract class and an interface in languages that provide both?', 1, N'OOP',
     N'["An abstract class can hold per-instance state and default implementations, while an interface cannot store instance fields", "Interface methods always execute faster because implementations bypass vtable dispatch", "Abstract classes are forbidden from declaring constructors while interfaces can define them", "Implementing an interface forces every derived class to inherit its methods without explicitly providing them"]', N'A', N'Abstract classes can define fields and default behavior that derived classes inherit, while interfaces generally only specify signatures; the most plausible distractor wrongly claims an interface always runs faster, which is not a guaranteed cost difference.',
     SYSUTCDATETIME(), 1,
     1.200, -1.000, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('7c62e7aa-d7b9-4c8e-b405-d77a23820d70', '88191759-1cb8-4d8d-8122-d835cae837c7', 12, N'Approved',
     N'Which statement best captures a practical difference between an abstract class and an interface in languages that provide both?', NULL, NULL,
     N'["An abstract class can hold per-instance state and default implementations, while an interface cannot store instance fields", "Interface methods always execute faster because implementations bypass vtable dispatch", "Abstract classes are forbidden from declaring constructors while interfaces can define them", "Implementing an interface forces every derived class to inherit its methods without explicitly providing them"]', N'A', N'Abstract classes can define fields and default behavior that derived classes inherit, while interfaces generally only specify signatures; the most plausible distractor wrongly claims an interface always runs faster, which is not a guaranteed cost difference.',
     1.200, -1.000, N'The question cleanly distinguishes two related concepts, so a standard discrimination above 1.0 fits and the easy-level difficulty justifies a negative difficulty parameter.', N'OOP', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which statement best captures a practical difference between an abstract class and an interface in languages that provide both?", "codeSnippet": null, "codeLanguage": null, "options": ["An abstract class can hold per-instance state and default implementations, while an interface cannot store instance fields", "Interface methods always execute faster because implementations bypass vtable dispatch", "Abstract classes are forbidden from declaring constructors while interfaces can define them", "Implementing an interface forces every derived class to inherit its methods without explicitly providing them"], "correctAnswer": "A", "explanation": "Abstract classes can define fields and default behavior that derived classes inherit, while interfaces generally only specify signatures; the most plausible distractor wrongly claims an interface always runs faster, which is not a guaranteed cost difference.", "irtA": 1.2, "irtB": -1.0, "rationale": "The question cleanly distinguishes two related concepts, so a standard discrimination above 1.0 fits and the easy-level difficulty justifies a negative difficulty parameter.", "category": "OOP", "difficulty": 1}',
     'fb65ab37-6175-4019-97b8-1c87eef29f07');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('676fd000-ee65-4c38-bb77-17aa10cd4775', '88191759-1cb8-4d8d-8122-d835cae837c7', 13, N'Rejected',
     N'Given the classes below, what does `Base b = new Derived(); b.Describe();` print?', N'class Base {
    public void Describe() { Console.WriteLine("Base"); }
}

class Derived : Base {
    public void Describe() { Console.WriteLine("Derived"); }
}', N'csharp',
     N'["Base", "Derived", "It depends on compile-time type inference settings", "It fails to compile because Derived hides the base member"]', N'A', N'Because `Describe` is not virtual, the call is bound to the compile-time type `Base`, so it prints "Base"; the most plausible distractor claims it prints "Derived," but that would only happen if the method were virtual and overridden.',
     1.100, -1.300, N'The question targets a single misconception about overriding, so standard discrimination and a negative difficulty capture its relative ease.', N'OOP', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), N'Option-length disparity (4 vs 57) > 5x â€” parallelism off.',
     N'{"questionText": "Given the classes below, what does `Base b = new Derived(); b.Describe();` print?", "codeSnippet": "class Base {\n    public void Describe() { Console.WriteLine(\"Base\"); }\n}\n\nclass Derived : Base {\n    public void Describe() { Console.WriteLine(\"Derived\"); }\n}", "codeLanguage": "csharp", "options": ["Base", "Derived", "It depends on compile-time type inference settings", "It fails to compile because Derived hides the base member"], "correctAnswer": "A", "explanation": "Because `Describe` is not virtual, the call is bound to the compile-time type `Base`, so it prints \"Base\"; the most plausible distractor claims it prints \"Derived,\" but that would only happen if the method were virtual and overridden.", "irtA": 1.1, "irtB": -1.3, "rationale": "The question targets a single misconception about overriding, so standard discrimination and a negative difficulty capture its relative ease.", "category": "OOP", "difficulty": 1}',
     NULL);

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('cdc03c65-6f76-407e-b944-7e15b6899509', N'In the snippet below, why does Program.Main print "base" even though FileLogger defines its own Tag method?', 2, N'OOP',
     N'["Report calls Logger.Tag, but FileLogger hides rather than overrides, so the base version runs", "FileLogger.Tag cannot execute because it lacks the override keyword, so the runtime skips it", "Report is non-virtual and binds to the static Logger type, ignoring the derived implementation", "FileLogger.Tag is private to FileLogger, so Report cannot reach it"]', N'A', N'Report invokes Logger.Tag, and FileLogger introduced a new method that hides but does not override the virtual definition, so the base Tag is invoked; the most plausible distractor says Report binds to Logger statically, but even if Report is non-virtual it still calls whatever virtual method is resolved, so hiding is the real reason.',
     SYSUTCDATETIME(), 1,
     1.300, 0.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'class Logger
{
    public virtual string Tag() => "base";
    public string Report() => Tag();
}

class FileLogger : Logger
{
    public new string Tag() => "file";
}

class Program
{
    static void Main()
    {
        Logger logger = new FileLogger();
        Console.WriteLine(logger.Report());
    }
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('1d93b57c-ba02-4320-9296-b60ad4be051b', '88191759-1cb8-4d8d-8122-d835cae837c7', 14, N'Approved',
     N'In the snippet below, why does Program.Main print "base" even though FileLogger defines its own Tag method?', N'class Logger
{
    public virtual string Tag() => "base";
    public string Report() => Tag();
}

class FileLogger : Logger
{
    public new string Tag() => "file";
}

class Program
{
    static void Main()
    {
        Logger logger = new FileLogger();
        Console.WriteLine(logger.Report());
    }
}', N'csharp',
     N'["Report calls Logger.Tag, but FileLogger hides rather than overrides, so the base version runs", "FileLogger.Tag cannot execute because it lacks the override keyword, so the runtime skips it", "Report is non-virtual and binds to the static Logger type, ignoring the derived implementation", "FileLogger.Tag is private to FileLogger, so Report cannot reach it"]', N'A', N'Report invokes Logger.Tag, and FileLogger introduced a new method that hides but does not override the virtual definition, so the base Tag is invoked; the most plausible distractor says Report binds to Logger statically, but even if Report is non-virtual it still calls whatever virtual method is resolved, so hiding is the real reason.',
     1.300, 0.100, N'Differentiating new versus override requires medium-level understanding, so moderate discrimination and neutral difficulty seem appropriate.', N'OOP', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the snippet below, why does Program.Main print \"base\" even though FileLogger defines its own Tag method?", "codeSnippet": "class Logger\n{\n    public virtual string Tag() => \"base\";\n    public string Report() => Tag();\n}\n\nclass FileLogger : Logger\n{\n    public new string Tag() => \"file\";\n}\n\nclass Program\n{\n    static void Main()\n    {\n        Logger logger = new FileLogger();\n        Console.WriteLine(logger.Report());\n    }\n}", "codeLanguage": "csharp", "options": ["Report calls Logger.Tag, but FileLogger hides rather than overrides, so the base version runs", "FileLogger.Tag cannot execute because it lacks the override keyword, so the runtime skips it", "Report is non-virtual and binds to the static Logger type, ignoring the derived implementation", "FileLogger.Tag is private to FileLogger, so Report cannot reach it"], "correctAnswer": "A", "explanation": "Report invokes Logger.Tag, and FileLogger introduced a new method that hides but does not override the virtual definition, so the base Tag is invoked; the most plausible distractor says Report binds to Logger statically, but even if Report is non-virtual it still calls whatever virtual method is resolved, so hiding is the real reason.", "irtA": 1.3, "irtB": 0.1, "rationale": "Differentiating new versus override requires medium-level understanding, so moderate discrimination and neutral difficulty seem appropriate.", "category": "OOP", "difficulty": 2}',
     'cdc03c65-6f76-407e-b944-7e15b6899509');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('4e522a78-89f7-45fe-ad5c-1700768a2c36', N'Given this hierarchy, what ensures CustomReport cannot change the string printed by FinalReport when invoked as a ReportBase?', 2, N'OOP',
     N'["The sealed override in DetailedReport stops subclasses from overriding FinalReport, so every call uses the detailed version", "ReportBase already declared FinalReport as non-virtual, so nothing could override it in the first place", "CustomReport is sealed by default, so no further overrides are possible", "Program caches FinalReport''s result, so changes in derived classes cannot affect the printed string"]', N'A', N'DetailedReport seals its override of FinalReport, preventing any subclass like CustomReport from providing a new behavior, while the distractor claiming ReportBase made FinalReport non-virtual is false because it explicitly declares it virtual.',
     SYSUTCDATETIME(), 1,
     1.000, 0.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'class ReportBase
{
    public virtual string FinalReport() => "base";
}

class DetailedReport : ReportBase
{
    public sealed override string FinalReport() => "detailed";
}

class CustomReport : DetailedReport
{
}

class Program
{
    static void Main()
    {
        ReportBase report = new CustomReport();
        Console.WriteLine(report.FinalReport());
    }
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('8075d39f-cc62-4a8e-b8c9-ebaf308f9560', '88191759-1cb8-4d8d-8122-d835cae837c7', 15, N'Approved',
     N'Given this hierarchy, what ensures CustomReport cannot change the string printed by FinalReport when invoked as a ReportBase?', N'class ReportBase
{
    public virtual string FinalReport() => "base";
}

class DetailedReport : ReportBase
{
    public sealed override string FinalReport() => "detailed";
}

class CustomReport : DetailedReport
{
}

class Program
{
    static void Main()
    {
        ReportBase report = new CustomReport();
        Console.WriteLine(report.FinalReport());
    }
}', N'csharp',
     N'["The sealed override in DetailedReport stops subclasses from overriding FinalReport, so every call uses the detailed version", "ReportBase already declared FinalReport as non-virtual, so nothing could override it in the first place", "CustomReport is sealed by default, so no further overrides are possible", "Program caches FinalReport''s result, so changes in derived classes cannot affect the printed string"]', N'A', N'DetailedReport seals its override of FinalReport, preventing any subclass like CustomReport from providing a new behavior, while the distractor claiming ReportBase made FinalReport non-virtual is false because it explicitly declares it virtual.',
     1.000, 0.200, N'Sealed overrides are a clear medium-level concept with predictable discrimination, so default irtA and slightly positive irtB reflect that.', N'OOP', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given this hierarchy, what ensures CustomReport cannot change the string printed by FinalReport when invoked as a ReportBase?", "codeSnippet": "class ReportBase\n{\n    public virtual string FinalReport() => \"base\";\n}\n\nclass DetailedReport : ReportBase\n{\n    public sealed override string FinalReport() => \"detailed\";\n}\n\nclass CustomReport : DetailedReport\n{\n}\n\nclass Program\n{\n    static void Main()\n    {\n        ReportBase report = new CustomReport();\n        Console.WriteLine(report.FinalReport());\n    }\n}", "codeLanguage": "csharp", "options": ["The sealed override in DetailedReport stops subclasses from overriding FinalReport, so every call uses the detailed version", "ReportBase already declared FinalReport as non-virtual, so nothing could override it in the first place", "CustomReport is sealed by default, so no further overrides are possible", "Program caches FinalReport''s result, so changes in derived classes cannot affect the printed string"], "correctAnswer": "A", "explanation": "DetailedReport seals its override of FinalReport, preventing any subclass like CustomReport from providing a new behavior, while the distractor claiming ReportBase made FinalReport non-virtual is false because it explicitly declares it virtual.", "irtA": 1.0, "irtB": 0.2, "rationale": "Sealed overrides are a clear medium-level concept with predictable discrimination, so default irtA and slightly positive irtB reflect that.", "category": "OOP", "difficulty": 2}',
     '4e522a78-89f7-45fe-ad5c-1700768a2c36');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('c21b1abc-34ce-4687-b711-c02ba9735344', N'Why does the first Console.WriteLine output 0 even though the Derived constructor later prints 5?', 3, N'OOP',
     N'["Base constructor runs before Derived field initializers, so count is still 0 when GetCount runs there.", "Polymorphic dispatch is paused during base construction, so the abstract call resolves to a base stub returning 0.", "count only receives 5 in the Derived constructor body, so it stays 0 during the base constructor call.", "Base has its own hidden count field defaulting to 0, and the override reads that storage instead of the derived one."]', N'A', N'The base constructor executes before the derived field initializer, so `count` still holds the default 0 when the overridden `GetCount` runs there; option B wrongly claims virtual dispatch is suspended, but the override does execute even during base construction.',
     SYSUTCDATETIME(), 1,
     1.800, 1.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'using System;

abstract class Processor
{
    protected Processor()
    {
        Console.WriteLine(GetCount());
    }

    protected abstract int GetCount();
}

class CounterProcessor : Processor
{
    private int count = 5;

    public CounterProcessor()
    {
        Console.WriteLine(GetCount());
    }

    protected override int GetCount() => count;
}

class Program
{
    static void Main()
    {
        new CounterProcessor();
    }
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('0f8ced12-7da1-4e24-b9b6-9f85a46ed63d', '88191759-1cb8-4d8d-8122-d835cae837c7', 16, N'Approved',
     N'Why does the first Console.WriteLine output 0 even though the Derived constructor later prints 5?', N'using System;

abstract class Processor
{
    protected Processor()
    {
        Console.WriteLine(GetCount());
    }

    protected abstract int GetCount();
}

class CounterProcessor : Processor
{
    private int count = 5;

    public CounterProcessor()
    {
        Console.WriteLine(GetCount());
    }

    protected override int GetCount() => count;
}

class Program
{
    static void Main()
    {
        new CounterProcessor();
    }
}', N'csharp',
     N'["Base constructor runs before Derived field initializers, so count is still 0 when GetCount runs there.", "Polymorphic dispatch is paused during base construction, so the abstract call resolves to a base stub returning 0.", "count only receives 5 in the Derived constructor body, so it stays 0 during the base constructor call.", "Base has its own hidden count field defaulting to 0, and the override reads that storage instead of the derived one."]', N'A', N'The base constructor executes before the derived field initializer, so `count` still holds the default 0 when the overridden `GetCount` runs there; option B wrongly claims virtual dispatch is suspended, but the override does execute even during base construction.',
     1.800, 1.100, N'High discrimination because the question hinges on the order of base constructor, derived initialization, and virtual calls, and the difficulty is above average.', N'OOP', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Why does the first Console.WriteLine output 0 even though the Derived constructor later prints 5?", "codeSnippet": "using System;\n\nabstract class Processor\n{\n    protected Processor()\n    {\n        Console.WriteLine(GetCount());\n    }\n\n    protected abstract int GetCount();\n}\n\nclass CounterProcessor : Processor\n{\n    private int count = 5;\n\n    public CounterProcessor()\n    {\n        Console.WriteLine(GetCount());\n    }\n\n    protected override int GetCount() => count;\n}\n\nclass Program\n{\n    static void Main()\n    {\n        new CounterProcessor();\n    }\n}", "codeLanguage": "csharp", "options": ["Base constructor runs before Derived field initializers, so count is still 0 when GetCount runs there.", "Polymorphic dispatch is paused during base construction, so the abstract call resolves to a base stub returning 0.", "count only receives 5 in the Derived constructor body, so it stays 0 during the base constructor call.", "Base has its own hidden count field defaulting to 0, and the override reads that storage instead of the derived one."], "correctAnswer": "A", "explanation": "The base constructor executes before the derived field initializer, so `count` still holds the default 0 when the overridden `GetCount` runs there; option B wrongly claims virtual dispatch is suspended, but the override does execute even during base construction.", "irtA": 1.8, "irtB": 1.1, "rationale": "High discrimination because the question hinges on the order of base constructor, derived initialization, and virtual calls, and the difficulty is above average.", "category": "OOP", "difficulty": 3}',
     'c21b1abc-34ce-4687-b711-c02ba9735344');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('1886cf50-bb78-45bb-89b0-c8d025992568', N'Why does b.Report() print "Base" while ((Derived)b).Describe() prints "Derived"?', 3, N'OOP',
     N'["Because Describe is hidden with new, the virtual dispatch invoked from Report still calls Base.Describe.", "Report is hard-coded to invoke the base implementation regardless of overrides to keep behavior stable.", "new makes Describe static to Derived, so Base references can never see that implementation.", "Virtual calls require sealed overrides to be dispatched to Derived, so hiding stays on the Base version."]', N'A', N'Using new hides the method rather than overriding it, so the virtual call inside Report still resolves to Base.Describe, whereas option C incorrectly treats new as creating a static, unreachable method.',
     SYSUTCDATETIME(), 1,
     1.600, 0.900, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'class Base
{
    public virtual string Describe() => "Base";
    public string Report() => Describe();
}

class Derived : Base
{
    public new string Describe() => "Derived";
}

class Program
{
    static void Main()
    {
        Base b = new Derived();
        System.Console.WriteLine(b.Report());
        System.Console.WriteLine(((Derived)b).Describe());
    }
}', N'csharp',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('14eb78a4-4fbe-4953-af58-3e52fa0222ac', '88191759-1cb8-4d8d-8122-d835cae837c7', 17, N'Approved',
     N'Why does b.Report() print "Base" while ((Derived)b).Describe() prints "Derived"?', N'class Base
{
    public virtual string Describe() => "Base";
    public string Report() => Describe();
}

class Derived : Base
{
    public new string Describe() => "Derived";
}

class Program
{
    static void Main()
    {
        Base b = new Derived();
        System.Console.WriteLine(b.Report());
        System.Console.WriteLine(((Derived)b).Describe());
    }
}', N'csharp',
     N'["Because Describe is hidden with new, the virtual dispatch invoked from Report still calls Base.Describe.", "Report is hard-coded to invoke the base implementation regardless of overrides to keep behavior stable.", "new makes Describe static to Derived, so Base references can never see that implementation.", "Virtual calls require sealed overrides to be dispatched to Derived, so hiding stays on the Base version."]', N'A', N'Using new hides the method rather than overriding it, so the virtual call inside Report still resolves to Base.Describe, whereas option C incorrectly treats new as creating a static, unreachable method.',
     1.600, 0.900, N'Reasoning about method hiding vs overriding is subtle, so the question discriminates well among students who understand virtual dispatch.', N'OOP', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Why does b.Report() print \"Base\" while ((Derived)b).Describe() prints \"Derived\"?", "codeSnippet": "class Base\n{\n    public virtual string Describe() => \"Base\";\n    public string Report() => Describe();\n}\n\nclass Derived : Base\n{\n    public new string Describe() => \"Derived\";\n}\n\nclass Program\n{\n    static void Main()\n    {\n        Base b = new Derived();\n        System.Console.WriteLine(b.Report());\n        System.Console.WriteLine(((Derived)b).Describe());\n    }\n}", "codeLanguage": "csharp", "options": ["Because Describe is hidden with new, the virtual dispatch invoked from Report still calls Base.Describe.", "Report is hard-coded to invoke the base implementation regardless of overrides to keep behavior stable.", "new makes Describe static to Derived, so Base references can never see that implementation.", "Virtual calls require sealed overrides to be dispatched to Derived, so hiding stays on the Base version."], "correctAnswer": "A", "explanation": "Using new hides the method rather than overriding it, so the virtual call inside Report still resolves to Base.Describe, whereas option C incorrectly treats new as creating a static, unreachable method.", "irtA": 1.6, "irtB": 0.9, "rationale": "Reasoning about method hiding vs overriding is subtle, so the question discriminates well among students who understand virtual dispatch.", "category": "OOP", "difficulty": 3}',
     '1886cf50-bb78-45bb-89b0-c8d025992568');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('3050b53a-e3b1-4704-bc0a-fc32bf2d6eac', N'Which constraint on a child table column enforces that each value must already exist as a primary key in another table?', 1, N'Databases',
     N'["PRIMARY KEY constraint on the child column", "UNIQUE constraint on the child column", "FOREIGN KEY constraint referencing the parent table", "CHECK constraint that compares to the parent table"]', N'C', N'A foreign key enforces referential integrity by requiring child values to match an existing parent PK; unlike UNIQUE or PK, it ties the column to another table rather than just the child table itself.',
     SYSUTCDATETIME(), 1,
     0.800, -1.600, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('548eda20-d299-4c83-acb3-93b60c8ce57f', '88191759-1cb8-4d8d-8122-d835cae837c7', 18, N'Approved',
     N'Which constraint on a child table column enforces that each value must already exist as a primary key in another table?', NULL, NULL,
     N'["PRIMARY KEY constraint on the child column", "UNIQUE constraint on the child column", "FOREIGN KEY constraint referencing the parent table", "CHECK constraint that compares to the parent table"]', N'C', N'A foreign key enforces referential integrity by requiring child values to match an existing parent PK; unlike UNIQUE or PK, it ties the column to another table rather than just the child table itself.',
     0.800, -1.600, N'The question targets a basic concept that most beginners grasp, so a moderate discrimination and low difficulty rating felt appropriate.', N'Databases', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which constraint on a child table column enforces that each value must already exist as a primary key in another table?", "codeSnippet": null, "codeLanguage": null, "options": ["PRIMARY KEY constraint on the child column", "UNIQUE constraint on the child column", "FOREIGN KEY constraint referencing the parent table", "CHECK constraint that compares to the parent table"], "correctAnswer": "C", "explanation": "A foreign key enforces referential integrity by requiring child values to match an existing parent PK; unlike UNIQUE or PK, it ties the column to another table rather than just the child table itself.", "irtA": 0.8, "irtB": -1.6, "rationale": "The question targets a basic concept that most beginners grasp, so a moderate discrimination and low difficulty rating felt appropriate.", "category": "Databases", "difficulty": 1}',
     '3050b53a-e3b1-4704-bc0a-fc32bf2d6eac');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('dd6508fa-4997-4d73-aee7-b46b0fa3a82e', N'When summarizing sales per region using SUM, which clause must appear before the aggregate to ensure rows are grouped correctly?', 1, N'Databases',
     N'["WHERE region = ''East''", "GROUP BY region", "ORDER BY total_sales DESC", "HAVING SUM(sales) > 1000"]', N'B', N'GROUP BY clusters rows by region before applying SUM, while HAVING filters already grouped results and cannot substitute for grouping itself.',
     SYSUTCDATETIME(), 1,
     1.000, -1.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('bda0c287-7daf-45a4-a645-2ce109bd1b99', '88191759-1cb8-4d8d-8122-d835cae837c7', 19, N'Approved',
     N'When summarizing sales per region using SUM, which clause must appear before the aggregate to ensure rows are grouped correctly?', NULL, NULL,
     N'["WHERE region = ''East''", "GROUP BY region", "ORDER BY total_sales DESC", "HAVING SUM(sales) > 1000"]', N'B', N'GROUP BY clusters rows by region before applying SUM, while HAVING filters already grouped results and cannot substitute for grouping itself.',
     1.000, -1.200, N'Grouping before aggregation is a first-week idea, so a standard discrimination with low difficulty suits this item.', N'Databases', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "When summarizing sales per region using SUM, which clause must appear before the aggregate to ensure rows are grouped correctly?", "codeSnippet": null, "codeLanguage": null, "options": ["WHERE region = ''East''", "GROUP BY region", "ORDER BY total_sales DESC", "HAVING SUM(sales) > 1000"], "correctAnswer": "B", "explanation": "GROUP BY clusters rows by region before applying SUM, while HAVING filters already grouped results and cannot substitute for grouping itself.", "irtA": 1.0, "irtB": -1.2, "rationale": "Grouping before aggregation is a first-week idea, so a standard discrimination with low difficulty suits this item.", "category": "Databases", "difficulty": 1}',
     'dd6508fa-4997-4d73-aee7-b46b0fa3a82e');

-- â”€â”€ Owner spot-check pull (ADR-056 Â§3) â€” B2.4 retracted as Rejected. â”€â”€
-- Reason: RESTRICT vs NO ACTION ambiguity. In SQL Server / MySQL these behave
-- identically; the explanation itself admits "RESTRICT (or NO ACTION) prevents..."
-- which makes option D a valid alternative correct answer. Insert-into-Questions
-- block commented out below; the QuestionDrafts row flips Status='Rejected' +
-- captures the reason for the audit trail. Approved count for batch 2 drops 29 â†’ 28.
-- INSERT INTO Questions
--     (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
--      IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
-- VALUES
--     ('6b40e582-b6d6-4969-9a4b-611711223864', N'To ensure no orders reference a deleted customer, which FOREIGN KEY policy enforces referential integrity by blocking the delete attempt?', 2, N'Databases',
--      N'["ON DELETE CASCADE", "ON DELETE SET NULL", "ON DELETE RESTRICT", "ON DELETE NO ACTION"]', N'C', N'RESTRICT (or NO ACTION) prevents the parent deletion while dependent rows exist, but CASCADE would remove those orders and SET NULL would leave dangling references, so RESTRICT is the strongest guard.',
--      SYSUTCDATETIME(), 1,
--      1.300, 0.200, N'AI', N'AI',
--      '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
--      NULL, NULL,
--      NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('b3f4915c-24e3-4936-a120-f7848e06668a', '88191759-1cb8-4d8d-8122-d835cae837c7', 20, N'Rejected',
     N'To ensure no orders reference a deleted customer, which FOREIGN KEY policy enforces referential integrity by blocking the delete attempt?', NULL, NULL,
     N'["ON DELETE CASCADE", "ON DELETE SET NULL", "ON DELETE RESTRICT", "ON DELETE NO ACTION"]', N'C', N'RESTRICT (or NO ACTION) prevents the parent deletion while dependent rows exist, but CASCADE would remove those orders and SET NULL would leave dangling references, so RESTRICT is the strongest guard.',
     1.300, 0.200, N'Moderate discrimination since understanding FK policies clearly separates students, and the medium difficulty matches the slightly positive irtB.', N'Databases', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'Owner spot-check pull (ADR-056 Â§3): RESTRICT vs NO ACTION ambiguity â€” option D is a valid alternative correct answer in SQL Server/MySQL. Explanation itself admits "(or NO ACTION) prevents..." which confirms the ambiguity. Pulled to keep the bank trust chain tight.',
     N'{"questionText": "To ensure no orders reference a deleted customer, which FOREIGN KEY policy enforces referential integrity by blocking the delete attempt?", "codeSnippet": null, "codeLanguage": null, "options": ["ON DELETE CASCADE", "ON DELETE SET NULL", "ON DELETE RESTRICT", "ON DELETE NO ACTION"], "correctAnswer": "C", "explanation": "RESTRICT (or NO ACTION) prevents the parent deletion while dependent rows exist, but CASCADE would remove those orders and SET NULL would leave dangling references, so RESTRICT is the strongest guard.", "irtA": 1.3, "irtB": 0.2, "rationale": "Moderate discrimination since understanding FK policies clearly separates students, and the medium difficulty matches the slightly positive irtB.", "category": "Databases", "difficulty": 2}',
     NULL);

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('d88c6a08-0dd4-4d59-9ef1-a9bd1c3ffd6a', N'Given the query below, which index best minimizes page reads while satisfying the WHERE and ORDER BY clauses?', 2, N'Databases',
     N'["Composite index on (status, priority, created_at DESC)", "Separate single-column indexes on status and priority", "Index on created_at alone", "Composite index on (priority, status)"]', N'A', N'A composite index starting with the filtered columns and including created_at allows the engine to seek and order without extra sorting, whereas separate or wrong-ordered indexes require extra work or cannot support the ORDER BY efficiently.',
     SYSUTCDATETIME(), 1,
     1.200, 0.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'SELECT *
FROM orders
WHERE status = ''pending'' AND priority = 1
ORDER BY created_at DESC;', N'sql',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('4214e2f3-f313-42c6-b54e-130e75c5efcb', '88191759-1cb8-4d8d-8122-d835cae837c7', 21, N'Approved',
     N'Given the query below, which index best minimizes page reads while satisfying the WHERE and ORDER BY clauses?', N'SELECT *
FROM orders
WHERE status = ''pending'' AND priority = 1
ORDER BY created_at DESC;', N'sql',
     N'["Composite index on (status, priority, created_at DESC)", "Separate single-column indexes on status and priority", "Index on created_at alone", "Composite index on (priority, status)"]', N'A', N'A composite index starting with the filtered columns and including created_at allows the engine to seek and order without extra sorting, whereas separate or wrong-ordered indexes require extra work or cannot support the ORDER BY efficiently.',
     1.200, 0.100, N'Question discriminates well because only those grasping composite indexes see the clear benefit, and the moderate difficulty matches a near-zero irtB.', N'Databases', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the query below, which index best minimizes page reads while satisfying the WHERE and ORDER BY clauses?", "codeSnippet": "SELECT *\nFROM orders\nWHERE status = ''pending'' AND priority = 1\nORDER BY created_at DESC;", "codeLanguage": "sql", "options": ["Composite index on (status, priority, created_at DESC)", "Separate single-column indexes on status and priority", "Index on created_at alone", "Composite index on (priority, status)"], "correctAnswer": "A", "explanation": "A composite index starting with the filtered columns and including created_at allows the engine to seek and order without extra sorting, whereas separate or wrong-ordered indexes require extra work or cannot support the ORDER BY efficiently.", "irtA": 1.2, "irtB": 0.1, "rationale": "Question discriminates well because only those grasping composite indexes see the clear benefit, and the moderate difficulty matches a near-zero irtB.", "category": "Databases", "difficulty": 2}',
     'd88c6a08-0dd4-4d59-9ef1-a9bd1c3ffd6a');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('5a5c25f9-934b-4cb7-87df-7fb6858d81fc', N'A report joins Orders(order_id PK, customer_id FK, order_date, total) with Customers(customer_id PK, tier) filtering on tier=''gold'' and ordering by order_date DESC. Which single index addition most reduces rows read while supporting both the join and the ORDER BY?', 3, N'Databases',
     N'["Composite index on Orders(customer_id, order_date DESC)", "Composite index on Customers(tier, customer_id)", "Index on Orders(order_date DESC)", "Index on Customers(customer_id)"]', N'A', N'Ordering by order_date per joined customer uses the composite Orders index, avoiding extra sorting while also making the join seek efficient; option B still loads all gold customers first but leaves the expensive ORDER BY on Orders.',
     SYSUTCDATETIME(), 1,
     1.400, 1.300, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('7624428a-e5fa-4816-b757-510efd0620d0', '88191759-1cb8-4d8d-8122-d835cae837c7', 22, N'Approved',
     N'A report joins Orders(order_id PK, customer_id FK, order_date, total) with Customers(customer_id PK, tier) filtering on tier=''gold'' and ordering by order_date DESC. Which single index addition most reduces rows read while supporting both the join and the ORDER BY?', NULL, NULL,
     N'["Composite index on Orders(customer_id, order_date DESC)", "Composite index on Customers(tier, customer_id)", "Index on Orders(order_date DESC)", "Index on Customers(customer_id)"]', N'A', N'Ordering by order_date per joined customer uses the composite Orders index, avoiding extra sorting while also making the join seek efficient; option B still loads all gold customers first but leaves the expensive ORDER BY on Orders.',
     1.400, 1.300, N'Index selection requires synthesizing join and ordering needs, so I chose a moderately high discrimination and set a difficulty-aligned B value.', N'Databases', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "A report joins Orders(order_id PK, customer_id FK, order_date, total) with Customers(customer_id PK, tier) filtering on tier=''gold'' and ordering by order_date DESC. Which single index addition most reduces rows read while supporting both the join and the ORDER BY?", "codeSnippet": null, "codeLanguage": null, "options": ["Composite index on Orders(customer_id, order_date DESC)", "Composite index on Customers(tier, customer_id)", "Index on Orders(order_date DESC)", "Index on Customers(customer_id)"], "correctAnswer": "A", "explanation": "Ordering by order_date per joined customer uses the composite Orders index, avoiding extra sorting while also making the join seek efficient; option B still loads all gold customers first but leaves the expensive ORDER BY on Orders.", "irtA": 1.4, "irtB": 1.3, "rationale": "Index selection requires synthesizing join and ordering needs, so I chose a moderately high discrimination and set a difficulty-aligned B value.", "category": "Databases", "difficulty": 3}',
     '5a5c25f9-934b-4cb7-87df-7fb6858d81fc');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('584c4151-b0be-4974-8405-5ffbb4d521d7', N'Logs(log_id PK, service_id FK, log_level, created_at, message) is queried frequently with: SELECT service_id, log_level, COUNT(*) FROM Logs WHERE created_at BETWEEN ? AND ? GROUP BY service_id, log_level. Which index best lets the database avoid scanning unnecessary rows and recomputing the grouping keys?', 3, N'Databases',
     N'["Composite index on Logs(created_at, service_id, log_level)", "Index on Logs(created_at)", "Composite index on Logs(service_id, log_level)", "Composite index on Logs(log_level, created_at)"]', N'A', N'Starting from created_at range and then reading service_id/log_level from the same index gives both the filter and grouping keys without extra lookups; option D orders log_level first, so the range scan on created_at cannot prune rows effectively.',
     SYSUTCDATETIME(), 1,
     1.300, 1.000, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('d68334f4-6483-4f0d-b7bb-5613235dc7be', '88191759-1cb8-4d8d-8122-d835cae837c7', 23, N'Approved',
     N'Logs(log_id PK, service_id FK, log_level, created_at, message) is queried frequently with: SELECT service_id, log_level, COUNT(*) FROM Logs WHERE created_at BETWEEN ? AND ? GROUP BY service_id, log_level. Which index best lets the database avoid scanning unnecessary rows and recomputing the grouping keys?', NULL, NULL,
     N'["Composite index on Logs(created_at, service_id, log_level)", "Index on Logs(created_at)", "Composite index on Logs(service_id, log_level)", "Composite index on Logs(log_level, created_at)"]', N'A', N'Starting from created_at range and then reading service_id/log_level from the same index gives both the filter and grouping keys without extra lookups; option D orders log_level first, so the range scan on created_at cannot prune rows effectively.',
     1.300, 1.000, N'Grouping with a date range is subtle, so I rate its discrimination slightly above average and place the difficulty in the upper range for level 3.', N'Databases', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Logs(log_id PK, service_id FK, log_level, created_at, message) is queried frequently with: SELECT service_id, log_level, COUNT(*) FROM Logs WHERE created_at BETWEEN ? AND ? GROUP BY service_id, log_level. Which index best lets the database avoid scanning unnecessary rows and recomputing the grouping keys?", "codeSnippet": null, "codeLanguage": null, "options": ["Composite index on Logs(created_at, service_id, log_level)", "Index on Logs(created_at)", "Composite index on Logs(service_id, log_level)", "Composite index on Logs(log_level, created_at)"], "correctAnswer": "A", "explanation": "Starting from created_at range and then reading service_id/log_level from the same index gives both the filter and grouping keys without extra lookups; option D orders log_level first, so the range scan on created_at cannot prune rows effectively.", "irtA": 1.3, "irtB": 1.0, "rationale": "Grouping with a date range is subtle, so I rate its discrimination slightly above average and place the difficulty in the upper range for level 3.", "category": "Databases", "difficulty": 3}',
     '584c4151-b0be-4974-8405-5ffbb4d521d7');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('2e325dbd-ca54-4eca-beb0-10ff1167f6b1', N'Which practice most directly stops forged POST submissions from another site when a user is logged in?', 1, N'Security',
     N'["Include a unique anti-CSRF token in the form and verify it server-side.", "Require HTTPS for all authenticated requests.", "Force users to re-enter their password for every sensitive action.", "Rate-limit the login endpoint to three attempts per minute."]', N'A', N'Including a unique token per session ties each form to the genuine page, while HTTPS protects transport but not CSRF, making option B the most plausible distractor yet insufficient alone.',
     SYSUTCDATETIME(), 1,
     1.100, -1.200, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('22b7d1c1-ad25-41a1-9530-714911afd100', '88191759-1cb8-4d8d-8122-d835cae837c7', 24, N'Approved',
     N'Which practice most directly stops forged POST submissions from another site when a user is logged in?', NULL, NULL,
     N'["Include a unique anti-CSRF token in the form and verify it server-side.", "Require HTTPS for all authenticated requests.", "Force users to re-enter their password for every sensitive action.", "Rate-limit the login endpoint to three attempts per minute."]', N'A', N'Including a unique token per session ties each form to the genuine page, while HTTPS protects transport but not CSRF, making option B the most plausible distractor yet insufficient alone.',
     1.100, -1.200, N'This is a foundational CSRF mitigation, so the discrimination is typical and difficulty is low.', N'Security', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Which practice most directly stops forged POST submissions from another site when a user is logged in?", "codeSnippet": null, "codeLanguage": null, "options": ["Include a unique anti-CSRF token in the form and verify it server-side.", "Require HTTPS for all authenticated requests.", "Force users to re-enter their password for every sensitive action.", "Rate-limit the login endpoint to three attempts per minute."], "correctAnswer": "A", "explanation": "Including a unique token per session ties each form to the genuine page, while HTTPS protects transport but not CSRF, making option B the most plausible distractor yet insufficient alone.", "irtA": 1.1, "irtB": -1.2, "rationale": "This is a foundational CSRF mitigation, so the discrimination is typical and difficulty is low.", "category": "Security", "difficulty": 1}',
     '2e325dbd-ca54-4eca-beb0-10ff1167f6b1');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('435a303b-0c06-47a1-ba54-da893f588a47', N'When reflecting user comments inside HTML, what best prevents a stored XSS attack?', 1, N'Security',
     N'["Escape the comment text before inserting it into the HTML output.", "Reject any comment containing angle brackets.", "Encrypt the stored comment before saving it.", "Rate-limit submissions to five per minute."]', N'A', N'Escaping converts special characters so browsers render them as text, while rejecting brackets is brittle (option B) and misses many encodings, making A correct and B a plausible but incomplete distractor.',
     SYSUTCDATETIME(), 1,
     1.000, -0.800, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     NULL, NULL,
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('31963460-2b61-4f5f-a0ea-01e7f8de5672', '88191759-1cb8-4d8d-8122-d835cae837c7', 25, N'Approved',
     N'When reflecting user comments inside HTML, what best prevents a stored XSS attack?', NULL, NULL,
     N'["Escape the comment text before inserting it into the HTML output.", "Reject any comment containing angle brackets.", "Encrypt the stored comment before saving it.", "Rate-limit submissions to five per minute."]', N'A', N'Escaping converts special characters so browsers render them as text, while rejecting brackets is brittle (option B) and misses many encodings, making A correct and B a plausible but incomplete distractor.',
     1.000, -0.800, N'Simple output escaping is a high-signal defense so the discrimination and low difficulty reflect expected student understanding.', N'Security', 1,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "When reflecting user comments inside HTML, what best prevents a stored XSS attack?", "codeSnippet": null, "codeLanguage": null, "options": ["Escape the comment text before inserting it into the HTML output.", "Reject any comment containing angle brackets.", "Encrypt the stored comment before saving it.", "Rate-limit submissions to five per minute."], "correctAnswer": "A", "explanation": "Escaping converts special characters so browsers render them as text, while rejecting brackets is brittle (option B) and misses many encodings, making A correct and B a plausible but incomplete distractor.", "irtA": 1.0, "irtB": -0.8, "rationale": "Simple output escaping is a high-signal defense so the discrimination and low difficulty reflect expected student understanding.", "category": "Security", "difficulty": 1}',
     '435a303b-0c06-47a1-ba54-da893f588a47');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('362fe4bd-9872-4366-b973-19a70b58808f', N'Given this password store/verify pattern, what change best slows offline brute-force attacks?', 2, N'Security',
     N'["Add a per-account salt and use a slow password hash (e.g., bcrypt or PBKDF2).", "Switch to SHA-512 so the digest is longer before storing it.", "Encrypt the SHA-256 digest with a server-wide AES key before saving it.", "Hash the password twice with SHA-256 then store the second result."]', N'A', N'Slow, salted password hashes raise the cost of every guess; simply using SHA-512 (option B) keeps hashing fast, so attackers still brute-force quickly.',
     SYSUTCDATETIME(), 1,
     1.300, 0.000, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'import hashlib

def store_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, stored_hash):
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('203db570-e5e2-4981-a307-1c45fa658345', '88191759-1cb8-4d8d-8122-d835cae837c7', 26, N'Approved',
     N'Given this password store/verify pattern, what change best slows offline brute-force attacks?', N'import hashlib

def store_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, stored_hash):
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash', N'python',
     N'["Add a per-account salt and use a slow password hash (e.g., bcrypt or PBKDF2).", "Switch to SHA-512 so the digest is longer before storing it.", "Encrypt the SHA-256 digest with a server-wide AES key before saving it.", "Hash the password twice with SHA-256 then store the second result."]', N'A', N'Slow, salted password hashes raise the cost of every guess; simply using SHA-512 (option B) keeps hashing fast, so attackers still brute-force quickly.',
     1.300, 0.000, N'Moderate discrimination for password storage reasoning; medium difficulty aligns with irtB=0.', N'Security', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given this password store/verify pattern, what change best slows offline brute-force attacks?", "codeSnippet": "import hashlib\n\ndef store_password(password):\n    return hashlib.sha256(password.encode()).hexdigest()\n\ndef verify_password(password, stored_hash):\n    return hashlib.sha256(password.encode()).hexdigest() == stored_hash", "codeLanguage": "python", "options": ["Add a per-account salt and use a slow password hash (e.g., bcrypt or PBKDF2).", "Switch to SHA-512 so the digest is longer before storing it.", "Encrypt the SHA-256 digest with a server-wide AES key before saving it.", "Hash the password twice with SHA-256 then store the second result."], "correctAnswer": "A", "explanation": "Slow, salted password hashes raise the cost of every guess; simply using SHA-512 (option B) keeps hashing fast, so attackers still brute-force quickly.", "irtA": 1.3, "irtB": 0.0, "rationale": "Moderate discrimination for password storage reasoning; medium difficulty aligns with irtB=0.", "category": "Security", "difficulty": 2}',
     '362fe4bd-9872-4366-b973-19a70b58808f');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('b9b3ac45-2897-43fc-a4bb-8031ee08c093', N'Why is the generated reset token unsafe, and what best fixes it?', 2, N'Security',
     N'["Generate a cryptographically random token, store it server-side with the user, and expire it quickly.", "Encrypt the email and timestamp with AES and include the ciphertext as the token.", "Continue using email+timestamp but ensure the link is only served over HTTPS.", "Hash the email+timestamp and embed that digest without storing anything server-side."]', N'A', N'Random tokens prevent prediction; hashing the same predictable data (option D) still lets attackers guess valid tokens.',
     SYSUTCDATETIME(), 1,
     1.200, 0.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'from time import time

def reset_link(email):
    token = f"{email}-{int(time())}"
    return f"https://example.com/reset?token={token}"', N'python',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('5bc64d36-4402-452d-8aa4-1d2641ceb821', '88191759-1cb8-4d8d-8122-d835cae837c7', 27, N'Approved',
     N'Why is the generated reset token unsafe, and what best fixes it?', N'from time import time

def reset_link(email):
    token = f"{email}-{int(time())}"
    return f"https://example.com/reset?token={token}"', N'python',
     N'["Generate a cryptographically random token, store it server-side with the user, and expire it quickly.", "Encrypt the email and timestamp with AES and include the ciphertext as the token.", "Continue using email+timestamp but ensure the link is only served over HTTPS.", "Hash the email+timestamp and embed that digest without storing anything server-side."]', N'A', N'Random tokens prevent prediction; hashing the same predictable data (option D) still lets attackers guess valid tokens.',
     1.200, 0.100, N'Token predictability check discriminates moderately; difficulty 2 fits irtB near zero.', N'Security', 2,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Why is the generated reset token unsafe, and what best fixes it?", "codeSnippet": "from time import time\n\ndef reset_link(email):\n    token = f\"{email}-{int(time())}\"\n    return f\"https://example.com/reset?token={token}\"", "codeLanguage": "python", "options": ["Generate a cryptographically random token, store it server-side with the user, and expire it quickly.", "Encrypt the email and timestamp with AES and include the ciphertext as the token.", "Continue using email+timestamp but ensure the link is only served over HTTPS.", "Hash the email+timestamp and embed that digest without storing anything server-side."], "correctAnswer": "A", "explanation": "Random tokens prevent prediction; hashing the same predictable data (option D) still lets attackers guess valid tokens.", "irtA": 1.2, "irtB": 0.1, "rationale": "Token predictability check discriminates moderately; difficulty 2 fits irtB near zero.", "category": "Security", "difficulty": 2}',
     'b9b3ac45-2897-43fc-a4bb-8031ee08c093');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('511965c3-dd4b-4a2b-8a30-cb1f5b062c50', N'In the code below, why does the fixed IV undermine AES-GCM encryption even though the key stays secret?', 3, N'Security',
     N'["GCM requires a unique IV per encryption; reusing the zero IV leaks keystream correlations.", "A zero IV only makes ciphertext deterministic, but GCM still protects confidentiality.", "Static IVs are safe as long as each secret key is per user, since key uniqueness ensures new keystreams.", "Fixed IVs hurt integrity less than confidentiality because the tag still covers every message."]', N'A', N'AES-GCM needs a unique nonce every time; reusing a zero IV lets attackers xor ciphertexts to see plaintext relationships, whereas the distractor wrongly assumes confidentiality is preserved despite keystream reuse.',
     SYSUTCDATETIME(), 1,
     1.700, 1.400, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'const crypto = require(''crypto'');
function encrypt(secret, plaintext) {
  const cipher = crypto.createCipheriv(''aes-256-gcm'', secret, Buffer.alloc(12, 0));
  const ciphertext = Buffer.concat([cipher.update(plaintext, ''utf8''), cipher.final()]);
  return {
    ciphertext: ciphertext.toString(''hex''),
    authTag: cipher.getAuthTag().toString(''hex'')
  };
}', N'javascript',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('3aa75aaa-aff7-4b29-9a5b-80e34f33e9e4', '88191759-1cb8-4d8d-8122-d835cae837c7', 28, N'Approved',
     N'In the code below, why does the fixed IV undermine AES-GCM encryption even though the key stays secret?', N'const crypto = require(''crypto'');
function encrypt(secret, plaintext) {
  const cipher = crypto.createCipheriv(''aes-256-gcm'', secret, Buffer.alloc(12, 0));
  const ciphertext = Buffer.concat([cipher.update(plaintext, ''utf8''), cipher.final()]);
  return {
    ciphertext: ciphertext.toString(''hex''),
    authTag: cipher.getAuthTag().toString(''hex'')
  };
}', N'javascript',
     N'["GCM requires a unique IV per encryption; reusing the zero IV leaks keystream correlations.", "A zero IV only makes ciphertext deterministic, but GCM still protects confidentiality.", "Static IVs are safe as long as each secret key is per user, since key uniqueness ensures new keystreams.", "Fixed IVs hurt integrity less than confidentiality because the tag still covers every message."]', N'A', N'AES-GCM needs a unique nonce every time; reusing a zero IV lets attackers xor ciphertexts to see plaintext relationships, whereas the distractor wrongly assumes confidentiality is preserved despite keystream reuse.',
     1.700, 1.400, N'High discrimination because distinguishing fixed-nonce misuse from secure nonce handling is a sharp concept, and difficulty reflects hard understanding of authenticated encryption.', N'Security', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "In the code below, why does the fixed IV undermine AES-GCM encryption even though the key stays secret?", "codeSnippet": "const crypto = require(''crypto'');\nfunction encrypt(secret, plaintext) {\n  const cipher = crypto.createCipheriv(''aes-256-gcm'', secret, Buffer.alloc(12, 0));\n  const ciphertext = Buffer.concat([cipher.update(plaintext, ''utf8''), cipher.final()]);\n  return {\n    ciphertext: ciphertext.toString(''hex''),\n    authTag: cipher.getAuthTag().toString(''hex'')\n  };\n}", "codeLanguage": "javascript", "options": ["GCM requires a unique IV per encryption; reusing the zero IV leaks keystream correlations.", "A zero IV only makes ciphertext deterministic, but GCM still protects confidentiality.", "Static IVs are safe as long as each secret key is per user, since key uniqueness ensures new keystreams.", "Fixed IVs hurt integrity less than confidentiality because the tag still covers every message."], "correctAnswer": "A", "explanation": "AES-GCM needs a unique nonce every time; reusing a zero IV lets attackers xor ciphertexts to see plaintext relationships, whereas the distractor wrongly assumes confidentiality is preserved despite keystream reuse.", "irtA": 1.7, "irtB": 1.4, "rationale": "High discrimination because distinguishing fixed-nonce misuse from secure nonce handling is a sharp concept, and difficulty reflects hard understanding of authenticated encryption.", "category": "Security", "difficulty": 3}',
     '511965c3-dd4b-4a2b-8a30-cb1f5b062c50');

INSERT INTO Questions
    (Id, Content, Difficulty, Category, OptionsJson, CorrectAnswer, Explanation, CreatedAt, IsActive,
     IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion)
VALUES
    ('13aeb578-7eea-4605-b672-4f236332ae0a', N'Given the token issuance code below, what is the missing check that lets any user gain admin access?', 3, N'Security',
     N'["Validate role on the issuance endpoint instead of trusting the client-provided role field.", "Reject tokens unless the payload role matches the database record during admin actions.", "Include a nonce in the token so it cannot be reissued with a different role.", "Require OAuth scope approval before signing any token with admin privileges."]', N'A', N'The server currently signs whatever role the client submits, so it must enforce its own role assignment; checking the database later (B) is redundant if the token already misrepresents the role and would still accept the forged token.',
     SYSUTCDATETIME(), 1,
     1.500, 1.100, N'AI', N'AI',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(),
     N'const express = require(''express'');
const app = express();
app.use(express.json());

app.post(''/token'', (req, res) => {
  const token = jwt.sign({ user: req.body.user, role: req.body.role }, process.env.SECRET);
  res.send({ token });
});

function auth(req, res, next) {
  const payload = jwt.verify(req.headers.authorization, process.env.SECRET);
  req.userRole = payload.role;
  next();
}

app.post(''/admin-action'', auth, (req, res) => {
  if (req.userRole !== ''admin'') return res.status(403);
  res.send(''done'');
});', N'javascript',
     NULL, N'generate_questions_v1');

INSERT INTO QuestionDrafts
    (Id, BatchId, PositionInBatch, Status, QuestionText, CodeSnippet, CodeLanguage,
     OptionsJson, CorrectAnswer, Explanation, IRT_A, IRT_B, Rationale, Category, Difficulty,
     PromptVersion, GeneratedAt, GeneratedById, DecidedById, DecidedAt, RejectionReason,
     OriginalDraftJson, ApprovedQuestionId)
VALUES
    ('aca3e240-3995-444b-8dc4-5959733f1478', '88191759-1cb8-4d8d-8122-d835cae837c7', 29, N'Approved',
     N'Given the token issuance code below, what is the missing check that lets any user gain admin access?', N'const express = require(''express'');
const app = express();
app.use(express.json());

app.post(''/token'', (req, res) => {
  const token = jwt.sign({ user: req.body.user, role: req.body.role }, process.env.SECRET);
  res.send({ token });
});

function auth(req, res, next) {
  const payload = jwt.verify(req.headers.authorization, process.env.SECRET);
  req.userRole = payload.role;
  next();
}

app.post(''/admin-action'', auth, (req, res) => {
  if (req.userRole !== ''admin'') return res.status(403);
  res.send(''done'');
});', N'javascript',
     N'["Validate role on the issuance endpoint instead of trusting the client-provided role field.", "Reject tokens unless the payload role matches the database record during admin actions.", "Include a nonce in the token so it cannot be reissued with a different role.", "Require OAuth scope approval before signing any token with admin privileges."]', N'A', N'The server currently signs whatever role the client submits, so it must enforce its own role assignment; checking the database later (B) is redundant if the token already misrepresents the role and would still accept the forged token.',
     1.500, 1.100, N'Moderately high discrimination because the core mistake is trusting client input when signing credentials, with difficulty reflecting multi-step reasoning about token issuance vs validation.', N'Security', 3,
     N'generate_questions_v1', SYSUTCDATETIME(), '765E1668-44D3-4E11-AF1A-589A2274B311',
     '765E1668-44D3-4E11-AF1A-589A2274B311', SYSUTCDATETIME(), NULL,
     N'{"questionText": "Given the token issuance code below, what is the missing check that lets any user gain admin access?", "codeSnippet": "const express = require(''express'');\nconst app = express();\napp.use(express.json());\n\napp.post(''/token'', (req, res) => {\n  const token = jwt.sign({ user: req.body.user, role: req.body.role }, process.env.SECRET);\n  res.send({ token });\n});\n\nfunction auth(req, res, next) {\n  const payload = jwt.verify(req.headers.authorization, process.env.SECRET);\n  req.userRole = payload.role;\n  next();\n}\n\napp.post(''/admin-action'', auth, (req, res) => {\n  if (req.userRole !== ''admin'') return res.status(403);\n  res.send(''done'');\n});", "codeLanguage": "javascript", "options": ["Validate role on the issuance endpoint instead of trusting the client-provided role field.", "Reject tokens unless the payload role matches the database record during admin actions.", "Include a nonce in the token so it cannot be reissued with a different role.", "Require OAuth scope approval before signing any token with admin privileges."], "correctAnswer": "A", "explanation": "The server currently signs whatever role the client submits, so it must enforce its own role assignment; checking the database later (B) is redundant if the token already misrepresents the role and would still accept the forged token.", "irtA": 1.5, "irtB": 1.1, "rationale": "Moderately high discrimination because the core mistake is trusting client input when signing credentials, with difficulty reflecting multi-step reasoning about token issuance vs validation.", "category": "Security", "difficulty": 3}',
     '13aeb578-7eea-4605-b672-4f236332ae0a');

COMMIT TRANSACTION;

-- Verification:
SELECT COUNT(*) AS ApprovedCount FROM QuestionDrafts WHERE BatchId = '88191759-1cb8-4d8d-8122-d835cae837c7' AND Status = 'Approved';
SELECT COUNT(*) AS RejectedCount FROM QuestionDrafts WHERE BatchId = '88191759-1cb8-4d8d-8122-d835cae837c7' AND Status = 'Rejected';
SELECT COUNT(*) AS BankSize FROM Questions WHERE IsActive = 1;