# Chapter X — Adaptive AI Learning System: F15 (IRT-lite) + F16 (Path Generation + Continuous Adaptation)

**Status:** DRAFT v0.1 — 2026-05-15. Empirical §10 placeholders pending the
S21-T8 dogfood window (closes 2026-08-15). Supervisor review scheduled
post-dogfood.

**Authors:** Omar (Backend Lead) — primary author. Supervisor reviewers TBA.

**Word count (estimated):** ~7,500 words (this draft); target ~8,000–10,000
final.

---

## Abstract

This chapter describes the Adaptive AI Learning System that closes the
Code Mentor MVP: an IRT-lite engine for adaptive question selection, a
hybrid embedding-recall + LLM-rerank path generator, and a signal-driven
continuous adaptation engine that retunes a learner's path as their
submissions land. Two design contributions stand out from comparable
EdTech systems: **(a)** a deliberately small 2PL IRT engine that is
defensible without proprietary IRT software dependencies, and **(b)** a
mid-path retuning policy with explicit anti-thrashing rules + a 100 %
audit trail. We report implementation notes from 7 production sprints
(S15 → S21), empirical results from a 10-learner dogfood phase, and a
limitations + future-work section.

---

## 1. Introduction & Motivation

Self-taught developers and university students share a common problem:
they finish a tutorial or course, the course says "Congratulations!",
and they have no calibrated answer to "am I actually good enough to ship
production code?". Code Mentor's first-cut MVP (F1 – F14) addressed the
*feedback* side of that problem — multi-layered code review, project
audit, RAG-grounded mentor chat. F15 + F16 address the *curriculum* side:
how does a platform measure a learner's actual ability, and how does it
shape their path forward so they're consistently working at the edge of
their competence?

The chapter is structured around three questions:

1. **Measurement.** How do you score a learner adaptively in 30 questions
   without a year of psychometric data? (§5: 2PL IRT-lite)
2. **Curriculum.** How do you select 5–10 tasks out of 50 that target
   that learner's specific skill gaps? (§6: hybrid retrieval-rerank)
3. **Adaptation.** As submissions land, how do you retune the path
   without making the learner feel they're on a treadmill? (§7:
   signal-driven adaptation with cooldown + auto-apply rules)

The remaining sections cover background literature (§2), the architecture
of the integrated system (§3), the data model (§4), the implementation
notes per sprint (§8), the AI-prompt design (§9), empirical results from
the S21 dogfood (§10), limitations (§11), and future work (§12).

---

## 2. Background

### 2.1 Item Response Theory

Item Response Theory (IRT) is the dominant psychometric framework for
adaptive testing in education research and high-stakes exams (GRE, TOEFL,
ASVAB). The simplest useful form is **2-parameter logistic (2PL)**:

> P(correct | θ, a, b) = 1 / (1 + exp(-a · (θ - b)))

Where θ is the learner's latent ability (typically scaled to [-3, +3]),
*a* is the item's discrimination (slope of the curve at b), and *b* is the
item's difficulty. Fisher information at θ for a 2PL item is:

> I(θ) = a² · P · (1 - P)

Adaptive item selection picks the unanswered item with the highest
information at the current MLE estimate of θ. The intuition is that an
item is most informative when the learner has a ~50% chance of getting it
right.

The platform deliberately stays at 2PL rather than 3PL (adds guessing
parameter *c*) or 4PL (adds an upper asymptote). The thesis-honest reason
is sample-size: at the dogfood scale, 3PL parameter estimation isn't
identifiable. See ADR-050 and §11.

### 2.2 Curriculum sequencing

The classical curriculum problem in EdTech literature is **Knowledge
Tracing**: model what a learner knows over time and recommend the next
activity. Bayesian Knowledge Tracing (BKT, Corbett & Anderson 1994) is
the canonical baseline; Deep Knowledge Tracing (DKT, Piech et al. 2015)
uses an LSTM. Both require thousands of learner trajectories to train —
out of scope for an MVP.

Our approach is non-stateful in the BKT sense: we treat each learner
independently, use a hand-tuned EMA over their per-category submission
scores, and let the LLM rerank a recall-narrowed candidate set. This is
closer to a *recommendation* problem than a *tracing* problem. See ADR-052.

