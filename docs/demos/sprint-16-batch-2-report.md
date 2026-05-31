# Sprint 16 — Content Batch 2 Report

**BatchId:** `88191759-1cb8-4d8d-8122-d835cae837c7`  
**Generated at:** 2026-05-14T20:37:53Z  
**Reviewer:** Claude single-reviewer (ADR-056)  
**Wall clock:** 172.6s (~2.9 min)  
**Token cost:** 47,691 tokens (retries: 0)  

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

**Question:** When an array-backed dynamic list doubles its capacity each time it runs out of space, what is the amortized cost per append?

**Options:**
- **A.** O(1) amortized because few resizes happen for many appends  ← correct
- **B.** O(log n) because capacity grows geometrically
- **C.** O(n) because resizing copies all elements each time
- **D.** O(n log n) combining copies and growth

**IRT:** `a=1.00` / `b=-1.00` · *This simple amortized-analysis question sharply separates learners who understand geometric growth from those who only see the occasional copy.*

---

### A2: DataStructures / diff=1

**Question:** Which characteristic of a hash set makes membership checks average constant time?

**Options:**
- **A.** Direct indexing via a hash function that distributes values into buckets  ← correct
- **B.** Keeping elements sorted so binary search finds membership fast
- **C.** Linking each element to the next for sequential scans
- **D.** Resizing to a power of two so indexes shrink logarithmically

**IRT:** `a=1.00` / `b=-1.30` · *Recognizing how hashing creates constant-time lookups is a straightforward signal for early learners, so normal discrimination applies.*

---

### A3: DataStructures / diff=2

**Question:** In the TaskQueue class below, what is the worst-case time complexity of dequeue() relative to the number of queued tasks?

```python
from collections import deque

class TaskQueue:
    def __init__(self):
        self.items = []

    def enqueue(self, task):
        self.items.append(task)

    def dequeue(self):
        if not self.items:
            return None
        return self.items.pop(0)
```

**Options:**
- **A.** O(n)  ← correct
- **B.** O(1)
- **C.** O(log n)
- **D.** O(1) amortized

**IRT:** `a=1.10` / `b=0.10` · *The question tests understanding of Python list operations and discriminates well at a medium level, so use a slightly above-default irtA and near-zero irtB.*

---

### A4: DataStructures / diff=2

**Question:** Given this BFS implementation, what is the overall time complexity in terms of vertices V and edges E when the graph is stored as an adjacency list?

```python
from collections import deque

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
                queue.append(neighbor)
```

**Options:**
- **A.** O(V + E)  ← correct
- **B.** O(V^2)
- **C.** O(E log V)
- **D.** O(E + V^2)

**IRT:** `a=1.20` / `b=0.20` · *This BFS complexity question cleanly separates students who grasp adjacency lists from those who guess, so I chose a moderate irtA and slightly positive irtB for medium difficulty.*

---

### A5: DataStructures / diff=3

**Question:** The custom dynamic array below doubles its capacity whenever `size == capacity`. Why does repeated calls to `add` still run in amortized O(1) time even though resizing copies the array?

```java
class DynamicArray {
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
}
```

**Options:**
- **A.** A: Each element participates in at most one expensive copy per doubling, bounding total work to O(n)  ← correct
- **B.** B: Resizing happens only when size == capacity, so there are fewer than n copies overall
- **C.** C: The check `size == data.length` makes the resize branch predictable, so execution stays constant
- **D.** D: Doubling capacity ensures we never copy more than one element per add

**IRT:** `a=1.80` / `b=1.10` · *This question sharply distinguishes students who understand amortized analysis (high irtA) and is quite hard (irtB >1).*

---

### A6: DataStructures / diff=3

**Question:** Given the min-heap approach below to track the k largest values from a stream, what is the overall runtime to process n items when k ≪ n?

```java
import java.util.PriorityQueue;

List<Integer> topK(int[] stream, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int value : stream) {
        heap.offer(value);
        if (heap.size() > k) {
            heap.poll();
        }
    }
    return new ArrayList<>(heap);
}
```

**Options:**
- **A.** A: O(n log k), because every item triggers at most one insert/removal on a heap of size ≤ k  ← correct
- **B.** B: O(n log n), because each insertion happens in a heap that can grow to n before pruning
- **C.** C: O(k log n), since only the final k values dominate the heap operations
- **D.** D: O(n + k log n), because we pay a linear scan plus k expensive heap adjustments

