# Code Mentor — System Architecture

**Platform:** AI-Powered Learning & Code Review Platform
**Team:** Benha University, Faculty of Computers and AI, Class of 2026
**Document status:** Execution-ready architecture (reconciled with real implementations)
**Supersedes:** Academic documentation Chapter 4 where sections are marked "**[Updated]**."

---

## 1. Overview

Code Mentor is a **three-tier, service-oriented web platform** that guides learners from skill assessment through personalized project-based practice to verifiable Learning CV. It combines three independently deployable services:

1. **Frontend SPA** — user-facing interface (React/Vite/TS)
2. **Backend API + Worker** — business logic, persistence, orchestration (.NET 8)
3. **AI Service** — static analysis + LLM-driven code review (Python/FastAPI)

Async work (repository fetches, static analysis, AI reviews, PDF generation) is handled by **Hangfire jobs running inside the Backend API process**, pulling from a SQL-Server-backed queue.

This architecture prioritizes:
- **Local-first development** — full stack comes up via `docker-compose up`.
- **Separation of concerns** — each service has a single responsibility.
- **Thesis defensibility** — clean mapping from system requirements to components.
- **Post-graduation evolvability** — interfaces in place for multi-provider AI, swap to Azure Service Bus, split the Worker to its own process.

---

## 2. Components

| # | Component | Responsibility | Tech |
|---|---|---|---|
| 1 | **Web Frontend** | Render SPA, handle auth tokens, call Backend API, display feedback | React 18 + TypeScript + Vite + Tailwind + Redux Toolkit + React Router v6 + React Hook Form + Zod + Recharts |
| 2 | **Backend API** (`CodeMentor.Api`) | REST endpoints, AuthN/AuthZ, request validation, orchestration | ASP.NET Core 8 + MediatR + FluentValidation + Swagger |
| 3 | **Application Layer** (`CodeMentor.Application`) | Use-case handlers, DTOs, domain orchestration | MediatR handlers, AutoMapper |
| 4 | **Infrastructure Layer** (`CodeMentor.Infrastructure`) | EF Core DbContext, external API clients, Hangfire job types | EF Core 8 + Hangfire + Octokit + Refit + Azure.Storage.Blobs + StackExchange.Redis + SendGrid |
| 5 | **Domain Layer** (`CodeMentor.Domain`) | Entities, value objects, domain rules | Pure C# — no deps |
| 6 | **Background Worker** | Hangfire server — runs inside API process (MVP) | Hangfire.AspNetCore, SQL Server job store |
| 7 | **AI Service** (`code-mentor-ai`) | Static analysis + LLM code review | FastAPI + Uvicorn + OpenAI SDK + ESLint/Bandit/Cppcheck/PHPStan/PMD + Docker |
| 8 | **Database** | Persistent store for users, tasks, submissions, analysis, CVs | SQL Server 2022 (LocalDB dev / Azure SQL prod) |
| 9 | **Cache** | Session cache, rate-limit counters, hot reads | Redis 7 |
| 10 | **Blob Storage** | ZIP uploads, generated PDF CVs, pre-signed download URLs | Azurite (dev) / Azure Blob (prod) |
| 11 | **Email Service** | Transactional email (verification, reset, notifications) | SendGrid |
| 12 | **LLM Provider** | Code review generation | OpenAI GPT-5.1-codex-mini (single provider — ADR-003) |
| 13 | **Vector DB** *(F12 — added 2026-05-07)* | Stores code/feedback embeddings for RAG retrieval in Mentor Chat | **Qdrant 1.x** (Docker — ADR-036) |
| 14 | **Embedding Provider** *(F12 — added 2026-05-07)* | Generate semantic embeddings for code/feedback chunks | OpenAI `text-embedding-3-small` (1536 dims) |

---

## 3. System Diagram

```
                         +-------------------+
                         |   Learner/Admin   |
                         |   (Browser)       |
                         +---------+---------+
                                   |  HTTPS
                                   v
                         +-------------------+
                         |  Web Frontend     |
                         |  React / Vite     |
                         |  (Vercel / dev:   |
                         |   npm run dev)    |
                         +---------+---------+
                                   |  REST + JWT
                                   v
     +---------------------------------------------------------------+
     |                    Backend API (ASP.NET Core 8)               |
     |                                                               |
     |   +---------------+   +-------------+   +-----------------+   |
     |   |  Api layer    |-->|  Application|-->|   Domain        |   |
     |   |  Controllers  |   |  MediatR    |   |   entities      |   |
     |   |  middleware   |   |  handlers   |   |                 |   |
     |   +-------+-------+   +------+------+   +-----------------+   |
     |           |                  |                                |
     |           v                  v                                |
     |   +----------------+  +--------------+                        |
     |   | Infrastructure |  |   Hangfire   |                        |
     |   | EF / clients   |  |   Worker     |                        |
     |   +-------+--------+  +------+-------+                        |
     +-----------|------------------|--------------------------------+
                 |                  |
     +-----------+------+    +------+----------+     +-----------+
     |  SQL Server 2022 |    |  AI Service     |     |  GitHub   |
     |   (data + jobs)  |    |  FastAPI:8000   |---->|  API      |
     +------------------+    |  (Docker)       |     +-----------+
              ^              +---+----+----+---+
              |                  |    |    |
     +--------+---------+        |    |    +----> +-------------+
     |    Redis 7       |        |    |           |  OpenAI API |
     |    cache/session |        |    |           |  (LLM +     |
     +------------------+        |    |           |  embeddings)|
              ^                  |    |           +-------------+
              |                  |    v
     +--------+---------+        |  +------------------+
     |  Azurite/Blob    |        |  |  Qdrant 1.x      |
     |  (uploads + PDF) |        |  |  vector DB :6333 |
     +------------------+        |  |  (Docker)        |
              ^                  |  |  RAG retrieval   |
              |                  |  +------------------+
     +--------+---------+        |
     |   SendGrid API   |        v
     +------------------+   (SSE stream → backend → frontend
                             for /api/mentor-chat — F12)
```

All arrows are HTTPS or TCP (localhost in dev, TLS in prod). No direct frontend → AI-service traffic — the backend is the only client of the AI service. Qdrant is reachable only by the AI service (F12 RAG retrieval — ADR-036).

---

## 4. Data Flow

Three representative flows; the implementation plan maps sprints to delivering these.

### 4.1 User Login (Email/Password)

1. User submits `POST /api/auth/login` `{ email, password }` from the Frontend.
2. Backend `AuthController` → `LoginCommand` handler.
3. Handler loads user via `IUserRepository` (EF Core); verifies password hash (ASP.NET Core Identity PBKDF2).
4. Handler issues JWT (RS256, 1h expiry) + refresh token (opaque, 7d, stored in Redis keyed by user ID).
5. Response: `{ accessToken, refreshToken, user: {...} }`.
6. Frontend stores tokens in memory + refresh token in HttpOnly cookie; subsequent requests carry `Authorization: Bearer <jwt>`.

GitHub OAuth variant: frontend redirects to GitHub; callback `GET /api/auth/github/callback?code=...` exchanges code for GitHub access token, looks up/creates user, proceeds as above.

### 4.2 Adaptive Assessment

1. Learner clicks "Start Assessment" → `POST /api/assessments`.
2. Backend creates `Assessment` row, returns `{ assessmentId, firstQuestion }`. First question is medium difficulty.
3. For each answer: `POST /api/assessments/{id}/answers` `{ questionId, userAnswer, timeSpent }`.
4. Handler records `AssessmentResponse`, calls `IAdaptiveQuestionSelector.SelectNext(assessmentHistory)` — implements simplified IRT: if correct + fast → harder; if wrong → easier; maintain category coverage.
5. Returns either next question or `{ completed: true }`.
6. On completion (30 questions or timeout): `ScoringService` computes per-category scores, overall level, stores in `Assessments` + `SkillScores` tables.
7. Hangfire job enqueued: `GenerateLearningPathJob(userId, assessmentId)` — creates `LearningPath` row from template (based on detected level + weakest category), populates ordered `PathTasks` entries.
8. Frontend polls `GET /api/assessments/{id}` → redirects to `/dashboard` once status = `Completed`.

### 4.3 Code Submission → Feedback (Hot Path)

This is the **core value loop** — the thesis's central workflow.

