# Architectural & Product Decisions (ADR Log)

This file captures the non-trivial product and technical decisions made during the product-architect planning phase for the **AI-Powered Learning & Code Review Platform** (Code Mentor). Each entry follows lightweight ADR format: Context, Decision, Alternatives, Consequences.

This log complements the academic project documentation (`project_details.md`, `project_docmentation.md`) and supersedes it where marked (the academic documents were written earlier; these ADRs reconcile them with implementation reality and the September 2026 deadline).

---

## ADR-001: Keep Vite + React frontend (not Next.js)

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs section 1.6 / 4.1 which state "React (Next.js)"

**Context:** The frontend team (Mahmoud Abdelmoaty, Ahmed Khaled) has already built ~60% of the UI on Vite + React 18 + TypeScript + Redux Toolkit + React Router v6 (repo: `code-mentor-frontend`). Migrating to Next.js would cost an estimated 2 sprints (~4 weeks) and deliver zero user-visible value for this use case.

**Decision:** Keep the existing Vite + React stack. Do not migrate to Next.js.

**Alternatives considered:**
- **Next.js migration** — rejected. Server-side rendering not needed (this is a logged-in SPA where the public surface is just a landing page and public Learning CV view — both handleable with client-side rendering + a lightweight prerender if needed for SEO on CV URLs). Cost would be 2 sprints lost against a 4.5-month deadline.
- **Keep Vite but prerender public CV pages** — accepted as a stretch-goal tweak within the current stack (use `vite-plugin-prerender` or build-time static generation for the `/cv/:slug` route only if SEO becomes relevant).

**Consequences:**
- Academic documentation needs updating: every "Next.js" reference → "Vite + React 18 + TypeScript + React Router v6."
- No file-based routing — must maintain `router.tsx` manually (already the case).
- Public Learning CV page relies on client-side routing; share URLs work but initial paint has a JS wait. Acceptable for MVP.
- Thesis can justify choice: "SPA architecture fits a logged-in, interactive platform where most usage is authenticated. SSR overhead is unnecessary for this user journey."

---

## ADR-002: Use Hangfire (SQL-backed) for background jobs, not Azure Service Bus

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs FR-SUB-10 / 2.2.2 T-02 which specify "Azure Service Bus + Hangfire."

**Context:** The submission-analysis pipeline is asynchronous: each submission triggers repository fetch → static analysis → AI analysis → feedback aggregation, which can take minutes. Original docs called for Azure Service Bus for durability + Hangfire for worker orchestration. This is enterprise-grade but operationally heavy for a student MVP.

**Decision:** Use **Hangfire backed by the same SQL Server instance** for job queue, retries, scheduling, and the dashboard. Azure Service Bus is out of MVP scope.

**Alternatives considered:**
- **Azure Service Bus + .NET Worker Service** — rejected for MVP. Requires separate Azure resource, connection strings, dead-letter queue handling, and a second deployment target. Adds ~3 days of setup without improving the 100-user Phase 1 story.
- **In-memory job queue (e.g., Channels)** — rejected. Jobs lost on process restart. Unsuitable for a multi-minute pipeline.
- **Hangfire + Redis** — rejected for MVP. Adds a storage dependency; SQL is already there.

**Consequences:**
- Simpler local dev (no extra Azure resource required). Works out of the box with `docker-compose up`.
- Hangfire dashboard (`/hangfire`) is a "free" demo asset for the defense — visually impressive, shows retry/failure stats.
- Job throughput ceiling is lower than Service Bus but fine for the 100-user target (well under any SQL Server contention threshold for these job sizes).
- **Post-MVP:** swap to Azure Service Bus by re-implementing `IJobQueue` if we ever need multi-region or >1k jobs/min. Keep job-enqueuing code abstract (`IJobQueue.Enqueue(SubmissionAnalysisJob)`) so the swap is a single adapter.

---

## ADR-003: OpenAI GPT-5.1-codex-mini as sole AI provider for MVP

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs section 1.6.2 / 3.3.1.4 which mention "LLaMA 3 / GPT-4 / Claude multi-provider."

**Context:** The AI service (repo: `code-mentor-ai`) already runs FastAPI + OpenAI GPT-5.1-codex-mini successfully. The academic docs promised multi-provider (LLaMA 3 local, Claude, GPT-4), but this has not been implemented and adds significant complexity (model evaluation, prompt-per-model tuning, cost accounting per provider, provider abstraction at the AI-service layer).

