# Sprint 17 — Content Batch 3 Report

**BatchId:** `ae5a2dbb-8652-440d-a803-0d8c8ed6cbb8`  
**Generated at:** 2026-05-14T23:02:08Z  
**Reviewer:** Claude single-reviewer (ADR-056 + ADR-057)  
**Wall clock:** 197.9s (~3.3 min)  
**Token cost:** 41,984 tokens (retries: 0)  

## Summary

- **Total drafts generated:** 15
- **Approved:** 15 (100.0%)
- **Rejected:** 0 (0.0%)
- **30% reject-rate bar:** within bar.

## Distribution (by category × difficulty)

| Category | Diff 1 | Diff 2 | Diff 3 | Cat total |
|---|---|---|---|---|
| DataStructures | 1 | 1 | 1 | 3 |
| Algorithms | 1 | 1 | 1 | 3 |
| OOP | 1 | 1 | 1 | 3 |
| Databases | 1 | 1 | 1 | 3 |
| Security | 1 | 1 | 1 | 3 |

## Approved drafts

### A1: DataStructures / diff=1

**Question:** Which data structure allows you to push and pop values at one end in O(1) time but does not let you remove the oldest inserted value without reprocessing newer ones?

**Options:**
- **A.** Stack  <- correct
- **B.** Queue
- **C.** Hash table
- **D.** Binary search tree

**IRT:** `a=1.00` / `b=-1.50` -- *An easy concept with clear discrimination between stack and queue behavior justifies a moderate irtA and low irtB.*

---

### A2: DataStructures / diff=2

**Question:** Given this circular buffer implementation, what is the maximum number of enqueues that can succeed before `is_full()` returns True, and why?

```python
class CircularQueue:
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
        self.tail = (self.tail + 1) % self.capacity
```

**Options:**
- **A.** capacity - 1, because one slot stays empty to distinguish full from empty  <- correct
- **B.** capacity, since head and tail overlap only after a full cycle
- **C.** capacity + 1, because the modulo wrap adds an extra usable slot
- **D.** capacity // 2, due to halving when tail advances past head

**IRT:** `a=1.20` / `b=0.10` -- *Medium discrimination because understanding the reserved slot distinction distinguishes students who have internalized circular-buffer design.*

---

### A3: DataStructures / diff=3

**Question:** The `isBST` helper below only compares each node to its immediate children. Why can it still return true on some non‑BSTs, and what change would guarantee correctness?

```java
class Node { int value; Node left, right; }
boolean isBST(Node node) {
  if (node == null) return true;
  if (node.left != null && node.left.value > node.value) return false;
  if (node.right != null && node.right.value < node.value) return false;
  return isBST(node.left) && isBST(node.right);
}
```

**Options:**
- **A.** Track allowable min/max values for each subtree during recursion  <- correct
- **B.** Store each node's subtree size and reject if left size ≥ right size
- **C.** Only inspect the parent pointer to ensure left<parent<right
- **D.** Rebalance the tree during validation so local checks suffice

**IRT:** `a=1.60` / `b=1.10` -- *Hard question requiring reasoning about ancestor constraints, so high discrimination and above-average difficulty.*

---

### A4: Algorithms / diff=1

**Question:** Which algorithmic strategy splits a problem into smaller independent subproblems, solves each recursively, and then merges their results?

**Options:**
- **A.** Divide and conquer  <- correct
- **B.** Greedy selection
- **C.** Dynamic programming with memoization
- **D.** Backtracking with explicit search

**IRT:** `a=1.10` / `b=-1.40` -- *A basic conceptual question distinguishing divide-and-conquer from other high-level strategies deserves moderate discrimination and an easy difficulty setting.*

---

### A5: Algorithms / diff=2

**Question:** Given that `arr` was produced by rotating a sorted ascending list, what invariant keeps the minimum element inside the search window `[lo, hi]` as the loop shrinks it?

```python
def min_in_rotated(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] > arr[hi]:
            lo = mid + 1
        else:
            hi = mid
    return arr[lo]
```