**IRT:** `a=1.50` / `b=1.30` · *The discrimination is moderate-high since understanding runtime requires reasoning about the bounded heap size, and difficulty is substantial.*

---

### A7: Algorithms / diff=1

**Question:** What prerequisite must hold before applying binary search to find a target in an array?

**Options:**
- **A.** The array elements must be in a consistent sorted order.  ← correct
- **B.** The array length must be a power of two.
- **C.** Every value in the array must be unique.
- **D.** The target is guaranteed to exist in the array.

**IRT:** `a=1.00` / `b=-1.20` · *Simple conceptual check with clear discriminator, so a mid-range irtA of 1.0 and easy difficulty bias irtB near -1.2 works.*

---

### A8: Algorithms / diff=1

**Question:** Why does mergesort maintain O(n log n) worst-case time, even though it repeatedly splits the list?

**Options:**
- **A.** Each split reduces problem size, and merging two sorted halves costs O(n) each level.  ← correct
- **B.** Splitting requires scanning the whole list, so merging becomes negligible.
- **C.** Only the first split influences complexity; later merges operate on constants.
- **D.** The split step sorts the halves, so merging just concatenates them.

**IRT:** `a=1.10` / `b=-1.00` · *The question tests basic understanding of divide-and-conquer cost structure, so a standard irtA near 1.1 and easy irtB around -1.0 reflects expected discrimination.*

---

### A9: Algorithms / diff=2

**Question:** In the DFS-based cycle detector below, why does the algorithm run in O(V + E) time rather than revisiting nodes multiple times?

```python
def has_cycle(adj):
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
    return False
```

**Options:**
- **A.** The recursion stack ensures no node can be entered twice before it unwinds
- **B.** Skipping neighbors already in visited prevents re-examining edges after the first visit  ← correct
- **C.** Removing node from stack avoids exploring its neighbors again later
- **D.** Using adjacency lists hides the cost of repeated edge checks

**IRT:** `a=1.10` / `b=0.10` · *The question focuses on traversal cost, so moderate discrimination and near-average difficulty seems right.*

---

### A10: Algorithms / diff=2

**Question:** The schedule builder below picks tasks sorted by finish time. Which insight explains why it always finds the maximum number of non-overlapping tasks?

```python
tasks = [(1, 4), (2, 3), (3, 5), (5, 6)]
tasks.sort(key=lambda x: x[1])
selected = []
end = -float('inf')
for start, finish in tasks:
    if start >= end:
        selected.append((start, finish))
        end = finish
```

**Options:**
- **A.** Selecting the earliest-finishing task leaves the most room for future tasks  ← correct
- **B.** Sorting by start time guarantees that completing one task forces the cheapest follow-up
- **C.** Greedy choice backs out when a longer task overlaps with a shorter one
- **D.** Choosing tasks in input order ensures stable selection of eligible intervals

**IRT:** `a=1.30` / `b=0.20` · *Greedy interval scheduling cleanly distinguishes correct reasoning, so slightly stronger discrimination is appropriate.*

---

### A11: Algorithms / diff=3

**Question:** Consider the hybrid sorting function below. What is the tightest worst-case asymptotic time complexity of `hybrid_sort` for an input array of length n?

```python
def hybrid_sort(arr):
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
    return merged
```

**Options:**
- **A.** O(n log n)  ← correct
- **B.** O(n)
- **C.** O(n log log n)
- **D.** O(n^2)

**IRT:** `a=1.20` / `b=0.70` · *The question sharply distinguishes students who understand hybrid divide-and-conquer from those who overvalue the small-case optimization, so a moderate discrimination is warranted.*

---

### A12: Algorithms / diff=3

**Question:** The recursive `longest_path` function below memoizes results for each node. What must hold for the function to always terminate and return the correct longest simple path length?

```python
def longest_path(node, graph, memo):
    if node in memo:
        return memo[node]
    best = 0
    for neighbor in graph.get(node, []):
        best = max(best, 1 + longest_path(neighbor, graph, memo))
    memo[node] = best
    return best
```

**Options:**
- **A.** The directed graph contains no cycles.  ← correct
- **B.** Edge weights are all positive.
- **C.** All nodes are reachable from a single source.
- **D.** Graph edges are sorted by destination.

