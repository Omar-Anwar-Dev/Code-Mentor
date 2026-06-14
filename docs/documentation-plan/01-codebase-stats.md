# Codebase Statistics — Code Mentor

> مرجع للأرقام الدقيقة من الكود الفعلي.
> آخر تحديث: 2026-06-03 (post M4 close)

---

## Backend (.NET 10 — Clean Architecture)

### Domain Layer (41 .cs files, 12 logical domains)

| Domain | Files | Key Entities |
|--------|-------|-------------|
| Assessments | 7 | Assessment, AssessmentResponse, AssessmentSummary, Question, QuestionDraft, IRTCalibrationLog, Enums |
| Audit | 1 | AuditLog |
| Gamification | 3 | Badge, UserBadge, XpTransaction |
| LearningCV | 1 | LearningCV |
| MentorChat | 3 | MentorChatSession, MentorChatMessage, Enums |
| Notifications | 1 | Notification |
| ProjectAudits | 4 | ProjectAudit, ProjectAuditResult, AuditStaticAnalysisResult, Enums |
| Skills | 4 | SkillScore, CodeQualityScore, CodeQualityCategory, LearnerSkillProfile |
| Submissions | 7 | Submission, AIAnalysisResult, StaticAnalysisResult, FeedbackRating, Recommendation, Resource, Enums |
| Tasks | 7 | TaskItem, LearningPath, PathTask, PathAdaptationEvent, TaskDraft, TaskFraming, Enums |
| Users | 3 | UserSettings, UserAccountDeletionRequest, EmailDelivery |

### Application Layer
- Service interfaces, DTOs, FluentValidation validators
- MediatR command/query handlers
- References Domain only

### Infrastructure Layer
- EF Core 10 DbContext (38 DbSet<T> declarations)
- ASP.NET Identity (ApplicationUser, ApplicationRole, RefreshToken, OAuthToken)
- Refit AI service clients
- Hangfire background jobs
- 34 EF migrations across 21 sprints

### API Layer
- 19 REST controllers
- JWT RS256 authentication
- Rate limiting policies
- Swagger/OpenAPI documentation

### Test Suite

| Project | .cs Files | Test Count | Frameworks |
|---------|-----------|------------|------------|
| Domain.Tests | 1 | 1 | xUnit |
| Application.Tests | 57 | 456 | xUnit + Moq + AutoFixture |
| Api.IntegrationTests | 73 | 317 | xUnit + WebApplicationFactory + Testcontainers |
| **Total** | **131** | **774** | |

### CI/CD
- `backend-ci.yml` — GitHub Actions workflow

---

## AI Service (Python 3.14 + FastAPI)

### Service Files (28 files in `app/services/`)

| Category | Files | Purpose |
|----------|-------|---------|
| **Static Analyzers** | eslint_analyzer.py, bandit_analyzer.py, cpp_analyzer.py, csharp_analyzer.py, java_analyzer.py, php_analyzer.py | 6 language-specific analyzers |
| **Code Review** | ai_reviewer.py (19KB), multi_agent.py (29KB), prompts.py (25KB) | Single + Multi-agent review |
| **Project Audit** | project_auditor.py (13KB), audit_prompts.py (10KB) | F11 standalone audit |
| **Mentor Chat** | mentor_chat.py (15KB) | F12 RAG-grounded chat |
| **IRT Engine** | assessment_summarizer.py (17KB), question_generator.py (17KB) | F15 adaptive assessment |
| **Path Generator** | path_generator.py (27KB), path_adaptation.py (26KB), path_topology.py (5KB), task_framing.py (11KB), task_generator.py (13KB), task_embeddings_cache.py (7KB) | F16 AI learning paths |
| **RAG/Embeddings** | embeddings_chunker.py (5KB), embeddings_indexer.py (9KB), qdrant_repo.py (9KB) | Vector search infrastructure |
| **Utilities** | zip_processor.py (14KB), pdf_generator.py (42KB), analysis_orchestrator.py (6KB), analyzer_base.py (1KB) | Shared utilities |

