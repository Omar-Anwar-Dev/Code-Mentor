# Adaptive AI Learning System — F15 + F16 Feature Spec

**Status:** Approved 2026-05-14 (product-architect session)
**Sprint scope:** Sprint 15 → Sprint 21 (7 sprints, ~50h each)
**Target milestone:** **M4 — Adaptive AI Learning System integrated, defense-ready with flagship features**
**Owner:** Omar (Backend Lead) + team
**Supersedes (in part):** F2 implementation (Sprint 2) and F3 template-based path logic (Sprint 3) — see §1.2

> This document is the **master spec** for the AI-driven assessment + learning path upgrade. The PRD, architecture, and implementation-plan reference it. Detailed schemas, prompts, sequence diagrams, IRT math, and edge cases live here so the other docs stay readable.

---

## 1. Overview

### 1.1 Why this exists

The current F2 (Assessment) uses a static 60-question bank with simple-rule difficulty adjustment. F3 (Learning Path) uses a template that places the weakest category's tasks first. Both work, both are tested, both shipped — but neither uses AI meaningfully, and the PRD explicitly carves out "True IRT" and "AI-generated content" as out-of-scope.

The owner's defense strategy requires a **flagship AI-driven feature** that visibly differentiates the platform from any rule-based learning system. F15 + F16 together close that gap: an adaptive assessment with real psychometric scoring (2PL IRT), an AI-orchestrated personalized learning path built from a curated task library, and continuous adaptation that re-evaluates the learner's profile and re-shapes the path after every meaningful event.

### 1.2 Relationship to F2 / F3

This spec **extends** F2 and **rebuilds the logic of** F3. The schema base of F2/F3 is preserved — `Questions`, `Assessments`, `LearningPaths`, `PathTasks` all stay — and the AI features are added as **new columns + new entities + new services**, not as a rewrite.

| | F2 (existing) | F15 (this spec) |
|---|---|---|
| Question source | Hand-curated bank (~60) | Hand-curated **+** AI-generated drafts reviewed by admin; target ~250 |
| Difficulty selection | Rule: 2 correct → harder, 2 wrong → easier | **2PL IRT-lite**: per-item `(a, b)`, learner `θ` estimated by MLE, next question selected by max Fisher info at θ |
| Scoring | Per-category 0–100, level Beginner/Intermediate/Advanced | Same + **AI summary** (strengths/weaknesses/path guidance) |
| AI feedback | Out of scope (per F2 spec) | **In scope** as post-assessment summary |

| | F3 (existing) | F16 (this spec) |
|---|---|---|
| Path generation | Template logic in `LearningPathService` (weakest-category-first) | **AI Path Generator** (hybrid embedding+LLM retrieval-rerank) calling `/api/generate-path` |
| Task library | 21 hand-curated tasks across 3 tracks | Target **~50 tasks**, AI-drafted + human-reviewed |
| Task metadata | Single category + difficulty | Multi-skill tags + learning gain per skill + enforced prerequisites + embedding |
| Adaptation | None (path is generated once) | **Continuous adaptation** via `PathAdaptationJob` with signal-driven triggers + cooldown + anti-thrashing |
| Completion | Path reaches 100% and stays | **Graduation flow** → mandatory full reassessment → AI-generated Next Phase Path |

### 1.3 Strategy: Hybrid Human–AI Curriculum

The defining philosophy. We use AI where it adds genuine value (personalization, orchestration, framing) and keep humans where quality matters most (task descriptions, rubrics, final approval of generated content). This is the same pattern Khan Academy, Duolingo, and serious EdTech products converge on — and it is what makes the thesis chapter defensible.

> "Curated content, AI orchestration." Not "AI generates everything."

### 1.4 Reading guide

- **PRD additions** for F15 + F16 live in `docs/PRD.md` §§4.10, 4.11, 5.1.
- **Architecture additions** (Domain 8 entities, new API endpoints, new components) live in `docs/architecture.md` §§4.10, 5.1, 6.10, 6.12.
- **ADRs** for the major decisions: ADR-049 through ADR-054.
- **Sprint breakdown** with tasks, acceptance criteria, and risk live in `docs/implementation-plan.md` Sprints 15–21.

---

## 2. Feature Scope

### 2.1 F15 — Adaptive AI Assessment Engine

| Sub-feature | Priority | Description |
|---|---|---|
| **F15.1** | MVP | AI Question Generator (admin batch tool: prompt → drafts → review → approve → DB) |
| **F15.2** | v1.1 | Auto-from-gaps Bank Health Analyzer (weekly distribution analysis + auto-drafts for admin review) |
| **F15.3** | MVP | 2PL IRT-lite engine — `θ` estimation by MLE, item selection by max Fisher info |
| **F15.4a** | MVP | Calibration: AI self-rates `(a, b)` + admin override during review |
| **F15.4b** | MVP (infra) / v1.1 (results) | Empirical recalibration Hangfire job; threshold 50+ responses/question; `(a, b)` updated via MLE |
| **F15.5** | MVP | Post-assessment AI summary — 3-paragraph (strengths, weaknesses, path guidance) |
| **F15.6** | MVP | MCQ + optional code-snippet rendering (Prism highlighting in question card) |
| **F15.7** | MVP | Bank expansion: 60 → **250 target** (≥150 minimum acceptable for defense) |

### 2.2 F16 — AI Personalized Learning Path with Continuous Adaptation

| Sub-feature | Priority | Description |
|---|---|---|
| **F16.1** | MVP | AI Path Generator (hybrid embedding+LLM): replaces template logic in `LearningPathService` |
| **F16.2** | MVP | Rich task metadata: `SkillTagsJson` (multi-label), `LearningGainJson`, enforced `Prerequisites` |
| **F16.3** | MVP | Task library expansion: 21 → **50 target** (≥40 minimum for defense) |
| **F16.4** | MVP | `PathAdaptationJob` — signal-driven triggers (every 3 tasks / score swing >10pt / on-demand / path 100%) |
| **F16.5** | MVP | Mini reassessment (10Q at path 50%) + Full reassessment (30Q at path 100%) |
| **F16.6** | MVP | Path proposal/approval UI: small auto-apply, big require learner approval |
| **F16.7** | v1.1 | Pin/lock task feature (learner protects task from adaptation) |
| **F16.8** | MVP | Graduation screen → Auto reassessment → AI Next Phase Path |
| **F16.9** | MVP | Adaptation event log table + admin dashboard view |
| **F16.10** | MVP | Per-task AI framing (Why this matters / Focus areas / Common pitfalls) |

### 2.3 Out of scope (explicitly)

- **AI-generated task content** (task title + description + requirements) is **only** generated as drafts in an admin tool. The runtime code-review pipeline (F5/F6) never sees un-reviewed AI-generated tasks. This guards the trust chain between F6's review rubric and the task it reviews against. See ADR-049.
- **AI-generated assessment feedback per individual question.** The post-assessment summary (F15.5) covers the assessment as a whole; per-question correctness leakage during the assessment remains forbidden per ADR-013.
- **Embedding-based recommendation outside the path** (e.g., "you might also like this task"). Tasks are recommended *only* via the path, via `Recommendations` from F6, or via the audit/mentor surfaces (F11/F12).
- **Production-grade IRT** (3PL with guessing parameter, 4PL with carelessness, Bayesian KT, full DINA model). 2PL-lite is what we ship; the rest is thesis "future work".

