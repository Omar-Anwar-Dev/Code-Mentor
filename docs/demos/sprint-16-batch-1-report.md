# Sprint 16 — Content Batch 1 Report

**BatchId:** `41efc942-8c42-4509-88ba-4a651a7fbe35`  
**Generated at:** 2026-05-14T20:34:16Z  
**Reviewer:** Claude single-reviewer (ADR-056)  
**Wall clock:** 120.3s (~2.0 min)  
**Token cost:** 33,979 tokens (retries: 0)  

## Summary

- **Total drafts generated:** 30
- **Approved:** 29 (96.7%)
- **Rejected:** 1 (3.3%)
- **30%% reject-rate bar:** ✅ within bar.

## Distribution (by category × difficulty)

| Category | Diff 1 (easy) | Diff 2 (medium) | Diff 3 (hard) | Cat total |
|---|---|---|---|---|
| DataStructures | 2 | 2 | 2 | 6 |
| Algorithms | 2 | 2 | 2 | 6 |
| OOP | 2 | 2 | 2 | 6 |
| Databases | 2 | 2 | 2 | 6 |
| Security | 2 | 2 | 2 | 6 |

## Approved drafts

### A1: DataStructures / diff=1

**Question:** Why does an array provide O(1) access to any index while a linked list does not?

**Options:**
- **A.** Elements occupy a contiguous block so an index maps directly to an offset  ← correct
- **B.** Each element stores its full index so lookups skip traversal
- **C.** Memory allocator caches recent accesses to avoid traversal
- **D.** Pointers link neighbors, forcing sequential scanning before access

**IRT:** `a=1.20` / `b=-1.50` · *Moderate discrimination because the concept contrasts two common structures; difficulty is low so irtB is strongly negative.*

---

### A2: DataStructures / diff=1

**Question:** A scheduler needs to process tasks in the exact order they arrive and never revisit earlier tasks. Which data structure best fits this requirement?

**Options:**
- **A.** Queue, because it enforces first-in, first-out processing  ← correct
- **B.** Stack, because it buffers tasks before processing in reverse order
- **C.** Hash map, because it lets you look up tasks by arrival order
- **D.** Linked list, because it allows constant-time access to the newest task

**IRT:** `a=1.10` / `b=-1.20` · *Relatively clear discrimination for a basic concept with low difficulty, so moderate irtA and strongly negative irtB.*

---

### A3: DataStructures / diff=2

**Question:** Given the Python list operations shown, what is the height of the binary heap that results from `heap = list(range(10))` after calling `heapq.heapify(heap)`?

```python
import heapq
heap = list(range(10))
heapq.heapify(heap)
print(heap)
```

**Options:**
- **A.** The heap height is 3 because floor(log2(10)) = 3
- **B.** The heap height is 4 because there are 10 nodes requiring 4 levels  ← correct
- **C.** The heap height is 5 because each range item adds a level
- **D.** The heap height is 2 because heapq maintains a perfect tree of depth log n

**IRT:** `a=1.20` / `b=0.10` · *Medium discriminating question about heap layout with moderate difficulty calibration.*

---

### A4: DataStructures / diff=2

**Question:** After running the insertion sequence below into an initially empty singly linked list that only tracks `head`, how many nodes will `slow` have traversed when `fast` reaches the end?

```python
class Node:
    def __init__(self, v):
        self.val = v
        self.next = None

head = Node(1)
cur = head
for i in range(2, 8):
    cur.next = Node(i)
    cur = cur.next
slow = head
fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
print(slow.val)
```

**Options:**
- **A.** `slow` visits 3 nodes before `fast` stops because list length 7 gives 3 steps  ← correct
- **B.** `slow` visits 4 nodes before `fast` stops because floor(7/2) = 3 and we count the start
- **C.** `slow` visits 2 nodes before `fast` stops because fast moves twice as fast
- **D.** `slow` visits 5 nodes before `fast` stops because it reaches the floor of n/2