**Decision:** Ship MVP with **OpenAI GPT-5.1-codex-mini only**. Build the **backend-side** provider abstraction (`IAiReviewClient` interface calling the AI service's `POST /api/ai-review` endpoint) so that the AI service could later be extended without backend changes. Multi-provider fallback at the AI-service layer is post-MVP.

**Alternatives considered:**
- **Add Ollama (local LLaMA 3) as fallback** — rejected for MVP. Requires hosting infrastructure for the local model (GPU/memory-heavy) that Azure Student tier cannot afford. Stretch goal for post-MVP.
- **Multi-provider switching inside the AI service** — rejected for MVP. Adds 2+ sprints to the AI team's scope.

**Consequences:**
- Thesis narrative: "Multi-provider abstraction architected; single-provider implementation for MVP timeline; listed as immediate future work."
- Cost containment is critical — monitor OpenAI tokens per submission. Set hard caps (NFR-COST-02) in the AI service: max 8k input tokens, max 2k output tokens per review.
- Single-point-of-failure if OpenAI has an outage. Mitigation: backend marks AI review as "temporarily unavailable" and still shows static analysis results (graceful degradation per NFR-AVAIL-02).
- The `IAiReviewClient` abstraction in the backend costs only ~1 day and preserves the future-swap story.

---

## ADR-004: Static analysis tool set — use AI-service existing tools + add Roslyn

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs section 1.6.2 / 3.3.1.4 which list "ESLint, Prettier, SonarQube, Bandit, Roslyn."

**Context:** The AI service currently bundles: **ESLint** (JS/TS), **Bandit** (Python), **Cppcheck** (C/C++), **PHPStan** (PHP), **PMD** (Java). Missing from the docs: SonarQube, Roslyn (.NET/C#), and Prettier. In reality, Prettier is a formatter (not an analyzer — runs in the frontend's local dev), and SonarQube requires a separate server process with heavy memory requirements.

**Decision:**
- **Keep:** ESLint, Bandit, Cppcheck, PHPStan, PMD (already in AI service Docker image).
- **Add:** **Roslyn analyzers** for C# review — added as an AI-service enhancement (~1 sprint in AI team).
- **Drop:** SonarQube (replaced by per-language tools above — covers same concerns without the infrastructure tax).
- **Remove from "analyzer" list:** Prettier (it's a formatter; keep in frontend devDependencies as a code-quality tool for the team, not a platform feature).

**Alternatives considered:**
- **Include SonarQube** — rejected for MVP. Requires a long-running JVM server, ~2GB RAM minimum, complex integration. Tools we already have cover 80%+ of what SonarQube would provide.
- **Drop Roslyn** — rejected. The platform claims to support .NET learners. Without C# static analysis, that story breaks. Roslyn analyzers are cheap to add (NuGet packages; run in-process).

**Consequences:**
- Supports 6 languages for static analysis: Python, JS/TS, C/C++, C#, Java, PHP (broader than docs originally promised — thesis strengthens).
- Thesis section on static analysis must be rewritten to match actual tool list.
- The Tasks table's `ExpectedLanguage` field gates which analyzers run per submission — wire this mapping into the backend's `SubmissionAnalysisJob`.

---

## ADR-005: Local-first development, Azure deployment as single late-stage step

**Date:** 2026-04-20
**Status:** Accepted

**Context:** The team has Azure for Students ($100 credit) and GitHub Student Developer Pack, but wants to focus on building a fully working local system first and only upload to Azure once stable. This avoids burning credits on WIP deployments and simplifies the daily dev loop.

**Decision:**
- **Dev environment:** `docker-compose up` brings up **SQL Server 2022 (linux container), Redis, AI service, Azurite (Azure Blob emulator)**. Backend runs via `dotnet run`; frontend via `npm run dev`.
- **Staging/Prod deployment:** deferred to a dedicated sprint near the end (see implementation plan). Target stack:
  - Frontend: Vercel (free tier)
  - Backend API: Azure App Service B1 (~$13/mo, covered by student credit)
  - Background worker: same App Service instance (Hangfire hosted in-process for MVP; split later if needed)
  - Database: Azure SQL Database Basic (~$5/mo)
  - Cache: Azure Cache for Redis Basic C0 (~$16/mo)
  - Blob storage: Azure Blob (pennies at this scale)
  - AI service: Railway or Azure Container Instances (free tier)
  - Email: SendGrid free tier (100/day)
- **No staging environment in the MVP plan.** Rationale: 4.5-month deadline, 7 students, complexity cost not worth the benefit for a defense demo. "Staging" is replaced by a pre-merge integration branch on each dev's machine running the full docker-compose stack.

**Alternatives considered:**
- **Azure from day 1** — rejected. Burns credit on half-working builds. Slower dev loop.
- **3-env strategy (dev/staging/prod)** — rejected for MVP. Over-engineered for the team size and deadline; revisit via `release-engineer` skill if the project continues post-graduation.

**Consequences:**
- `docker-compose.yml` at the repo root is the canonical dev setup. Must be maintained as features are added (Azurite for Blob emulation is the main "learn-this-tool" item for the backend team).
- Environment variables driven by a single `.env` file pattern; each service reads its own subset. Document in `README.md`.
- The **deployment sprint** near the end is a hard-scoped chunk: dockerize backend, publish to Azure App Service, migrate DB via EF Core migrations on startup, configure environment variables, wire up custom domain (optional), smoke-test. Estimated S (1 sprint = ~60 hours across backend + DevOps).
- The **release-engineer** skill can be invoked later to handle CI/CD, secret rotation, monitoring setup — deferred.

---

## ADR-006: Scope cut — defer Phase 2 features, move Learning CV into MVP

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs section 1.8.1 which defines Phase 1 (months 1–6) and Phase 2 (months 7–12).

**Context:** Academic docs assume a 12-month build. Actual deadline is September 2026 (~4.5 months from 2026-04-20). Full Phase 1 + Phase 2 cannot ship in that window with the available team. The Learning CV is explicitly called out as the platform's "key innovation" in the thesis (Abstract, section 1.3.3) — missing it at defense would weaken the submission.

**Decision:** Define a reduced MVP scope for September 2026:

**MVP (10 features, must-have for defense):**
1. Auth (email/password + GitHub OAuth + JWT + basic password reset — no email verification polish)
2. Adaptive Assessment (30Q, IRT-ish difficulty selection)
3. Personalized Learning Path (template-based generation)
4. Task Library (~20 curated tasks across 3 tracks: Full Stack, Backend, Python)
5. Code Submission (GitHub URL + ZIP upload)
6. Static + AI Analysis Pipeline (backend orchestrates → AI service executes)
7. Feedback Report UI (scores, strengths, weaknesses, inline annotations)
8. Learner Dashboard (current path + last 5 submissions + skill snapshot)
9. Admin Panel — Task & Question Bank CRUD
10. **Learning CV** (view + PDF export + public shareable URL)

**Stretch (ship if MVP completes early, ~Sprint 7+):**
- Basic analytics dashboard (skill trend per domain, submission history chart)
- XP + Level system + 5 starter badges
- Task Recommendations (AI-driven, saved to learner path)
- Feedback quality ratings (user gives thumbs-up/down per category)

**Post-MVP (explicit "future work" in thesis):**
- Full gamification (streaks, peer benchmarking, full badge catalog)
- Email verification polish, password reset via tokenized email
- Admin advanced analytics, content moderation queue, system health monitoring
- Community/social features
- Mobile app
- Mock payment / pricing tiers
- Multi-provider AI (Ollama/Claude fallback)
- Azure Service Bus migration
- SonarQube integration

**Alternatives considered:**
- **Ship full Phase 1 as defined in academic docs** — rejected. Not achievable in 4.5 months with this team composition.
- **Keep Learning CV in stretch** — rejected. It's the thesis's headline differentiator; failure to ship would weaken the defense.

**Consequences:**
- Thesis Chapter 1.8 (Rollout Strategy) needs rewriting to reflect actual shipped scope.
- Stretch features (analytics, gamification) are "nice to have" — if they ship, the defense demo is stronger; if not, the MVP alone is defensible.
- All post-MVP items must be explicitly written up in a "Future Work" section of the thesis, so the scope cut is framed as deliberate and informed, not as incomplete work.

---

## ADR-007: 3 learning tracks for MVP (not 5)

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** Academic docs section 1.6.1 which lists 5 tracks (Full Stack, Backend, Frontend, Python, CS Fundamentals).

**Context:** Each learning track needs ~6–8 curated tasks with acceptance criteria, expected language, difficulty progression, and descriptions — plus questions in the assessment bank covering each track's skill domains. With a ~20-task MVP target and the 4.5-month deadline, covering 5 tracks is thin (only 4 tasks each).

**Decision:** MVP ships **3 tracks**: **Full Stack**, **Backend**, and **Python Developer**. The other 2 (Frontend specialist, CS Fundamentals) are post-MVP.

**Alternatives considered:**
- **All 5 tracks with 4 tasks each** — rejected. Not enough depth per track; user experience feels hollow. Better to go deep on fewer tracks.
- **2 tracks only (Full Stack + Backend)** — rejected. Python is the team's AI service language, so leveraging that track for testing/dogfooding makes sense.

**Consequences:**
- `Tasks` table seeded with ~7 tasks per track × 3 tracks = ~21 tasks.
- Assessment question bank needs ~50–60 questions covering domains of those 3 tracks (not 100+ as implied for 5 tracks).
- Track-template logic in `LearningPathService` only needs 3 entries, not 5.
- Post-MVP, adding tracks = content work (CRUD), not code work. Explicit in thesis.

---

## ADR-008: Clean Architecture layout for the .NET backend

**Date:** 2026-04-20
**Status:** Accepted
**Matches:** Academic docs NFR-MAIN-01

**Context:** The backend is greenfield. The team needs a layout that handles ~40 functional requirements, supports testing, and looks professional in the thesis.

**Decision:** Adopt **Clean Architecture** with 4 .NET projects in one solution:

```
CodeMentor.sln
├── src/
│   ├── CodeMentor.Domain/           ← entities, value objects, enums, domain interfaces
│   ├── CodeMentor.Application/      ← use cases (MediatR handlers), DTOs, validators (FluentValidation), interfaces for infra
│   ├── CodeMentor.Infrastructure/   ← EF Core DbContext, repositories, external clients (GitHub, OpenAI-via-AI-service, SendGrid, Blob), Hangfire jobs
│   └── CodeMentor.Api/              ← ASP.NET Core controllers, middleware, DI composition root, Program.cs, Swagger
└── tests/
    ├── CodeMentor.Domain.Tests/
    ├── CodeMentor.Application.Tests/
    └── CodeMentor.Api.IntegrationTests/
```

**Dependency direction:** Api → Infrastructure → Application → Domain. Domain depends on nothing.

**Alternatives considered:**
- **Vertical Slice Architecture (feature folders)** — rejected. Clean Architecture is more common in academic .NET examples and is what the thesis reviewers will expect. VSA would require explaining the choice.
- **Monolithic N-tier** — rejected. Less testable; less professional story.

**Consequences:**
- Small up-front overhead (4 projects, more ceremony per feature).
- Testable by design — Application layer has no infra dependencies, so handlers can be unit-tested with in-memory fakes.
- Thesis Chapter 4 (System Design) can cleanly map features to layers.
- **Infrastructure includes:** EF Core 8, Hangfire, Serilog, StackExchange.Redis, Azure.Storage.Blobs (works with Azurite locally), Octokit (GitHub API), Refit (typed HTTP client to AI service), SendGrid SDK.

---

## ADR-009: Target .NET 10 (not .NET 8)

**Date:** 2026-04-20
**Status:** Accepted
**Supersedes:** ADR-008 references to ".NET 8"; PRD §6 and architecture.md references to "ASP.NET Core 8 / EF Core 8"

**Context:** During Sprint 1 kickoff, environment check revealed that the backend dev machine has **.NET 10.0.103 SDK only** — no .NET 8 SDK installed. Academic docs, PRD, and architecture all specified ".NET 8 / EF Core 8." A decision was required before S1-T1 (initialize solution).

**Decision:** Target **.NET 10** across the backend (ASP.NET Core 10, EF Core 10). All library references (Hangfire, MediatR, FluentValidation, Serilog, Octokit, Refit, Azure.Storage.Blobs, StackExchange.Redis, SendGrid) are compatible with .NET 10.

**Alternatives considered:**
- **Install .NET 8 SDK, stay on the plan** — rejected. .NET 10 is the current LTS (Nov 2025 release); downgrading is backward motion with no benefit. Academic thesis looks stronger citing current LTS.
- **Use `global.json` to pin to .NET 8** — rejected for the same reason plus it adds install friction.

**Consequences:**
- All code targets `net10.0` in `.csproj` files.
- Any academic documentation references to ".NET 8" need to be updated (tracked as Sprint 10 doc sync task S10-T1).
- Libraries pinned to latest stable versions compatible with .NET 10 (EF Core 10, Hangfire latest, etc.).
- Thesis Chapter 4.2 tech stack table updates: ".NET 8" → ".NET 10."
- No functional changes to the plan — all features work the same on .NET 10.

---

## ADR-010: Identity-derived entities live in Infrastructure, not Domain

**Date:** 2026-04-20
**Status:** Accepted
**Refines:** ADR-008 (Clean Architecture layout)

**Context:** During S1-T3 implementation, needed to place `ApplicationUser : IdentityUser<Guid>`, `ApplicationRole : IdentityRole<Guid>`, and `RefreshToken` entities. ADR-008 said "Domain: entities." But these entities inherit from `Microsoft.AspNetCore.Identity` types, which would force the Domain project to reference that package — violating Domain's "no framework coupling" intent.

**Decision:** Identity-coupled entities live in **Infrastructure** (folder: `src/CodeMentor.Infrastructure/Identity/`). Domain stays framework-free for when we add non-Identity domain entities (Submission, Task, LearningPath, etc. in later sprints).

**Alternatives considered:**
- **Add `Microsoft.AspNetCore.Identity` to Domain** — rejected. Violates ADR-008's spirit.
- **Define plain `User` in Domain + adapter/mapper to `ApplicationUser` in Infrastructure** — rejected for MVP. Extra code for no immediate value. Acceptable for large codebases; unnecessary here.

**Consequences:**
- `ApplicationUser`, `ApplicationRole`, `RefreshToken` in `Infrastructure/Identity/`.
- `ApplicationDbContext` in `Infrastructure/Persistence/` references them directly.
- Domain layer remains empty for Sprint 1 — will be populated in Sprint 3 (`Assessment`, `Task`, etc.) and Sprint 4 (`Submission`, etc.).
- This matches the pattern in Jason Taylor's Clean Architecture .NET template (widely used reference).
- Thesis Chapter 4.2 tech-stack diagram should clarify Identity lives in Infrastructure.

---

## ADR-011: Defer GitHub OAuth (S1-T7) and rate limiting (S1-T8) to Sprint 2

**Date:** 2026-04-21
**Status:** Accepted
**Moves:** S1-T7, S1-T8 → Sprint 2 backlog

**Context:** Sprint 1 delivered the M0 milestone (register/login/protected route) with email-password auth. GitHub OAuth and Redis sliding-window rate limiting remained. Time constraints in the Sprint 1 session pushed these into Sprint 2; both are low-risk, isolated tasks that don't block any Sprint 2 work.

**Decision:** Move **S1-T7 (GitHub OAuth)** and **S1-T8 (rate limiting)** into Sprint 2 as **S2-T0a** and **S2-T0b** — to be knocked out at the start of Sprint 2 before assessment work begins. M0 milestone is still achieved; Sprint 1 closes with 13 of 15 planned tasks done + both deferred tasks tracked.

**Alternatives considered:**
- **Extend Sprint 1 until done** — rejected. Timebox discipline; M0 is already reachable.
- **Defer to Sprint 3 or later** — rejected. OAuth login is advertised in the demo script + rate limiting is NFR-SEC-06 / FR-AUTH-02 (both High priority). Push to Sprint 2, not further.

**Consequences:**
- `/docs/demos/M0-demo.md` notes GitHub button shows "coming soon" toast — OK for M0.
- `/api/auth/login` currently has no rate limit; brute-force is theoretically possible. Acceptable risk for a dev-only M0 milestone since there's no production exposure.
- Sprint 2's capacity budget was 90h backend; adding ~14.5h of S1-T7 + S1-T8 work brings it to ~104h — slightly over the 100h target. Mitigation: start OAuth on day 1 of Sprint 2 and drop the `IdempotencyKey` header task (S2-T12) if time is tight.

---

## ADR-012: In-process rate limiter for MVP; Redis-backed deferred

**Date:** 2026-04-21
**Status:** Accepted
**Refines:** S2-T0b (formerly S1-T8) wording that said "Redis sliding-window."

**Context:** The plan called for Redis-backed sliding-window rate limiting. ASP.NET Core 7+ ships `Microsoft.AspNetCore.RateLimiting` with in-process fixed/sliding window limiters. Redis-backed distributed limiters require either a third-party library (`AspNetCoreRateLimit.Redis`) or a custom middleware using `StackExchange.Redis`. For a single-instance dev + defense-demo target, in-process is sufficient.

**Decision:** Use the built-in in-process rate limiter for MVP. Two named policies: `auth-login` (fixed window, 5/15-min/IP) on `/api/auth/login`, `global` (sliding window, 100/min/user) defined but not yet applied to endpoints. `/health`, `/ready`, `/swagger` are exempt.

**Alternatives considered:**
- **`AspNetCoreRateLimit.Redis`** — rejected for MVP. Adds a transitive maintenance burden and requires a schema on the Redis side.
- **Custom Lua-script-based limiter on Redis** — rejected. Too bespoke for a 4.5-month graduation project; in-process is correct for single-instance prod.

**Consequences:**
- Works perfectly for single-instance Azure App Service B1 deploy.
- When (if) scaling horizontally, rate limits become per-instance and thus less strict — flagged as a post-graduation upgrade.
- Thesis should say "In-process rate limiting; horizontal scaling would require a distributed backing store" — one honest sentence beats over-engineering.

---

## ADR-013: Assessment answer endpoint returns no per-answer correctness

**Date:** 2026-04-21
**Status:** Accepted

**Context:** The existing frontend mock showed correct/wrong feedback immediately after each answer. Our real backend `POST /api/assessments/{id}/answers` returns only `{ completed, nextQuestion }`.

**Decision:** Do NOT leak correctness per answer. The server records correctness internally (used for scoring + adaptive difficulty) but does not return it. Results page shows per-category scores at the end.

**Alternatives considered:**
- **Return correctness + explanation in each answer response** — rejected. Undermines the adaptive flow (a user who sees the correct answer partway changes behavior). Also doesn't match FR-ASSESS spec ("scored result visualization" — at the end, not per question).

**Consequences:**
- Frontend question page is simpler: select → submit → next. No "feedback screen" between questions.
- Results page is where learners see detailed breakdown, matching PRD F2.
- Thesis: simpler UX story, cleaner separation between data collection (assessment) and feedback (results/CV).

---

## ADR-014: Two-parallel-path Clean Architecture (Identity in Infrastructure, Domain entities in Domain)

**Date:** 2026-04-21
**Status:** Accepted
**Refines:** ADR-010 (Identity entities in Infrastructure)

**Context:** Sprint 2 added `Question`, `Assessment`, `AssessmentResponse`, `SkillScore` — pure domain entities with no Identity/framework coupling. ADR-010 said Identity-coupled entities go in Infrastructure. What about non-Identity ones?

**Decision:** Non-Identity domain entities live in `Domain/Assessments/`, `Domain/Skills/` etc. Infrastructure references them for EF mapping but Domain depends on nothing. Identity-coupled entities (ApplicationUser, ApplicationRole, RefreshToken, OAuthToken) remain in `Infrastructure/Identity/` per ADR-010.

**Alternatives considered:**
- **Everything in Infrastructure** — rejected. Pure domain entities should not depend on EF or any framework.
- **Everything in Domain including Identity** — rejected (see ADR-010).

**Consequences:**
- Domain layer now has real content (assessment + skill entities) and will grow in Sprint 3 (Task, LearningPath, PathTask entities).
- Clear pattern for future: "does this entity derive from a framework type?" → Infrastructure; else → Domain.
- ApplicationDbContext remains the single DbContext that bridges both layers — still in Infrastructure.

---

## ADR-015: Pin Microsoft.Extensions and framework NuGet versions to 10.0.0 (from 10.*)

**Date:** 2026-04-21
**Status:** Accepted
**Refines:** ADR-009 (target .NET 10)

**Context:** Adding Hangfire 1.8.17 to `CodeMentor.Infrastructure` broke `dotnet restore` with NU1103: "Unable to find a stable package Microsoft.Extensions.Configuration with version (>= 10.0.7)". Root cause: floating `10.*` version specifiers combined with Hangfire's transitive dependency graph made NuGet try to resolve the latest 10.x patch, which hasn't shipped (only 10.0.0 stable exists + 11.0.0 previews).

**Decision:** Pin all direct `Microsoft.*`/`Microsoft.EntityFrameworkCore.*`/`Microsoft.AspNetCore.*` package references to explicit `10.0.0` (was `10.*`). Applied to `CodeMentor.Api.csproj`, `CodeMentor.Infrastructure.csproj`, and both test projects.

**Alternatives considered:**
- **Downgrade Hangfire** — rejected. The latest Hangfire (1.8.17) is the well-supported LTS; downgrading costs features without solving the root cause.
- **Leave `10.*` and add exact pins only on conflicting transitive deps** — rejected. Fragile; each new package could reintroduce the same error class.

**Consequences:**
- Single-line bumps when .NET 10.0.x ships a security patch (vs automatic via `10.*`), but safer and reproducible.
- Hangfire transitively pulls `System.Security.Cryptography.Xml` 9.0.0, which carries two moderate CVEs (`GHSA-37gx-xxp4-5rgx`, `GHSA-w3x6-4m5h-cxqf`). Accepted for MVP; flagged for Sprint 9 (release-engineer) to evaluate upgrading Hangfire or adding an explicit version override.

---

## ADR-016: Scheduler abstraction over Hangfire for learning-path generation

**Date:** 2026-04-21
**Status:** Accepted
**Builds on:** ADR-002 (Hangfire SQL-backed)

**Context:** `AssessmentService.CompleteAsFinishedAsync` needs to trigger `GenerateLearningPathJob` on completion. Calling `IBackgroundJobClient.Enqueue<T>()` directly works in production but couples the Application/Infrastructure code to Hangfire's static and instance APIs, and makes integration tests require Hangfire storage. The test harness uses EF InMemory (ADR-010 follow-up) — Hangfire SqlServerStorage cannot run against InMemory.

**Decision:** Introduce `ILearningPathScheduler` in `Application/LearningPaths/`. `HangfireLearningPathScheduler` (Infrastructure) is the prod impl. `InlineLearningPathScheduler` (in the test harness) runs the generation synchronously in a fresh DI scope so integration tests can observe the path immediately after assessment completion.

**Alternatives considered:**
- **Register a no-op `IBackgroundJobClient` stub in tests** — rejected. The tests want the job *to run*, not to be swallowed.
- **Use Hangfire's MemoryStorage in tests** — rejected. Adds a Hangfire server lifecycle to test setup + timing races.
- **Call `BackgroundJob.Enqueue` static API directly from AssessmentService** — rejected. Requires global `JobStorage.Current`; harder to mock; breaks when Hangfire isn't registered.

**Consequences:**
- `AssessmentService` depends only on `ILearningPathScheduler` — cleanly mockable.
- Tests prove generation behavior without Hangfire in the loop.
- One extra file (`HangfireLearningPathScheduler.cs`) in prod; cost is minimal.
- Enables future-swapping (Azure Service Bus, per ADR-002) with only the scheduler adapter changing.

---

## ADR-017: LearningPath selection — weakest-category-first, level-scaled length

**Date:** 2026-04-21
**Status:** Accepted

**Context:** PRD F3 requires auto-generated paths that put weakest-category tasks first and scale length to the learner's level. The spec was intentionally loose on the exact algorithm.

**Decision:** `LearningPathService.SelectTasks` applies the following deterministic ordering:
1. **Primary sort:** ascending `SkillScore.Score` per task category (missing category → neutral 50). Lowest score = highest priority.
2. **Secondary sort:** ascending `|task.Difficulty − idealDifficulty|` where ideal is `{Beginner: 2, Intermediate: 3, Advanced: 4}`.
3. **Tertiary sort:** ascending `Difficulty` (ramp up within a category).
4. **Tie-break:** alphabetical title (for test determinism).

Path length scales: Beginner = 5, Intermediate = 6, Advanced = 7. Each track has exactly 7 seeded tasks (ADR-007), so Advanced learners get the full library.

**Alternatives considered:**
- **IRT-style parameter estimation** — rejected for MVP (flagged in architecture.md §11.1). Adds weeks of calibration work for marginal gain over this heuristic.
- **Random selection within weakness bucket** — rejected. Demo non-determinism is a bug, not a feature. The algorithm must be reproducible for the defense.

**Consequences:**
- Deterministic and cheap: O(n log n) over ~7 tasks per invocation.
- Thesis can describe: "weakness-first, level-tuned difficulty, deterministic" — three clean words.
- Easy to replace post-MVP with real IRT once a dataset exists.
- Covered by `LearningPathSelectionTests` (4 tests).

---

## ADR-018: Task-library distributed cache — version-counter invalidation

**Date:** 2026-04-21
**Status:** Accepted

**Context:** S3-T9 requires Redis-backed caching on `GET /tasks` with 5-minute TTL and explicit bust on admin CRUD (S3-T12 / future S7-T12). Common approaches:
- `SCAN` + delete all `tasks:list:*` keys on invalidation — requires multi-round-trip scan; Redis SCAN has operational caveats at scale.
- Tag-based invalidation — needs a tag store; StackExchangeRedisCache doesn't expose tags.
- Version counter: keys are prefixed with a version number; bumping the counter orphans all old keys (they expire via TTL).

**Decision:** Version-counter approach. `tasks:version` holds a monotonic counter; list keys are `tasks:list:v{N}:{sha1-of-signature}`. `InvalidateListCacheAsync()` atomically increments `v`; readers then compute a fresh cache key on their next request.

**Alternatives considered:**
- **`SCAN`-based deletion** — rejected. Operational complexity + multi-round-trip cost on a hot path.
- **No explicit invalidation, rely on 5-min TTL** — rejected. Acceptance criterion explicitly requires immediate bust.

**Consequences:**
- Orphaned keys accumulate until TTL expiry; low-cost cost for MVP traffic shape.
- Invalidation is O(1) — single `SET` on the counter key.
- Cache hits can be verified via the `tasks:version` key (see `TaskCacheTests`).
- Works identically against real Redis (prod) and `MemoryDistributedCache` (tests) — the test harness swaps the implementation without changing the decorator.

---

## ADR-019: Frontend markdown renderer — safe-subset, zero external deps

**Date:** 2026-04-21
**Status:** Accepted

**Context:** Task descriptions are authored in markdown (S3-T2, option (a) defense-quality content). The frontend task-detail page needs to render them. NFR-SEC-XSS (PRD §8.2) requires "sanitized markdown (DOMPurify + rehype-sanitize)." I wrote the renderer first with `marked` + `dompurify` as deps, then realized those packages aren't installed and our seed markdown is narrow (H1/H2, paragraphs, bullet lists, `code`, **bold**).

**Decision:** Ship a 30-line inline renderer in `TaskDetailPage.tsx` that handles exactly the markdown subset our seed uses. Safe by construction: it never calls `dangerouslySetInnerHTML`; all user text flows through React's default JSX escaping.

**Alternatives considered:**
- **Install `marked` + `dompurify`** — rejected for MVP. Our seed content is fully controlled; a full parser is overkill, and both packages add ~40KB gzipped.
- **Render markdown as preformatted text** — rejected. Task descriptions look bad without structure; defeats the point of option (a) authoring.

**Consequences:**
- Zero new deps, zero XSS risk (no raw HTML).
- If future authors use unsupported markdown features (tables, nested lists, images, footnotes), those render as plain text. Documented inline.
- Swap to a full renderer + sanitizer when user-submitted markdown enters the product (Sprint 6 AI-review annotations or Sprint 9 admin content), not before.

---

## ADR-020: Path-update side effects on `POST /submissions` — structured, transactional, permissive

**Date:** 2026-04-21
**Status:** Accepted

**Context:** Plan S4-T4 said `POST /submissions` "validates task exists + user owns path." Literal reading: require task to be a `PathTask` in the user's active path; reject otherwise. That's too strict for a learner who wants to practice an extra task outside their assigned path — the task-library is supposed to be browsable (F4) and submittable (F5). But silently mutating path state (e.g. reopening a Completed task, overwriting a StartedAt) is also wrong.

**Decision:** `POST /submissions` accepts any task with `IsActive=true`. Task-in-path is NOT required. Path side effects are conditional and one-way:

1. Task exists + active → allow submission. Else 404.
2. If the task is in the user's active path:
   - `PathTask.Status == NotStarted` → transition to `InProgress`, set `StartedAt = UtcNow`.
   - `PathTask.Status == InProgress` → no change (first-start timestamp preserved).
   - `PathTask.Status == Completed` → no change (re-submit allowed, doesn't reopen).
3. If the task is NOT in the user's active path → Submission is recorded, but no `PathTask` row is touched.
4. All state writes (Submission insert + AttemptNumber increment + optional PathTask transition) happen in one EF `SaveChangesAsync` transaction — never a half state.
5. `AttemptNumber = count_of(UserId+TaskId submissions) + 1`, computed inside the transaction.
6. Rate limit: 10 submissions per hour per user via the `submissions-create` policy (architecture.md §7.2).

**Alternatives considered:**
- **Strict "must be in path" gating** — rejected. Blocks legitimate practice outside the user's curriculum and contradicts F4 (task-library browseable). Also ugly for the demo: users who browse the library and hit "submit" would just 400/404.
- **Auto-add missing tasks to path** — rejected. Paths are per-assessment-generated artifacts (ADR-017); letting submissions arbitrarily inflate them undermines the curriculum story.
- **Don't transition PathTask status on submit; require explicit `/learning-paths/me/tasks/{id}/start`** — rejected. The user action "I'm submitting to this task" is a stronger signal of intent than clicking "start". Automating the transition is friendlier and the explicit start endpoint (S3-T6) still exists as a pre-declare alternative.

**Consequences:**
- Product: learners can practice any active task. Path tracking Just Works when they do follow the path.
- Test coverage: 10 integration tests in `SubmissionCreateTests` specifically verify the transactional + rule-by-rule behavior.
- Thesis narrative: the submission endpoint is described as "permissive at the task layer, strict at the path layer, transactional throughout."
- This rule set is self-contained — no cross-ADR drift to manage.

---

## ADR-021: Scheduler abstraction over Hangfire for submission analysis

**Date:** 2026-04-21
**Status:** Accepted
**Builds on:** ADR-002 (Hangfire SQL-backed), ADR-016 (same pattern for learning-path generation)

**Context:** `POST /api/submissions` needs to enqueue `SubmissionAnalysisJob` after creating the DB row. Direct `IBackgroundJobClient.Enqueue` from `SubmissionService` would couple it to Hangfire, and integration tests (which use EF InMemory — Hangfire SqlServerStorage cannot run against it) would need Hangfire MemoryStorage plus a live Hangfire server in-process, adding lifecycle + timing complexity.

**Decision:** `ISubmissionAnalysisScheduler` in `Application/Submissions/`. `HangfireSubmissionAnalysisScheduler` (Infrastructure) is prod. `InlineSubmissionAnalysisScheduler` (test harness) runs the job synchronously in a fresh DI scope so integration tests observe status transitions immediately after the HTTP response.

**Alternatives considered:** Same shape as ADR-016 (Hangfire MemoryStorage rejected for the same reasons; direct Hangfire coupling rejected for testability).

**Consequences:**
- Same pattern as ADR-016 → low cognitive cost.
- Tests assert Pending → Processing → Completed inside a single xUnit method because the inline scheduler resolves synchronously.
- Job body remains S4-T6 scope; this ADR only covers the enqueue abstraction.

---

## ADR-022: AI service endpoint renamed `/api/review` → `/api/ai-review` to match architecture

**Date:** 2026-04-21
**Status:** Accepted
**Aligns:** architecture.md §6.10 (which specifies `POST /api/ai-review`)

**Context:** Architecture §6.10 documents `POST /api/ai-review` as the internal AI-review endpoint. The actual AI service shipped with `POST /api/review`. No other consumer exists — the backend Refit client wasn't written yet (S5-T1), so this is a free rename moment.

**Decision:** Rename the FastAPI route in `app/api/routes/analysis.py` from `/api/review` → `/api/ai-review`. Backend's `IAiReviewClient` (S5-T1) points at `/api/ai-review`. Architecture contract wins.

**Alternatives considered:**
- **Change architecture.md to match reality (`/api/review`)** — rejected. Architecture is the contract; implementations align with it. Also, `ai-review` is more descriptive since the service has both static and AI review paths.
- **Keep both paths (alias)** — rejected. Pointless dual surface; nothing is calling the old name yet.

**Consequences:**
- Matches `architecture.md §6.10` exactly — one less doc drift item.
- Covered by `test_ai_review_endpoint_is_aliased_to_api_ai_review` in the AI service suite (asserts `/api/ai-review` is present and `/api/review` is gone).
- Backend Refit interface simply points at `/api/ai-review` — no backward-compat wrapper.

---

## ADR-023: Fix latent `AnalyzerResult` TypeError by defaulting `execution_time_ms` to 0

**Date:** 2026-04-21
**Status:** Accepted

**Context:** `AnalyzerResult.__init__` required `execution_time_ms` as a positional-or-keyword parameter. Four analyzers (`csharp`, `cpp`, `java`, `php`) constructed results via `AnalyzerResult(tool_name=..., issues=...)` — omitting the required arg. This went undetected because the Docker image lacked the underlying CLI tools (`dotnet`/`cppcheck`/`pmd`/`phpstan`), so those analyzers hit `FileNotFoundError` inside the `try`/`except` and never actually reached the `AnalyzerResult(...)` call. S5-T6 would install all four binaries → the next submission would `TypeError`.

**Decision:** Give `AnalyzerResult.execution_time_ms` a default of `0`. Add explicit `start_time = time.time()` + `execution_time_ms=int((time.time() - start_time) * 1000)` measurements to the four affected analyzers so timings are real, not zero, in practice.

**Alternatives considered:**
- **Make `execution_time_ms` required and audit all call sites** — what I ultimately did for actual timing, but the default-to-0 provides a safety net for any future analyzer author who forgets it. Defensive, cheap, correct.

**Consequences:**
- Closes a silent bug that S5-T6 would have surfaced on first C#/C++/Java/PHP submission.
- `execution_time_ms=0` is a tell-tale for a future analyzer that didn't instrument itself — reviewable in logs.

---

## ADR-024: Per-tool partitioned response shape for AI service `/api/analyze-zip`

**Date:** 2026-04-21
**Status:** Accepted

**Context:** Architecture §5.1 says `StaticAnalysisResults` stores "one row per tool per submission" with columns `Tool`, `IssuesJson`, `MetricsJson`. The AI service originally returned static analysis as one merged `issues[]` list plus a flat `toolsUsed: string[]`. Backend would need heuristic partitioning (e.g., by `issue.rule` prefix) to split into per-tool rows — fragile.

**Decision:** AI service response gains a `perTool: PerToolResult[]` field alongside the existing merged `issues[]` (for UI back-compat). Each `PerToolResult` carries `{ tool, issues, summary, executionTimeMs }`. Tool names normalized server-side (e.g. `roslynator`→`roslyn`, `cpp`→`cppcheck`) via `_normalize_tool_name` so the shape is stable.

**Alternatives considered:**
- **Partition in backend by issue.rule heuristics** — rejected. Brittle; rules can overlap (e.g., ESLint `no-eval` vs Bandit `assert_used`).
- **Add separate `/api/analyze-zip-per-tool` endpoint** — rejected. Dual endpoints to maintain for no gain.

**Consequences:**
- Backend persistence becomes trivial: iterate `response.StaticAnalysis.PerTool`, one DB row per entry.
- `StaticAnalysisResult.IssuesJson` + `MetricsJson` stored as camelCase (matches AI service convention) for consistency with any downstream re-pipe to frontend.
- Backward-compat `issues[]` retained so existing UI consumers keep working.
- Covered by `test_per_tool_output.py` (3 tests).

---

## ADR-025: AI-unavailable auto-retry uses separate counter from user AttemptNumber

**Date:** 2026-04-21
**Status:** Accepted

**Context:** Sprint 5 graceful-degradation (S5-T5) needs to auto-retry the analysis pipeline once, 15 min later, when the AI portion fails. Initial design bumped `Submission.AttemptNumber` on each auto-retry. That broke Sprint 4's `Retry_OnFailed_Returns202_AndRuns_Job_Again` integration test (manual retry bumped AttemptNumber to 2; the inline job's degradation path bumped again to 3). Root cause: `AttemptNumber` is the learner-facing count ("you've submitted this task N times"), which should not be conflated with internal retry bookkeeping.

**Decision:** Added `Submission.AiAutoRetryCount` (separate int, defaults to 0) to track auto-retries triggered by the degradation path. `AttemptNumber` increments only on user-initiated resubmit / `POST /submissions/{id}/retry`. Auto-retry cap (`MaxAutoRetryAttempts = 2` = one auto-retry per submission) is enforced against `AiAutoRetryCount`. New migration `AddAiAutoRetryCount`.

**Alternatives considered:**
- **Reuse `AttemptNumber` for both** — rejected. Breaks Sprint 4 semantics and confuses the UI ("why is AttemptNumber 3 when I've only submitted once?").
- **Mark a bool `HasAutoRetried`** — considered, but counter is marginally more useful for diagnostics ("why did this submission never converge?"). Minimal extra cost.

**Consequences:**
- Clean separation: `AttemptNumber` = user story; `AiAutoRetryCount` = internal plumbing.
- Migration adds one column — zero-risk additive change.
- Frontend can surface `AiAnalysisStatus` ("retrying in 15 min…") without touching `AttemptNumber` display.
- Covered by `SubmissionAnalysisJobTests.RunAsync_RetryCapReached_NoAdditionalRetryScheduled`.

---

## ADR-026: Auto-complete PathTask when AI overall score ≥ 70

**Date:** 2026-04-22
**Status:** Accepted
**Related:** ADR-020 (path-update side effects on submission create), PRD F3 ("Path ProgressPercent auto-updates on task completion")

**Context:** Sprint 6 wires the AI review through to `AIAnalysisResult.OverallScore`. PRD F3 states that `LearningPath.ProgressPercent` should auto-update on task completion, but no step in the prior plan actually marks a `PathTask` as `Completed`. Without a clear trigger, dashboard progress bars stay at 0 % forever — a defense-killer.

**Decision:** When `SubmissionAnalysisJob` finishes a submission with `AiAnalysisStatus=Available` AND the AI overall score is at or above the passing threshold (`SubmissionAnalysisJob.PassingScoreThreshold = 70`) AND the submission's `TaskId` matches a `PathTask` on the user's active learning path, the job marks that `PathTask` as `Completed` (with `CompletedAt = UtcNow`) and recomputes `LearningPath.ProgressPercent` via the existing `RecomputeProgress()` method. Off-path submissions are silent no-ops, and already-completed path tasks are not touched (so a higher-scoring resubmit doesn't overwrite the original `CompletedAt`).

**Alternatives considered:**
- **No threshold — any successful AI run auto-completes** — rejected. Allows trivially poor submissions to "complete" tasks; defeats the curriculum's signal value.
- **Higher threshold (e.g. 80)** — rejected. Too strict for early-stage learners; risks frustration. 70 is the documented "Intermediate" score band in the assessment scoring rules.
- **Manual completion button only** — rejected. Plan and PRD both signal automatic progression; manual buttons add friction.
- **Score-conditional + manual override** — deferred post-MVP. Added complexity for negligible defense value.

**Consequences:**
- Dashboard progress bar comes alive without any new endpoint or UI work in Sprint 6.
- The threshold (70) is a single named constant — easy to tune after dogfood feedback in S6-T13.
- Re-runs that lower the score (e.g. AI says it got worse on attempt 2) do not reopen a completed `PathTask` — the original completion stands. Documented as intentional in the test `RunAsync_AiScorePassing_PathTaskAlreadyCompleted_NoOp`.
- Covered by 6 tests in `AIAnalysisJobPersistenceTests` (passing, off-path, below-threshold, already-completed, etc.).
- Does **not** touch the assessment-driven `SkillScores` table — those remain a separate concept (per Sprint 6 kickoff confirmation with Omar).

---

## ADR-027: AI score-name rename + prompt versioning aligned with PRD F6

**Date:** 2026-04-22
**Status:** Accepted
**Supersedes:** Pre-S6 score names (`functionality`, `bestPractices`) used throughout the AI service prompt + DTOs.

**Context:** PRD F6 defines the 5 code-quality categories as **correctness, readability, security, performance, design**. The pre-S6 AI service prompt + Pydantic schemas + backend C# DTOs used a slightly different set: `functionality, readability, security, performance, bestPractices`. Two were misaligned (`functionality` vs `correctness`, `bestPractices` vs `design`). Sprint 6's FeedbackAggregator + frontend FeedbackPanel needed a single canonical surface to render `<RadarChart axis={...} />` and a single canonical persistence shape for `AIAnalysisResult.FeedbackJson`. Doc / code drift here would propagate into the thesis and the defense demo.

Separately, S6-T1 acceptance required "prompt versioned in repo" so that each `AIAnalysisResult` row could be traced back to the prompt template that produced it.

**Decision:**
1. Rename across the AI service: `functionality → correctness`, `bestPractices → design`. Touched files: `app/services/prompts.py` (both the legacy and enhanced prompts), `app/domain/schemas/responses.py` (`AIReviewScores`), `app/services/ai_reviewer.py` (parser + defaults), `app/api/routes/analysis.py` (the response builder), and `static/index.html`'s standalone demo viewer.
2. Add `PROMPT_VERSION = "v1.0.0"` constant to `prompts.py`. Surface it in `AIReviewResponse.promptVersion` and persist it on every `AIAnalysisResult` row.
3. Backend C# DTO `AiReviewScores` updated to mirror the new field names (`Correctness`, `Design`). `AiReviewResponse` gains a new required `PromptVersion` field. Test sites updated to pass `PromptVersion: "v1.0.0"` in the constructor.
4. Defensive remap (`_normalize_scores` in `ai_reviewer.py`) treats any leftover legacy keys (`functionality`, `bestPractices`, `best_practices`) the model occasionally emits as their canonical aliases — so a brief drift in the model's training distribution never breaks parsing.

**Alternatives considered:**
- **Keep AI service field names + translate at the backend boundary** — rejected. Pushes a doc-vs-code mismatch into every reader of the AI service; a translation layer is debt with no upside.
- **Hold off on PROMPT_VERSION until we have a v2 prompt** — rejected. The S6-T1 acceptance requires it now, and trace-back-to-prompt is a defensible-thesis property worth setting up cheaply.
- **Use semver-major (v1.0.0 → v2.0.0) only on shape changes; minor on content** — accepted as the implicit policy. v1.0.0 is the launch surface.

**Consequences:**
- Every AI feedback row in the DB now carries the prompt version that produced it. When the AI team iterates the prompt, they bump the constant and historical rows remain attributable.
- Defense demo + thesis can show a clean `correctness/readability/security/performance/design` radar that exactly matches the PRD without footnotes.
- Five live OpenAI calls in S6-T1's test suite passed against the renamed fields, proving the new prompt produces valid structured output for the 5 categories.
- The defensive `_normalize_scores` remap means a future prompt tweak that accidentally regresses to old names won't break the pipeline — it just logs the legacy key and maps to canonical.
- Academic docs (`project_details.md`, `project_docmentation.md`) still reference the old names in some examples — Sprint 10's S10-T1 doc-sync task already covers this, no immediate action.

---

## ADR-028: Submission AI scores feed `CodeQualityScore` (parallel to assessment-driven `SkillScore`)

**Date:** 2026-04-26
**Status:** Accepted
**Supersedes:** ADR-026's stance that submission analysis "does not touch the assessment-driven `SkillScores` table"

**Context:** S7-T1's plan acceptance reads "After submission, `SkillScores` rows updated for affected categories (running average)." Sprint 6 had explicitly carved out the opposite (ADR-026: submissions only touch `PathTask`, not `SkillScores`). Two further constraints surfaced when planning the implementation:

- The existing `SkillCategory` enum holds **assessment** categories: `DataStructures, Algorithms, OOP, Databases, Security`.
- The AI review per PRD F6 uses a different axis: `correctness, readability, security, performance, design`.

Only "Security" overlaps. Forcing AI scores into `SkillScores` either (a) overloads the existing enum with two semantically different axes, or (b) silently mis-categorises AI signals onto CS-domain buckets.

**Decision:** Reverse ADR-026's no-touch stance, but on a **separate, parallel skill-axis table**:

1. New domain entity `CodeQualityScore` (in `Domain/Skills/`) with `(UserId, Category, Score, SampleCount, UpdatedAt)`, unique `(UserId, Category)`, where `Category` is a new `CodeQualityCategory` enum mirroring PRD F6's 5 names (Correctness, Readability, Security, Performance, Design).
2. New `ICodeQualityScoreUpdater` (Application/Skills) → `CodeQualityScoreUpdater` (Infrastructure/Skills). Maintains an incremental running mean per category: `newAvg = (oldAvg × n + newScore) / (n + 1)`. AI input scores are clamped to `[0, 100]` before averaging.
3. `SubmissionAnalysisJob` calls `RecordAiReviewAsync` **only on first AIAnalysisResult write** for a submission — subsequent replacements (manual retry, AI auto-retry per S5-T5) do NOT re-contribute, so each submission carries weight = 1 sample.
4. Assessment-driven `SkillScore` (the existing table) is left intact. The Learning CV (S7-T2/T6) will surface both axes as distinct sections: "Knowledge profile" (assessment) and "Code-quality profile" (submissions).
5. Migration `AddCodeQualityScores` adds the new table; no changes to existing rows.

**Alternatives considered:**

- **Extend `SkillCategory` enum to 10 values (5 assessment + 5 code-quality), reuse `SkillScores` table** — rejected. Overloads "Category" with two axes; querying "all skills for user" would mix incompatible scales; the "Security" name collision is an immediate gotcha (one assessment Security row vs one AI Security row, distinguishable only by which writer last touched it).
- **Map AI categories onto assessment categories (e.g. AI `security` → assessment `Security`, AI `performance` → assessment `Algorithms`)** — rejected. Lossy and misleading; performance ≠ algorithms knowledge; the thesis can't defend this mapping.
- **Replace `SkillScores` semantics entirely — only AI feeds it** — rejected. Drops the assessment-driven signal that already powers the dashboard skill snapshot since Sprint 2; would require backwards-incompatible reseeds.
- **Re-derive code-quality running mean from `AIAnalysisResult.FeedbackJson` on every CV read** — rejected. Forces JSON parsing on every CV render and an N+1-style aggregation for what is otherwise a bounded 5-row read; an explicit table is simpler and matches the PRD's "skill scores" mental model.
- **Update `CodeQualityScore` on every AI persistence, including replacements** — rejected. Manual retries on the same submission would inflate `SampleCount`; the running mean would over-weight reliability artefacts. First-write-only keeps semantics clean.

**Consequences:**

- The Learning CV gains a richer skill story: knowledge axis (assessment) + craft axis (code-quality) — strong defensible-thesis property.
- One additional table, one additional migration, one new service. Cost is small (~120 LoC + 9 tests).
- `SubmissionAnalysisJob.PersistAiResultAsync` now returns `(row, wasFirstWrite)` so the calling code can gate the updater. Tests pass an `ICodeQualityScoreUpdater` (or the production impl bound to the in-memory DbContext) — same pattern as `IFeedbackAggregator` from Sprint 6.
- ADR-026's "does not touch `SkillScores`" remains accurate as written (we still do not touch the assessment-driven `SkillScore` rows). What changes is that we now ALSO maintain a separate code-quality table fed by submissions — captured in this ADR as the supersession, so future readers don't have to reconcile the two by hand.
- Frontend impact (S7-T6+ and S7-T8 dashboard polish) will need to render two skill panels, not one. Wired into the `GET /learning-cv/me` response in S7-T2.
- The assumption that "first AI result for a submission" is the contributing event holds as long as `AIAnalysisResult` has a unique `(SubmissionId)` index (it does — confirmed by `AIAnalysisResultEntityTests`). If we ever support multiple AI results per submission (e.g. provider A/B), this rule will need a refinement.

---

## ADR-029: XP level curve + 5-badge starter roster

**Date:** 2026-04-26
**Status:** Accepted
**Related:** S8-T3 (XP/level + badges + awarding hooks); ADR-006 (3 of 5 starter badge names predeclared)

**Context:** Sprint 8 plan (S8-T3) leaves two judgement calls to execution: (1) the level formula (plan only stipulates "level formula documented"), (2) the full 5-badge roster (ADR-006 names three starters: First Submission, First Perfect Category Score, First Learning CV Generated). The criterion used to settle both was "best for project + user + thesis defense."

**Decision:**

1. **Level formula:** `level = floor(sqrt(xp / 50)) + 1`. Concrete thresholds:
   | Level | XP entry |
   |---|---|
   | L1 | 0 |
   | L2 | 50 |
   | L3 | 200 |
   | L4 | 450 |
   | L5 | 800 |
   | L6 | 1250 |
   Soft curve: completing the assessment alone (100 XP) places the learner at L2 — early wins build motivation. Subsequent levels space out so XP volume doesn't trivialise progression. The formula is implemented in pure C# (`LevelFormula.LevelFor`) so it's testable without a DB and tweakable without a migration.

2. **5 starter badges (Domain.Gamification.BadgeKeys):**
   - **First Submission** ("First Steps") — first AI-completed submission. Awards inside `SubmissionAnalysisJob.AwardSubmissionXpAndBadgesAsync`.
   - **First Path Task Completed** ("Path Pioneer") — first time a `PathTask` auto-completes via the AI ≥70 threshold from ADR-026. Awards inside `TryAutoCompletePathTaskAsync`.
   - **First Perfect Category Score** ("Perfect Pitch") — any AI category score ≥90 on a single submission. Awards inside the same submission hook.
   - **High-Quality Submission** ("Quality Code") — AI overall score ≥80. Awards inside the same submission hook.
   - **First Learning CV Generated** ("On the Map") — first transition of `LearningCV.IsPublic = true` (when slug is generated). Awards inside `LearningCVService.UpdateMineAsync`.

**Alternatives considered:**

- **Linear level formula (1 level per 100 XP)** — rejected. Two submissions = 1 level forever; gets boring at scale. Square-root curve front-loads early wins where motivation matters most without making later levels meaningless.
- **Streak-based 5th badge ("5 submissions in 7 days")** — rejected for MVP. Streaks need multi-day session continuity; defense demo is a single-session walkthrough where the badge would never visibly trigger. "High-Quality Submission" gives an in-demo moment instead.
- **Award all 5 inside `FeedbackAggregator`** — rejected. Aggregator's job is feedback shape; mixing in side-effects on `UserBadge` makes its idempotency story (already non-trivial) harder. Awards live in `SubmissionAnalysisJob` (where the first-write gate already exists) for the submission set, and in `LearningCVService.UpdateMineAsync` for the CV badge.
- **Use `Notifications` to surface badge earnings** — deferred. The bell icon already polls Sprint-6 notifications; injecting "BadgeEarned" rows would work and would be nice in production, but for MVP defense the gallery view (S8-T4) is sufficient. Tracked for post-MVP.
- **Make `BadgeService.AwardIfEligibleAsync` silently no-op on unknown keys** — rejected. Real production bug class (typo in a key) should fail loud. Tests seed the catalog via the new `BadgeSeedData.SeedAsync(db)` helper.

**Consequences:**

- The XP level chip on the dashboard (S8-T4) is a defensible "you did N submissions, here's your level + badges" visualization for the defense demo — answers the supervisor question "what's the user-facing reward loop?"
- One additional migration (`AddGamification`) — 3 tables (`XpTransactions`, `Badges`, `UserBadges`) + 4 indexes. Additive; zero risk to existing rows.
- `BadgeSeedData.SeedAsync` is invoked by both `DbInitializer` (production / dev) and unit-test `NewDb` helpers — single source of truth.
- Idempotency lives in two places: (a) `BadgeService` checks `UserBadges` before insert and falls back to catching `DbUpdateException` on race; (b) for XP, the gating happens in the call site (e.g., `aiAvailable && aiWasFirstWrite` reuses ADR-028's first-write semantics). XP is intentionally not idempotent at the service layer — re-awards would inflate the ledger, but the call sites all use existing first-write gates.
- Future-extensible: adding a 6th badge is `BadgeKeys.Foo` constant + entry in `BadgeSeedData.All` + an awarding hook. Catalog endpoint surfaces it automatically.
- The architecture-doc §5.1 mentions `XpTransactions` and `Badges` / `UserBadges` as stretch tables; this ADR materialises them with the canonical column set. Thesis future-work mentions full gamification expansion.

---

## ADR-030: UI/UX direction — slate spine, color trio, restricted brand gradient

**REVERTED (2026-04-27, same day) — superseded.**
After two iterations (emerald-only, then violet+cyan+fuchsia with discipline + restrained brand gradient), owner pointed to the existing reference frontend at `D:\Courses\Level_4\Graduation Project\Code_Review_Platform\frontend` and requested the original theme stay as-is. **All Tier 1 frontend changes were rolled back from `frontend/.ui-refiner-backup-2026-04-27/`** — `tailwind.config.js`, `globals.css`, `index.html`, all 9 shared UI primitives, the global shell (Header/Sidebar/AppLayout/AuthLayout), all touched feature pages (Auth, Dashboard, Landing, Submissions, Learning CV, Assessment, NotFoundPage), and the legacy compat shims. Build verified clean (2559 modules, CSS 88.86 KB, JS 1.23 MB — identical to pre-pass).

**Net effect on the project:** the existing "Neon & Glass" identity (violet `primary`, cyan `secondary`, fuchsia `accent` ladder; Inter + JetBrains Mono; `glass-card` / `glass-frosted` / `gradient-*` / `neon-*` utilities; `animate-float` / `animate-pulse` / `animate-shimmer` keyframes; dicebear avatar fallback) is fully retained. The `frontend/.ui-refiner-backup-2026-04-27/` folder remains in place as historical record but is now redundant — both backup and live tree are identical. `docs/design-system.md` (written for the briefly-attempted minimal direction) was left in repo but no longer reflects the codebase; treat as historical reference only or delete in cleanup.

**Audit findings preserved as future reference** (the reasoning for the original recommendation): see Context section below for the three credibility-axis arguments. If a future polish pass is approved, those arguments remain the case for them. The original ADR-030 body below describes a *rejected* direction; I've left it intact rather than rewriting history.

---

**Status update:** Superseded by ADR-NNN if a future polish pass is approved. Current state: no UI/UX direction codified beyond what's already implicit in the existing component library.

---

(Original ADR-030 body — kept for posterity, NOT in effect:)



**Date:** 2026-04-27
**Status:** Accepted

**Context:**
Sprint 8 closed (M2 reached) and the 2026-04-27 audit of the frontend revealed a "Neon & Glass" aesthetic — violet primary + cyan secondary + fuchsia accent, multi-stop rainbow gradients on welcome headlines and buttons, glassmorphism on every card surface, neon-flicker / shimmer / floating particle animations, dicebear cartoon avatars, emoji baked into copy. This visual language is the 2020-2022 "AI-generated SaaS template" archetype. It works against the product on three axes:
1. **Defense credibility** — examiners are CS faculty evaluating an AI-powered code-review platform. The aesthetic reads "spent the time on visual flourishes instead of engineering."
2. **Product semantics** — every page is dense with real syntax-highlighted code (Prism). A multi-color chrome competes with Prism's earned color signals, weakening the feedback view's information density.
3. **Brand coherence** — three competing accents (violet, cyan, fuchsia) means no single color dominates. Strong product brands pick *one* accent; legacy gradients have no anchor.

**Decision:**
Adopt a single design direction approved by the project owner on 2026-04-27:
- **Feel:** minimal · technical · trustworthy.
- **References:** Linear (chrome) · Vercel (states) · Stripe (Learning CV / printable surfaces) · GitHub (code-review patterns).
- **Color spine:** Slate neutrals.
- **Primary accent (~95% of color use):** Emerald — buttons, links, focus rings, active nav, progress fills. Emerald is also the `--success` semantic (unified, like Linear unifies red as primary+error).
- **Special accent (~5%, celebration only):** Fuchsia — gamification XP chip, achievements page, "CV is live" banner, perfect-score moments. Banned from default surfaces. Banned from gradients with emerald.
- **Error:** Red, kept distinct from fuchsia so users never confuse celebration with error.
- **Typography:** Geist Sans + Geist Mono (Variable axis, Google Fonts CDN), replacing Inter + JetBrains Mono. Tighter negative letter-spacing on headings; body 14 px.
- **Density:** moderate.
- **Dark mode:** first-class. Every token has a parallel dark value flipped via `.dark` class on `<html>`.
- **Motion:** subtle — 100 ms / 180 ms / 280 ms tokens with one `cubic-bezier(0.2, 0.7, 0.3, 1)` ease and an opt-in spring for popovers. No floating, flickering, shimmering, or rotating-gradient borders. `prefers-reduced-motion` respected globally.
- **Glassmorphism:** *kept but scoped* — header, mobile sidebar overlay, modal backdrop only. Cards / buttons / badges / inputs are solid surfaces.

Tokens are defined as space-separated RGB CSS variables in `frontend/src/shared/styles/globals.css` (`:root` + `.dark` blocks) and exposed through `frontend/tailwind.config.js` as semantic colors (`bg-bg`, `text-fg`, `bg-accent`, `text-accent-fg`, `bg-accent-soft`, `bg-special`, `bg-warning`, `bg-error`, `score-good/ok/poor`, etc.). Component design and discipline are documented in `docs/design-system.md`.

**Alternatives considered:**
- **Keep the violet/cyan/fuchsia trio + tighten only the gradients** — rejected. The trio itself is the dated signal; gradients are a symptom. Owner asked specifically why I wanted to drop the trio and accepted the audit reasoning: "three accents = no accent."
- **Single emerald, no fuchsia** (initial recommendation) — rejected. Owner wanted to keep some fuchsia presence. Compromise reached: fuchsia stays but as a celebration-only accent with a hard-banned default-treatment rule, codified in the design system.
- **Pure rebrand** (different color family — Resend-red, Raycast-orange) — not considered. Emerald supports the product narrative ("growth in skill") and was the owner's stated preference.
- **Drop Geist, keep Inter** — rejected. Inter is the React-default. Geist gives a distinctive developer-tool identity, ships variable axis as one file, and pairs cleanly with Geist Mono for Prism-highlighted code.

**Consequences:**
- **Repo state after pass (2026-04-27):**
  - `frontend/index.html` swapped Inter+JetBrains Mono for Geist+Geist Mono.
  - `frontend/tailwind.config.js` rewritten — dropped `colors.{primary,secondary,accent,dark.*,success.*,warning.*,error.*,neutral.*}` ladders; added 24 semantic CSS-var-backed tokens, a Geist font stack, semantic font-size scale, tight radii (4/6/8/12/16), shadow vars, motion tokens, restricted animations to `fade-in` + `slide-up`. **Legacy aliases** (`primary`, `neutral`, `dark.bg`, `dark.surface`, `dark.border`, plus shade-ladder keys for `success/warning/error/danger`) added as a temporary bridge to keep ~29 pages rendering correctly during incremental migration; **scheduled for removal at end of next polish pass** (Tier 2).
  - `frontend/src/shared/styles/globals.css` rewritten ~590 → ~210 LoC. Removed `.glass-card`, `.glass-card-neon`, `.glass-frosted`, `.glass-shimmer`, all neon utilities (text/shadow/ring), all gradient classes, all keyframes except `fadeIn` + `slideUp`. Added `:root` + `.dark` token blocks, focus-visible style, `prefers-reduced-motion` reset, restricted `.glass` class.
  - All 9 shared UI primitives (`Button`, `Input`, `Card`, `Badge`, `LoadingSpinner`, `Modal`, `ProgressBar`, `Tabs`, `Toast`) rewritten to use semantic tokens, with legacy variants (`gradient`, `neon`, `glass` on Button; `glass`, `neon` on Card) silently aliased to safe defaults to keep existing call-sites green.
  - Global shell (`AppLayout`, `AuthLayout`, `Header`, `Sidebar`, router 404) rewritten. Header drops dicebear avatars (initials on tinted surface), gradient logos (solid emerald square with "C"), and gradient sign-in buttons. Sidebar uses `bg-accent-soft text-accent-soft-fg` for active state. AuthLayout drops the 4-stat gradient hero in favor of a 5/7 editorial split — logo + tagline + 3 bullets + Benha University credit.
  - Tier-1 surfaces refined: `LoginPage` (drops "Demo Learner/Admin" toggle), `RegisterPage`, `DashboardPage` (drops gradient welcome + 👋 emoji + rainbow stat cards + glass cards + gradient "NEXT UP" banner), `LandingPage` (671 → 270 LoC; drops `AnimatedBackground` orbs/particles, the Pricing section that conflicted with PRD §2.3 non-goals, the fake "10,000+ learners" social proof, the gradient CTA section, the bloated footer), `SubmissionDetailPage`, `FeedbackPanel` (radar fill switched from hardcoded `#6366f1` to `rgb(var(--score-good))`; ⚠ emoji on repeated-mistake notice replaced with `AlertTriangle` icon; `text-primary-500` info icon swapped for `text-info`), `LearningCVPage` + `PublicCVPage` (radar charts switched to `rgb(var(--score-good))` with `--chart-grid` / `--chart-axis` tokens; verified-projects icon switched from purple to accent), `NotFoundPage`.
- **Reversibility:** `frontend/.ui-refiner-backup-2026-04-27/` contains pre-edit copies of every file modified, plus a `MANIFEST.md` with rollback instructions (per-file `cp` or one-line PowerShell/bash batch).
- **Build impact:** CSS 67 → 81 KB during refactor (legacy aliases account for ~14 KB; will compress when aliases are removed in Tier 2). JS dropped ~14 KB (dicebear runtime + dropped gradient/orbs animation code).
- **Remaining (Tier 2 follow-up):** lighter sweeps on `AssessmentStart/Question/Results`, `TasksPage/TaskDetailPage`, `LearningPathView/ProjectDetailsPage`, `SubmissionForm`, `ActivityPage`, `AnalyticsPage`, `ProfilePage`, `SettingsPage`, `AchievementsPage`, `NotificationsPopup`, and the Admin panel. All currently render correctly via legacy aliases but contain residual gradient/glass/emoji that the next pass should clean. Plus the eventual **removal of the legacy alias bridge** in `tailwind.config.js` and a decision on the legacy `FeedbackView.tsx` mock-data page (delete vs wholesale rewrite).
- **Documentation:** `docs/design-system.md` is the living design-system doc; `docs/progress.md` records this pass under a new "UI/UX Polish Passes" section.
- **What this enables for the defense:** the application chrome no longer competes with Prism's syntax-highlighted code, the brand reads as "credible developer tool" in screenshots, the Learning CV (the shareable artifact) feels closer to Stripe-letterhead than to a crypto landing page, and the auth screens drop the "Demo Learner/Admin" toggle that would have been confusing in front of examiners.

---

## ADR-031: Project Audit (F11) as a separate feature module — not an extension of Submissions

**Date:** 2026-05-02
**Status:** Accepted

**Context:** Owner-requested F11 (Project Audit) lets any authenticated user upload a personal project + structured description and receive a comprehensive AI-driven audit, independent of any Task or LearningPath. The feature is bound for the MVP scope (must demo at defense). Two reasonable models existed:
(a) Extend `Submissions` to accept a nullable `TaskId` and add a discriminator column.
(b) Introduce parallel `ProjectAudits` entities and a parallel pipeline.

`Submissions` is the hot-path entity feeding `Recommendations`, `PathTasks`, `SkillScores`, the dashboard's recent-submissions panel, and the Learning CV's verified projects. Coupling F11 to it would force every existing consumer to reason about "task vs taskless" semantics permanently.

**Decision:** Build F11 as a separate module:

- New entities: `ProjectAudits`, `ProjectAuditResults`, `AuditStaticAnalysisResults`.
- New Hangfire job: `ProjectAuditJob` (parallel to `SubmissionAnalysisJob`, not branched inside it).
- New AI-service endpoint: `POST /api/project-audit` (see ADR-034).
- New backend endpoints under `/api/audits/...`.
- New frontend routes: `/audit/new`, `/audit/:id`, `/audits/me`.

Reused without forking: `IBlobStorage` + pre-signed-URL flow, GitHub OAuth tokens, `IAiReviewClient` HTTP pattern, FluentValidation pipeline behavior, RFC-7807 error shape, Hangfire infrastructure, Prism syntax-highlighting + inline-annotation UI components.

**Alternatives considered:**
- **Extend `Submissions` with nullable `TaskId`** — rejected. Pollutes core-loop contracts permanently; every dashboard / CV / SkillScores consumer would need to filter taskless rows.
- **Feature-flag taskless submissions inside the existing pipeline** — rejected. Same coupling risk; flags calcify.
- **Two pipelines but one entity table with a discriminator column** — rejected. Awkward EF migrations and LINQ filtering on every existing query, for one feature's convenience.

**Consequences:**
- Small duplication of "fetch code → static-analyze" call sequence between `SubmissionAnalysisJob` and `ProjectAuditJob`. Each pipeline is shorter, simpler, and independently testable in return.
- F11 evolves independently — its own prompt versioning (ADR-034), retention policy (ADR-033), and post-MVP extensions (re-audit, version-compare, public sharing) without coordinating with the core learning loop.
- Static-analysis fan-out (ESLint / Bandit / Roslyn / Cppcheck / PHPStan / PMD) is shared via `IAiReviewClient` calling the AI service's `/api/analyze-zip` — both pipelines use the identical request shape.
- Future cross-feature link (post-MVP): the user's audit history could feed Learning CV's "verified projects" list as an alternative source. Not in F11 scope; captured in post-MVP roadmap.

---

## ADR-032: Sprint renumbering — insert Sprint 9 = Project Audit, push Deployment + Defense by 2 weeks

**Date:** 2026-05-02
**Status:** Accepted
**Supersedes:** Prior Sprint 9 / Sprint 10 numbering in `implementation-plan.md`.

**Context:** F11 (Project Audit) was approved as MVP scope expansion at the end of Sprint 8 (M2 already achieved with the original 10 features). The feature must demo at defense — it is the user-facing "try the platform without committing to a learning path" entry point. Three placement options:

(a) Insert as a new Sprint 9; push everything else by 2 weeks.
(b) Compress F11 into the existing Sprint 9 (Azure Deployment + Load Testing) — incompatible: deployment + load test cannot share capacity with a 13-task feature build across BE/FE/AI.
(c) Defer F11 to post-defense — rejected by owner; feature must be visible at defense.

**Decision:** Adopt option (a). Concrete renumbering:

| Old | New | Notes |
|---|---|---|
| Sprint 9 — Azure Deployment + Load Testing (2026-08-10 → 2026-08-23) | **Sprint 10** — same scope (2026-08-24 → 2026-09-06) | All `S9-Tx` task IDs renamed to `S10-Tx` |
| Sprint 10 — Defense Prep + Polish (2026-08-24 → 2026-09-06) | **Sprint 11** — same scope (2026-09-07 → 2026-09-20) | All `S10-Tx` renamed to `S11-Tx`; rehearsal-1 date 2026-09-03 → 2026-09-17; rehearsal-2 date 2026-09-07 → 2026-09-21 |
| — | **Sprint 9 (NEW)** — Project Audit Feature (2026-08-10 → 2026-08-23) | 13 tasks across BE / FE / AI / Coord |

Total sprints 10 → 11. Hard deadlines updated: rehearsal 2026-09-07 → 2026-09-21; final defense target 2026-09-15 → 2026-09-29.

**Alternatives considered:** see (b) and (c) above.

**Consequences:**
- ID renumbering is safe because **no Sprint 9 / Sprint 10 task had been executed before this change** — `progress.md` contains no `S9-Tx` or `S10-Tx` completion entries (Sprint 8 closed M2; new work begins after this ADR).
- Owner confirmed external university defense window allows the 2-week shift.
- M2 remains anchored at end of (original) Sprint 8 = 2026-08-09 — already achieved; F11 is documented as a post-M2 MVP expansion, not a new milestone gate. M3 sprint mapping moves Sprint 10 → Sprint 11.
- Risk register gains R11 — F11 audit prompt quality (parallels R1 for the existing AI review prompt).
- `implementation-plan.md` "Total sprints: 10" → "Total sprints: 11"; `PRD.md` §9 milestone table sprint mapping updated for M3.
- Future references in this codebase to "Sprint 9 / S9-Tx" mean **the Audit sprint** unless explicitly tagged "old Sprint 9" — historical references in already-merged ADRs (e.g., ADR-005 "deployment sprint near the end") are historically-correct and should not be retroactively edited.

---

## ADR-033: Project Audit retention — 90-day blob cleanup, metadata permanent

**Date:** 2026-05-02
**Status:** Accepted

**Context:** F11 lets users upload arbitrary project ZIPs (≤50MB) plus stored AI audit reports. Storing both indefinitely raises (a) Azure Blob cost exposure beyond the $40/month NFR-COST target as audit volume grows, and (b) PII / IP surface area for code that may include credentials, internal logic, or third-party copyrighted snippets the user didn't think to scrub before upload.

**Decision:**
- **Blob storage:** Hangfire daily recurring job `AuditBlobCleanupJob` deletes blobs from the `audit-uploads` container older than **90 days**. On deletion, sets `ProjectAudits.BlobPath = null` and emits an audit-log row for traceability.
- **Metadata rows:** `ProjectAudits` + `ProjectAuditResults` + `AuditStaticAnalysisResults` are retained permanently. They are lightweight (no source-code body — only feedback JSON), useful for the user's audit history view, and feed possible future "audit timeline" / Learning-CV cross-link features.
- **User-visible behavior:** the audit history `/audits/me` shows the report forever; re-running the audit on the same project after 90 days requires re-upload (the report is preserved, the source code is not).
- **Belt-and-braces:** the Azure `audit-uploads` container also gets a Lifecycle Management Policy deleting blobs after 100 days. If the Hangfire job fails for >10 days, Azure cleans up regardless.

**Alternatives considered:**
- **30-day retention** — rejected. Too aggressive for users who want to revisit a recent audit's source code.
- **Permanent retention of blobs** — rejected. Cost grows linearly with usage; abuse vector for free file storage.
- **Full row deletion at 90 days** — rejected. Loses analytics signal (which Tech Stacks did users audit? what's the average score?) and forecloses Learning-CV "verified projects" cross-link.

**Consequences:**
- One Hangfire recurring job to monitor (visible in `/hangfire` dashboard).
- `audit-uploads` Blob container Lifecycle policy must be configured at deploy time (Sprint 10 task to be added during deployment phase).
- User-facing copy on `/audit/new`: "Your uploaded code is stored for 90 days; the audit report is yours to keep." — captured as a UX acceptance criterion in Sprint 9 task S9-T8.

---

## ADR-034: Audit AI prompt — distinct endpoint + template from per-task review

**Date:** 2026-05-02
**Status:** Accepted

**Context:** The AI service's existing `POST /api/ai-review` is built around per-task review: it takes a task description as ground truth, returns 5-category scores anchored to the task's acceptance criteria, and generates "next task" recommendations against the task catalog. F11 (Project Audit) has no Task — only a user-supplied structured project description. Output emphasis is also different: actionable how-to-fix steps, missing-feature detection (vs the user-stated description), and explicit tech-stack assessment, none of which `/api/ai-review` outputs.

**Decision:**
- New AI-service endpoint: `POST /api/project-audit`, with its own prompt template versioned at `code-mentor-ai/prompts/project_audit.v1.txt`, alongside the existing `prompts/ai_review.v1.txt`.
- Response schema: 6 score categories — **CodeQuality / Security / Performance / Architecture & Design / Maintainability / Completeness** (the last is new to F11 and is computed by comparing the structured project description against what the code actually implements). Plus `strengths[]`, `criticalIssues[]`, `warnings[]`, `suggestions[]`, `missingFeatures[]`, `recommendedImprovements[]` (top-5 prioritized actions, each with a how-to), `techStackAssessment` (free-text), and `inlineAnnotations[]` (per-file/line — reuses Submission UI components).
- Validation: Pydantic-strict; on schema-malformed → one auto-retry, then error.
- Token caps: **10k input / 3k output** per audit (the per-task review is 8k / 2k). Audit input grows because of the project description payload; output grows because the report has 8 sections vs review's 5.
- Tone: senior code-reviewer (assertive, structured, prioritized), distinct from review's tutor tone (encouraging, scaffolded). Codified in the prompt's system message.

**Alternatives considered:**
- **Extend `/api/ai-review` with an optional task-context flag** — rejected. Two diverging output schemas in one endpoint is a recipe for response-shape regressions; a prompt tweak by one team would silently break the other consumer.
- **Same endpoint, feature flag** — rejected. Same coupling risk.
- **Reuse the review prompt verbatim and rebrand the output** — rejected. The audit user has different needs (project-level critique, missing features, tech-stack judgment) that the review prompt does not cover.

**Consequences:**
- AI team owns two prompts. Versioning lives in the AI service repo (semver-style filenames: `*.v1.txt`, `*.v2.txt`, etc.).
- Test matrix doubles for AI-side changes: `tests/regression_review_*.py` and `tests/regression_audit_*.py` each cover 3 sample inputs minimum (Sprint 9 task S9-T7).
- Cost monitoring dashboard splits into two series (review vs audit). Hard cap per request enforced server-side.
- Quality risk (R11 in Risk Register): mitigated by Sprint 9 dogfood pass (S9-T12) on 3 sample projects (Python / JS / C#).

---

## ADR-035: `POST /api/project-audit` returns combined static + audit response (one round-trip)

**Date:** 2026-05-03
**Status:** Accepted
**Refines:** ADR-034 (audit prompt + endpoint contract)

**Context:** During S9-T4 the backend pipeline needed to know whether to make one HTTP call to the AI service (combined static + audit) or two (`/api/analyze-zip` first for static, then `/api/project-audit` for the LLM portion with the static summary as input). Architecture §6.10 lists three endpoints (`/analyze`, `/analyze-zip`, `/ai-review`, plus the new `/project-audit` from ADR-034) which suggested a two-call design. But:
1. The existing `IAiReviewClient.AnalyzeZipAsync` (Submissions pipeline) already returns a combined static + AI response from one HTTP call to the AI service, despite the architecture's surface implying two endpoints.
2. Two HTTP calls double the network latency and complicate retry/timeout bookkeeping (especially the "AI down but static succeeded" graceful-degradation path).
3. Having the AI service own the orchestration internally is a cleaner contract for the backend client.

**Decision:** `POST /api/project-audit` returns an `AiAuditCombinedResponse` carrying both:
- The per-tool static-analysis results (so the backend can persist `AuditStaticAnalysisResult` rows), and
- The LLM-driven `AiAuditResponse` (8-section structured payload — see ADR-034).

The AI service handles the internal static-then-audit orchestration. The backend's `IProjectAuditAiClient.AuditProjectAsync` is one method, one HTTP call, one combined response. Graceful-degradation contract: if the LLM portion fails but static succeeds, `AiAudit` is null and `StaticAnalysis` is populated; the backend persists static rows + sets `AiReviewStatus=Unavailable` + schedules a 15-min retry. If the entire AI service is unreachable (transport error), the client throws `AiServiceUnavailableException` and the backend falls back to the same Unavailable + retry path.

**Alternatives considered:**
- **Two separate HTTP calls** (`/api/analyze-zip` then `/api/project-audit`) — rejected. Doubles round-trip latency for an audit pipeline that's already targeting a tight 6-min p95. Forces the backend to reason about partial-failure modes (static-but-not-AI vs neither) at the orchestration layer instead of letting the AI service own that semantics.
- **Reuse `/api/analyze-zip` for static, add a separate `/api/project-audit` that takes only the static summary** — rejected. The audit endpoint needs the source code to produce inline annotations (see ADR-034 response schema), so it would need to receive the ZIP anyway. No saving, more coordination.
- **Two endpoints, expose two separate methods on `IProjectAuditAiClient`** — rejected. Same coupling cost as above without the latency win.

**Consequences:**
- **Backend:** `IProjectAuditAiClient` is a single-method surface. Test fakes are simpler — one mock with `Response` + `ThrowUnavailable` handles the full matrix (happy, static-only, full outage). `ProjectAuditJob` makes one AI call inside its main `try` block.
- **AI service (S9-T6 scope):** the implementation of `/api/project-audit` runs static fan-out (ESLint / Bandit / Cppcheck / PMD / PHPStan / Roslyn — all applicable based on file extensions, since audits have no `ExpectedLanguage` to gate on) **then** invokes the LLM with the static summary baked into the prompt. Returns the combined response shape. If the LLM call fails but static succeeded, returns `AiAudit=null` with the static portion populated.
- **Architecture doc §6.10** lists `/api/project-audit` without explicitly noting the static-included response semantics; this ADR is the authoritative source for that detail. Doc can be tightened in a future architecture refresh.
- **Token-cap enforcement (ADR-034: 10k input / 3k output)** stays within the AI service — the backend does not need to know about caps because the combined response either includes a successful LLM portion or marks it Unavailable.
- **Retry semantics** mirror Submissions exactly (`MaxAutoRetryAttempts = 2`, 15-min delay) — single auto-retry, then user-initiated retry via `POST /audits/{id}/retry` (S9-T5).

---

## ADR-036: Add F12 — RAG-based AI Mentor Chat with Qdrant vector DB

**Date:** 2026-05-07
**Status:** Accepted

**Context:** F7 (Feedback Report UI) and F11 (Project Audit Report) currently render structured AI feedback as a one-shot artifact: scores, annotations, recommendations. Users have no follow-up channel — if a learner sees "this method has a security issue" but doesn't understand why, the journey stops there. M1 dogfood (Sprint 6) and Sprint 9 audit dogfood both flagged the same gap qualitatively: feedback is rich but inert. Several supervisors during the M1 review described it as "great report, but I'd want to ask 'why?' on three of these points."

The team also wants a clear AI/ML differentiator for the September 2026 thesis defense beyond "we wrap OpenAI in a structured prompt." The existing AI stack (single-prompt review, prompt versioning, multi-tool static aggregation) is solid but does not surface a named, evaluable AI technique that the thesis can build a chapter around.

**Decision:** Add **F12 — AI Mentor Chat** as a per-submission and per-audit conversational interface backed by **Retrieval-Augmented Generation (RAG)**. Ship in Sprint 10.

Concrete shape:
- One chat session per `Submission` and per `ProjectAudit` (1:1). Side panel on `/submissions/:id` and `/audit/:id`.
- New AI-service endpoints:
  - `POST /api/embeddings/upsert` — chunks code, generates embeddings via `text-embedding-3-small`, upserts into Qdrant with payload `{ submissionId|auditId, filePath, startLine, endLine, kind: "code"|"feedback"|"annotation" }`.
  - `POST /api/mentor-chat` — given `{ chatSessionId, message, history[] }`, generates query embedding, retrieves top-k chunks from Qdrant filtered by session scope, constructs RAG prompt, streams LLM response via Server-Sent Events.
- New backend entities: `MentorChatSessions` (1:1 with Submission/Audit, `Scope` enum), `MentorChatMessages` (role: user|assistant, content, tokens, createdAt). Conversation history capped at last 10 turns sent to LLM.
- New backend endpoints under `/api/mentor-chat/{sessionId}/...`. Backend acts as proxy + auth gate for the AI service streaming endpoint.
- New FE side panel on submission and audit detail pages — collapsible, streaming markdown rendering, respects existing Neon & Glass identity.

**Vector store choice — Qdrant:**

| Option | Pro | Con |
|---|---|---|
| **Qdrant (chosen)** | Production-grade vector DB; clean Python + REST API; minimal operational overhead (single docker-compose service on port 6333); reusable for future similar-submission search and post-MVP semantic-task-search; strong portfolio bullet ("Integrated Qdrant vector DB into multi-service Docker stack"); thesis-ready evaluation surface | One additional service to monitor; one more failure mode in graceful-degradation matrix |
| **In-memory cosine similarity (rejected)** | Zero infra; works at MVP scale | Weaker portfolio bullet; loses on cold-start (recompute embeddings on every restart) unless persisted; no clean story for "vector DB" in thesis methodology chapter |
| **Postgres pgvector (rejected)** | Single-DB story | Stack is SQL Server (ADR-001 / ADR-008); migrating is out of scope |
| **Redis with vector module (rejected)** | Reuses existing Redis | Vector-search APIs less ergonomic than Qdrant; weaker DX |

**Embedding model — `text-embedding-3-small`:**
- 1536 dims, $0.02 per 1M tokens (cheap enough for MVP-scale per-submission embedding).
- Same provider (OpenAI) — no second API key to manage.
- Re-embedding cost is negligible if we ever change models; embeddings are derived data, not source of truth.

**Token caps (mirrors ADR-034 audit caps pattern):**
- Per chat turn: 6k input (retrieved chunks + history + query), 1k output. Streamed.
- Conservative top-k: 5 chunks per query. Tunable.

**Graceful degradation:**
- Qdrant down → chat falls back to "raw context mode" (sends full submission/audit feedback JSON instead of RAG-retrieved chunks); user sees a small "limited context" banner. This avoids hard outage when the vector store is the only failing component.
- AI service down → chat shows "Mentor temporarily unavailable" banner; same pattern as existing `/api/ai-review` outage handling (per ADR-003 / ADR-022).

**Alternatives considered:**
- **Multi-Agent Code Review as the sole differentiator** — rejected as standalone choice because it refactors a working pipeline (F6, 200+ tests) and offers a less visible demo surface than a live chat. Captured separately in ADR-037 as F13 in Sprint 11.
- **Mock Technical Interview module** — rejected for current scope because it's a parallel feature stream (new question bank, persona-specific scoring) competing with M3 budget. Captured in Post-MVP roadmap.
- **Submission diff comparison** — rejected as primary because it lacks AI/ML depth (it's a UI feature over existing data). Already in `Post-MVP Roadmap`.
- **Replace Qdrant with a managed vector DB (Pinecone, Weaviate Cloud)** — rejected. Adds external SaaS dependency conflicting with ADR-005 (local-first, no extra cloud accounts for MVP). Qdrant runs in docker-compose alongside SQL Server / Redis / Azurite.
- **Skip the vector DB entirely; just stuff the whole submission code + feedback into every prompt** — rejected. Loses the academic AI/ML angle the team wants for the thesis, and also breaks at audit scale where projects can be 50MB.

**Consequences:**
- **+1 docker-compose service** (`qdrant/qdrant:v1.x` on port 6333). DevOps task in Sprint 10 to add to compose + `.env.example`. Memory footprint ~200MB at MVP scale.
- **AI service grows by:** an embeddings module (chunking + OpenAI client), a Qdrant client (`qdrant-client` Python SDK), a mentor-chat module (RAG prompt construction + streaming).
- **Backend grows by:** `MentorChatSessions` + `MentorChatMessages` entities + EF migration; `IMentorChatClient` Refit interface; SSE proxy controller. New Hangfire job `IndexSubmissionForMentorChatJob` enqueued on `Submission.Status=Completed` and on `ProjectAudit.Status=Completed`.
- **Frontend grows by:** `MentorChatPanel.tsx` component, `useEventSource` hook for SSE streaming, integration on `SubmissionDetailPage` + `/audit/:id`.
- **Thesis evaluation chapter unlocked:** comparative experiment "RAG-retrieved context vs raw-feedback context" on N=20 user questions across 5 submissions, scored by a rubric (relevance / specificity / actionability). Owner already aware this is a thesis-quality contribution, not just a feature shipped.
- **Cost monitoring:** add embeddings + chat token series to the OpenAI cost dashboard (same pattern as ADR-034 audit-vs-review split).
- **R12 added to Risk Register** (RAG retrieval quality on small/empty corpora — short submissions may have only 1–2 chunks; mitigation: top-k clamped to available chunks; fallback to raw-context mode if `chunkCount < 3`).
- **Sprint 10 capacity:** ~115h of feature work — comfortably inside the freed budget after deferring Azure deploy (see ADR-038).
- **Hard dependency on a Submission or Audit having a Completed status** — Mentor Chat is unavailable on Pending / Processing / Failed states. Codified as an FE guard.

---

## ADR-037: Add F13 — Multi-Agent Code Review with new `/api/ai-review-multi` endpoint

**Date:** 2026-05-07
**Status:** Accepted
**Refines:** ADR-022 (`/api/ai-review` endpoint), ADR-027 (prompt versioning + score rename)

**Context:** F6 currently calls a single LLM prompt that covers five categories (correctness / readability / security / performance / design) in one pass. The output is broad but not specialized; the same prompt template handles security concerns and architectural critique with the same system message and role framing. Quality is acceptable (4.0+ supervisor rating in Sprint 6 dogfood, M1 milestone) but the team has hit a depth ceiling that single-prompt iteration cannot push past — adding more category-specific guidance to a single prompt makes it longer and dilutes any one perspective.

The team also needs a clean **comparative experiment** for the thesis evaluation chapter — a setup where two architectures of the same feature can be measured side-by-side. The single prompt is the natural baseline.

**Decision:** Add **F13 — Multi-Agent Code Review** as a parallel AI-service endpoint, ship in Sprint 11. The existing `/api/ai-review` stays untouched (zero regression risk on Sprint 5–6 tests; old endpoint is the comparison baseline).

Concrete shape:
- New AI-service endpoint: `POST /api/ai-review-multi`.
- Three specialist agent prompts (versioned alongside `ai_review.v1.txt`, `project_audit.v1.txt`):
  - `prompts/agent_security.v1.txt` — vulnerabilities, input handling, secrets, OWASP-relevant patterns. Owns the `security` score.
  - `prompts/agent_performance.v1.txt` — algorithmic complexity, hot paths, allocations, queries. Owns the `performance` score.
  - `prompts/agent_architecture.v1.txt` — naming, separation of concerns, design patterns, readability. Owns the `correctness` + `readability` + `design` scores (3-of-5; the architecture agent has the broadest scope by design).
- Each agent is invoked in parallel (`asyncio.gather`) with the same code + task context + static-analysis summary, but a focused system message and a constrained output schema (only the categories that agent owns).
- An **orchestrator** (`services/multi_agent.py`) merges the three agent outputs into the existing `AiReviewResponse` shape — so the backend's `IAiReviewClient` consumer needs no change for the merged-default path. Strengths and weaknesses are concatenated and de-duplicated by Jaccard similarity ≥0.7. Inline annotations are merged by `(filePath, lineNumber)`.
- Backend: env var `AI_REVIEW_MODE=single|multi` (default `single` for safety) selects which AI-service endpoint `SubmissionAnalysisJob` calls. Both code paths covered by tests.
- Token caps: 6k input + 1.5k output **per agent** (3 × 1.5k = 4.5k total output, vs 2k for single). Roughly 2.2× cost per submission in `multi` mode — acceptable for thesis-window measurement; not enabled by default in production.

**Why a new endpoint, not a replacement (the central decision):**

| Approach | Pro | Con | Verdict |
|---|---|---|---|
| **(a) New endpoint `/api/ai-review-multi` (chosen)** | Old endpoint stays green during refactor — F6's 200+ tests untouched; thesis A/B comparison is a controlled experiment by construction; flag-flip is the only post-defense migration | Code duplication in AI service (orchestrator + 3 prompts alongside the single prompt); doubles regression test surface | **Chosen** |
| **(b) Replace `/api/ai-review` with multi-agent internally** | Cleaner code; one source of truth | Higher regression risk on F6 tests; loses the thesis A/B story (you'd compare against git history, not against a live endpoint); rollback on bad multi-agent output is "redeploy old code" instead of "flip env var" | Rejected |
| **(c) Feature flag inside the existing endpoint** | One endpoint surface | Flag-driven branches inside endpoint code rot quickly; test matrix is a cross-product (single × multi × prompt-version); confusing semantics for AI service consumers | Rejected |

**Thesis evaluation framing:**
- Run both endpoints against the same N=15 submissions (5 Python / 5 JavaScript / 5 C#).
- Measure per-category score deltas, response length, token cost, and a manual relevance rubric (1–5 by 2 supervisors blind to which mode produced which output).
- Hypothesis: multi-agent improves `security` and `performance` specificity at higher token cost, with neutral-to-slightly-negative effect on `readability` (because the architecture agent's broader scope dilutes attention).
- Result table goes into thesis chapter on "AI Review Architecture: Single-Prompt vs Specialist-Agent Decomposition."

**Alternatives considered:**
- **Replace endpoint** — see (b) above.
- **Feature flag inside endpoint** — see (c) above.
- **More than three agents** (e.g., separate agents for correctness, readability, security, performance, design — 5 agents) — rejected. Empirically more parallel calls = more orchestration risk + more token cost without strong evidence the marginal agent helps. Three is a defensible cut: security (high-stakes, distinct vocabulary), performance (algorithmic, distinct vocabulary), and a broader architecture/quality bucket. Five-agent variant captured as post-thesis exploration.
- **Sequential rather than parallel agents** (architecture summarizes, then security and performance specialize) — rejected for MVP. Adds latency without clear gain; sequential dependency would also make the comparison harder to attribute.
- **Skip multi-agent; do submission diff comparison instead** — rejected. Diff comparison has no AI/ML depth; it's a UI feature over existing data.

**Consequences:**
- **AI service:** new `services/multi_agent.py` orchestrator, three prompt files + their `*.v1.txt` versioning, one new endpoint route. Existing `/api/ai-review` untouched. AI test suite gains ~6 tests (one per agent + orchestrator merge + token-cap enforcement + parallel-error handling).
- **Backend:** env-var-gated client method `IAiReviewClient.AnalyzeMultiAsync` parallel to the existing `AnalyzeAsync`. `SubmissionAnalysisJob` reads `AI_REVIEW_MODE` and dispatches; default value is `single` for production safety. Hand off to backend integration tests covers both modes.
- **Frontend:** **zero changes for default mode** — the merged response shape matches the existing `AiReviewResponse`. Optional small badge "Reviewed by multi-agent" on feedback page when `mode=multi` is active in env, gated behind a feature flag in the backend response (post-defense polish).
- **Prompt-version tracking:** `AIAnalysisResults.PromptVersion` already exists (ADR-027). Multi-agent stores `multi-agent.v1` (composed string identifying the orchestrator version, not individual agent versions — agent-level versioning is in the AI service repo).
- **Cost monitoring:** add `ai-review-multi` token series alongside `ai-review` and `project-audit`. Operate the multi endpoint **off by default in production** to avoid runaway cost during demo period; enable for thesis evaluation runs only.
- **Sprint 11 capacity:** ~75h of feature work — fits within Sprint 11's freed budget (Azure work deferred per ADR-038 + polish/load test/thesis sync still in scope).
- **R13 added to Risk Register** (parallel-call orchestration failure modes — agent timeout, partial failure, schema drift across agents).
- **Post-defense migration path** (if multi proves consistently better in evaluation): flip default `AI_REVIEW_MODE=multi`, deprecate `/api/ai-review` after one month, remove the env var. Single line of code change in production.

---

## ADR-038: Defer Azure deployment to post-defense slot; defense runs locally on owner's laptop

**Date:** 2026-05-07
**Status:** Accepted
**Supersedes:** ADR-005 timing assumption ("Azure deployment as single late-stage step" — the deployment intent is preserved; only the *timing* shifts to post-defense)

**Context:** ADR-005 set up the local-first development model with Azure deployment scheduled for a dedicated late-stage sprint. ADR-032 reinforced this by allocating Sprint 10 entirely to Azure provisioning, deployment, load testing, and Application Insights setup (S10-T1 through S10-T11), with Sprint 11 for defense prep + polish.

Owner reassessed the priorities at the close of Sprint 9:
1. **Defense demo will be presented from the owner's laptop**, not from a public URL — supervisor preference is for a controlled live demo over a remote URL, and the team wants to remove the deployment-day risk surface.
2. **Two new differentiation features** (F12 RAG Mentor Chat + F13 Multi-Agent Code Review — see ADR-036, ADR-037) are higher-value uses of Sprint 10 + 11 capacity than Azure provisioning, given the portfolio + academic-depth + user-value criteria the owner explicitly weighted (in that priority order).
3. **Azure work has not started** — no resources provisioned, no Bicep templates written, no costs incurred. Deferring is a clean revert to "intent without execution."
4. **Cost win as a side effect:** $35/month Azure spend during the ~3-month pre-defense window is avoided (~$100, the entirety of the Azure for Students credit). Credit can be saved for post-defense continuation.

**Decision:**
- **Defer all Azure-deployment work** (the original S10-T1 through S10-T11 task list, plus production-only items like Application Insights, Vercel, Railway, custom domain, internal-service auth header) to a new **Post-Defense slot** appended to the implementation plan, scheduled provisionally for late October 2026 onward at the team's discretion.
- **Sprint 10 (2026-08-24 → 2026-09-06) replaced** with F12 — RAG Mentor Chat + Qdrant integration (ADR-036). Capacity gain: ~70h freed by removing Azure tasks.
- **Sprint 11 (2026-09-07 → 2026-09-20) replaced** with F13 — Multi-Agent Review (ADR-037) + thesis sync + defense rehearsals + local-only load test + UX polish + demo seed data. Sprint 11 keeps every defense-prep task from the original plan; only the Azure-deployment work is removed.
- **Demo execution model:** local docker-compose stack on the owner's laptop. Backup video per S11-T3 retained. Supervisors can clone the repo and run `docker-compose up` if they want their own instance — README updated with single-step instructions.
- **M3 milestone redefined:** "Defense-ready locally — thesis docs synced, demo rehearsed, F12 + F13 demo'd live, local stack stable across the rehearsal window." Drops "deployed to Azure, load-tested" from the original M3 definition; adds the two new features to the gate.
- **Local load test:** Sprint 11 includes a k6 run against the local docker-compose stack on the owner's laptop targeting 50 concurrent users (lower than the original 100-user target since a B1 tier was being measured, not a workstation). Acts as a "sanity check, no regressions" gate, not a production-readiness sign-off.
- **Thesis narrative:** the deployment chapter becomes "Production architecture defined, validated locally; Azure deployment captured as immediate post-defense work." Honest framing, supported by the existing detailed deployment plan in `architecture.md` §10.2 and the previously-defined Azure resource sizing.

**Alternatives considered:**
- **Keep Azure in Sprint 10, add F12 in parallel** — rejected. Sprint 10 capacity becomes 97 % utilized with zero buffer; Azure surprises (env-var plumbing, App Service quirks, cost spikes) historically eat 1–2 days each. Stacking F12 on top is a quality-of-defense risk.
- **Cut F12 or F13, keep Azure** — rejected. F12 + F13 are the explicit differentiation choices for portfolio + thesis depth; cutting them defeats the whole reason for revising the plan.
- **Slot Azure into Sprint 11 alongside Multi-Agent + thesis sync + rehearsals** — rejected. Sprint 11 was already full of defense-prep work; adding deployment is the same overload pattern.
- **Deploy in mid-sprint, run defense from Azure** — rejected. Demo from local laptop is the owner's stated preference; reverting that is not in scope.
- **Cancel Azure deployment entirely** — rejected. The team plans to continue the project post-graduation; the deployment plan in `architecture.md` §10.2 stands. Only the *timing* changes.

**Consequences:**
- **`implementation-plan.md` Sprint 10 + Sprint 11 fully rewritten** — old task IDs S10-T1..T11 retired; new S10-T1..T10 cover RAG Mentor Chat; new S11-T1..T12 cover Multi-Agent + polish + load test + thesis sync + rehearsals.
- **New Post-Defense slot section appended** to the implementation plan listing the deferred Azure tasks plus their original dependencies. Acts as the team's continuation backlog; not budgeted on a sprint timeline since defense is the project boundary for academic purposes.
- **Risk register:** R3 ("Azure deployment surprises burn Sprint 10") retired — the risk no longer applies pre-defense. R7 ("Load test reveals Hangfire is a bottleneck on B1 tier") rescoped to "local-stack load test surfaces hot paths" — same mitigation, different baseline.
- **Backup plan for live-demo failure:** S11-T3 demo video recording is now non-optional (it was already in the plan; this ADR upgrades its priority). If the laptop or docker-compose stack fails on defense day, the video is the demonstration of record.
- **README + onboarding update:** root `README.md` Sprint 11 task ensures `docker-compose up` from a clean clone works in <10 min for any supervisor or external reviewer.
- **Cost:** Azure for Students credit preserved (~$100). Sufficient for ~3 months of light post-defense hosting if the team chooses to continue.
- **Defense-day operational checklist (S11-T9 expanded):** laptop battery + charger; backup laptop with cloned repo + pre-built docker images; offline-friendly demo path (rehearse the demo with WiFi off — only the OpenAI API call legitimately needs connectivity); recorded backup video on a USB drive.
- **Honest in the thesis:** the deployment chapter explicitly notes "deferred to post-defense slot per ADR-038" rather than claiming Azure capability we didn't validate. Supervisors see the trade-off transparently.

---

## Template for future ADRs

```markdown
## ADR-NNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Proposed | Superseded by ADR-XXX

**Context:** What problem are we solving? What constraints matter?

**Decision:** What did we decide?

**Alternatives considered:**
- Option A — rejected because...
- Option B — rejected because...

**Consequences:** What does this enable? What does it cost? What downstream work does it imply?
```
