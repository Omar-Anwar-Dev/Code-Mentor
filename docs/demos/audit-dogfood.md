# S9-T12 Project Audit Dogfood

**Sprint:** 9 (F11 — Project Audit Feature)
**Date:** 2026-05-03
**Model:** `gpt-5.1-codex-mini` via the OpenAI Responses API
**Prompt:** `project_audit.v1` (see `ai-service/PROMPT_CHANGELOG.md`)
**Runner:** `ai-service/tools/dogfood_audit.py` (live OpenAI calls)
**Source fixtures:** `ai-service/tests/test_project_audit_regression.py` — same 3 inputs as the live regression test suite, so dogfood + regression observe identical model behavior.
**R11 mitigation gate:** quality rated ≥ 3.5 / 5 across the 3 samples.

---

## Methodology

1. The 3 sample projects from `test_project_audit_regression.py` are run end-to-end through `ProjectAuditor.audit_project()` (the same call path the `/api/project-audit` endpoint takes — only the multipart upload + ZipProcessor steps are skipped).
2. Each result's full structured `AuditResult` is dumped to `docs/demos/audit-dogfood-runs/{python,javascript,csharp}.json` so the raw model output is reproducible / auditable in-repo.
3. This document captures the project-executor's own subjective rating per sample on a 1–5 scale, with explicit reasoning. The user delegated the rating responsibility to the executor for this dogfood pass; supervisors / additional team members can re-rate in a follow-up if needed.
4. Performance + token cost is logged per audit so cost trajectory is visible going into Sprint 10.

---

## Sample 1 — Python Flask todo (SQL injection + missing JWT)

**Input description (excerpt):**
> Stores tasks per user in SQLite. JWT auth in scope but **not yet implemented**.
> Features claimed: List tasks per user, Create task, Mark complete, JWT auth (planned).

**Code under review:** one Flask file with a `GET /tasks` endpoint that interpolates `request.args.get('user')` directly into a SQL string (textbook SQL injection), and no other endpoints despite the description listing Create + Mark-complete + Auth.

### Audit output (key excerpts)

- **Overall:** 36 / 100 (D) — appropriately harsh given a critical security issue.
- **Scores:** codeQuality 40, security 15, performance 70, architectureDesign 30, maintainability 30, completeness 30.
- **Critical issue:** "SQL injection via user-controlled query" — names the file (`app/main.py`), the line (12), and the precise fix with a working code example (`cursor.execute('SELECT * FROM tasks WHERE owner=?', (user,))`).
- **Warning:** "Missing CRUD surface for tasks" — explicitly compares the description's claims against the implemented surface; no warning hallucinated.
- **Missing features:** `["Create task endpoint (POST /tasks)", "Mark task complete endpoint (PATCH/PUT /tasks/<id>)", "JWT-based authentication/authorization"]` — exactly the 3 gaps the description telegraphs.
- **Recommendations (top-5, prioritized):** Fix SQL injection → Expand CRUD → Add auth → Improve SQLite usage (context manager) → Document API. Reads like a senior engineer's PR review.
- **Tech stack assessment:** "Python + Flask + SQLite is an appropriate lightweight stack ... can support those extensions without requiring a rewrite." Honest, not gushing.
- **Inline annotation:** SQL injection at line 8–12 with severity=critical + working `parameterized-query` code example. One annotation, very high-signal.

### Executor rating

| Dimension | Rating | Why |
|---|---:|---|
| Catches the deliberately planted bug | 5 / 5 | SQL injection identified at exact line, fix is correct + has runnable code example |
| Surfaces "missing features" the description telegraphs | 5 / 5 | All 3 gaps (Create, Mark-complete, JWT) listed |
| Avoids hallucination / generic filler | 5 / 5 | Strengths section is honest ("single-file keeps logic simple") rather than padded; recommendations are concrete (e.g., "wrap in `with sqlite3.connect(...)` context manager"); zero invented files or APIs |
| Tone (senior reviewer per ADR-034) | 4 / 5 | Direct + actionable, but the warnings + critical sections share a default-professional tone with little stylistic distinction |
| **Overall** | **4.5 / 5** | High-signal output, ready to demo |

---

## Sample 2 — JavaScript React (hardcoded API key)