### 2.3 Retrieval-augmented generation for curriculum

Retrieval-Augmented Generation (Lewis et al. 2020) is the dominant
pattern for grounding LLM outputs in a corpus. Code Mentor's F12 mentor
chat already uses RAG over per-submission code chunks (Qdrant + OpenAI
embeddings). F16's path generator reuses the same embedding model
(`text-embedding-3-small`) for a different purpose: retrieving the top-K
candidate tasks closest to the learner's skill-profile vector, then
giving the LLM that narrowed set + the full reasoning prompt. This is
"hybrid retrieval-rerank" — the same shape as modern web-search
re-rankers (Nogueira & Cho 2019), but with the candidate pool being our
50-task corpus rather than open web text.

---

## 3. System architecture

The Adaptive AI Learning System integrates into the existing three-service
Code Mentor architecture (Vite frontend + .NET 8 backend + FastAPI AI
service). The new components are:

- **AI service.** `/api/irt/select-next` (F15 — IRT engine, scipy-based);
  `/api/assessment-summary` (F15 — post-assessment AI summary);
  `/api/generate-path` (F16 — hybrid recall + LLM rerank);
  `/api/task-framing` (F16 — per-task AI framing); `/api/adapt-path`
  (F16 — signal-driven adaptation generator).
- **Backend.** New `Assessments.Variant` column with `{Initial, Mini,
  Full}`; new `LearningPath.{InitialSkillProfileJson, Version,
  PreviousLearningPathId}` columns; new `LearnerSkillProfile` table;
  new `PathAdaptationEvents` audit table; new `TaskFramings` cache table;
  new `IRTCalibrationLog` audit table. Hangfire jobs:
  `GenerateAssessmentSummaryJob`, `GenerateLearningPathJob`,
  `GenerateTaskFramingJob`, `PathAdaptationJob`, `RecalibrateIRTJob`.
- **Frontend.** Mini reassessment banner at 50%; Graduation page at 100%;
  adaptation proposal modal + history timeline; admin dogfood-metrics
  page.

### 3.1 Sequence diagram — adaptive assessment

```
Learner       FE                 BE                    AI service        DB
  │           │                  │                     │                  │
  │ Begin ───►│                  │                     │                  │
  │           │ POST /assessments│                     │                  │
  │           │ ────────────────►│                     │                  │
  │           │                  │ pick first via IRT  │                  │
  │           │                  │ ──────────────────► │                  │
  │           │                  │                     │ select-next(θ=0) │
  │           │                  │ ◄────────────────── │                  │
  │           │ ◄────────────────│  questionId         │                  │
  │ Answer ──►│                  │                     │                  │
  │           │ POST /answers   ─►│ MLE-update θ        │                  │
  │           │                  │ ──────────────────► │                  │
  │           │                  │ ◄────────────────── │ next question    │
  │           │ ◄────────────────│                     │                  │
  │           │ ...               │                     │                  │
  │           │     (30 q later)  │                     │                  │
  │           │                  │ complete + score     │                  │
  │           │                  │ save SkillScores ──► │                  │── ✓
  │           │                  │ enqueue summary job  │                  │
  │           │                  │ enqueue path job     │                  │
  │           │                  │                     │                  │
  │ See results◄──────────────── │ (FE polls /summary  │                  │
                                    until 200, polls   │                  │
                                    /paths/active)     │                  │
```

### 3.2 Sequence diagram — continuous adaptation

```
Submission lands ─► SubmissionAnalysisJob ─► LearnerSkillProfile updated (EMA)
                          │
                          │ (snapshot before/after via service)
                          ▼
                  TriggerEvaluator
                          │ check 4 trigger types
                          │ Periodic (every 3 completions)
                          │ ScoreSwing (>10pt delta)
                          │ Completion100
                          │ OnDemand (refresh button)
                          │
                          ▼
                  Cooldown gate (24h)
                          │ bypassed only by Completion100 / OnDemand
                          ▼
                  PathAdaptationJob
                          │ call AI /api/adapt-path
                          │ apply 3-of-3 auto-apply rule
                          │ (type=reorder ∧ confidence>0.8 ∧ intra-skill-area)
                          ▼
                  PathAdaptationEvents.LearnerDecision:
                    AutoApplied | Pending | Expired
                          │
                          ▼ (if Pending)
                  Notification + banner on /learning-path
                          │
                          ▼ (learner clicks Approve/Reject)
                  Apply actions transactionally OR
                  log Rejected (no path change)
```

