# Sprint 17 — Content Batch 4 Report

**BatchId:** `9271946e-ce60-4419-bacd-66a4873e13f8`  
**Generated at:** 2026-05-14T23:04:40Z  
**Reviewer:** Claude single-reviewer (ADR-056 + ADR-057)  
**Wall clock:** 109.8s (~1.8 min)  
**Token cost:** 38,809 tokens (retries: 0)  

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

**Question:** A singly linked list keeps both head and tail pointers. Why does appending a node still run in constant time?

**Options:**
- **A.** Because you update tail->next and tail directly, without walking the list  <- correct
- **B.** Because each node stores both next and previous pointers for faster appends
- **C.** Because nodes live in contiguous memory so you can compute the end index
- **D.** Because you must traverse from head to reach the tail before linking the new node

**IRT:** `a=0.90` / `b=-1.20` -- *Easy recognition question so moderate discrimination (≈0.9) and low difficulty (−1.2) reflect that students either know or guess.*

---

### A2: DataStructures / diff=2

**Question:** Given the queue implemented with two stacks below, what is the amortized time complexity of enqueue and dequeue over n operations?

```python
class TwoStackQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []
    def enqueue(self, value):
        self.in_stack.append(value)
    def dequeue(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack.pop()
```

**Options:**
- **A.** Amortized O(1) because each element moves between stacks at most once  <- correct
- **B.** Worst-case O(n) per operation since each dequeue may move every element
- **C.** O(log n) because stack transfers halve the number of elements each time
- **D.** Amortized O(n) since the out_stack is emptied and refilled frequently

**IRT:** `a=1.10` / `b=0.20` -- *Moderate discrimination with a typical medium difficulty level fitting amortized analysis.*

---

### A3: DataStructures / diff=3

**Question:** Given the ArrayList-backed adjacency lists in the snippet, what is the worst-case time complexity of `removeVertex(v)` in terms of the degree d of v (assuming all neighbors also have Θ(d) edges)?

```java
class Graph {
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
}
```

**Options:**
- **A.** O(d^2), because each neighbor removal scans its list of size Θ(d)  <- correct
- **B.** O(d log d), because removing from ArrayList can be binary searched
- **C.** O(d), because each neighbor is visited exactly once
- **D.** O(d + n), because removing v touches all adjacency lists in the graph

**IRT:** `a=1.40` / `b=1.20` -- *High discrimination (1.4) because the question hinges on recognizing the quadratic cost from nested degree work, and an irtB of 1.2 matches the hard difficulty.*

---

### A4: Algorithms / diff=1

**Question:** Which algorithmic property makes merge sort reliably run in O(n log n) time even for already sorted input?

**Options:**
- **A.** It always splits the input into two halves, processes both, and merges the sorted halves  <- correct
- **B.** It skips processing when it detects the subarray is already sorted
- **C.** It selects a pivot and partitions so each recursive call handles fewer than n elements
- **D.** It repeatedly removes the smallest remaining element into a growing output

**IRT:** `a=1.00` / `b=-1.20` -- *A basic conceptual question contrasting merge sort’s divide-and-conquer structure with other sorting strategies.*

---

### A5: Algorithms / diff=2

**Question:** In the naive recursive Fibonacci function below, what explains the exponential growth in running time as n increases?

```python
def naive_fib(n):
    if n <= 1:
        return n
    return naive_fib(n - 1) + naive_fib(n - 2)
```

**Options:**
- **A.** It recomputes the same subproblems over and over, producing about 2ⁿ recursive calls  <- correct
- **B.** Each call splits the input evenly, so the recursion depth is logarithmic
- **C.** It visits every integer up to n exactly once after the base cases
- **D.** Tail recursion keeps the stack shallow and thus the work stays linear

**IRT:** `a=1.20` / `b=0.20` -- *The question contrasts repeated subproblem work with misconceived log-depth splits, so it should discriminate moderately.*

---

### A6: Algorithms / diff=3

**Question:** Given the memoized recursion below, what is the tightest upper bound on the number of unique helper invocations when n grows large?