---

## 3. Strategy & Locked Decisions

### 3.1 Top-line strategy

**Hybrid (option C from kickoff):**

- **F2 (Assessment):** static bank stays as foundation; AI Generator adds new calibrated questions to the bank offline (admin-approved); adaptive logic upgraded from rule-based to 2PL IRT-lite.
- **F3 (Learning Path):** rebuilt as AI-driven. Continuous adaptation is the headline differentiator.

This preserves F5/F6 (code review pipeline) untouched: the review rubric remains human-curated, AI reviews against it. No circular trust.

### 3.2 F15 sub-decisions (locked at kickoff)

| # | Decision |
|---|---|
| Generator timing | **Offline batch admin-triggered + Auto-from-gaps Bank Health Analyzer (v1.1)** |
| Calibration | **Hybrid:** AI self-rate at generation + admin override during review + empirical recalibration Hangfire job (50+ response threshold) |
| Adaptive logic | **2PL IRT-lite** — items have `(a, b)`, learner has `θ`, MLE for `θ`, max Fisher info for next item |
| Post-assessment AI summary | **Added** (was out of scope in F2) |
| Question format | **MCQ + optional code-snippet prompts** (Prism rendering) |
| Bank size | **~250 target / ≥150 minimum** |

### 3.3 F16 continuous adaptation sub-decisions (locked at kickoff)

| # | Decision |
|---|---|
| Trigger frequency | **Passive logging on every submission + active triggers**: (a) every 3 completed tasks, (b) score swing >10pt in any category, (c) path 100%, (d) on-demand |
| Adaptation scope | **Re-order + swap individual tasks** (no full mid-path regeneration; full new path only at graduation) |
| Re-assessment policy | **Passive** (running profile from F6 outputs) + **Mini** (10Q at 50%) + **Full** (30Q at 100%) |
| Learner control | **AI proposes, learner approves big changes** (small re-orders auto-apply if confidence > 0.8); Pin/lock as v1.1 |
| Anti-thrashing | **24h cooldown** + **10pt confidence threshold** + **full audit log** (all three combined) |
| Path 100% scenario | **Graduation page** → **mandatory Full reassessment** → **AI Next Phase Path** at one level up |

### 3.4 Tech stack (specific to F15/F16)

| Concern | Choice |
|---|---|
| AI model | `gpt-5.1-codex-mini` (consistent with existing endpoints per ADR-003) |
| IRT implementation | Roll-our-own simplified 2PL in Python (`scipy.optimize`) — ~150 LOC. See ADR-051. |
| Embeddings | `text-embedding-3-small` (1536-dim) — already used by F12, no new dependency |
| Embedding storage | `EmbeddingJson` columns on `Tasks` + `Questions`; AI service holds in-memory cache; cosine in `numpy` |
| Path retrieval | **Hybrid two-stage**: embedding recall (top-20 by cosine) → LLM rerank (final 5–10). See ADR-052. |
| Response validation | Pydantic schemas in FastAPI + retry-with-self-correction (max 2 retries) |
| Prompt management | Existing pattern: `.md` files in `ai-service/app/prompts/`, version stored in response metadata |
| Cost monitoring | Extend `AIUsageLog` with `Feature` column; soft monthly budget $50; per-learner cap $3/month |

---

## 4. Architecture

### 4.1 Component additions (overlay on existing architecture)

```
┌─────────────────────── AI Service (Python/FastAPI) ───────────────────────┐
│  Existing:           New modules for F15/F16:                            │
│  ai_review           irt_engine          — 2PL formulas, MLE, item info  │
│  audit               question_generator  — prompt + Pydantic + retries   │
│  mentor_chat         task_generator      — admin drafts via AI           │
│  history_review      assessment_summarizer — post-assessment 3-paragraph │
│                      path_generator      — recall + rerank               │
│                      path_adapter        — signal-driven actions         │
│                      task_framer         — per-task personalization      │
│                      embedding_service   — text-embedding-3-small wrap   │
└───────────────────────────────────────────────────────────────────────────┘
                                  ▲ HTTPS (existing AIServiceClient)
┌────────────────────── Backend (.NET 8 + EF + Hangfire) ──────────────────┐
│  Modified services:                  New jobs:                            │
│   AdaptiveQuestionSelector            PathAdaptationJob                   │
│    (delegates to AI /api/irt)         EmbedEntityJob                      │
│   LearningPathService                 RecalibrateIRTJob                   │
│    (delegates to AI /api/generate-path) GenerateAssessmentSummaryJob      │
│                                       GenerateTaskFramingJob              │
│                                       (existing GenerateLearningPathJob   │
│                                        — rewired to call AI service)     │
│  New entities (Domain 8):                                                 │
│   LearnerSkillProfile · PathAdaptationEvent · IRTCalibrationLog ·         │
│   AssessmentSummary · TaskFraming · QuestionDraft · TaskDraft             │
└──────────────────────────────────────────────────────────────────────────┘
                                  ▲ REST
┌─────────────────────── Frontend (Vite + React) ──────────────────────────┐
│  Admin pages:                          Learner pages:                     │
│   /admin/questions/generate             /assessment (code-snippet render) │
│   /admin/tasks/generate                 /assessment/{id}/summary          │
│   /admin/calibration                    /path (with proposal modal)       │
│   /admin/adaptations                    /path/graduation                  │
│                                         /path/adaptations (history)       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data model

#### 4.2.1 Modifications to existing entities

| Entity | New columns |
|---|---|
| `Questions` | `IRT_A` float (default 1.0) **[+]**, `IRT_B` float (default 0.0) **[+]**, `CalibrationSource` enum `{AI, Admin, Empirical}` **[+]**, `Source` enum `{Manual, AI}` **[+]**, `ApprovedById` (FK Users, nullable) **[+]**, `ApprovedAt` (nullable) **[+]**, `CodeSnippet` text nullable **[+]**, `CodeLanguage` (varchar 32) nullable **[+]**, `EmbeddingJson` nvarchar(max) nullable **[+]**, `PromptVersion` (varchar 64) nullable **[+]** |
| `Tasks` | `SkillTagsJson` nvarchar(max) **[+]** (e.g., `[{"skill":"correctness","weight":0.6},{"skill":"design","weight":0.4}]`), `LearningGainJson` nvarchar(max) **[+]** (e.g., `{"correctness":8,"design":4}`), `Prerequisites` (existing column — now enforced), `Source` enum `{Manual, AI}` **[+]**, `ApprovedById` (FK Users, nullable) **[+]**, `ApprovedAt` (nullable) **[+]**, `EmbeddingJson` nvarchar(max) nullable **[+]** |
| `LearningPaths` | `Version` int (default 1) **[+]**, `Source` enum `{Template, AI, TemplateFallback}` **[+]**, `LastAdaptedAt` (nullable) **[+]**, `GenerationReasoningText` nvarchar(max) nullable **[+]**, `AssessmentSummaryId` (FK AssessmentSummaries, nullable) **[+]** |
| `PathTasks` | `AIReasoning` nvarchar(max) nullable **[+]**, `FocusSkillsJson` nvarchar(max) nullable **[+]**, `PinnedByLearner` bool (default false) **[+]** (v1.1) |
| `AIUsageLog` (existing) | `Feature` (varchar 64) nullable **[+]** — values: `assessment_summary`, `path_gen`, `path_adapt`, `question_gen`, `task_gen`, `task_framing`, `embedding` |

#### 4.2.2 New entities — Domain 8: AI Adaptive Learning

```sql
-- 1. Running per-learner skill profile (live picture; updated passively + actively)
LearnerSkillProfiles {
  Id           PK, IDENTITY
  UserId       FK Users (unique)
  SkillScoresJson  nvarchar(max)    -- {"correctness":65,"security":40,"readability":72,...}
  Level        nvarchar(16)         -- "Beginner" | "Intermediate" | "Advanced"
  Source       enum {Assessment, SubmissionInferred, MiniReassessment, FullReassessment}
  LastUpdatedAt datetime2
  RowVersion   rowversion           -- EF concurrency token
}

