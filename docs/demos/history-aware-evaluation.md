# History-Aware vs History-Blind Code Review Evaluation Report (F14 / ADR-040)

**Status:** _scaffold — populated after the live run + supervisor scoring sheets land. The harness scaffold ships with Sprint 12 (S12-T10); the actual live run + scoring is the gate before this report goes into the thesis._

**Plan source:** `docs/implementation-plan.md` Sprint 12 → S12-T10.
**ADRs:** [ADR-040..044](../decisions.md) — Sprint 12.
**Harness:** `tools/history-aware-eval/run.py` (scaffold; see § 5 below).

---

## 1. Hypothesis (from ADR-040)

The pre-F14 review (legacy `/api/analyze-zip` without `learner_profile_json` / `learner_history_json` form parts) treats every submission in isolation — the same code submitted by two different learners produces an interchangeable review. F14 wires a learner-aware `LearnerSnapshot` (built from `CodeQualityScores`, `AIAnalysisResults`, `Submissions`, `SkillScores` + RAG-retrieved prior feedback) through the existing enhanced-prompt path (`CODE_REVIEW_PROMPT_ENHANCED` in `ai-service/app/services/prompts.py`).

ADR-040 hypothesizes:

> F14 measurably improves review specificity for repeat learners by surfacing recurring patterns, acknowledging growth, and avoiding restated advice. For first-time learners (cold-start, ADR-042), F14 produces reviews of comparable depth to the pre-F14 baseline (the assessment-only profile gives the AI baseline signal without history to draw on).

This document tests that hypothesis on N=15 controlled inputs against both modes, side-by-side.

---

## 2. Method

### 2.1 Inputs

15 fixtures: 5 Python, 5 JavaScript, 5 C#. Each fixture is paired with:
- A **realistic learner profile + history JSON** simulating the kind of recurring-pattern situation F14 should detect.
- One of three persona scenarios per language (so we get 5 personas × 3 langs = 15 unique combinations):
  - **Persona A — "Repeat security mistakes"** — learner has 5 prior submissions with `input validation missing` weakness; current submission has the same pattern. F14 should flag this as recurring + reference prior advice.
  - **Persona B — "Improving but inconsistent"** — last 3 submissions trending up (mean 78 vs prior 3 mean 62 → "improving"); current submission has a new weakness not in prior list. F14 should acknowledge growth + treat the new weakness as fresh.
  - **Persona C — "Cold-start, first submission"** — no prior submissions; assessment baseline shows Security gap. F14's cold-start path activates (ADR-042) — should NOT fabricate history references.

Fixtures live under `tools/history-aware-eval/fixtures/`:

| ID | Lang | Persona | Expected signal |
|---|---|---|---|
| `python-01-recurring-validation` | Python | A | Repeat: input validation missing |
| `python-02-improving-but-perf-regression` | Python | B | Acknowledge growth + flag new perf issue |
| `python-03-cold-start-flask` | Python | C | No history references, baseline tuning |
| `python-04-recurring-magic-numbers` | Python | A | Repeat: magic numbers without named constants |
| `python-05-improving-cleaner-types` | Python | B | Acknowledge readability growth |
| `js-01-recurring-csrf-missing` | JS | A | Repeat: missing CSRF token |
| `js-02-improving-async-handling` | JS | B | Acknowledge async growth + flag new memory leak |
| `js-03-cold-start-react-app` | JS | C | Baseline tuning, no fabricated history |
| `js-04-recurring-no-error-handling` | JS | A | Repeat: no error handling around async ops |
| `js-05-improving-tests-coverage` | JS | B | Acknowledge growth in test discipline |
| `cs-01-recurring-null-checks` | C# | A | Repeat: missing null checks |
| `cs-02-improving-di-cleanup` | C# | B | Acknowledge DI/architecture growth |
| `cs-03-cold-start-aspnet-api` | C# | C | Baseline tuning |
| `cs-04-recurring-magic-strings` | C# | A | Repeat: magic strings |
| `cs-05-improving-async-streams` | C# | B | Acknowledge async growth |

### 2.2 Procedure

1. Both modes are called for each fixture via `tools/history-aware-eval/run.py`:
   - **Mode A (history-blind):** existing `/api/analyze-zip` with NO snapshot form parts.
   - **Mode B (history-aware):** same endpoint with `learner_profile_json` + `learner_history_json` + `project_context_json` populated from the persona JSON.
2. For each fixture, harness records the full response from both modes.
3. For each pair, harness produces a **delta record** containing:
   - All 5 category scores (Mode A vs Mode B) and Δ
   - Overall score (A vs B) and Δ
   - Response length in chars (proxy for depth)
   - Tokens consumed (input + output for both modes)
   - Counts of `weaknessesDetailed[].isRecurring=true` annotations
   - Counts of `detailedIssues[].isRepeatedMistake=true` annotations
   - Non-empty `progressAnalysis` (yes/no)
   - Whether Mode B response explicitly references prior submission feedback (regex search on response text for "previous", "earlier", "before", "again", or persona-specific recurring phrase)
4. Two supervisors blind-score each Mode A vs Mode B pair (without knowing which is which) on a 4-axis 1–5 rubric (see § 4 — Rubric).

### 2.3 Scoring rubric (per fixture, per supervisor)