**Options:**
- **A.** If arr[mid] > arr[hi], the min is right of mid; otherwise it is at or left of mid, so each branch keeps the min in [lo, hi].  <- correct
- **B.** Because arr[lo:hi+1] stays sorted, comparing arr[mid] and arr[hi] safely discards half of it every time.
- **C.** arr[mid] and arr[hi] always straddle the rotation point, so moving lo/hi based on their order keeps mid as a candidate.
- **D.** Each iteration only removes one index, so eventually lo == hi points to the minimum.

**IRT:** `a=1.30` / `b=0.30` -- *The invariant sharply separates learners who understand how the rotation affects comparisons, so a medium discriminator is appropriate.*

---

### A6: Algorithms / diff=3

**Question:** Given the `count_paths` function below that explores only rightward or downward steps, what is its worst-case time complexity in terms of R rows and C columns when the grid contains no obstacles?

```python
def count_paths(grid):
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
    return dfs(0, 0)
```

**Options:**
- **A.** O(R * C)  <- correct
- **B.** O(2^(R + C))
- **C.** O(R * C * log(R * C))
- **D.** O(R * C^2)

**IRT:** `a=1.40` / `b=1.20` -- *This question sharply discriminates students who understand memoized DFS complexity versus those who overcount, so a higher irtA and a difficulty-aligned irtB are appropriate.*

---

### A7: OOP / diff=1

**Question:** What must be true so that invoking a method on a base-class reference uses the override defined in a derived class?

**Options:**
- **A.** The base method is virtual and the derived class overrides it, enabling dynamic dispatch.  <- correct
- **B.** The derived class defines the same method; the reference must be cast to derived before calling.
- **C.** Calling through a base reference always invokes the base implementation regardless of overrides.
- **D.** The derived override must explicitly call the base implementation when the base reference is used.

**IRT:** `a=1.00` / `b=-1.50` -- *Difficulty is easy because it checks core virtual/override behavior, so average discrimination suffices.*

---

### A8: OOP / diff=2

**Question:** Given the following hierarchy, what prevents CustomLogger from overriding Identifier()?

```csharp
class BaseLogger {
    public virtual string Identifier() => "Base";
}

class FileLogger : BaseLogger {
    public sealed override string Identifier() => "File";
}

class CustomLogger : FileLogger {
    public override string Identifier() => "Custom"; // compiler error here
}
```

**Options:**
- **A.** BaseLogger is itself sealed, so no overrides are allowed
- **B.** FileLogger seals the overridden Identifier, stopping further overrides  <- correct
- **C.** Identifier is private in BaseLogger, so CustomLogger can’t see it
- **D.** Only abstract methods can be overridden, and Identifier has a body

**IRT:** `a=1.20` / `b=0.20` -- *The question hinges on recognising sealed overrides, so it separates understanding at a medium discrimination level.*

---

### A9: OOP / diff=3

**Question:** In the snippet, what is the best explanation for the tag printed by `logger.Log` when a `SpecialLogger` instance is stored in a `LoggerBase` reference?

```csharp
using System;
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
}
```

**Options:**
- **A.** LoggerBase.Log is nonvirtual, so it always reads FileLogger's overridden Tag.
- **B.** The Tag call resolves to the last override in the actual inheritance chain, which is FileLogger, since SpecialLogger hides, not overrides.
- **C.** Interface dispatch requires SpecialLogger to implement Tag explicitly, otherwise the base override is used.
- **D.** Because SpecialLogger declares Tag with new, LoggerBase.Log keeps using FileLogger's override due to virtual dispatch rules.  <- correct

**IRT:** `a=1.40` / `b=1.20` -- *This question requires distinguishing hiding from overriding in a polymorphic call, so it discriminates well at a hard level.*

---

### A10: Databases / diff=1

**Question:** In a SQL query that both filters rows and computes aggregates, which clause removes rows before the aggregation step runs?

**Options:**
- **A.** WHERE clause to filter rows before aggregation  <- correct
- **B.** HAVING clause after grouping
- **C.** ORDER BY clause before aggregates
- **D.** GROUP BY clause to drop rows