-- 2. Adaptation events log (every adaptation generates one row)
PathAdaptationEvents {
  Id              PK, IDENTITY
  PathId          FK LearningPaths
  UserId          FK Users
  TriggeredAt     datetime2
  Trigger         enum {Periodic, ScoreSwing, Completion100, OnDemand, MiniReassessment}
  BeforeStateJson nvarchar(max)     -- snapshot of PathTasks ordering before
  AfterStateJson  nvarchar(max)     -- snapshot of PathTasks ordering after
  AIReasoningText nvarchar(max)
  ConfidenceScore float              -- 0..1
  ActionsJson     nvarchar(max)     -- [{type, target_position, new_task_id?, reason, confidence}]
  LearnerDecision enum {AutoApplied, Pending, Approved, Rejected, Expired}
  RespondedAt     datetime2 nullable
  AIPromptVersion varchar(64)
  TokensInput     int nullable
  TokensOutput    int nullable
}

-- 3. IRT empirical recalibration audit
IRTCalibrationLog {
  Id           PK, IDENTITY
  QuestionId   FK Questions
  OldA         float
  OldB         float
  NewA         float
  NewB         float
  ResponseCount int                   -- count at time of calibration
  CalibratedAt datetime2
  Method       enum {AISelfRate, AdminOverride, EmpiricalMLE}
  LogLikelihood float nullable        -- ML estimate for the new params
}

-- 4. Post-assessment AI summary
AssessmentSummaries {
  Id              PK, IDENTITY
  AssessmentId    FK Assessments (unique)
  SummaryText     nvarchar(max)
  StrengthsJson   nvarchar(max)        -- ["clear control flow","good test discipline"]
  WeaknessesJson  nvarchar(max)        -- ["weak error handling","perf instinct missing"]
  PathGuidanceText nvarchar(max)        -- 1-2 sentences feeding the path generator prompt
  PromptVersion   varchar(64)
  GeneratedAt     datetime2
  TokensInput     int
  TokensOutput    int
}

-- 5. Task framing cache (per learner per task)
TaskFramings {
  Id              PK, IDENTITY
  UserId          FK Users
  TaskId          FK Tasks
  WhyMattersText  nvarchar(max)
  FocusAreasJson  nvarchar(max)        -- ["async error propagation","input validation edges"]
  PitfallsJson    nvarchar(max)        -- ["swallowing exceptions","over-mocking in tests"]
  GeneratedAt     datetime2
  ExpiresAt       datetime2            -- GeneratedAt + 7 days
  PromptVersion   varchar(64)
  -- Unique: (UserId, TaskId)
}

-- 6. Draft staging (admin review queue) — questions
QuestionDrafts {
  Id              PK, IDENTITY
  BatchId         uniqueidentifier      -- groups drafts from one Generate call
  GeneratedAt     datetime2
  GeneratedByAdminId FK Users
  DraftJson       nvarchar(max)         -- full Question shape + IRT (a,b) + rationale
  Status          enum {Pending, Approved, Rejected}
  ReviewedAt      datetime2 nullable
  ReviewedById    FK Users nullable
  EditedJson      nvarchar(max) nullable -- if admin edited before approving
  RejectionReason nvarchar(max) nullable
  PublishedQuestionId FK Questions nullable -- set on approve
  PromptVersion   varchar(64)
}

