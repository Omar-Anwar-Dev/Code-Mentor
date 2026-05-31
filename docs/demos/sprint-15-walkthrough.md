# Sprint 15 walkthrough — F15 Foundations: 2PL IRT-lite Engine

**Sprint scope:** F15 foundations — 2PL IRT-lite engine, `Questions` schema extension, code-snippet rendering on the FE, factory-routed adaptive selector with AI-down fallback. See `docs/implementation-plan.md` Sprint 15 for the task list and `docs/decisions.md` ADR-049/050/051/055 for the locked technical decisions.

**Date:** 2026-05-14
**Owner:** Omar (Backend Lead). Self-driven walkthrough runs by Claude during S15-T9; live re-walkthrough by Omar follows per the kickoff "live walkthrough required" rule.

---

## 1. Pre-flight checks

Run from the repo root in PowerShell.

### 1.1 Stack up
```powershell
.\start-dev.ps1                      # full stack
# or:
docker-compose up -d mssql redis qdrant ai-service
```

Verify containers are healthy:
```powershell
docker inspect codementor-mssql --format "{{.State.Status}} (health: {{.State.Health.Status}})"
docker inspect codementor-ai     --format "{{.State.Status}} (health: {{.State.Health.Status}})"
Invoke-RestMethod http://localhost:8001/health
```

Expected:
- mssql + ai both `running (health: healthy)`
- AI `/health` returns `{"status":"healthy","service":"static-analysis-service",...}`

### 1.2 Database migrations applied
```powershell
cd backend
dotnet ef database update --project src/CodeMentor.Infrastructure --startup-project src/CodeMentor.Api
cd ..
```

Verify the new columns:
```powershell
$pwd_sa = (Get-Content .env | Select-String "MSSQL_SA_PASSWORD=").ToString().Split("=", 2)[1].Trim('"', "'")
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Questions' AND COLUMN_NAME IN ('IRT_A','IRT_B','CalibrationSource','Source','CodeSnippet','CodeLanguage','EmbeddingJson','PromptVersion','ApprovedById','ApprovedAt') ORDER BY COLUMN_NAME"
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Assessments' AND COLUMN_NAME = 'IrtFallbackUsed'"
```

Expected:
- 10 rows on Questions (the S15-T3 columns)
- 1 row on Assessments (the S15-T6 IrtFallbackUsed flag)

### 1.3 Question backfill applied
```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "SELECT Difficulty, IRT_B, COUNT(*) AS Cnt FROM Questions WHERE Source='Manual' GROUP BY Difficulty, IRT_B ORDER BY Difficulty"
```

Expected:
| Difficulty | IRT_B | Cnt |
|---|---|---|
| 1 | -1.0 | 20 |
| 2 |  0.0 | 20 |
| 3 |  1.0 | 20 |

If the Cnt rows differ from above, re-run `tools\seed-question-irt-backfill.sql` (idempotent).

---

## 2. Walkthrough A — Happy IRT path (AI service healthy)

**Goal:** complete a real 30-question assessment via the IRT engine on the backfilled bank. Verify per-category scores reasonable, the admin θ banner visible, IrtFallbackUsed=false at completion.

### 2.1 Endpoint smoke (no FE) — already captured 2026-05-14 19:11 UTC

Three direct POSTs to `http://localhost:8001/api/irt/select-next` exercising the three behavioral regimes:

**A1 — Empty history → prior θ=0.0 → picks max-info item near b=0:**
```
Request:
  bank: [easy(b=-1.5,a=1.5), easy(b=-1.0,a=1.2), mid(b=0.0,a=1.8),
         mid(b=0.2,a=2.0), hard(b=1.5,a=1.6)]
Response:
  {"id":"q-mid-2","a":2.0,"b":0.2,"itemInfo":0.961,"thetaUsed":0.0}
```
✅ Picks the item with highest a × P × (1-P) at θ=0 → `q-mid-2` (b=0.2, a=2.0 → I=0.96).