**IRT:** `a=1.10` / `b=0.20` · *Moderate discrimination verifying understanding of two-pointer traversal using list length.*

---

### A5: DataStructures / diff=3

**Question:** Given this Trie implementation, why does startsWith run in time proportional to the prefix length instead of the number of stored words?

```java
class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean end;
}

class Trie {
    private TrieNode root = new TrieNode();

    boolean startsWith(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            node = node.children.get(ch);
            if (node == null) return false;
        }
        return true;
    }
}
```

**Options:**
- **A.** A) Each character requires only one child lookup, so nodes visited equal prefix length.  ← correct
- **B.** B) The HashMap load factor stays bounded, keeping child lookups constant even as total words grow.
- **C.** C) The loop touches every stored word to verify it wasn’t skipped, so runtime depends on word count.
- **D.** D) computeIfAbsent would add nodes for each prefix, so runtime grows with number of words that share it.

**IRT:** `a=1.10` / `b=1.20` · *Moderately high discrimination because understanding why runtime decouples from stored words requires grasping Trie traversal.*

---

### A6: Algorithms / diff=1

**Question:** When you have unsorted data and need to guarantee a correct search result, which strategy always runs in O(n) worst-case time?

**Options:**
- **A.** Binary search over the complete list
- **B.** Linear scan comparing each element  ← correct
- **C.** Compute a hash and lookup without building a hash table
- **D.** Divide the list in half recursively without sorting first

**IRT:** `a=1.10` / `b=-1.50` · *Easy concept with clear contrasting choices, so moderate discrimination and low difficulty fit.*

---

### A7: Algorithms / diff=1

**Question:** What property of a simple recursive function ensures it eventually stops calling itself?

**Options:**
- **A.** Each call reduces the problem size and eventually hits a base case  ← correct
- **B.** The function uses a global variable to count calls
- **C.** It always reuses the same stack frame to avoid growth
- **D.** It relies on a loop inside the recursion to limit depth

**IRT:** `a=1.00` / `b=-1.00` · *Basic recursion knowledge with a clearly correct principle, so standard discrimination and low difficulty.*

---

### A8: Algorithms / diff=2

**Question:** What best describes the strategy implemented by `count_subset_sum`?

```python
def count_subset_sum(nums, target):
    memo = {}
    def helper(i, total):
        if total == target:
            return 1
        if i == len(nums):
            return 0
        if (i, total) in memo:
            return memo[(i, total)]
        include = helper(i + 1, total + nums[i])
        exclude = helper(i + 1, total)
        memo[(i, total)] = include + exclude
        return memo[(i, total)]
    return helper(0, 0)
```

**Options:**
- **A.** Top-down recursion with memoization to avoid recomputing subproblems.  ← correct
- **B.** Pure divide-and-conquer that splits the list and merges the results.
- **C.** Greedy scan that accumulates the target while skipping subranges.
- **D.** Unoptimized brute force that explores every subset without caching.

**IRT:** `a=1.20` / `b=0.00` · *Identifying memoized recursion requires moderate discrimination but stays in the medium difficulty band.*

---

### A9: Algorithms / diff=2

**Question:** Why is BFS the appropriate traversal for `min_steps` when searching for the destination?

```python
from collections import deque

def min_steps(grid):
    rows, cols = len(grid), len(grid[0])
    visited = [[False] * cols for _ in grid]
    q = deque([(0, 0, 0)])
    visited[0][0] = True
    while q:
        r, c, steps = q.popleft()
        if r == rows - 1 and c == cols - 1:
            return steps
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc] and grid[nr][nc] == 0:
                visited[nr][nc] = True
                q.append((nr, nc, steps + 1))
    return -1
```