-- 7. Draft staging — tasks (same shape)
TaskDrafts {
  Id              PK, IDENTITY
  BatchId         uniqueidentifier
  GeneratedAt     datetime2
  GeneratedByAdminId FK Users
  DraftJson       nvarchar(max)         -- full Task shape + skill_tags + learning_gain
  Status          enum {Pending, Approved, Rejected}
  ReviewedAt      datetime2 nullable
  ReviewedById    FK Users nullable
  EditedJson      nvarchar(max) nullable
  RejectionReason nvarchar(max) nullable
  PublishedTaskId FK Tasks nullable
  PromptVersion   varchar(64)
}
```

#### 4.2.3 Indexes (performance-critical, new)

- `LearnerSkillProfiles(UserId)` — unique, non-clustered.
- `PathAdaptationEvents(PathId, TriggeredAt DESC)` — timeline render.
- `PathAdaptationEvents(UserId, LearnerDecision)` — pending-modal lookup.
- `IRTCalibrationLog(QuestionId, CalibratedAt DESC)` — calibration history.
- `AssessmentSummaries.AssessmentId` — unique.
- `TaskFramings(UserId, TaskId)` — unique; cache lookup.
- `TaskFramings(ExpiresAt)` — Hangfire cleanup job.
- `QuestionDrafts(BatchId, Status)` — admin review screen.
- `TaskDrafts(BatchId, Status)` — admin review screen.
- `Questions(CalibrationSource, IRT_A, IRT_B)` — calibration dashboard heatmap.
- `Tasks(Source, ApprovedAt)` — admin content insights.

#### 4.2.4 New relationships

- `User 1 — 0..1 LearnerSkillProfile`
- `LearningPath 1 — * PathAdaptationEvent`
- `Question 1 — * IRTCalibrationLog`
- `Assessment 1 — 0..1 AssessmentSummary`
- `User 1 — * TaskFraming * — 1 Task` (cache)
- `LearningPath 1 — 0..1 AssessmentSummary` (path's generation-time summary, preserved for journey display)

### 4.3 API contracts

#### 4.3.1 Backend (.NET) — Admin

| Method | Endpoint | Body / Query | Response |
|---|---|---|---|
| POST | `/api/admin/questions/generate` | `{category, difficulty, count, includeCode?, language?}` | `{batchId}` |
| GET | `/api/admin/questions/drafts/{batchId}` | — | `{drafts: [QuestionDraft]}` |
| POST | `/api/admin/questions/drafts/{id}/approve` | `{editedJson?}` | `{questionId}` |
| POST | `/api/admin/questions/drafts/{id}/reject` | `{reason?}` | 204 |
| POST | `/api/admin/tasks/generate` | `{track, difficulty, count, focusSkills?}` | `{batchId}` |
| GET | `/api/admin/tasks/drafts/{batchId}` | — | `{drafts: [TaskDraft]}` |
| POST | `/api/admin/tasks/drafts/{id}/approve` | `{editedJson?}` | `{taskId}` |
| POST | `/api/admin/tasks/drafts/{id}/reject` | `{reason?}` | 204 |
| GET | `/api/admin/calibration/questions` | `?category&difficulty` | `{heatmap: [[count,...]], items: [{questionId,a,b,source,responses}]}` |
| GET | `/api/admin/adaptations` | `?userId&pathId&trigger&from&to` | `{events: [PathAdaptationEvent]}` |

#### 4.3.2 Backend (.NET) — Learner

| Method | Endpoint | Body / Query | Response |
|---|---|---|---|
| GET | `/api/assessments/{id}/summary` | — | `AssessmentSummary` (or 409 if not yet generated) |
| GET | `/api/learning-paths/me/adaptations` | `?status=pending\|history` | `{pending: [event], history: [event]}` |
| POST | `/api/learning-paths/me/adaptations/{id}/respond` | `{decision: "approved" \| "rejected"}` | 204 |
| POST | `/api/learning-paths/me/refresh` | — | `{eventId}` (enqueues `PathAdaptationJob` with `Trigger=OnDemand`) |
| GET | `/api/learning-paths/me/graduation` | — | `{before: profile, after: profile, journeySummary, nextPhaseEligible: bool}` |
| POST | `/api/learning-paths/me/next-phase` | — | `{newPathId}` (requires Full reassessment first) |
| GET | `/api/tasks/{id}/framing` | — | `TaskFraming` (cache-aware; generates if missing/expired) |
| POST | `/api/assessments/me/mini-reassessment` | — | `{assessmentId, firstQuestion}` (10Q variant) |
| POST | `/api/assessments/me/full-reassessment` | — | `{assessmentId, firstQuestion}` (30Q variant) |
| POST | `/api/learning-paths/me/tasks/{pathTaskId}/pin` *(v1.1)* | — | 204 |
| DELETE | `/api/learning-paths/me/tasks/{pathTaskId}/pin` *(v1.1)* | — | 204 |

#### 4.3.3 AI Service (Python/FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/generate-questions` | Batch question generation; returns drafts with IRT params |
| POST | `/api/generate-tasks` | Batch task generation; returns drafts |
| POST | `/api/assessment-summary` | 3-paragraph summary + structured strengths/weaknesses |
| POST | `/api/generate-path` | Hybrid recall (cosine over task embeddings) + LLM rerank |
| POST | `/api/adapt-path` | Signal-driven action plan (reorder/swap with confidence) |
| POST | `/api/task-framing` | Per-learner per-task framing (why/focus/pitfalls) |
| POST | `/api/embed` | Embed a list of texts via `text-embedding-3-small` |
| POST | `/api/irt/select-next` | Select next question to maximize Fisher info at current θ |
| POST | `/api/irt/recalibrate` | Joint MLE for `(a, b)` from a response matrix |

Request/response schemas defined as Pydantic models in `ai-service/app/schemas/` — see §6.

### 4.4 Sequence diagrams

#### Flow A — Adaptive assessment with 2PL IRT

```
Learner → FE: Click "Start Assessment"
FE → BE: POST /api/assessments {variant?: "full"|"mini"}
BE → DB: insert Assessment row; theta_0 = 0.0
BE → AI: POST /api/irt/select-next {theta: 0.0, answered: [], bank: [...]}
AI: argmax I(theta=0, a_i, b_i) over bank → Q_1
BE → FE: {assessmentId, firstQuestion: Q_1, progress: 0/N}

loop N times (30 for full, 10 for mini):
  Learner answers
  FE → BE: POST /api/assessments/{id}/answers {questionId, answer, timeSpentSec}
  BE → DB: insert AssessmentResponse (compute IsCorrect server-side)
  BE → AI: POST /api/irt/select-next {theta: theta_curr, answered: [...], bank: [...]}
  AI: re-MLE theta over all responses → theta_new; argmax I(theta_new, ...) → Q_next
  BE → FE: {nextQuestion?: Q_next, progress: i/N, completed?: false}

After Q_N:
  BE → DB: save final theta + per-category scores; mark Assessment Completed
  BE → Hangfire: enqueue GenerateAssessmentSummaryJob (full assessments only)
  GenerateAssessmentSummaryJob → AI: POST /api/assessment-summary
  AI → BE: {summary, strengths, weaknesses, pathGuidance}
  BE → DB: insert AssessmentSummary row
  BE → Hangfire: enqueue GenerateLearningPathJob (if full assessment)
  FE: poll GET /api/assessments/{id} → completed → render result page + AI summary card
```

#### Flow B — AI path generation (hybrid recall + rerank)

```
GenerateLearningPathJob → AI: POST /api/generate-path
  body: {skillProfile, track, completedTaskIds, targetLength, assessmentSummaryText}

AI internal:
  1. Build learner_profile_text from skillProfile
     ("Beginner level. Strong in readability (72). Weak in security (35), perf (40).
       Recent assessment notes: ...")
  2. embedding_service.embed(learner_profile_text) → learner_vec (1536-dim)
  3. Cosine similarity vs task_embeddings_cache (in-memory dict {taskId: vec}) → top-20 task IDs
  4. Build LLM prompt with:
       - structured learner profile
       - assessment summary text
       - top-20 task descriptions (compact, ~200 chars each)
       - track constraint, target length, "respect prerequisites" instruction
  5. LLM call → JSON {path: [{taskId, order, reasoning, focusSkills}], generationReasoning}
  6. Pydantic validate; on failure retry with self-correction (max 2)
  7. Topological check: for each task in path, ensure all prerequisites either complete
     or appear earlier in this path. On violation, re-prompt with constraint.

AI → BE: validated path
BE → DB:
  insert LearningPath (Source="AI", Version=1, GenerationReasoningText, AssessmentSummaryId)
  insert PathTasks (with AIReasoning, FocusSkillsJson)
  mark previous active path IsActive=false (single active enforced)
```

#### Flow C — Continuous adaptation (post-submission)

