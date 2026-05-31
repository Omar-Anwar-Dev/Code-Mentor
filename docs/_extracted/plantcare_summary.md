# PlantCare DOCX — Reference Summary

**Source:** `PlantCare_Documentation.docx` (19.8 MB)
**Institution:** Benha University, Faculty of Computers & AI — Class of 2024 (or 2025)
**Project:** PlantCare / "Leaf and Root" — Plant care system using AI (plant disease detection from images + mobile app + sensor + website)
**Submission:** **Both-term complete thesis** (covers Chapters 1-9, including Implementation, UI Design, Usability Testing, Future Vision, Conclusion, References)
**Team size:** 4 (Arabic names visible)

## Overview Statistics

- **Total paragraphs:** 2,925
- **Total tables:** 10
- **Total embedded images:** 196 (heavy on screenshots + diagrams)
- **Total numbered headings:** 111 (H1×11, H2×27, H3×26, H4×50, H5×10)
- **Chapter count:** 9 main H1 chapters + front-matter (List of Figures, Abstract)

## H1 Chapter Hierarchy (complete)

| # | Chapter Title | Paragraph range | Approx. body weight |
|---|---|---|---|
| Front | LIST OF FIGURES | 14-167 | Long figure list (>100 figures) |
| Front | ABSTRACT | 168-187 | 5-paragraph project narrative |
| **1** | **PROJECT INTRODUCTION AND BACKGROUND** | 188-502 | Intro, Problem, Proposed Solution, Lit Review, Objectives, Scope, Constraints |
| **2** | **SYSTEM ANALYSIS AND DESIGN** | 503-1334 | **Combined** Analysis + Design into single chapter (different from Code Mentor v2 which splits them) |
| **3** | **METHODOLOGY** | 1335-1536 | Deep technical methodology — system units, AI model design, mobile app, website, tools/technologies |
| **4** | **IMPLEMENTATION** | 1537-2132 | **Largest chapter (~600 paragraphs)** — per-component build: Mobile App, Web App (HIS + User Site), Deep Learning Models (Model 1 Poisonous, Model 2 Disease Classification) |
| **5** | **USER INTERFACE DESIGN** | 2133-2653 | Sketches, Wireframes, Heuristic Evaluation (Ben Shneiderman's 8 Golden Rules + Nielsen's 10 Heuristics) |
| **6** | **USABILITY TEST** | 2654-2827 | Planning, Scenarios, Criteria, Results (Admins + Clients), Survey, Findings, Recommendations |
| **7** | **FUTURE VISION** | 2828-2844 | Short — future enhancements |
| **8** | **CONCLUSION** | 2845-2865 | Short — wrap-up summary |
| **9** | **REFERENCE** | 2866-2925 | URL-list grouped by stack (Frontend / Backend / AI / etc.) — NOT formal academic citations |

## Detailed Sub-Section Structure (H2-H4)

### Chapter 1 (similar to Code Mentor; not detailed here — Code Mentor's v2.2 already covers this)
- 1.1 Introduction, 1.2 Problem Definition, 1.3 Proposed Solution, 1.4 Literature Review, 1.5 Objectives, 1.6 Scope, 1.7 Scope Exclusions/Constraints

### Chapter 2 — System Analysis AND Design (combined)
- 2.1 Introduction
- 2.2 System Analysis → 2.2.1 Planning (SDLC, Gantt), 2.2.2 Requirements (FR, NFR), 2.2.3 Business Model (Value Proposition, Competition, BMC)
- 2.3 System Design → Stakeholders, Block, Use Case, Activity (11 sub-activities), Sequence, State (11 state diagrams), Class, Context, DFD (Level 1 + Level 2), Database (Schema, ERD, Mapping)

### Chapter 3 — Methodology (this is a SECOND-TERM additional chapter)
- **3.1 System Units** (the project broken into deployable components):
  - 3.1.1 Deep Learning Models (Data Sources, Pre-Processing, Model Selection and Training)
  - 3.1.2 Mobile Application
  - 3.1.3 Website (Admin Management + User Services)
- **3.2 Used Technologies and Tools** → 3.2.1 Tools per-area:
  - AI Models
  - Mobile Application
  - Sensor Development (Hardware, Communication, Water Calculation)
  - Website

### Chapter 4 — Implementation (THE BIG SECOND-TERM CHAPTER)
- **4.1 Mobile Application** — screenshots + captions of every screen
- **4.2 Web Application** → 4.2.1 HIS, 4.2.2 Website (for user) — screen-by-screen tour
- **4.3 Deep Learning Model** → 4.3.1 Model 1 (Poisonous plants), 4.3.2 Model 2 (Plants disease classification) — architecture, training results, accuracy numbers (94% / 92%)

### Chapter 5 — User Interface Design
- 5.1 Sketches (early-stage low-fi mockups)
- 5.2 Wireframes (mid-fi)
- 5.3 Heuristic Evaluation:
  - 5.3.1 **Ben Shneiderman's 8 Golden Rules** analysis (1: Consistency, 2: Universal usability, 3: Informative feedback, 4: Dialogues to yield closure, 5: Error prevention, 6: Easy reversal, 7: Internal locus of control, 8: Reduce short-term memory load)
  - 5.3.2 **Nielsen's 10 Usability Heuristics** analysis (visibility of system status, match real world, user control, consistency, error prevention, recognition vs recall, flexibility, aesthetic, error recovery, help)