**IRT:** `a=1.00` / `b=-1.50` -- *Simple concept with a clear pre-aggregation order, so standard discrimination and a low difficulty rating fit the easy level.*

---

### A11: Databases / diff=2

**Question:** Given the query below, which index best supports the WHERE filter and GROUP BY so the planner can avoid full scans before aggregation?

```sql
CREATE TABLE Sales (
  sale_id SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  region TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

SELECT region, SUM(amount)
FROM Sales
WHERE sale_date >= '2024-01-01' AND sale_date < '2024-04-01'
GROUP BY region;
```

**Options:**
- **A.** A composite index on (sale_date, region)  <- correct
- **B.** A single-column index on (region)
- **C.** A composite index on (region, sale_date)
- **D.** A single-column index on (amount)

**IRT:** `a=1.00` / `b=0.00` -- *The question requires understanding which composite index ordering matches the WHERE clause and grouping, making standard discrimination and medium difficulty appropriate.*

---

### A12: Databases / diff=3

**Question:** A `WorkshopDetails(workshop_id PK, topic, presenter, language, slot)` table stores the languages and time slots that a workshop supports, but those two attributes vary independently (a workshop may offer any combination). Which redesign best enforces Fourth Normal Form while still allowing listing every language and slot per workshop?

**Options:**
- **A.** Create WorkshopLanguages(workshop_id FK, language) and WorkshopSlots(workshop_id FK, slot) tables  <- correct
- **B.** Keep WorkshopDetails but use PK(workshop_id, language, slot) so each combo is unique
- **C.** Introduce WorkshopVariants(workshop_id, language, slot) and allow duplicates to record each option
- **D.** Move language and slot into separate lookup tables without linking them to workshops

**IRT:** `a=1.60` / `b=1.40` -- *Distinguishing independent multi-valued attributes is central to 4NF, so the question sharply discriminates and is above-average difficulty.*

---

### A13: Security / diff=1

**Question:** Which property distinguishes cryptographic hashing from encryption when storing passwords?

**Options:**
- **A.** Hashing is one-way while encryption can be reversed with the right key  <- correct
- **B.** Hashing uses a shared secret key, so the digest can be decrypted later
- **C.** Encryption runs faster than hashing for long password lists
- **D.** Only encryption guarantees the integrity of stored data

**IRT:** `a=1.10` / `b=-1.20` -- *The question is quite focused on a single conceptual distinction, so a moderate discriminator around 1.1 and a low difficulty bias reflect that.*

---

### A14: Security / diff=2

**Question:** The server reads a CSRF token stored in a cookie and compares it with the form-submitted token using `==`. Why is the comparison still risky?

```python
import hmac

def check_csrf(request):
    cookie_token = request.cookies.get("csrf")
    form_token = request.form["csrf"]
    return cookie_token == form_token
```

**Options:**
- **A.** Use a constant-time comparison (e.g., hmac.compare_digest) to avoid leaking the token via timing  <- correct
- **B.** Trim whitespace from both tokens to avoid mismatches caused by encoding issues
- **C.** Store the token in a server-side session so the client cannot tamper with it
- **D.** Hash the submitted token before comparing to protect it from exposure in transit

**IRT:** `a=1.20` / `b=0.00` -- *The question differentiates learners who know about timing channels, so a moderate discrimination and difficulty rating fits.*

---

### A15: Security / diff=3

**Question:** The following function checks an HMAC-bearing token. Why does this comparison still leak whether the first bytes of the signature match, and how should it be fixed?

```javascript
const crypto = require('crypto');
const secret = 'top-secret';
function isTokenValid(payload, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return expected === signature;
}
```

**Options:**
- **A.** Use a constant-time comparison so every byte is compared before returning  <- correct
- **B.** Hash the payload twice before computing HMAC to obscure byte prefixes
- **C.** Reject tokens whose header fields mismatch before computing the signature
- **D.** Rotate the signing key frequently to limit the attack window

**IRT:** `a=1.50` / `b=1.00` -- *Hard reasoning about timing side channels merits a sharp discriminator and high difficulty rating.*

---

## Rejected drafts