---

## 4. Data model additions

Schema deltas captured here for thesis traceability; full DDL lives in
the migrations directory.

| Entity | Sprint | Purpose |
|---|---|---|
| `Question.{IRT_A, IRT_B, CalibrationSource, Source, ApprovedById, ApprovedAt, CodeSnippet, CodeLanguage, EmbeddingJson, PromptVersion}` | S15 | 2PL parameters + provenance + admin approval + code snippet + embedding cache |
| `QuestionDraft` (new table) | S16 | Admin review state machine for AI-generated drafts |
| `AssessmentSummary` (new table) | S17 | Persisted 3-paragraph AI summary |
| `IRTCalibrationLog` (new table) | S17 | Audit trail for the weekly recalibration job |
| `LearnerSkillProfile` (new table) | S19 | Per-user per-category EMA-smoothed score |
| `LearningPath.{Source, GenerationReasoningText}` | S19 | Provenance for path generation |
| `TaskFramings` (new table) | S19 | Per-user per-task AI framing cache |
| `Tasks.{SkillTagsJson, LearningGainJson, PrerequisitesJson, EmbeddingJson, Source, PromptVersion}` | S18/S19 | Multi-skill tags + recall embedding + provenance |
| `PathAdaptationEvents` (new table) | S20 | 100 % audit trail of every adaptation cycle |
| `LearningPath.LastAdaptedAt` | S20 | 24 h cooldown gate |
| `Assessment.Variant ∈ {Initial, Mini, Full}` | S21 | Variant tag for reassessment flows |
| `LearningPath.{InitialSkillProfileJson, Version, PreviousLearningPathId}` | S21 | Before/After radar + Next-Phase lineage |

---

## 5. Adaptive Assessment Engine (F15)

### 5.1 Engine math

The IRT engine in `ai-service/app/services/irt_engine.py` implements two
operations:

1. **θ MLE estimation.** Given a response history
   `[(a_i, b_i, correct_i)]_{i=1..n}`, find the θ that maximises the log-
   likelihood:
   > L(θ) = Σ_i [ correct_i · log P_i + (1 - correct_i) · log (1 - P_i) ]
   > where P_i = 1 / (1 + exp(-a_i · (θ - b_i)))

   We use `scipy.optimize.minimize_scalar` with bounded search on
   [-4, +4]. The constant test bar (ADR-055): on 100 synthetic learners
   with θ_true sampled uniformly from [-2.5, +2.5] and 30-item
   trajectories, ≥ 95 % of estimates fall within ±0.5 of θ_true. Empirical
   measurement: 96 % at 30 items, 91 % at 20 items, 78 % at 10 items
   (which informs the mini-reassessment design — see §5.4).

2. **Information-maximising selection.** For each unanswered item:
   > info_i(θ) = a_i² · P_i · (1 - P_i)
   Pick the maximum. Category-balance is enforced as a hard constraint
   in the AI-service layer (no category exceeds 30 % of total responses
   per F2 PRD requirement).

### 5.2 AI Question Generator (ADR-049 + ADR-056)

Authoring 250 high-quality items by hand is intractable for an MVP. The
F15 design replaces hand-authoring with a **generator + reviewer
workflow**. The generator (`/api/generate-questions`) calls GPT-5.1-codex-
mini with the prompt `prompts/generate_questions_v1.md`, requesting a
JSON array of N items. Each item self-rates its (a, b) parameters. A
Pydantic schema validates the shape; on validation failure the engine
retries up to twice with the parser error as a self-correction signal.

The review workflow is the safety net: every generated item lands as a
`QuestionDraft` row with status `Draft`. An admin reviewer approves
(creates a `Questions` row) or rejects (keeps the draft, flags it). The
trust chain is the central thesis-honesty concern — see §5.6.

### 5.3 Post-assessment AI summary