```python
def count_tilings(n):
    memo = {0: 1}
    def helper(k):
        if k in memo:
            return memo[k]
        ways = helper(k - 1) + helper(k - 2)
        if k % 2 == 0:
            ways += helper(k // 2)
        memo[k] = ways
        return ways
    return helper(n)
```

**Options:**
- **A.** O(n)  <- correct
- **B.** O(n log n)
- **C.** O(n^2)
- **D.** O(log n)

**IRT:** `a=1.60` / `b=1.20` -- *The question sharply distinguishes learners who understand memoized state counts from those who overcount branching, so a high discrimination makes sense, and the halving keeps difficulty in the upper range.*

---

### A7: OOP / diff=1

**Question:** Which statement best distinguishes method overriding from method overloading in OOP?

**Options:**
- **A.** Overriding redefines a base method in a subclass, while overloading declares several same-name methods with different params.  <- correct
- **B.** Overloading redefines a base method in a subclass, while overriding declares several same-name methods with different params.
- **C.** Overriding only applies to constructors, while overloading applies to regular instance methods.
- **D.** Overriding depends on public access, while overloading only uses private helpers.

**IRT:** `a=1.10` / `b=-1.60` -- *An easy conceptual question with a clear correct interpretation, so moderate discrimination and low difficulty feel appropriate.*

---

### A8: OOP / diff=2

**Question:** In the following code, what text does `Console.WriteLine(printer.Render());` print and why?

```csharp
class Printer
{
    public string Render() => Format();
    public string Format() => "Base";
}

class FancyPrinter : Printer
{
    public new string Format() => "Fancy";
}

var printer = new FancyPrinter();
Console.WriteLine(printer.Render());
```

**Options:**
- **A.** Base, because Render calls the base Format implementation since Format is not virtual  <- correct
- **B.** Fancy, because the instance is FancyPrinter so its Format hides the base method
- **C.** Base, because new methods cannot override inherited methods even if they share the signature
- **D.** Fancy, because hiding a method still changes the dispatch target when called via inheritance

**IRT:** `a=1.30` / `b=0.10` -- *Medium discrimination because understanding method hiding vs overriding separates learners; difficulty around average aligns with irtB near 0.*

---

### A9: OOP / diff=3

**Question:** Given the hierarchy below, what explains why `RacingEngine.Start()` always prints `Base configure` before `Race run`, even though `RacingEngine` overrides `Run()`?

```csharp
using System;
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
class Program { static void Main() => new RacingEngine().Start(); }
```

**Options:**
- **A.** Sealing `BaseEngine.Configure` ensures `Start` always calls the `BaseEngine` implementation before `Run`, so `RacingEngine` cannot change that first step.  <- correct
- **B.** `Configure` is virtual, so `Start` picks the runtime override; the base implementation still runs because the sealed modifier only affects `Run`.
- **C.** `Start` is non-virtual, so each derived class must re-implement it; here `RacingEngine` inherits `Start` without modification, leaving `Configure` unchanged.
- **D.** `Run` is abstract but `Configure` is not, so sealing `Configure` prevents `Run` from being overridden multiple times.

**IRT:** `a=1.60` / `b=1.20` -- *Sealing a virtual method in an intermediate class sharply restricts further overrides while the template method in the base class still calls it, so the question discriminates by testing that multi-step reasoning.*

---

### A10: Databases / diff=1

**Question:** What is the main purpose of declaring a foreign key from a child table to a parent table?

**Options:**
- **A.** Ensure each child row refers to an existing parent row  <- correct
- **B.** Prevent deleting parent rows even when children exist
- **C.** Automatically index the child column for faster joins
- **D.** Allow the child table to store duplicates of the parent key

**IRT:** `a=1.00` / `b=-1.20` -- *This easy question is a basic recall of referential integrity, so a standard discrimination (1.0) and low difficulty (-1.2) suffice.*

---

### A11: Databases / diff=2

**Question:** Given the Orders table storing customer_location attributes and the Customers table owning the authoritative city/region data, which schema change best removes redundancy while still allowing reports to show each order’s customer region?