| Axis | Scale 1-5 |
|---|---|
| **Specificity to learner** | 1 = generic, 5 = clearly personalized to this learner's pattern |
| **Acknowledges growth where present** | 1 = ignores trend, 5 = explicitly references improvement |
| **Flags recurring patterns** | 1 = misses them, 5 = escalates with prior-feedback reference |
| **Avoids fabricated history** | 1 = invents references not in the profile, 5 = stays grounded |

Per fixture, supervisor reports `(modeA_avg, modeB_avg, delta)`. Final report aggregates over the 15 fixtures × 2 supervisors = 30 scoring sheets.

---

## 3. Results — to be filled

### 3.1 Per-fixture comparison table

| Fixture | Persona | Mode A Overall | Mode B Overall | Δ Overall | Mode A Tokens | Mode B Tokens | Token Δ% | `isRecurring=true` count (B) | `progressAnalysis` non-empty (B)? | Supervisor 1 Δ | Supervisor 2 Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| python-01-recurring-validation | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| python-02-improving-but-perf-regression | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| python-03-cold-start-flask | C | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| python-04-recurring-magic-numbers | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| python-05-improving-cleaner-types | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| js-01-recurring-csrf-missing | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| js-02-improving-async-handling | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| js-03-cold-start-react-app | C | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| js-04-recurring-no-error-handling | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| js-05-improving-tests-coverage | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| cs-01-recurring-null-checks | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| cs-02-improving-di-cleanup | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| cs-03-cold-start-aspnet-api | C | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| cs-04-recurring-magic-strings | A | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| cs-05-improving-async-streams | B | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### 3.2 Aggregated metrics (when run completes)

- **Mean overall-score Δ (Mode B − Mode A):** _TBD_
- **Mean per-category Δ:** correctness=_TBD_, readability=_TBD_, security=_TBD_, performance=_TBD_, design=_TBD_
- **Mean token cost Δ%:** _TBD_ (expected +30-40% per ADR-044)
- **Recurring annotation precision** (count where `isRecurring=true` AND persona expected recurring): _TBD_/15
- **Cold-start "did NOT fabricate history" rate:** _TBD_/3 fixtures
- **Mean supervisor rubric Δ:** _TBD_

### 3.3 Acceptance gate (sprint exit)

- Mean overall-score Δ ≥ 0 (no regression on Mode B).
- Mean supervisor "Specificity to learner" Δ ≥ +0.5 on Persona A fixtures.
- Cold-start "did NOT fabricate history" rate = 3/3 (zero hallucinated references for Persona C).
- Mean token cost Δ% within the ADR-044 budget (input ≤12k per review).

---

## 4. Supervisor rubric template

Use one sheet per supervisor; one row per fixture × mode. Fill after reading the AI response WITHOUT knowing which mode produced it.

```
Fixture ID: _________________________
Mode (blinded label):  X / Y          (the harness writes the un-blinding key separately)
Supervisor: _________________________
Date: _____________

Specificity to learner            [1]  [2]  [3]  [4]  [5]
Acknowledges growth where present [1]  [2]  [3]  [4]  [5]
Flags recurring patterns          [1]  [2]  [3]  [4]  [5]
Avoids fabricated history         [1]  [2]  [3]  [4]  [5]

Free-text comment (≤ 50 words): ____________________________________
______________________________________________________________________
```

---

## 5. Harness scaffold (in this repo)

The eval harness scaffold lives at `tools/history-aware-eval/`:

```
tools/history-aware-eval/
  README.md                  ← how to run, env vars needed, output format
  run.py                     ← orchestrates the 15 × 2 = 30 calls + aggregation
  fixtures/
    python-01-recurring-validation/
      submission.zip
      profile.json
      history.json
      project.json
      expected.txt           ← English description of the recurring pattern
    ... (14 more)
  output/                    ← written by run.py
    deltas.csv               ← per-fixture, per-axis deltas
    raw/
      <fixture>.A.json       ← raw Mode A response
      <fixture>.B.json       ← raw Mode B response
    scoring-sheets/          ← blank supervisor sheets, key.csv separate
```

> **Status of the scaffold (2026-05-11):** the directory, README, runner, and fixtures are queued for the actual live run (owner-led; requires real OpenAI key). Sprint 12 ships the **structure + acceptance gate + rubric template + report skeleton**; the data fill-in is the same kind of post-sprint owner-led carryover as F11/F12/F13's dogfood passes (each took ~25 minutes against real OpenAI for ~$1 in token cost).

---

## 6. Discussion — to be written after the run

_Empty until the run completes. Expected structure: pattern detection precision, cold-start regression check, token-cost vs quality trade-off, recommended F14 tuning (RAG topK, common-mistake threshold) based on observed quality misses._

---

## 7. Reproducibility

- Repo state: HEAD of Sprint 12 close (ADRs 040..044, S12-T1..T12 complete).
- AI service prompt version: `v1.0.0` (single-prompt enhanced path — unchanged by F14 per ADR-040).
- Backend snapshot version: matches `LearnerSnapshotOptions` defaults (3-of-5 recurring threshold, weak<60, strong≥80, RAG topK=5, 10-submission lookback).
- OpenAI model: gpt-5.1-codex-mini (per ADR-003).
- Random seed: not applicable (LLM is non-deterministic; sample size N=15 mitigates).

---

## Change log

| Date | Change | Reason |
|---|---|---|
| 2026-05-11 | Initial scaffold | S12-T10 acceptance — harness structure + rubric template + report skeleton committed |