1. Learner opens a task in path → clicks "Submit" → uploads ZIP or enters GitHub URL.
2. `POST /api/submissions` `{ taskId, submissionType, repositoryUrl | fileKey }`:
   - For ZIP: frontend first `POST /api/uploads/request-url` → gets pre-signed Blob URL → uploads ZIP directly to Azurite/Blob → posts submission with the blob path.
   - For GitHub: submits URL; backend validates access via stored OAuth token.
3. Backend:
   - Creates `Submission` row with `Status=Pending`.
   - Enqueues `SubmissionAnalysisJob(submissionId)` via Hangfire.
   - Returns `{ submissionId }` immediately (202 Accepted).
4. **Hangfire worker picks up job:**
   a. Fetches code — clones GitHub repo (shallow) OR downloads ZIP from Blob into temp directory with isolation.
   b. Sets `Status=Processing`.
   c. Calls AI service: `POST http://ai-service:8000/api/analyze-zip` with file (or repo tarball). AI service runs static analysis for the task's `ExpectedLanguage`.
   d. Stores raw static-analysis JSON in `StaticAnalysisResults` (per tool).
   e. Calls AI service: `POST /api/ai-review` with code + task context + static-analysis summary. AI service sends prompt to OpenAI, returns structured review JSON.
   f. Stores AI review in `AIAnalysisResults`.
   g. `FeedbackAggregator` reconciles static + AI into unified view, generates 3–5 recommended tasks (`Recommendations` rows) + learning resources (`Resources` rows).
   h. Sets `Submission.Status=Completed`, `CompletedAt=now()`.
   i. Emits in-app notification (`Notifications` row) + (optional, stretch) email via SendGrid.
   j. Cleans up temp directory.
5. Frontend polls `GET /api/submissions/{id}` every ~3s until `Status=Completed`, then loads `GET /api/submissions/{id}/feedback` which returns aggregated payload.
6. Feedback UI renders: overall score, per-category scores (maintainability/security/performance/correctness/style), inline code annotations, strengths, weaknesses, recommended tasks, and resources.

**Retry & failure:** Hangfire auto-retries on transient errors (3 attempts, exponential backoff). On permanent failure, `Status=Failed`, error saved to `Submission.ErrorMessage`, user sees "Retry" button.

**Timeouts:** static analysis capped at 3 min; AI call capped at 2 min; job overall 10 min. If exceeded, job fails with clear message.

**Graceful degradation:** If AI service is down but static analysis succeeds, worker saves partial results, marks AI review `Unavailable`, notification says "Static analysis ready; AI review temporarily unavailable — will retry." Retry job runs after 15 min.

### 4.4 Project Audit (F11 — added 2026-05-02)

A standalone, learning-path-independent flow. Parallel to 4.3 but **not** branched inside it (see ADR-031). Reuses `IBlobStorage`, GitHub OAuth tokens, `IAiReviewClient` HTTP layer, and Hangfire infrastructure.

1. Authenticated learner navigates to `/audit/new` (from Landing CTA, nav, or deep-link).
2. Frontend submits `POST /api/audits` `{ projectName, summary, description, projectType, techStack[], features[], targetAudience?, focusAreas?, knownIssues?, source: { type: 'github'|'zip', repositoryUrl?: string, blobPath?: string } }`. ZIP path: same pre-signed Blob URL flow as 4.3 (frontend → `POST /api/uploads/request-url` → upload to Azurite/Blob → `POST /api/audits` with blob path).
3. Backend:
   - Validates description fields (FluentValidation) and rate limit (3 audits / 24h / user — Redis sliding window).
   - Creates `ProjectAudit` row with `Status=Pending` and `ProjectDescriptionJson`.
   - Enqueues `ProjectAuditJob(auditId)` via Hangfire.
   - Returns `{ auditId }` (202 Accepted).
4. **Hangfire worker picks up `ProjectAuditJob`:**
   a. Fetches code — clones GitHub repo (shallow) **or** downloads ZIP from Blob into temp dir with isolation.
   b. Sets `Status=Processing`.
   c. Calls AI service `POST /api/analyze-zip` — static analysis fan-out (ESLint / Bandit / Cppcheck / PHPStan / PMD / Roslyn) detected by file extensions (no `ExpectedLanguage` to gate on — audit is multi-language by design).
   d. Stores per-tool results in `AuditStaticAnalysisResults`.
   e. Calls AI service `POST /api/project-audit` with `{ code, projectDescription, staticSummary }`. AI service uses `prompts/project_audit.v1.txt` (ADR-034) and returns 8-section structured JSON.
   f. Stores audit JSON in `ProjectAuditResults` (one row per audit).
   g. Sets `ProjectAudit.Status=Completed`, `OverallScore=...`, `Grade=...`, `CompletedAt=now()`.
   h. Emits in-app `Notification` ("Audit ready — view report").
   i. Cleans up temp directory.
5. Frontend polls `GET /api/audits/{id}` every ~3s until `Status=Completed`, then loads `GET /api/audits/{id}/report` which returns the aggregated 8-section payload.
6. Audit Report UI renders: Overall Score, 6-category radar, Strengths, Critical Issues, Warnings, Suggestions, Missing / Incomplete Features, Top-5 Recommended Improvements with how-to, Tech Stack Assessment, Inline Annotations drill-down (per-file / per-line, reusing Submission UI components and Prism syntax-highlighting).

**Retry & failure:** Hangfire auto-retries on transient errors (3 attempts, exponential backoff). On permanent failure, `Status=Failed`, error saved to `ProjectAudit.ErrorMessage`, user sees "Retry" button → `POST /api/audits/{id}/retry`.

**Timeouts:** static analysis capped at 4 min (audit codebases trend larger / multi-language); AI call capped at 3 min; job overall 12 min. p95 target ≤ 6 min.

**Graceful degradation:** identical pattern to 4.3 — if AI service is down, static results saved, audit marked `AIReviewStatus=Unavailable`, retry once after 15 min.

**Retention:** see ADR-033. Daily Hangfire recurring job `AuditBlobCleanupJob` deletes blobs older than 90 days; metadata rows are permanent. Azure Blob lifecycle policy is the safety net (100-day delete) if the Hangfire job stalls.

### 4.5 AI Mentor Chat (F12 — added 2026-05-07)

A per-submission and per-audit conversational interface backed by Retrieval-Augmented Generation (ADR-036). Two-phase: an offline indexing phase (run once when a submission/audit reaches `Completed`) and an online query phase (run per chat turn).

#### Phase 1 — Indexing (offline, one-time per submission/audit)

1. `Submission.Status` or `ProjectAudit.Status` transitions to `Completed`.
2. Backend domain event handler enqueues `IndexSubmissionForMentorChatJob(scope, scopeId)` via Hangfire.
3. Hangfire worker:
   a. Loads code from Blob (or refetches from GitHub for already-fetched submissions).
   b. Calls AI service `POST /api/embeddings/upsert` `{ scope: "submission"|"audit", scopeId, files: [{ path, content }], feedback: { strengths, weaknesses, annotations } }`.
4. AI service:
   a. Chunks code at semantic boundaries (file → function/class → ≤500-token windows).
   b. Generates embeddings via OpenAI `text-embedding-3-small` (batch up to 50 chunks per call).
   c. Upserts into Qdrant collection `mentor_chunks` with payload `{ scope, scopeId, filePath, startLine, endLine, kind: "code"|"feedback"|"annotation", source: "submission"|"audit" }`.
5. Returns `{ indexed: <chunkCount> }` to backend; backend updates `Submission.MentorIndexedAt` (or `ProjectAudit.MentorIndexedAt`).

#### Phase 2 — Chat Turn (online, per user message)

1. Learner opens submission/audit page → frontend `GET /api/mentor-chat/{sessionId}` returns history (creates session lazily if first visit).
2. Learner types message → frontend `POST /api/mentor-chat/{sessionId}/messages` with body `{ content }`.
3. Backend:
   a. Validates ownership (session belongs to user).
   b. Persists user message to `MentorChatMessages`.
   c. Loads last 10 turns of history.
   d. Streams a request to AI service `POST /api/mentor-chat` `{ sessionId, scope, scopeId, message, history[] }`.
   e. Pipes the AI service's SSE stream straight back to the frontend via its own SSE response.
4. AI service:
   a. Generates query embedding for the user's message.
   b. Searches Qdrant: top-5 chunks where `payload.scope == scope AND payload.scopeId == scopeId`.
   c. Constructs RAG prompt: system message + retrieved chunks + history + user message.
   d. Streams OpenAI completion token-by-token via SSE.
