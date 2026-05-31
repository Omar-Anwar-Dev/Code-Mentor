# Code Mentor — Implementation Plan

**Platform:** AI-Powered Learning & Code Review Platform
**Target defense:** Late September 2026
**Plan start:** 2026-04-20
**Last updated:** 2026-05-14

---

## Overview

- **Teams & capacity (per 2-week sprint, ~80 % productivity assumed):**
  - **Backend** (Omar Anwar, Mohammed Hasabo) — 2 × 50h = **~100h/sprint**
  - **Frontend** (Mahmoud Abdelmoaty, Ahmed Khaled) — ~100h/sprint
  - **AI** (Mahmoud Abdelhamid, Ziad Salem) — ~100h/sprint
  - **DevOps** (Eslam Medny) — ~30h/sprint
- **Total sprints:** 21 (+1-week buffer + defense; F11 added 2026-05-02 per ADR-032; F12/F13 reshape 2026-05-07 per ADR-036/037/038; F14 added 2026-05-11 per ADR-040..044; Sprint 13 UI redesign added 2026-05-12; Sprint 14 UserSettings added 2026-05-13 per ADR-046; **Sprints 15–21 added 2026-05-14 for F15 + F16 Adaptive AI Learning System per ADR-049**)
- **Target first milestone:** M0 (thin vertical slice) at end of Sprint 1
- **Per-sprint capacity assumption:** backend ~100h executable; frontend ~100h; AI ~100h; DevOps ~30h. Total ~330h/sprint combined.
- **Hard deadlines:** Defense rehearsal with supervisors — **2026-09-21**. Final defense — **2026-09-29 (target)**.
- **Assumed start date:** 2026-04-20

### Task sizing legend

| Size | Rough hours | Use for |
|---|---|---|
| **XS** | <1h | Config tweak, copy edit |
| **S** | 1–3h | Small endpoint, focused component |
| **M** | 3–6h | Feature slice across layers |
| **L** | 6–12h | Non-trivial feature with multiple moving parts |
| **XL** | >12h | **Split into L or smaller** — never schedule as one task |

Task IDs are stable: `S3-T4` = Sprint 3, Task 4. IDs don't shift if the plan is revised.

### Ownership prefix on task titles

- `[BE]` — Backend team
- `[FE]` — Frontend team
- `[AI]` — AI service team
- `[DO]` — DevOps
- `[Coord]` — Cross-team coordination (owner named in task)

---

## Release Milestones

| ID | Milestone | Definition | Sprint |
|---|---|---|---|
| **M0** | Thin vertical slice | Register → login → see empty dashboard. `docker-compose up` works end-to-end. | End of Sprint 1 |
| **M1** | Internal demo | Full core loop for one user: assessment → path → task → submit → feedback. | End of Sprint 6 |
| **M2** | MVP complete | 10 MVP features (F1–F10) + 4 stretch features (SF1–SF4) done. Running locally. | End of Sprint 8 |
| **M2.5** | F11 Project Audit shipped | F11 end-to-end on the local stack — owner-approved MVP scope expansion | End of Sprint 9 |
| **M3** | Defense-ready *(redefined per ADR-038)* | F12 + F13 shipped, thesis docs synced, demo rehearsed twice with supervisors, local stack stable, demo backup video recorded. **Azure deployment deferred to Post-Defense slot.** | End of Sprint 11 |
| **M4** | **Adaptive AI Learning System integrated** *(added per ADR-049)* | F15 + F16 shipped end-to-end on the local stack: AI-generated adaptive assessment (2PL IRT-lite), AI-generated personalized learning path (hybrid embedding-recall + LLM-rerank), continuous adaptation engine, graduation → reassessment → Next Phase Path loop. ≥10 dogfood learners completed the full loop. Tier-2 metrics recorded (avg pre→post +15pt; ≥70% approval rate; ≥30 empirically calibrated questions). Thesis chapter draft for F15/F16 in place. Defense demo extended from 5-min to 8-min flagship loop. | End of Sprint 21 |

> **Note (2026-05-02):** F11 (Project Audit) is added to MVP scope as a post-M2 expansion. M2 remains anchored at end of Sprint 8 — already achieved with the original 10 features. F11 ships in the new Sprint 9 (inserted between M2 and what was originally Azure deployment); M3 sprint mapping shifted from Sprint 10 → Sprint 11 to absorb the 2-week insertion. See ADR-032.

> **Note (2026-05-07):** Per ADR-036 / ADR-037 / ADR-038, Sprint 10 + Sprint 11 are re-scoped: Sprint 10 ships **F12 (RAG Mentor Chat + Qdrant)**; Sprint 11 ships **F13 (Multi-Agent Code Review)** plus thesis sync, defense rehearsals, polish, demo seed data, and a local-stack load test. **Azure deployment work is deferred to a Post-Defense slot** — the defense runs on the owner's laptop via `docker-compose up`. See ADR-038 for rationale and the deferred Azure task list (preserved in §"Post-Defense slot" below). M3 redefined accordingly.

> **Note (2026-05-14):** Per ADR-049, **F15 + F16 (Adaptive AI Learning System)** are added as MVP flagship scope for defense differentiation. New milestone **M4** mapped to end of Sprint 21 (~ 2026-08-20). M3 stays as the "core defense-ready" state — supervisor rehearsals (S11-T12 + S11-T13) run in parallel with Sprints 15–21 and gate M3 sign-off, NOT M4. M4 inherits the M3 sign-off; once both are satisfied the team enters the rehearsal + thesis-writing buffer (~5 weeks) before defense. Sprints 15–21 follow the F15 → F16 ordering laid out in `docs/assessment-learning-path.md` §11. Each new sprint ends with a sprint-level walkthrough and the `prepare-public-copy.ps1` commit pattern (Omar sole author per `feedback_commit_attribution.md`).

---

## Sprint 1 — Foundations + Auth Vertical Slice (2026-04-20 → 2026-05-03)

**Goal:** User can register, log in via email or GitHub, receive JWT, access `/auth/me`, and see an empty dashboard. `docker-compose up` starts the full stack.
**Demo-able deliverable:** Live demo of register → login → authenticated `GET /auth/me` returning user JSON, plus frontend protected route rendering user name.
**Completes milestone:** M0 (thin vertical slice)
**Estimated capacity used:** Backend ~65h / 100h, Frontend ~40h, DevOps ~20h

### Tasks (in execution order)

- **S1-T1** [S] **[BE]** Initialize .NET solution with 4 projects (Domain, Application, Infrastructure, Api) + test projects
  - Acceptance: `dotnet build` passes; Clean Architecture dependency direction enforced (Domain has no refs; Infrastructure refs Application + Domain; Api refs all).
  - Dependencies: none
  - Risk: low
- **S1-T2** [M] **[BE/DO]** Write `docker-compose.yml` at repo root (SQL Server 2022, Redis 7, Azurite, AI service, Seq)
  - Acceptance: `docker-compose up` brings up all 5 services; `/health` on each is green; `.env.example` documents required variables.
  - Dependencies: S1-T1
  - Risk: medium — first-time Azurite setup, SA password for SQL
- **S1-T3** [M] **[BE]** EF Core `ApplicationDbContext` + `User`, `RefreshToken` entities + initial migration
  - Acceptance: `dotnet ef database update` creates tables in the containerized SQL. Seed `admin@codementor.local` user on startup (dev only).
  - Dependencies: S1-T2
  - Risk: low
- **S1-T4** [M] **[BE]** Integrate ASP.NET Core Identity with custom `User` entity (RS256 JWT signing keys generated)
  - Acceptance: Identity tables created in same DbContext; password hashing verified via unit test.
  - Dependencies: S1-T3
  - Risk: medium — Identity + custom User can be fiddly