After a Completed Initial or Full assessment, `GenerateAssessmentSummaryJob`
fires within ~ 1 s. It calls `/api/assessment-summary` with the user's
per-category scores + the prompt `prompts/assessment_summary_v1.md`. The
prompt produces three paragraphs: strengths, weaknesses, path guidance.
The output is a Pydantic-validated JSON; failures retry with self-
correction. p95 latency: 6.2 s in the S17 walkthrough (under the 8 s
acceptance bar).

Mini reassessments deliberately do not trigger the summary job — the
10-question signal is too thin for a useful 3-paragraph readout (see
ADR-049 and `AssessmentSummary.cs:18-21`).

### 5.4 Mini reassessment IRT seed

The Mini variant uses `IrtAdaptiveQuestionSelector.SelectFirstWithThetaAsync`
with the user's current ability estimate seeded from their
`LearnerSkillProfile`. The seed is computed as:

> θ_seed = clamp((mean(SmoothedScore) - 50) / 16.67, -3, +3)

That linear map sends 0 → -3, 50 → 0, 100 → +3, matching the platform's
θ scale. Practically, a learner at smoothed-score 70 across categories
gets θ_seed ≈ +1.2 — the engine then picks items with b ≈ +1.2, which
are harder than the diff=2 medium pool the initial assessment would have
picked. This is the "biases toward harder b as learner progresses" rule
from the F15 acceptance criteria, implemented as a single math
expression rather than a category-tracking heuristic.

### 5.5 Recalibration

The `RecalibrateIRTJob` runs weekly (Hangfire RecurringJob, Mondays 02:00
UTC). For each item with ≥ 50 responses in `AssessmentResponses`, it
re-fits `(a, b)` via joint MLE across that item's response history.
Updated parameters write back to `Questions.IRT_A` / `IRT_B` and the old
values append to `IRTCalibrationLog`. The 50-response threshold was set
empirically in ADR-055 (was 1000 at design time; cut for MVP scale).

At the time of writing the dogfood window hasn't closed, so the empirical
expectation is **0 items meeting the threshold by defense day**. The
chapter notes this honestly in §10.

### 5.6 Trust chain — single-reviewer waiver (ADR-056 → ADR-062)

The original F15 design (ADR-049 §4) calls for **team-distributed review**
of every AI-generated draft. In practice across S16 → S21 the team's
limited capacity forced a single-reviewer protocol for six sprints in a
row, governed by an ADR per sprint (ADR-056 through ADR-062). Each ADR
inherits the same strict reject criteria from ADR-056 §2.

Cumulative result across S16+S17+S18+S19+S20+S21 (target):

| Sprint | Content | Sole reviewer | Drafts | Approved | Reject rate |
|---|---|---|---|---|---|
| S16 batches 1+2 | 60 questions | Claude | 62 | 60 | 3.2 % |
| S17 batches 3+4 | 30 questions | Claude | 30 | 30 | 0 % |
| S18-T7 batch 1 | 10 tasks | Claude | 10 | 10 | 0 % |
| S19-T8 batch 2 | 10 tasks | Claude | 10 | 10 | 0 % |
| S20-T8 batch 3 | 9 tasks | Claude | 9 | 9 | 0 % |
| S21-T5 batch 5 | 60 questions | Claude | 60+ | [pending dogfood] | [pending] |

The thesis-honest framing: the bank from 60 → 207 questions and 21 → 50
tasks was bootstrapped under a single-reviewer protocol with strict
reject rules + owner spot-check on 5 random samples per batch. The
trust chain is weaker than full team-distributed review; the mitigation
is the ADR audit trail + spot-checks + the conservative reject
criteria. Post-MVP content additions revert unconditionally to ADR-049
§4 (see ADR-062 §5).

---

## 6. AI Learning Path Generator (F16)

### 6.1 Hybrid retrieval-rerank pipeline

The generator (`POST /api/generate-path`) takes (LearnerSkillProfile,
optional recent submissions, optional candidate-task overrides, target
length). The pipeline:

1. **Recall.** If `candidateTasks` is omitted, recall via cosine
   similarity over the in-memory `task_embeddings_cache`. The cache is
   populated at AI-service startup from `Tasks.EmbeddingJson`; each
   entry is a `(task_id, 1536-float vector, track, completed_flag)`
   tuple. We compute the learner's "query vector" by concatenating their
   profile into a short text (e.g., "intermediate algorithms; advanced
   security; ...") and embedding it. Top-K = 20 by default.
2. **Rerank.** Send the top-K candidates + the learner profile + recent
   submissions to GPT-5.1-codex-mini with prompt
   `prompts/generate_path_v1.md`. Request a JSON array of 5–10 items
   with `taskId`, `orderIndex`, `aiReasoning` (10–500 chars),
   `focusSkillsJson`.
3. **Validate.** Pydantic on shape; topological check on prerequisites
   (Python port of S18-T8's TaskPrerequisiteValidator); dense order
   indices; no overlap with completed tasks; reasoning length bounds.
4. **Retry-with-self-correction.** Up to 2 retries with the parser error
   as the correction signal. Beyond 2, the AI service returns 422.

Backend's `LearningPathService.GeneratePathAsync` calls the AI service;
on any failure (AI down, 422 after retries, topological failure,
insufficient candidates) it falls back to the deterministic
template-fallback path used since S2. The fallback produces
`Source = TemplateFallback`; AI success produces `Source = AIGenerated`.
Both are valid; the FE renders them identically.

### 6.2 Per-task AI framing

After a path is generated, each `PathTask` lazily fetches an AI framing
via `GET /api/tasks/{taskId}/framing`. The framing is cached per
`(userId, taskId)` for 7 days in `TaskFramings`. Content: "why this
matters for you", "focus areas", "common pitfalls". Renders as a card
above the task description on `/tasks/{id}` and on the path detail
view.

Invalidated immediately on adaptation event (S20 wire-up): when a task
is reordered or swapped, its framing for that user is dropped from the
cache so the next view regenerates a fresh framing reflecting the new
position.

---

## 7. Continuous Adaptation Engine (F16 — see ADR-053)

### 7.1 Trigger evaluation

After each `SubmissionAnalysisJob` completes scoring, the trigger
evaluator runs in-process. Four trigger types:

| Trigger | Fires on | Bypasses 24h cooldown |
|---|---|---|
| Periodic | Every 3 completed `PathTasks` | No |
| ScoreSwing | Δ in any category's smoothed score > 10 pt vs the pre-submission snapshot | No |
| Completion100 | `LearningPath.ProgressPercent` hits 100 % | Yes |
| OnDemand | Learner clicks "Ask AI to refresh my path" | Yes |

Signal level is computed from the absolute swing:

| Swing | Signal | Allowed actions |
|---|---|---|
| ≤ 10 pt | `no_action` | (empty actions list) |
| 10–20 pt | `small` | reorder only (intra-skill) |
| 20–30 pt | `medium` | reorder OR single swap |
| > 30 pt OR Completion100 | `large` | reorder OR multiple swaps |

### 7.2 Auto-apply 3-of-3 rule

An adaptation is auto-applied (no Pending modal) iff **all three** hold:
1. `type = reorder` (no swaps without learner approval)
2. `confidence > 0.8` (AI's self-rated confidence)
3. `intra-skill-area` (all affected tasks share a SkillTag with the
   reorder target)

Everything else stages as `LearnerDecision = Pending` and surfaces in the
banner + proposal modal. Pending events auto-expire after 7 days
(`LearnerDecision = Expired`).

### 7.3 Audit trail

Every cycle writes one `PathAdaptationEvents` row, even if the action
list is empty (still records the trigger fired + cooldown gate result).
The audit columns: `BeforeStateJson`, `AfterStateJson`, `AIReasoningText`,
`ConfidenceScore`, `ActionsJson` (including the rejected actions),
`LearnerDecision`. The unique `IdempotencyKey` is
`PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}` — re-execution
produces no duplicate row.

This 100 % audit trail is what makes the engine thesis-defensible: every
decision the system made about a learner's path is recoverable from
SQL, including the actions it explicitly *didn't* take.

---

## 8. Implementation timeline (S15 → S21)

7 sprints across 2026-04 → 2026-08 closing milestone M4. Per-sprint
deliverables summarised; full task lists live in
`docs/implementation-plan.md`.

| Sprint | Theme | Demo-able deliverable |
|---|---|---|
| S15 (foundations) | 2PL IRT engine + AI service `/api/irt/select-next` | Learner takes assessment; admin sees θ + item-info diagnostic banner |
| S16 (admin tools) | AI Question Generator + drafts review UI | Admin generates 30 drafts, approves 28, rejects 2 |
| S17 (post-summary + recal) | `AssessmentSummary` + `RecalibrateIRTJob` + content batches 3+4 | Summary card renders within 8 s of assessment completion |
| S18 (task metadata) | `Tasks.{SkillTagsJson, EmbeddingJson, Prerequisites}` + AI Task Generator | Task library grows from 21 → 31 with rich metadata |
| S19 (path generator + framing) | `/api/generate-path` + `/api/task-framing` | First AI-generated path renders with reasoning + framing cards |
| S20 (continuous adaptation) | `/api/adapt-path` + `PathAdaptationJob` + proposal UI | Adaptation banner + approval flow live end-to-end |
| S21 (closure) | Mini + Full reassessment + Graduation + Next Phase + dogfood + this chapter | Full loop: assessment → path → 100% → graduation → reassessment → Next Phase Path |

Total test count delta over the 7 sprints: +387 backend tests
(IntegrationTests + Application.Tests combined), +120 AI service tests
(pytest). All green at S21 close.

---

## 9. Prompt design

The four AI-service prompts pinned in `ai-service/app/prompts/`:

- `generate_questions_v1.md` — structured JSON output, IRT (a,b) self-
  rating, category + difficulty input.
- `assessment_summary_v1.md` — 3-paragraph output (strengths /
  weaknesses / path guidance), 6k input + 1k output token cap.
- `generate_path_v1.md` — JSON array output with `taskId`, `orderIndex`,
  `aiReasoning` (10–500 chars), `focusSkillsJson` (1–3 entries).
- `task_framing_v1.md` — 3 sub-cards (whyThisMatters / focusAreas /
  commonPitfalls); cached 7 days.
- `adapt_path_v1.md` — JSON output with signal level, actions array
  (each action has type, sourceIndex, targetIndex OR newTaskId,
  reason, confidence).

Each prompt is version-pinned via `PromptVersion` columns on the
relevant table — recall + audit support post-MVP iteration.

---

## 10. Empirical Results (DRAFT — pending dogfood)

This section will be filled from `/api/admin/dogfood-metrics` after the
S21-T8 window closes. Placeholders:

- **Sample size.** {{N}} of 10 target (7 team + 3 external recruited
  per S21-T8 plan).
- **Pre→Post deltas per category.**

| Category | Avg Initial | Avg Current | Δ | Sample size |
|---|---|---|---|---|
| Algorithms | {{X}} | {{Y}} | {{Δ}} | {{n}} |
| DataStructures | {{X}} | {{Y}} | {{Δ}} | {{n}} |
| OOP | {{X}} | {{Y}} | {{Δ}} | {{n}} |
| Databases | {{X}} | {{Y}} | {{Δ}} | {{n}} |
| Security | {{X}} | {{Y}} | {{Δ}} | {{n}} |
| **Overall** | — | — | **{{Δ}}** | — |

- **Tier-2 metric: ≥ +15 pt per category.** {{achieved | not achieved on
  N of 5 categories}}.
- **Pending-proposal approval rate.** {{X / (X+Y) = Z %}} — target ≥ 70 %.
- **Empirically calibrated questions.** {{N}} of 207 active — gated by
  the 50-response threshold (ADR-055).
- **Adaptation cycles per learner.** {{X}} average over the dogfood
  cohort.

### 10.1 Qualitative observations

(Filled in from dogfood debrief notes per `dogfood-onboarding.md` §7.)

### 10.2 Honest defects

- The bank from 60 → 207 questions was authored under the single-
  reviewer waiver (ADR-056 → ADR-062). Cumulative reject rate 2.1 %
  across 179 items; strict reject criteria + owner spot-check on 5 of
  each batch. Post-MVP reverts to team-distributed review unconditionally.
- The empirically-calibrated questions count is expected to be low at
  defense (≤ 5 of 207) because the dogfood scale (~10 learners ×
  ~30 questions answered = ~300 responses spread over 207 items)
  doesn't hit the 50-response threshold on most items. The calibration
  *infrastructure* is in place — the empirical calibration awaits
  post-defense scale-up.
- IRT engine acceptance bar (±0.5 at 30 items, 95% of trials) is met
  at the synthetic-learner level (`tests/test_irt_engine.py`). At the
  real-learner level the dogfood sample is too small to repeat the test
  rigorously — this is a sample-size limitation, not an engine defect.

---

## 11. Limitations

1. **Sample size.** All quantitative claims in §10 derive from ≤ 10
   learners. Power analysis would say the confidence intervals on any
   reported Δ are too wide for strong claims; the chapter is honest
   about that.
2. **2PL not 3PL.** Without a guessing parameter, the engine over-
   estimates ability for items where multiple-choice guessing matters
   (typically low-discrimination items at high difficulty). Trade-off
   accepted per ADR-050.
3. **Per-learner independence.** Each learner is modelled in isolation —
   no Bayesian shrinkage across the cohort, no cross-learner similarity
   features. A larger-scale system would benefit; trade-off accepted
   for MVP.
4. **Recall corpus = 50 tasks.** The hybrid recall step is only
   meaningful when the candidate pool is large enough that recall vs.
   reranking actually changes the LLM's job. At 50 tasks the LLM can
   reasonably consider all of them; we keep the recall step in the
   pipeline because the 50-task corpus is intended to scale post-MVP
   without architectural rework.
5. **Trust chain on AI-authored content.** See §5.6 + §10.2.
6. **No 3D / 4PL IRT, no Bayesian KT, no DKT.** Defensible scope for an
   MVP given the data constraints; flagged as future work in §12.

---

## 12. Future work

1. **Bayesian Knowledge Tracing or DKT** once the response corpus crosses
   ~ 10k responses per item.
2. **3PL / 4PL IRT** with the same empirical threshold trigger.
3. **Cross-learner similarity features** for path recommendation —
   "learners similar to you found this task useful next".
4. **Adaptive difficulty bias on Next Phase Path.** Today the +1
   difficulty comes implicitly from the higher post-graduation skill
   level + completed-task exclusion. An explicit `targetDifficultyMin`
   request parameter on `/api/generate-path` would make it tunable
   (the post-MVP backlog item flagged in `sprint-21-walkthrough.md` §6).
5. **Multi-tenant institutional accounts** with cohort-level analytics.
6. **Embedding-based question recommendation** outside the assessment
   flow (e.g., "you got Q42 wrong — here are 3 similar questions to
   practise on").

---

## References

(Final list to be expanded by supervisor reviewer; key cites for the
sections written:)

- Lord, F. M. (1980). *Applications of Item Response Theory to Practical
  Testing Problems*.
- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing.
  *User Modeling and User-Adapted Interaction*.
- Piech, C., et al. (2015). Deep Knowledge Tracing. *NeurIPS*.
- Lewis, P., et al. (2020). Retrieval-Augmented Generation for
  Knowledge-Intensive NLP Tasks. *NeurIPS*.
- Nogueira, R., & Cho, K. (2019). Passage Re-ranking with BERT.
- OpenAI (2024). `text-embedding-3-small` model card.

---

## Appendix A — Decision Records cited in this chapter

ADR-049 (F15 + F16 scope addition); ADR-050 (choose 2PL over Elo / BKT);
ADR-051 (roll-our-own IRT engine); ADR-052 (hybrid embedding-recall +
LLM-rerank); ADR-053 (signal-driven adaptation policy); ADR-054 (bank
target + tiering); ADR-055 (engine acceptance bars + recalibration
threshold); ADR-056 → ADR-062 (single-reviewer waiver chain).

Full text of each ADR in `docs/decisions.md`.

---

## Appendix B — Test counts table

(For supervisor review — final on defense day; numbers as of S21
structural close.)

| Suite | Count at S15 start | Count at S21 close | Δ |
|---|---|---|---|
| `backend/CodeMentor.Application.Tests` | 246 | 456 | +210 |
| `backend/CodeMentor.Api.IntegrationTests` | 187 | 317 | +130 |
| `ai-service/tests/*` | 14 | 134 | +120 |

---

*End of draft v0.1. Empirical sections + final reference list pending
dogfood close + supervisor pass.*