**IRT:** `a=1.60` / `b=1.30` · *The prompt requires recognizing the role of acyclicity in recursion over DAGs, which sharply discriminates between those who understand memoized DFS and those who don't.*

---

### A13: OOP / diff=1

**Question:** Which statement best captures a practical difference between an abstract class and an interface in languages that provide both?

**Options:**
- **A.** An abstract class can hold per-instance state and default implementations, while an interface cannot store instance fields  ← correct
- **B.** Interface methods always execute faster because implementations bypass vtable dispatch
- **C.** Abstract classes are forbidden from declaring constructors while interfaces can define them
- **D.** Implementing an interface forces every derived class to inherit its methods without explicitly providing them

**IRT:** `a=1.20` / `b=-1.00` · *The question cleanly distinguishes two related concepts, so a standard discrimination above 1.0 fits and the easy-level difficulty justifies a negative difficulty parameter.*

---

### A14: OOP / diff=2

**Question:** In the snippet below, why does Program.Main print "base" even though FileLogger defines its own Tag method?

```csharp
class Logger
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
}
```

**Options:**
- **A.** Report calls Logger.Tag, but FileLogger hides rather than overrides, so the base version runs  ← correct
- **B.** FileLogger.Tag cannot execute because it lacks the override keyword, so the runtime skips it
- **C.** Report is non-virtual and binds to the static Logger type, ignoring the derived implementation
- **D.** FileLogger.Tag is private to FileLogger, so Report cannot reach it

**IRT:** `a=1.30` / `b=0.10` · *Differentiating new versus override requires medium-level understanding, so moderate discrimination and neutral difficulty seem appropriate.*

---

### A15: OOP / diff=2

**Question:** Given this hierarchy, what ensures CustomReport cannot change the string printed by FinalReport when invoked as a ReportBase?

```csharp
class ReportBase
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
}
```

**Options:**
- **A.** The sealed override in DetailedReport stops subclasses from overriding FinalReport, so every call uses the detailed version  ← correct
- **B.** ReportBase already declared FinalReport as non-virtual, so nothing could override it in the first place
- **C.** CustomReport is sealed by default, so no further overrides are possible
- **D.** Program caches FinalReport's result, so changes in derived classes cannot affect the printed string

**IRT:** `a=1.00` / `b=0.20` · *Sealed overrides are a clear medium-level concept with predictable discrimination, so default irtA and slightly positive irtB reflect that.*

---

### A16: OOP / diff=3

**Question:** Why does the first Console.WriteLine output 0 even though the Derived constructor later prints 5?

```csharp
using System;

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
}
```

**Options:**
- **A.** Base constructor runs before Derived field initializers, so count is still 0 when GetCount runs there.  ← correct
- **B.** Polymorphic dispatch is paused during base construction, so the abstract call resolves to a base stub returning 0.
- **C.** count only receives 5 in the Derived constructor body, so it stays 0 during the base constructor call.
- **D.** Base has its own hidden count field defaulting to 0, and the override reads that storage instead of the derived one.

**IRT:** `a=1.80` / `b=1.10` · *High discrimination because the question hinges on the order of base constructor, derived initialization, and virtual calls, and the difficulty is above average.*

---

### A17: OOP / diff=3

**Question:** Why does b.Report() print "Base" while ((Derived)b).Describe() prints "Derived"?

```csharp
class Base
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
}
```

**Options:**
- **A.** Because Describe is hidden with new, the virtual dispatch invoked from Report still calls Base.Describe.  ← correct
- **B.** Report is hard-coded to invoke the base implementation regardless of overrides to keep behavior stable.
- **C.** new makes Describe static to Derived, so Base references can never see that implementation.
- **D.** Virtual calls require sealed overrides to be dispatched to Derived, so hiding stays on the Base version.

**IRT:** `a=1.60` / `b=0.90` · *Reasoning about method hiding vs overriding is subtle, so the question discriminates well among students who understand virtual dispatch.*

---

### A18: Databases / diff=1

**Question:** Which constraint on a child table column enforces that each value must already exist as a primary key in another table?

**Options:**
- **A.** PRIMARY KEY constraint on the child column
- **B.** UNIQUE constraint on the child column
- **C.** FOREIGN KEY constraint referencing the parent table  ← correct
- **D.** CHECK constraint that compares to the parent table