- **S1-T5** [L] **[BE]** Auth endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`
  - Acceptance: All 6 endpoints pass integration tests (happy path + 3 error cases each); Swagger UI documents them; JWT + refresh token rotation works.
  - Dependencies: S1-T4
  - Risk: medium
- **S1-T6** [M] **[BE]** JWT auth middleware + authorization policies (`RequireLearner`, `RequireAdmin`, `OwnsResource`)
  - Acceptance: Unauthenticated request → 401; wrong role → 403; correct role → 200.
  - Dependencies: S1-T5
  - Risk: low
- **S1-T7** [L] **[BE]** GitHub OAuth flow (`GET /auth/github/login`, `GET /auth/github/callback`) with AES-256 token encryption in `OAuthTokens` table
  - Acceptance: End-to-end test: click login → redirect → consent → callback → user created or linked → JWT issued. Token decryptable via a unit test.
  - Dependencies: S1-T5, S1-T3
  - Risk: medium — OAuth flow edge cases (state CSRF, email conflict with existing account)
- **S1-T8** [M] **[BE]** Redis sliding-window rate limiting on `/auth/login` (5/15min/IP) + global limit (100/min/user)
  - Acceptance: Test: 6 rapid logins from same IP → 429 with `Retry-After`.
  - Dependencies: S1-T2, S1-T5
  - Risk: low
- **S1-T9** [S] **[BE]** Swagger + health endpoints (`/health`, `/ready` — DB + Redis reachability checks)
  - Acceptance: Visiting `/swagger` renders all S1 endpoints; `/ready` returns green only when all deps up.
  - Dependencies: S1-T6
  - Risk: low
- **S1-T10** [M] **[BE]** Serilog structured logs with `RequestId`, `UserId` enrichers; outputs to console + Seq (dev)
  - Acceptance: A `/auth/login` request shows in Seq with correlation fields. Log level configurable via appsettings.
  - Dependencies: S1-T6
  - Risk: low
- **S1-T11** [M] **[DO]** GitHub Actions CI: build + test on every PR (backend + frontend separately)
  - Acceptance: Opening a PR triggers workflow; red on failing tests; coverage report uploaded as artifact.
  - Dependencies: S1-T1
  - Risk: low
- **S1-T12** [L] **[FE]** Refactor existing auth UI (Redux slice, login form, register form, GitHub button) to call the real backend instead of mocks; implement token refresh interceptor
  - Acceptance: Registering via UI creates a real DB row; logging in stores JWT; 401 from API triggers refresh flow; logout revokes refresh token.
  - Dependencies: S1-T5
  - Risk: medium — removing mocks can surface hidden UI bugs
- **S1-T13** [M] **[FE]** Protected-route wrapper + stub `/dashboard` page (welcome + logout button)
  - Acceptance: Unauthenticated user on `/dashboard` → redirect to `/login`; authenticated → sees name + email.
  - Dependencies: S1-T12
  - Risk: low
- **S1-T14** [S] **[BE/Coord]** Write root `README.md`: first-run instructions, env var list, `docker-compose up` flow, how to seed admin user
  - Acceptance: A teammate following only the README gets the stack running in <30 min from a clean clone.
  - Dependencies: S1-T12
  - Risk: low
- **S1-T15** [S] **[BE]** M0 demo script + smoke test run-through (register → login → /auth/me → GitHub login → /auth/me)
  - Acceptance: All 5 steps pass; screenshot or short recording archived in `/docs/demos/M0.md`.
  - Dependencies: S1-T13
  - Risk: low

### Sprint 1 exit criteria

- All task acceptance criteria checked.
- Demo script (S1-T15) runs end-to-end without intervention.
- Lint, typecheck, and test suites green (backend + frontend).
- `docs/progress.md` created and updated with M0 completion entry.
- No blocking `TODO` left in auth paths.

---

## Sprint 2 — Assessment Engine (2026-05-04 → 2026-05-17)

**Goal:** Learner can start a 30-question adaptive assessment, answer each question, and see their scored results at the end.
**Demo-able deliverable:** Live demo of starting assessment → answering 5 questions with visible difficulty adjustment → auto-completing (or timing out) → scored result page.
**Estimated capacity used:** Backend ~90h / 100h, Frontend ~70h

### Tasks

- **S2-T1** [M] **[BE]** `Questions`, `Assessments`, `AssessmentResponses` entities + migrations
  - Acceptance: Tables created; EF configs for JSON columns (Options) validated with round-trip test.
  - Dependencies: S1-T3
  - Risk: low
- **S2-T2** [L] **[BE/Coord]** Seed question bank (≥60 questions, ≥12 per category across 5 categories, difficulty 1–3 balanced)
  - Acceptance: `DbSeedService` populates bank on empty DB; questions span categories: DataStructures, Algorithms, OOP, Databases, Security.
  - Dependencies: S2-T1
  - Risk: medium — content quality depends on team authoring; plan 20 each by 3 team members, reviewed by Omar
- **S2-T3** [M] **[BE]** `POST /assessments` endpoint → creates Assessment row, returns first question (track-weighted medium difficulty)
  - Acceptance: Integration test creates row; first question returned is difficulty=2 and in allowed categories.
  - Dependencies: S2-T2
  - Risk: low
- **S2-T4** [L] **[BE]** `IAdaptiveQuestionSelector` logic: picks next question based on running history (difficulty escalation rules per PRD F2)
  - Acceptance: Unit tests cover: 2 consecutive correct → harder; 2 wrong → easier; category balance enforced; no question repeated.
  - Dependencies: S2-T3
  - Risk: medium — adaptive logic has edge cases (last question, forced category fill)
- **S2-T5** [M] **[BE]** `POST /assessments/{id}/answers` endpoint → records response, returns next question OR completion
  - Acceptance: Integration test simulates 30 answers through one session; stores all responses; returns `{ completed: true }` on #30.
  - Dependencies: S2-T4
  - Risk: low
- **S2-T6** [M] **[BE]** `ScoringService` + completion logic: computes per-category scores, overall level, updates `Assessments` row, writes `SkillScores`
  - Acceptance: After simulated full session, `SkillScores` has one row per category for the user; overall level matches threshold rules.
  - Dependencies: S2-T5
  - Risk: low
- **S2-T7** [S] **[BE]** `GET /assessments/{id}` (status + result); `GET /assessments/me/latest`; 40-minute auto-timeout
  - Acceptance: Polling endpoint returns in-progress while active, full result when completed; timeout after 40min with `TimedOut` result.
  - Dependencies: S2-T6
  - Risk: low
- **S2-T8** [S] **[BE]** 30-day reattempt policy enforcement on `POST /assessments`
  - Acceptance: Second attempt within 30 days → 409 with clear message; after 30 days → succeeds.
  - Dependencies: S2-T3
  - Risk: low
- **S2-T9** [S] **[BE]** `PATCH /auth/me` + profile-picture upload path (Blob pre-signed URL reused in S4 — so just profile fields here)
  - Acceptance: Edit full name + GitHub username persisted; email immutable (yet).
  - Dependencies: S1-T5
  - Risk: low
- **S2-T10** [L] **[FE]** Assessment UI: track selection → start flow → question renderer (4 options) → countdown timer → result page (per-category scores rendered in Recharts radar)
  - Acceptance: Full flow usable without console errors; renders on mobile 320px and desktop; result page links to dashboard.
  - Dependencies: S2-T3, S2-T5, S2-T7
  - Risk: medium
- **S2-T11** [M] **[FE]** Profile page (name, email, GitHub username, profile picture URL) with form validation
  - Acceptance: Edit → save → refresh shows changes; invalid input shows inline errors.
  - Dependencies: S2-T9
  - Risk: low
- **S2-T12** [S] **[BE]** Add `IdempotencyKey` header support on `POST /assessments/{id}/answers` (prevents duplicate from network retry)
  - Acceptance: Same idempotency key → returns original response without creating duplicate.
  - Dependencies: S2-T5
  - Risk: low

### Sprint 2 exit criteria

- Demo run: user registers, picks "Full Stack" track, answers 30 questions, sees scored result page with radar chart.
- Question-bank seed file committed with ≥60 questions.
- Backend ≥50 % coverage on `Application` layer.

---

## Sprint 3 — Learning Path + Task Library (2026-05-18 → 2026-05-31)

**Goal:** On assessment completion, a personalized path is generated; learner sees their path on the dashboard and can browse all tasks.
**Demo-able deliverable:** Learner completes assessment → system generates a path with ~6 tasks → dashboard shows path card with ordered tasks → clicking a task shows task detail page.
**Estimated capacity used:** Backend ~90h, Frontend ~80h

### Tasks

- **S3-T1** [M] **[BE]** `Tasks`, `LearningPaths`, `PathTasks` entities + migrations + indexes
  - Acceptance: Tables created; unique `(PathId, OrderIndex)` constraint enforced in test.
  - Dependencies: S2-T1
  - Risk: low
- **S3-T2** [L] **[BE/Coord]** Seed task library: ~21 tasks across 3 tracks (Full Stack, Backend, Python) with descriptions, difficulty, language, prerequisites
  - Acceptance: ≥7 tasks per track; all tasks `IsActive=true`; markdown descriptions render safely.
  - Dependencies: S3-T1
  - Risk: medium — content authoring effort; plan: each team member writes 3 tasks, reviewed as batch
- **S3-T3** [M] **[BE]** Hangfire setup: SQL-backed job store, dashboard at `/hangfire` (admin-only), Serilog integration
  - Acceptance: Dashboard loads; a test job runs and shows `Succeeded`; non-admin request → 403.
  - Dependencies: S1-T6
  - Risk: low
- **S3-T4** [L] **[BE]** `GenerateLearningPathJob`: enqueued on assessment completion; selects track template; orders tasks (weakest category first); writes `LearningPath` + `PathTasks`
  - Acceptance: After full assessment, path exists within 30s with 5–7 ordered tasks relevant to weakness.
  - Dependencies: S3-T2, S3-T3, S2-T6
  - Risk: medium — template logic + ordering edge cases
- **S3-T5** [M] **[BE]** `GET /learning-paths/me/active` (full payload with tasks + status)
  - Acceptance: Returns active path or 404; response shape matches API contract in architecture.md.
  - Dependencies: S3-T4
  - Risk: low
- **S3-T6** [S] **[BE]** `POST /learning-paths/me/tasks/{pathTaskId}/start` (mark `InProgress`, set `StartedAt`)
  - Acceptance: Call → status updates; second call → 409 if already started.
  - Dependencies: S3-T5
  - Risk: low
- **S3-T7** [M] **[BE]** `GET /tasks` list endpoint with filters (`track`, `difficulty`, `category`, `language`, `search`) + pagination
  - Acceptance: Response ≤300ms with 21 tasks; search returns expected rows; pagination `page + size`.
  - Dependencies: S3-T1
  - Risk: low
- **S3-T8** [S] **[BE]** `GET /tasks/{id}` detail endpoint
  - Acceptance: Returns all task fields + deserialized prerequisites; missing → 404.
  - Dependencies: S3-T1
  - Risk: low
- **S3-T9** [M] **[BE]** Redis caching layer for `/tasks` list (5min TTL) + cache invalidation on admin CRUD
  - Acceptance: Repeated GET served <50ms; after admin mutation, cache busted (test by inspecting response latency + cache key).
  - Dependencies: S3-T7
  - Risk: low
- **S3-T10** [L] **[FE]** Dashboard v1: active path card (progress bar, next task CTA, ordered task list)
  - Acceptance: Renders path returned by backend; clicking task navigates to `/tasks/{id}`.
  - Dependencies: S3-T5
  - Risk: low
- **S3-T11** [L] **[FE]** Task library page: filterable list, task card grid, detail page with markdown rendering + "Start task" button
  - Acceptance: All filters work; detail page renders markdown description safely.
  - Dependencies: S3-T7, S3-T8
  - Risk: low
- **S3-T12** [S] **[BE]** Update `/dashboard/me` aggregate endpoint (even if just forwarding for now — lock the contract)
  - Acceptance: Returns `{ activePath, recentSubmissions: [], skillSnapshot }` shape — `recentSubmissions` empty until Sprint 4.
  - Dependencies: S3-T5
  - Risk: low

### Sprint 3 exit criteria

- Demo: assessment completion → path auto-generates → dashboard shows it → learner clicks first task and reads it.
- `/tasks` page filterable, responsive, demos cleanly.

---

## Sprint 4 — Code Submission Pipeline (Ingress) (2026-06-01 → 2026-06-14)

**Goal:** Learner can submit code via GitHub URL or ZIP upload; backend accepts and tracks status (analysis job runs but is a no-op stub).
**Demo-able deliverable:** Upload a ZIP → see submission in dashboard list with `Processing → Completed (stub)` status transition.
**Estimated capacity used:** Backend ~95h, Frontend ~70h

### Tasks

- **S4-T1** [M] **[BE]** `Submissions` entity + migrations + indexes (`UserId, CreatedAt DESC`, `Status`)
  - Acceptance: Table created; status enum serialized as string.
  - Dependencies: S3-T1
  - Risk: low
- **S4-T2** [M] **[BE]** `IBlobStorage` abstraction → Azurite-backed impl: container creation, upload, pre-signed URL generation
  - Acceptance: Integration test uploads a 1KB file to `submissions-uploads` container via pre-signed URL; retrieves it.
  - Dependencies: S1-T2
  - Risk: medium — Azurite quirks with SAS tokens
- **S4-T3** [S] **[BE]** `POST /uploads/request-url` → returns pre-signed URL + blob path
  - Acceptance: URL valid for 10 min; upload via URL works without backend involvement.
  - Dependencies: S4-T2
  - Risk: low
- **S4-T4** [L] **[BE]** `POST /submissions` — handles both GitHub URL and ZIP (body has `submissionType` discriminator); validates task exists + user owns path; creates Submission; enqueues `SubmissionAnalysisJob` (stub)
  - Acceptance: Happy path creates row; invalid task → 404; bad GitHub URL → 400; returns 202 with submissionId.
  - Dependencies: S4-T1, S4-T3, S3-T3
  - Risk: medium
- **S4-T5** [M] **[BE]** GitHub repo access via Octokit + user's stored OAuth token: shallow clone into temp dir, size check (≤50MB total)
  - Acceptance: Clone works for public repo without auth; private repo with stored token; over-size rejected.
  - Dependencies: S1-T7, S4-T4
  - Risk: medium — private repo access edge cases
- **S4-T6** [M] **[BE]** `SubmissionAnalysisJob` skeleton: status transitions (`Pending → Processing → Completed`), 10-min hard timeout, 3-retry exponential backoff
  - Acceptance: Job runs; status transitions visible via `GET /submissions/{id}`; timeout test works.
  - Dependencies: S4-T4, S3-T3
  - Risk: low
- **S4-T7** [S] **[BE]** `GET /submissions/{id}`, `GET /submissions/me` (paginated), `POST /submissions/{id}/retry`
  - Acceptance: Retry on `Failed` re-enqueues; on `Completed` → 409; list paginated.
  - Dependencies: S4-T6
  - Risk: low
- **S4-T8** [M] **[FE]** Submission UI on task detail page: tabs (GitHub URL / ZIP upload); upload uses pre-signed URL directly to Azurite; progress indicator
  - Acceptance: ZIP progress bar; success → redirect to submission detail page.
  - Dependencies: S4-T3, S4-T4
  - Risk: medium
- **S4-T9** [M] **[FE]** Submission detail page (status polling every 3s, placeholder feedback view "Processing…")
  - Acceptance: Status updates visible; polling stops on Completed/Failed.
  - Dependencies: S4-T7
  - Risk: low
- **S4-T10** [M] **[FE]** Update dashboard `recentSubmissions` panel (last 5 submissions list with status badges)
  - Acceptance: List populates from `GET /dashboard/me`; status updates on refresh.
  - Dependencies: S3-T12, S4-T7
  - Risk: low
- **S4-T11** [M] **[BE]** File validation service: MIME-type check, max 50MB, ZIP structure sanity (no path traversal)
  - Acceptance: Malicious ZIP with `../../etc/passwd` → rejected; >50MB → rejected.
  - Dependencies: S4-T6
  - Risk: medium — security-sensitive

### Sprint 4 exit criteria

- Demo: upload ZIP via UI → see in dashboard → stub "Completed" status reached.
- GitHub URL path demoed with a sample public repo.
- No path-traversal or file-type bypass possible (documented test cases).

---

## Sprint 5 — AI Service Integration + Static Analysis (2026-06-15 → 2026-06-28)

**Goal:** Submission triggers real static-analysis call to AI service; results stored per tool.
**Demo-able deliverable:** Submit a small Python project → see static-analysis issues surfaced per tool in a raw JSON view.
**Estimated capacity used:** Backend ~85h, AI team ~80h

### Tasks

- **S5-T1** [M] **[BE]** `IAiReviewClient` Refit interface + typed HTTP client for AI service endpoints (`/api/analyze`, `/api/analyze-zip`, `/api/ai-review`)
  - Acceptance: Unit test mocks AI service; integration test hits real service in Docker.
  - Dependencies: S1-T2
  - Risk: low
- **S5-T2** [M] **[BE]** `StaticAnalysisResults` entity + migrations
  - Acceptance: One row per tool per submission; `IssuesJson` stored as JSON column.
  - Dependencies: S4-T1
  - Risk: low
- **S5-T3** [L] **[BE]** Wire `SubmissionAnalysisJob` to: fetch code → upload/pass to AI service `/api/analyze-zip` → parse per-tool results → save `StaticAnalysisResults` rows
  - Acceptance: Job ends with at least 1 `StaticAnalysisResult` row per relevant tool; parsing handles empty/error responses.
  - Dependencies: S5-T1, S5-T2, S4-T6
  - Risk: medium
- **S5-T4** [M] **[BE]** Task `ExpectedLanguage` → static-analysis tool mapping (Python → Bandit; JS/TS → ESLint; C# → Roslyn; etc.)
  - Acceptance: Job selects correct tools based on task; tested across 3 tracks.
  - Dependencies: S5-T3
  - Risk: low
- **S5-T5** [M] **[BE]** Graceful-degradation handling: AI service down → save partial results, mark AI review `Unavailable`, schedule retry job in 15 min
  - Acceptance: Forced AI-service-down test → submission still reaches `Completed` status with static analysis; retry runs after 15 min.
  - Dependencies: S5-T3
  - Risk: medium
- **S5-T6** [L] **[AI]** Add Roslyn analyzer support to AI service Docker image + wire into `/api/analyze`
  - Acceptance: C# code in test ZIP returns Roslyn findings; Docker image rebuild works.
  - Dependencies: none (parallel to backend)
  - Risk: medium — new tool integration in the AI container
- **S5-T7** [M] **[AI]** Normalize AI-service output: ensure consistent JSON shape across all tools (`{ tool, severity, file, line, column, rule, message }`)
  - Acceptance: Spec defined in `docs/ai-contract.md`; all 6 tools (ESLint, Bandit, Cppcheck, PHPStan, PMD, Roslyn) return same shape.
  - Dependencies: S5-T6
  - Risk: medium
- **S5-T8** [M] **[AI]** AI service input validation + request size caps (reject submissions >50MB, reject >500 files)
  - Acceptance: Oversize request → 413 response; clear error message.
  - Dependencies: none
  - Risk: low
- **S5-T9** [S] **[BE]** Expose raw static-analysis results via dev-only endpoint `GET /submissions/{id}/static-results` (for demo/debugging)
  - Acceptance: Requires `?dev=true` query + `RequireAdmin`; returns raw JSON.
  - Dependencies: S5-T3
  - Risk: low
- **S5-T10** [M] **[BE]** Add Serilog correlation from job → AI service (pass `CorrelationId` in header)
  - Acceptance: AI service receives header; logs show matching IDs across both services.
  - Dependencies: S1-T10
  - Risk: low
- **S5-T11** [M] **[BE]** Job metrics: per-phase duration logging (fetch, static, AI, aggregate)
  - Acceptance: Each phase logged with millis; visible in Seq/App Insights.
  - Dependencies: S5-T3
  - Risk: low

### Sprint 5 exit criteria

- Demo: submit small Python project → job runs → static results visible via admin endpoint → AI-down failure case demoed with retry.
- P95 static-analysis phase ≤3 min on medium-size repos.

---

## Sprint 6 — AI Review + Feedback Aggregation + UI (2026-06-29 → 2026-07-12)

**Goal:** Full feedback loop working. Learner submits → sees AI + static combined feedback with scores, strengths, weaknesses, inline annotations.
**Demo-able deliverable:** End-to-end demo of Persona A (Layla): register → assess → path → submit Python task → view AI-reviewed feedback with scores and annotations.
**Completes milestone:** M1 (internal demo)
**Estimated capacity used:** Backend ~95h, Frontend ~90h, AI team ~80h

### Tasks

- **S6-T1** [L] **[AI]** Finalize `/api/ai-review` prompt template: takes code + task context + static summary → returns structured JSON (`overallScore`, `perCategoryScores`, `strengths[]`, `weaknesses[]`, `inlineAnnotations[]`)
  - Acceptance: Prompt versioned in repo; 5 test inputs produce valid structured outputs; token usage logged.
  - Dependencies: S5-T7
  - Risk: high — prompt engineering is iterative; budget extra time
- **S6-T2** [M] **[AI]** Response schema validation (Pydantic): reject/repair malformed LLM outputs
  - Acceptance: Intentionally malformed response in test → service repairs or retries once, then errors cleanly.
  - Dependencies: S6-T1
  - Risk: medium
- **S6-T3** [M] **[BE]** `AIAnalysisResults` entity + migrations
  - Acceptance: Table stores overall score, JSON feedback payloads, model name, token count.
  - Dependencies: S4-T1
  - Risk: low
- **S6-T4** [L] **[BE]** Wire `SubmissionAnalysisJob` AI-review phase: call `/api/ai-review` with code+context+static → save `AIAnalysisResults`
  - Acceptance: Job ends with AI row; token count captured.
  - Dependencies: S6-T3, S5-T3, S6-T2
  - Risk: medium
- **S6-T5** [L] **[BE]** `FeedbackAggregator` service: merges static + AI into unified feedback payload; writes `Recommendations` + `Resources` rows
  - Acceptance: Unified payload has: overall 0-100, 5 category scores, strengths/weaknesses, inline annotations, 3-5 recommendations, 3-5 resources. Test with 2 sample submissions.
  - Dependencies: S6-T4
  - Risk: medium
- **S6-T6** [M] **[BE]** `Recommendations`, `Resources` entities + migrations + `Notifications` population on completion
  - Acceptance: Rows created; `GET /notifications` shows "Feedback ready" item.
  - Dependencies: S4-T1
  - Risk: low
- **S6-T7** [M] **[BE]** `GET /submissions/{id}/feedback` endpoint returning the aggregated payload
  - Acceptance: Returns all unified fields; 404 if submission not Completed or not owned by user.
  - Dependencies: S6-T5
  - Risk: low
- **S6-T8** [L] **[FE]** Feedback page v1: status banner + overall score + per-category radar + strengths/weaknesses lists
  - Acceptance: Renders for a completed submission; responsive.
  - Dependencies: S6-T7
  - Risk: low
- **S6-T9** [L] **[FE]** Feedback page v2: inline annotations view (file tree + Prism.js syntax-highlighted code + annotation markers + click-to-expand)
  - Acceptance: Clicking a file shows code with per-line comments; supports JS, Python, C#, Java.
  - Dependencies: S6-T8
  - Risk: medium
- **S6-T10** [S] **[FE]** Feedback page v3: recommendations cards + resource links section; "Submit new attempt" button
  - Acceptance: Cards clickable → add-to-path works (depends on S7); resource links open in new tab; new-attempt returns to submission UI.
  - Dependencies: S6-T8
  - Risk: low
- **S6-T11** [M] **[BE]** `GET /notifications` + `POST /notifications/{id}/read`
  - Acceptance: Paginated, filterable by `isRead`.
  - Dependencies: S6-T6
  - Risk: low
- **S6-T12** [M] **[FE]** Notifications bell in app header (dropdown with unread count)
  - Acceptance: Shows count; clicking item marks read.
  - Dependencies: S6-T11
  - Risk: low
- **S6-T13** [M] **[Coord]** Dogfood end-to-end with 5 real submissions — document AI review quality concerns, create tuning backlog for AI team
  - Acceptance: Report in `docs/demos/M1-dogfood.md` with screenshots + quality notes.
  - Dependencies: S6-T10
  - Risk: medium — surfaces unknowns; buffer time here

### Sprint 6 exit criteria

- Demo: full Persona A journey passes.
- Feedback loop p95 ≤5min on test corpus.
- M1 milestone signed off with supervisors at bi-weekly meeting.
- `docs/progress.md` updated; known issues documented.

---

## Sprint 7 — Learning CV + Dashboard + Admin Panel (2026-07-13 → 2026-07-26)

**Goal:** Learner can generate + share + PDF-export their Learning CV. Dashboard polished. Admin can manage content.
**Demo-able deliverable:** Learner generates CV → toggles public → visits public URL in incognito → downloads PDF. Admin creates a new task visible to learners.
**Estimated capacity used:** Backend ~95h, Frontend ~90h, AI team ~30h (PDF generation if via ReportLab)

### Tasks

- **S7-T1** [M] **[BE]** `LearningCVs`, `SkillScores` entities (SkillScores already exists, verify). Update on each submission's per-category score.
  - Acceptance: After submission, `SkillScores` rows updated for affected categories (running average).
  - Dependencies: S6-T5
  - Risk: low
- **S7-T2** [L] **[BE]** `GET /learning-cv/me` — aggregates profile + skill scores + top 5 submissions + verified projects → returns JSON
  - Acceptance: Response ≤500ms; contains all fields; empty-state handled (no submissions yet).
  - Dependencies: S7-T1
  - Risk: low
- **S7-T3** [M] **[BE]** `PATCH /learning-cv/me` (privacy toggle + slug generation on first publish)
  - Acceptance: Slug unique, URL-safe; toggle persists.
  - Dependencies: S7-T2
  - Risk: low
- **S7-T4** [M] **[BE]** `GET /public/cv/{slug}` — public view with redaction (no email, no internal IDs); 404 if not public; view-count increment IP-deduped 24h
  - Acceptance: Tested in incognito; redacted fields absent; counter increments once per IP/day.
  - Dependencies: S7-T3
  - Risk: low
- **S7-T5** [L] **[BE/Coord]** PDF generation: **decision + implementation** — QuestPDF (.NET) recommended for MVP (no extra hop), backend-local rendering
  - Acceptance: `GET /learning-cv/me/pdf` streams a styled A4 PDF; matches web CV visually (header, skill chart as rendered PNG, project cards).
  - Dependencies: S7-T2
  - Risk: medium — PDF layout always has surprises; buffer 1 extra day
- **S7-T6** [L] **[FE]** CV page (`/cv/me`): card layout with profile, skill bar chart, verified projects (cards), stats; share + download buttons
  - Acceptance: Design language matches existing frontend (colors, typography); responsive.
  - Dependencies: S7-T2, S7-T3
  - Risk: low
- **S7-T7** [M] **[FE]** Public CV page (`/cv/:slug`) — stripped version; SEO meta tags; "Create your own" CTA
  - Acceptance: Works in incognito; Lighthouse SEO score ≥80.
  - Dependencies: S7-T4
  - Risk: low
- **S7-T8** [L] **[FE]** Dashboard polish v2: skill snapshot widget + CV quick link + submission-status pills + loading skeletons
  - Acceptance: p95 FCP ≤2s on hot cache; empty states handled (no path, no submissions, no CV).
  - Dependencies: S6-T12
  - Risk: low
- **S7-T9** [L] **[BE]** Admin endpoints: Task CRUD (`POST/PUT/DELETE /admin/tasks`), Question CRUD (`POST/PUT/DELETE /admin/questions`), User list/deactivate (`GET /admin/users`, `PATCH /admin/users/{id}`)
  - Acceptance: All endpoints guarded; writes audit-logged.
  - Dependencies: S1-T6
  - Risk: low
- **S7-T10** [L] **[FE]** Admin panel: task list + create/edit modal + question list + create/edit modal + user list + role/deactivate actions
  - Acceptance: All actions work end-to-end; validation errors surface; RBAC-guarded route.
  - Dependencies: S7-T9
  - Risk: low
- **S7-T11** [M] **[BE]** `AuditLogs` middleware: intercepts admin writes, captures old/new values, user, IP
  - Acceptance: Each admin CRUD produces a log row; old/new values JSON captured.
  - Dependencies: S7-T9
  - Risk: low
- **S7-T12** [S] **[BE]** Cache invalidation on admin task/question writes (bust Redis keys)
  - Acceptance: After admin edit, `GET /tasks` returns updated content without stale cache.
  - Dependencies: S3-T9, S7-T9
  - Risk: low

### Sprint 7 exit criteria

- Demo: generate CV → toggle public → share URL → download PDF. Admin creates a task → learner sees it in library.
- Supervisors can see admin UI working.

---

## Sprint 8 — Stretch Features + MVP Hardening (2026-07-27 → 2026-08-09)

**Goal:** M2 — all 10 MVP features complete. Ship as many of the 4 stretch features as time allows. Push test coverage and fix known bugs.
**Demo-able deliverable:** MVP feature-complete demo; stretch highlights (analytics chart, XP/level, recommendations). Bug list cleared.
**Completes milestone:** M2
**Estimated capacity used:** Backend ~85h, Frontend ~85h

### Tasks

- **S8-T1** [M] **[BE]** [Stretch SF1] Analytics aggregation endpoint `GET /analytics/me` — skill trend over time, submissions-per-week
  - Acceptance: Returns 12-week window data; empty state handled.
  - Dependencies: S7-T1
  - Risk: low
- **S8-T2** [M] **[FE]** [Stretch SF1] Analytics page: skill-trend line chart, submissions bar chart
  - Acceptance: Loads in <2s; Recharts rendering.
  - Dependencies: S8-T1
  - Risk: low
- **S8-T3** [M] **[BE]** [Stretch SF2] `XpTransactions` entity + level calc service + 5 badge definitions seeded + awarding hooks
  - Acceptance: Completing assessment → 100 XP; each submission → 50 XP; score ≥80 → badge. Level formula documented.
  - Dependencies: S7-T1
  - Risk: low
- **S8-T4** [M] **[FE]** [Stretch SF2] XP/level badge on dashboard + badge gallery page
  - Acceptance: Visible; newly earned badges flash.
  - Dependencies: S8-T3
  - Risk: low
- **S8-T5** [M] **[BE]** [Stretch SF3] `POST /learning-paths/me/tasks/from-recommendation/{recId}` — adds task to end of active path, marks recommendation `IsAdded`
  - Acceptance: After add, new `PathTask` at max `OrderIndex + 1`.
  - Dependencies: S3-T5, S6-T6
  - Risk: low
- **S8-T6** [S] **[FE]** [Stretch SF3] "Add to my path" button wiring on feedback page recommendations cards
  - Acceptance: Button → API call → toast "Added!" → path refreshed.
  - Dependencies: S8-T5
  - Risk: low
- **S8-T7** [S] **[BE]** [Stretch SF4] `POST /submissions/{id}/rating` — thumbs up/down per category; stored in new `FeedbackRatings` table
  - Acceptance: Rating stored; duplicate calls overwrite.
  - Dependencies: S6-T7
  - Risk: low
- **S8-T8** [S] **[FE]** [Stretch SF4] Thumbs up/down UI on feedback categories
  - Acceptance: Buttons visible; state persists after refresh.
  - Dependencies: S8-T7
  - Risk: low
- **S8-T9** [L] **[BE/FE]** MVP hardening: fix top 10 bugs from M1 dogfood + testing; polish UX copy across all pages
  - Acceptance: Bug list in `docs/mvp-bugs.md` all closed or triaged; supervisors approve UX pass.
  - Dependencies: all previous sprints
  - Risk: medium — bug list size unknown
- **S8-T10** [L] **[BE]** Push `Application` layer test coverage to ≥70 %; add integration tests for auth, submission pipeline happy path, admin task CRUD
  - Acceptance: Coverlet report shows ≥70 %; CI gate enforced.
  - Dependencies: ongoing
  - Risk: medium — retrofitting tests is slow
- **S8-T11** [M] **[BE]** Error boundaries + friendly error pages + custom 404/500
  - Acceptance: All exception paths exit cleanly; no raw stack traces visible.
  - Dependencies: all previous
  - Risk: low
- **S8-T12** [M] **[FE]** Accessibility pass: semantic HTML audit, ARIA labels on interactive elements, keyboard-nav test
  - Acceptance: Lighthouse accessibility ≥90 on 5 primary pages.
  - Dependencies: ongoing
  - Risk: medium

### Sprint 8 exit criteria

- M2 signed off: all 10 MVP features + stretch features accounted for.
- `docs/progress.md` shows MVP complete.
- Bug backlog <5 open issues, all low-severity.

---

## Sprint 9 — Project Audit Feature (2026-08-10 → 2026-08-23) *[NEW — added 2026-05-02 per ADR-032]*

**Goal:** Ship F11 (Project Audit) end-to-end — form → pipeline → results page → history → Landing CTA.
**Demo-able deliverable:** A learner registers, navigates from the Landing CTA → uploads a small Python project + structured description → receives the full 8-section audit report in <6 minutes; views audit history; deletes one audit.
**Estimated capacity used:** Backend ~50h, Frontend ~55h, AI ~35h. Total ~140h within the ~330h sprint budget.

### Tasks (in execution order)

- **S9-T1** [M] **[BE]** `ProjectAudits` + `ProjectAuditResults` + `AuditStaticAnalysisResults` entities + EF migrations + indexes (`UserId, CreatedAt DESC`, `Status`, `IsDeleted, UserId`)
  - Acceptance: Tables created; round-trip test for `ProjectDescriptionJson`, `ScoresJson`, `IssuesJson` serialization; soft-delete query verified.
  - Dependencies: S4-T1 (Submissions infra reused as pattern reference)
  - Risk: low
- **S9-T2** [S] **[BE]** Redis sliding-window rate limiter on `POST /audits` — 3 / 24h / user
  - Acceptance: 4th audit attempt within 24h → 429 with `Retry-After`; tested for two distinct users in parallel.
  - Dependencies: S1-T8 (rate-limit infra), S9-T1
  - Risk: low
- **S9-T3** [L] **[BE]** `POST /audits` endpoint — accepts structured description (FluentValidation), GitHub URL or ZIP source; creates `ProjectAudit` row; enqueues `ProjectAuditJob`; returns 202 with `auditId`
  - Acceptance: Happy path creates row + enqueues job; invalid description → 400; bad GitHub URL → 400; size >50MB → 413; rate-limit exceeded → 429.
  - Dependencies: S9-T1, S9-T2, S4-T3 (pre-signed URL flow reused), S5-T1 (`IAiReviewClient`)
  - Risk: medium
- **S9-T4** [L] **[BE]** `ProjectAuditJob` Hangfire job — fetch code → static analysis → call `/api/project-audit` → save results → graceful AI-down handling → 12-min hard timeout
  - Acceptance: Job pipeline reaches Completed for valid input; AI-down test → static-only audit, retry once after 15 min; timeout test → Failed status with `ErrorMessage`.
  - Dependencies: S9-T3, S9-T1, S5-T3 (static-analysis pattern), S6-T4 (AI review pattern)
  - Risk: medium — first multi-language static-analysis fan-out (no `ExpectedLanguage` to gate on)
- **S9-T5** [M] **[BE]** Read endpoints: `GET /audits/{id}`, `GET /audits/{id}/report`, `GET /audits/me` (paginated, filterable: dateFrom, dateTo, scoreMin, scoreMax), `DELETE /audits/{id}` (soft), `POST /audits/{id}/retry`
  - Acceptance: Ownership enforced; soft-deleted excluded from `/audits/me`; retry on Failed → re-enqueues, on Completed → 409; report 409 if not yet Completed.
  - Dependencies: S9-T1, S9-T4
  - Risk: low
- **S9-T6** [L] **[AI]** New `POST /api/project-audit` endpoint — prompt template `prompts/project_audit.v1.txt` + Pydantic response schema (8-section structured JSON) + 1-retry on malformed
  - Acceptance: 3 sample inputs (Python / JS / C#) produce valid structured output; token usage logged; tone codified in system message (senior code-reviewer, ADR-034).
  - Dependencies: S6-T1 (existing `/api/ai-review` pattern as reference)
  - Risk: high — first attempt at audit-tone prompt; buffer extra day per ADR-034 / R11
- **S9-T7** [M] **[AI]** 3 regression test cases for `/api/project-audit` + token cap enforcement (10k input / 3k output) + prompt versioning in repo
  - Acceptance: `pytest tests/regression_audit_*.py` green; over-cap input → 413; CHANGELOG entry per prompt version bump.
  - Dependencies: S9-T6
  - Risk: medium
- **S9-T8** [L] **[FE]** `/audit/new` multi-step form — 6 required + 3 optional fields, GitHub URL / ZIP source tabs (reusing existing pre-signed Blob upload component), client-side validation, submit flow, 90-day retention copy
  - Acceptance: Required-field validation surfaces inline errors; ZIP path uses pre-signed URL flow; retention notice visible above submit; submit redirects to `/audit/:id`.
  - Dependencies: S9-T3, S4-T8 (existing upload component)
  - Risk: medium — multi-step UX has several moving parts (validation across steps, ZIP progress)
- **S9-T9** [L] **[FE]** `/audit/:id` results page — 8 sections (Overall + Grade, 6-category radar, Strengths, Critical Issues, Warnings, Suggestions, Missing Features, Recommended Improvements with how-to, Tech Stack Assessment, Inline Annotations drill-down), status polling every 3s
  - Acceptance: Renders for Completed audit; live status updates while Processing; responsive on mobile 320px; honors Neon & Glass identity (per ADR-030 reverted state).
  - Dependencies: S9-T5, S6-T9 (Prism syntax-highlight component reused)
  - Risk: medium
- **S9-T10** [M] **[FE]** `/audits/me` history page — paginated card list with filters, soft-delete confirm modal
  - Acceptance: Filters work (date range + score range); pagination; delete confirms then optimistic-removes from list.
  - Dependencies: S9-T5
  - Risk: low
- **S9-T11** [M] **[FE]** Landing-page Audit section + nav link — CTA box with brief description; nav adds "Audit" link for authenticated users; Neon & Glass-respecting visual treatment
  - Acceptance: Landing CTA visible above the fold; click → `/audit/new` (or login redirect with `?next=/audit/new`); nav link visible only when authenticated.
  - Dependencies: S9-T8 (audit form route exists)
  - Risk: low
- **S9-T12** [M] **[Coord]** Dogfood: 3 sample projects (Python / JS / C#) end-to-end → quality notes + bug list in `docs/demos/audit-dogfood.md`
  - Acceptance: All 3 audits reach Completed; supervisor or owner reviews output quality (subjective); P0/P1 bugs fixed before sprint exit; quality rated ≥3.5/5 (R11 mitigation gate).
  - Dependencies: S9-T9, S9-T10
  - Risk: medium — surfaces unknowns; buffer time
- **S9-T13** [S] **[BE]** Hangfire recurring `AuditBlobCleanupJob` — daily, deletes `audit-uploads` blobs older than 90 days, sets `BlobPath=null` on metadata + audit-log row
  - Acceptance: Recurring job registered (visible in `/hangfire`); test with mock-aged blob → deleted, `BlobPath=null`, audit-log entry; metadata row preserved.
  - Dependencies: S9-T1, S4-T2 (Blob storage), S3-T3 (Hangfire infra)
  - Risk: low

### Sprint 9 exit criteria

- All 13 task acceptance criteria checked.
- Demo: 3 sample projects audited end-to-end < 6 min each.
- p95 audit pipeline ≤ 6 min on test corpus.
- AI prompt regression suite green (3 inputs).
- Bug list < 3 P1 open.
- Audit feature visible on Landing page; CTA navigates correctly (authenticated + unauthenticated flows).
- `docs/progress.md` updated with Sprint 9 completion entry.

---

## Sprint 10 — F12 RAG Mentor Chat (2026-08-24 → 2026-09-06) *[REWRITTEN 2026-05-07 per ADR-036 / ADR-038]*

**Goal:** Ship F12 (AI Mentor Chat) end-to-end — Qdrant added to docker-compose, code/feedback indexing job, RAG retrieval + SSE-streamed chat from a side panel on Submission and Audit detail pages.
**Demo-able deliverable:** A learner submits a task → submission completes → indexing finishes → chat panel becomes available → learner asks "why is line 42 a security risk?" → mentor streams a code-grounded response in <5 s → user revisits the page next session → history is preserved. Same flow demoed on a Project Audit.
**Estimated capacity used:** Backend ~50h, AI ~35h, Frontend ~25h, DevOps ~5h. Total ~115h within the ~330h sprint budget.

### Tasks (in execution order)

- **S10-T1** [S] **[DO]** Add `qdrant` service to `docker-compose.yml` (image `qdrant/qdrant:v1.13.x`, ports 6333/6334, persistent volume `qdrant_storage`); document `QDRANT_URL` in `.env.example`; verify `/healthz` from a fresh `docker-compose up`
  - Acceptance: `docker-compose up` brings Qdrant healthy; `curl http://localhost:6333/healthz` returns 200 within 10 s of stack start; volume survives `docker-compose down` (no data loss).
  - Dependencies: S1-T2 (existing docker-compose)
  - Risk: low