**Input description (excerpt):**
> Calls a backend API to render a user list. No tests yet.
> Features claimed: Load + render users, Pagination (planned).

**Code under review:** one React component with `const API_KEY = 'sk-live-AbCdEf1234567890';` literal at the top, single `useEffect` calling `fetch('/api/users?key=' + API_KEY)` with no error/loading handling.

### Audit output (key excerpts)

- **Overall:** 34 / 100 (D) — security score 15 reflects the hardcoded credential.
- **Critical issue:** "Hardcoded secret API key" — flagged at `src/App.jsx:4`; fix moves to `import.meta.env.VITE_BACKEND_KEY`. Explanation calls out billing abuse + account compromise as concrete blast radius.
- **Warning (un-baited bonus):** "No API error or loading handling" — a real issue we didn't deliberately plant. Includes a concrete fix recipe (try/catch + `r.ok` guard + loading state).
- **Suggestion:** "Plan and expose pagination UI" — references the description's "Pagination (planned)" wording.
- **Missing features:** `["Pagination (planned) not implemented"]` — exactly the description gap.
- **Top-5 recommendations:** Remove key from source → Add API response handling → Implement pagination → Add basic tests → Adopt linting/formatting. The tests + lint additions are bonus value (description didn't promise them).
- **Inline annotations (2):** Hardcoded key at line 4 with `import.meta.env.VITE_BACKEND_KEY` example; missing error handling at lines 8–9 with a full async/await code block as the suggested replacement.

### Executor rating

| Dimension | Rating | Why |
|---|---:|---|
| Catches the deliberately planted bug | 5 / 5 | API key flagged at exact line; the fix uses Vite-specific env-var convention (not a generic "use env vars") |
| Catches issues we did NOT bait | 5 / 5 | Spotted missing error/loading handling — real-world value |
| Surfaces "missing features" the description telegraphs | 5 / 5 | Pagination correctly listed |
| Quality of code examples | 5 / 5 | Inline annotation 2 has a runnable async/await `useEffect` body; not a one-liner |
| Avoids hallucination / generic filler | 4 / 5 | Mostly clean; strengths section is single-line ("minimal, focused component") which is honest but thin |
| **Overall** | **4.5 / 5** | Above expectations; the un-baited error-handling catch raised the score |

---

## Sample 3 — C# minimal ASP.NET Core API

**Input description (excerpt):**
> Minimal ASP.NET Core 10 items API. GET /api/items/{id} backed by an in-memory repo. Solid foundation for further endpoints.
> Features claimed: Get item by id, List items (planned), CRUD (planned).

**Code under review:** one `ItemsController` with constructor-injected concrete `ItemRepository` (no interface), single `GetById(Guid)` returning `IActionResult`. No critical bugs — this is a "solid foundation" case where the audit should produce architectural critique, not security alarms.

### Audit output (key excerpts)

- **Overall:** 62 / 100 (C) — middle of the road, no critical issues, several architectural improvements.
- **Strengths (2):** "Controller is concise and follows ASP.NET Core conventions" + "Dependency injection is used for the repository, making the controller easy to unit-test." Both genuine and specific.
- **Critical issues:** none — correct call.
- **Warning:** "Repository abstraction missing" — names the file:line (line 8), explains the coupling cost ("any change to ItemRepository forces controller recompilation"), and prescribes `IItemRepository`.
- **Suggestion:** "Return typed action results" — proposes `ActionResult<ItemDto>` for OpenAPI metadata. Idiomatic ASP.NET Core advice.
- **Missing features:** `["List items endpoint (planned)", "Create/Update/Delete (CRUD) endpoints (planned)"]` — exactly per description.
- **Top-5 recommendations:** Introduce `IItemRepository` → Implement remaining endpoints → Add response typing + validation → Document via Swagger → Add automated tests.
- **Tech stack assessment:** "ASP.NET Core with C# is the right stack for a REST API." Honest and brief.
- **Inline annotation:** repository-interface critique with concrete code-example replacement (`private readonly IItemRepository _repo; public ItemsController(IItemRepository repo) => _repo = repo;`).

### Executor rating

| Dimension | Rating | Why |
|---|---:|---|
| Calibration (no critical issues invented) | 5 / 5 | Recognized this is a "foundation" project; no false alarms |
| Architectural critique quality | 4 / 5 | Interface-extraction advice is correct + has runnable code; `ActionResult<T>` advice is idiomatic |
| Surfaces "missing features" the description telegraphs | 5 / 5 | Both planned-but-missing items listed |
| Tech-stack honesty | 4 / 5 | Brief and right, but slightly generic ("right stack for a REST API") |
| Tone | 4 / 5 | Professional but not as memorable as the Python sample; reads as a thoughtful review rather than a bored checklist |
| **Overall** | **4.0 / 5** | Solid; lower than Python/JS only because there's less drama in the code, so the audit has less raw signal to work with |

---

## Summary

| Sample | Overall score | Grade | Executor rating | Token in / out |
|---|---:|:---:|---:|---:|
| Python Flask todo | 36 / 100 | D | **4.5 / 5** | 1191 / 1609 |
| JS React app | 34 / 100 | D | **4.5 / 5** | 1194 / 1808 |
| C# minimal API | 62 / 100 | C | **4.0 / 5** | 1190 / 1420 |
| **Average** | — | — | **4.3 / 5** | ~1192 / ~1612 |

### R11 mitigation status

✅ **GATE MET.** Average rating **4.3 / 5** across the 3 samples is comfortably above the 3.5 / 5 R11 threshold defined in `implementation-plan.md` Risk Register. The audit prompt + schema + JSON repair + 1-retry-on-malformed pipeline produces actionable, structured output that a senior reviewer would recognize as worth shipping for the defense demo.

### P0 / P1 bug list

**None.** All 3 audits succeeded on first call (no malformed-JSON retries triggered), produced valid 8-section structured payloads, and the model's findings were accurate against the planted issues + description-vs-code completeness gaps.

### Performance + cost trajectory

- Per-audit latency: **9–11 seconds** for the AI call portion alone (excludes static-analysis fan-out, which adds variable time depending on detected languages and analyzer toolchain — not exercised in this dogfood since the runner calls the auditor directly, not the endpoint).
- Per-audit token spend: **~1,200 input + ~1,400–1,800 output ≈ 2,600–3,000 total tokens** on `gpt-5.1-codex-mini`. At current pricing this is pennies per audit.
- Combined dogfood-pass cost: **~8,400 tokens** total. Single-digit-cents per full pass.
- The 3,072 output token cap (ADR-034) was not approached — actual output ranged 1,420–1,808 tokens per audit (47–59 % of the cap).

### Notes for the AI team / next steps

- **Tone consistency:** the senior-reviewer voice carries the "what + why + how" structure correctly, but stylistic variation between Critical / Warnings / Suggestions sections is mild. Future prompt iterations could add micro-cues to the system message ("Critical: terse and assertive; Warnings: concrete fix path; Suggestions: opt-in framing") if the demo audience wants more obvious tonal shifts. Not a blocker — this is polish.
- **Strengths section length:** ranged from 1 to 2 bullets across the 3 samples. The samples are small (1 file each), so this is appropriate; for larger projects in real-world use, the prompt may want to encourage 3–5 strengths to balance the tone.
- **Static-analysis integration:** this dogfood ran the LLM portion only. The `/api/project-audit` endpoint also runs `analyze-zip` for static fan-out and merges results into the combined response. End-to-end pipeline verification (with both static + LLM) is exercised by the existing backend integration tests (`AuditPipelineTests` — S9-T4) and could optionally be re-verified pre-defense by uploading a real ZIP through the new `/audit/new` UI to a running stack.
- **No prompt iteration needed before defense.** `project_audit.v1` is shippable as-is. If supervisors flag anything during M3 rehearsals, a v1.1 bump can be appended to `PROMPT_CHANGELOG.md`.

### Reproducibility

- Re-run the dogfood at any time:
  ```bash
  cd ai-service
  .venv/Scripts/python.exe tools/dogfood_audit.py
  ```
- The 3 raw `AuditResult` JSON dumps used for this evaluation are committed under `docs/demos/audit-dogfood-runs/`. Anyone reading the repo can verify the executor's ratings against the actual model output.
- The same 3 samples are also exercised by `ai-service/tests/test_project_audit_regression.py` as live OpenAI tests that self-skip when no key is configured. With a real key set in `.env`, the regression suite + dogfood pass observe identical model behavior.