5. Backend collects the streamed assistant response, persists to `MentorChatMessages` on stream end (with token counts), updates `MentorChatSessions.LastMessageAt`.
6. Frontend renders streaming markdown, syntax-highlights code blocks via Prism.

**Token caps (per ADR-036):** 6k input / 1k output per turn. Top-k retrieval: 5 chunks (clamped to available chunks for short submissions).

**Graceful degradation:**
- Qdrant unreachable → AI service falls back to "raw context mode" (sends submission/audit feedback JSON directly to LLM, skipping retrieval); response includes a flag the frontend renders as a small "limited context" banner.
- AI service unreachable → backend returns 503 to the SSE stream; frontend shows "Mentor temporarily unavailable" banner.
- OpenAI rate-limited → backend retries once with backoff; if still failing, surfaces the error to the user.

**Rate limit:** 30 messages per hour per `MentorChatSession` (Redis sliding window).

**Index lifecycle:** Qdrant chunks for a submission/audit are deleted when the parent row is hard-deleted (post-MVP; soft-delete preserves them). Re-submission of the same task creates a new submissionId → new index → fresh chat session.

### 4.6 Multi-Agent Code Review (F13 — added 2026-05-07; opt-in via env)

Default `AI_REVIEW_MODE=single` preserves the F6 flow (4.3) unchanged. When `AI_REVIEW_MODE=multi`, the `SubmissionAnalysisJob` step (e) is replaced with a call to `/api/ai-review-multi` instead of `/api/ai-review`. All other pipeline steps are identical (per ADR-037).

Inside the AI service for `/api/ai-review-multi`:

1. Validates input (same shape as `/api/ai-review`).
2. Spawns three coroutines in parallel via `asyncio.gather`:
   - **Security agent** — `prompts/agent_security.v1.txt`. Owns the `security` score. Constrained output schema: `{ securityScore, securityFindings[], securityAnnotations[] }`.
   - **Performance agent** — `prompts/agent_performance.v1.txt`. Owns the `performance` score. Constrained output schema: `{ performanceScore, performanceFindings[], performanceAnnotations[] }`.
   - **Architecture agent** — `prompts/agent_architecture.v1.txt`. Owns `correctness`, `readability`, `design` scores (broader scope by design). Constrained output schema: `{ correctnessScore, readabilityScore, designScore, architectureFindings[], architectureAnnotations[], strengths[], weaknesses[] }`.
3. Per-agent timeout: 90 s. If any agent times out or returns malformed JSON → orchestrator logs partial failure, marks affected categories as null, returns response with `partialAgents: ["<agent>"]` flag.
4. **Orchestrator merge:**
   - Scores: assemble the 5-category vector from agent-owned scores. Null if owning agent failed.
   - Strengths / weaknesses: concatenate from architecture agent + dedupe across agents by Jaccard similarity ≥0.7.
   - Inline annotations: union by `(filePath, lineNumber)`. If two agents annotate the same line, keep both (with agent prefix in displayed text).
   - Recommended tasks / resources: architecture agent only (security and performance agents do not produce these).
5. Returns merged response shape — identical to `/api/ai-review` response, plus an extra `meta: { mode: "multi", promptVersion: "multi-agent.v1", partialAgents: [...] }` block.
6. Backend persists `AIAnalysisResults.PromptVersion = "multi-agent.v1"` (or `"multi-agent.v1.partial"` on partial failures), records `TokensUsed = sum(agent tokens)`.

**Token cost:** ~2.2× single mode at default caps (6k input + 1.5k output per agent × 3 agents). Default off in production for cost containment.

**Thesis evaluation harness (Sprint 11):** a script `docs/demos/multi-agent-evaluation.md` runs both endpoints over the same N=15 submissions and produces a comparison table (per-category score deltas, response length, token cost, supervisor relevance rubric).

### 4.7 Adaptive AI Learning System (F15 + F16 — added 2026-05-14; ADR-049)

Four flows compose the F15/F16 runtime. Full sequence diagrams (with pseudocode for the trigger logic and the IRT engine) live in `docs/assessment-learning-path.md` §4.4 + §5. High-level summary:

**Flow A — Adaptive Assessment with 2PL IRT (F15.3).**
`POST /api/assessments` → backend opens Assessment row at θ₀ = 0.0 → AI service `/api/irt/select-next` returns first item (argmax I(θ=0) over bank). For each answer: backend persists `AssessmentResponse`, AI service re-MLEs θ over all responses, returns next item maximizing Fisher info at new θ. After N responses (30 for full / 10 for mini): backend persists per-category scores + final θ, enqueues `GenerateAssessmentSummaryJob` (full assessments only) which calls `/api/assessment-summary` → persists `AssessmentSummaries`, then enqueues `GenerateLearningPathJob` which runs Flow B.

**Flow B — AI Path Generation (F16.1).**
`GenerateLearningPathJob` calls `/api/generate-path` with `{skillProfile, track, completedTaskIds, targetLength, assessmentSummaryText}`. AI service: (1) builds learner profile text, (2) embeds via `text-embedding-3-small`, (3) cosine-similarity against in-memory task embedding cache → top-20 candidates, (4) LLM rerank prompt receives structured profile + top-20 + constraints, (5) Pydantic-validates the JSON response, (6) topological prerequisite check, retry-with-self-correction on violation (max 2 retries). Backend: inserts `LearningPath` (Source=AI) + `PathTasks` with `AIReasoning` + `FocusSkillsJson`. AI-unavailable fallback: legacy template logic, `Source=TemplateFallback`.

**Flow C — Continuous Adaptation (F16.4).**
At end of `SubmissionAnalysisJob`: backend updates `LearnerSkillProfile` (Source=SubmissionInferred), evaluates triggers (Periodic / ScoreSwing / Completion100 / OnDemand). On trigger AND cooldown passed (24h, bypassed by Completion100/OnDemand): enqueue `PathAdaptationJob`. Job computes signal_level (small/medium/large) and calls `/api/adapt-path`. AI returns ordered actions. Auto-apply if `action.type=reorder AND confidence>0.8 AND intra-skill`; else stage `Pending` and notify learner (pref-aware via Sprint-14 NotificationService). Every cycle writes a row to `PathAdaptationEvents` with Before/After + Reasoning + Confidence (full audit trail for thesis longitudinal data).

**Flow D — Graduation → Reassessment → Next Phase (F16.5 + F16.8).**
PathTask completion brings `ProgressPercent=100`: `GET /learning-paths/me/graduation` assembles Before/After radar from initial vs current `LearnerSkillProfile` + AI journey summary. CTA: mandatory Full reassessment (30Q via Flow A). On reassessment complete: `POST /learning-paths/me/next-phase` enqueues Flow B with `completedTaskIds = ALL prior tasks` + `difficultyBias = +1`. New `LearningPath` with `Version+=1`; previous archived (`IsActive=false`).

---

## 5. Data Model (Condensed)

~33 entities across 8 domains (preserved from academic docs ERD; minor additions to existing entities marked **[+]**; new domains marked with their introduction date).

### 5.1 Entity Tables

**Domain 1 — User Management**

| Entity | Key Attributes |
|---|---|
| `Users` | `UserId` (PK, GUID), `Email` (unique), `PasswordHash`, `FullName`, `Role` (Learner/Admin), `GitHubUsername`, `ProfilePictureUrl`, `IsEmailVerified`, `CreatedAt`, `UpdatedAt` |
| `OAuthTokens` | `TokenId` (PK), `UserId` (FK), `Provider` (GitHub), `AccessToken` (AES-256 encrypted), `RefreshToken`, `ExpiresAt`, `Scopes` |
| `RefreshTokens` **[+]** | `Id` (PK), `UserId` (FK), `TokenHash`, `ExpiresAt`, `IsRevoked` — *replaces academic `Sessions` for JWT refresh flow; session data lives in Redis.* |

**Domain 2 — Learning & Assessment**