**IRT:** `a=0.80` / `b=-1.60` · *The question targets a basic concept that most beginners grasp, so a moderate discrimination and low difficulty rating felt appropriate.*

---

### A19: Databases / diff=1

**Question:** When summarizing sales per region using SUM, which clause must appear before the aggregate to ensure rows are grouped correctly?

**Options:**
- **A.** WHERE region = 'East'
- **B.** GROUP BY region  ← correct
- **C.** ORDER BY total_sales DESC
- **D.** HAVING SUM(sales) > 1000

**IRT:** `a=1.00` / `b=-1.20` · *Grouping before aggregation is a first-week idea, so a standard discrimination with low difficulty suits this item.*

---

### A20: Databases / diff=2

**Question:** To ensure no orders reference a deleted customer, which FOREIGN KEY policy enforces referential integrity by blocking the delete attempt?

**Options:**
- **A.** ON DELETE CASCADE
- **B.** ON DELETE SET NULL
- **C.** ON DELETE RESTRICT  ← correct
- **D.** ON DELETE NO ACTION

**IRT:** `a=1.30` / `b=0.20` · *Moderate discrimination since understanding FK policies clearly separates students, and the medium difficulty matches the slightly positive irtB.*

---

### A21: Databases / diff=2

**Question:** Given the query below, which index best minimizes page reads while satisfying the WHERE and ORDER BY clauses?

```sql
SELECT *
FROM orders
WHERE status = 'pending' AND priority = 1
ORDER BY created_at DESC;
```

**Options:**
- **A.** Composite index on (status, priority, created_at DESC)  ← correct
- **B.** Separate single-column indexes on status and priority
- **C.** Index on created_at alone
- **D.** Composite index on (priority, status)

**IRT:** `a=1.20` / `b=0.10` · *Question discriminates well because only those grasping composite indexes see the clear benefit, and the moderate difficulty matches a near-zero irtB.*

---

### A22: Databases / diff=3

**Question:** A report joins Orders(order_id PK, customer_id FK, order_date, total) with Customers(customer_id PK, tier) filtering on tier='gold' and ordering by order_date DESC. Which single index addition most reduces rows read while supporting both the join and the ORDER BY?

**Options:**
- **A.** Composite index on Orders(customer_id, order_date DESC)  ← correct
- **B.** Composite index on Customers(tier, customer_id)
- **C.** Index on Orders(order_date DESC)
- **D.** Index on Customers(customer_id)

**IRT:** `a=1.40` / `b=1.30` · *Index selection requires synthesizing join and ordering needs, so I chose a moderately high discrimination and set a difficulty-aligned B value.*

---

### A23: Databases / diff=3

**Question:** Logs(log_id PK, service_id FK, log_level, created_at, message) is queried frequently with: SELECT service_id, log_level, COUNT(*) FROM Logs WHERE created_at BETWEEN ? AND ? GROUP BY service_id, log_level. Which index best lets the database avoid scanning unnecessary rows and recomputing the grouping keys?

**Options:**
- **A.** Composite index on Logs(created_at, service_id, log_level)  ← correct
- **B.** Index on Logs(created_at)
- **C.** Composite index on Logs(service_id, log_level)
- **D.** Composite index on Logs(log_level, created_at)

**IRT:** `a=1.30` / `b=1.00` · *Grouping with a date range is subtle, so I rate its discrimination slightly above average and place the difficulty in the upper range for level 3.*

---

### A24: Security / diff=1

**Question:** Which practice most directly stops forged POST submissions from another site when a user is logged in?

**Options:**
- **A.** Include a unique anti-CSRF token in the form and verify it server-side.  ← correct
- **B.** Require HTTPS for all authenticated requests.
- **C.** Force users to re-enter their password for every sensitive action.
- **D.** Rate-limit the login endpoint to three attempts per minute.

**IRT:** `a=1.10` / `b=-1.20` · *This is a foundational CSRF mitigation, so the discrimination is typical and difficulty is low.*

---

### A25: Security / diff=1

**Question:** When reflecting user comments inside HTML, what best prevents a stored XSS attack?

**Options:**
- **A.** Escape the comment text before inserting it into the HTML output.  ← correct
- **B.** Reject any comment containing angle brackets.
- **C.** Encrypt the stored comment before saving it.
- **D.** Rate-limit submissions to five per minute.