### Chapter 6 — Usability Test
- 6.1 Planning and Preparation (25 participants, ages 16-60, balanced demographics)
- 6.2 Test Scenarios (11 key tasks)
- 6.3 Three Levels of Criteria (Plants Website)
- 6.4 Results for Admin Participants
- 6.5 Results for Client Participants
- 6.6 Usability Survey Results
- 6.7 Findings (Strengths + Recommendations)
- 6.8 Analysis + Recommendations (Issues + fixes)

### Chapter 7 — Future Vision
- Single short chapter (no sub-sections, ~17 paragraphs)

### Chapter 8 — Conclusion
- Single short chapter (~20 paragraphs)

### Chapter 9 — Reference (URL-style, NOT IEEE/APA)

Sample references (verbatim — this is the entire format):
```
Frontend
  https://react.dev/
  https://tailwindcss.com/
  https://tanstack.com/query/latest
  https://formik.org/
  https://vite.dev/
Backend
  https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/
  https://www.tutorialsteacher.com/csharp
  https://www.entityframeworktutorial.net/efcore/entity-framework-core.aspx
  https://www.sqltutorial.org/
  https://learn.microsoft.com/en-us/azure/api-management/
```

**Critical observation:** The Benha 2024-2025 institutional reference style is **URL list grouped by stack/area, NOT formal academic citations.** No IEEE numbering, no author-date — just hyperlinks. This is unusual for an academic thesis (most universities require IEEE or APA), but it's clearly accepted here based on this "متفوق" (top-scoring) reference. The team's Code Mentor doc can follow this style for institutional consistency, **OR** upgrade to proper IEEE — Code Mentor is more technically substantive than PlantCare and has many actual academic citations to make (papers on IRT, RAG, multi-agent LLM systems).

**Recommendation for Code Mentor:** Use IEEE-style references, supplemented by the "Tools and Documentation" URL list (covers the framework/library/SDK references). This gives Code Mentor an *academically stronger* references chapter than PlantCare while still preserving the institutional convention as a sub-section.

## Abstract Style (PlantCare)

5-paragraph structure:
1. Problem statement (plant diseases impact agriculture)
2. System overview (mobile + web + AI image classification)
3. Two-model design + accuracy numbers (94/92%)
4. ML/CV value proposition (scalable, early detection)
5. Outcome and implication

Length: ~250 words. Concrete numbers included. This style is already what Code Mentor's existing abstract uses — no change needed.

## What's MISSING from PlantCare that Code Mentor needs

PlantCare doesn't have explicit chapters for these — but Code Mentor's project has substantive content for them and should add:

1. **Testing Chapter (beyond Usability)** — PlantCare only has Ch 6 Usability. Code Mentor has unit/integration/k6 load/security testing — these deserve a dedicated chapter (could be Ch 7 or merged with Usability).
2. **Deployment / Operations Chapter** — PlantCare has nothing; Code Mentor has Azure deferral decision (ADR-038), docker-compose flow, post-defense Azure plan. This is a strong differentiator.
3. **Engineering Decisions / ADRs Appendix** — Code Mentor has 62 ADRs and a sophisticated decision log. PlantCare doesn't.

## Recommended chapter mapping for Code Mentor v2.2 second-term

Based on PlantCare structure + Code Mentor's strengths:

| Code Mentor Ch | Title | Source |
|---|---|---|
| 1 (existing) | Project Introduction & Background | ✅ Already in v2.2 |
| 2 (existing) | Project Management | ✅ Already in v2.2 |
| 3 (existing) | System Analysis | ✅ Already in v2.2 |
| 4 (existing) | System Design | ✅ Already in v2.2 |
| **5 NEW** | **Methodology** | Mirror PlantCare Ch 3 — system units (FE/BE/AI/Static), tools/technologies, model selection rationale |
| **6 NEW** | **Implementation** | Mirror PlantCare Ch 4 — per-service implementation (FE app, BE API, AI service, static analyzers); use Sprints 1-21 as the narrative spine; show key screens (Neon & Glass identity per design-system.md) |
| **7 NEW** | **Testing & Validation** | Strengthen PlantCare's Ch 6 — unit (xUnit, Vitest, pytest), integration (real DB, real Hangfire), system, performance (k6 100 concurrent), security (OWASP), AI quality eval (multi-agent A/B from F13), Usability Test |
| **8 NEW** | **Deployment & Operations** | Code Mentor's strength — local-first via docker-compose, Azure deferral per ADR-038, runbook (post-defense), observability (Serilog + App Insights + Hangfire dashboard) |
| **9 NEW** | **Future Vision** | Match PlantCare Ch 7 — post-MVP roadmap from PRD §5.3, scale targets, additional tracks, mobile app, full Azure rollout |
| **10 NEW** | **Conclusion** | Match PlantCare Ch 8 — contributions, challenges, lessons learned |
| **11 NEW** | **References** | URL-style per PlantCare convention + IEEE academic citations for IRT/RAG/multi-agent LLM/Clean Architecture papers |
| **App A NEW** | Appendix A — ADR catalogue summary (selected from 62 ADRs) | From `docs/decisions.md` |
| **App B NEW** | Appendix B — Sprint progress log (Sprints 1-21 summary) | From `docs/progress.md` |
| **App C NEW** | Appendix C — User manual / screen tour | Selected screens from frontend with captions |

## Files written

- `_extracted/plantcare_headings.txt` (111 headings, full hierarchy)
- `_extracted/plantcare_summary.md` (this file)