- **S10-T2** [M] **[BE]** `MentorChatSessions` + `MentorChatMessages` entities + EF migration `AddMentorChat`; add `MentorIndexedAt` (nullable) to `Submissions` + `ProjectAudits`; configure unique constraint `(UserId, Scope, ScopeId)` on sessions; index `(SessionId, CreatedAt)` on messages
  - Acceptance: Tables created in SQL; round-trip test for `Role`, `ContextMode` enums and `RetrievedChunkIds` JSON; unique constraint rejects duplicate `(user, scope, scopeId)` triple in test.
  - Dependencies: S10-T1 (ordering only — entity work doesn't block on Qdrant)
  - Risk: low
- **S10-T3** [L] **[AI]** New AI-service endpoint `POST /api/embeddings/upsert` — chunks code/feedback at file → function → ≤500-token boundaries, batches OpenAI `text-embedding-3-small` calls (≤50 chunks per batch), upserts into Qdrant collection `mentor_chunks` with payload `{ scope, scopeId, filePath, startLine, endLine, kind, source }`; idempotent upsert by deterministic point ID `sha1(scope|scopeId|filePath|startLine|endLine)`; returns `{ indexed, skipped, durationMs }`
  - Acceptance: 3 sample inputs (Python / JS / C#) chunk and index successfully; re-indexing the same input is a no-op (chunks deduplicated by point ID); chunk size respects 500-token cap; new pytest suite `tests/test_embeddings.py` ≥ 6 tests green; Qdrant collection auto-created on first write.
  - Dependencies: S10-T1
  - Risk: medium — first chunking implementation; tune chunk strategy via dogfood
- **S10-T4** [M] **[BE]** `IndexSubmissionForMentorChatJob` Hangfire job — domain event handler enqueues on `Submission.Status` or `ProjectAudit.Status` transition to `Completed`; calls `IEmbeddingsClient.UpsertAsync` (Refit-based, separate from `IAiReviewClient`); on success, sets `MentorIndexedAt = now()`; one auto-retry on transient failure
  - Acceptance: Submission completion → job enqueues → call recorded → `MentorIndexedAt` populated; transient AI-service failure → 1 retry then job marked failed (chat panel gracefully shows "indexing failed, retry" CTA); audit completion path tested symmetrically.
  - Dependencies: S10-T2, S10-T3
  - Risk: medium
- **S10-T5** [L] **[AI]** New AI-service endpoint `POST /api/mentor-chat` — given `{ sessionId, scope, scopeId, message, history[] }`, embeds query via `text-embedding-3-small`, retrieves top-5 from Qdrant filtered to `(scope, scopeId)`, constructs RAG prompt (system + retrieved chunks + history + user message), streams OpenAI completion via Server-Sent Events; falls back to "raw context mode" when Qdrant returns 0 chunks (sends submission/audit feedback JSON instead); returns trailing `data: {done: true, messageId, tokensInput, tokensOutput, contextMode}`
  - Acceptance: Streaming works end-to-end against a curl client (`curl -N`); `contextMode` in trailing event reflects Rag vs RawFallback; token caps enforced (6k input / 1k output); 4 pytest cases green (happy RAG, raw fallback when no chunks, malformed history rejected, OpenAI error surfaces clean SSE error event).
  - Dependencies: S10-T3
  - Risk: high — streaming + RAG is a first for the AI service; buffer extra day
- **S10-T6** [L] **[BE]** Backend chat endpoints under `/api/mentor-chat/...` — `GET /{sessionId}` (history + lazy-create), `POST /sessions` (idempotent create), `POST /{sessionId}/messages` (proxies SSE stream from AI service to client), `DELETE /{sessionId}/messages` (clear history); `IMentorChatClient` HTTP wrapper with custom SSE reader (`HttpClient` + `IAsyncEnumerable<string>` line reader, since Refit doesn't support SSE); enforces `OwnsResource` against the underlying submission/audit; 409 if `MentorIndexedAt` is null
  - Acceptance: All 4 endpoints pass integration tests (happy + 3 error cases each: ownership, readiness, malformed body); SSE proxy preserves event boundaries; persists assistant message after stream ends with token counts.
  - Dependencies: S10-T2, S10-T5
  - Risk: medium — SSE proxying through ASP.NET is non-default
- **S10-T7** [S] **[BE]** Redis sliding-window rate limiter on `POST /api/mentor-chat/{sessionId}/messages` — 30 messages per hour per session
  - Acceptance: 31st message inside the hour → 429 with `Retry-After`; counter scoped per `sessionId` (different sessions independent); `/health` exempt.
  - Dependencies: S1-T8 (rate-limiter infra), S10-T6
  - Risk: low
- **S10-T8** [L] **[FE]** `MentorChatPanel.tsx` — collapsible side panel component, streaming markdown render (react-markdown + Prism for code blocks), `useEventSource` hook for consuming `text/event-stream` from `POST /api/mentor-chat/{sessionId}/messages`, optimistic message append, scroll-to-bottom, "limited context" banner when `contextMode = RawFallback`, error toast on AI-down 503; respects existing Neon & Glass identity (per ADR-030 reverted state — semantic tokens only, no gradients)
  - Acceptance: Panel renders in storybook-style isolation test; streaming text accumulates without flicker; markdown safely sanitized (DOMPurify); component is keyboard-navigable (focus moves to input on open, Enter sends, Shift+Enter newline).
  - Dependencies: S10-T6
  - Risk: medium — first SSE consumption in FE
- **S10-T9** [M] **[FE]** Integrate `MentorChatPanel` on `/submissions/:id` and `/audit/:id` — readiness gate (poll parent resource until `MentorIndexedAt != null`, show "Preparing mentor…" state), pin-to-side toggle, mobile responsive (full-screen overlay at <768 px)
  - Acceptance: Both pages render the panel after readiness; readiness state surfaces clearly; mobile layout doesn't crowd the existing feedback view; `tsc -b` clean, `npm run build` 0 errors.
  - Dependencies: S10-T8
  - Risk: low
- **S10-T10** [M] **[Coord]** Mentor Chat dogfood — 5 chat sessions across 3 sample submissions + 2 audits (Python / JS / C# / mixed); quality notes + bug list in `docs/demos/mentor-chat-dogfood.md`; verify graceful-degradation paths (Qdrant down → raw fallback works; AI service down → banner shows; readiness gate triggers before indexing); supervisor or owner reviews chat output quality (subjective ≥ 3.5/5)
  - Acceptance: 5 sessions reach a useful answer in ≤5 s p95; 0 P0 / ≤2 P1 open at sprint exit; quality gate met; degradation paths empirically verified; doc artifact committed.
  - Dependencies: S10-T9
  - Risk: medium — surfaces unknowns; buffer time

### Sprint 10 exit criteria

- All 10 task acceptance criteria checked.
- Demo: 1 sample submission → indexing completes → chat panel opens → 3 useful Q&A turns in <15 s total wall clock.
- Same flow on 1 Project Audit.
- p95 chat-turn round-trip ≤ 5 s.
- Bug list < 3 P1 open.
- `docs/progress.md` updated with Sprint 10 completion entry.

---

## Sprint 11 — F13 Multi-Agent Review + Polish + Local Load Test + Defense Prep (2026-09-07 → 2026-09-20) *[REWRITTEN 2026-05-07 per ADR-037 / ADR-038]*

**Goal:** Ship F13 (Multi-Agent Code Review) end-to-end as the second differentiation feature; thesis A/B evaluation harness produces the comparison table for the thesis chapter; thesis docs synced; defense rehearsed twice; demo seed data + backup video ready; local-stack load test passes; UX polish pass on F12 + carry-over from Sprint 8 backlog.
**Demo-able deliverable:** Full rehearsal run-through on the owner's laptop covering the persona flow (assessment → path → submission → feedback **with mentor chat live demo** → optional `AI_REVIEW_MODE=multi` toggle showing multi-agent output side-by-side).
**Completes milestone:** M3 *(redefined per ADR-038 — defense runs locally, no Azure deploy)*
**Estimated capacity used:** Backend ~75h, AI ~40h, Frontend ~30h, DevOps ~15h, Coord ~80h. Total ~240h within the ~330h sprint budget. Buffer: ~90h.

### Tasks (in execution order)

- **S11-T1** [M] **[AI]** Three agent prompt templates — `prompts/agent_security.v1.txt`, `agent_performance.v1.txt`, `agent_architecture.v1.txt`; each constrained to its agent's category schema (per ADR-037); CHANGELOG entry per template
  - Acceptance: Three template files exist with clear system messages and category-specific guidance; tone codified (specialist code-reviewer for each); manual sanity-check on one sample submission yields focused output.
  - Dependencies: S6-T1 (existing prompt-versioning pattern)
  - Risk: medium — first multi-prompt design; expect 1–2 revisions during S11-T2 dogfood
- **S11-T2** [L] **[AI]** New AI-service endpoint `POST /api/ai-review-multi` — orchestrator runs the three agents in parallel via `asyncio.gather`, applies 90 s per-agent timeout, merges outputs (Jaccard ≥0.7 dedup on strengths/weaknesses, union by `(filePath, lineNumber)` on annotations), returns merged response shape matching `/api/ai-review` plus `meta: { mode, promptVersion, partialAgents[] }`; partial-failure path returns null scores for failed agent's categories with `partialAgents` populated
  - Acceptance: Endpoint returns merged response on a sample input; per-agent timeout test (mock one agent to hang) → returns partial response in <100 s; merge dedup tested with synthetic overlapping strengths.
  - Dependencies: S11-T1
  - Risk: high — orchestration + partial-failure semantics; buffer 1 day
- **S11-T3** [M] **[AI]** Regression tests for `/api/ai-review-multi` — 3 sample submissions × parallel-success path (3 tests) + token-cap enforcement (1 test) + partial-agent failure (1 test) + parallel error (1 test) = 6 tests minimum; verify `prompts/*.v1.txt` versioning surfaces in response `meta.promptVersion`
  - Acceptance: `pytest tests/regression_multi_agent_*.py` green; over-cap input → 413; CHANGELOG entry per prompt revision.
  - Dependencies: S11-T2
  - Risk: medium
- **S11-T4** [M] **[BE]** `IAiReviewClient.AnalyzeMultiAsync` parallel method targeting `/api/ai-review-multi`; env var `AI_REVIEW_MODE=single|multi` plumbed through `SubmissionAnalysisJob` (default `single`); integration tests cover both modes; `AIAnalysisResults.PromptVersion` writes `multi-agent.v1` (or `multi-agent.v1.partial`) when mode=multi
  - Acceptance: Both code paths covered in tests; env var change requires only restart (no migration); single mode unaffected (regression check on existing F6 tests).
  - Dependencies: S11-T2
  - Risk: medium
- **S11-T5** [S] **[BE]** Cost-monitoring dashboard splits a third token series (`ai-review-multi`) alongside `ai-review` and `project-audit` (Serilog log enrichment + Application Insights query update — even though prod is deferred, local Seq dashboards still benefit)
  - Acceptance: Logs include `ReviewMode` enricher; local Seq dashboard shows the three series.
  - Dependencies: S11-T4
  - Risk: low
- **S11-T6** [L] **[Coord]** Thesis multi-agent evaluation harness — script under `tools/multi-agent-eval/` runs both endpoints over the same N=15 submissions (5 Python / 5 JS / 5 C# from existing dogfood corpus + new fixtures), produces comparison table with per-category score deltas, response length, token cost, and a manual relevance rubric scored by 2 supervisors blind to mode; report committed to `docs/demos/multi-agent-evaluation.md`
  - Acceptance: Script runnable via single command; CSV + markdown table outputs; 2 supervisor scoring sheets returned and aggregated; thesis chapter draft references the table.
  - Dependencies: S11-T4
  - Risk: medium — supervisor scheduling
- **S11-T7** [L] **[Coord]** Academic documentation update — sync `project_details.md` + `project_docmentation.md` with implementation reality across all 38 ADRs; add Future Work section consolidating post-MVP items + Azure deployment (per ADR-038) + multi-provider AI (ADR-003 future); explicit deployment-deferred narrative per ADR-038
  - Acceptance: All 38 ADR deviations reflected; change log at top; supervisors sign off on updated thesis sections; new Future Work section explicitly lists "Azure deployment (post-defense)".
  - Dependencies: all ADRs logged (031–038 inclusive)
  - Risk: medium — large documentation effort; start in week 1 of Sprint 11, not week 2
- **S11-T8** [L] **[BE]** Local k6 load test — 50 concurrent users on owner's laptop docker-compose stack covering core loop (auth → assessment → submission → feedback → mentor chat); report committed to `docs/demos/local-load-test.md`; fix top 3 bottlenecks (likely candidates: SQL hot-query indexes, Qdrant query tuning, Hangfire pool sizing)
  - Acceptance: 50 users sustained on the laptop without p95 API latency >500 ms over a 5-min run; bottleneck fixes verified by re-run; report includes hardware spec of test machine.
  - Dependencies: S11-T4 (so multi-mode tested under load too, briefly)
  - Risk: medium — laptop hardware variability; expect to discover at least 1 P1 bottleneck
- **S11-T9** [M] **[FE]** UX polish pass — typography, spacing, loading states, empty states, error messages on F12 chat panel + carry-over from Sprint 8 polish backlog (`docs/mvp-bugs.md`); accessibility audit on F12 (Lighthouse ≥90 on submission/audit pages with chat panel open); keyboard-nav verification on chat input
  - Acceptance: Supervisors' UX feedback from Rehearsal 1 (S11-T13) addressable in <2 days of work; Lighthouse score recorded in `docs/progress.md`.
  - Dependencies: S10-T9, S8-T12
  - Risk: low
- **S11-T10** [M] **[BE]** Demo seed data — `dotnet run --project ...Api -- seed-demo` populates 1 ready-to-show learner account (assessment complete, active path, 5 submissions with progression, 1 Project Audit, 1 Mentor Chat session with realistic 4–6 turn Q&A pre-canned) + 1 admin account; demo accounts documented in `docs/demos/defense-script.md`
  - Acceptance: Single command from a fresh DB produces the demo state; defense flow runnable end-to-end against seeded data without manual setup steps.
  - Dependencies: S11-T4
  - Risk: low
- **S11-T11** [M] **[Coord]** Demo script v1 + record backup video (3-min highlight reel) — written walkthrough (~10 min) including persona story, F12 chat live demo, F13 multi-agent comparison summary, edge-case handling, troubleshooting fallback; backup video stored locally + USB drive
  - Acceptance: Script in `docs/demos/defense-script.md`; 3 teammates can read and follow without help; video 1080p, no cuts showing errors, F12 chat segment featured.
  - Dependencies: S11-T10
  - Risk: medium — recording/editing time
- **S11-T12** [L] **[Coord]** Rehearsal 1 with supervisors (target 2026-09-17) — 30-min supervisor review; feedback captured in `docs/defense-feedback.md`
  - Acceptance: Rehearsal completed; written feedback list classified P0 / P1 / Nice-to-have.
  - Dependencies: S11-T11
  - Risk: medium — supervisor scheduling
- **S11-T13** [L] **[Coord]** Rehearsal 2 with supervisors (target 2026-09-21) — defense-day dry-run; clean run-through; all P0/P1 issues from Rehearsal 1 resolved
  - Acceptance: Rehearsal completed; supervisors sign off on demo readiness.
  - Dependencies: S11-T12
  - Risk: medium
- **S11-T14** [M] **[DO]** Code freeze + defense-day operational checklist — branch protection from end of S11-T13; checklist in `docs/demos/defense-day-checklist.md` covering laptop battery + charger, backup laptop with cloned repo and pre-built docker images, offline-friendly demo path (rehearsed with WiFi off — only OpenAI + GitHub clone legitimately need connectivity), recorded backup video on a USB drive, supervisor contact list
  - Acceptance: Branch protection enforced; checklist reviewed by team; backup laptop validated by running `docker-compose up` + demo script end-to-end on it.
  - Dependencies: S11-T13
  - Risk: low
- **S11-T15** [M] **[BE]** Thesis technical appendix — Clean Architecture diagrams, ERD (incl. Domain 7 Mentor Chat + Qdrant external), API reference (export from Swagger), AI service architecture diagram (multi-agent + RAG), deployment diagram (post-defense Azure target per ADR-038)
  - Acceptance: Appendix PDF ready; supervisors acknowledge inclusion; ERD includes all entities through Sprint 10.
  - Dependencies: S11-T7
  - Risk: low

### Sprint 11 exit criteria

- M3 signed off: F12 + F13 shipped, thesis docs synced (38 ADRs reflected), two rehearsals complete with supervisor sign-off, code frozen.
- Demo runs locally on owner's laptop end-to-end including F12 mentor chat segment and F13 multi-agent comparison output.
- Backup video recorded and stored (local + USB).
- Local load test report committed.
- Defense day target 2026-09-29 (window 2026-09-24 → 2026-10-04 per ADR-032 — unchanged from prior plan).

---

## Sprint 12 — F14 History-Aware Code Review (2026-05-11 → 2026-05-24) *[NEW — added 2026-05-11 per ADR-040..044; Path Z parallel with S11 owner-led rehearsal blocks]*

**Goal:** Every code submission's review is informed by the learner's full history — past submissions, recurring weaknesses, recurring strengths, assessment gaps, progression trend, and top-k most-relevant prior feedback retrieved via RAG. This is the platform's strategic moat: the same code submitted by two learners produces two distinctly personalized reviews. The reviews acknowledge growth, escalate repeated mistakes, build on past advice, and reference specific prior feedback.

**Demo-able deliverable:** Live end-to-end review showing (a) a learner with 5+ prior submissions receiving a review that explicitly references their recurring weakness pattern + their improvement trend + a specific past feedback excerpt; (b) a brand-new learner (cold-start) receiving a review tuned to their assessment baseline; (c) side-by-side comparison artifact (S12-T10 thesis harness) showing measurable depth gain vs history-blind baseline.

**Completes milestone:** None directly (post-M3 enhancement; defense scope adjustment is owner's call after S12-T11 dogfood). Strong candidate for thesis "personalization differentiation" chapter.

**Estimated capacity used:** Backend ~40h, AI ~10h, Frontend ~5h, Coord (docs/dogfood) ~10h ≈ **~65h total**.

**Owner answers locked at kickoff (2026-05-11):**
- Mode flag: F14 layers uniformly over `single` and `multi`; no new mode enum value (per ADR-040).
- Token budget: 12k input cap on F14 path (per ADR-044); output unchanged at 2k.
- Recurring-weakness algorithm: frequency-based, 3-of-5 / score-<60 thresholds (per ADR-041).
- RAG scope: this user's own history only; cross-user "anonymous corpus" lookup deferred to post-MVP.
- Cold start: same enhanced prompt, narrative `progressNotes` field carries the "first review" signal (per ADR-042).
- Qdrant failure: profile-only fallback, telemetry counter, no in-request retry (per ADR-043).
- FE exposure: small "Personalized for your learning journey" chip on feedback view header; no settings toggle.
- Dogfood gate: ≥4/5 executor rating on 5 sessions across Python/JS/C# (consistent with F11/F12/F13).
- Path: Z (parallel with S11 owner-led rehearsal blocks).

### Tasks (in execution order)

- **S12-T1** [M] **[Coord]** Documentation: ADR-040..044 (done in-session), PRD §5.1 F14 entry + §4.11 US-36/US-37 + §1 description update + Appendix A row + §8.10 token-budget exception, architecture §2 components + §4.7 new flow + §6.10 AI-service contract addendum + §11 known unknown, this sprint entry in `implementation-plan.md`, kickoff entry in `progress.md`
  - Acceptance: ADR-040..044 land; PRD F14 entry exists with US-36/US-37 mapped; architecture §4.7 flow renders the F14 pipeline phases; new sprint entry visible; `progress.md` shows Sprint 12 in progress.
  - Dependencies: none
  - Risk: low
- **S12-T2** [S] **[BE]** `Application/CodeReview/LearnerSnapshot.cs` — domain record (rich) + wire DTOs (`AiLearnerProfilePayload`, `AiLearnerHistoryPayload`, `AiProjectContextPayload`) matching the AI-service Pydantic schemas exactly
  - Acceptance: Compiles; 1 round-trip unit test serializes a populated `LearnerSnapshot` to JSON matching the AI-service schema field names + types (verified by snapshot test against a fixture JSON).
  - Dependencies: S12-T1
  - Risk: low
- **S12-T3** [L] **[BE]** `ILearnerSnapshotService` interface + `LearnerSnapshotService` implementation. Aggregates from `CodeQualityScores` (averages + sample counts + trend), `AIAnalysisResults` (last 10 weaknesses/strengths/recommendations), `Submissions` joined to `Tasks` (counts + prior attempts on current task), `SkillScores` (assessment baseline gaps), `PathTasks` (active path context). Computes `commonMistakes` + `recurringWeaknesses` per ADR-041. Builds `progressNotes` narrative. Handles cold-start per ADR-042 (assessment-only profile, RAG short-circuit). Configurable via `LearnerSnapshotOptions` (`CommonMistakesLookback=10`, `RecurringThresholdCount=3`, `RecurringThresholdSampleSize=5`, `WeakAreaScoreThreshold=60`, `StrongAreaScoreThreshold=80`).
  - Acceptance: Unit tests cover 4 scenarios: (a) brand-new user no assessment, (b) user with assessment no submissions, (c) user with 1 prior submission, (d) user with 5+ submissions including 3+ with the same weakness phrase → flagged in `commonMistakes`. Each scenario asserts the full snapshot shape. ≥6 unit tests; integration test verifies the service runs against a seeded SQL.
  - Dependencies: S12-T2
  - Risk: medium — aggregation logic edge cases (improvement trend on small samples; weakness deduplication; null assessment)
- **S12-T4** [L] **[BE]** F12 Qdrant lifecycle extension: new `IndexFeedbackHistoryJob` Hangfire job — runs on AI-completed submissions, parses `AIAnalysisResult.FeedbackJson` into chunks (one per `weaknessesDetailed[i]`, one per `strengthsDetailed[i]`, one per `recommendations[i]`, one for `progressAnalysis` if non-empty), embeds via OpenAI `text-embedding-3-small`, upserts into new Qdrant collection `feedback_history` with payload `{ userId, submissionId, taskId, kind, sourceDate, scopeId }`. Deterministic UUID5 point IDs prevent duplicate writes on retries. Enqueued from `SubmissionAnalysisJob` alongside the existing `IndexForMentorChatJob` (F12).
  - Acceptance: Integration test against running Qdrant: submission with 3 weaknesses + 2 strengths + 4 recommendations → 9 chunks upserted with correct payloads + deterministic IDs; re-running same submission updates the 9 points in place (no duplicates); empty `FeedbackJson` → 0 upserts cleanly; Qdrant unreachable → job logs warning + does not throw (graceful per ADR-043 spirit).
  - Dependencies: S12-T3
  - Risk: medium — collection schema design; chunk size + payload structure decisions are load-bearing
- **S12-T5** [M] **[BE]** `IFeedbackHistoryRetriever` interface + `FeedbackHistoryRetriever` implementation. Generates a "current-submission anchor" embedding from the static-analysis findings JSON of the in-progress submission, queries Qdrant `feedback_history` filtered by `userId == currentUserId`, returns top-5 chunks (clamped to available). Catches all retrieval failures → empty list + warning log + `f14.rag_fallback_count` metric (per ADR-043). 5-second query timeout.
  - Acceptance: Unit test verifies the chunk-to-DTO mapping; integration test against seeded Qdrant returns expected top-5 in similarity order; failure-injection test (Qdrant down) returns empty list without throwing + metric incremented.
  - Dependencies: S12-T4
  - Risk: low
- **S12-T6** [S] **[BE]** Extend `IAiReviewClient` interface — `AnalyzeZipAsync(stream, fileName, correlationId, snapshot, ct)` (new optional `LearnerSnapshot? snapshot` parameter) + same for `AnalyzeZipMultiAsync`. Refit client maps the snapshot to three JSON Form fields (`learner_profile_json`, `learner_history_json`, `project_context_json`) at the multipart boundary. Backward-compatible: when `snapshot == null`, request shape is identical to today.
  - Acceptance: 2 unit tests: (a) `snapshot == null` produces the exact request shape as Sprint 5's baseline (no new Form fields); (b) populated snapshot produces a multipart request with all three JSON fields present and parseable as the AI-service schemas (validated by mock HTTP handler).
  - Dependencies: S12-T2
  - Risk: low
- **S12-T7** [M] **[AI]** Extend AI service `/api/analyze-zip` + `/api/analyze-zip-multi` to accept three optional Form fields (`learner_profile_json`, `learner_history_json`, `project_context_json`). When provided, parse against existing Pydantic schemas (`LearnerProfile`, `LearnerHistory`, `ProjectContext`) and forward to `review_code(...)` / `multi_agent.orchestrate(...)`. Parse failures → 400 with descriptive detail.
  - Acceptance: 3 pytest cases per endpoint: (a) all three fields absent → existing behavior unchanged (regression-safe); (b) all three populated with valid JSON → enhanced prompt activated, response includes `progressAnalysis` (non-empty), `weaknessesDetailed[].isRecurring` populated; (c) one field with malformed JSON → 400 with field-specific error. Live OpenAI test marked `live` with skip-if-no-key.
  - Dependencies: S12-T6
  - Risk: low
- **S12-T8** [M] **[BE]** `SubmissionAnalysisJob` pipeline rewire — add "profile" phase between "fetch" and "ai" phases. Build snapshot via `ILearnerSnapshotService.BuildAsync(userId, currentTaskId, currentSubmissionId, ct)`, retrieve RAG chunks via `IFeedbackHistoryRetriever.RetrieveAsync(...)`, attach chunks to the snapshot. Pass snapshot to `_aiClient.AnalyzeZipAsync(..., snapshot, ct)` / `AnalyzeZipMultiAsync`. New phase logged via existing `LogPhase("profile", durationMs, ...)`. After AI-completed branch: enqueue `IndexFeedbackHistoryJob(submissionId)` via the existing scheduler abstraction.
  - Acceptance: Integration test (`SubmissionAnalysisJobTests`): job for a user with 3 prior completed submissions builds a non-empty snapshot, retrieves RAG chunks (mock retriever returns 2 chunks), forwards them to a mock AI client, and the mock asserts the request contains the populated snapshot. Phase timing visible in logs. `IndexFeedbackHistoryJob` enqueued on AI-completed transition.
  - Dependencies: S12-T3, S12-T5, S12-T6
  - Risk: medium — touching the hot path requires careful test coverage to avoid regressions in Sprint 5–11's flow
- **S12-T9** [M] **[Coord]** Integration tests E2E (backend ↔ AI service mock) — covers: (a) full pipeline with snapshot lights up enhanced prompt path; (b) cold-start user produces the assessment-only snapshot per ADR-042; (c) Qdrant unreachable → profile-only fallback per ADR-043 (counter incremented, snapshot still ships); (d) F13 `multi` mode forwards the same snapshot to all three agents; (e) `IndexFeedbackHistoryJob` re-runs on re-submission idempotently.
  - Acceptance: 5 new integration tests in `SubmissionAnalysisJobTests` / `LearnerSnapshotServiceTests`; full backend suite green (target: ~470 tests = 445 + 25 new).
  - Dependencies: S12-T8
  - Risk: medium
- **S12-T10** [M] **[Coord]** Thesis evaluation harness — runs the same 15 sample submissions (5 Python / 5 JavaScript / 5 C#) through both modes: (A) snapshot stripped → legacy F6/F13 review; (B) full snapshot + RAG → F14 history-aware review. Output: `docs/demos/history-aware-evaluation.md` comparison table with per-category score deltas, response length (words), token cost, executive-summary word count, count of `isRecurring=true` / `isRepeatedMistake=true` annotations per review, plus a manual relevance rubric scored by 2 supervisors blind to mode.
  - Acceptance: harness script + 15-sample dataset committed; comparison table populated for the 15 mock-AI runs (live OpenAI runs are owner-led carryover for the dogfood pass S12-T11); supervisor rubric template + scoring sheet committed.
  - Dependencies: S12-T9
  - Risk: medium — supervisor scheduling is the gating factor; tracked as a carryover beyond sprint end like S11-T12/T13
- **S12-T11** [M] **[Coord]** Live dogfood — 5 sessions over 3 languages with real OpenAI calls. Executor rates each review for: (1) acknowledges learner growth where present, (2) flags recurring weaknesses without restating noise, (3) references specific prior feedback when relevant, (4) calibrates depth to skill level, (5) overall vs same submission's F6 baseline. Exit gate: ≥4/5 average. Tune prompt or snapshot construction if below gate.
  - Acceptance: Dogfood runbook in `docs/demos/history-aware-dogfood.md` with scoring sheets; 5 sample reviews + their F6 baselines archived locally; sprint-end average rating documented.
  - Dependencies: S12-T10
  - Risk: **high** — quality validation; prompt/snapshot iteration may extend timeline
- **S12-T12** [S] **[FE]** Add "Personalized for your learning journey" chip to `FeedbackView` header, rendered only when the AI response indicates a non-empty `progressAnalysis` or any `weaknessesDetailed[].isRecurring=true` annotation (proxy: F14 was active for this review). Subtle styling matching existing Neon & Glass identity (per `feedback_aesthetic_preferences.md`). Tooltip on hover: "This review uses your learning history to personalize feedback."
  - Acceptance: Chip visible on feedback view when F14 fields populated; absent on legacy reviews; `tsc -b` clean, `npm run build` no warnings; mobile + desktop layouts verified.
  - Dependencies: S12-T8 (AI must produce the fields)
  - Risk: low

### Sprint 12 exit criteria

- F14 ships end-to-end: backend builds snapshot → AI service receives + uses it → response carries history-aware annotations.
- Cold-start, RAG-fallback, and idempotent re-indexing all verified by tests.
- Backend test suite passes (≥470 tests).
- Live dogfood pass: ≥4/5 average executor rating on 5 sessions across Python/JS/C#.
- Thesis evaluation harness committed with 15-sample comparison table populated (supervisor rubric is a documented carryover, like S11-T12/T13).
- `docs/decisions.md` ADR-040..044 reflected; `docs/PRD.md`, `docs/architecture.md` synced; `docs/progress.md` shows Sprint 12 complete with exit-criteria status.

---

## Sprint 13 — UI Redesign Application: Neon & Glass integration of 8 approved pillars (2026-05-13 → 2026-05-26) *[NEW — added 2026-05-12]*

**Goal:** Port the 8 approved pillars from `frontend-design-preview/` into the real `frontend/` codebase. The pillars are the **structural truth** for the redesign — every section, widget, and content category in a pillar's preview must appear in the production page in the same order. The Neon & Glass identity is non-negotiable (see ADR-030 for the rollback that established this rule). This sprint is **integration, NOT redesign**.

**Source of truth (NOT to be re-established or re-evaluated):**
- `frontend-design-preview/walkthrough-notes.md` — every pillar's APPROVED status + per-pillar walkthrough details + Sprint-13 integration carry-forwards
- `frontend-design-preview/pillar-N-*/src/bundle.jsx` — the JSX implementations of every pillar's pages (concatenated from `src/{prefix}/*.jsx`)
- `frontend-design-preview/pillar-N-*/index.html` — the HTML template with the canonical Tailwind config + identity CSS

**Foundation state (Round 1 already landed 2026-05-12):**
- `frontend/src/shared/styles/globals.css` already has `.brand-gradient-bg` + `.brand-gradient-text` + `prefers-reduced-motion` reset
- `frontend/tailwind.config.js` already has `neon-pulse` / `glow-pulse` / `shimmer` animation keys
- `frontend/src/components/ui/Field.tsx` + `Select.tsx` + `Textarea.tsx` already shipped
- `npx tsc -b` was clean after Round 1

**Demo-able deliverable:** Production `frontend/` running with the full Neon & Glass identity end-to-end across all 34 surfaces. The defense-critical SubmissionDetailPage signature surface (inline 2-column FeedbackPanel + MentorChat at `lg+`) is live and readable in both light + dark modes.

**Hard rules (carried from `frontend-design-preview/HANDOFF.md` and memory):**
- **Mirror canonical structure.** Each production page mirrors its preview pillar section-by-section. NO inventing sections, NO merging widgets, NO dropping sub-areas.
- **Neon & Glass identity is non-negotiable.** Violet primary + cyan secondary + fuchsia accent + signature 4-stop gradient + Inter + JetBrains Mono + glass utilities. DO NOT re-establish a new direction.
- **Live walkthrough before merge.** Each pillar's integration gets a live in-browser walkthrough before the next pillar starts. Brief approval ≠ visual approval.
- **Banner copy locks:** Settings "What's wired today" cyan banner + Admin "Demo data — platform analytics endpoint pending" amber banner — both byte-identical to preview.

**Estimated capacity used:** ~40-50h (Round 1 foundation already done; remaining work is primitive touch-ups + AppLayout + 7 pillar ports + visual QA). Frontend-led with light Coord support.

### Tasks (in execution order)

- **S13-T1** [S] **[FE]** Primitive visual touch-ups — `Button` (gradient/neon variants pick up `brand-gradient-bg`), `Badge` (add `cyan` + `fuchsia` tones), `Card` (verify `glass` variant reads the right opacity in light mode), `Modal` (verify focus-trap survives the visual changes). Keep all existing prop shapes; this is class-composition tightening only.
  - Acceptance: `tsc -b` clean; consumer pages compile unchanged; visual diff of Button + Badge against Pillar 1 reference confirms parity.
  - Dependencies: Round 1 (already done)
  - Risk: low

- **S13-T2** [L] **[FE]** **AppLayout port (Pillar 4 shell).** Replace `frontend/src/components/layout/AppLayout.tsx` with the Pillar 4 composition: Sidebar (256/80px collapsed, glass chrome, 8 nav items + bottom theme-toggle + Settings) + Header (sticky h-16, glass, page-title + search + NotificationsBell + UserMenu) + Footer (course staff: Prof. Mostafa El-Gendy + Eng. Fatma Ibrahim + Benha University). Wire Sidebar's nav items to React Router `<Link>` (preview used `useState`). Header search → `navigate('/tasks?search=...')`. UserMenu's "Profile / Settings / Sign out" → existing routes + logout thunk. NotificationsBell stays as existing dropdown.
  - Acceptance: AppLayout renders cleanly on every authenticated route; sidebar active state correct per route (Dashboard / Assessment / Learning Path / Submissions / Tasks / Audit / Analytics / Achievements); mobile sidebar overlay works; theme toggle drives `<html class="dark">`.
  - Dependencies: S13-T1
  - Risk: **medium** — AppLayout is touched by every authenticated page; a regression cascades

- **S13-T3** [L] **[FE]** **Pillar 2 — Public + Auth (7 surfaces).** Port Landing (6 sections: nav / hero / features×6 / journey zig-zag / audit teaser / final CTA / footer), Login, Register (first/last name side-by-side + 3-track radio cards), GitHubSuccess (animated logo + progress bar + 3 status badges), NotFound (120-160px gradient "404" + 2 CTAs), Privacy, Terms (scroll-observer TOCs + Print button). Auth pages keep their `useForm` + react-hook-form wiring; only visual chrome changes. Footer names: course instructor + TA on auth pages.
  - Acceptance: All 7 routes render; auth flow (login + GitHub OAuth callback + register + privacy/terms) end-to-end; mobile menu sheet on Landing; Login + Register fit 800px viewport without scroll.
  - Dependencies: S13-T2
  - Risk: medium

- **S13-T4** [M] **[FE]** **Pillar 3 — Onboarding (3 surfaces).** Port AssessmentStart, AssessmentQuestion (wire A-D keyboard shortcuts this sprint — preview-only TODO), AssessmentResults (use canonical structure: Trophy pill + H1 + Status·Duration + ScoreGauge + Grade + skill breakdown + per-category bars + Strengths + Focus + Retake / Continue — NOT the original "celebration" layout).
  - Acceptance: 3 routes render; A-D keyboard shortcuts navigate; Results page mirrors canonical 1:1.
  - Dependencies: S13-T3
  - Risk: low

- **S13-T5** [L] **[FE]** **Pillar 4 — Core Learning (5 surfaces).** Port Dashboard (welcome hero + 4 stat cards + Active Path 2-col + Skill Snapshot aside + Recent Submissions + 3 Quick Actions), LearningPathView (7 ordered tasks with mixed statuses + locked-state on right 2), ProjectDetails (hero card + prerequisites + 4-tab strip + Overview content), TasksLibrary (filters card + 9 TaskCards grid + pagination), TaskDetail (title + badges + markdown description + prerequisites + submit card). Each page replaces mock-data preview with real Redux + API calls (already wired in existing pages).
  - Acceptance: 5 routes render with real data; XpLevelChip + Skill Snapshot bars + Tasks Library category tags all use `brand-gradient-bg`; difficulty stars render correctly.
  - Dependencies: S13-T2
  - Risk: medium

- **S13-T6** [L] **[FE]** **Pillar 5 — Feedback & AI ⭐ (defense-critical, 5 surfaces).** Port SubmissionForm (2-tab: GitHub URL / Upload ZIP + 3 upload states), **SubmissionDetailPage (signature surface)** — inline `lg:grid-cols-[1fr_400px]` with FeedbackPanel left (9 sub-cards: PersonalizedChip → ScoreOverview+Radar → CategoryRatings → Strengths/Weaknesses → ProgressAnalysis → InlineAnnotations → Recommendations → Resources → NewAttempt) and MentorChatPanel as inline sticky right column (NOT slide-out). Below `lg`, chat stacks to full-width second row. AuditNewPage (3-step wizard), AuditDetailPage (8-section structured report, keeps slide-out mentor chat NOT inline), AuditsHistoryPage (filter + delete modal). Port the **light-mode chat color variants** from Pillar 5's Round-1 fix into `MentorChatPanel.tsx`. Wire Prism syntax highlighting to the real `prismjs` import.
  - Acceptance: SubmissionDetail's side-by-side renders at lg+; chat sticky + readable in both modes; FeedbackPanel renders all 9 sub-cards in order; AuditDetailPage's 8 sections ship; mentor chat streams via existing `useMentorChatStream`.
  - Dependencies: S13-T2 (AppLayout ready)
  - Risk: **high** — defense-critical; the signature surface is what judges see first

- **S13-T7** [M] **[FE]** **Pillar 6 — Profile & CV (4 surfaces).** Port ProfilePage (hero + Level/XP strip + 4 stat tiles + 2-col Edit form + Badges aside), LearningCVPage (hero + Public toggle + Copy-link + Download-PDF + 4 stat tiles + 2-col Knowledge Profile / Code-Quality Profile + Verified Projects grid), PublicCVPage (NO AppLayout — anonymous public surface with minimal brand bar + "Want a Learning CV like this?" CTA). Profile edit fields persist via existing `PATCH /api/auth/me`. CV privacy toggle via existing `learningCvApi`.
  - Acceptance: 4 routes render; profile edit + CV privacy + PDF download + public-share link round-trip; PublicCVPage SEO meta tags set on mount.
  - Dependencies: S13-T2
  - Risk: low

- **S13-T8** [M] **[FE]** **Pillar 7 — Secondary (4 surfaces).** Port AnalyticsPage (12-week view: 3-tile stats + code-quality trend line chart + submissions stacked bars + knowledge profile snapshot — port hand-rolled SVG to `recharts`), AchievementsPage (XP progress card + Earned grid + Locked grid), ActivityPage (XP+submissions merged feed with day separators), SettingsPage (back link + **"What's wired today" cyan banner copy verbatim** + 2-col Profile + Appearance + Account). Wire to `analyticsApi.getMine()` / `gamificationApi.getMine()` / `dashboardApi.getMine()` (already in place).
  - Acceptance: 4 routes render; charts use real data; Settings cyan banner byte-identical to preview.
  - Dependencies: S13-T7
  - Risk: low

- **S13-T9** [M] **[FE]** **Pillar 8 — Admin (5 surfaces).** Port AdminDashboard (4 stat cards + **"Demo data" amber banner verbatim** + User Growth line + Track Distribution donut + Weekly Submissions bar + Recent Submissions list), UserManagement (search + role/status filter + table CRUD), TaskManagement (filter + table + edit modal), QuestionManagement (search + filter + table CRUD), admin/AnalyticsPage (per-track AI score breakdown table + system health rows + top-tasks ranking). All CRUD pages wired to real `adminApi`. Stay behind existing `RequireAdmin` route guard.
  - Acceptance: 5 routes render; CRUD round-trips against real `/api/admin/*` endpoints; demo-data amber banner byte-identical to preview.
  - Dependencies: S13-T8
  - Risk: low

- **S13-T10** [M] **[Coord]** Visual QA + cross-pillar consistency. Walk every page in both modes (17 authenticated × 2 + 7 public × 2 = 48 surface pairings) against the preview screenshots. Confirm `prefers-reduced-motion` global reset works. Confirm `lucide-react` icon-name compat (alias `House` → `Home` where needed). Capture diffs in `docs/demos/sprint-13-visual-qa.md`.
  - Acceptance: All 48 pairings verified; zero console errors; reduced-motion verified; no lucide name mismatches.
  - Dependencies: S13-T9
  - Risk: medium

- **S13-T11** [S] **[Coord]** Sprint exit doc + memory updates. Update `docs/progress.md` with Sprint 13 complete + exit-criteria status. Update MEMORY.md: `project_design_preview.md` → CLOSED; `feedback_aesthetic_preferences.md` references integrated `frontend/` codebase as canonical source.
  - Acceptance: progress.md + MEMORY.md updated; preview workspace can be archived if owner chooses.
  - Dependencies: S13-T10
  - Risk: low

### Sprint 13 exit criteria

- All 34 surfaces (29 pages + 4 layouts + Notifications dropdown) ported and rendering.
- SubmissionDetail signature surface (inline 2-column at lg+) live + readable in both modes.
- AppLayout is the canonical authenticated shell across all authenticated routes.
- Banner copy locks honored verbatim.
- `prefers-reduced-motion` reset in effect.
- `npm run build` clean; `tsc -b` clean; existing test suite green.
- Visual QA doc covers 48 surface pairings.
- `docs/progress.md` shows Sprint 13 complete.

---

## Sprint 14 — UserSettings to MVP: Notifications + Privacy + Connected Accounts + Data Export + Account Delete (2026-05-13 → 2026-05-27) *[NEW — added 2026-05-13]*

**Goal:** Bring the `UserSettings` capability surface into MVP. The Sprint 13 cyan banner on `/settings` ("Notification preferences, privacy toggles, connected-accounts, and data export/delete need a future `UserSettings` backend — not in MVP") becomes obsolete: every claim flips from "not in MVP" to "wired live." Owner-approved scope at Sprint 13 close meeting (Full tier, ~50h ~2 weeks). Sub-decisions locked at the kickoff ambiguity sweep — see ADR-046 for rationale.

**Locked answers from kickoff (2026-05-13):**

1. **Email delivery:** Real SMTP via SendGrid free tier. Provider abstraction (`IEmailProvider`) + `EMAIL_PROVIDER=LoggedOnly` env-var fallback (R18 mitigation).
2. **Notification prefs (5 × 2 channels):** Submission feedback ready · Audit complete · Recurring weakness (F14) · Badge / Level-up · Account security. Each per-channel (email + in-app); account-security always-on.
3. **Account-delete cooling-off:** Spotify-style — login auto-cancels the scheduled 30-day hard-delete.
4. **Data export format:** JSON ZIP (6 per-domain files) + human-readable PDF dossier via existing `LearningCVPdfRenderer` (QuestPDF, S7-T5).

**Demo-able deliverable:** A learner can (1) toggle 5 notification prefs across email + in-app with real SendGrid delivery, (2) toggle 3 privacy controls, (3) link/unlink GitHub with a safety guard against locking themselves out, (4) download a JSON+PDF ZIP of their data, (5) request account deletion with 30-day cooling-off where logging back in cancels the schedule. The expanded `frontend/src/features/settings/SettingsPage.tsx` keeps the Sprint 13 Neon & Glass identity.

**Hard rules:**

- Real SendGrid SMTP; provider abstraction lets env-var flip to `LoggedOnly` in <60s if R18 materializes during rehearsal.
- Account-security events (login from new device, password changed, account deletion requested, GitHub linked/unlinked) are always-on — no off-toggle.
- GitHub unlink hard-blocks (HTTP 409) if user has no local password set.
- Soft-delete on User extends the existing pattern (`architecture.md:196,292`); `DeletedAt` + `HardDeleteAt` columns + auto-cancel-on-login hook.
- Settings cyan banner copy lock from Sprint 13 retires at T10 with new replacement copy owner-approved at the live walkthrough.
- Live walkthrough required before T12 commit (per `feedback_aesthetic_preferences.md`).
- T12 commit via `prepare-public-copy.ps1`, Omar sole author, no Co-Authored-By trailer (per `feedback_commit_attribution.md` + `workflow_github_publish.md`).

**Estimated capacity used:** ~52h (4% over owner's ~50h budget — under the >110% threshold per project-executor skill rules; flagged at kickoff, no rescoping). Owner-led S11-T12/T13 rehearsals + their internal carryovers run parallel — not Sprint-14-blocking.

### Tasks (in execution order)

- **S14-T1** [M, ~5h] **[BE]** Domain entities + EF migration. Add `UserSettings` (1-1 with User; 5 prefs × 2 channels + 3 privacy toggles), `EmailDelivery` (audit + retry rows), `UserAccountDeletionRequest` (cooling-off window). Add `IsDeleted` + `DeletedAt` + `HardDeleteAt` columns to `User`. EF migration; `IsDeleted` global query filter on User; default `UserSettings` row inserted via migration data step for all existing users.
  - Acceptance: migration applies + reverts cleanly; round-trip integration test per new entity green; existing 445-test backend suite still passes.
  - Dependencies: Sprint 13 close (done)
  - Risk: low

- **S14-T2** [M, ~3h] **[BE]** Settings API. `GET /api/user/settings` + `PATCH /api/user/settings`. Authorized; default row created lazily on first GET.
  - Acceptance: GET returns defaults; PATCH persists partial updates; integration tests covering happy + unauthorized + cross-user paths.
  - Dependencies: S14-T1
  - Risk: low

- **S14-T3** [M, ~4h] **[BE]** Email provider abstraction. `IEmailProvider` interface; `SendGridEmailProvider` (using SendGrid SDK + `SENDGRID_API_KEY` env var) + `LoggedOnlyEmailProvider`. `EmailDeliveryService` writes row → dispatches via provider → updates row. Hangfire `EmailRetryJob` (every 5 min, max 3 attempts, exponential backoff).
  - Acceptance: 2 unit tests for `LoggedOnlyEmailProvider`; 1 integration test with SendGrid HTTP mocked; retry job test confirms 3-attempt cap; env-var flip behavior verified.
  - Dependencies: S14-T1
  - Risk: medium (SendGrid SDK + env secret management)

- **S14-T4** [M, ~3h] **[BE]** Email templates. 5 HTML+text pairs: `feedback-ready`, `audit-ready`, `weakness-detected`, `badge-earned`, `security-alert`. Brand header/footer with inline-CSS Neon & Glass identity (gradient via `linear-gradient` + fallback solid color for Outlook).
  - Acceptance: 5 templates render via unit tests with sample data; HTML validates; plain-text variants generated; brand identity legible in Gmail + Outlook test renders.
  - Dependencies: S14-T3
  - Risk: low

- **S14-T5** [M, ~3h] **[BE]** Notification wiring. `NotificationService.RaiseAsync` becomes pref-aware: reads `UserSettings`, suppresses in-app or email per pref. Account-security events bypass the pref check (always-on). Hook existing emit points: `SubmissionAnalysisJob`, `FeedbackAggregator`, F14 weakness flag, gamification badge/level-up.
  - Acceptance: 5 unit tests (one per pref) covering on/off matrix; integration test confirms suppression actually skips `INSERT INTO Notifications`; account-security bypass test green.
  - Dependencies: S14-T2 + S14-T3 + S14-T4
  - Risk: medium (touches all existing notification emit sites)

- **S14-T6** [S, ~3h] **[BE]** Privacy toggles. `ProfileDiscoverable=false` hides user from learner-facing search; `PublicCvDefault=false` makes new submissions default to private CV (existing `learningCv.isPublic` honors this); `ShowInLeaderboard=false` reserved for post-MVP leaderboard.
  - Acceptance: 3 unit tests (one per toggle); integration test confirms GET /api/user/settings returns state and PATCH persists each one.
  - Dependencies: S14-T2
  - Risk: low

- **S14-T7** [M, ~4h] **[BE]** GitHub link/unlink + safety guard. `POST /api/user/connected-accounts/github` (initiates OAuth in "link" mode via different `state` param, callback links instead of logs in fresh). `DELETE /api/user/connected-accounts/github` (unlink). Safety guard: if `PasswordHash IS NULL` AND `Github IS NOT NULL` → DELETE returns HTTP 409 with `{"error":"set_password_first"}`. Account-security notification raised on link + unlink.
  - Acceptance: 4 integration tests — link happy / unlink happy / unlink-blocked-no-password 409 / link-already-linked 409. Notification raised on each successful op.
  - Dependencies: S14-T5
  - Risk: medium (touches the ADR-039 GitHub OAuth flow without breaking existing login)

- **S14-T8** [L, ~7h] **[BE]** Data export. `POST /api/user/export` enqueues Hangfire `UserDataExportJob`. Job collects: profile (User + UserSettings), submissions (joined with feedback), audits, assessments, gamification (XP + badges + level), notifications (last 90 days). Each → JSON file (UTF-8, pretty-printed). PDF dossier via QuestPDF (reuse `LearningCVPdfRenderer` patterns; new `DataExportPdfRenderer`): 8-page A4 layout with brand header + profile summary + scoreboard + top 5 recent submissions + badges + level. ZIP all 7 files (6 JSON + 1 PDF) → write to Azure Blob (Azurite locally) → generate 1h-signed download URL → raise notification + send email with link.
  - Acceptance: integration test from POST through job completion → ZIP download → ZIP contains expected files; PDF page count ≥ 1 + has profile name in text layer; email sent with link; signed URL expires after 1h.
  - Dependencies: S14-T3 + S14-T4 + S14-T5
  - Risk: medium-high (QuestPDF layout + Hangfire job + blob storage interplay)

- **S14-T9** [L, ~7h] **[BE]** Account delete + Spotify-model auto-cancel. `POST /api/user/account/delete` creates `UserAccountDeletionRequest`, sets `User.IsDeleted=true` + `DeletedAt=now` + `HardDeleteAt=now+30d`, schedules Hangfire `HardDeleteUserJob` at `HardDeleteAt`. User hidden from listings, public CV slug returns 404, login still works. On successful login: if `UserAccountDeletionRequest` exists with `CancelledAt IS NULL`, cancel the Hangfire job, clear `User.IsDeleted`, set `CancelledAt=now`, send "account-restored" email + raise in-app notification. `HardDeleteUserJob` cascades: anonymize Submission/Audit rows (UserId → null, set audit column), purge Notification/EmailDelivery/UserSettings/UserAccountDeletionRequest/AssessmentAnswer/UserBadge rows, free PublicCV slug. PII scrub: email + name + githubUrl + profilePictureUrl wiped on User row; row kept as tombstone for analytics.
  - Acceptance: 5 integration tests — delete + login auto-cancels / delete + 30d-advance + cascade correctness / public CV 404 during cooling-off / listings-hidden during cooling-off / emails sent on request + on auto-cancel.
  - Dependencies: S14-T3 + S14-T7
  - Risk: **high** — touches User soft-delete invariant + multi-domain cascade

- **S14-T10** [L, ~7h] **[FE]** Settings page expansion. `frontend/src/features/settings/SettingsPage.tsx` extends to 4 new sections (Neon & Glass identity preserved from Sprint 13 T8): (1) Notifications — 5 prefs × 2 channels grid; (2) Privacy — 3 toggle rows; (3) Connected Accounts — GitHub row with link/unlink + safety modal; (4) Data — "Download my data" button + "Delete my account" with confirmation modal requiring email re-entry. New Redux `settingsSlice` + `settingsApi.ts`. Replace Sprint-13 cyan banner copy lock with owner-approved replacement (drafted at this T10 step).
  - Acceptance: all 4 sections render in light + dark mode; prefs persist; GitHub unlink without password shows safety modal; data export triggers backend job + toast; delete-account modal requires email re-entry; cyan banner replaced with new owner-approved copy; tsc + FE tests clean.
  - Dependencies: S14-T6 + S14-T7 + S14-T8 + S14-T9
  - Risk: medium

- **S14-T11** [M, ~4h] **[Coord]** Sprint-level integration walkthrough. Owner runs the full happy path on the live stack: change a notification pref → trigger a submission → verify email received (SendGrid sandbox) + in-app notification arrives → toggle privacy → link/unlink GitHub safely → download data export ZIP → request account delete → log back in → verify restore. Document deltas in `docs/demos/sprint-14-walkthrough.md`.
  - Acceptance: walkthrough notes captured; zero P0 deltas remaining; backend test suite ≥465 passing (445 + ≥20 new); FE tsc + build clean.
  - Dependencies: S14-T10
  - Risk: medium (walkthrough may surface UX deltas)

- **S14-T12** [S, ~2h] **[Coord]** Sprint exit doc + commit. Update `docs/progress.md` with Sprint 14 complete + exit-criteria status. Run `prepare-public-copy.ps1 -Force` → cd sibling public folder → git add -A → git commit (Omar sole author, no Co-Authored-By trailer) → git push.
  - Acceptance: progress.md updated; public repo head advances; commit message references S14 scope.
  - Dependencies: S14-T11 sign-off
  - Risk: low

### Sprint 14 exit criteria

- All 12 tasks completed and marked [x] in `progress.md`.
- 5 notification preferences toggleable per channel; real SendGrid delivery verified end-to-end on at least one pref (or env-flipped to `LoggedOnly` if R18 materializes).
- 3 privacy toggles persist + observably affect gated query paths.
- GitHub link/unlink works; safety guard returns 409 if user has no password set.
- Data export delivers a ZIP with 6 JSON + 1 PDF, signed link valid for 1h.
- Account delete request soft-deletes + schedules Hangfire job at +30d; login auto-cancels.
- Settings cyan banner copy replaced with owner-approved post-Sprint-14 copy.
- Backend test suite ≥465 passing (445 baseline + ≥20 new).
- `npm run build` clean; `tsc -b` clean; existing test suite still green.
- Walkthrough notes documented in `docs/demos/sprint-14-walkthrough.md`.
- `docs/progress.md` shows Sprint 14 complete; ADR-046 in `docs/decisions.md`; PRD §`F-stub` 501 stub replaced with live spec.

---

## Sprint 15 — F15 Foundations: 2PL IRT-lite Engine + Questions Schema + Code-Snippet Rendering (2026-05-15 → 2026-05-28) *[NEW — added 2026-05-14]*

**Goal:** Land the 2PL IRT-lite engine in the AI service. Extend `Questions` schema with IRT params + source + embedding columns. Rewire backend `AdaptiveQuestionSelector` to delegate to the AI service while preserving the legacy heuristic as fallback. Render code-snippet questions on the FE.

**Locked answers from kickoff (2026-05-14, via product-architect skill):**

1. **IRT model:** 2PL (per ADR-050) — `(a, b)` per item, `θ` per learner, MLE for `θ`, max Fisher info for selection.
2. **Implementation:** roll our own ~150 LOC Python module using `scipy.optimize` (per ADR-051) — no `py-irt`, no R bridge.
3. **Backfill:** existing 60 questions get `IRT_A = 1.0` and `IRT_B` derived from existing `Difficulty` (1 → -1.0; 2 → 0.0; 3 → +1.0), `CalibrationSource = AI`, `Source = Manual`.
4. **Fallback policy:** AI service unavailable → continue assessment with `LegacyAdaptiveQuestionSelector` (existing simple-rule heuristic); persist `IrtFallbackUsed = true` on the Assessment for admin awareness.
5. **No content changes this sprint** — bank stays at 60 questions. Content burst starts in S16.

**Demo-able deliverable:** Owner takes an existing 30-question assessment that runs end-to-end through the new 2PL IRT engine. Same 60-question bank (with backfilled `(a, b)`). Score distribution roughly matches the pre-S15 assessment. A debug-only θ tracker visible to admin role. AI-unavailable fallback exercised in a second walkthrough.

**Hard rules:**

- IRT engine unit-test bar non-negotiable: synthetic θ_hat within ±0.3 of θ_true in ≥95% of 100 trials after 30 responses. Drives S15-T1 + S15-T10 acceptance.
- Legacy `LegacyAdaptiveQuestionSelector` preserved verbatim — zero edits to the existing class. The new selector goes in `IrtAdaptiveQuestionSelector`; factory pattern picks between them based on AI availability.
- `IsActive=true` filter on Questions preserved in the new selection path.
- Commit via `prepare-public-copy.ps1`; Omar sole author per `feedback_commit_attribution.md`.

**Estimated capacity used:** ~48h (Omar-budget; within the ~50h ceiling).

### Tasks (in execution order)

- **S15-T0** [S, ~2h] **[Coord]** Sprint kickoff — verify Sprint 14 closed; ambiguity sweep against `docs/assessment-learning-path.md` §3.2 + §5; refresh ADR-049/050/051 inline references.
  - Acceptance: kickoff note in `docs/progress.md`; no ambiguities outstanding before S15-T1.
  - Dependencies: Sprint 14 closed (done)
  - Risk: low

- **S15-T1** [L, ~7h] **[AI]** IRT engine Python module (`ai-service/app/irt/engine.py`): `p_correct`, `item_info`, `estimate_theta_mle`, `select_next_question`, `recalibrate_item`. ~150 LOC. Bounds: θ∈[-4,4], a∈[0.3,3.0], b∈[-3,3].
  - Acceptance: 5 unit tests per `docs/assessment-learning-path.md` §5.3 v1.1 green; synthetic θ recovered within **±0.5 in ≥95% of 100 adaptive trials at 30 responses** (bar bumped from ±0.3 per ADR-055 — engine math correct, original bar was Fisher-info-infeasible at 30 responses); `recalibrate_item` recovers (a, b) in ≥95% of 50 MC trials at N=1000 responses (bumped from 100). 33 tests landed; full IRT acceptance bar green. ADR-055 ships with the same commit.
  - Dependencies: none
  - Risk: medium (numerical optimization correctness)

- **S15-T2** [S, ~3h] **[AI]** AI service endpoints `POST /api/irt/select-next` + `POST /api/irt/recalibrate`. FastAPI routes + Pydantic schemas in `ai-service/app/schemas/irt.py`.
  - Acceptance: pytest integration tests via FastAPI test client; correctness on synthetic bank; 4xx responses on malformed input.
  - Dependencies: S15-T1
  - Risk: low

- **S15-T3** [M, ~5h] **[BE]** EF migration `AddIrtAndAiColumnsToQuestions` extending the `Questions` table: `IRT_A` (float, default 1.0), `IRT_B` (float, default 0.0), `CalibrationSource` (string enum, default 'AI'), `Source` (string enum, default 'Manual'), `ApprovedById` (FK Users, nullable), `ApprovedAt` (nullable), `CodeSnippet` (nvarchar(max), nullable), `CodeLanguage` (varchar(32), nullable), `EmbeddingJson` (nvarchar(max), nullable), `PromptVersion` (varchar(64), nullable). Migration must apply + revert cleanly.
  - Acceptance: migration up + down clean on a copy of the dev DB; round-trip integration test confirms columns persist; existing 599-test backend suite still passes.
  - Dependencies: none
  - Risk: low (schema only)

- **S15-T4** [M, ~4h] **[BE]** Backfill existing 60 questions: `IRT_A = 1.0`, `IRT_B` mapped from `Difficulty` (1 → -1.0; 2 → 0.0; 3 → +1.0), `CalibrationSource = 'AI'`, `Source = 'Manual'`. One-shot data migration step inside the EF migration (or a follow-on Hangfire one-time job).
  - Acceptance: SELECT confirms all 60 rows have non-default IRT params + correct enum values; spot-check 10 questions manually.
  - Dependencies: S15-T3
  - Risk: low

- **S15-T5** [M, ~5h] **[BE]** `IAdaptiveQuestionSelector` rewire. New `IrtAdaptiveQuestionSelector` delegates to AI service `/api/irt/select-next` (via existing `IAiReviewClient` Refit pattern, extended with IRT methods). `LegacyAdaptiveQuestionSelector` (existing class) preserved untouched. New `IAdaptiveQuestionSelectorFactory` picks between them based on AI service health.
  - Acceptance: 8 integration tests — happy IRT path (3 scenarios: beginner/intermediate/advanced synthetic learner) + AI-unavailable fallback path (3 scenarios) + cross-category balance check + edge-case empty-bank-after-filtering.
  - Dependencies: S15-T2, S15-T4
  - Risk: medium (touches the existing assessment hot path; regression risk)

- **S15-T6** [S, ~3h] **[BE]** AI service unavailability detection. Reuse existing `IAiServiceHealthCheck` if present (else add); `IrtFallbackUsed` boolean flag persisted on `Assessment` row for admin awareness (does NOT degrade learner UX).
  - Acceptance: integration test simulates AI service down (e.g., HttpClient throws); assessment continues end-to-end with legacy selector; `IrtFallbackUsed=true` set.
  - Dependencies: S15-T5
  - Risk: low

- **S15-T7** [M, ~4h] **[FE]** Code-snippet rendering in question card — Prism syntax-highlight + language label badge; supports 5 languages (JS, Python, C#, Java, TS) at minimum. Reuses the existing Prism integration from Sprint 6.
  - Acceptance: render test with 5 sample snippets across languages; mobile + desktop responsive; ARIA labels correct.
  - Dependencies: S15-T3
  - Risk: low

- **S15-T8** [M, ~5h] **[BE+FE]** Frontend assessment page upgrade — render `CodeSnippet` field when present (above the question text); admin-role-only debug banner showing current θ + last item info value; learner UX unchanged.
  - Acceptance: e2e walkthrough renders correctly; θ banner visible to admin role only; learner sees no debug info; existing tsc -b clean.
  - Dependencies: S15-T7, S15-T5
  - Risk: low

- **S15-T9** [M, ~4h] **[AI+BE]** End-to-end smoke walkthrough — complete a real 30-question assessment via the new IRT engine on the backfilled bank; verify per-category scores reasonable; kill the AI service container mid-flight and verify fallback path takes over without learner-visible error. Document in `docs/demos/sprint-15-walkthrough.md`.
  - Acceptance: 1 happy walkthrough + 1 fallback walkthrough documented; supervisor + Omar pair-reviewed.
  - Dependencies: S15-T8, S15-T6
  - Risk: medium (first integration of the whole new path)

- **S15-T10** [S, ~3h] **[AI]** IRT engine performance benchmark — `select_next_question` p95 < 50ms over 250-item bank (forward-looking — bank still 60 in S15, but we test at projected scale). Pytest perf marker.
  - Acceptance: benchmark passes consistently in CI; result logged in `docs/demos/sprint-15-walkthrough.md`.
  - Dependencies: S15-T1
  - Risk: low

- **S15-T11** [S, ~3h] **[Coord]** Sprint exit doc + commit. Update `docs/progress.md` with Sprint 15 complete + exit-criteria status. Run `prepare-public-copy.ps1 -Force` → cd sibling public folder → git add -A → git commit (Omar sole author) → git push.
  - Acceptance: progress.md updated; public repo head advances; commit message references S15 scope (`feat(assessment): Sprint 15 — 2PL IRT-lite engine + Questions IRT schema + code-snippet rendering`).
  - Dependencies: S15-T9 sign-off
  - Risk: low

### Sprint 15 exit criteria

- All 11 tasks completed and marked [x] in `progress.md`.
- 2PL IRT engine module + 5 unit tests green (synthetic θ recovery ≥95% within ±0.3).
- `Questions` table schema migrated; 60 existing questions backfilled with `(a, b)` + `Source` + `CalibrationSource`.
- New `IrtAdaptiveQuestionSelector` + factory in place; 8 integration tests green.
- Assessment flow runs end-to-end via the new selector; AI-unavailable fallback exercised in walkthrough.
- Code-snippet rendering works for 5 languages on desktop + mobile.
- Backend test suite ≥ 599 + new IRT-related tests passing (no regressions on Sprint 14 baseline).
- `npm run build` clean; `tsc -b` clean.
- Sprint walkthrough notes in `docs/demos/sprint-15-walkthrough.md`.
- ADR-049 / ADR-050 / ADR-051 already in `docs/decisions.md` (landed 2026-05-14).

---

## Sprint 16 — F15 Admin Tools: AI Question Generator + Drafts Review + Content Batches 1–2 (2026-05-29 → 2026-06-11) *[NEW — added 2026-05-14]*

**Goal:** Land the AI Question Generator admin tool end-to-end (backend endpoints + FE pages + drafts review + approve/reject). Wire the `EmbedEntityJob` on Question approve. Run the first 2 content batches to grow the bank from 60 → ~120.

**Locked answers from kickoff:**

1. **Generator prompt v1:** instructions live in `ai-service/app/prompts/generate_questions_v1.md` per the skeleton in `docs/assessment-learning-path.md` §6.2.1.
2. **Per-batch size:** admin requests N=5..20 questions per batch (UI cap at 20 to keep token cost bounded).
3. **Review distribution:** 7-person team assigned by category at kickoff. Omar: Security + Performance. FE leads: Readability + Design. AI leads: Correctness. DevOps: cross-cutting.
4. **Reject reason free-text optional; rejection always logged to `QuestionDrafts.RejectionReason`.**
5. **Embedding job fires synchronously-by-Hangfire on approve** (not at generate time — too speculative for tokens).

**Demo-able deliverable:** Admin opens `/admin/questions/generate`, requests "Security / Medium / count=10 / include_code=true / language=Python", sees 10 AI drafts with `(a, b)` ratings + rationale + code snippets, edits one option text, approves 8, rejects 2 with reasons. Bank shows the 8 new questions; embeddings present in `EmbeddingJson` for each. After batches 1 + 2, bank reaches ~120 items.

**Hard rules:**

- AI Generator response validated by Pydantic; on schema fail, retry-with-self-correction (max 2 retries) per `assessment-learning-path.md` §6.3.
- Approve transaction is atomic: `QuestionDrafts.Status = 'Approved'` AND `Questions` row inserted AND `EmbedEntityJob` enqueued — same DB transaction (the Hangfire enqueue is part of the same UoW).
- Per-batch approve/reject ratio surfaced on admin dashboard widget after S16-T9 lands.

**Estimated capacity used:** ~52h Omar-budget (+4% over 50h ceiling — flagged, within >110% threshold). Team-member content review time (S16-T7/T8) does NOT count against Omar's budget.

### Tasks (in execution order)

- **S16-T0** [S, ~2h] **[Coord]** Kickoff. Confirm review pipeline owners (7-member assignment); confirm batch size 5–20.
  - Acceptance: kickoff note in `progress.md`; review owners listed.
  - Dependencies: Sprint 15 closed
  - Risk: low

- **S16-T1** [L, ~6h] **[AI]** AI service `POST /api/generate-questions` — endpoint + Pydantic request/response schemas + retry-with-self-correction logic. The endpoint returns drafts; persistence happens on backend (drafts are POST-back to backend).
  - Acceptance: 4 unit tests + 1 integration test via FastAPI client; retry path triggered by synthetic invalid response → recovers.
  - Dependencies: S15 closed
  - Risk: medium (prompt + JSON shape stability)

- **S16-T2** [M, ~4h] **[AI]** Generator prompt v1 `prompts/generate_questions_v1.md`. Pre-validate by generating 9 sample outputs (3 categories × 3 difficulty levels) for owner review.
  - Acceptance: 9 sample outputs in `docs/demos/sprint-16-generator-validation.md`; reject rate < 30% (≥7 of 9 acceptable in spirit).
  - Dependencies: S16-T1
  - Risk: medium (prompt quality)

- **S16-T3** [M, ~4h] **[AI]** AI service `POST /api/embed` (general-purpose `text-embedding-3-small` wrapper) + `POST /api/embeddings/reload` (in-memory cache refresh signal).
  - Acceptance: integration test + cache state observable via `GET /api/embeddings/stats` (small diagnostic added).
  - Dependencies: none
  - Risk: low

- **S16-T4** [L, ~6h] **[BE]** Backend admin endpoints + EF entity `QuestionDrafts`. Endpoints: `POST /api/admin/questions/generate`, `GET /api/admin/questions/drafts/{batchId}`, `POST /api/admin/questions/drafts/{id}/approve`, `POST /api/admin/questions/drafts/{id}/reject`. EF migration `AddQuestionDrafts`.
  - Acceptance: 8 integration tests — generate batch / list drafts / approve (with + without edits) / reject (with + without reason) / cross-admin authz / 409 on double-approve / batchId not found / unauthorized.
  - Dependencies: S16-T1
  - Risk: medium

- **S16-T5** [M, ~4h] **[BE]** Hangfire `EmbedEntityJob<Question>` — fires on Question approve. Calls AI service `/api/embed` with the question text + code snippet; persists `EmbeddingJson` on the row; then calls `/api/embeddings/reload` to refresh the AI service cache.
  - Acceptance: integration test from approve to `EmbeddingJson != null`; in-memory cache state confirmed to include the new vector.
  - Dependencies: S16-T3 + S16-T4
  - Risk: medium (Hangfire job + cross-service coordination)

- **S16-T6** [L, ~7h] **[FE]** Admin page `/admin/questions/generate`. Generate form (category, difficulty, count, include_code toggle, language dropdown). Drafts review table (one row per draft with collapsible details + edit modal). Per-row approve/reject buttons. Batch-level "approve all / reject all" actions. Sticks to the Neon & Glass design system (`design-system.md`) — no exceptions.
  - Acceptance: render in light + dark mode; edit modal preserves admin's edits on save; FE tests cover happy + error paths; `tsc -b` clean.
  - Dependencies: S16-T4
  - Risk: medium

- **S16-T7** [M, ~5h] **[Coord+Team]** Content batch 1 — 30 new questions (5 categories × 6 questions). Team-wide review by assigned category owner. Excludes Omar's review time from sprint budget.
  - Acceptance: 30 questions in bank (90 total); admin dashboard shows batch reject rate; rejections logged with reasons.
  - Dependencies: S16-T6
  - Risk: medium (R20 — generator quality)

- **S16-T8** [M, ~5h] **[Coord+Team]** Content batch 2 — 30 more questions; bank reaches ~120.
  - Acceptance: 120 total questions in bank; reject rate < 30%.
  - Dependencies: S16-T7 (sequential, so quality lessons from batch 1 flow into batch 2)
  - Risk: medium

- **S16-T9** [S, ~3h] **[BE]** Reject-rate metric Hangfire job `GeneratorQualityMetricsJob` (weekly). Aggregates per-batch approve/reject ratio. Surfaces on admin dashboard widget (sparkline of last 8 batches).
  - Acceptance: job runs on schedule; widget renders; metric matches manual SELECT verification.
  - Dependencies: S16-T8
  - Risk: low

- **S16-T10** [M, ~4h] **[Coord]** Sprint integration walkthrough — full generator flow (generate → review → approve → bank → embed cache refreshed → next assessment uses fresh bank). Document in `docs/demos/sprint-16-walkthrough.md`.
  - Acceptance: walkthrough green; 120-question bank confirmed via SQL.
  - Dependencies: S16-T9
  - Risk: medium

- **S16-T11** [S, ~2h] **[Coord]** Sprint exit doc + commit (Omar sole author, no Co-Authored-By trailer).
  - Acceptance: progress.md updated; public repo HEAD advances.
  - Dependencies: S16-T10
  - Risk: low

### Sprint 16 exit criteria

- All 11 tasks completed.
- AI Question Generator end-to-end live; admin can generate + review + approve + reject + edit-before-approve.
- ≥120 questions in the bank (60 existing + 60 new across 2 batches).
- Per-batch reject rate < 30% across both batches.
- `EmbedEntityJob` fires on every Question approve; in-memory embedding cache refreshed.
- Generator quality metrics widget live on admin dashboard.
- Sprint-16 walkthrough notes in `docs/demos/sprint-16-walkthrough.md`.

---

## Sprint 17 — F15 Post-Assessment AI Summary + IRT Recalibration Infra + Content Batches 3–4 (2026-06-12 → 2026-06-25) *[NEW — added 2026-05-14]*

**Goal:** Land the post-assessment AI summary (F15.5). Stand up empirical IRT recalibration infrastructure (F15.4b — Hangfire job + audit log). Build admin calibration dashboard. Run content batches 3–4 to reach the ≥150-question minimum threshold (target 150 by sprint close).

**Locked answers from kickoff:**

1. **Summary regeneration policy:** one summary per Assessment (`AssessmentSummaries.AssessmentId` unique). Mini-reassessments do NOT generate a summary (only full assessments do).
2. **Recalibration threshold:** ≥1000 responses per question (per ADR-055; bumped from ≥50 in the original kickoff after S15-T1 empirical validation). Recalibrate `b` always; recalibrate `a` only when ≥1000 responses for that item. Pre-defense reality at dogfood scale (~50 respondents) means **no item will trigger recalibration** — infrastructure ships ready, runs post-defense as user base grows. Documented in thesis honesty pass.
3. **Calibration dashboard:** read-only for the admin in v1; "force recalibrate now" admin action deferred to v1.1.
4. **Summary FE:** above the existing radar chart on the assessment result page; learner can dismiss but not delete.

**Demo-able deliverable:** A learner finishes the 30-Q assessment → within 8 sec sees a 3-paragraph AI summary card (strengths / weaknesses / path guidance). Admin opens `/admin/calibration` → sees a 6×3 heatmap (category × difficulty) of question counts + per-item drilldown showing `(a, b, source, responseCount, lastCalibratedAt)`.

**Hard rules:**

- Recalibration runs ONLY for items with ≥1000 responses (per ADR-055; bumped from ≥50). The job logs a row per item it considered (calibrated OR skipped). At dogfood scale no item will trigger pre-defense — that's expected; infrastructure stays in place for post-defense scale-up.
- Admin override (`CalibrationSource = 'Admin'`) is never overwritten by recalibration; the job checks and skips.
- AI summary token cap: 4k input, 800 output. p95 latency ≤ 8 sec.

**Estimated capacity used:** ~46h.

### Tasks (in execution order)

- **S17-T0** [S, ~2h] **[Coord]** Kickoff.
- **S17-T1** [M, ~5h] **[AI]** AI service `POST /api/assessment-summary` + Pydantic schema. Prompt v1 `prompts/assessment_summary_v1.md`.
  - Acceptance: integration test on 3 synthetic assessments (beginner/intermediate/advanced); p95 latency tested locally <8s.
  - Dependencies: S15 + S16 closed
  - Risk: medium (prompt + latency)
- **S17-T2** [M, ~4h] **[BE]** `GenerateAssessmentSummaryJob` (Hangfire) — enqueued on full Assessment Completed. Calls AI service; persists `AssessmentSummaries` row. New EF entity + migration.
  - Acceptance: 4 integration tests — happy path / AI down / Assessment-not-Completed / mini-reassessment-no-trigger.
  - Dependencies: S17-T1
  - Risk: medium
- **S17-T3** [M, ~4h] **[BE]** Backend `GET /api/assessments/{id}/summary` — cache-aware: 409 if not yet generated, 200 with payload after.
  - Acceptance: 3 integration tests; OwnsResource enforced (only the assessment's user can read).
  - Dependencies: S17-T2
  - Risk: low
- **S17-T4** [M, ~5h] **[FE]** Assessment result page — AI summary card above existing radar chart; polling UX while summary generates ("Generating summary…" spinner with 30s timeout fallback).
  - Acceptance: light + dark mode; markdown rendered safely; FE tests cover all 3 backend states (pending / ready / error).
  - Dependencies: S17-T3
  - Risk: low
- **S17-T5** [M, ~5h] **[BE+AI]** Hangfire `RecalibrateIRTJob` (weekly schedule). For each Question with **≥1000 responses** (per ADR-055) AND `CalibrationSource != 'Admin'`, build response matrix (each response includes the learner's θ at the time, derivable from `AssessmentResponses`), call AI service `/api/irt/recalibrate`, update `Questions.IRT_A / IRT_B / CalibrationSource = 'Empirical'`, log to `IRTCalibrationLog`.
  - Acceptance: integration test on synthetic data — Monte Carlo 50 trials × 1000 simulated responses per item, recalibration recovers params within ±0.2 (a) and ±0.3 (b) in ≥95% of trials (per ADR-055 + S15-T1's already-passing IRT engine tests).
  - Dependencies: S17-T2
  - Risk: medium (R21 — pre-defense dogfood scale (~50 respondents) is well below the 1000-response threshold so no item recalibrates pre-defense; infrastructure still required to land for thesis demo + post-defense scale-up)
- **S17-T6** [S, ~3h] **[BE]** New entity `IRTCalibrationLog` + EF migration + repository methods (per-question history query).
  - Acceptance: migration up/down clean; round-trip test.
  - Dependencies: none
  - Risk: low
- **S17-T7** [M, ~5h] **[FE]** Admin page `/admin/calibration` — heatmap (6 categories × 3 difficulty levels, cell = count of questions), per-item drilldown panel showing `(a, b, CalibrationSource, ResponseCount, LastCalibratedAt)`. Filters: category, difficulty, source.
  - Acceptance: heatmap renders; drilldown loads <1s; mobile responsive.
  - Dependencies: S17-T6
  - Risk: low
- **S17-T8** [L, ~7h] **[Coord+Team]** Content batches 3–4 — 30 more questions (reach ~150 = MVP minimum). Team-wide review.
  - Acceptance: 150 questions in bank; reject rate <30%; cell coverage ≥5 per (category × difficulty).
  - Dependencies: S17-T4 (so the new questions can be tested by team via assessment + summary flow)
  - Risk: medium (R25)
- **S17-T9** [M, ~4h] **[Coord]** Sprint integration walkthrough — assessment → AI summary appears → admin opens calibration dashboard → triggers `RecalibrateIRTJob` manually (admin debug action) → confirms log entries.
  - Acceptance: walkthrough green; `docs/demos/sprint-17-walkthrough.md` complete.
  - Dependencies: S17-T8
  - Risk: medium
- **S17-T10** [S, ~2h] **[Coord]** Sprint exit doc + commit.

### Sprint 17 exit criteria

- All 10 tasks completed.
- Post-assessment AI summary live; p95 ≤ 8 sec from Assessment Completed → summary visible.
- `RecalibrateIRTJob` runs weekly; correctly identifies items with ≥1000 responses (per ADR-055; pre-defense empty result is expected); updates params + writes to `IRTCalibrationLog`.
- Admin calibration dashboard live with heatmap + drilldown.
- Bank reaches ≥150 questions (MVP minimum).
- Sprint 17 walkthrough notes in `docs/demos/sprint-17-walkthrough.md`.

---

## Sprint 18 — F16 Foundations: Task Metadata + Task Generator + Library Expansion 21→31 (2026-06-26 → 2026-07-09) *[NEW — added 2026-05-14]*

**Goal:** Add rich task metadata to existing `Tasks` table (`SkillTagsJson`, `LearningGainJson`, `Source`, `ApprovedBy*`, `EmbeddingJson`); backfill the 21 existing tasks with AI-suggested + human-reviewed metadata. Build the Task Generator admin tool (mirrors S16 question generator pattern). Run task batch 1 (10 new tasks, library 21 → 31). Add topological prerequisite-check helper used by S19's Path Generator.

**Locked answers from kickoff:**

1. **Skill taxonomy:** existing 5 categories (correctness, readability, security, performance, design). `SkillTagsJson` allows multi-label with weight (weights sum to 1.0). E.g., `[{"skill":"correctness","weight":0.6},{"skill":"design","weight":0.4}]`.
2. **Backfill of 21 tasks:** AI generates suggested tags + learning gain for each, Omar (the curator) reviews + approves via the admin tool. Manual override always wins.
3. **Prerequisites enforcement:** existing `Prerequisites` column was advisory; now enforced via FK validation + topological check in the Path Generator (S19-T1).

**Demo-able deliverable:** Admin generates 5 task drafts for "Backend / Medium / focus_skills=[security, performance]" via AI. Drafts include `SkillTagsJson` + `LearningGainJson` per task. Admin reviews + approves 4; rejects 1 with reason. Library shows 25 → 31 tasks (after batch 1 of 10).

**Hard rules:** same as S16's question authoring pattern — atomic approve + embed; multi-skill tags weights validated to sum to 1.0 ± 0.05.

**Estimated capacity used:** ~48h.

### Tasks (in execution order)

- **S18-T0** [S, ~2h] **[Coord]** Kickoff — review distribution for 10 new tasks owned by team.
- **S18-T1** [M, ~5h] **[BE]** EF migration `AddAiColumnsToTasks` extending `Tasks` table: `SkillTagsJson` (nvarchar(max), nullable), `LearningGainJson` (nvarchar(max), nullable), `Source` (string enum, default 'Manual'), `ApprovedById` (FK Users, nullable), `ApprovedAt` (nullable), `EmbeddingJson` (nvarchar(max), nullable). Plus `TaskDrafts` table.
  - Acceptance: migration up/down clean; round-trip integration test.
  - Dependencies: S17 closed
  - Risk: low
- **S18-T2** [L, ~6h] **[AI+BE]** Backfill the 21 existing tasks. AI service batch endpoint generates suggested skill tags + learning gain per task. Omar reviews + approves via the same admin UI in S18-T5 (used in dual mode: "backfill existing" vs "generate new").
  - Acceptance: 21 tasks have non-null `SkillTagsJson` + `LearningGainJson`; weights sum-to-one validated.
  - Dependencies: S18-T1, S18-T5
  - Risk: medium
- **S18-T3** [M, ~4h] **[AI]** AI service `POST /api/generate-tasks` + Pydantic schema. Prompt v1 `prompts/generate_tasks_v1.md`.
  - Acceptance: 5 synthetic prompts tested; reject-in-spirit rate <30%.
  - Dependencies: none
  - Risk: medium
- **S18-T4** [M, ~5h] **[BE]** Backend admin endpoints for task generation (mirrors S16 question endpoints): `POST /api/admin/tasks/generate`, `GET /api/admin/tasks/drafts/{batchId}`, `POST /api/admin/tasks/drafts/{id}/approve`, `POST /api/admin/tasks/drafts/{id}/reject`.
  - Acceptance: 8 integration tests parallel to S16-T4 tests.
  - Dependencies: S18-T3 + S18-T1
  - Risk: medium
- **S18-T5** [L, ~7h] **[FE]** Admin page `/admin/tasks/generate` — same UX pattern as `/admin/questions/generate` adapted for the Task shape (skill tags weight sliders; learning gain mini-table; markdown description preview).
  - Acceptance: light + dark mode; weight sliders enforce sum-to-one; markdown rendering matches `/tasks/:id` page render.
  - Dependencies: S18-T4
  - Risk: medium
- **S18-T6** [M, ~4h] **[BE]** Hangfire `EmbedEntityJob<Task>` — same pattern as S16-T5 but for Tasks. Embedding text = title + first 800 chars of description + skill tags joined.
  - Acceptance: integration test from approve to `EmbeddingJson != null`; cache reload verified.
  - Dependencies: S16-T5 (extension), S18-T1
  - Risk: low
- **S18-T7** [M, ~4h] **[Coord+Team]** Task batch 1 — 10 new tasks (21 → 31). Distribution: 3-4 tasks per track.
  - Acceptance: 31 total tasks; each new task has non-null metadata; reject rate <30%.
  - Dependencies: S18-T5 + S18-T2
  - Risk: medium
- **S18-T8** [M, ~5h] **[BE]** Topological prerequisite-check helper `TaskPrerequisiteValidator` — input: list of task IDs in proposed order. Output: pass / fail + offending edge if cycle / unmet prereq. Pure C#, no DB calls.
  - Acceptance: 8 unit tests covering — empty / single / chain / cycle / unmet prereq / valid DAG / disconnected components / self-loop.
  - Dependencies: none
  - Risk: low
- **S18-T9** [M, ~4h] **[Coord]** Sprint integration walkthrough — task generator full flow + 31 tasks confirmed + metadata complete + validator unit-tested.
  - Acceptance: walkthrough green; `docs/demos/sprint-18-walkthrough.md` complete.
  - Dependencies: S18-T7 + S18-T8
  - Risk: medium
- **S18-T10** [S, ~2h] **[Coord]** Sprint exit doc + commit.

### Sprint 18 exit criteria

- All 10 tasks completed.
- `Tasks` schema migrated; 21 existing tasks backfilled with metadata.
- Task Generator admin tool live; 10 new tasks added (library 21 → 31).
- `EmbedEntityJob<Task>` fires on approve.
- `TaskPrerequisiteValidator` unit-tested (8 tests).
- Sprint 18 walkthrough notes in `docs/demos/sprint-18-walkthrough.md`.

---

## Sprint 19 — F16 AI Path Generator + Per-Task Framing + Library Expansion 31→41 (2026-07-10 → 2026-07-23) *[NEW — added 2026-05-14]*

**Goal:** Replace the F3 template path logic with AI service `/api/generate-path` (hybrid embedding-recall + LLM-rerank). Add `LearnerSkillProfile` entity + service. Land per-task AI framing endpoint + cache. Continue library expansion: 31 → 41 tasks.

**Locked answers from kickoff:**

1. **Path length:** target 8 tasks per generated path (configurable via prompt input `target_length`; default 8).
2. **Recall top-K:** 20 candidates (configurable).
3. **`LearnerSkillProfile` smoothing:** EMA (exponential moving average) with α=0.4 — privileges recent submissions over older ones without dropping signal.
4. **Framing TTL:** 7 days; invalidated immediately on adaptation event (S20 wire-up).

**Demo-able deliverable:** A new dogfood learner takes the assessment → AI summary → automatically generated path (~8 tasks, with `AIReasoning` text on each) within 15 sec. Click on the first task → see personalized framing card ("Why this matters for you", "Focus areas", "Common pitfalls"). Library shows 41 tasks.

**Hard rules:**

- AI service unavailable → fall back to legacy template logic in `LearningPathService`; flag `LearningPath.Source = 'TemplateFallback'`.
- Topological prereq check (S18-T8) MUST pass for any AI-generated path; on violation, retry-with-self-correction (max 2) THEN fall back.
- p95 path generation latency ≤ 15 sec from `GenerateLearningPathJob` enqueued to `LearningPath` row written.

**Estimated capacity used:** ~49h.

### Tasks (in execution order)

- **S19-T0** [S, ~2h] **[Coord]** Kickoff.
- **S19-T1** [L, ~8h] **[AI]** AI service `POST /api/generate-path` — hybrid recall (cosine over `task_embeddings_cache`, top-20) + LLM rerank prompt + Pydantic validation + retry-with-self-correction (max 2) + topological check using S18-T8's validator semantics (reimplemented in Python; identical logic).
  - Acceptance: 6 integration tests — 3 synthetic profiles (B/I/A) × 2 tracks; topological violation triggers retry; valid path within 15 sec p95.
  - Dependencies: S18 closed
  - Risk: high (the headline feature; many moving parts)
- **S19-T2** [M, ~4h] **[AI]** Path generation prompt v1 `prompts/generate_path_v1.md` per `assessment-learning-path.md` §6.2.2.
  - Acceptance: prompt produces valid + topologically-sound paths on 3 synthetic profiles.
  - Dependencies: S19-T1
  - Risk: medium
- **S19-T3** [M, ~4h] **[BE]** `LearnerSkillProfile` entity + EF migration + repository + `LearnerSkillProfileService` (EMA smoothing per category, α=0.4). Source initialization: from Assessment on completion (Source=Assessment); update from F6 submission scores (Source=SubmissionInferred).
  - Acceptance: 5 unit tests for EMA correctness; integration test verifies profile written after Assessment Complete + updated after first F6 result.
  - Dependencies: S18 closed
  - Risk: low
- **S19-T4** [M, ~5h] **[BE]** `GenerateLearningPathJob` rewire — now calls AI service `/api/generate-path` with `{skillProfile, track, completedTaskIds, targetLength=8, assessmentSummaryText}`. Legacy template logic preserved as `TemplatePathFallback` and invoked on AI-unavailable.
  - Acceptance: 6 integration tests — happy AI path / AI-unavailable fallback / topological retry success / topological retry failure → fallback / `LearningPath.Source` correctly stamped / `GenerationReasoningText` persisted.
  - Dependencies: S19-T1 + S19-T3 + S18-T8
  - Risk: high
- **S19-T5** [M, ~5h] **[AI]** AI service `POST /api/task-framing` + Pydantic schema. Prompt v1 `prompts/task_framing_v1.md`.
  - Acceptance: 3 integration tests; p95 latency <6 sec.
  - Dependencies: none
  - Risk: low
- **S19-T6** [M, ~4h] **[BE]** `TaskFramings` entity + EF migration + repository + `GET /api/tasks/{id}/framing` endpoint (cache-aware: returns existing if `ExpiresAt > now`, else enqueues `GenerateTaskFramingJob` and returns 409 with poll URL) + Hangfire `GenerateTaskFramingJob`.
  - Acceptance: 4 integration tests — cold cache / warm cache / expired cache / cross-user isolation (UserId enforces OwnsResource).
  - Dependencies: S19-T5
  - Risk: low
- **S19-T7** [M, ~4h] **[FE]** Task page extended — framing card above the existing description (3 sub-cards: Why this matters / Focus areas / Common pitfalls). Loading state for cold cache; fallback if generation fails ("Personalized framing unavailable" + link to retry).
  - Acceptance: render in light + dark mode; markdown safe; fallback path tested.
  - Dependencies: S19-T6
  - Risk: low
- **S19-T8** [M, ~5h] **[Coord+Team]** Task batch 2 — 10 more tasks (31 → 41).
  - Acceptance: 41 total tasks; reject rate <30%.
  - Dependencies: S19-T4 (so the new tasks can be tested via the new path generation)
  - Risk: medium
- **S19-T9** [M, ~5h] **[Coord]** Sprint integration walkthrough — new dogfood learner full flow (assessment → AI summary → AI path generation → task framing visible). Document timing per stage.
  - Acceptance: walkthrough green; latencies recorded in `docs/demos/sprint-19-walkthrough.md`; p95 path gen <15 sec confirmed.
  - Dependencies: S19-T7 + S19-T8
  - Risk: medium (R22 — Path Generator hallucinations)
- **S19-T10** [S, ~3h] **[Coord]** Sprint exit doc + commit.

### Sprint 19 exit criteria

- All 10 tasks completed.
- AI Path Generator live; hybrid recall+rerank within 15 sec p95.
- `LearnerSkillProfile` entity + service in place; EMA smoothing tested.
- Per-task AI framing live; 7-day cache active.
- Library reaches 41 tasks.
- Sprint 19 walkthrough notes including timing data.

---

## Sprint 20 — F16 Continuous Adaptation: PathAdaptationJob + Proposal UI + History Timeline + Library 41→50 (2026-07-24 → 2026-08-06) *[NEW — added 2026-05-14]*

**Goal:** Land `PathAdaptationJob` with signal-driven triggers + cooldown + auto-apply vs Pending classification. Build proposal/approval modal + adaptation history timeline. Finish library expansion to 50 tasks (target met).

**Locked answers from kickoff:**

1. **Trigger evaluation:** at end of every `SubmissionAnalysisJob`, after F6 score update.
2. **Cooldown:** strict 24h; bypassed ONLY by `Completion100` and `OnDemand`.
3. **Pending auto-expiry:** 7 days after `TriggeredAt` if no learner response — `LearnerDecision = 'Expired'`.
4. **Notifications:** Sprint-14 pref-aware (`NotificationService.RaiseAsync` reads the learner's `UserSettings.AdaptationAlerts` toggle — new toggle added in S20-T0; default ON).

**Demo-able deliverable:** Dogfood learner completes 3rd path task → 30 sec later sees in-app notification "AI proposes 2 changes". Opens `/path` → modal shows diff (current ordering vs proposed) with per-action reason + confidence. Approves both → path reordered live. Admin opens `/admin/adaptations` → sees the event with full audit trail.

**Hard rules:**

- Auto-apply ONLY if `type=reorder AND confidence>0.8 AND intra-skill-area` — strict 3-of-3.
- Every cycle writes a `PathAdaptationEvents` row, even if action list is empty (still records the trigger fired + cooldown checked).
- Idempotency key: `PathAdaptationJob:{pathId}:{triggerHash}:{hourBucket}` — re-execution produces no duplicate event.

**Estimated capacity used:** ~52h (+4% over budget, flagged at kickoff, no rescoping).

### Tasks (in execution order)

- **S20-T0** [S, ~2h] **[Coord]** Kickoff. Add `AdaptationAlerts` toggle to `UserSettings` (Sprint-14 entity extension — 1 column, 1 migration).
- **S20-T1** [L, ~8h] **[AI]** AI service `POST /api/adapt-path` — signal-driven action generation + Pydantic validation + scope enforcement (rejects out-of-scope actions per signal level — e.g., `swap` proposed for `small` signal → validation fails).
  - Acceptance: 9 integration tests — 3 signal levels × 3 scenarios each; out-of-scope action rejection verified.
  - Dependencies: S19 closed
  - Risk: high (signal logic + scope enforcement is subtle)
- **S20-T2** [M, ~4h] **[AI]** Adaptation prompt v1 `prompts/adapt_path_v1.md` per `assessment-learning-path.md` §6.2.3.
  - Acceptance: prompt produces valid + scope-compliant action sets on 6 synthetic scenarios.
  - Dependencies: S20-T1
  - Risk: medium
- **S20-T3** [S, ~3h] **[BE]** `PathAdaptationEvents` entity + EF migration + repository.
  - Acceptance: migration clean; round-trip test; index `(PathId, TriggeredAt DESC)` confirmed.
  - Dependencies: none
  - Risk: low
- **S20-T4** [L, ~8h] **[BE]** Hangfire `PathAdaptationJob`. Trigger evaluation (every-3 / score-swing / completion / on-demand) + 24h cooldown + signal-level computation + auto-apply vs Pending classification + transactional `PathTasks` reorder/swap + `LearningPath.LastAdaptedAt` update + `Notifications` enqueue (pref-aware).
  - Acceptance: 12 integration tests — each trigger type / cooldown bypass / signal level boundaries / auto-apply (3-of-3 criteria met) / Pending classification / idempotency on re-enqueue / concurrent submissions race / score-swing exactly-10pt boundary / empty action list / AI down → skip with log / Completion100 + OnDemand bypass cooldown.
  - Dependencies: S20-T1 + S20-T3 + S19-T3
  - Risk: high (concurrency + multi-trigger logic + transactional reorder)
- **S20-T5** [M, ~5h] **[BE]** Backend endpoints `/api/learning-paths/me/adaptations` (list pending + history) + `/{id}/respond` (approve/reject) + `/refresh` (on-demand trigger via direct job enqueue).
  - Acceptance: 6 integration tests — list pending / list history / approve / reject / refresh (cooldown bypass verified) / cross-user 403.
  - Dependencies: S20-T4
  - Risk: medium
- **S20-T6** [L, ~6h] **[FE]** Path page with proposal modal. Non-dismissable banner when pending events exist. Modal shows diff view (current vs proposed ordering) with per-action approve/reject + reason + confidence. Auto-applied small reorders surface as toast "AI reordered 2 of your tasks based on your last submission."
  - Acceptance: light + dark; diff renders for 5 scenarios (reorder up, reorder down, swap, multi-action, no-op); accessibility AAA on the modal.
  - Dependencies: S20-T5
  - Risk: medium
- **S20-T7** [M, ~5h] **[FE]** Adaptation history timeline `/path/adaptations` — chronological list of events with expand-to-see-diff drilldown. Admin variant at `/admin/adaptations` includes user filter.
  - Acceptance: timeline renders 20+ events; drilldown loads <1s; admin variant adds user filter.
  - Dependencies: S20-T5
  - Risk: low
- **S20-T8** [M, ~5h] **[Coord+Team]** Task batch 3 — 9 more tasks (41 → 50, target met).
  - Acceptance: 50 total tasks; ≥12 per track; reject rate <30%.
  - Dependencies: S19-T8 (sequential content lessons flow forward)
  - Risk: medium
- **S20-T9** [M, ~4h] **[Coord]** Sprint integration walkthrough — full adaptation cycle observed end-to-end on a dogfood account (submit task → score swing detected → adaptation triggered → notification → modal → approve → path updates → event in admin log).
  - Acceptance: walkthrough green; `docs/demos/sprint-20-walkthrough.md` complete.
  - Dependencies: S20-T4 + S20-T6 + S20-T7
  - Risk: medium (R24 — UX confusion if first-impression fails)
- **S20-T10** [S, ~3h] **[Coord]** Sprint exit doc + commit.

### Sprint 20 exit criteria

- All 11 tasks completed.
- `PathAdaptationJob` live with all 4 triggers + cooldown + auto-apply policy.
- Proposal modal + adaptation history timeline live (learner + admin variants).
- ≥50 tasks in library (target met).
- 12 PathAdaptationJob integration tests + 9 adapt-path AI tests green.
- Sprint 20 walkthrough notes in `docs/demos/sprint-20-walkthrough.md`.

---

## Sprint 21 — F16 Closure: Mini + Full Reassessment + Graduation + Next Phase + Dogfood + Thesis Chapter Draft (2026-08-07 → 2026-08-20) *[NEW — added 2026-05-14]*

**Goal:** Land mini-reassessment (50% checkpoint) and full reassessment (100%). Land graduation page + Next Phase Path flow. Onboard ≥10 dogfood learners and collect Tier-2 metrics. Optional final content burst to reach 250 questions if capacity allows. Draft thesis chapter for F15+F16. Close M4.

**Locked answers from kickoff:**

1. **Mini-reassessment:** optional (banner with skip), draws 10 items NOT already answered in the original assessment, biases toward harder `b` if learner has progressed.
2. **Full reassessment:** mandatory before Next Phase; 30 items, same flow as initial assessment.
3. **Dogfood roster:** 7 team + 3 external volunteers (recruitment owner: Omar, locked at kickoff).
4. **Final content burst:** if S20 budget tight, stop at the 150-question minimum; thesis-defensible on actual count.

**Demo-able deliverable:** A dogfood learner reaches 100% → graduation page renders Before/After radar + AI journey summary → takes Full reassessment (30Q) → clicks "Generate Next Phase Path" → new path at +1 difficulty appears (no overlap with prior tasks). Demo script polished to ≤8 min; backup video recorded. ≥10 dogfood learners completed the full loop with data captured for Tier-2 metrics.

**Hard rules:**

- M4 sign-off requires: F15+F16 features all green AND ≥10 dogfood completions AND Tier-2 metrics recorded AND thesis chapter draft in place.
- Demo script timing strictly ≤ 8 minutes (with pinned `?seed=` for AI calls).
- Dogfood data preserved in `PathAdaptationEvents` + `Assessments` + `LearnerSkillProfiles` — no deletion.

**Estimated capacity used:** ~57h Omar-budget (+14% over 50h ceiling — flagged at kickoff; rescoping option: drop S21-T5 final content burst if S20+S21 cumulative pressure exceeds owner availability).

### Tasks (in execution order)

- **S21-T0** [S, ~2h] **[Coord]** Kickoff. Dogfood recruitment plan locked; 10 named accounts identified.
- **S21-T1** [M, ~4h] **[BE]** Backend endpoints `POST /api/assessments/me/mini-reassessment` + `POST /api/assessments/me/full-reassessment`. Variants of `POST /api/assessments` with `variant ∈ {mini, full}`. Mini draws 10 items not in the original assessment (cross-checked against `AssessmentResponses` for the user's prior assessments).
  - Acceptance: 4 integration tests — mini happy / mini repeat-prevention / full happy / authz cross-user.
  - Dependencies: S20 closed
  - Risk: medium
- **S21-T2** [M, ~5h] **[FE]** 50% checkpoint banner + mini-reassessment UI flow (reuses existing assessment component with `variant=mini`). Banner appears on `/path` when `ProgressPercent >= 50` and no mini-reassessment exists yet for this path.
  - Acceptance: banner shows + dismisses + records "skipped" decision; mini flow completes; result shown inline.
  - Dependencies: S21-T1
  - Risk: low
- **S21-T3** [L, ~7h] **[BE+FE]** Graduation page `/path/graduation`. Backend: `GET /learning-paths/me/graduation` assembles `{before, after, journeySummary, nextPhaseEligible}`. FE: Before/After skill radar (Recharts existing) + AI journey summary card + Full Reassessment CTA (mandatory) + Next Phase CTA (gated until reassessment complete).
  - Acceptance: backend integration test confirms shape; FE renders correctly + gates Next Phase CTA correctly; mobile responsive.
  - Dependencies: S21-T1 + S19-T3
  - Risk: medium
- **S21-T4** [M, ~5h] **[BE]** Next Phase flow. `POST /api/learning-paths/me/next-phase` enqueues `GenerateLearningPathJob` with `completedTaskIds = ALL tasks ever completed by user` + `difficultyBias=+1` (level up). Archives previous `LearningPath` (`IsActive=false`); new path gets `Version = previous.Version + 1`.
  - Acceptance: 5 integration tests — happy / requires-reassessment-first 409 / archives previous / increments Version / no overlap with completed tasks.
  - Dependencies: S21-T3 + S19-T4
  - Risk: medium
- **S21-T5** [L, ~8h] **[Coord+Team]** *(OPTIONAL — drop if S20+S21 owner load over capacity.)* Final content burst — up to 100 more questions to reach 250 target. If capacity tight, stop at 200. Team-wide review.
  - Acceptance: if executed, bank reaches 200–250; reject rate <30%. If skipped, S21-T11 docs explicitly call out the actual count (minimum 150 already met in S17).
  - Dependencies: S17-T8
  - Risk: medium (R25)
- **S21-T6** [M, ~5h] **[Coord]** Integration E2E walkthrough on dev stack — full loop: assessment → AI summary → AI path → 3 submissions → 2 adaptation events → 50% mini-checkpoint → continue → 100% → graduation → full reassessment → Next Phase Path. Timed end-to-end.
  - Acceptance: full loop runs in <12 min real-time (no manual debugging); demo-script-timing measured.
  - Dependencies: S21-T4
  - Risk: medium (R24)
- **S21-T7** [M, ~5h] **[Coord]** Demo script + backup recording. `docs/demos/sprint-21-walkthrough.md` with the 8-min script per `assessment-learning-path.md` §12. Pin `?seed=` for AI calls. Record backup video using OBS.
  - Acceptance: script + video locked; rehearsed once with co-supervisor (or Omar solo if scheduling tight).
  - Dependencies: S21-T6
  - Risk: medium
- **S21-T8** [M, ~5h] **[Coord]** Dogfood recruitment + onboarding. 7 team + 3 external volunteers. Onboarding doc `docs/demos/dogfood-onboarding.md`. Each user takes the full loop; metrics recorded per user.
  - Acceptance: ≥10 learners complete the full loop OR ≥5 complete + S21-T11 reports honest count and runs metrics on what we have.
  - Dependencies: S21-T6
  - Risk: high (recruitment slippage)
- **S21-T9** [L, ~8h] **[Coord]** Thesis chapter draft for F15+F16 — outline per `assessment-learning-path.md` §13. Includes: IRT primer + 2PL math, system architecture + sequence diagrams (adapted from this doc), hybrid retrieval-rerank for curriculum, continuous adaptation engine, implementation notes, empirical results (from S21-T8 dogfood), limitations + future work.
  - Acceptance: draft committed to `docs/thesis-chapters/f15-f16-adaptive-ai-learning.md` (new file); supervisor review scheduled.
  - Dependencies: S21-T8 (uses dogfood data)
  - Risk: medium
- **S21-T10** [S, ~3h] **[Coord]** **M4 declaration + sprint exit doc.** Update `docs/progress.md` declaring M4 reached (or honestly reporting deltas if M4 conditions not met). Commit via prepare-public-copy.ps1.
  - Acceptance: M4 status explicit in `progress.md`; public repo HEAD advances.
  - Dependencies: S21-T9
  - Risk: low

### Sprint 21 exit criteria

- All 10 tasks completed (S21-T5 may be partial/skipped — explicitly noted).
- Mini + Full reassessment live; graduation page + Next Phase Path flow working.
- ≥10 dogfood learners completed the full loop, OR explicit honest count + Tier-2 metrics adjusted accordingly.
- Tier-2 metrics recorded in `progress.md`: avg pre→post delta, approval rate, completion rate, empirically-calibrated question count.
- Thesis chapter draft committed.
- Demo script ≤ 8 min + backup video recorded.
- **M4 declared** in `progress.md` (or deferred with explicit gap analysis).
- All ADRs (049–054) referenced from progress.md sprint summaries.

---

## Post-Defense slot — Azure deployment + production hardening *[Deferred per ADR-038; not budgeted on a sprint timeline]*

**Goal:** Take the locally-stable post-defense codebase to a production Azure environment. Preserves the deployment plan from `architecture.md` §10.2; the only thing the deferral changed is *timing*, not *intent*.

**Trigger:** Owner-initiated post-defense (target window: late October 2026 onward, at the team's discretion). Treated as an open backlog rather than a fixed sprint.

**Scope (preserved from the original Sprint 10 task list, renumbered as PD-Tx):**

- **PD-T1** [L] **[DO]** Provision Azure resources via Bicep or portal: resource group, App Service B1, Azure SQL Basic, Azure Cache for Redis Basic C0, Azure Blob, Key Vault, **Qdrant on Azure Container Instances or Railway** (added per F12 — ADR-036)
  - Acceptance: All resources created; connection strings in Key Vault; cost estimate verified (~$40/mo all-in including Qdrant); Qdrant volume backed by persistent storage.
- **PD-T2** [M] **[DO]** Dockerize backend; push image to Azure Container Registry (ACR)
- **PD-T3** [L] **[BE/DO]** Configure App Service: env vars from Key Vault (incl. `QDRANT_URL`, `OPENAI_API_KEY`, `AI_REVIEW_MODE` — defaulting to `single` in prod), DB migration on startup guard, Hangfire credentials, Redis connection
- **PD-T4** [M] **[DO]** Deploy frontend to Vercel with env vars pointing at Azure backend URL; CORS configured server-side
- **PD-T5** [M] **[DO/AI]** Deploy AI service to Railway or Azure Container Instances; Qdrant reachable from AI service (private networking preferred)
- **PD-T6** [M] **[BE]** Internal service auth (shared secret header between backend and AI service)
- **PD-T7** [L] **[BE]** k6 load test against Azure: 100 concurrent users on B1 tier; document p95 latency; identify whether B1 is sufficient or need brief S1 upgrade for any peak demo (post-defense, optional)
- **PD-T8** [M] **[BE/DO]** Application Insights integration: 5 dashboards (request rate, p95 latency, error rate, submission pipeline duration, OpenAI token consumption)
- **PD-T9** [M] **[BE]** Fix Azure-tier bottlenecks (likely candidates: SQL indexes, cache keys, Qdrant query tuning, Hangfire pool config)
- **PD-T10** [M] **[DO]** Custom domain + TLS (optional)
- **PD-T11** [M] **[Coord]** Smoke-test every MVP feature on Azure (F1–F13); checklist in `docs/demos/M2-prod-verified.md`

**Exit criteria (when this slot is later activated):**
- All 13 MVP features demoable on Azure URLs.
- Load test report committed.
- Monitoring dashboards live.
- Supervisors / team have access to a stable URL for post-defense continuation.

---

## Post-MVP Roadmap (out of defense scope — "future work" in thesis)

Grouped for the post-graduation continuation, if the team chooses to keep the project alive:

### Near-term (post-graduation, 1-3 months)
- Enforce email verification; enhanced password-reset UX
- Multi-provider AI (Ollama fallback) — `IAiReviewClient` abstraction ready
- Split Worker into its own service
- Azure Service Bus replacement for Hangfire
- Fuller gamification: streaks, peer benchmarking, full badge catalog
- 2 more learning tracks (Frontend specialist, CS Fundamentals)

### Mid-term (3-9 months)
- Mobile app (React Native reusing UI components)
- SonarQube integration
- GDPR automation: data-export + cascade-delete
- Admin: content moderation queue, system health monitoring
- Community features: discussion threads per task

### Long-term (9+ months)
- Monetization: pricing tiers, Stripe integration
- Enterprise / institutional tier
- Multilingual UI (start with Arabic given university context)
- Repository-level AI reasoning (multi-file context), AI pair programming

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **R1** | AI review quality insufficient for defense | High | High | Sprint 6 dogfood + prompt iteration; fallback: ship static-analysis-only if AI fails at Sprint 10 | AI Lead |
| **R2** | OpenAI API cost overruns student budget | Medium | Medium | Hard token caps in AI service; monitor daily; fall back to a shorter prompt template | AI Lead |
| **R3** *(retired 2026-05-07 per ADR-038)* | ~~Azure deployment surprises burn Sprint 10~~ | — | — | Risk no longer applies pre-defense; Azure work moved to Post-Defense slot. The risk re-applies *if and when* the team activates the Post-Defense slot. | — |
| **R4** | GitHub repo fetching for private repos fails at scale | Medium | Medium | Fallback: prompt user to re-auth; document limits; start with public-repo demo | Backend |
| **R5** | Task/question content authoring lags (Sprints 2-3) | High | High | Split authoring across all 7 team members in Sprint 1; enforce deadline | PM (Omar) |
| **R6** | One backend dev becomes unavailable | Low | High | Pair-program critical modules; keep work-in-progress on feature branches; document decisions as ADRs | PM (Omar) |
| **R7** *(rescoped 2026-05-07 per ADR-038)* | Local-stack load test reveals Hangfire / Qdrant / SQL bottleneck on owner's laptop | Medium | Medium | S11-T8 budgets fix time after the load test run; fallback: profile the hot path and ship a config-only mitigation (e.g., Hangfire pool size, Qdrant query top-k tuning, SQL index hints) | Backend |
| **R8** | Thesis documentation update slips (Sprint 11) | High | Medium | Start doc sync during Sprint 7 once architecture stabilizes; don't leave all for Sprint 11 | All, coordinated by Omar |
| **R9** | Frontend design system (colors/typography) breaks during backend integration | Low | Medium | Pin Tailwind config + component library; FE leads review PRs that touch shared styles | Frontend |
| **R10** | PDF generation (Learning CV) looks poor | Medium | Medium | Buffer 1 extra day on S7-T5; fallback: use AI service's ReportLab instead of QuestPDF if layout fails | Backend |
| **R11** | F11 audit prompt quality insufficient (output unhelpful or hallucinated for project-level review) | Medium | High | Sprint 9 dogfood (S9-T12) on 3 sample projects (Python / JS / C#); quality gate ≥3.5/5; fallback: ship audit with static-only mode + "AI audit beta" banner if quality fails before defense | AI Lead |
| **R12** *(new 2026-05-07 — F12 / ADR-036)* | RAG retrieval quality on small or empty corpora — short submissions may yield only 1–2 chunks; query may match irrelevant chunks for very short user messages | Medium | Medium | Top-k clamped to available chunks; auto-fallback to "raw context mode" (sends submission feedback JSON instead) when `chunkCount < 3`; FE banner surfaces fallback transparently; S10-T10 dogfood validates both modes empirically | AI Lead |
| **R13** *(new 2026-05-07 — F13 / ADR-037)* | Multi-agent orchestration partial failure — one agent times out or returns malformed JSON, leaving null categories in the merged response | Medium | Medium | Per-agent 90 s timeout; orchestrator returns partial result with `partialAgents` flag; backend persists with `PromptVersion = multi-agent.v1.partial`; FE renders affected categories as "—" with explainer tooltip; S11-T2 acceptance includes synthetic-hang test | AI Lead |
| **R14** *(new 2026-05-07 — defense logistics / ADR-038)* | Defense-day local stack failure on owner's laptop (docker-compose crash, OpenAI outage, hardware fault) | Low | High | S11-T11 backup video stored locally + USB; S11-T14 backup laptop with pre-built docker images + cloned repo; offline-friendly demo path rehearsed (only OpenAI legitimately needs connectivity); supervisors briefed pre-defense that the demo is local-stack | DevOps + PM (Omar) |
| **R15** *(new 2026-05-11 — F14 / ADR-041)* | Recurring-weakness detection too noisy or too quiet — frequency thresholds wrong; flags single mistakes as patterns OR misses real patterns | Medium | Medium | Thresholds exposed in `LearnerSnapshotOptions` (3-of-5 / score<60 baseline); S12-T11 dogfood validates empirically; embedding-clustering migration path documented for post-MVP if v1 quality is insufficient | Backend (Omar) |
| **R16** *(new 2026-05-11 — F14 / ADR-044)* | F14 token-cost inflation breaks the $40/month demo cost target | Medium | Medium | Per-review input cap 12k tokens (ADR-044); Seq dashboard `LlmCostSeries` split by `ai-review-history-aware` series for runtime monitoring; fallback knobs documented (lower RAG `k`, trim profile, cache snapshot per user per hour); `AI_REVIEW_MODE=single` disables F14 in seconds if a cost spike lands pre-defense | Backend + AI (Omar) |
| **R17** *(new 2026-05-11 — F14 / S12-T11)* | F14 review quality on dogfood < 4/5 — historic profile distracts rather than improves the review | Medium | **High** | S12-T11 dogfood is the gate; iteration loop: tune snapshot composition (drop noisy fields), adjust prompt instructions inside `prompts.py` (already history-aware so iteration is bounded), or relax `RecurringThresholdCount`. If quality fails after 2 iterations, fall back to "profile-only no RAG" mode for v1 and defer RAG to post-MVP. Decision deadline: end of S12-T11 | AI + Backend (Omar) |
| **R18** *(new 2026-05-13 — Sprint 14 / ADR-046)* | SendGrid free-tier deliverability fails on demo day (rate limit, deliverability block, credentials revoked) | Medium | Medium | `IEmailProvider` abstraction; env-var flip to `EMAIL_PROVIDER=LoggedOnly` in <60s; `EmailDelivery` rows persisted regardless of provider so admin can show "would have been emailed" path; demo can show notification + admin email log without needing inbox | Backend (Omar) |
| **R19** *(new 2026-05-13 — Sprint 14 / ADR-046)* | 30-day Hangfire hard-delete job doesn't fire if owner's laptop powered off during the cooling-off window | Medium | Low | Acceptable for defense demo (show schedule + immediate auto-cancel, not the 30-day end-state); Hangfire SQL persistence survives short restarts; post-defense Azure slot (per ADR-038) restores 24/7 worker availability | Backend (Omar) |
| **R20** *(new 2026-05-14 — Sprint 15+ / ADR-049 / ADR-054)* | AI-generated question quality varies; per-batch admin reject rate >30% breaks the content-burst timeline + erodes IRT calibration story | Medium | High | S16-T2 pre-validates the prompt on 9 sample outputs before the first real batch; per-batch reject-rate metric (S16-T9) surfaced on admin dashboard; threshold >30% triggers prompt iteration before next batch; fallback path: continue manual authoring for the last ~50 of 250 if generator quality regresses; thesis chapter can defensibly report empirical reject rate as part of the F15 evaluation | AI + Backend (Omar) |
| **R21** *(new 2026-05-14 — Sprint 15+ / ADR-050)* | IRT calibration relies on AI self-rating because pre-defense dogfood produces too few responses for empirical recalibration to converge on most items | High | Medium | Thesis frames this honestly as "designed for empirical refinement, infrastructure in place"; target ≥30 items empirically calibrated by defense day (rest AI-self-rated); F15.4a admin override is the manual safety valve; `IRTCalibrationLog` provides full traceability; defense Q&A: prepare slide showing the converged subset's quality | AI + Backend (Omar) |
| **R22** *(new 2026-05-14 — Sprint 19+ / ADR-052)* | AI Path Generator hallucinates — recommends tasks with violated prerequisites, repeats completed tasks, or returns malformed JSON | Medium | High | Pydantic validation in AI service (`assessment-learning-path.md` §6.3); topological prerequisite check (`TaskPrerequisiteValidator`, S18-T8 + S19-T1); retry-with-self-correction max 2; on third failure, fall back to legacy template logic with `LearningPath.Source = TemplateFallback` and admin notification; S19-T9 walkthrough exercises both happy + fallback paths | Backend (Omar) |
| **R23** *(new 2026-05-14 — Sprint 16+ / ADR-052)* | Embedding cache staleness — Task or Question approved but in-memory cache in AI service not refreshed → path generation uses outdated corpus | Low | Medium | `EmbedEntityJob` always followed by call to AI service `/api/embeddings/reload`; cache version stamp checked on each `/api/generate-path` call (mismatch → reload + retry once); diagnostic `GET /api/embeddings/stats` exposes count + last-reload timestamp for ops verification | AI (Omar) |
| **R24** *(new 2026-05-14 — Sprint 20 / ADR-053)* | Continuous adaptation creates UX confusion — learners don't understand why their path changed, mistake adaptation for a bug, or distrust the system | Medium | Medium | Every change shown in proposal modal with AI's `reason` text + confidence (S20-T6); small auto-applied reorders surface via toast with the reason; `/path/adaptations` history timeline provides full audit trail (S20-T7); learner control is the default (only intra-skill reorders auto-apply per ADR-053); S20-T9 walkthrough specifically watches for first-impression UX issues; S21-T8 dogfood includes a feedback question on adaptation clarity | Frontend + UX |
| **R25** *(new 2026-05-14 — Sprint 16/17/21 / ADR-054)* | 250-question content burst slips — bank reaches only ~120–150 by S21 close, weakening the IRT calibration story + thesis "Empirical Results" section | High | Medium | **Tiered targets**: ≥150 minimum acceptable for defense (achieved in S17), 250 target (S21-T5 optional); team-wide review distributed across S16/S17/S21; S21-T5 marked optional + droppable if owner load exceeds capacity; thesis chapter honestly reports the actual count + analysis ("150 calibrated + 100 pipeline" defensible); content batches sequential so quality lessons (rejected drafts) flow forward to prompt iteration | All (Omar coordinates) |

---

## Assumptions

1. All 7 team members committed to the September 2026 defense timeline and available at stated capacities.
2. Azure for Students ($100 credit) remains available — preserved for post-defense Azure deployment per ADR-038, not consumed pre-defense.
3. OpenAI API access remains stable and affordable for the duration (no pricing changes beyond current); embedding endpoint (`text-embedding-3-small`) remains available for F12.
4. University defense schedule confirms late-September / early-October (window 2026-09-24 → 2026-10-04 per ADR-032 — shifted from mid-September to absorb F11 sprint); no earlier surprise date.
5. Academic supervisors are willing to review ADRs and updated thesis sections before defense; supervisors accept defense-day live demo from owner's laptop (per ADR-038).
6. The existing `code-mentor-frontend` and `code-mentor-ai` repos remain the source of truth for those services (no new rewrites).
7. The 5-categories model (correctness, readability, security, performance, design) is acceptable to supervisors as the AI-feedback axis for MVP. F13 multi-agent preserves this output shape (architecture agent owns 3 categories; security + performance agents own 1 each).
8. MVP feedback quality rated ≥4/5 by supervisors in dogfood (Sprint 6) is achievable with GPT-5.1-codex-mini — validated in Sprint 6 (M1 dogfood); R1 retired.
9. Owner's laptop hardware can run the full docker-compose stack (mssql, redis, azurite, ai-service, qdrant, backend, frontend) under demo + 50-user load test simultaneously without thermal throttling; verified via S11-T8 load test on real hardware before rehearsals.
10. *(new 2026-05-14 — F15/F16)* AI service token costs for F15+F16 combined stay within the $50/month soft budget through the dogfood phase. Per-learner cap $3/month enforced at the endpoint level (429 + admin alert). If costs spike, the first lever is per-batch generator throttling (reduce question batch sizes from 20 → 10) before code changes.
11. *(new 2026-05-14 — F15/F16)* ≥10 dogfood learners can be recruited and onboarded in S21-T8: 7 team members + 3 external volunteers (Omar's network). If recruitment falls short, Tier-2 metrics are reported on the actual count and thesis honestly discusses sample size.
12. *(new 2026-05-14 — F15/F16)* Sprints 15–21 run on Omar-as-primary-author basis (mirroring the Sprint 12–14 pattern). The 7-person team contributes via distributed content review (S16-T7/T8, S17-T8, S18-T7, S19-T8, S20-T8, S21-T5) — their effort is NOT counted in Omar's ~50h sprint budget; content review owners are assigned at each sprint kickoff.
13. *(new 2026-05-14 — F15/F16)* `text-embedding-3-small` remains available + priced as currently observed for F12 — adopted in F15/F16 with no new vendor commitment.

---

## Handoff

Once sprints are executing:
- Use `/project-executor` with "start sprint 1" to begin execution. The agent will pick up this file and execute tasks in order.
- Run `/ui-ux-refiner` after Sprint 8 (MVP complete) for a cohesive UX polish pass before deployment — frontend team coordination.
- Run `/release-engineer` at the start of Sprint 10 for production readiness (CI/CD, secrets, deployment, runbook).

This plan, `docs/PRD.md`, `docs/architecture.md`, and `docs/decisions.md` are a self-contained contract. Downstream skills and new team members can work from them without this conversation as context.