**IRT:** `a=1.00` / `b=-0.80` · *Simple output escaping is a high-signal defense so the discrimination and low difficulty reflect expected student understanding.*

---

### A26: Security / diff=2

**Question:** Given this password store/verify pattern, what change best slows offline brute-force attacks?

```python
import hashlib

def store_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, stored_hash):
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash
```

**Options:**
- **A.** Add a per-account salt and use a slow password hash (e.g., bcrypt or PBKDF2).  ← correct
- **B.** Switch to SHA-512 so the digest is longer before storing it.
- **C.** Encrypt the SHA-256 digest with a server-wide AES key before saving it.
- **D.** Hash the password twice with SHA-256 then store the second result.

**IRT:** `a=1.30` / `b=0.00` · *Moderate discrimination for password storage reasoning; medium difficulty aligns with irtB=0.*

---

### A27: Security / diff=2

**Question:** Why is the generated reset token unsafe, and what best fixes it?

```python
from time import time

def reset_link(email):
    token = f"{email}-{int(time())}"
    return f"https://example.com/reset?token={token}"
```

**Options:**
- **A.** Generate a cryptographically random token, store it server-side with the user, and expire it quickly.  ← correct
- **B.** Encrypt the email and timestamp with AES and include the ciphertext as the token.
- **C.** Continue using email+timestamp but ensure the link is only served over HTTPS.
- **D.** Hash the email+timestamp and embed that digest without storing anything server-side.

**IRT:** `a=1.20` / `b=0.10` · *Token predictability check discriminates moderately; difficulty 2 fits irtB near zero.*

---

### A28: Security / diff=3

**Question:** In the code below, why does the fixed IV undermine AES-GCM encryption even though the key stays secret?

```javascript
const crypto = require('crypto');
function encrypt(secret, plaintext) {
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, Buffer.alloc(12, 0));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}
```

**Options:**
- **A.** GCM requires a unique IV per encryption; reusing the zero IV leaks keystream correlations.  ← correct
- **B.** A zero IV only makes ciphertext deterministic, but GCM still protects confidentiality.
- **C.** Static IVs are safe as long as each secret key is per user, since key uniqueness ensures new keystreams.
- **D.** Fixed IVs hurt integrity less than confidentiality because the tag still covers every message.

**IRT:** `a=1.70` / `b=1.40` · *High discrimination because distinguishing fixed-nonce misuse from secure nonce handling is a sharp concept, and difficulty reflects hard understanding of authenticated encryption.*

---

### A29: Security / diff=3

**Question:** Given the token issuance code below, what is the missing check that lets any user gain admin access?

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/token', (req, res) => {
  const token = jwt.sign({ user: req.body.user, role: req.body.role }, process.env.SECRET);
  res.send({ token });
});

function auth(req, res, next) {
  const payload = jwt.verify(req.headers.authorization, process.env.SECRET);
  req.userRole = payload.role;
  next();
}

app.post('/admin-action', auth, (req, res) => {
  if (req.userRole !== 'admin') return res.status(403);
  res.send('done');
});
```

**Options:**
- **A.** Validate role on the issuance endpoint instead of trusting the client-provided role field.  ← correct
- **B.** Reject tokens unless the payload role matches the database record during admin actions.
- **C.** Include a nonce in the token so it cannot be reissued with a different role.
- **D.** Require OAuth scope approval before signing any token with admin privileges.

**IRT:** `a=1.50` / `b=1.10` · *Moderately high discrimination because the core mistake is trusting client input when signing credentials, with difficulty reflecting multi-step reasoning about token issuance vs validation.*

---

## Rejected drafts

### R1: OOP / diff=1

**Question:** Given the classes below, what does `Base b = new Derived(); b.Describe();` print?

**Reject reasons:**
- Option-length disparity (4 vs 57) > 5x — parallelism off.

---

## How to apply

1. Confirm the AI service container is healthy and the EF migration `AddQuestionDrafts` has been applied to the live DB.
2. Run `sqlcmd -S localhost -d CodeMentor -E -i tools\seed-sprint16-batch-2.sql`.
3. Verify with the SELECTs at the bottom of the SQL script: expect `ApprovedCount = 29`, `RejectedCount = 1`.

Generated by `ai-service/tools/run_content_batch.py`.