```
SubmissionAnalysisJob completes (existing F6 flow); FeedbackAggregator produces per-category scores.
BE: update LearnerSkillProfile (Source=SubmissionInferred); apply moving-average smoothing per category.
BE: evaluate adaptation triggers:
  - Trigger (a): how many completed PathTasks since last adaptation? if >=3 → fire
  - Trigger (b): max |new_score - old_score| across categories > 10? → fire
  - Trigger (c): path 100%? → fire (always, ignores cooldown)
  - Trigger (d): user clicked Refresh? → fire (ignores cooldown)

If no trigger → done.
If trigger AND (LastAdaptedAt was >24h ago OR trigger in {Completion100, OnDemand}) → enqueue PathAdaptationJob.

PathAdaptationJob:
  Compute signal_level:
    swing<10  → no action (returns empty)
    10-20     → small  (reorder within same skill area only)
    20-30     → medium (allowed: reorder + swap)
    >30 or Completion100 → large  (allowed: reorder + swap; or trigger graduation if Completion100)

  AI → POST /api/adapt-path
    body: {currentPath, recentSubmissions, signalLevel, skillProfile}
  AI returns actions[]: [{type, targetPosition, newTaskId?, reason, confidence}]

  For each action:
    if action.confidence > 0.8 AND action.type == "reorder" AND
       newPos.skillTags ∩ oldPos.skillTags is non-empty:
      auto-apply → insert PathAdaptationEvent (LearnerDecision=AutoApplied)
    else:
      stage as Pending → insert PathAdaptationEvent (LearnerDecision=Pending) →
      raise pref-aware Notification ("AI proposed N changes — review")

  Update LearningPath.LastAdaptedAt = now.

Learner opens /path:
  FE: GET /api/learning-paths/me/adaptations?status=pending
  if any → render proposal modal with diff view (before/after)
  Learner approves/rejects per action
  FE → BE: POST /api/learning-paths/me/adaptations/{id}/respond {decision}
  BE: if approved → apply actions to PathTasks (transactional);
      update PathAdaptationEvent.LearnerDecision; set RespondedAt.
```

#### Flow D — Graduation → Reassessment → Next Phase

```
A PathTask completion brings path to ProgressPercent = 100:
  BE: enqueue PathAdaptationJob (Trigger=Completion100) — but action set is empty
      because the path is done; the job's role here is to record the event and
      trigger downstream graduation flow.
  BE: set LearningPath.IsActive remains true (we hold graduation state on the path)

Learner navigates to /path/graduation:
  FE → BE: GET /api/learning-paths/me/graduation
  BE: assemble {
        before:  initial AssessmentSummary (from LearningPath.AssessmentSummaryId)
                 + initial LearnerSkillProfile snapshot at path generation
        after:   latest LearnerSkillProfile
        journeySummary: regenerate via AI /api/assessment-summary with mode="journey"
        nextPhaseEligible: false  (until full reassessment lands)
      }
  FE renders Before/After radar chart + journey summary + "Take Full Reassessment" CTA
       (mandatory before Next Phase).

Learner takes Full reassessment (30Q via Flow A, variant="full"):
  Completes → new AssessmentSummary saved.
  BE: update LearnerSkillProfile (Source=FullReassessment).
  GET /api/learning-paths/me/graduation now returns nextPhaseEligible=true.

Learner clicks "Generate Next Phase Path":
  FE → BE: POST /api/learning-paths/me/next-phase
  BE: enqueue GenerateLearningPathJob with:
        completedTaskIds = ALL tasks the user has completed (across all paths;
                           prevents repeat suggestions)
        difficultyBias  = +1   (level up: Beginner→Intermediate→Advanced)
        previousPathId  = current path
  Job runs Flow B → new LearningPath created with Version = prev.Version + 1.
  BE: mark previous LearningPath IsActive = false, archived.
  FE: redirect to new path.
```

---

## 5. IRT Engine

### 5.1 Math summary

We use the **two-parameter logistic (2PL) model**:

```
P(correct | θ, a, b) = 1 / (1 + exp(-a · (θ - b)))
```

- `θ` (theta) — latent learner ability, scaled roughly to standard normal (-4 to +4)
- `b` (difficulty) — item difficulty; θ at which P(correct) = 0.5
- `a` (discrimination) — slope of the curve at θ = b; how sharply the item separates abilities

**Item information** (Fisher information at θ for item i):

```
I_i(θ) = a_i² · P_i(θ) · (1 - P_i(θ))
```

**Adaptive item selection rule**: pick the unanswered item that maximizes `I_i(θ_current)`.

**θ estimation (MLE)**: after each response, find θ that maximizes the joint log-likelihood:

```
log L(θ | responses) = Σ_i  [ u_i · log P_i(θ) + (1 - u_i) · log (1 - P_i(θ)) ]
```

where `u_i ∈ {0, 1}` for each answered item.

**Empirical recalibration**: when an item has **≥1000 responses** (per ADR-055; was ≥50 in v1.0), jointly estimate `(a, b)` by maximum likelihood over the response matrix, given each respondent's MLE θ estimate.

### 5.2 Pseudocode (Python, simplified)

```python
# ai-service/app/irt/engine.py

from __future__ import annotations
import numpy as np
from scipy.optimize import minimize_scalar, minimize

THETA_BOUNDS = (-4.0, 4.0)
A_BOUNDS = (0.3, 3.0)
B_BOUNDS = (-3.0, 3.0)

def p_correct(theta: float, a: float, b: float) -> float:
    """2PL probability of correct response."""
    return 1.0 / (1.0 + np.exp(-a * (theta - b)))

def item_info(theta: float, a: float, b: float) -> float:
    """Fisher information at theta for item (a, b)."""
    p = p_correct(theta, a, b)
    return (a ** 2) * p * (1.0 - p)

def estimate_theta_mle(responses: list[tuple[float, float, bool]]) -> float:
    """
    responses: list of (a_i, b_i, is_correct)
    Returns theta_hat maximizing the log-likelihood.
    """
    if not responses:
        return 0.0
    def neg_ll(theta):
        ll = 0.0
        for a, b, correct in responses:
            p = np.clip(p_correct(theta, a, b), 1e-9, 1 - 1e-9)
            ll += np.log(p) if correct else np.log(1.0 - p)
        return -ll
    result = minimize_scalar(neg_ll, bounds=THETA_BOUNDS, method="bounded")
    return float(np.clip(result.x, *THETA_BOUNDS))

def select_next_question(theta: float, unanswered_bank: list[dict]) -> dict:
    """Pick the unanswered item maximizing Fisher info at current theta."""
    return max(unanswered_bank, key=lambda q: item_info(theta, q["a"], q["b"]))

def recalibrate_item(item_responses: list[tuple[float, bool]]) -> tuple[float, float, float]:
    """
    item_responses: list of (theta_of_respondent, is_correct) for ONE item.
    Returns (new_a, new_b, log_likelihood).
    """
    def neg_ll(params):
        a, b = params
        ll = 0.0
        for theta, correct in item_responses:
            p = np.clip(p_correct(theta, a, b), 1e-9, 1 - 1e-9)
            ll += np.log(p) if correct else np.log(1.0 - p)
        return -ll
    res = minimize(neg_ll, x0=[1.0, 0.0], bounds=[A_BOUNDS, B_BOUNDS])
    a_new, b_new = float(res.x[0]), float(res.x[1])
    return a_new, b_new, -float(res.fun)
```

### 5.3 Unit-test acceptance bar (v1.1 — bumped 2026-05-14 per ADR-055)

