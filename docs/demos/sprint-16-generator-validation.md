# Sprint 16 — Generator Prompt v1 Validation

**Sprint:** Sprint 16 — F15 Admin Tools  
**Task:** S16-T2 — 9-sample validation for `generate_questions_v1.md`  
**Date:** 2026-05-14  
**Reviewer:** Claude (single-reviewer mode per ADR-056)  
**Model:** `gpt-5.1-codex-mini` (per ADR-045 reasoning=low)  
**Total tokens:** 19,381  
**Wall clock:** 59.6s (9 sequential calls)

## Acceptance bar

- 9 sample outputs (3 categories × 3 difficulty levels). ✅
- Reject rate < 30%: **11.1%** (1/9 rejected) — ✅ within bar

## Reject criteria (ADR-056 strict mode)

1. Length-based giveaway — correct option ≪ shortest distractor.
2. Self-rated discrimination `irtA` < 0.6.
3. Difficulty↔irtB inversion (easy with positive b, or hard with negative b).
4. Trivia heuristic — questionText < 50 chars.
5. Distractor parallelism — max option length > 4× min option length.

---

## Samples

### Sample 1: DataStructures / difficulty=1 / includeCode=False

**Question:** Which data structure is the best match for processing items in the order they were received?

**Options:**
- **A.** Queue  ← correct
- **B.** Stack
- **C.** Hash table
- **D.** Binary heap

**Explanation:** A queue enforces FIFO order so arrivals are processed first; a stack is LIFO so later items get removed before earlier ones.

**IRT self-rating:** `irtA=1.10` / `irtB=-1.20` — rationale: *An easy conceptual question that clearly separates learners who grasp FIFO vs LIFO, so moderate discrimination and low difficulty.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 2: DataStructures / difficulty=2 / includeCode=True/python

**Question:** Looking at the queue implementation below, what is the total cost of performing n.enqueue operations followed by n.dequeue operations?

**Code snippet (`python`):**

```python
class Queue:
    def __init__(self):
        self.items = []

    def enqueue(self, item):
        self.items.insert(0, item)

    def dequeue(self):
        if self.items:
            return self.items.pop()
        return None
```

**Options:**
- **A.** O(n) because each operation only touches one end of the list
- **B.** O(n log n) since insert at the front is proportional to log size on average
- **C.** O(n^2) because each enqueue shifts all existing elements before inserting  ← correct
- **D.** O(n) because pop removes elements in constant time so amortized cost stays linear

**Explanation:** Each enqueue shifts all existing elements to make room at the front, so n enqueues cost O(n^2); the most plausible distractor claiming O(n) mistakes the expensive insert for a constant-time action.

**IRT self-rating:** `irtA=1.20` / `irtB=0.20` — rationale: *This medium question relies on recognizing repeated inserts at the start are quadratic, so the discrimination is modest and the difficulty is near average.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 3: DataStructures / difficulty=3 / includeCode=True/java

**Question:** In the provided Graph implementation, what is the worst-case time complexity of removeVertex(v) in terms of v's degree and its neighbors' degrees?

**Code snippet (`java`):**

```java
class Graph {
  private Map<Integer, List<Integer>> adj = new HashMap<>();
  void addEdge(int u, int v) {
    adj.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
    adj.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
  }
  void removeVertex(int v) {
    for (int neighbor : adj.getOrDefault(v, List.of())) {
      adj.get(neighbor).remove(Integer.valueOf(v));
    }
    adj.remove(v);
  }
}
```

**Options:**
- **A.** O(deg(v) + sum of deg(u) for each neighbor u of v)  ← correct
- **B.** O(deg(v)^2)
- **C.** O(deg(v) + |V|)
- **D.** O(|V| + |E|)

**Explanation:** Removal iterates over neighbors (deg(v)) and each neighbor list removal is linear in that neighbor's degree, so the total cost is deg(v)+∑deg(neighbor). Option B wrongly ignores varying neighbor degrees.

**IRT self-rating:** `irtA=1.30` / `irtB=1.50` — rationale: *High discrimination because only students who account for per-neighbor linear removal see the correct complexity; difficulty level is high so irtB is positive.*

**Claude single-reviewer (ADR-056):** ❌ REJECT
  - Option-length disparity (11 vs 50) > 4x — parallelism is off.

---

### Sample 4: OOP / difficulty=1 / includeCode=False

**Question:** Which idea describes keeping an object’s internal data hidden and providing methods to interact with it?

**Options:**
- **A.** Encapsulation  ← correct
- **B.** Polymorphism
- **C.** Inheritance
- **D.** Static typing

**Explanation:** Encapsulation hides state behind methods; polymorphism is about treating multiple types uniformly, which doesn’t guarantee hiding data.

**IRT self-rating:** `irtA=1.00` / `irtB=-1.00` — rationale: *The question cleanly distinguishes students who understand encapsulation from those confusing it with other basic principles, so average discrimination is appropriate.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 5: OOP / difficulty=2 / includeCode=True/csharp

**Question:** Given the code, what does the call to `p.Print()` print and why?

**Code snippet (`csharp`):**

