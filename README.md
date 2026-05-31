# Code Mentor

**AI-Powered Code Review & Learning Platform**

> Graduation project — Faculty of Computers and Artificial Intelligence,
> Benha University · Class of 2026.

Code Mentor is an intelligent learning platform that simulates the
experience of working under a senior developer. It combines **adaptive
skill assessment** (IRT 2PL), **AI-personalized learning paths** (hybrid
embedding recall + LLM rerank), and **multi-agent code review** (three
parallel specialist agents) to bridge the gap between academic learning
and real-world job requirements — delivering senior-level code feedback
in under 5 minutes.

The platform ingests a learner's code submission (GitHub URL or ZIP),
runs six static analyzers in parallel, then routes the code to an LLM
review pipeline across **six quality axes** (correctness, readability,
security, performance, design, task-fit). The output: a detailed report
with line-by-line annotations, a **RAG-powered Mentor Chat** grounded in
the learner's actual code, and a project-level audit feature for senior
reviews of entire repositories.

[![Backend CI](https://github.com/Omar-Anwar-Dev/Code-Mentor/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Omar-Anwar-Dev/Code-Mentor/actions/workflows/backend-ci.yml)
![Tests](https://img.shields.io/badge/tests-488_passing-green)
![Features](https://img.shields.io/badge/features-15_shipped-blue)
![Backend](https://img.shields.io/badge/.NET-10-512BD4)
![Frontend](https://img.shields.io/badge/React-18-61DAFB)
![AI Service](https://img.shields.io/badge/FastAPI-Python_3.14-009688)
![AI Endpoints](https://img.shields.io/badge/AI_endpoints-12+-7c3aed)

---

## Table of contents

- [Features](#features)
- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Repository layout](#repository-layout)
- [Documentation](#documentation)
- [Testing](#testing)
- [Team & supervisors](#team--supervisors)

---

## Features

The platform ships **15 features** (13 MVP + 2 stretch) across four functional clusters:

### Learner journey
1. **Authentication & profile (F1)** — email/password + GitHub OAuth, JWT RS256 sessions, refresh tokens, rate limiting, password reset, editable profile
2. **Adaptive assessment (F2 + F15)** — 30-question IRT 2PL exam across 5 skill categories. Fisher Information selects the optimal next question based on the learner's running ability estimate (θ). Includes AI question generation and a 3-stage calibration pipeline (AI-estimate → admin review → data-driven recalibration)
3. **Personalized learning path (F3)** — hybrid AI generation: `text-embedding-3-small` embeds the learner profile → cosine recall of top-20 candidate tasks → `GPT-5.1-codex-mini` reranks into a 5-10 task curriculum with prerequisite topology validation
4. **Continuous path adaptation (F16)** — signal-driven: every 3 tasks, score swing >10, path completion, or on-demand → the path is re-evaluated and adapted to the learner's evolving profile
5. **Code submission pipeline (F5)** — GitHub URL or ZIP upload, automatic file extraction, language detection, with file-size and character limits to manage AI token costs

### AI-driven feedback
6. **AI code review (F6)** — two-layer pipeline: Layer 1 runs six static analyzers in parallel (ESLint, Bandit, Cppcheck, PHPStan, PMD, Roslyn); Layer 2 sends code + user history + static results to an LLM that reviews across **six axes: correctness / readability / security / performance / design / task-fit**
7. **Multi-Agent Code Review (F13)** — three specialist agents (🛡️ Security / ⚡ Performance / 🏗️ Architecture) run in parallel via `asyncio.gather`, then merge results with Jaccard similarity deduplication (≥0.7). 90-second timeout per agent with partial-result fallback
8. **Smart recommendations** — after each review, the system updates the learner's skill profile, suggests targeted learning resources, and triggers path adaptation
9. **Feedback display (F7)** — rich review report with per-file annotations, severity badges, code snippets with Prism syntax highlighting, and radar charts
10. **RAG Mentor Chat (F12)** — context-aware chat grounded in the learner's actual submitted code via Qdrant vector retrieval. SSE-streamed responses with graceful raw-fallback when retrieval is unavailable. Answers reference specific file paths and line numbers

### Platform features
11. **Project Audit (F11)** — senior-level audit pipeline for existing projects. 8-section structured report with completeness analysis (compares declared features against the actual code)
12. **Learning CV (F10)** — shareable, dynamic profile with a public URL showcasing verified skills, code-quality scores, and project history
13. **Notifications (F8)** — feedback-ready bell + persistent notification history
14. **Admin panel (F9)** — task / question / user / audit-log management with IRT calibration heatmaps and cache-invalidation hooks
15. **Achievements & badges (SF1-2)** — gamification with XP, levels, learning streaks, and milestone badges

---

## Architecture overview

```
+--------------+       +-----------------+       +----------------+
|   Frontend   | ---> |  Backend (.NET)  | ---> |  AI Service    |
| React + Vite |       |  ASP.NET Core 10 |       |  FastAPI       |
+--------------+       |  Hangfire jobs   |       |  + OpenAI       |
                       +--------+---------+       +-------+--------+
                                |                         |
                                v                         v
                       +--------+---------+       +-------+--------+
                       |  SQL Server 2022 |       |  Static tools  |
                       |  Redis 7         |       |  ESLint Bandit |
                       |  Azurite (blob)  |       |  Cppcheck PMD  |
                       |  Seq (logs)      |       |  PHPStan Roslyn|
                       +------------------+       |  + Qdrant (RAG)|
                                                  +----------------+
```

**Backend** follows Clean Architecture with four projects:

```
CodeMentor.Domain         <- entities, enums, value objects (zero references)
       ^
       |
CodeMentor.Application    <- service interfaces, DTOs, validation
       ^
       |
CodeMentor.Infrastructure <- EF Core, Identity, Refit, Hangfire, AI clients
       ^
       |
CodeMentor.Api            <- controllers, middleware, DI composition
```

The AI service runs each language-specific static analyzer in parallel,
combines results with an LLM review (single-agent or multi-agent), and
ships the merged response back through a Refit-typed boundary.
**38 ADRs** (in `docs/decisions.md`) record every non-trivial design
decision.

### Key metrics

| Metric | Value |
|---|---|
| IRT θ estimation accuracy | ±0.5 in 95%+ of trials (Monte-Carlo validated) |
| Code review latency | ≤ 5 min per submission |
| Mentor Chat first-token | ≤ 3 seconds (p95) |
| Path generation | ≤ 15 seconds end-to-end |
| Question bank | 250+ questions across 5 categories |
| Task library | 50+ tasks across multiple tracks |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS, Redux Toolkit, Framer Motion, Recharts, react-markdown + remark-gfm, Prism syntax highlighting, React Hook Form + Zod |
| **Backend** | .NET 10, ASP.NET Core, EF Core 10, MediatR (CQRS), FluentValidation, Hangfire, Serilog, Refit, ASP.NET Identity, JWT (RS256) |
| **AI Service** | Python 3.14, FastAPI, Pydantic 2, OpenAI SDK, SciPy (IRT MLE), NumPy, Qdrant client |
| **Database** | SQL Server 2022 (primary), Redis 7 (cache + rate limit), Azurite (blob emulator), Qdrant 1.13 (vectors) |
| **Observability** | Seq (structured logs), RFC 7807 ProblemDetails, correlation IDs end-to-end |
| **Static analyzers** | ESLint, Bandit, Cppcheck, PHPStan, PMD, Roslyn |
| **AI provider** | OpenAI `gpt-5.1-codex-mini` for code review + `text-embedding-3-small` for retrieval |
| **External services** | GitHub OAuth + API, OpenAI API, SendGrid (email) |
| **Testing** | xUnit + WebApplicationFactory (backend), pytest (AI service) — 488 tests across the stack |

---

## Quick start

> **Detailed setup with troubleshooting**: see [`TEAMMATE-SETUP.md`](TEAMMATE-SETUP.md)
> — covers prerequisites, OpenAI key configuration, and 9 known
> issues with their fixes.

### Prerequisites

| Tool | Version |
|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | latest |
| [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | 10.0+ |
| [Node.js](https://nodejs.org) | 20 LTS+ |
| OpenAI API key | with `gpt-5.1-codex-mini` access |

### Setup (one-time)

```bash
# 1. Clone the repo
git clone https://github.com/Omar-Anwar-Dev/Code-Mentor.git
cd Code-Mentor

# 2. Configure secrets
cp .env.example .env
# Open .env and set OPENAI_API_KEY=sk-... (your real key)
```

### Run (3 windows)

```powershell
# Window 1: Infrastructure (one-time start, then leaves running)
docker-compose up -d --build

# Window 2: Backend (.NET API on :5000)
cd backend
dotnet run --project src/CodeMentor.Api

# Window 3: Frontend (Vite on :5173)
cd frontend
npm install
npm run dev
```

### First-time data seed

```powershell
# Stop the backend (Ctrl+C in Window 2), then:
cd backend
dotnet run --project src/CodeMentor.Api -- seed-demo

# Then restart the backend normally
dotnet run --project src/CodeMentor.Api
```

### Verify

- Backend health: `curl http://localhost:5000/health` → `{"status":"Healthy",...}`
- Frontend: open http://localhost:5173 in a browser
- Sign in with the demo learner credentials below

---

## Demo accounts

`seed-demo` provisions a deterministic baseline so anyone can explore
the platform immediately:

| Role | Email | Password |
|---|---|---|
| **Demo Learner** | `learner@codementor.local` | `Demo_Learner_123!` |
| **Admin** | `admin@codementor.local` | `Admin_Dev_123!` |

The demo learner has a completed assessment, a 5-skill radar profile,
and an active learning path with 3 tasks at varying progress states.

---

## Repository layout

```
Code-Mentor/
├── backend/                       .NET 10 solution (Clean Architecture)
│   ├── CodeMentor.slnx
│   ├── src/
│   │   ├── CodeMentor.Domain/             entities, value objects
│   │   ├── CodeMentor.Application/        interfaces, DTOs
│   │   ├── CodeMentor.Infrastructure/     EF Core, Identity, AI clients, Hangfire
│   │   └── CodeMentor.Api/                controllers, middleware, DI
│   └── tests/
│       ├── CodeMentor.Domain.Tests/       1 test
│       ├── CodeMentor.Application.Tests/  228 tests
│       └── CodeMentor.Api.IntegrationTests/  216 tests (WebApplicationFactory + InMemory EF)
│
├── frontend/                      React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── features/              feature folders (auth, assessment, audits, mentor-chat, ...)
│   │   ├── components/            shared UI (Button, Card, Input, ...)
│   │   ├── shared/                hooks, http client, types
│   │   └── App.tsx
│   └── package.json
│
├── ai-service/                    FastAPI + OpenAI
│   ├── app/
│   │   ├── api/routes/            HTTP endpoints
│   │   ├── services/              AI logic, multi-agent orchestrator, RAG, static analyzers
│   │   └── domain/schemas/        Pydantic request/response models
│   ├── prompts/                   versioned LLM prompt templates (.txt)
│   ├── tests/                     pytest suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── tools/
│   ├── multi-agent-eval/          thesis A/B comparison harness (S11-T6)
│   └── load-test/                 k6 load-test script
│
├── docs/
│   ├── PRD.md                     Product requirements (13 MVP features, 4 stretch features)
│   ├── architecture.md            System architecture, data model, deployment
│   ├── implementation-plan.md     Sprint-by-sprint plan (S1–S11)
│   ├── decisions.md               38 ADRs explaining design choices
│   ├── progress.md                Sprint execution log + test totals
│   ├── thesis-technical-appendix.md  Diagrams + ERD + API reference for thesis
│   ├── design-system.md           UI tokens, Neon & Glass identity
│   ├── mvp-bugs.md                Bug backlog with severity classification
│   └── demos/                     Defense script, dogfood logs, runbooks
│
├── docker-compose.yml             Local infrastructure stack
├── .env.example                   Environment template (copy to .env)
├── .gitignore
├── README.md                      ← you are here
└── TEAMMATE-SETUP.md              Comprehensive setup + troubleshooting guide
```

---

## Documentation

| Document | When to read it |
|---|---|
| [`TEAMMATE-SETUP.md`](TEAMMATE-SETUP.md) | First-time setup with troubleshooting |
| [`docs/PRD.md`](docs/PRD.md) | Product spec — what each feature does and why |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data model, deployment plan |
| [`docs/decisions.md`](docs/decisions.md) | All 38 ADRs (architecture decision records) |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Sprint-by-sprint execution plan |
| [`docs/progress.md`](docs/progress.md) | What was actually built each sprint |
| [`docs/thesis-technical-appendix.md`](docs/thesis-technical-appendix.md) | Diagrams + ERD + API reference |
| [`docs/demos/defense-script.md`](docs/demos/defense-script.md) | 10-minute live demo walkthrough |
| [`docs/demos/cost-dashboard.md`](docs/demos/cost-dashboard.md) | Seq queries for OpenAI token cost monitoring |
| [`docs/demos/multi-agent-evaluation.md`](docs/demos/multi-agent-evaluation.md) | Thesis A/B comparison report (single-prompt vs multi-agent) |

---

## Testing

The project ships with **488 active tests** across the stack:

```powershell
# Backend (445 tests, ~70 sec)
cd backend
dotnet test CodeMentor.slnx -c Debug --nologo

# AI service (43 active + 5 skipped)
cd ai-service
.venv\Scripts\python -m pytest tests/ -m "not live" `
  --ignore=tests/test_ai_review_prompt.py `
  --ignore=tests/test_project_audit_regression.py `
  --ignore=tests/test_mentor_chat.py `
  --ignore=tests/test_embeddings.py

# Frontend type-check + production build
cd frontend
npx tsc -b --noEmit
npm run build
```

CI (`.github/workflows/backend-ci.yml`) runs the backend suite on every
push to `main` against ephemeral SQL Server + Redis containers.

---

## Team & supervisors

**Project Team Members**

| Name | Role |
|---|---|
| **Omar Anwar Helmy Ahmed** | ⭐ Team Lead · Backend & Database |
| Mohammed Ahmed Hasabo Ahmed | Backend & Database |
| Mahmoud Ahmed Mostafa Abdelmoaty | Frontend |
| Ahmed Khaled Yassin Ahmed | Frontend |
| Mahmoud Mohamed Mahmoud Abdelhamid | AI & Analysis |
| Ziad Ahmed Mohamed Salem | AI & Analysis |
| Eslam Emad Ebrahim Madani | DevOps |

**Supervisors**

- **Dr. Mostafa Elgendy** — Project Supervisor
- **Eng. Fatma Ebrahim** — Teaching Assistant
- **Eng. Doaa Mohamed** — Teaching Assistant

---

## License

This project is the academic work of the team listed above, submitted
as a graduation requirement at Benha University. Code is shared
publicly to support the team's portfolio and to enable continued
post-graduation development.

---

## Status

**M3 (defense-ready)** — all 15 features shipped and tested (488 tests
passing). See [`docs/progress.md`](docs/progress.md) for the sprint-by-sprint
execution log.