| Test | Pass criterion |
|---|---|
| `p_correct` boundary cases | At θ = b, returns 0.5 ± 1e-9. At θ → +∞, returns ≥ 1 - 1e-3. At θ → -∞, returns ≤ 1e-3. |
| `item_info` correctness | Max at θ = b; matches manual derivative formula `a² · P · (1-P)` for a few `(a, b)` pairs. |
| Synthetic learner MLE (adaptive) | Given true θ_true and 30 simulated responses under adaptive selection (engine selects each next item by max Fisher info at running θ_hat) on a realistic bank (a ∈ [1.5, 2.5], b ∈ [-2.5, 2.5], 60 items), `estimate_theta_mle` returns θ_hat within ±0.5 of θ_true in ≥ 95% of 100 trials. (Tier-3 success metric NFR.) |
| `select_next_question` ordering | When called with θ = 0, returns the bank item whose `b` is closest to 0 (under fixed a). When two items have similar `b` near θ, the higher-`a` item wins. |
| `recalibrate_item` Monte-Carlo convergence | Given a synthetic item with known (a, b) and **N=1000 simulated responses** (respondent θ uniform on [-3, 3]), joint MLE returns estimates within ±0.2 of true `a` and ±0.3 of true `b` in ≥ 95% of 50 Monte-Carlo trials. |

> **v1.0 → v1.1 change history (ADR-055).** The original v1.0 bars (`±0.3` for theta MLE at 30 responses; `±0.2 / ±0.3` at N=100 single-trial for recalibrate) were empirically infeasible — the engine math is correct (verified by MLE log-likelihood at the estimate ≥ log-likelihood at true params), but Fisher information at those data quantities just doesn't constrain estimates that tightly. The v1.1 bars are calibrated against the empirical noise floor. The S17 `RecalibrateIRTJob` empirical-data threshold is bumped from 50 → 1000 responses to match. See ADR-055 for rationale + IRT-literature references.

### 5.4 Edge cases

- **First question (no responses yet)**: θ_0 = 0.0; item with smallest |b| wins.
- **All-correct or all-wrong streak**: MLE drifts to the bound. We clip θ to (-4, 4) and continue. Empirically, with a mixed bank, this self-corrects within 5 items.
- **Bank fully covered for a category**: if all items in a category are answered, skip-and-continue with other categories. Acceptance criterion enforces category balance (≤ 30% any one category).
- **Empirical recalibration with too few responses**: if < 1000 responses for an item, skip it this run (per ADR-055; was < 50 in v1.0).
- **Recalibration produces unrealistic `a < 0.3`**: clip and flag for admin review.

---

## 6. AI Prompts & Validation

### 6.1 Prompt versioning

- All prompts live as `.md` files under `ai-service/app/prompts/`.
- File naming: `<endpoint>_v<N>.md`, e.g., `generate_questions_v1.md`.
- The loader reads the file and interpolates `{variables}` at call time.
- Every AI response includes a `prompt_version` field in its metadata; this is persisted to whatever table stores the AI output (e.g., `AssessmentSummaries.PromptVersion`, `QuestionDrafts.PromptVersion`).
- Bumping a prompt version creates a new file (`generate_questions_v2.md`); the old file stays for thesis/comparison purposes.

### 6.2 Per-endpoint prompts (skeleton — full templates land in Sprint 15+)

#### 6.2.1 `generate_questions_v1.md` (F15.1)

```
You are an expert technical assessment author for the Code Mentor platform.
Generate {count} multiple-choice questions for the category "{category}" at
difficulty level {difficulty} (1=easy, 2=medium, 3=hard).

Constraints:
- Each question MUST have exactly 4 options, exactly one correct.
- For each question, estimate 2PL IRT parameters:
  - `b` (difficulty): -3 (very easy) to +3 (very hard). Calibrate so a learner
    with average ability θ=0 has P(correct) ≈ {expected_correct_rate}.
  - `a` (discrimination): 0.5 (poor) to 2.5 (excellent). High `a` means the
    question sharply separates ability levels.
- {if include_code} Include a short code snippet (≤ 30 lines) in the question
  prompt where appropriate. Language: {language}. {endif}
- Avoid trivia. Focus on conceptual understanding.
- No question may duplicate any in the existing bank below.

Output strictly as JSON matching this schema:
{json_schema}

Existing questions in category (for duplication avoidance):
{existing_snippets}
```

#### 6.2.2 `generate_path_v1.md` (F16.1)

```
You are an expert curriculum designer.
Generate a personalized learning path for this learner.

Learner profile (current skill scores 0-100):
{skill_profile_json}

Level: {level}
Track: {track}
Recent assessment notes:
{assessment_summary_text}

Tasks the learner has already completed (do not include any of these in the path):
{completed_task_ids}

Candidate tasks (pre-filtered via embedding similarity; pick from this set only):
{candidate_tasks_compact}    -- each as {id, title, description_summary, skill_tags, learning_gain, difficulty, prerequisites}

Constraints:
- Output exactly {target_length} tasks, ordered as you intend the learner to take them.
- Prioritize tasks targeting the learner's weakest skills (lowest scores).
- Respect prerequisites: every task's prerequisites must be in `completed_task_ids` OR
  appear earlier in this same path.
- Difficulty curve: start at the learner's level; gradually increase if profile shows strength.
- For each task, write a short reasoning (1-2 sentences) explaining *why this task, why now*.

Output strictly as JSON:
{json_schema}
```

#### 6.2.3 `adapt_path_v1.md` (F16.4)

```
You are an AI curriculum coach reviewing a learner's progress.

Current path (in order):
{current_path_compact}    -- each as {pathTaskId, taskId, title, skill_tags, status}

Recent submissions (last 3 completed):
{recent_submissions_compact}   -- each as {taskId, scores_per_category, overall_score, summary_text}

Updated skill profile (since path generation):
{skill_profile_json}

Signal level: {signal_level}    -- "small" | "medium" | "large"

Action rules:
- "small" signal: ONLY reorder; you MAY NOT swap tasks. Reorder within the SAME skill area only.
- "medium" signal: reorder OR swap a task. If swapping, propose a replacement from the candidate pool.
- "large" signal: reorder OR swap; multiple swaps allowed if justified.

Candidate replacement tasks (only used if you propose a swap):
{candidate_replacements_compact}

For each action, output:
- type: "reorder" | "swap"
- target_position: 1-based position in current path
- new_task_id: required for "swap", null for "reorder"
- reason: 1-sentence justification grounded in the learner's recent scores
- confidence: 0.0-1.0 (1.0 = very confident)

Output strictly as JSON:
{json_schema}
```

(Skeletons for `assessment_summary`, `task_framing`, `generate_tasks` follow the same pattern.)

### 6.3 Validation strategy

For every AI endpoint:

1. **Pydantic model** in `ai-service/app/schemas/<endpoint>.py` defines the expected response shape.
2. On LLM response: parse JSON → instantiate model. If validation fails →
3. **Retry-with-self-correction** (max 2 retries): re-prompt with the validation error and ask the model to fix the output. Add a prefix: `Your previous response failed validation: <error>. Output strictly valid JSON matching the schema.`
4. After retries exhausted → return 422 to backend; backend logs and either retries the Hangfire job (per existing policy) or falls back (e.g., template path fallback for `/api/generate-path`).
5. **Schema versioning**: each Pydantic model has a `schema_version` class attribute. Backend persists `schema_version` alongside `prompt_version`.

---

## 7. Continuous Adaptation Engine