| Entity | Key Attributes |
|---|---|
| `Questions` | `QuestionId` (PK), `Content`, `Difficulty` (1–3), `Category`, `OptionsJson`, `CorrectAnswer`, `Explanation` |
| `Assessments` | `AssessmentId` (PK), `UserId` (FK), `StartedAt`, `CompletedAt`, `TotalScore`, `SkillLevel` (Beginner/Intermediate/Advanced), `DurationSec` |
| `AssessmentResponses` | `ResponseId` (PK), `AssessmentId` (FK), `QuestionId` (FK), `UserAnswer`, `IsCorrect`, `TimeSpentSec` |
| `Tasks` | `TaskId` (PK), `Title`, `Description` (markdown), `Difficulty` (1–5), `Category`, `PrerequisitesJson`, `ExpectedLanguage`, `EstimatedHours`, `CreatedBy` (FK Users), `IsActive` **[+]** |
| `LearningPaths` | `PathId` (PK), `UserId` (FK), `TrackType` (FullStack/Backend/Python), `GeneratedAt`, `ProgressPercent`, `IsActive` |
| `PathTasks` | `PathTaskId` (PK), `PathId` (FK), `TaskId` (FK), `OrderIndex`, `Status` (NotStarted/InProgress/Completed), `StartedAt`, `CompletedAt`. **Unique:** `(PathId, OrderIndex)` |

**Domain 3 — Code Analysis**

| Entity | Key Attributes |
|---|---|
| `Submissions` | `SubmissionId` (PK), `UserId` (FK), `TaskId` (FK), `SubmissionType` (GitHub/Upload), `RepositoryUrl`, `BlobPath`, `Status` (Pending/Processing/Completed/Failed), `ErrorMessage` **[+]**, `AttemptNumber` **[+]**, `CreatedAt`, `CompletedAt` |
| `StaticAnalysisResults` | `Id` (PK), `SubmissionId` (FK), `Tool` (ESLint/Bandit/Cppcheck/PMD/PHPStan/Roslyn), `IssuesJson`, `MetricsJson`, `ExecutionTimeMs`, `ProcessedAt` |
| `AIAnalysisResults` | `Id` (PK), `SubmissionId` (FK), `OverallScore` (0–100), `FeedbackJson`, `StrengthsJson`, `WeaknessesJson`, `ModelUsed` (gpt-5.1-codex-mini), `TokensUsed`, `ProcessedAt` |
| `Recommendations` | `Id` (PK), `SubmissionId` (FK), `TaskId` (FK), `Reason`, `Priority` (1–5), `IsAdded` (bool), `CreatedAt` |
| `Resources` | `Id` (PK), `SubmissionId` (FK), `Title`, `Url`, `Type` (Article/Video/Docs), `Topic` |
| `Notifications` | `Id` (PK), `UserId` (FK), `Type`, `Title`, `Message`, `IsRead`, `Link`, `CreatedAt` |

**Domain 4 — Gamification & Progress** *(Learning CV is MVP; the rest are stretch — ADR-006)*

| Entity | Key Attributes |
|---|---|
| `SkillScores` | `Id` (PK), `UserId` (FK), `Category`, `Score` (0–100), `Level` (1–5), `UpdatedAt`. **Unique:** `(UserId, Category)` |
| `LearningCVs` | `CVId` (PK), `UserId` (FK, unique), `PublicSlug` **[+]**, `IsPublic`, `LastGeneratedAt`, `ViewCount` |
| `Badges` *(stretch)* | `BadgeId` (PK), `Name`, `Description`, `IconUrl`, `CriteriaJson`, `Category` |
| `UserBadges` *(stretch)* | `Id` (PK), `UserId` (FK), `BadgeId` (FK), `EarnedAt` |
| `XpTransactions` **[+]** *(stretch)* | `Id` (PK), `UserId` (FK), `Amount`, `Reason`, `RelatedEntityId`, `CreatedAt` |

**Domain 5 — Administration**

| Entity | Key Attributes |
|---|---|
| `AuditLogs` | `LogId` (PK), `UserId` (FK, nullable), `Action`, `EntityType`, `EntityId`, `OldValueJson`, `NewValueJson`, `IpAddress`, `CreatedAt` |

**Domain 6 — Project Audit (F11 — added 2026-05-02; ADR-031)**

| Entity | Key Attributes |
|---|---|
| `ProjectAudits` | `AuditId` (PK, GUID), `UserId` (FK), `ProjectName`, `ProjectDescriptionJson` (full structured form payload), `SourceType` (GitHub / Upload), `RepositoryUrl`, `BlobPath` (nullable — set null on 90-day cleanup per ADR-033), `Status` (Pending / Processing / Completed / Failed), `AIReviewStatus` (Pending / Completed / Unavailable), `OverallScore` (0–100, nullable until Completed), `Grade` (A / B / C / D / F, nullable), `ErrorMessage`, `MentorIndexedAt` **[+]** (nullable — set when `IndexSubmissionForMentorChatJob` completes), `IsDeleted`, `CreatedAt`, `CompletedAt` |
| `ProjectAuditResults` | `Id` (PK), `AuditId` (FK, unique), `ScoresJson` (6-category breakdown), `StrengthsJson`, `CriticalIssuesJson`, `WarningsJson`, `SuggestionsJson`, `MissingFeaturesJson`, `RecommendedImprovementsJson`, `TechStackAssessment` (text), `InlineAnnotationsJson`, `ModelUsed` (gpt-5.1-codex-mini), `PromptVersion` (e.g., `project_audit.v1`), `TokensInput`, `TokensOutput`, `ProcessedAt` |
| `AuditStaticAnalysisResults` | `Id` (PK), `AuditId` (FK), `Tool` (ESLint / Bandit / Cppcheck / PMD / PHPStan / Roslyn), `IssuesJson`, `MetricsJson`, `ExecutionTimeMs`, `ProcessedAt` |

> **Submissions addition (F12 — added 2026-05-07):** the existing `Submissions` entity gains `MentorIndexedAt` (nullable timestamp) — set when `IndexSubmissionForMentorChatJob` finishes upserting chunks into Qdrant. Used by the FE chat panel as a readiness gate (panel hidden until `MentorIndexedAt != null`).

**Domain 7 — Mentor Chat (F12 — added 2026-05-07; ADR-036)**

| Entity | Key Attributes |
|---|---|
| `MentorChatSessions` | `SessionId` (PK, GUID), `UserId` (FK), `Scope` enum (`Submission` / `Audit`), `ScopeId` (GUID — FK to either `Submissions.SubmissionId` or `ProjectAudits.AuditId` — polymorphic by `Scope`), `CreatedAt`, `LastMessageAt` (nullable). **Unique:** `(UserId, Scope, ScopeId)` — at most one session per (user, submission) or (user, audit) pair. |
| `MentorChatMessages` | `MessageId` (PK, GUID), `SessionId` (FK), `Role` enum (`User` / `Assistant`), `Content` (text), `RetrievedChunkIds` (JSON — Qdrant chunk identifiers used for this turn; null for user messages), `TokensInput` (nullable — set on assistant messages), `TokensOutput` (nullable), `ContextMode` enum (`Rag` / `RawFallback` — recorded per assistant turn for graceful-degradation analytics), `CreatedAt` |

> Vector data lives in **Qdrant** (collection `mentor_chunks`), not SQL Server. Each chunk's payload includes `{ scope, scopeId, filePath, startLine, endLine, kind, source }`. Vector dimension: 1536 (OpenAI `text-embedding-3-small`). The chunk identifiers stored in `MentorChatMessages.RetrievedChunkIds` are Qdrant point IDs (UUIDs).

**Domain 8 — AI Adaptive Learning (F15 + F16 — added 2026-05-14; ADR-049 / ADR-050 / ADR-051 / ADR-052 / ADR-053 / ADR-054)**