### Prompt Templates
- `prompts/agent_security.v1.txt` — Security specialist agent
- `prompts/agent_performance.v1.txt` — Performance specialist agent  
- `prompts/agent_architecture.v1.txt` — Architecture specialist agent
- Additional inline prompts in: prompts.py, audit_prompts.py, assessment_summarizer.py, path_generator.py, etc.

### API Endpoints (~12+ across 9 router groups)
- `/api/analyze-zip` — Single-agent code review
- `/api/analyze-zip-multi` — Multi-agent code review (F13)
- `/api/project-audit` — Project audit (F11)
- `/api/mentor-chat` — RAG chat (F12) with SSE streaming
- `/api/irt/select-next` — IRT item selection (F15)
- `/api/assessment-summary` — Post-assessment AI summary
- `/api/generate-path` — AI path generation (F16)
- `/api/adapt-path` — Path adaptation (F16)
- `/api/task-framing` — Task AI framing
- `/api/admin/questions/generate` — AI question generation
- `/api/admin/tasks/generate` — AI task generation
- `/api/embeddings/index` — RAG indexing

---

## Frontend (Vite 6 + React 18 + TypeScript)

### Feature Folders (21 areas in `src/features/`)

| Category | Features |
|----------|----------|
| **Core Learning** | assessment, learning-path, tasks, submissions, dashboard |
| **AI-Powered** | mentor-chat, audits |
| **Profile & CV** | learning-cv, profile, settings |
| **Platform** | admin, notifications, achievements, gamification, analytics, activity |
| **Auth** | auth, landing, legal, errors |
| **Shared** | ui (shared components library) |

### Key Technologies
- Redux Toolkit — global state
- React Hook Form + Zod — form validation
- Recharts — skill radar charts
- Prism.js — syntax highlighting
- Framer Motion — animations
- react-markdown + remark-gfm — markdown rendering
- SSE (EventSource) — mentor chat streaming

---

## Infrastructure

### Docker Compose (7 services)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| sqlserver | mcr.microsoft.com/mssql/server:2022-latest | 1433 | Primary database |
| redis | redis:7-alpine | 6379 | Cache + rate limiting |
| qdrant | qdrant/qdrant:v1.13.4 | 6333/6334 | Vector DB (RAG + path) |
| azurite | azure-storage/azurite | 10000 | Blob storage emulator |
| seq | datalust/seq | 5341/5342 | Log viewer |
| mailhog | mailhog/mailhog | 1025/8025 | Email capture |
| ai-service | custom Dockerfile | 8000 | FastAPI + analyzers |

### External Services
- GitHub OAuth + API (authentication + code fetch)
- OpenAI API (gpt-5.1-codex-mini + text-embedding-3-small)
- SendGrid (production email — MailHog in dev)

---

## Documentation Corpus

| File | Size | Role |
|------|------|------|
| PRD.md | 52 KB | Product requirements |
| architecture.md | 62 KB | System architecture |
| implementation-plan.md | 164 KB | 22 sprints task lists |
| decisions.md | 218 KB | 62 ADRs |
| progress.md | 824 KB | Sprint execution log |
| design-system.md | 22 KB | UI tokens + principles |
| assessment-learning-path.md | 56 KB | F2+F15+F16 detail |
| thesis-chapters/f15-f16-adaptive-ai-learning.md | 30 KB | IRT + Path deep-dive |
| thesis-technical-appendix.md | 17 KB | Technical appendix |
| mvp-bugs.md | 21 KB | Bug tracking |

### Key Metrics Summary

| Metric | Value |
|--------|-------|
| Features shipped | 15 (F1–F16, F14 is refinement of F6) + 4 stretch |
| ADRs | 62 |
| Backend tests | 774 passing |
| Domain entities | 41 files / 12 domains |
| DB tables (app-owned) | 38 |
| EF migrations | 34 |
| AI service files | 28 |
| Frontend features | 21 folders |
| Docker services | 7 |
| Sprints completed | 21 |
| Calendar duration | 9 months (Oct 2025 – Jun 2026) |
| Question bank | 207 / target 250 |
| Task library | 50 |
| Prompt templates | 18+ |