```csharp
class Printer {
    public string Print() => "generic";
}

class ColorPrinter : Printer {
    public new string Print() => "color";
}

class Program {
    static void Main() {
        Printer p = new ColorPrinter();
        System.Console.WriteLine(p.Print());
    }
}
```

**Options:**
- **A.** A: "color"
- **B.** B: "generic"  ← correct
- **C.** C: runtime error because Print is hidden
- **D.** D: "color" twice

**Explanation:** The base-class variable calls the inherited non-virtual method, so it executes Printer.Print() ("generic"); the most plausible distractor assumes hiding behaves like overriding, which it does not without virtual.

**IRT self-rating:** `irtA=1.10` / `irtB=0.20` — rationale: *Medium difficulty because it probes understanding of method hiding versus overriding, so a moderate discriminator value fits.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 6: OOP / difficulty=3 / includeCode=False

**Question:** A base Account class has withdraw(amount) that throws InsufficientFunds if balance−amount would go negative. CheckingAccount derives from Account and overrides withdraw to permit negative balance up to an overdraft limit without throwing. Which statement best explains why this violates the Liskov Substitution Principle?

**Options:**
- **A.** It weakens the base postcondition by allowing withdrawals that can leave the balance negative  ← correct
- **B.** It strengthens the base precondition because the override requires checking the overdraft limit
- **C.** It breaks encapsulation by exposing the overdraft limit through public methods
- **D.** It introduces tight coupling between checking and base account logic

**Explanation:** LSP requires overriding methods to honor the base contract; allowing negative balances weakens the postcondition callers relied on, whereas the strongest distractor (B) wrongly describes a precondition change that didn't occur.

**IRT self-rating:** `irtA=1.40` / `irtB=1.10` — rationale: *The question demands precise reasoning about behavioral contracts, so medium-high discrimination (1.4) and a high difficulty setting (1.1) reflect that.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 7: Security / difficulty=1 / includeCode=False

**Question:** What is the primary goal of input validation on a web form before processing the data?

**Options:**
- **A.** Verify the data matches expected format before the application uses it  ← correct
- **B.** Track every request to produce an audit trail of user actions
- **C.** Encrypt the submission so only the server can read the form data
- **D.** Assign the user to a role before deciding which pages to show

**Explanation:** Input validation ensures only well-formed data reaches the application, while the most plausible distractor, auditing, only records activity and does not stop malformed input.

**IRT self-rating:** `irtA=0.90` / `irtB=-1.20` — rationale: *The question sharply contrasts validation with other security practices but remains easy, so a moderate discrimination and low difficulty make sense.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 8: Security / difficulty=2 / includeCode=True/python

**Question:** Which change to the snippet best prevents SQL injection while keeping the same table/query logic?

**Code snippet (`python`):**

```python
import sqlite3

def find_user(username):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT id FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchone()
```

**Options:**
- **A.** Use a parameterized query: cursor.execute("SELECT id FROM users WHERE username = ?", (username,))  ← correct
- **B.** Escape quotes on username before formatting so user input cannot break the string
- **C.** Reject usernames over a fixed length so injection payloads can never be long
- **D.** Remove the single quotes around {username} so non-string tokens cannot inject commands

**Explanation:** Using a parameterized query ensures the username stays data rather than executable SQL, while escaping quotes manually is brittle and still vulnerable to other crafted payloads.

**IRT self-rating:** `irtA=1.20` / `irtB=0.20` — rationale: *The question contrasts a safe parameterized query against common but insufficient mitigations, so moderate discrimination and mid-range difficulty apply.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

### Sample 9: Security / difficulty=3 / includeCode=True/javascript

**Question:** The snippet verifies a signed JWT before allowing admins to delete accounts. If an attacker steals a valid token, which server-side addition would best limit the damage without forcing every token to be stateful?

**Code snippet (`javascript`):**

```javascript
const jwt = require('jsonwebtoken');
const SECRET = process.env.SECRET;
app.post('/delete', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.sendStatus(401);
  let payload;
  try {
    payload = jwt.verify(auth, SECRET);
  } catch (err) {
    return res.sendStatus(401);
  }
  if (payload.role !== 'admin') return res.sendStatus(403);
  deleteUser(req.body.targetId);
  res.sendStatus(204);
});
```

**Options:**
- **A.** Maintain a revocation list of token IDs (jti) and check it before accepting a token  ← correct
- **B.** Require the client to delete the token from storage immediately after each request
- **C.** Increase the token lifetime so renewals occur less often
- **D.** Move the admin check to the client so the server trusts the UI state

**Explanation:** Adding a revocation list keyed by a token identifier lets the server refuse a stolen token before its expiration; the most plausible wrong answer is (B), but relying on the client to delete a token doesn’t protect the server if the attacker already has a copy.

**IRT self-rating:** `irtA=1.60` / `irtB=1.20` — rationale: *Hard reasoning about stateless JWT revocation requires high discrimination and maps to a high difficulty rating.*

**Claude single-reviewer (ADR-056):** ✅ ACCEPT

---

## Summary

- **Accept:** 8/9 (88.9%)
- **Reject:** 1/9 (11.1%)
- **Total tokens:** 19,381
- **Prompt-iteration needed:** No — within < 30%% reject bar.

Generated by `ai-service/tools/generate_validation_samples.py`.