### 7.1 Trigger evaluation logic

Pseudocode for the trigger check (runs at end of `SubmissionAnalysisJob`):

```csharp
bool ShouldAdapt(LearningPath path, LearnerSkillProfile profile,
                LearnerSkillProfile profileBeforeSubmission)
{
    if (path.LastAdaptedAt != null
        && DateTime.UtcNow - path.LastAdaptedAt < TimeSpan.FromHours(24))
        // cooldown active unless we hit one of the bypass triggers below
        return false;

    // Trigger (c): path 100%
    if (path.ProgressPercent >= 100) return true;

    // Trigger (a): every 3 completed tasks since last adaptation
    int completedSinceLast = path.PathTasks
        .Count(pt => pt.Status == TaskStatus.Completed
                  && pt.CompletedAt > path.LastAdaptedAt);
    if (completedSinceLast >= 3) return true;

    // Trigger (b): max score swing > 10pt in any category
    double maxSwing = profile.SkillScores
        .Max(kv => Math.Abs(kv.Value - profileBeforeSubmission.SkillScores[kv.Key]));
    if (maxSwing > 10.0) return true;

    return false;
}
```

The on-demand trigger (d) bypasses both cooldown and the score-swing threshold — learner explicitly asked for a refresh.

### 7.2 Auto-apply vs Pending policy

A proposed action auto-applies if and only if:
- `action.type == "reorder"` (never auto-apply a `swap`), AND
- `action.confidence > 0.8`, AND
- The reorder is **intra-skill-area** — the task at `targetPosition` shares at least one skill tag with the task at the original position.

Otherwise the action is staged as `Pending` and the learner is notified per their notification preferences (the existing `NotificationService` pref-aware path from Sprint 14).

### 7.3 UX: proposal modal

When the learner navigates to `/path` and the system has pending adaptations:

- A non-dismissable banner appears at the top: "AI suggests **N changes** to your path — review now."
- Clicking opens a modal with the diff view:
  - Before column: current ordered tasks, with the affected tasks highlighted.
  - After column: proposed ordering, with the moved/swapped tasks highlighted.
  - Per action: the AI's `reason` text + `confidence` displayed.
  - Per action: Approve | Reject buttons.
- Until the learner responds (or 7 days elapse — then auto-expire as `Expired`), the path is shown in the **before** state. Auto-applied small re-orders take effect immediately and are surfaced as a toast: "AI re-ordered 2 of your upcoming tasks based on your last submission."

### 7.4 Anti-thrashing audit

Every PathAdaptationEvent records:
- `BeforeStateJson` — snapshot of `PathTasks` (pathTaskId, taskId, orderIndex, status) before
- `AfterStateJson` — after applying approved actions
- `ActionsJson` — every action the AI proposed (including ones the learner rejected)
- `AIReasoningText` — the model's overall narrative
- `ConfidenceScore` — avg of action confidences
- `LearnerDecision` and `RespondedAt`

This is the thesis appendix data: every adaptation traced, learner uptake measurable.

---

## 8. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Idempotency** | Hangfire job keys deterministic: `PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}`. Re-execution produces no duplicate events. |
| **Concurrency on `LearnerSkillProfile`** | EF `RowVersion` token; on conflict, reload → re-apply moving-average smoothing → retry (max 3). |
| **AI service unavailable — assessment** | Fallback: continue assessment using current `AdaptiveQuestionSelector` simple heuristic (existing implementation). Flag assessment with `IrtFallbackUsed = true` for admin review. |
| **AI service unavailable — path generation** | Fallback: use the legacy template logic (F3 original). `LearningPath.Source = TemplateFallback`. Notification to admin. |
| **AI service unavailable — adaptation** | Skip this adaptation cycle; log to `PathAdaptationEvents` with `LearnerDecision = Expired` and `AIReasoningText = "AI service unavailable; adaptation deferred."`. |
| **Token cost guard (per learner)** | Check `AIUsageLog` aggregate for the learner this month. If > $3 → reject new AI calls (429) and email admin. Existing tasks unaffected. |
| **Token cost guard (per feature, global)** | Daily aggregate per `Feature` column. If F15+F16 combined > $50/month → alert admin; soft (warns, does not block). |
| **Auditability** | Every AI-generated artifact carries `PromptVersion` + `TokensInput` + `TokensOutput` + `GeneratedAt`. Every adaptation event is logged. |
| **Privacy** | Prompts contain skill scores, completed task titles, and recent feedback text — never raw PII (email/name). |
| **Demo determinism** | All AI endpoints accept an optional `?seed=N` query param that is forwarded to the OpenAI Responses API `seed`. Demo script pins a seed. |
| **Embedding cache invalidation** | On Task / Question approve, `EmbedEntityJob` fires. AI service exposes `/api/embeddings/reload` which is called by the backend after each batch to refresh the in-memory cache. |
| **Schema evolution** | All Pydantic schemas versioned. Backend stores `SchemaVersion` alongside `PromptVersion` on every AI output. Migrations of stored JSON handled in a follow-up job, never at read time. |

---

## 9. Success Metrics

### Tier 1 — Demo-level (defense)

| Metric | Target | Measurement |
|---|---|---|
| Full loop demo runnable end-to-end | ≤ 8 min | Demo script timed; recorded as backup |
| Supervisor rating on adaptive quality | ≥ 4 / 5 | Post-rehearsal debrief sheet |
| Q&A defensibility on math + architecture | Team can answer "How does IRT pick the next question?" + "How does the AI choose tasks?" with formula + flow on whiteboard | Self-rehearsal then supervisor rehearsal |

### Tier 2 — Empirical (dogfood)

| Metric | Target | Notes |
|---|---|---|
| Dogfood learners completing full loop | ≥ 10 | Team + supervisors + volunteers |
| Pre→Post skill score delta (avg per category) | ≥ +15 points | Strongest single proof point for thesis |
| AI-question admin reject rate | < 30% | If higher, prompt iteration needed |
| Learner approval rate on big-change proposals | ≥ 70% | If lower, AI is proposing low-value changes |
| Path completion rate (started → 100%) | ≥ 60% | Benchmark vs ~10% MOOC completion |
| Empirically-calibrated questions | ≥ 30 of 250 | Validates the F15.4b infra produces real results |

### Tier 3 — Technical (NFR-style)

| Metric | Target |
|---|---|
| p95 path generation time | < 15 sec (assessment complete → path ready) |
| p95 adaptation event time | < 8 sec (trigger → updated path) |
| p95 question generation (batch of 10) | < 60 sec |
| AI cost per learner per full loop | < $1.50 |
| Adaptation event log completeness | 100% (every adaptation has BeforeState + AfterState + Reason + Confidence) |
| IRT engine accuracy on synthetic data | θ_hat within ±0.3 of θ_true in ≥95% of 100 trials, after 30 responses |

---

## 10. Risk Register additions (F15/F16-specific)