```sql
CREATE TABLE Customers (
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
);
```

**Options:**
- **A.** Drop customer_city and customer_region from Orders and rely on the FK join for those attributes  <- correct
- **B.** Add a CHECK that customer_region equals the corresponding Customers.region value
- **C.** Keep the location columns and build a materialized view that joins Orders to Customers
- **D.** Add a trigger that copies Customers.city and .region into Orders whenever a customer changes

**IRT:** `a=1.20` / `b=0.00` -- *Moderate discrimination: selecting the normalized schema requires applying the FK join idea, so A=1.2, B=0.0 reflects medium difficulty.*

---

### A12: Databases / diff=3

**Question:** An Orders table has columns (order_id PK, customer_id FK, status, placed_at, total). A frequent reporting query filters by placed_at range and status IN ('shipped','delivered'), groups by customer_id and status, and orders by customer_id. Which single index best lets the planner satisfy the filter, grouping, and ordering without extra sorting?

**Options:**
- **A.** A composite index on (status, placed_at, customer_id)  <- correct
- **B.** A composite index on (placed_at, customer_id, status)
- **C.** A composite index on (customer_id, status, placed_at)
- **D.** Separate indexes on placed_at and on status

**IRT:** `a=1.50` / `b=1.40` -- *High discrimination since only the correct column ordering provides the required filter+grouping benefits, and IRT B reflects the hard reasoning about equality vs range column order.*

---

### A13: Security / diff=1

**Question:** Why should a session cookie have the SameSite attribute set to "Lax" or "Strict"?

**Options:**
- **A.** It blocks the cookie from being sent along with cross-site requests to reduce CSRF risk  <- correct
- **B.** It encrypts the cookie contents so an attacker cannot read the session ID
- **C.** It forces the browser to refresh the cookie on every request for better freshness
- **D.** It ties the cookie to the user’s IP address to prevent session hijacking

**IRT:** `a=0.90` / `b=-1.10` -- *An easy question about a single flag, so moderate discrimination and low difficulty.*

---

### A14: Security / diff=2

**Question:** The frontend stores a JWT in `localStorage` and sends it via an Authorization header as shown. Which attack does this pattern leave the token exposed to?

```python
token = localStorage.getItem("session")
fetch("/api/data", {
    headers: {"Authorization": f"Bearer {token}"}
})
```

**Options:**
- **A.** A: Cross-site scripting that can read localStorage and send the token elsewhere  <- correct
- **B.** B: Cross-site request forgery that reuses the Authorization header on a forged form
- **C.** C: SQL injection via the Authorization header contents
- **D.** D: Brute-force guessing of the token by repeatedly calling the endpoint

**IRT:** `a=1.20` / `b=0.20` -- *Recognizing that accessible storage exposes tokens to XSS is moderately discriminating, so a slightly above-average slope and near-zero difficulty suit this medium question.*

---

### A15: Security / diff=3

**Question:** In the OAuth handshake below, why does a constant `state` value fail to stop CSRF attacks, and what change restores the protection?

```javascript
const express = require('express');
const app = express();
app.get('/login', (req, res) => {
  const state = 'abc123';
  res.redirect(`https://auth.example.com/authorize?state=${state}`);
});
app.get('/oauth/callback', (req, res) => {
  if (req.query.state !== 'abc123') {
    return res.status(403).end();
  }
  res.send('Logged in');
});
```

**Options:**
- **A.** Use a fresh cryptographically random state per login saved in the user session and checked on callback  <- correct
- **B.** Include the client IP address in the constant state so attackers guessing it are blocked
- **C.** Drop the state parameter and depend on SameSite cookies for CSRF protection
- **D.** Keep the constant state but also verify the OAuth referer header to prove the request came from the provider

**IRT:** `a=1.70` / `b=1.20` -- *This requires multi-step reasoning about CSRF tokens and why predictability weakens them, so a higher discrimination and above mid difficulty rating fit.*

---

## Rejected drafts
