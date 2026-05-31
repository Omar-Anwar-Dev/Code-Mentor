# Gap Analysis — First Term Documentation v2.1 vs Current Project State

**Generated:** 2026-05-16
**Source docs:** Decumentation finaly version-2.1.docx + project_docmentation.md
**Reference state:** PRD.md v1.3, architecture.md, decisions.md (ADR-001…062), progress.md (M4 reached)

---

## Chapter 1 — Introduction & Background

| Section | Current claim | Reality | Action |
|---|---|---|---|
| 1.3 Proposed Solution | "5 pillars" incl. Gamification prominently | Gamification deferred per PRD §2.3 — only Learning CV ships in MVP + SF2 light badges as stretch | Rewrite §1.3.4 — gamification reframed as stretch SF1–SF4 |
| 1.6.1 Tracks | 5 tracks (Full Stack / Backend / Frontend / Python / CS Fundamentals) | 3 tracks only (Full Stack / Backend / Python) per PRD F4 | Cut Frontend Specialist + CS Fundamentals |
| 1.6.1 Task library | "40–50 practical tasks" | 50 tasks at M4 close (target hit) | Update to "≥21 MVP / 50 target at M4" |
| 1.6.1 Assessment engine | "Bayesian inference / IRT" | 2PL IRT-lite engine (ADR-049/050/051) | Specify 2PL IRT-lite + AI Question Generator |
| 1.6.2 Static analysis | "ESLint + Prettier + SonarQube + Bandit + Roslyn" | ESLint + Bandit + Cppcheck + PHPStan + PMD + Roslyn (NO SonarQube) | Replace SonarQube with the actual toolchain |
| 1.6.2 AI engine | "LLaMA 3 / GPT-4" | GPT-5.1-codex-mini + text-embedding-3-small (ADR-003/004/036) | Replace model names |
| 1.7.1 Scope exclusions | Generic | Add explicit MVP exclusions: enforced email verification, MFA, payment, mobile app, multi-tenant, multilingual UI, full CI/CD beyond GH Actions PR build, Azure deployment (deferred per ADR-038) | Update exclusions list |
| 1.8.1 Phased rollout | "18 months" / "Months 1–6" / "Months 7–12" | Single MVP phase Oct 2025 → Jun 2026 (~9 months); 4 milestones M0–M4 | Replace 3-phase narrative with M0→M4 milestone narrative on Oct 2025–Jun 2026 timeline |

## Chapter 2 — Project Management

| Section | Current claim | Reality | Action |
|---|---|---|---|
| 2.1 Frontend stack | "React (Next.js)" | Vite + React 18 + TypeScript (ADR-001) | Replace Next.js → Vite |
| 2.1 AI team | "LLaMA, GPT-based, Claude" model eval | OpenAI GPT-5.1-codex-mini chosen (ADR-003); Qdrant added (ADR-036); 2PL IRT-lite (ADR-050) | Update responsibilities to actual stack |
| 2.1 DevOps lead | Very light responsibilities | Eslam handles docker-compose, env templates, k6 load test (S11-T8), backup video, supervisor rehearsals | Expand DevOps responsibilities |
| 2.2 Risk Management | Queue uses "RabbitMQ / Azure Service Bus + Hangfire" | Hangfire SQL-backed only (ADR-002) | Drop RabbitMQ + Service Bus references |
| 2.2 Risk T-03 | "MFA for admin accounts" | MFA deferred to post-MVP (PRD §2.3) | Drop MFA mitigation, replace with "rate-limited admin login + audit log" |
| 2.2 Risk T-05 | "Azure SQL backup policies" | Azure deferred; local SQL Server 2022 LocalDB dev + Azure SQL prod (post-defense per ADR-038) | Reframe to "local backup scripts + Azure post-defense" |
| 2.4 WBS | Placeholder image, no actual structure | Need real WBS aligned to Oct 2025 → Jun 2026 (4-level hierarchy with M0→M4 milestones) | Rebuild WBS — text outline + new diagram |
| 2.5.1 PERT table | 29 generic rows with "Mock Payment", "Mobile App", "Phase 3 Production Launch", "Community Platform" — none match actual project | Project = MVP only; tasks should reflect actual sprint plan (S0–S14 first term, S15–S21+rehearsal second term) | Replace PERT table entirely with actual sprint-grouped activities |
| 2.5.2 Network Diagram | "18-month timeline across 3 phases", placeholder image | 9-month timeline Oct 2025–Jun 2026, single phase with M0→M4 sub-milestones | Rebuild diagram |
| 2.5.3 Gantt Chart | "18-month project timeline across all three phases" | ~9 months calendar, ~22 sprints @ 2 weeks each | Rebuild as monthly Gantt Oct 2025 → Jun 2026 |

## Chapter 3 — System Analysis