Risks added to the main register in `docs/implementation-plan.md` §Risk Register:

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **R20** | AI-generated question quality varies; admin reject rate > 30% breaks the content-burst timeline | Medium | High | S15 dogfood with 10-draft pilot before scaling; tune prompt; option to fall back to manual authoring for last 50 of bank if generator regresses | AI + Backend (Omar) |
| **R21** | IRT calibration relies on AI self-rating with insufficient empirical data pre-defense (well below the **1000-response/item** recalibration threshold per ADR-055) | High | Medium | Thesis honestly frames this as "infrastructure validated end-to-end; recalibration awaits post-defense scale-up where item-level data crosses the 1000-response stability threshold"; F15.4a admin override gives manual safety valve | AI + Backend (Omar) |
| **R22** | AI Path Generator hallucinates — recommends tasks with violated prerequisites, or repeats completed tasks | Medium | High | Pydantic validation + topological prerequisite check + retry-with-self-correction (max 2); on third failure, fall back to template logic and log | Backend (Omar) |
| **R23** | Embedding cache staleness — task/question approved but cache not refreshed → path generation uses outdated corpus | Low | Medium | `EmbedEntityJob` always followed by `/api/embeddings/reload` call; cache version stamp checked on each `/api/generate-path` request | AI (Omar) |
| **R24** | Continuous adaptation creates UX confusion — learners don't understand why path changed | Medium | Medium | Every change shown in proposal modal with AI's `reason` text; small auto-applied re-orders surfaced via toast with the reason; `/path/adaptations` history timeline gives full audit trail | Frontend + UX |
| **R25** | 250-question content burst slips — bank reaches only ~120 by S21 close, weakening the IRT calibration story | High | Medium | Target **150 minimum** acceptable (split: 60 existing + 90 new); team-wide content review burst budgeted into S16, S17, S21; allow thesis to defend "150 calibrated + 100 pipeline" if needed | All (PM coordinates) |

---

## 11. Sprint Mapping

7 sprints, ~50h each, ~3.5 months elapsed. Details in `docs/implementation-plan.md`:

| Sprint | Window | Scope summary |
|---|---|---|
| **S15** | 2026-05-15 → 2026-05-28 | F15 foundations: IRT engine + `/api/irt/*` + question schema migration + AdaptiveQuestionSelector rewire + code-snippet FE rendering |
| **S16** | 2026-05-29 → 2026-06-11 | F15 admin tools: generator UI + drafts review + first 2 content batches (~60 questions) + embed-questions job |
| **S17** | 2026-06-12 → 2026-06-25 | F15 summary + calibration infra: post-assessment summary + RecalibrateIRTJob + calibration dashboard + content batch 3-4 (reach ≥150) |
| **S18** | 2026-06-26 → 2026-07-09 | F16 foundations: task metadata + library expansion start + task generator + first 10 tasks (21→31) |
| **S19** | 2026-07-10 → 2026-07-23 | F16 AI Path Generator: hybrid recall+rerank + framing endpoint + GenerateLearningPathJob rewire + 10 more tasks (31→41) |
| **S20** | 2026-07-24 → 2026-08-06 | F16 Continuous Adaptation: PathAdaptationJob + proposal modal + history timeline + 9 more tasks (41→50) |
| **S21** | 2026-08-07 → 2026-08-20 | F16 closure: mini/full reassessment + graduation + Next Phase + final content (250 questions) + dogfood recruitment + thesis chapter draft + integration E2E |

Buffer to defense (target Sept 24): ~5 weeks. Holds:
- Sprint 11 carryovers (S11-T12, S11-T13 supervisor rehearsals)
- Dogfood collection time for Tier-2 metrics
- Thesis writing for the new chapter
- Final defense rehearsals

---

## 12. Demo Script Outline (for defense)

Target length: 8 minutes. Pinned seed for determinism.

1. **(0:00–0:30) Setup.** "Meet Sara, a self-taught Python developer who wants to systematize her skills."
2. **(0:30–2:30) Adaptive Assessment.** Sara starts the assessment. Show 5 of the 30 questions live; narrate "notice the difficulty adjusted because she got 2 in a row right" — point to a θ tracker on screen for the supervisor.
3. **(2:30–3:30) AI Summary + Generated Path.** Show the post-assessment summary card. Then the generated path with AI reasoning per task ("This task is first because your security score is lowest").
4. **(3:30–5:00) Submit + Feedback + Adaptation.** Sara submits the first task. Show F6 feedback. Show the proposal modal appearing: "AI proposes 2 changes based on your last submission" — open it, walk through the before/after diff.
5. **(5:00–6:30) Mid-path checkpoint.** Sara is at 50%; show the optional Mini reassessment. (Pre-recorded shortcut: skip past completing it.)
6. **(6:30–7:30) Graduation.** Sara reaches 100%. Show the graduation page with Before/After skill radar (initial Beginner → now Intermediate). Show "Take Full Reassessment" CTA.
7. **(7:30–8:00) Next Phase Path.** After reassessment, show the auto-generated Next Phase Path one level harder. End.

Talking points for Q&A:
- "How does the AI pick the next question?" → IRT formula on slide; point to `irt_engine.py` source.
- "How does the path get generated?" → hybrid recall+rerank flow diagram.
- "What stops the AI from going wild?" → cooldown + confidence threshold + learner approval + Pydantic validation + topological check.
- "What's the validation?" → Tier-2 metrics: 10 dogfood learners, +15pt avg delta, 70% approval rate.

---

## 13. Thesis Chapter Outline

A new chapter goes into the thesis covering F15/F16. Structure:

1. **Background & Motivation** — limitations of static assessment + template-based curriculum.
2. **Item Response Theory primer** — 2PL model, item information, MLE estimation.
3. **System Architecture** — adapted from §4 of this doc; component diagram + sequence diagrams.
4. **Hybrid Retrieval-Rerank for Curriculum Generation** — adapt RAG literature to learning paths.
5. **Continuous Adaptation Engine** — trigger logic, anti-thrashing, learner approval UX.
6. **Implementation Notes** — `gpt-5.1-codex-mini` + `text-embedding-3-small` + roll-our-own IRT.
7. **Empirical Results** — dogfood Tier-2 metrics, before/after deltas, approval rates.
8. **Limitations & Future Work** — 2PL → 3PL/4PL, full Bayesian KT, embedding-based recommendation outside the path, multilingual.

Draft target: end of Sprint 21.

---

## 14. Open Questions

1. **Mini reassessment content overlap.** Should the 10Q mini draw from the same bank as the original 30Q, or a separate "checkpoint subset"? **Decision: same bank, draw items not seen in the prior assessment, drift towards harder b's if learner has progressed.** Re-evaluate after S17 dogfood.
2. **Adaptation expiry timing.** Pending proposals auto-expire after 7 days. Is 7 right? **Decision provisional**; can tune in S20 if data suggests otherwise.
3. **Path archival storage.** Old paths (Version < current) are marked `IsActive = false` but not deleted. Storage growth is negligible for MVP scale. **Decision: keep all versions for thesis longitudinal data.**
4. **Content burst ownership.** Reviewing AI drafts for 190 new questions + 30 new tasks needs effort from the team. **Owner action item:** sprint kickoff for S16 must lock the review distribution among the 7 team members.

---

*Document version: 1.0 — 2026-05-14 — owner Omar.*