**Options:**
- **A.** It visits nodes in increasing distance order, so the first time target reached uses fewest steps.  ← correct
- **B.** It always explores deeper paths before shallower ones, ensuring consistent depth-first coverage.
- **C.** It prioritizes neighbors with fewer blocked cells, approximating a heuristic.
- **D.** It builds a recursion stack recording visited cells for backtracking after failure.

**IRT:** `a=1.30` / `b=0.20` · *Understanding BFS’s layer-by-layer guarantee requires moderate discrimination in this context.*

---

### A10: Algorithms / diff=3

**Question:** The recursive function below computes the longest palindromic subsequence by memoizing calls over index pairs. What is its worst-case time complexity in terms of n = len(seq)?

```python
def longest(seq, i, j, memo):
    if i > j:
        return 0
    if i == j:
        return 1
    if (i, j) in memo:
        return memo[(i, j)]
    if seq[i] == seq[j]:
        memo[(i, j)] = 2 + longest(seq, i + 1, j - 1, memo)
    else:
        memo[(i, j)] = max(longest(seq, i + 1, j, memo), longest(seq, i, j - 1, memo))
    return memo[(i, j)]
```

**Options:**
- **A.** A. O(n) because matched characters terminate recursion quickly
- **B.** B. O(n^2) since memo stores each of the O(n^2) (i,j) pairs once  ← correct
- **C.** C. O(2^n) because mismatched branches still explore both sides
- **D.** D. O(n^3) since each max call scans a substring range

**IRT:** `a=1.70` / `b=1.30` · *Quadratic-state memoization sharply distinguishes students who understand DP from those relying on raw recursion, so high discrimination and hard difficulty.*

---

### A11: Algorithms / diff=3

**Question:** The Dijkstra implementation below uses a min-heap and ignores popped entries when the distance is stale. Which property of the input graph is required for the returned distances to always be correct?

```python
import heapq

def dijkstra(graph, start):
    dist = {start: 0}
    heap = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
```

**Options:**
- **A.** A. The graph must be acyclic to avoid revisiting nodes
- **B.** B. All edge weights must be non-negative so final distances settle upon first pop  ← correct
- **C.** C. Every node must be reachable from the start for the heap pruning to work
- **D.** D. The graph must be complete so the heap explores every frontier once

**IRT:** `a=1.50` / `b=1.00` · *Recognizing the non-negative-weight invariant requires understanding the heap invariant rather than syntax, so strong discrimination and a hard difficulty rating make sense.*

---

### A12: OOP / diff=1

**Question:** Which statement best describes encapsulation in OOP?

**Options:**
- **A.** Bundling data and methods in a class while hiding implementation details  ← correct
- **B.** Returning subclasses from methods to enable polymorphic calls
- **C.** Using global variables so many objects share the same state
- **D.** Copying code between classes to avoid inheritance

**IRT:** `a=1.10` / `b=-1.20` · *Encapsulation separates interface from implementation and is easy for novices to check.*

---

### A13: OOP / diff=1

**Question:** Given a class with a protected field, what allows derived classes to access that field?

**Options:**
- **A.** The derived class inherits the field and can read or modify it due to its protection level  ← correct
- **B.** Only the base class constructor can access protected fields, so derived classes must use getters
- **C.** A protected field is private to the base class; derived classes cannot see it at all
- **D.** Derived classes must declare a friend relationship before using a protected field

**IRT:** `a=1.00` / `b=-1.50` · *Understanding visibility levels is straightforward, so the question discriminates modestly with low difficulty.*

---

### A14: OOP / diff=2

**Question:** Given the classes below, why does each call to Speak() in the loop print the overridden string for the derived type rather than "Animal"?

```csharp
class Animal {
    public virtual string Speak() => "Animal";
}

class Cat : Animal {
    public override string Speak() => "Meow";
}

class Dog : Animal {
    public override string Speak() => "Woof";
}

var zoo = new Animal[] { new Cat(), new Dog() };
foreach (var animal in zoo) {
    Console.WriteLine(animal.Speak());
}
```

