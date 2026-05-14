# Code Mentor — Product Requirements Document

**Product:** AI-Powered Learning & Code Review Platform
**Version:** 1.2 (MVP for Benha 2026 defense — F12 RAG Mentor Chat + F13 Multi-Agent Review added 2026-05-07; Azure deployment deferred to post-defense per ADR-038)
**Owner:** Benha University, Faculty of Computers and AI — Class of 2026 team
**Last updated:** 2026-05-07

---

## 1. Overview

**Code Mentor** is an AI-powered learning platform that closes the gap between "basic coding literacy" and "professional software engineering competency" for self-taught developers, career switchers, and university students.

Learners take an adaptive assessment, receive a personalized project-based learning path, submit real code (via GitHub URL or ZIP) to tasks, and get multi-layered feedback within minutes: static analysis + LLM review, unified into scores, annotated comments, and concrete next-task recommendations. Their verified progression is captured in a shareable **Learning CV** — a data-backed alternative to course-completion certificates.

The platform ships as three services: a React/Vite frontend, an ASP.NET Core 8 backend (with Hangfire worker), and a Python/FastAPI AI service (OpenAI + static analyzers). Local-first build with single-step Azure deployment late in the project.

---

## 2. Goals & Success Metrics

### 2.1 Primary goal

Deliver an intelligent, end-to-end learning system where a learner can go from zero to a verified Learning CV entry in under a week of genuine effort — receiving "senior-developer-equivalent" code feedback in ≤5 minutes per submission.

### 2.2 Success metrics (defense-ready thresholds)

| Metric | Target | Measurement |
|---|---|---|
| End-to-end core loop completion | User completes assessment → gets path → submits code → receives feedback in a single session | Analytics funnel (logged events in backend) |
| Feedback latency (p95) | ≤5 minutes from submission → feedback visible | Backend pipeline timing logs |
| AI feedback quality (demo-rated) | ≥4/5 average supervisor rating on 5 demo submissions | Post-defense debrief evaluation |
| System reliability during defense | 99% uptime across the 2-week pre-defense period | Application Insights or equivalent |
| Concurrent-user capacity | Handle 100 simultaneous authenticated users without p95 API latency >500ms | Load test with k6 in Sprint 10 |
| Test coverage | ≥70% line coverage on `CodeMentor.Application` layer | `dotnet test` + coverlet report |

### 2.3 Non-goals (out of scope, explicitly)

- Payment / billing infrastructure
- Live human mentorship (chat, video, hybrid review)
- AI pair programming (real-time codegen in the editor)
- Multi-tenant / institutional accounts
- Multilingual UI (English-only)
- Full CI/CD automation beyond a basic GitHub Actions test pipeline
- Mobile apps (responsive web only)
- Full GDPR compliance tooling (stub endpoints with "coming soon")

(Full list in academic docs section 1.7.1 and ADR-006.)

---

## 3. User Personas

### 3.1 Persona A — "The Self-Taught Developer" (primary)

- **Name:** Layla, 24, career-switcher from marketing
- **Context:** Took free online courses for 6 months. Can write basic React components and REST endpoints but feels lost on when her code is "good enough." Has been rejected from 12 junior roles; feedback is "not quite job-ready."
- **Cares about:** Getting concrete, actionable feedback. Not paying $10k for a bootcamp. A credible way to prove her skills to employers.
- **Frustrations with alternatives:** LeetCode only tests correctness. YouTube tutorials don't evaluate her actual projects. Bootcamps are too expensive.

### 3.2 Persona B — "The University Student" (secondary)

- **Name:** Ahmed, 21, 3rd-year CS student at an Arab-world university
- **Context:** Knows theory (algorithms, OS, databases), has built course projects, but feels the gap between "works on my machine" and "production-quality." Worried about post-graduation job prospects.
- **Cares about:** Filling the practical-skills gap, building a portfolio during summer break, a CV that stands out from classmates.
- **Frustrations with alternatives:** University courses skip code quality, security, patterns. TA feedback on projects is delayed and superficial.

### 3.3 Persona C — "The Admin" (internal)

- **Name:** Omar (you), the platform operator
- **Context:** Backend team member, also the platform's content admin for the demo.
- **Cares about:** Fast task CRUD, seeing submission metrics, moderating problem content.
- **Frustrations with alternatives:** Academic documentation's admin scope is bloated for MVP needs — wants the minimum to run a defense demo.

---

## 4. User Stories

### 4.1 Authentication & Profile

- **US-01** As a new learner, I want to register with email + password or my GitHub account so I can start learning without friction.
- **US-02** As a returning learner, I want to log in and stay logged in across tab closes without re-entering credentials every hour.
- **US-03** As a learner, I want to reset my password via email if I forget it.
- **US-04** As a learner, I want to update my profile (name, GitHub username, picture) and see changes immediately.
- **US-05** As an admin, I want to see and manage users so I can deactivate bad actors.

### 4.2 Adaptive Assessment

- **US-06** As a new learner, I want to take a 30-question adaptive skill assessment so the platform understands my starting level before recommending anything.
- **US-07** As a learner, I want the assessment difficulty to adjust based on my answers so I don't get insulted by trivial questions or overwhelmed by advanced ones.
- **US-08** As a learner, after completing the assessment I want to see my strengths and weaknesses per category so I know what to focus on.
- **US-09** As a learner, I want to retake the assessment after 30 days so I can measure growth.

### 4.3 Learning Path & Tasks

- **US-10** As a learner, after my assessment I want an auto-generated, ordered learning path for my chosen track (Full Stack / Backend / Python) so I don't have to design my own curriculum.
- **US-11** As a learner, I want to see my current task, upcoming tasks, and completed tasks so I know where I am.
- **US-12** As a learner, I want to browse the full task library (with filters by track, difficulty, language, category) so I can explore outside my main path.
- **US-13** As a learner, I want to add an AI-recommended task to my path from a submission's feedback so I can directly act on suggestions.

### 4.4 Code Submission & Feedback

- **US-14** As a learner, I want to submit my code for a task by pasting a GitHub repo URL so I don't have to package anything manually.
- **US-15** As a learner, I want to alternately upload a ZIP of my project so I don't need to publish private code to GitHub.
- **US-16** As a learner, I want to see clear submission status (Pending → Processing → Completed / Failed) with an ETA so I know what's happening.
- **US-17** As a learner, I want to see feedback that combines static analysis findings with AI-generated architectural and quality commentary — with inline annotations on my code — so the feedback feels actionable, not generic.
- **US-18** As a learner, I want to see which categories (correctness, readability, security, performance, design) I scored best and worst in so I know what to work on.
- **US-19** As a learner, I want to resubmit the same task after improving my code so I can see if I've progressed.
- **US-20** As a learner, I want to retry a failed submission so a flaky error doesn't block me.