| Entity | Key Attributes |
|---|---|
| `LearnerSkillProfiles` | `Id` (PK), `UserId` (FK, unique), `SkillScoresJson` (live `{category: 0-100}` snapshot), `Level` (Beginner/Intermediate/Advanced), `Source` enum (Assessment / SubmissionInferred / MiniReassessment / FullReassessment), `LastUpdatedAt`, `RowVersion` (EF concurrency token) |
| `PathAdaptationEvents` | `Id` (PK), `PathId` (FK LearningPaths), `UserId` (FK Users), `TriggeredAt`, `Trigger` enum (Periodic / ScoreSwing / Completion100 / OnDemand / MiniReassessment), `BeforeStateJson`, `AfterStateJson`, `AIReasoningText`, `ConfidenceScore` (0-1), `ActionsJson` (`[{type, target_position, new_task_id?, reason, confidence}]`), `LearnerDecision` enum (AutoApplied / Pending / Approved / Rejected / Expired), `RespondedAt?`, `AIPromptVersion`, `TokensInput?`, `TokensOutput?` |
| `IRTCalibrationLog` | `Id` (PK), `QuestionId` (FK Questions), `OldA`, `OldB`, `NewA`, `NewB`, `ResponseCount` (at time of calibration), `CalibratedAt`, `Method` enum (AISelfRate / AdminOverride / EmpiricalMLE), `LogLikelihood?` |
| `AssessmentSummaries` | `Id` (PK), `AssessmentId` (FK Assessments, unique), `SummaryText`, `StrengthsJson`, `WeaknessesJson`, `PathGuidanceText` (feeds path generator prompt), `PromptVersion`, `GeneratedAt`, `TokensInput`, `TokensOutput` |
| `TaskFramings` | `Id` (PK), `UserId` (FK), `TaskId` (FK), `WhyMattersText`, `FocusAreasJson`, `PitfallsJson`, `GeneratedAt`, `ExpiresAt` (`GeneratedAt + 7d`), `PromptVersion`. **Unique:** `(UserId, TaskId)` |
| `QuestionDrafts` | `Id` (PK), `BatchId` (uniqueidentifier), `GeneratedAt`, `GeneratedByAdminId` (FK Users), `DraftJson` (full Question shape + `(a, b)` + rationale), `Status` enum (Pending / Approved / Rejected), `ReviewedAt?`, `ReviewedById?`, `EditedJson?` (admin's edits before approve), `RejectionReason?`, `PublishedQuestionId?` (FK Questions, set on approve), `PromptVersion` |
| `TaskDrafts` | `Id` (PK), `BatchId`, `GeneratedAt`, `GeneratedByAdminId`, `DraftJson` (full Task shape + `SkillTagsJson` + `LearningGainJson`), `Status` enum (Pending / Approved / Rejected), `ReviewedAt?`, `ReviewedById?`, `EditedJson?`, `RejectionReason?`, `PublishedTaskId?`, `PromptVersion` |

> **Questions / Tasks / LearningPaths / PathTasks additions (F15 + F16 — added 2026-05-14; ADR-049):** the existing entities in Domain 2 gain new columns to support the AI adaptive layer — full list in `assessment-learning-path.md` §4.2.1. Summary:
>
> - **`Questions`** **[+]** `IRT_A` (float, default 1.0), `IRT_B` (float, default 0.0), `CalibrationSource` (AI / Admin / Empirical), `Source` (Manual / AI), `ApprovedById` (FK Users, nullable), `ApprovedAt`, `CodeSnippet` (nullable), `CodeLanguage` (nullable), `EmbeddingJson` (1536-float JSON array, nullable), `PromptVersion` (nullable).
> - **`Tasks`** **[+]** `SkillTagsJson` (`[{skill, weight}]`), `LearningGainJson` (`{skill: gain}`), `Source` (Manual / AI), `ApprovedById`, `ApprovedAt`, `EmbeddingJson`. Existing `Prerequisites` column is now enforced by the AI path generator topological check.
> - **`LearningPaths`** **[+]** `Version` (int, default 1), `Source` (Template / AI / TemplateFallback), `LastAdaptedAt`, `GenerationReasoningText`, `AssessmentSummaryId` (FK AssessmentSummaries, nullable).
> - **`PathTasks`** **[+]** `AIReasoning`, `FocusSkillsJson`, `PinnedByLearner` (default false; v1.1).
> - **`AIUsageLog`** **[+]** `Feature` column (`assessment_summary` / `path_gen` / `path_adapt` / `question_gen` / `task_gen` / `task_framing` / `embedding`) for per-feature cost aggregation.

### 5.2 Key Relationships

- `User 1 — * Assessment`
- `Assessment 1 — * AssessmentResponse`
- `User 1 — 0..1 ActiveLearningPath` (enforced via `IsActive`)
- `LearningPath 1 — * PathTask — * Task` (many-to-many via PathTasks)
- `User 1 — * Submission * — 1 Task`
- `Submission 1 — * StaticAnalysisResult` (one per tool run)
- `Submission 1 — 1 AIAnalysisResult`
- `Submission 1 — * Recommendation`
- `User 1 — 1 LearningCV`
- `User 1 — * SkillScore` (one per category)
- `User 1 — * ProjectAudit` (audit history per user)
- `ProjectAudit 1 — 0..1 ProjectAuditResult` (created when audit reaches Completed; absent if Failed before LLM step)
- `ProjectAudit 1 — * AuditStaticAnalysisResult` (one row per static-analysis tool that ran)
- `User 1 — * MentorChatSession` (one session per submission/audit the user has chatted on)
- `MentorChatSession 1 — * MentorChatMessage` (turn-by-turn history; capped client-side at last 10 sent to LLM)
- `Submission 1 — 0..1 MentorChatSession` (lazy-created on first message; constraint via `(Scope='Submission', ScopeId=Submission.Id)`)
- `ProjectAudit 1 — 0..1 MentorChatSession` (lazy-created; constraint via `(Scope='Audit', ScopeId=ProjectAudit.AuditId)`)
- `User 1 — 0..1 LearnerSkillProfile` *(F15/F16; ADR-049)*
- `LearningPath 1 — * PathAdaptationEvent` *(F16.4; ADR-053)*
- `LearningPath 1 — 0..1 AssessmentSummary` (path-generation-time summary, preserved for the journey/graduation display)
- `Question 1 — * IRTCalibrationLog` *(F15.4b; ADR-050)*
- `Assessment 1 — 0..1 AssessmentSummary` *(F15.5)*
- `User 1 — * TaskFraming * — 1 Task` (per-learner cache; 7-day TTL)
- `Admin (User) 1 — * QuestionDraft` (authoring queue; FK `GeneratedByAdminId`)
- `Admin (User) 1 — * TaskDraft` (authoring queue)

### 5.3 Indexing (performance-critical)

- `Users.Email` — unique, non-clustered.
- `Submissions(UserId, CreatedAt DESC)` — dashboard's "recent submissions" query.
- `Submissions.Status` — worker picks up Pending.
- `PathTasks(PathId, OrderIndex)` — ordered path rendering.
- `Notifications(UserId, IsRead, CreatedAt DESC)` — notification bell.
- `AuditLogs(CreatedAt)` — partitioned/archived monthly post-MVP.
- `ProjectAudits(UserId, CreatedAt DESC)` — `/audits/me` history query.
- `ProjectAudits.Status` — worker picks up Pending; cleanup job filters Completed / Failed.
- `ProjectAudits(IsDeleted, UserId)` — soft-delete-aware list filter.
- `MentorChatSessions(UserId, Scope, ScopeId)` — unique; serves "open chat for this submission/audit" lookup.
- `MentorChatMessages(SessionId, CreatedAt)` — turn-ordered history retrieval for chat panel load.
- `LearnerSkillProfiles(UserId)` — unique, non-clustered *(F15/F16)*.
- `PathAdaptationEvents(PathId, TriggeredAt DESC)` — adaptation history timeline render.
- `PathAdaptationEvents(UserId, LearnerDecision)` — pending-modal lookup on `/path` load.
- `IRTCalibrationLog(QuestionId, CalibratedAt DESC)` — calibration audit query.
- `AssessmentSummaries(AssessmentId)` — unique.
- `TaskFramings(UserId, TaskId)` — unique; cache lookup.
- `TaskFramings(ExpiresAt)` — Hangfire cleanup of expired framings.
- `QuestionDrafts(BatchId, Status)` — admin review screen.
- `TaskDrafts(BatchId, Status)` — admin review screen.
- `Questions(CalibrationSource, IRT_A, IRT_B)` — calibration dashboard heatmap.
- `Tasks(Source, ApprovedAt)` — admin content insights.

---

## 6. API Contracts (MVP endpoint reference)

All endpoints prefixed with `/api`. Responses in JSON. Auth required unless noted (`[anon]`).
Response errors follow RFC 7807 (`application/problem+json`).

### 6.1 Auth

| Method | Path | Purpose | Body / Query | Response |
|---|---|---|---|---|
| POST | `/auth/register` `[anon]` | Register learner | `{ email, password, fullName, githubUsername? }` | `{ userId, email }` + sends verification email |
| POST | `/auth/login` `[anon]` | Email/password login | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| GET | `/auth/github/login` `[anon]` | Redirect to GitHub OAuth | — | 302 to GitHub |
| GET | `/auth/github/callback` `[anon]` | OAuth callback | `?code&state` | `{ accessToken, refreshToken, user }` + sets cookie |
| POST | `/auth/refresh` `[anon]` | Refresh JWT | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | Revoke refresh token | — | 204 |
| POST | `/auth/forgot-password` `[anon]` | Start reset | `{ email }` | 204 + sends email |
| POST | `/auth/reset-password` `[anon]` | Complete reset | `{ token, newPassword }` | 204 |
| GET | `/auth/me` | Current user profile | — | `{ user }` |
| PATCH | `/auth/me` | Update profile | `{ fullName?, githubUsername?, profilePictureUrl? }` | `{ user }` |

### 6.2 Assessment

| Method | Path | Purpose |
|---|---|---|
| POST | `/assessments` | Start new assessment |
| GET | `/assessments/{id}` | Get status + (if completed) result |
| POST | `/assessments/{id}/answers` | Submit answer; returns next question or completion |
| POST | `/assessments/{id}/abandon` | Explicitly abandon (don't score) |
| GET | `/assessments/me/latest` | Most recent completed assessment |

### 6.3 Learning Path

| Method | Path | Purpose |
|---|---|---|
| GET | `/learning-paths/me/active` | Current path + task progress |
| POST | `/learning-paths/me/tasks/{pathTaskId}/start` | Mark task `InProgress` |
| POST | `/learning-paths/me/tasks/from-recommendation/{recId}` | Add recommended task to end of path |

### 6.4 Tasks

| Method | Path | Purpose |
|---|---|---|
| GET | `/tasks` | List tasks (filters: `track`, `difficulty`, `category`, `language`) |
| GET | `/tasks/{id}` | Task detail |
| POST (Admin) | `/admin/tasks` | Create |
| PUT (Admin) | `/admin/tasks/{id}` | Update |
| DELETE (Admin) | `/admin/tasks/{id}` | Soft-delete (set `IsActive=false`) |

### 6.5 Submissions

| Method | Path | Purpose |
|---|---|---|
| POST | `/uploads/request-url` | Get pre-signed Blob URL for ZIP upload |
| POST | `/submissions` | Create submission (body: `{ taskId, submissionType, repositoryUrl | blobPath }`) |
| GET | `/submissions/{id}` | Status + timestamps |
| GET | `/submissions/{id}/feedback` | Full feedback payload (static + AI + recs + resources) |
| GET | `/submissions/me` | History (paginated) |
| POST | `/submissions/{id}/retry` | Re-enqueue failed submission |
| POST | `/submissions/{id}/rating` *(stretch)* | Rate feedback quality |

### 6.6 Learning CV

| Method | Path | Purpose |
|---|---|---|
| GET | `/learning-cv/me` | Generate/refresh own CV |
| PATCH | `/learning-cv/me` | Privacy controls (`{ isPublic }`) |
| GET | `/learning-cv/me/pdf` | Download PDF (streams) |
| GET | `/public/cv/{slug}` `[anon]` | Public view — redacted content for guests |

### 6.7 Notifications / Dashboard

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | List user notifications (paginated) |
| POST | `/notifications/{id}/read` | Mark read |
| GET | `/dashboard/me` | Combined response: active path summary + last 5 submissions + skill snapshot |

### 6.8 Admin

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | List users |
| PATCH | `/admin/users/{id}` | Edit role / deactivate |
| CRUD | `/admin/questions` | Question bank CRUD |
| CRUD | `/admin/tasks` | (see 6.4) |

### 6.9 Health / Ops

| Method | Path |
|---|---|
| GET | `/health` `[anon]` |
| GET | `/ready` `[anon]` — checks DB + Redis + AI service reachability |
| GET | `/hangfire` — dashboard (admin-only) |

### 6.10 AI Service contract (internal)

Called only by the backend worker (and the backend's SSE proxy controller for Mentor Chat). Base URL `http://ai-service:8000` in dev, internal Azure URL post-defense.

```
POST /api/analyze              -> single file analysis
POST /api/analyze-zip          -> ZIP archive analysis (static tools)
POST /api/ai-review            -> LLM review, single-prompt (input: code + task context + static summary)
POST /api/ai-review-multi      -> LLM review, three specialist agents in parallel — F13; ADR-037
POST /api/project-audit        -> LLM project audit (input: code + project description + static summary) — F11; ADR-034
POST /api/embeddings/upsert    -> Chunks code/feedback, embeds via text-embedding-3-small, upserts into Qdrant — F12; ADR-036
POST /api/mentor-chat          -> RAG chat turn: query embed → Qdrant top-k → SSE-streamed LLM response — F12
POST /api/irt/select-next      -> 2PL adaptive: argmax I(θ | a, b) over unanswered bank — F15.3; ADR-050
POST /api/irt/recalibrate      -> Joint MLE for (a, b) from response matrix — F15.4b; ADR-050
POST /api/generate-questions   -> Batch question drafts with IRT (a, b) self-rated — F15.1; ADR-054
POST /api/generate-tasks       -> Batch task drafts with skill_tags + learning_gain — F16.3
POST /api/assessment-summary   -> 3-paragraph summary (strengths/weaknesses/path guidance) — F15.5
POST /api/generate-path        -> Hybrid recall (cosine top-20) + LLM rerank (final 5-10) — F16.1; ADR-052
POST /api/adapt-path           -> Signal-driven actions (reorder/swap with confidence) — F16.4; ADR-053
POST /api/task-framing         -> Per-learner per-task framing (why/focus/pitfalls) — F16.10
POST /api/embed                -> Embed list of texts via text-embedding-3-small — F15/F16
POST /api/embeddings/reload    -> Refresh in-memory task+question embedding cache — F15/F16
GET  /health                   -> liveness
```

The backend wraps this in `IAiReviewClient` (Refit-based) for the synchronous endpoints (`/api/analyze*`, `/api/ai-review*`, `/api/project-audit`) so swapping the AI service or its providers is a single adapter change. The streaming `/api/mentor-chat` is wrapped in a separate `IMentorChatClient` (HttpClient + custom SSE reader, since Refit does not handle SSE).

`AI_REVIEW_MODE=single|multi` env var on the backend selects whether `SubmissionAnalysisJob` calls `/api/ai-review` or `/api/ai-review-multi`. Default `single`.

### 6.11 Project Audits (F11 — added 2026-05-02)

| Method | Path | Purpose |
|---|---|---|
| POST | `/audits` | Create audit (body: `{ projectName, summary, description, projectType, techStack[], features[], targetAudience?, focusAreas?, knownIssues?, source: { type, repositoryUrl?, blobPath? } }`); rate-limited 3 / 24h / user; returns `{ auditId }` 202 |
| GET | `/audits/{id}` | Status + timestamps + score (when Completed); 404 if not owned by user or soft-deleted |
| GET | `/audits/{id}/report` | Full 8-section audit payload (scores, strengths, issues, missing features, recommendations, tech stack assessment, inline annotations); 409 if not yet Completed |
| GET | `/audits/me` | Paginated history (`page`, `size`, optional `dateFrom`, `dateTo`, `scoreMin`, `scoreMax`); excludes soft-deleted |
| DELETE | `/audits/{id}` | Soft delete (sets `IsDeleted=true`); blob unaffected (cleanup job handles per ADR-033) |
| POST | `/audits/{id}/retry` | Re-enqueue Failed audit; 409 if Completed |

The `POST /uploads/request-url` endpoint (already defined in §6.5) is reused for ZIP uploads; the response's blob path is included verbatim in the `POST /audits` body when `source.type = "zip"`.

### 6.12 AI Mentor Chat (F12 — added 2026-05-07)

| Method | Path | Purpose |
|---|---|---|
| GET | `/mentor-chat/{sessionId}` | Load chat history (paginated, default last 50 messages) + session metadata; lazy-creates session if user owns the underlying submission/audit |
| POST | `/mentor-chat/sessions` | Explicitly create a session (body: `{ scope: 'submission'\|'audit', scopeId }`); idempotent — returns existing if `(userId, scope, scopeId)` already has one |
| POST | `/mentor-chat/{sessionId}/messages` | Send a user message and stream the assistant response via Server-Sent Events; returns `text/event-stream` with `data: {token}` lines and a final `data: {done: true, messageId, tokensInput, tokensOutput, contextMode}` |
| DELETE | `/mentor-chat/{sessionId}/messages` | Clear conversation history for this session (does not delete the session itself); useful for "start over" UX |

**Authorization:** every endpoint enforces `OwnsResource` against the underlying submission/audit (the user must own the parent resource to chat about it).

**Readiness gate:** all endpoints return 409 Conflict with a clear error body if the underlying submission/audit's `MentorIndexedAt` is null (i.e., the indexing job hasn't completed yet). FE polls the parent resource and shows a "Preparing mentor…" state until indexing is done.

**Rate limit:** 30 messages per hour per `MentorChatSession` (Redis sliding window).

### 6.13 Adaptive AI Learning System (F15 + F16 — added 2026-05-14; ADR-049 onwards)

Backend endpoints introduced by the F15 + F16 upgrade. See `assessment-learning-path.md` §4.3 for full request/response shapes.

**Admin authoring + calibration:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/questions/generate` | Start AI Question Generator batch (body: `{category, difficulty, count, includeCode?, language?}`); returns `{batchId}` |
| GET | `/admin/questions/drafts/{batchId}` | List drafts in a batch with full payload + AI-rated `(a, b)` |
| POST | `/admin/questions/drafts/{id}/approve` | Approve draft (optional `editedJson` body for admin edits); publishes Question; triggers `EmbedEntityJob` |
| POST | `/admin/questions/drafts/{id}/reject` | Reject draft (optional `reason`) |
| POST | `/admin/tasks/generate` | Start AI Task Generator batch (body: `{track, difficulty, count, focusSkills?}`); returns `{batchId}` |
| GET | `/admin/tasks/drafts/{batchId}` | List task drafts |
| POST | `/admin/tasks/drafts/{id}/approve` | Approve task; publishes Task; triggers `EmbedEntityJob` |
| POST | `/admin/tasks/drafts/{id}/reject` | Reject task draft |
| GET | `/admin/calibration/questions` | IRT calibration heatmap (filters: `category`, `difficulty`); returns per-item `(a, b, source, responseCount)` distribution |
| GET | `/admin/adaptations` | Adaptation event log (filters: `userId`, `pathId`, `trigger`, `from`, `to`) |

**Learner — extended assessment / path:**

| Method | Path | Purpose |
|---|---|---|
| GET | `/assessments/{id}/summary` | Returns `AssessmentSummary` once `GenerateAssessmentSummaryJob` finishes; 409 if not yet generated |
| GET | `/learning-paths/me/adaptations` | List pending + history (`?status=pending\|history`) of `PathAdaptationEvent` |
| POST | `/learning-paths/me/adaptations/{id}/respond` | Approve or reject a Pending adaptation (`{decision: "approved" \| "rejected"}`); 204 |
| POST | `/learning-paths/me/refresh` | On-demand adaptation trigger (`Trigger=OnDemand`, bypasses cooldown); returns `{eventId}` |
| GET | `/learning-paths/me/graduation` | Returns `{before, after, journeySummary, nextPhaseEligible}` once path 100% |
| POST | `/learning-paths/me/next-phase` | Generate Next Phase Path (requires Full reassessment first); returns `{newPathId}` |
| GET | `/tasks/{id}/framing` | Returns `TaskFraming` (cache-aware; generates if missing/expired via `GenerateTaskFramingJob`) |
| POST | `/assessments/me/mini-reassessment` | Start 10-Q checkpoint (path 50%); returns `{assessmentId, firstQuestion}` |
| POST | `/assessments/me/full-reassessment` | Start 30-Q full reassessment (path 100%); returns `{assessmentId, firstQuestion}` |
| POST | `/learning-paths/me/tasks/{pathTaskId}/pin` *(v1.1)* | Lock task against adaptation; 204 |
| DELETE | `/learning-paths/me/tasks/{pathTaskId}/pin` *(v1.1)* | Unlock; 204 |

**Cross-cutting:**

- All endpoints enforce `OwnsResource` for the learner-scoped paths (`me/...`).
- Admin endpoints require `Role=Admin` (existing pattern).
- AI-service calls go through `IAiReviewClient` extended with the new methods (`GenerateQuestionsAsync`, `GenerateTasksAsync`, `AssessmentSummaryAsync`, `GeneratePathAsync`, `AdaptPathAsync`, `TaskFramingAsync`, `EmbedAsync`, `IrtSelectNextAsync`, `IrtRecalibrateAsync`).
- All AI-generated artifacts persist `PromptVersion` + `TokensInput` + `TokensOutput` on the relevant table (e.g., `AssessmentSummaries.PromptVersion`, `PathAdaptationEvents.AIPromptVersion`).
- Token cost guards: `AIUsageLog` aggregated per `(UserId, Feature, month)`; learner cap $3/month enforced at endpoint level (429), feature soft budget $50/month surfaced as admin alert (non-blocking).

---

## 7. Authentication & Authorization

### 7.1 Authentication
- **ASP.NET Core Identity** for password hashing (PBKDF2, 100k iterations).
- **JWT (RS256)** — signed by backend's private key; public key used by middleware to verify. 1-hour access token TTL.
- **Refresh token** — opaque 256-bit random, hashed in DB (`RefreshTokens` table), 7-day TTL, single-use rotation on each refresh.
- **GitHub OAuth 2.0** — authorization code flow. State parameter for CSRF. Access token encrypted (AES-256 via Azure Key Vault in prod, env-var key in dev) before storing in `OAuthTokens`.

### 7.2 Authorization
- **Claims-based**: JWT includes `sub` (UserId), `role` (Learner/Admin), standard claims.
- **Policies**:
  - `RequireLearner` — authorizes any `role in [Learner, Admin]`
  - `RequireAdmin` — authorizes `role == Admin`
  - `OwnsResource` — custom handler verifies `UserId` claim matches the resource's owner (for endpoints like `/submissions/{id}`)
- **Rate limits** (Redis sliding window):
  - Global: 100 req/min per authenticated user
  - `/auth/login`: 5 attempts per 15 min per IP
  - `/submissions`: 10 per hour per user
  - `/audits`: 3 per 24h per user (F11; ADR-031 / ADR-033)
  - `/mentor-chat/{sessionId}/messages`: 30 per hour per session (F12; ADR-036)
  - `/ai-review` (internal only): 30 per min per worker
  - `/ai-review-multi` (internal only): 30 per min per worker (F13; ADR-037)
  - `/project-audit` (internal only): 30 per min per worker
  - `/embeddings/upsert` (internal only): 60 per min per worker (F12; batched per submission)
  - `/mentor-chat` (internal only): 60 per min per worker (F12)

### 7.3 Session
- No server-side session state other than Redis-backed refresh-token hashes.
- Backend API is **stateless** — enables horizontal scaling later.

---

## 8. External Integrations

| Service | Purpose | How invoked |
|---|---|---|
| **GitHub API** | OAuth login, repo metadata, repo clone via `git`/Octokit | Infrastructure layer — `IGitHubClient` wrapping Octokit |
| **OpenAI API** | LLM code review | Called **only by AI service**, never backend directly |
| **SendGrid** | Transactional email | `IEmailService` wrapping SendGrid SDK |
| **Azure Blob** (Azurite dev) | File storage | `IBlobStorage` wrapping `Azure.Storage.Blobs` |

No direct third-party calls from frontend — everything routes through backend for auth + auditability.

---

## 9. Cross-Cutting Concerns

### 9.1 Logging & Observability
- **Serilog** structured JSON logs to console (dev) and Application Insights (prod).
- Enriched with: `RequestId`, `UserId`, `SubmissionId` (where relevant), `CorrelationId`.
- **Levels:**
  - `Info` — successful operations, job completions
  - `Warning` — retries, validation failures
  - `Error` — exceptions, job failures after retries
- **Metrics (prod):** request rate, p95 latency, error rate, submission pipeline latency (per phase), OpenAI token consumption per day.

### 9.2 Error Handling
- Global middleware → RFC 7807 `application/problem+json`.
- Domain errors → 400; auth errors → 401/403; not-found → 404; transient infra errors → 502/503; everything else → 500 with `traceId`.
- Never expose stack traces or internal paths in responses.

### 9.3 Validation
- **FluentValidation** on every command/query DTO.
- Request bodies validated *before* hitting MediatR pipeline via ASP.NET model binding + a validation behavior.

### 9.4 Caching
- **Redis**-backed:
  - Task catalog (`GET /tasks` list with filters) — TTL 5 min, invalidated on admin CRUD.
  - User profile reads — TTL 1 min.
  - Assessment question bank — TTL 1 hour.
- **In-memory** (within request): EF Core's first-level cache.

### 9.5 Rate Limiting
- `AspNetCoreRateLimit` or custom middleware backed by Redis (sliding window).

### 9.6 Data Protection
- ASP.NET Core Data Protection keys persisted to SQL Server (for dev) — avoids losing keys on container restart.
- Secrets via `dotnet user-secrets` (dev), Azure Key Vault (prod).
- OAuth tokens AES-256 encrypted in DB.
- TLS 1.3 in prod.

### 9.7 What's out of MVP
- Full GDPR data-export/delete flow — stubbed API endpoint, returns 501 "coming soon."
- Advanced observability (tracing, APM) — Application Insights basic metrics only.
- Audit log UI — `AuditLogs` table populated but no admin UI view in MVP.

---

## 10. Environments

### 10.1 Dev (primary — ADR-005)

`docker-compose.yml` at repo root brings up:
- `mssql` — SQL Server 2022 Linux container (port 1433), `SA_PASSWORD` in `.env`
- `redis` — Redis 7 (port 6379)
- `azurite` — Azure Storage emulator (Blob on 10000)
- `ai-service` — the `code-mentor-ai` image on port 8000
- `qdrant` — Qdrant vector DB (HTTP on 6333, gRPC on 6334) — F12; ADR-036
- (optional) `seq` — local log viewer on port 5341 for Serilog

Backend runs via `dotnet run --project src/CodeMentor.Api` (or F5 in VS/Rider).
Frontend runs via `npm run dev` (Vite) on port 5173.
Database migrations applied on startup in dev via `DbContext.Database.Migrate()` (guarded by `ASPNETCORE_ENVIRONMENT=Development`).

Hangfire dashboard at `http://localhost:5000/hangfire` (admin-only).
Swagger UI at `http://localhost:5000/swagger`.

### 10.2 Production (deferred to post-defense — see ADR-038)

> **2026-05-07 update:** Per ADR-038, Azure deployment is deferred to a Post-Defense slot. The defense runs on the owner's laptop via `docker-compose up`. Resource sizing below remains the planned target for post-defense deployment.

| Layer | Azure resource | Tier | Cost |
|---|---|---|---|
| Frontend | Vercel | Hobby / free | $0 |
| Backend API + Worker | Azure App Service | B1 | ~$13/mo |
| Database | Azure SQL Database | Basic (5 DTU) | ~$5/mo |
| Cache | Azure Cache for Redis | Basic C0 | ~$16/mo |
| Blob | Azure Blob Storage | Standard LRS | <$1/mo |
| Vector DB | Qdrant (Docker on Azure Container Instances or Railway) | 0.5 vCPU / 1GB | free–$5/mo |
| AI service | Azure Container Instances or Railway | 0.5 vCPU / 1GB | free–$5/mo |
| Email | SendGrid free | — | $0 |
| Monitoring | Application Insights | Free tier (5GB/mo) | $0 |

**Total prod: ~$40/mo** (Qdrant adds ~$5/mo over the original $35 estimate) — comfortably inside the $100 student credit for the ~3 months of post-defense continuation if the team chooses to deploy. Pre-defense the credit is preserved.

### 10.3 Secrets & config

- Dev: `.env` file (gitignored) + `dotnet user-secrets`.
- Prod: Azure Key Vault, referenced by App Service configuration.
- Connection strings, OpenAI key, SendGrid key, JWT signing keys → all secrets. Never committed.

---

## 11. Known Unknowns

Things to figure out during implementation, not now:

1. **~~IRT calibration for the assessment.~~** ~~We'll start with a simple heuristic (difficulty band adjusts based on consecutive correct/wrong), then improve if time permits. Full IRT parameter estimation is post-MVP.~~ **Superseded 2026-05-14 by ADR-049 / ADR-050:** 2PL IRT-lite is now in MVP scope as F15.3. AI-self-rated `(a, b)` at generation + empirical recalibration job for items with ≥50 responses. The simple heuristic remains as fallback path when the AI service is unavailable.
2. **Prompt stability for AI reviews.** Need to tune prompt templates and measure review quality. Budgeted as ongoing work by the AI team throughout the build.
3. **Token cost per submission.** Measure after Sprint 3; tune prompt length caps in AI service based on observed costs.
4. **GitHub repo size limits.** Plan: reject repos >50MB total with a clear error; test with sample repos mid-Sprint 4.
5. **PDF rendering quality for Learning CV.** Using ReportLab (already in AI service) OR a .NET library (QuestPDF). Decide after frontend CV design is locked — deferred decision.
6. **Hangfire vs splitting Worker.** Monitor in Sprint 5 onward; if submissions back up, split the Worker out of the API process.
7. **F11 audit prompt iteration.** Project-level audit prompt is new (ADR-034). Quality vs token-cost trade-off needs Sprint 9 dogfood pass on 3 sample projects (Python / JS / C#); budgeted in S9-T6 (prompt template) + S9-T7 (regression tests) + S9-T12 (dogfood).
8. **Audit-to-Learning-CV cross-link.** Could the user's top-scored audits feed Learning CV's "verified projects" alongside submissions? Out of scope for F11 MVP; revisit post-defense.

---

## Change log

| Date | Change | Reason |
|---|---|---|
| 2026-04-20 | Initial architecture doc | Product-architect skill session |
| 2026-05-02 | Add §4.4 Project Audit Flow; Domain 6 entities (`ProjectAudits`, `ProjectAuditResults`, `AuditStaticAnalysisResults`); §5.2 audit relationships; §5.3 audit indexes; §6.11 Project Audits API; `POST /api/project-audit` in AI-service contract; `/audits` + `/project-audit` rate limits; known-unknowns #7 + #8 | F11 (Project Audit) MVP scope expansion — see ADR-031 / ADR-032 / ADR-033 / ADR-034 |
| 2026-05-07 | Components #13 Qdrant + #14 OpenAI embeddings; system diagram + dev docker-compose updated for Qdrant; §4.5 Mentor Chat data flow (RAG indexing + chat turn); §4.6 Multi-Agent Review data flow; Domain 7 entities (`MentorChatSessions`, `MentorChatMessages`) + `Submissions.MentorIndexedAt` + `ProjectAudits.MentorIndexedAt`; §5.2 + §5.3 mentor-chat relationships and indexes; §6.10 AI-service contract gains `/api/ai-review-multi`, `/api/embeddings/upsert`, `/api/mentor-chat`; §6.12 Mentor Chat API endpoints; §7.2 mentor-chat + multi-agent + embeddings rate limits; §10.2 prod sizing adds Qdrant; deployment marked deferred per ADR-038 | F12 (Mentor Chat — RAG + Qdrant) + F13 (Multi-Agent Review) MVP differentiation features; Azure deployment deferred — see ADR-036 / ADR-037 / ADR-038 |
| 2026-05-14 | §4.7 Adaptive AI Learning System data flows (4 flows: Adaptive Assessment with 2PL IRT, Hybrid AI Path Generation, Continuous Adaptation, Graduation→Next Phase); Domain 8 entities (`LearnerSkillProfiles`, `PathAdaptationEvents`, `IRTCalibrationLog`, `AssessmentSummaries`, `TaskFramings`, `QuestionDrafts`, `TaskDrafts`); column additions to `Questions` (IRT params + Source/ApprovedBy + CodeSnippet + EmbeddingJson + PromptVersion), `Tasks` (SkillTagsJson + LearningGainJson + Source/ApprovedBy + EmbeddingJson), `LearningPaths` (Version + Source + LastAdaptedAt + GenerationReasoningText + AssessmentSummaryId), `PathTasks` (AIReasoning + FocusSkillsJson + PinnedByLearner v1.1), `AIUsageLog` (Feature column); §5.2 + §5.3 relationships and indexes; §6.10 AI-service contract gains 11 new endpoints (`/api/irt/*`, `/api/generate-{questions,tasks,path}`, `/api/{assessment-summary,adapt-path,task-framing,embed,embeddings/reload}`); §6.13 new Backend API surface (admin authoring + calibration; learner adaptations + graduation + reassessment); Known-unknown #1 superseded; entity count updated 20 → ~33 across 6 → 8 domains | F15 (Adaptive AI Assessment Engine) + F16 (AI Learning Path with Continuous Adaptation) MVP flagship feature; defense-day differentiator — see ADR-049 / ADR-050 / ADR-051 / ADR-052 / ADR-053 / ADR-054 and `docs/assessment-learning-path.md` |