**Options:**
- **A.** Because Speak() is virtual, so the runtime dispatches to the actual object’s override  ← correct
- **B.** Because the compiler sees Animal[] and optimizes to Animal.Speak() for every element
- **C.** Because each derived class inherits the same method body and the loop logs the stored string
- **D.** Because Cat and Dog each register their Speak() method behind the Animal base pointer

**IRT:** `a=1.30` / `b=0.00` · *Medium-level polymorphism understanding justifies a solid discriminator with balanced difficulty.*

---

### A15: OOP / diff=2

**Question:** Given this snippet, why does Console.WriteLine(log.Emit()) print "log" instead of "file log"?

```csharp
class Logger {
    public string Emit() => "log";
}

class FileLogger : Logger {
    public new string Emit() => "file log";
}

Logger log = new FileLogger();
Console.WriteLine(log.Emit());
```

**Options:**
- **A.** Because Emit() is not virtual, so calling it on a Logger reference ignores the derived new method  ← correct
- **B.** Because new hides the base method only when the reference is FileLogger
- **C.** Because Logger.Emit() is sealed by default and cannot be overridden
- **D.** Because FileLogger.Emit() never executes unless the compiler inlines it

**IRT:** `a=1.20` / `b=0.30` · *Understanding method hiding vs overriding is a moderate discriminator requiring familiarity with member dispatch rules.*

---

### A16: OOP / diff=3

**Question:** Given the template-method structure in the snippet, what exact text does `Program.Main` print when `w.Render()` executes?

```csharp
using System;
abstract class Widget
{
    public void Render()
    {
        Console.Write("pre ");
        Draw();
    }

    protected abstract void Draw();
}

class Button : Widget
{
    protected override void Draw() => Console.Write("button");
}

class IconButton : Button
{
    protected override void Draw()
    {
        base.Draw();
        Console.Write(" icon");
    }
}

class Program
{
    public static void Main()
    {
        Widget w = new IconButton();
        w.Render();
    }
}
```

**Options:**
- **A.** pre button icon  ← correct
- **B.** pre icon button
- **C.** button icon pre
- **D.** icon button pre

**IRT:** `a=1.50` / `b=1.20` · *High discrimination because answer hinges on understanding virtual dispatch order, and difficulty is high so irtB near 1.2.*

---

### A17: OOP / diff=3

**Question:** In this example of interface implementation and overriding, what does the program print when both method calls run?

```csharp
using System;
interface IPrinter
{
    void Print();
}

class BasePrinter : IPrinter
{
    public virtual void Print() => Console.Write("Base");
}

class DualPrinter : BasePrinter, IPrinter
{
    void IPrinter.Print() => Console.Write("Dual");
    public override void Print() => Console.Write("Override");
}

class Program
{
    public static void Main()
    {
        BasePrinter p = new DualPrinter();
        p.Print();
        ((IPrinter)p).Print();
    }
}
```

**Options:**
- **A.** OverrideDual  ← correct
- **B.** DualOverride
- **C.** BaseDual
- **D.** OverrideOverride

**IRT:** `a=1.60` / `b=1.40` · *Subtle multiple dispatch paths justify a high discrimination value, and difficulty places irtB in the upper range.*

---

### A18: Databases / diff=1

**Question:** A student needs to list all rows from two tables where a matching customer ID exists in both. Which SQL clause ensures only matching rows appear?

**Options:**
- **A.** A JOIN
- **B.** WHERE EXISTS
- **C.** INNER JOIN  ← correct
- **D.** UNION

**IRT:** `a=1.00` / `b=-1.00` · *Simple concept of matching data across tables is easy so discrimination is standard and difficulty low.*

---

### A19: Databases / diff=1

**Question:** Which column constraint ensures every row has a unique, non-null value that can identify the row?