**A2 — 4 hard items all correct → θ MLE clips to +4 → picks the hardest available item:**
```
Request:
  responses: 4× (a≈1.6, b≈1.5-2.0, correct=true)
  bank: [easy(b=-1.5), mid(b=0.0), hard(b=1.8), very-hard(b=2.5)]
Response:
  {"id":"q-very-hard","b":2.5,"itemInfo":0.194,"thetaUsed":3.99996}
```
✅ MLE saturates at the upper bound; the item closest to the saturated θ wins. Engine bounds + selection both correct.

**A3 — 3 easy items wrong → θ MLE clips to -4 → picks the easiest available item:**
```
Request:
  responses: 3× (a=1.5, b≈-0.7, correct=false)
  bank: [very-easy(b=-2.0), easy(b=-1.0), mid(b=0.5)]
Response:
  {"id":"q-very-easy","b":-2.0,"itemInfo":0.102,"thetaUsed":-3.99995}
```
✅ Lower-bound saturation; easiest item picked. Symmetric with A2.

### 2.2 Live walkthrough (FE) — owner-driven

1. Log in as **admin** at http://localhost:5173/login (seed admin: see `TEAMMATE-SETUP.md`).
2. Navigate to `/assessment` → start a fresh assessment for any track.
3. **Verify on each question page:**
   - Question card renders content + 4 options.
   - **Amber IRT debug banner** below the question text shows `θ = X.XXX · info = Y.YYYY` (visible only because logged-in role = Admin).
   - If a question carries a `CodeSnippet`, it renders above the question text with a Prism-highlighted block + language badge (no questions in seed have snippets — exercised via S16's AI Generator).
4. Answer 30 questions.
5. On completion → see `/assessment/results` with the per-category radar.
6. **DB-side check:**
   ```powershell
   docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
     "SELECT TOP 1 Id, IrtFallbackUsed, Status, TotalScore FROM Assessments WHERE UserId = (SELECT TOP 1 Id FROM AspNetUsers WHERE UserName='admin') ORDER BY StartedAt DESC"
   ```
   Expect `IrtFallbackUsed = 0` (false), `Status = Completed`, `TotalScore` populated.

---

## 3. Walkthrough B — AI-down fallback path

**Goal:** verify the assessment continues end-to-end with the legacy heuristic when the AI service is unreachable, and `IrtFallbackUsed` flips to true.

### 3.1 Owner-driven kill mid-flight

1. Start a fresh assessment (admin or learner role; banner is admin-only but the path itself works for both).
2. Answer ~5 questions normally (IRT path active).
3. **Kill the AI service** in another PowerShell window:
   ```powershell
   docker stop codementor-ai
   ```
4. Continue answering. Expected:
   - **No learner-visible error.** Each next question still loads.
   - The amber IRT debug banner **disappears** (admin only) — `debugTheta` is null when the legacy selector is used.
   - The next question's `Difficulty` follows the legacy F2 heuristic (escalates after 2 consecutive correct in same category, etc.).
5. Complete the remaining ~25 questions.
6. Restart the AI service: `docker start codementor-ai`.
7. **DB-side check:**
   ```powershell
   docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
     "SELECT TOP 1 Id, IrtFallbackUsed, Status FROM Assessments ORDER BY StartedAt DESC"
   ```
   Expect `IrtFallbackUsed = 1` (true) — sticky-OR set after the kill.

### 3.2 Test-side coverage of the same path

The factory's routing decision and the assessment's IrtFallbackUsed persistence are unit-tested in `CodeMentor.Application.Tests`:

| Test | What it covers |
|---|---|
| `IrtAdaptiveQuestionSelectorTests.Fallback_AiReportsUnhealthy_ReturnsLegacySelector` | Factory routes to Legacy when AI=unhealthy; sets choice.IrtFallbackUsed=true |
| `IrtAdaptiveQuestionSelectorTests.Fallback_AiHealthProbeThrows_ReturnsLegacySelector` | Same, but probe raises an exception |
| `IrtAdaptiveQuestionSelectorTests.Fallback_LegacyHeuristic_EscalatesAfterTwoConsecutiveCorrect` | Confirms the legacy verbatim PRD-F2 escalation rule still fires after the rename |
| `AssessmentIrtFallbackPersistenceTests.SingleFallbackDuringAssessment_StickyOrsFlagToTrue` | Sticky-OR sequence: 5 ok → 1 fallback → 24 ok ⇒ flag = true |
| `AssessmentIrtFallbackPersistenceTests.AllCallsFallback_PersistsFlagTrue` | All-fallback case |
| `AssessmentIrtFallbackPersistenceTests.NewAssessment_WithIrtAvailableThroughout_PersistsFlagFalse` | Negative case — never falls back ⇒ flag = false |

---

## 4. Walkthrough C — Code-snippet rendering (forward-looking)

The seed bank has zero questions with `CodeSnippet` populated (S15-T4 backfill explicitly didn't add any — content burst starts in S16). To preview the FE rendering before S16:

```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "UPDATE TOP (1) Questions SET CodeSnippet = 'def factorial(n):' + CHAR(10) + '    return 1 if n <= 1 else n * factorial(n-1)', CodeLanguage = 'python' WHERE Difficulty = 2 AND Category = 'Algorithms' AND CodeSnippet IS NULL"
```

Re-take the assessment until that question appears. Verify:
- Snippet renders **above** the question text inside the question card.
- Prism syntax-highlights the Python.
- A `Python` badge appears in the snippet header.
- The `figcaption` "Code snippet — Python" is announced to screen readers (inspect via DevTools).

Test 4 more languages by running the same UPDATE for different (Difficulty, Category) cells with snippets in `javascript`, `typescript`, `csharp`, `java`. The shared `CodeBlock` (Sprint 6) already imports the Prism grammars for all 5 + PHP/C/C++.

To revert (so S16's AI generator owns this from now on):
```powershell
docker exec codementor-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $pwd_sa -C -d CodeMentor -Q `
  "UPDATE Questions SET CodeSnippet = NULL, CodeLanguage = NULL WHERE Source = 'Manual'"
```

---

## 5. Performance benchmark (S15-T10)

Run from `ai-service/`:
```powershell
.venv\Scripts\python.exe -m pytest tests\test_irt_perf.py -v -s
```

Expected output (numbers from the actual 2026-05-14 run on the owner's laptop):

| Benchmark | p50 | p95 | p99 | Bar | Headroom |
|---|---|---|---|---|---|
| `select_next` 60-item bank | 0.028 ms | 0.035 ms | 0.044 ms | < 20 ms | ~570× |
| `select_next` 250-item bank (production target) | 0.115 ms | **0.122 ms** | 0.127 ms | **< 50 ms** | **~410×** |
| `select_next` 500-item bank | 0.258 ms | 0.263 ms | 0.265 ms | < 100 ms | ~380× |
| Full cycle (15-resp history + 250-item bank) | 0.240 ms | 0.289 ms | 0.345 ms | < 50 ms | ~173× |
| Full cycle (29-resp history + 250-item bank) | 0.279 ms | 0.359 ms | 0.483 ms | < 50 ms | ~139× |
| `item_info` micro (avg over 20k iters) | — | — | — | < 2 µs | 4.9× (0.41 µs) |

**Conclusion:** the engine itself is essentially free at the projected production scale. The HTTP round-trip BE → AI → BE will dominate (typically 5–15 ms locally); the engine adds < 1 ms.

---

## 6. Sign-off checklist

- [ ] §1 pre-flight checks all green
- [ ] §2.2 happy-path walkthrough completed by owner; IrtFallbackUsed = 0 in DB
- [ ] §3.1 fallback walkthrough completed by owner; IrtFallbackUsed = 1 in DB
- [ ] §4 code-snippet rendering verified for at least 2 languages
- [ ] §5 perf benchmark p95 < 50 ms on owner's laptop

When all 5 ticks land, S15-T9 is signed off. Sprint 15 then closes via S15-T11 (commit + push via `prepare-public-copy.ps1`).
