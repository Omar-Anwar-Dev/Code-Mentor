# Multi-Agent vs Single-Prompt Evaluation Report (F13 / ADR-037)

**Status:** _template — will be populated after the live run + supervisor scoring sheets land. The harness scaffold ships with Sprint 11 (S11-T6); the actual run + scoring is the live-execution gate before the report goes into the thesis._

**Plan source:** `docs/implementation-plan.md` Sprint 11 → S11-T6.
**ADR:** [ADR-037 — Multi-Agent Code Review](../decisions.md) — Sprint 11.
**Harness:** `tools/multi-agent-eval/run.py` (see `tools/multi-agent-eval/README.md`).

---

## 1. Hypothesis (from ADR-037)

The single-prompt review (`/api/ai-review`, F6) covers five categories
(`correctness`, `readability`, `security`, `performance`, `design`) in
one pass. The multi-agent review (`/api/ai-review-multi`, F13) splits
the same workload across three specialist agents:

- **Security** — owns `security` (1 of 5).
- **Performance** — owns `performance` (1 of 5).
- **Architecture** — owns `correctness` + `readability` + `design` (3 of 5).

ADR-037 hypothesizes:

> Multi-agent improves `security` and `performance` specificity at higher
> token cost, with neutral-to-slightly-negative effect on `readability`
> (because the architecture agent's broader scope dilutes attention).

This document tests that hypothesis on N=15 controlled inputs against
both endpoints, side-by-side.

---

## 2. Method

### 2.1 Inputs

15 fixtures: 5 Python, 5 JavaScript, 5 C#. Mix of obviously-flawed and
subtly-clean code so the comparison covers both "find-the-bug" and
"don't-invent-bugs" failure modes.

| ID | Lang | Expected primary signal |
|---|---|---|
| `python-01-flask-sql-injection` | Python | SQL injection (security agent) |
| `python-02-n-plus-one-fastapi` | Python | N+1 query (performance agent) |
| _(3 more — see `tools/multi-agent-eval/README.md` § Adding fixtures)_ | | |
| `js-01-react-hardcoded-key` | JS | Hardcoded API key (security) |
| `js-02-event-loop-blocking` | JS | Sync I/O + O(n²) (performance) |
| _(3 more)_ | | |
| `cs-01-aspnet-clean-baseline` | C# | Clean baseline (no padding test) |
| `cs-02-deserialize-untrusted` | C# | TypeNameHandling.All RCE (security) |
| _(3 more)_ | | |

### 2.2 Procedure

1. Both endpoints called with the same input via `tools/multi-agent-eval/run.py`.
2. For each fixture, harness records:
   - All 5 category scores (single vs multi)
   - Overall score (single vs multi) and Δ
   - Total response length in chars (proxy for completeness)
   - Tokens consumed
   - Latency
   - Multi-agent partial-failure flags
3. Two supervisors blind-score each review on a 1–5 rubric across 5
   dimensions: **specificity, actionability, educational value, tone,
   coverage**. Mapping A/B ↔ single/multi held back until scores are in.
4. Aggregate: per-category score deltas, per-language token cost ratio,
   per-rubric-dimension supervisor-rated quality deltas.

---

## 3. Quantitative Results

_Populated by `tools/multi-agent-eval/run.py` output. Copy the
`comparison.md` table into this section verbatim after the run._

### 3.1 Per-fixture comparison

_(table — fixtures × {single, multi, Δ} × {overall, 5 categories, tokens, response chars, latency})_

### 3.2 Aggregates

_(filled per `comparison.md` "Aggregates" section)_

- Per-category mean (single vs multi vs Δ)
- Total tokens (single vs multi vs ratio)

### 3.3 Cost vs quality summary

_(short paragraph: ratio of multi:single tokens, and per-category Δ.
Compares against the ADR-037 hypothesis.)_

---

## 4. Supervisor Relevance Scores

_Populated from the two supervisor sheets returned per
`tools/multi-agent-eval/results/<timestamp>/scoring-sheet-blank.md`._

### 4.1 Per-supervisor mean

|  | Specificity | Actionability | Educational value | Tone | Coverage |
|---|---|---|---|---|---|
| Supervisor A — single | _(filled)_ | | | | |
| Supervisor A — multi | _(filled)_ | | | | |
| Supervisor B — single | | | | | |
| Supervisor B — multi | | | | | |

### 4.2 Per-language drill-down

_(reveals where multi specialty pays off — e.g. if multi wins on
security & performance only when the input has those flaws)_

### 4.3 Inter-rater reliability

_(Cohen's κ or simple % agreement across the two supervisors)_

---

## 5. Discussion

### 5.1 What multi-agent does better

_(empirical, with citations to specific fixtures + supervisor notes)_

### 5.2 What multi-agent does worse

_(if anything — cost, partial-failure incidence, or readability dilution
predicted in ADR-037)_

### 5.3 Defense-mode recommendation

_(should `AI_REVIEW_MODE=multi` ship as default, or stay opt-in? ADR-037
default is `single` for cost containment; this section either confirms
or proposes flipping.)_

---

## 6. Conclusion

_2-3 sentence summary suitable for the thesis chapter abstract._

---

## 7. Appendix — How to reproduce

```bash
# From repo root, with the AI service running on localhost:8001:
python tools/multi-agent-eval/run.py

# Outputs land in tools/multi-agent-eval/results/<UTC-timestamp>/
# comparison.md is the source for Section 3 above.
# scoring-sheet-blank.md is the source for Section 4.
```

Full harness usage: `tools/multi-agent-eval/README.md`.

---

**Run history:**

| Date (UTC) | Fixtures | Mode | Cost ($) | Notes |
|---|---|---|---|---|
| _(empty — first run pending)_ | | | | |