**Options:**
- **A.** CHECK
- **B.** PRIMARY KEY  ← correct
- **C.** FOREIGN KEY
- **D.** DEFAULT

**IRT:** `a=0.80` / `b=-1.10` · *Basic understanding of primary keys is tested, so discrimination is moderate and difficulty low.*

---

### A20: Databases / diff=2

**Question:** An Orders table stores order_id (PK), customer_id (FK), customer_name, and customer_address. To satisfy third normal form (3NF) which change is most appropriate?

**Options:**
- **A.** Move customer_name and customer_address into a Customer table keyed by customer_id and keep only the FK in Orders  ← correct
- **B.** Make (order_id, customer_id) the composite primary key so customer info depends on the full key
- **C.** Add a non-null constraint on customer_id so Orders rows can never lose the customer context
- **D.** Keep customer_name but move customer_address into a separate Address table referenced by Orders

**IRT:** `a=1.10` / `b=0.10` · *Moderate discrimination due to needing understanding of transitive dependencies, calibrated to medium difficulty.*

---

### A21: Databases / diff=2

**Question:** Given a query that filters by department name and joins employees on dept_id, which single index addition best speeds up both the filter and the join?

**Options:**
- **A.** Non-clustered index on departments(name, id)  ← correct
- **B.** Non-clustered index on employees(name, dept_id)
- **C.** Unique index on departments(id)
- **D.** Composite index on employees(last_name, first_name)

**IRT:** `a=1.20` / `b=0.20` · *Discrimination is moderate because learners must reason about how a single index can serve both predicates and joins.*

---

### A22: Databases / diff=3

**Question:** A single table stores orders, customer_id, customer_address, and customer_credit_limit. To ensure 3NF without losing the ability to report each order with its customer data, which change best removes the partial dependency?

**Options:**
- **A.** Move customer_address and customer_credit_limit into a Customers table keyed by customer_id  ← correct
- **B.** Leave everything in one table but add a UNIQUE constraint on customer_id
- **C.** Create an OrdersOrders table that duplicates customer_address for each order
- **D.** Store customer_credit_limit in Orders and customer_address in Customers

**IRT:** `a=1.30` / `b=0.90` · *Moderate discrimination because spotting normalization requirements separates more advanced students; higher difficulty due to multi-step reasoning about dependencies.*

---

### A23: Databases / diff=3

**Question:** Under REPEATABLE READ isolation a transaction T1 reads rows matching status='pending'. Concurrent T2 inserts a new row with status='pending'. Which guarantee still holds for T1?

**Options:**
- **A.** T1 will never see the new row even if it reruns the same query  ← correct
- **B.** T1 can see the new row once it commits because INSERTs aren’t locked
- **C.** T1 might see the row only if it explicitly locks the table
- **D.** T1 sees the new row only if it uses dirty reads

**IRT:** `a=1.40` / `b=1.50` · *High discrimination because understanding phantom prevention distinguishes advanced grasp; difficulty set high since requires knowledge of isolation guarantees.*

---

### A24: Security / diff=1

**Question:** Why is adding a salt to password hashing critical before storing credentials?

**Options:**
- **A.** It ensures identical passwords produce different hashes to slow dictionary attacks.  ← correct
- **B.** It decrypts stored passwords when users request password recovery.
- **C.** It lets the server reuse previously computed hashes for faster logins.
- **D.** It replaces hashing with encryption so passwords can be reversed.

**IRT:** `a=1.10` / `b=-1.20` · *Easy recognition of salted hash purpose justifies moderate discrimination and easier difficulty.*

---

### A25: Security / diff=1

**Question:** Which best distinguishes authentication from authorization?

**Options:**
- **A.** Authentication proves identity, while authorization checks if that identity can access a resource.  ← correct
- **B.** Authentication checks resource access, while authorization verifies multifactor tokens.
- **C.** Authentication stores access logs, while authorization hashes user passwords.
- **D.** Authentication encrypts user requests, while authorization decrypts responses.