| Section | Current claim | Reality | Action |
|---|---|---|---|
| 3.3.1 FR coverage | F1–F10 only via FR-AUTH / FR-ASSESS / FR-PATH / FR-SUB / FR-FEED / FR-GAME / FR-ADMIN tables | F1–F16 implemented (F11 Project Audit, F12 RAG Mentor Chat, F13 Multi-Agent, F15 Adaptive IRT Engine, F16 AI Path) | Add FR-AUDIT, FR-CHAT, FR-MULTIAGENT, FR-IRT, FR-PATHAI, FR-ADAPT tables |
| FR-AUTH-03 | "Email verification before activation" | Verification email sent but NOT blocking login (PRD F1) | Demote priority from "Medium" to "Low (sent, not enforced)" |
| FR-AUTH-08 | "Sessions cached using Redis" | Sessions = JWT only; Redis used for rate-limit + cache (ADR-009/036) | Reframe to rate-limit + cache use |
| FR-GAME-* | Most as "High/Medium" priority | Most deferred — only Learning CV (FR-GAME-05/06/07) ships in MVP; rest stretch | Demote streaks/XP/badges to stretch SF1–SF4 |
| FR-ADMIN-02..06 | All described as full features | Only Task + Question CRUD ships; analytics, moderation, system config deferred | Demote unshipped admin features |
| NFR-PERF-01 | API read ≤200ms p95 | PRD §8.1 says ≤300ms read / ≤500ms write (B1 tier realistic) | Update to 300/500ms |
| NFR-PERF-05 | Phase 1: 100 / Phase 2: 500 / Phase 3: 2000+ users | MVP target = 100 concurrent users (PRD §8.5); k6 load test target | Single tier = 100 users; remove Phase 2/3 |
| NFR-AVAIL-01 | ≥99.5% monthly uptime | PRD §8.6 = 99% pre-defense 2-week window, best-effort, not SLA | Update target |
| NFR-MAIN-03 | ≥80% unit test coverage | PRD §8.8 = ≥70% on Application layer only | Update target |
| NFR-INT-07 | Azure Service Bus queues | Hangfire SQL-backed (ADR-002) | Replace |
| NFR-INT-02 | Stripe (Phase 3) | Stripe explicitly EXCLUDED per PRD §2.3 non-goals | Remove |
| NFR-UX-07 | Mobile app usability | No mobile app — responsive web only (PRD §2.3 non-goal) | Drop NFR-UX-07 |
| NFR-COMP-01 | GDPR Articles 15–17 full compliance | "Best-effort GDPR-aware" only — stub endpoints for export, view-edit-delete works (PRD §8.3) | Reframe as "best-effort, see §8.3" |
| 3.5 Stakeholders | Generic | Mostly OK — could add "Project Audit users (visitors)" persona per F11 | Minor addition |

## Chapter 4 — System Design

| Section | Current state | Reality | Action |
|---|---|---|---|
| 4.2 Block diagram | Image embedded (placeholder explained but generic) | 3 services: FE (Vite+React) + BE (.NET 8 + in-process Hangfire) + AI (FastAPI + Qdrant) + SQL Server + Redis + Blob | Regenerate simpler block diagram with named services + data stores |
| 4.3 Use Case diagram | Image embedded | 30+ user stories (US-01…US-48). Need use case grouping by actor: Learner, Admin, Visitor (audit) | Regenerate compact UC diagram (3 actors × 5–8 grouped use cases each) |
| 4.4 Activity diagrams | 5 separate diagrams | Reflect actual flows: Auth, Assessment, Submission Queueing, Submission Processing, Feedback Review | Keep 5 diagrams but verify they match current architecture |
| 4.5 Sequence diagrams | 4 sequences | Add: Mentor Chat (RAG retrieval), Project Audit, Path Adaptation cycle | Either replace existing or add 2 new |
| 4.6 Context diagram | Image | Confirm external systems = GitHub, OpenAI, SendGrid, Azure Blob (Azurite local) | Verify + simplify |
| 4.7 DFD | Level 0 only | Add Level 1 showing 3 services + AI sub-pipeline | Add Level 1 |
| 4.8 ERD | Image | DB has ~30 tables per architecture.md §5. Need simplified ERD showing core 12–15 entities | Regenerate ERD showing core entities only |

---

## Diagram strategy for "simple, clear, not too big, not too compressed"

Options for diagrams in the .docx:
1. **PNG/JPG images** embedded — same as current; user would need to provide regenerated images (or we generate via Mermaid → PNG using a CLI)
2. **Mermaid source code** embedded as text + a rendered image — works in .md, requires render step for .docx
3. **PlantUML** — older but generates PNGs from text → reliable for .docx embedding

**Recommended:** Generate Mermaid source for each diagram (commit to repo); render to PNG via `mermaid-cli` and embed in .docx. This way:
- Source is version-controlled
- Diagrams are simple by construction (Mermaid favors brevity)
- Future updates take seconds

## Timeline strategy for "Oct 2025 → Jun 2026"

| Month | Phase | Milestones in this window |
|---|---|---|
| Oct 2025 | Sprint 0–1 — Foundations | Project kickoff, repo setup, dev env, M0 (thin vertical slice) |
| Nov 2025 | Sprint 2–3 — Auth + Assessment | F1 + F2 end of Nov |
| Dec 2025 | Sprint 4–5 — Path + Tasks + Submission | F3 + F4 + F5 |
| Jan 2026 | Sprint 6 — Analysis pipeline + Feedback UI | F6 + F7 → **M1 internal demo** |
| Feb 2026 | Sprint 7–8 — Dashboard + Admin + Learning CV | F8 + F9 + F10 → **M2 MVP complete** |
| Mar 2026 | Sprint 9 — Project Audit | F11 → **M2.5** |
| Apr 2026 | Sprint 10–11 — Mentor Chat + Multi-Agent + Polish | F12 + F13 → **M3 defense-ready locally** |
| May 2026 | Sprint 12–14 — History-aware + UI Redesign + UserSettings | F14 + Neon&Glass redesign |
| May 2026 | Sprint 15–17 — Adaptive AI Assessment Engine | F15 |
| Jun 2026 | Sprint 18–21 — AI Learning Path + Continuous Adaptation | F16 → **M4 flagship features ready** |
| Jul–Sep 2026 | Buffer | Thesis writing, dogfood data, rehearsals, defense (~Sept) |

This is the planned-on-paper timeline that aligns with the user's requested Oct 2025 → Jun 2026 window. The accelerated AI-Code execution that compressed everything into May 2026 is an implementation detail; the documentation should reflect the team-calendar plan.