### 4.5 Learning CV

- **US-21** As a learner, I want to generate a Learning CV that shows my verified skills, project history, and overall progression so I can share it with employers.
- **US-22** As a learner, I want a public shareable URL for my CV (with control over what's public) so I can put it on my résumé or LinkedIn.
- **US-23** As a learner, I want to download my CV as a PDF so I can attach it to job applications.

### 4.6 Dashboard

- **US-24** As a learner, I want a dashboard showing my active path progress, last 5 submissions, and skill snapshot so I have a one-page view of my progress.

### 4.7 Admin

- **US-25** As an admin, I want to create, edit, and deactivate tasks in the task library.
- **US-26** As an admin, I want to manage the assessment question bank so the adaptive algorithm has good source material.

### 4.8 Project Audit (F11 — added 2026-05-02)

- **US-27** As a learner, I want to upload a personal project (code + structured description) for AI evaluation independently of any task or learning path, so I can get an objective audit of work I already own.
- **US-28** As a learner, I want a structured audit report with category scores, identified issues, and concrete how-to-fix steps, so I can act on the feedback without further interpretation.
- **US-29** As a learner, I want to see my past audits in one place, so I can track my projects and revisit prior reports.
- **US-30** As a visitor on the landing page, I want a clear path to the audit feature, so I can experience the platform's value before (or instead of) committing to a full learning path.

### 4.9 AI Mentor Chat (F12 — added 2026-05-07)

- **US-31** As a learner, after receiving feedback on a submission or audit, I want to ask follow-up questions in a side-panel chat (e.g., "why is line 42 a security risk?", "show me how to refactor this method") so I can understand the feedback deeply enough to act on it.
- **US-32** As a learner, I want the mentor's answers to reference my actual code (not generic advice) so the explanations are specific to what I submitted.
- **US-33** As a learner, I want my chat history per submission and per audit to persist between visits so I can revisit a past explanation without re-asking.

### 4.10 Multi-Agent Code Review (F13 — added 2026-05-07)

- **US-34** As a learner, I want feedback that goes deeper on security and performance specifically (not just generic comments) so I can act confidently on the most critical concerns.
- **US-35** As a researcher / supervisor (thesis evaluation), I want to compare single-prompt review output vs multi-agent specialist output on the same submission so I can validate which approach better serves learners.

### 4.11 Adaptive AI Assessment Engine (F15 — added 2026-05-14)

- **US-36** As a learner, I want the assessment to pick each next question based on my running ability estimate (not a fixed sequence), so the test stays at the edge of my competence and gives a precise score.
- **US-37** As a learner, after I finish the assessment I want an AI-generated summary (strengths + weaknesses + what to focus on next), so I leave the assessment understanding myself — not just looking at numbers.
- **US-38** As a learner, I want some assessment questions to embed a short code snippet I have to read before answering, so the test reflects real coding comprehension rather than recall trivia.
- **US-39** As an admin, I want to generate batches of new assessment questions via AI (with the AI suggesting calibration parameters) so the bank can scale to 250 questions without per-question hand-authoring.
- **US-40** As an admin, I want to review, edit, approve, or reject every AI-generated question draft before it enters the bank, so quality stays under human control.

### 4.12 AI Learning Path with Continuous Adaptation (F16 — added 2026-05-14)

- **US-41** As a learner, after my assessment I want my learning path generated by AI specifically against my skill gaps, not picked from a fixed template, so the curriculum is targeted at me.
- **US-42** As a learner, on each task I want a short AI-generated framing ("why this matters for you", "focus areas", "common pitfalls") tailored to my profile, so I open each task already oriented.
- **US-43** As a learner, I want my path to adapt as I make progress — re-ordered or with individual tasks swapped — when my submission scores suggest the original plan is no longer optimal.
- **US-44** As a learner, I want to approve the big changes the AI proposes (swaps, big reorders) but let small intra-skill reorders happen automatically, so I keep agency without micromanaging.
- **US-45** As a learner, when I'm halfway through my path I want an optional 10-question mini-reassessment, so I can confirm I'm actually growing before continuing.
- **US-46** As a learner, when I reach 100% of my path I want a graduation page showing my Before/After skill radar + an AI summary of my journey, so the achievement is concrete and motivating.
- **US-47** As a learner, after graduation and a mandatory full reassessment, I want an automatically generated Next Phase Path one difficulty level higher, so the loop continues without me having to "start over".
- **US-48** As an admin, I want to inspect the full adaptation event log (every change the AI proposed, its reason, the learner's decision) so I can audit the system and use the data for thesis analysis.

---

## 5. Features

### 5.1 MVP Features (15 — must-have for defense; F11 added 2026-05-02 per ADR-031 / ADR-032; F12 + F13 added 2026-05-07 per ADR-036 / ADR-037; F15 + F16 added 2026-05-14 per ADR-049)

#### F1. Authentication & Profile Management
**Description:** Secure email/password + GitHub OAuth with JWT-based sessions, password reset, and editable profile.
**User stories served:** US-01 – US-05
**Acceptance criteria:**
- User can register with email/password → account is created with `Role=Learner`, email stored (verification email sent but activation not blocking for MVP).
- User can log in with valid credentials → receives JWT (1h) + refresh token (7d).
- User can log in via GitHub OAuth → on first login, account auto-created linked to GitHub username.
- User can request password reset → receives email with tokenized link valid for 10 minutes.
- User can GET/PATCH `/auth/me` to view/update profile.
- Admin role exists; seeded on startup in dev (username: `admin`).
- 5 failed login attempts in 15 min → account locked for 15 min.
- All endpoints require valid JWT (except `[anon]` marked).
**Out of scope for MVP:** Email verification *enforcement* (we send mail but don't block login on unverified), MFA, passwordless login.

#### F2. Adaptive Assessment
**Description:** 30-question adaptive exam across 5+ skill categories; difficulty adjusts based on running performance.
**User stories served:** US-06 – US-09
**Acceptance criteria:**
- Question bank seeded with ≥60 questions (≥12 per category, difficulty levels 1–3).
- Starting question is medium-difficulty, random from user's selected track.
- Algorithm: 2+ consecutive correct in category → escalate difficulty; 2 consecutive wrong → de-escalate; maintain category balance (no category >30% of questions).
- 40-minute session timeout; unanswered questions auto-marked incorrect.
- On completion: scoring per category (0–100), overall level (Beginner <60, Intermediate 60–79, Advanced ≥80), data persisted, result page rendered within 2s.
- Learner can retake after 30 days (policy check on `POST /assessments`).
**Out of scope for MVP:** True IRT parameter estimation, AI-generated assessment feedback, adaptive category weighting.

#### F3. Personalized Learning Path
**Description:** Auto-generated, ordered task sequence per user based on assessment + track choice.
**User stories served:** US-10, US-11, US-13
**Acceptance criteria:**
- On assessment completion → `GenerateLearningPathJob` enqueued → within 30s a `LearningPath` exists for the user with ordered `PathTasks`.
- Path template logic: weakest category's tasks placed first; overall difficulty matches user level.
- Frontend `GET /learning-paths/me/active` returns path with task titles, ordinals, status.
- Learner can mark a task `InProgress` before submitting to it.
- Learner can add a recommended task (from a submission's feedback) to the end of their path.
- Path `ProgressPercent` auto-updates on task completion.
**Out of scope for MVP:** Re-ordering tasks, removing tasks, multiple simultaneous paths.

#### F4. Task Library
**Description:** Curated catalog of ~20 real-world coding tasks across 3 tracks.
**User stories served:** US-12
**Acceptance criteria:**
- ≥21 tasks seeded (7 per track × 3 tracks: Full Stack, Backend, Python).
- Each task has: title, markdown description, difficulty, category, expected language, estimated hours, prerequisites (optional).
- `GET /tasks` supports filters: `track`, `difficulty`, `category`, `language`, `search` (title contains).
- Task detail page renders markdown description safely (no XSS).
- Soft-delete via `IsActive=false`.
**Out of scope:** Task versioning, user-suggested tasks, rich media (video walkthroughs).

#### F5. Code Submission
**Description:** Accept submissions via GitHub URL or direct ZIP upload.
**User stories served:** US-14, US-15, US-16, US-20
**Acceptance criteria:**
- Learner can submit via GitHub URL → backend validates accessibility (using learner's OAuth token if private).
- Learner can submit via ZIP upload → frontend gets pre-signed Blob URL → uploads → notifies backend.
- ZIP ≤50MB enforced; unsupported file types rejected in AI service.
- Each submission creates a `Submission` row and enqueues analysis job.
- Status transitions: `Pending → Processing → Completed | Failed` observable via `GET /submissions/{id}`.
- Failed submission exposes `ErrorMessage` and is retryable via `POST /submissions/{id}/retry`.
- User can see their last 50 submissions via `GET /submissions/me`.
**Out of scope:** Multi-file inline editing in browser, pull-request-style diff between attempts, auto-submit on git push (webhooks).

#### F6. Multi-Layered Analysis Pipeline
**Description:** Backend worker orchestrates static analysis + AI review via the AI service, stores and aggregates results.
**User stories served:** US-17, US-18
**Acceptance criteria:**
- `SubmissionAnalysisJob` runs in Hangfire with 3-retry exponential backoff.
- Job calls AI service `/api/analyze-zip` (or GitHub clone then `/api/analyze`) for static analysis — results stored per tool in `StaticAnalysisResults`.
- Job calls AI service `/api/ai-review` with code + task context + static summary — result stored in `AIAnalysisResults`.
- `FeedbackAggregator` produces unified payload: overall 0–100 score, per-category (correctness, readability, security, performance, design) scores, strengths (list), weaknesses (list), inline annotations (per file/line), 3–5 recommended tasks, 3–5 learning resources.
- Full pipeline p95 ≤5 minutes; hard timeout 10 minutes → `Failed`.
- If AI service unreachable: static results saved, AI flagged `Unavailable`, retry in 15 min (once).
**Out of scope:** Real-time progress streaming (SSE), side-by-side attempt comparison, cross-submission trend analysis inside the feedback view.

#### F7. Feedback Report UI
**Description:** Frontend view that renders aggregated feedback clearly and interactively.
**User stories served:** US-17, US-18, US-19
**Acceptance criteria:**
- On `/submissions/:id` render:
  - Status banner (Processing / Completed / Failed + timestamps)
  - Overall score (gauge or large number)
  - Per-category scores (radar chart via Recharts)
  - Strengths + weaknesses (bullet lists)
  - Inline annotations: file tree → click file → syntax-highlighted code (Prism.js) with inline comment markers
  - Recommended tasks: clickable cards → "Add to my path" button
  - Resources: external links in new tab
- "Submit new attempt" button returns user to the task's submission screen with attempt counter incremented.
- Responsive layout (mobile ≥320px, desktop ≥1024px).
**Out of scope:** Full-file in-browser editor, PDF export of feedback report, sharing feedback publicly.

#### F8. Learner Dashboard
**Description:** Single-page summary of the learner's current state.
**User stories served:** US-24
**Acceptance criteria:**
- `/dashboard` renders:
  - Welcome banner with user name + current track
  - Active path progress bar + "next task" CTA
  - Last 5 submissions (task, status, score, timestamp) — clickable to feedback
  - Skill snapshot (5 key categories, score bar each) from `SkillScores`
  - Learning CV quick link
- All data fetched in a single `GET /dashboard/me` call (server aggregates) — p95 <500ms.
**Out of scope:** Customizable widgets, streak/XP display in MVP dashboard (stretch).

#### F9. Admin Panel — Task & Question Bank CRUD
**Description:** Minimal admin UI for managing content.
**User stories served:** US-25, US-26
**Acceptance criteria:**
- `/admin` route, guarded by `RequireAdmin` policy; non-admin → 403 page.
- Tasks: list view (paginated, filterable) + create/edit modal (title, description markdown, difficulty, category, expected language, estimated hours, prerequisites JSON, isActive toggle).
- Questions: similar list + create/edit modal (content, difficulty, category, 4 options, correct answer, explanation).
- All writes audited (AuditLogs populated).
- Changes to task catalog bust Redis cache.
**Out of scope:** Bulk import (CSV/JSON), media uploads for task descriptions, question preview mode, track/path template editor.

#### F10. Learning CV
**Description:** Auto-generated, shareable profile of verified skills and project history with PDF export.
**User stories served:** US-21, US-22, US-23
**Acceptance criteria:**
- `GET /learning-cv/me` generates (or refreshes) CV data: user profile, per-category skill scores, 5 highest-scored submissions (as "verified projects"), overall level, completion badges (if stretch shipped — else hidden).
- CV has a unique `PublicSlug` (e.g., `/cv/learner-a1b2c3`).
- `PATCH /learning-cv/me` with `{ isPublic: true|false }` toggles visibility.
- `GET /public/cv/{slug}` is anonymous; when `IsPublic=false` → 404; when true → redacted view (no email, no internal metadata).
- `GET /learning-cv/me/pdf` streams a polished PDF (either ReportLab via AI service or QuestPDF in backend — decision in Sprint 7).
- `ViewCount` increments on each public view (IP-deduped for 24h).
**Out of scope:** Editing CV content manually (projects shown are AI-verified from submissions only), multiple CV templates, CV-per-track (one CV per user).

#### F11. Project Audit (Standalone)
**Description:** A standalone, learning-path-independent feature that lets any authenticated user upload a personal project (GitHub URL or ZIP) plus a structured description, and receive a comprehensive AI-driven audit. The entry point is the public Landing page (login-redirect for unauthenticated visitors), giving the platform a try-the-product story alongside the deeper learning loop.
**User stories served:** US-27 – US-30
**Acceptance criteria:**
- Authenticated user can access `/audit/new` from a Landing-page CTA, an authenticated nav link, or a deep-link.
- The audit form has 6 required fields (Project Name, One-line Summary, Detailed Description, Project Type, Tech Stack, Main Features) and 3 optional fields (Target Audience, Focus Areas, Known Issues); validated client-side + server-side via FluentValidation.
- Code source: GitHub URL (validated via stored OAuth token for private repos) **or** ZIP upload via pre-signed Azure Blob URL.
- Project size limit: 50MB ZIP / repo total enforced before job enqueue.
- Rate limit: 3 audits per 24h per authenticated user → 4th attempt → 429 with `Retry-After`.
- On submit → backend creates `ProjectAudit` row, enqueues `ProjectAuditJob`, returns 202 with auditId; user redirected to `/audit/:id` showing live status.
- `ProjectAuditJob` runs: fetch code → AI-service `/api/analyze-zip` (static analysis) → AI-service `/api/project-audit` (LLM audit with project description + static summary) → save results.
- Audit report renders 8 sections: Overall Score (0–100, A–F grade), Score Breakdown (6 categories — CodeQuality, Security, Performance, Architecture & Design, Maintainability, **Completeness**), Strengths, Critical Issues, Warnings, Suggestions, Missing / Incomplete Features (vs description), Recommended Improvements (top-5 prioritized with how-to), Tech Stack Assessment, Inline Annotations (per-file/line drill-down).
- Pipeline p95 ≤ 6 minutes; hard timeout 12 minutes → `Failed`.
- AI service unavailable → static-only audit with `AIReviewStatus = Unavailable`, retry once after 15 min.
- `/audits/me` lists user's audit history with filters (date range, score range), paginated.
- Audit blob retention: 90 days (per ADR-033); metadata permanent.
- Soft delete via `IsDeleted` flag; hidden from list, preserved for analytics.
- Responsive (≥320px mobile, ≥1024px desktop); respects existing Neon & Glass identity.
**Out of scope for MVP:** PDF export of audit report, public sharing of audit reports, version-compare between re-audits of the same project, audit-to-Learning-CV verified-project bridge, anonymous (unauthenticated) audit flow, automatic re-audit on git push, live-streamed pipeline progress (SSE).

#### F12. AI Mentor Chat (RAG-based)
**Description:** Per-submission and per-audit conversational chat panel that lets learners ask follow-up questions about their feedback. Backed by Retrieval-Augmented Generation: the user's code is chunked, embedded via OpenAI `text-embedding-3-small`, indexed in **Qdrant** (new docker-compose service), and retrieved per query to ground LLM responses in the learner's actual code (not generic advice). Streams responses via Server-Sent Events.
**User stories served:** US-31 – US-33
**Acceptance criteria:**
- One `MentorChatSession` per Submission (1:1) and per ProjectAudit (1:1); created lazily on first message.
- Chat panel visible on `/submissions/:id` and `/audit/:id` only when status = `Completed`; hidden / disabled with a clear message otherwise.
- On submission/audit completion, Hangfire job `IndexSubmissionForMentorChatJob` chunks code (semantic boundaries — files, function-level), generates embeddings, upserts into Qdrant with payload `{ scope, scopeId, filePath, startLine, endLine, kind }`.
- `POST /api/mentor-chat/{sessionId}/messages` proxies a streamed RAG response from the AI service: query embedded → top-5 chunks retrieved (filtered to session scope) → prompt with chunks + last 10 turns of history → OpenAI streamed via SSE.
- Frontend renders streaming markdown; preserves code-block syntax highlighting via Prism.
- Conversation history persists in `MentorChatMessages` (role: user|assistant, content, tokens, createdAt). Returned on session load via `GET /api/mentor-chat/{sessionId}`.
- Token caps enforced AI-side: 6k input + 1k output per turn (per ADR-036).
- Graceful degradation: Qdrant unreachable → fall back to "raw context mode" (sends submission/audit feedback JSON instead of retrieved chunks); user sees "limited context" banner. AI service unreachable → "Mentor temporarily unavailable" banner.
- Rate limit: 30 messages per hour per session (Redis sliding window).
- Pipeline p95: chat-turn round-trip ≤ 5 s end-to-end.
- Responsive (≥320 px mobile, ≥1024 px desktop); respects existing Neon & Glass identity (per ADR-030 reverted state).
**Out of scope for MVP:** Cross-session "ask the mentor about my whole history," voice input/TTS output, mentor chat on tasks (only submissions/audits), exporting chat to PDF, embedding-based similar-submission lookup (post-MVP — embeddings re-used by future feature).

#### F13. Multi-Agent Code Review *(thesis A/B; opt-in via env)*
**Description:** Alternate AI-review pipeline that splits the existing single-prompt review (F6) into three specialist agents (security / performance / architecture) running in parallel against the same submission, with an orchestrator merging their outputs into the same `AiReviewResponse` shape the frontend already consumes. Default `AI_REVIEW_MODE=single`; `multi` enabled for thesis evaluation runs and opt-in per-submission demo flag in Sprint 11. Existing `/api/ai-review` endpoint untouched (per ADR-037 — new endpoint `/api/ai-review-multi` parallel to it for the thesis A/B comparison).
**User stories served:** US-34, US-35
**Acceptance criteria:**
- New AI-service endpoint `POST /api/ai-review-multi` operational; existing `/api/ai-review` continues to work unchanged (zero regression on Sprint 5–6 tests).
- Three prompt templates versioned: `prompts/agent_security.v1.txt`, `agent_performance.v1.txt`, `agent_architecture.v1.txt` — each constrained to the categories that agent owns.
- Orchestrator runs the three agents in parallel via `asyncio.gather`, merges outputs into `AiReviewResponse` (strengths/weaknesses concatenated + de-duplicated by Jaccard ≥0.7; inline annotations merged by `(filePath, lineNumber)`).
- Backend env var `AI_REVIEW_MODE=single|multi` selects which AI-service endpoint `SubmissionAnalysisJob` calls; integration tests cover both modes.
- `AIAnalysisResults.PromptVersion` records `multi-agent.v1` when multi mode produced the result.
- Token-cost dashboard splits a third series (`ai-review-multi`) alongside `ai-review` and `project-audit`.
- Thesis evaluation script in `docs/demos/multi-agent-evaluation.md` runs both endpoints over N=15 submissions (5 Python / 5 JavaScript / 5 C#) and produces a comparison table — average per-category scores, response length, token cost, and a manual relevance rubric scored by 2 supervisors blind to mode.
- Per-agent timeout 90 s; if any agent fails, orchestrator returns partial result with a warning flag (`partialAgents: ["security"]`); backend persists with `PromptVersion = multi-agent.v1.partial`.
- Default off in production (cost containment); Sprint 11 demo run is the controlled opt-in.
**Out of scope for MVP:** Five-or-more-agent variants, sequential agent orchestration (architecture summarizes first then specialists), automatic mode-switching based on submission complexity, agent-specific prompt versioning surfaced in the UI, per-agent score breakdowns surfaced to learners (the UI continues to show 5 merged categories — agent specialization is a backend optimization, not a user-visible change in the default mode).

#### F15. Adaptive AI Assessment Engine *(added 2026-05-14; extends F2)*
**Description:** Upgrade F2's static question bank + simple-rule adaptive selection with: AI Question Generator (admin batch tool) producing draft questions with self-rated 2PL IRT parameters; admin review-and-approve workflow; 2PL IRT-lite engine for adaptive item selection (`θ` MLE-estimated, next item maximizes Fisher information); empirical recalibration Hangfire job for items with ≥50 responses; post-assessment AI summary (3-paragraph: strengths, weaknesses, path guidance); optional code-snippet rendering in questions. Existing F2 acceptance criteria are preserved as the fallback path; AI mode is the new default. See `docs/assessment-learning-path.md` §3.2 + §5 for full design, math, and prompts.
**User stories served:** US-36 – US-40
**Acceptance criteria:**
- Question bank grows from ~60 (existing) to **≥150 minimum / 250 target** via the AI Generator + admin review flow (`/admin/questions/generate` + drafts review UI).
- Each `Question` carries `IRT_A`, `IRT_B`, and `CalibrationSource ∈ {AI, Admin, Empirical}`; AI Generator outputs `(a, b)` per item; admin can override during review.
- Adaptive selection: backend `AdaptiveQuestionSelector` delegates to AI service `POST /api/irt/select-next` which returns the unanswered item maximizing Fisher information at the current θ; θ MLE-estimated after every response via `scipy.optimize.minimize_scalar`.
- Post-assessment AI summary generated within **8 s p95** of completion; persisted in `AssessmentSummaries` (full assessments only — mini-reassessments don't trigger summary generation).
- Optional `CodeSnippet` + `CodeLanguage` rendered in the question card via Prism (existing FE component from Sprint 6).
- `RecalibrateIRTJob` (Hangfire, weekly) updates `(a, b)` for items with ≥50 responses via joint MLE; logs to `IRTCalibrationLog`. Target: ≥30 questions empirically calibrated by defense day.
- IRT engine unit-test bar: synthetic learner θ_hat within ±0.3 of θ_true in ≥95% of 100 trials after 30 responses.
- AI-service-unavailable fallback: continue assessment using `LegacyAdaptiveQuestionSelector` (the existing F2 heuristic); flag `IrtFallbackUsed=true` for admin review.
- All AI-generated content carries `PromptVersion` + `TokensInput` + `TokensOutput` on the relevant table for audit + cost tracking.
**Out of scope for MVP:** Auto-from-gaps Bank Health Analyzer (v1.1); 3PL / 4PL IRT or Bayesian KT (thesis future-work); AI per-question feedback during the assessment (blocked per ADR-013, no change); embedding-based question recommendation (post-MVP).

#### F16. AI Learning Path with Continuous Adaptation *(added 2026-05-14; replaces F3 template logic, keeps F3 schema base)*
**Description:** Replace F3's template-based path generation with an AI-driven generator using hybrid retrieval-rerank (embedding-based recall over the task corpus + LLM rerank with full reasoning). Add continuous adaptation that re-shapes the path on signal-driven triggers, optional mini-reassessment at 50%, mandatory full reassessment at 100%, and an automatic Next Phase Path one difficulty level higher. Expanded task library (~50 tasks) with rich metadata: multi-skill tags, learning gain per skill, enforced prerequisites. Per-task AI framing (why-this-matters, focus areas, common pitfalls) cached per learner. See `docs/assessment-learning-path.md` §4 + §7 for full design, sequence diagrams, and adaptation policy.
**User stories served:** US-41 – US-48
**Acceptance criteria:**
- Task library grows from 21 to **≥40 minimum / 50 target** via the AI Task Generator (`/admin/tasks/generate`) + admin review flow; existing 21 tasks backfilled with `SkillTagsJson` + `LearningGainJson` + enforced `Prerequisites` via a one-time migration step.
- `GenerateLearningPathJob` calls AI service `POST /api/generate-path`; hybrid recall (cosine top-20 over `text-embedding-3-small` task vectors) + LLM rerank to 5–10 final tasks with per-task `AIReasoning` + `FocusSkillsJson`; p95 ≤ **15 s**.
- Per-task AI framing via `POST /api/task-framing`, cached in `TaskFramings` with 7-day TTL; visible on the task page above the existing description.
- `PathAdaptationJob` triggers on: (a) every 3 completed `PathTasks`, (b) max category score swing > 10pt, (c) path 100%, (d) on-demand. **Cooldown 24h** bypassed by (c) + (d).
- Signal-driven adaptation scope: swing 10–20 = reorder only (intra-skill); 20–30 = reorder OR single swap; >30 OR Completion100 = reorder OR multiple swaps. **No mid-path full regeneration** — only graduation triggers a full new path.
- **Auto-apply** when `type=reorder AND confidence>0.8 AND intra-skill-area`; **otherwise stage Pending** and surface in proposal modal at `/path`. Pending auto-expires after 7 days.
- Mini reassessment (10 Q at 50% — optional) and Full reassessment (30 Q at 100% — mandatory before Next Phase) both reuse the F15 IRT engine.
- Graduation page `GET /learning-paths/me/graduation` shows: Before/After skill radar (initial vs current `LearnerSkillProfile`), AI journey summary, Full Reassessment CTA. On reassessment complete → `POST /learning-paths/me/next-phase` generates a new `LearningPath` with `Version+=1`, `difficultyBias=+1`, with all prior completed tasks excluded.
- All adaptation cycles write a `PathAdaptationEvents` row with `BeforeStateJson` + `AfterStateJson` + `AIReasoningText` + `ConfidenceScore` + `ActionsJson` (including rejected) + `LearnerDecision`. 100% audit trail.
- AI-service-unavailable fallback for path generation: legacy F3 template logic; `LearningPath.Source = TemplateFallback`. For adaptation: skip cycle, log `LearnerDecision=Expired` with reason.
- Tier-2 dogfood success bar (recorded in `docs/progress.md` after Sprint 21): ≥10 learners complete full loop; avg pre→post +15pt per category; ≥70% Pending-proposal approval rate.
**Out of scope for MVP:** Pin/lock task feature (v1.1 — `POST /learning-paths/me/tasks/{id}/pin` stubbed); AI-generated task content at runtime (always reviewed offline by admin per ADR-049); embedding-based recommendation outside the path (post-MVP); multiple simultaneous active paths.

### 5.2 Stretch Features (target if MVP ready by Sprint 7)

- **SF1. Skill Trend Analytics** — `/analytics/me` with line chart per skill category over time, submission-count-per-week bar chart.
- **SF2. XP + Level + Starter Badges** — award XP for completing assessment, submissions, score thresholds. 5 hand-designed badges (First Submission, First Perfect Category Score, First Learning CV Generated, etc.).
- **SF3. AI Task Recommendations** — `Recommendations` table populated from AI feedback; learner can convert to path additions via `POST /learning-paths/me/tasks/from-recommendation/{id}`.
- **SF4. Feedback Quality Ratings** — thumbs up/down per category on feedback view; data saved for thesis discussion.

### 5.3 Post-MVP Roadmap (named in thesis as future work)

| Area | Deferred item |
|---|---|
| Engagement | Streaks, peer benchmarking, full badge catalog |
| Auth polish | Enforced email verification, MFA, tokenized password reset UX |
| Admin | Advanced analytics, content moderation, system health dashboard |
| Community | Discussion threads per task, peer review |
| AI | Multi-provider (Claude, local Ollama), prompt A/B testing, multi-file contextual understanding, auto-generated refactored examples |
| Infra | Azure Service Bus, split Worker process, full CI/CD pipeline, SonarQube integration, k8s |
| Content | 2 more tracks (Frontend specialist, CS Fundamentals), mobile app |
| Commerce | Pricing tiers, Stripe integration, promo codes |

---

## 6. Tech Stack

See **[decisions.md](decisions.md)** ADR-001 through ADR-008. Summary:

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + Redux Toolkit + React Router v6 + React Hook Form + Zod + Recharts *(ADR-001: keep Vite, not Next.js)*
- **Backend:** ASP.NET Core 8, Clean Architecture, MediatR, FluentValidation, EF Core 8 *(ADR-008)*
- **Database:** SQL Server 2022 (LocalDB dev, Azure SQL prod)
- **Cache:** Redis 7
- **Vector DB:** **Qdrant 1.x** — RAG retrieval store for F12 Mentor Chat *(ADR-036)*
- **Background jobs:** Hangfire, SQL-backed *(ADR-002, not Azure Service Bus)*
- **AI service:** Python/FastAPI + OpenAI GPT-5.1-codex-mini + `text-embedding-3-small` + ESLint/Bandit/Cppcheck/PHPStan/PMD/Roslyn + Qdrant client + **`scipy.optimize` for 2PL IRT-lite engine** + `numpy` for cosine similarity over in-memory task/question embedding cache *(ADR-003, ADR-004, ADR-036, ADR-037, ADR-050, ADR-051, ADR-052)*
- **Storage:** Azurite dev / Azure Blob prod
- **Email:** SendGrid
- **Hosting:** Local-first *(ADR-005)*; Azure deployment **deferred to post-defense** *(ADR-038)* — defense runs on owner's laptop via `docker-compose up`

---

## 7. Architecture

See **[architecture.md](architecture.md)** for full component breakdown, diagrams, data flows (auth, assessment, submission), data model, and API contracts.

One-sentence summary: three services (Frontend, Backend API + in-process Hangfire worker, AI service), SQL Server + Redis + Blob supporting the backend, OpenAI API supporting the AI service. All local via `docker-compose up` for dev; single-step deployment to Azure for final demo.

---

## 8. Non-Functional Requirements

Derived from academic docs section 3.3.2, filtered to the MVP's achievable targets. Deferred NFRs (full uptime SLA, production-grade GDPR, full accessibility cert) noted as post-MVP.

### 8.1 Performance
- API read endpoints p95 ≤300ms; writes ≤500ms (lower than original 200/500ms target — realistic on B1 tier).
- Feedback pipeline total p95 ≤5 minutes; hard cap 10 minutes.
- Frontend FCP ≤2s, LCP ≤3s on B1 backend + Vercel frontend (demo conditions).
- Dashboard endpoint p95 ≤500ms (single-query aggregation).

### 8.2 Security
- PBKDF2 (100k iterations) password hashing (ASP.NET Identity default).
- JWT RS256, refresh-token rotation, HttpOnly cookies for refresh tokens.
- OAuth tokens AES-256 encrypted in DB.
- Rate limits (see architecture.md §7.2).
- Input validation via FluentValidation; no raw SQL (EF Core only).
- XSS protection: frontend renders task descriptions and AI feedback via sanitized markdown (DOMPurify + rehype-sanitize).
- HTTPS enforced in prod; TLS 1.2+ only.
- Secrets via Azure Key Vault (prod) / `.env` + `dotnet user-secrets` (dev). Never committed.
- `SECURITY.md` in repo with incident disclosure policy.

### 8.3 Privacy & Compliance
- **MVP compliance:** "best-effort GDPR-aware" — user can view/edit/delete their account (endpoint stub; actual cascade-delete implemented). Data retention policy documented but not automated.
- **Legal:** Privacy policy and Terms of Service pages shipped with MVP (static content).
- **IP Protection:** Submitted code never used for model training (contractual with OpenAI, noted in ToS).
- GDPR data-portability (export all data as JSON) — deferred to post-MVP.

### 8.4 Accessibility
- **Baseline:** WCAG 2.1 AA on all primary flows (auth, assessment, submission, feedback, dashboard, CV).
- Semantic HTML, ARIA labels on interactive elements, keyboard-navigable.
- Lighthouse accessibility score ≥90 on each primary page.
- Admin panel accessibility target: 80 (lower priority).

### 8.5 Scalability
- **MVP target:** 100 concurrent authenticated users without degradation. Measured with k6 in Sprint 10.
- Backend API is stateless — horizontal scale possible post-MVP (1 instance suffices for MVP).
- Database: SQL Server Basic (5 DTU) sufficient for demo; scale-up path to S1/S2 documented.
- Hangfire: default 20-worker pool on single instance. Split Worker process is post-MVP.

### 8.6 Reliability
- **Uptime target (pre-defense 2-week window):** 99%. Best-effort; not SLA-backed.
- Graceful degradation: AI service outage → static analysis still ships + user sees "AI review unavailable, retrying" banner.
- Backups: Azure SQL automatic daily backups (Basic tier includes 7-day retention).
- Disaster recovery: manual. Post-graduation.

### 8.7 Observability
- Serilog structured JSON logs; Application Insights free tier in prod.
- Key dashboards (must exist before defense):
  1. Request rate + p95 latency per endpoint
  2. Submission pipeline duration (per stage)
  3. OpenAI token consumption / day
  4. Error rate + top 5 exceptions
  5. Hangfire: succeeded/failed/processing jobs

### 8.8 Maintainability
- Clean Architecture layers.
- Cyclomatic complexity <15 per method (enforced via Roslyn analyzer).
- `CodeMentor.Application` unit tests ≥70% line coverage.
- ≥3 integration tests covering: auth flow, submission pipeline happy path, admin task CRUD.
- Swagger/OpenAPI spec auto-published at `/swagger`.
- Conventional commits + PR template + CI (GitHub Actions: build + test on every PR).

### 8.9 Interoperability
- All APIs REST + JSON + `v1` URL prefix (`/api/v1/...`).
- No GraphQL, no gRPC for MVP.
- AI service contract in `architecture.md §6.10`.

### 8.10 Cost Optimization
- AI token caps: max 8k input / 2k output per review.
- Redis cache hit targets: ≥70% on task catalog, ≥85% on session lookups.
- Azure costs target: <$40/month during active demo period; pause non-critical resources after graduation.

---

## 9. Release Milestones

| Milestone | Name | What it means | Target |
|---|---|---|---|
| **M0** | Thin vertical slice | User can register, log in, see empty dashboard. Backend + frontend + DB integrated end-to-end. `docker-compose up` works. | End of Sprint 1 |
| **M1** | Internal demo | Core loop works on one user: assessment → path → task → submission → feedback. Ugly but functional. Supervisors can see progress. | End of Sprint 6 |
| **M2** | MVP complete | 10 MVP features (F1–F10) done + 4 stretch features (SF1–SF4), basic polish, seed data, happy path tested. Running locally. | End of Sprint 8 |
| **M2.5** | F11 Project Audit shipped | F11 end-to-end on the local stack — owner-approved MVP scope expansion | End of Sprint 9 |
| **M3** | Defense-ready *(redefined per ADR-038)* | F12 + F13 shipped, thesis documentation synchronized with implementation, demo script rehearsed twice with supervisors, local stack stable, demo backup video recorded. **Azure deployment deferred to post-defense slot.** | End of Sprint 11 (defense ~1 week later) |
| **M4** | **Adaptive AI Learning System integrated** *(added per ADR-049)* | F15 (Adaptive AI Assessment Engine) + F16 (AI Learning Path with Continuous Adaptation) shipped end-to-end on the local stack. ≥10 dogfood learners completed the full loop (assessment → AI summary → AI path → submissions → adaptation events → graduation → reassessment → next phase). Tier-2 metrics recorded: avg pre→post +15pt per category, ≥70% Pending-proposal approval rate, ≥30 questions empirically calibrated. Thesis chapter draft for F15/F16 in place. Defense demo extended from 5-min loop to 8-min flagship loop. | End of Sprint 21 |

> **Note (2026-05-02):** F11 (Project Audit) ships in the new Sprint 9 inserted between M2 (achieved with F1–F10) and what was originally Azure deployment. M3 sprint mapping shifted from end-of-Sprint-10 to end-of-Sprint-11 to absorb the 2-week insertion. Hard deadlines updated: rehearsal 2026-09-07 → 2026-09-21; final defense target 2026-09-15 → 2026-09-29. See ADR-032.

> **Note (2026-05-07):** Per ADR-036 / ADR-037 / ADR-038, Sprint 10 + Sprint 11 are re-scoped: Sprint 10 ships F12 (RAG Mentor Chat + Qdrant); Sprint 11 ships F13 (Multi-Agent Review) plus thesis sync, defense rehearsals, polish, and a local-stack load test. **Azure deployment work is deferred to a Post-Defense slot** — the defense runs on the owner's laptop. See ADR-038 for rationale and the deferred Azure task list. M3 redefined accordingly.

> **Note (2026-05-14):** Per ADR-049, F15 + F16 (Adaptive AI Learning System) are added as MVP scope to differentiate the project at defense. New milestone **M4** introduced, mapped to end of Sprint 21 (~ 2026-08-20). M3 remains as the "core defense-ready" state (F1–F14 shipped, rehearsals done); M4 is the "flagship-features defense-ready" state. Defense window stays 2026-09-24 → 2026-10-04 per ADR-032; buffer of ~5 weeks between M4 and defense covers dogfood data collection + supervisor rehearsals + thesis writing. The 7-sprint plan (S15 → S21) runs in parallel with the M3 supervisor rehearsals (S11-T12 + S11-T13). See ADR-049 and `docs/assessment-learning-path.md` for full design.

---

## 10. Open Questions

1. Which PDF generator for Learning CV — ReportLab (reuse AI service) vs QuestPDF (.NET-native)? **Decision in Sprint 7.**
2. Do we ship a minimal sign-up email verification *enforcement* for the defense demo, or rely on admin-seeded test accounts? **Decision in Sprint 2.**
3. Final task-seeding content — who writes the 21 task descriptions + 60 assessment questions? **Likely the whole team; plan is to split by track + review. Owner needed by Sprint 3.**
4. Demo video production — will there be a pre-recorded video for the defense, or live demo only? **Owner and plan by end of Sprint 8.**

---

## 11. Change Log

| Date | Version | Change | Reason |
|---|---|---|---|
| 2026-04-20 | 1.0 | Initial PRD | Product-architect skill session; consolidates academic documentation + ADRs |
| 2026-05-02 | 1.1 | Add F11 (Project Audit) MVP feature; §4.8 user stories US-27–US-30; §5.1 MVP count 10 → 11; §9 M3 sprint mapping Sprint 10 → Sprint 11; Appendix A note on post-doc scope addition | Owner-approved MVP scope expansion; new Sprint 9 inserted (ADR-031 / ADR-032 / ADR-033 / ADR-034) |
| 2026-05-07 | 1.2 | Add F12 (AI Mentor Chat — RAG-based with Qdrant) + F13 (Multi-Agent Code Review); §4.9 + §4.10 user stories US-31–US-35; §5.1 MVP count 11 → 13; §6 tech stack adds Qdrant + `text-embedding-3-small`; §9 M3 redefined (Azure deployment deferred to post-defense slot — defense runs locally on owner's laptop); Appendix A row added | Owner-approved differentiation features for portfolio + thesis depth; Azure deferral rationale per ADR-038 (ADR-036 / ADR-037 / ADR-038) |
| 2026-05-14 | 1.3 | Add F15 (Adaptive AI Assessment Engine — 2PL IRT-lite + AI Question Generator + post-assessment summary + bank expansion to ≥150/250) + F16 (AI Learning Path with Continuous Adaptation — hybrid embedding-recall + LLM-rerank + signal-driven adaptation + graduation→reassessment→next-phase loop); §4.11 + §4.12 user stories US-36–US-48; §5.1 MVP count 13 → 15; §6 tech stack adds `scipy.optimize` + `numpy` for IRT engine; §9 new milestone M4 mapped to end of Sprint 21; Appendix A rows added for FR-IRT, FR-PATH-AI, FR-ADAPT; supersedes existing F2 + F3 acceptance criteria with AI mode as default + legacy as fallback | Owner-approved defense-day flagship feature; "كامل من كل الجوانب وفعال" mandate; full design + math + sequence diagrams in new file `docs/assessment-learning-path.md`; rationale per ADR-049 / ADR-050 / ADR-051 / ADR-052 / ADR-053 / ADR-054 |

---

## Appendix A — Mapping to academic document requirements

Tracing from academic FR/NFR IDs to PRD features, to keep thesis documentation traceable:

| Academic FR | PRD Feature | Notes |
|---|---|---|
| FR-AUTH-01 – 08 | F1 | FR-AUTH-03 (email verification enforcement) deferred to post-MVP |
| FR-ASSESS-01 – 08 | F2 | FR-ASSESS-06 (AI feedback on assessment) deferred to post-MVP |
| FR-PATH-01 – 06 | F3 | FR-PATH-06 (re-order path tasks) deferred to post-MVP |
| FR-SUB-01 – 12 | F5, F6 | FR-SUB-11 (diff between attempts), FR-SUB-12 (push notifications) deferred |
| FR-FEED-01 – 06 | F6, F7 | FR-FEED-05 (rating) → stretch SF4; FR-FEED-06 email notifications → simple in-app only for MVP |
| FR-GAME-01 – 07 | F10 (CV subset) + SF1–SF2 | Most gamification deferred; Learning CV promoted to MVP F10 |
| FR-ADMIN-01 – 07 | F9 + deferred | Only Task/Question CRUD + basic user view ships; rest deferred |
| _no academic FR — post-doc addition_ | F11 | Project Audit approved 2026-05-02 as MVP scope expansion (ADR-031); thesis future-work section will note the feature is included beyond original Phase-1 scope |
| _no academic FR — post-doc addition_ | F12 | AI Mentor Chat (RAG + Qdrant) approved 2026-05-07 as MVP differentiation feature (ADR-036); thesis evaluation chapter on RAG retrieval quality (single-prompt baseline vs RAG-grounded chat) is the AI/ML depth contribution |
| _no academic FR — post-doc addition_ | F13 | Multi-Agent Code Review approved 2026-05-07 as MVP differentiation feature (ADR-037); thesis evaluation chapter on prompt architecture (single-prompt vs three-specialist orchestration) — N=15 controlled experiment |
| FR-ASSESS-06 *(promoted from deferred)* + new FR-IRT-01 – 06 | F15 | F15 promotes FR-ASSESS-06 (AI feedback on assessment) from "deferred to post-MVP" → MVP, delivered as the post-assessment AI summary (3 paragraphs: strengths / weaknesses / path guidance). New FR-IRT-01 – 06 added to cover the 2PL IRT-lite engine, AI Question Generator, admin review workflow, empirical recalibration job, code-snippet rendering, and bank expansion. Approved 2026-05-14 (ADR-049 / ADR-050 / ADR-051) |
| FR-PATH-AI-01 – 09 + FR-ADAPT-01 – 06 | F16 | New FR axes for the AI-driven path side: AI Path Generator (hybrid embedding-recall + LLM-rerank), rich task metadata + library expansion, per-task AI framing, signal-driven continuous adaptation, cooldown + anti-thrashing, learner approval flow, mini- and full-reassessment, graduation → Next Phase Path. Approved 2026-05-14 (ADR-049 / ADR-052 / ADR-053 / ADR-054). Thesis chapter "Hybrid Retrieval-Rerank for Curriculum Generation + Continuous Adaptation" is the AI/ML depth contribution alongside F12's RAG chapter |

Every MVP acceptance criterion in §5.1 must map to at least one sprint task in `implementation-plan.md` (§6 of that file).