**IRT:** `a=1.00` / `b=-1.00` · *Conceptual clarity on these definitions is easy for novices, giving moderate discrimination at easy difficulty.*

---

### A26: Security / diff=2

**Question:** Given the function below, what change best prevents SQL injection while preserving the logic that fetches a user by username?

```python
def get_user(db, username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query).fetchall()
```

**Options:**
- **A.** Use parameterized placeholders and pass username separately to execute  ← correct
- **B.** Escape single quotes in username before building the f-string
- **C.** Hash username before interpolating it into the query
- **D.** Limit username length to a few characters before embedding it

**IRT:** `a=1.20` / `b=0.00` · *Medium-security question; parameterization sharply differentiates understanding from partial knowledge.*

---

### A27: Security / diff=2

**Question:** Why is the JWT handling shown below insecure for controlling admin access?

```python
import jwt

def is_admin(token, secret):
    payload = jwt.decode(token, options={"verify_signature": False})
    return payload.get("role") == "admin"
```

**Options:**
- **A.** It accepts tokens without verifying their signature, so anyone can claim admin  ← correct
- **B.** It ignores the expiration claim, so tokens stay valid forever
- **C.** It relies on token length rather than its contents for authorization
- **D.** It fails to check the user's password after decoding the token

**IRT:** `a=1.10` / `b=0.20` · *Spotting missing signature verification is a key medium-level security insight, with a clear discriminator.*

---

### A28: Security / diff=3

**Question:** In the snippet, the server decodes the JWT payload and lets anyone with role 'admin' proceed without checking the signature. Which statement best captures the resulting vulnerability?

```javascript
const token = req.headers.authorization?.split(' ')[1];
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
if (payload.role === 'admin') return next();
return res.status(403).end();
```

**Options:**
- **A.** Verify the JWT signature with the server secret before trusting any payload claims.  ← correct
- **B.** Base64-encode the payload again before sending it to the client.
- **C.** Require HTTPS so that eavesdroppers cannot steal the JWT.
- **D.** Validate the 'role' field against a schema before acting on it.

**IRT:** `a=1.50` / `b=1.20` · *High discrimination because distinguishing forged tokens requires precise reasoning; difficulty is high so I placed irtB near the upper range.*

---

### A29: Security / diff=3

**Question:** This endpoint strips angle brackets before reflecting input into HTML. Why does it still allow stored XSS?

```javascript
const name = req.body.name;
const sanitized = name.replace(/[<>]/g, '');
const comment = `<p>${sanitized}</p>`;
db.save({ comment });
res.send(comment);
```

**Options:**
- **A.** Context-specific encoding or a safe template is needed because replacing < and > leaves script attributes intact.  ← correct
- **B.** Replacing angle brackets only protects against SQL injection not XSS.
- **C.** Trusting user input inside a paragraph tag is safe once brackets are removed.
- **D.** Setting a Content-Security-Policy header would block any payload the user can store.

**IRT:** `a=1.40` / `b=1.00` · *The question sharply distinguishes learners who understand XSS contexts, so I set irtA above average while keeping irtB high for difficulty 3.*

---

## Rejected drafts

### R1: DataStructures / diff=3

**Question:** The method below removes even-valued entries while iterating an ArrayList. If the list originally contains n values, what is the asymptotic runtime?

**Reject reasons:**
- Option-length disparity (7 vs 44) > 5x — parallelism off.

---

## How to apply

1. Confirm the AI service container is healthy and the EF migration `AddQuestionDrafts` has been applied to the live DB.
2. Run `sqlcmd -S localhost -d CodeMentor -E -i tools\seed-sprint16-batch-1.sql`.
3. Verify with the SELECTs at the bottom of the SQL script: expect `ApprovedCount = 29`, `RejectedCount = 1`.

Generated by `ai-service/tools/run_content_batch.py`.