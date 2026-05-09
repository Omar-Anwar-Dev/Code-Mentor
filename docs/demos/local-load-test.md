# Local Load Test Runbook (S11-T8 / F13 / ADR-038)

**Status:** _runbook + script ready. Live run is owner-led — k6 not yet
installed on the laptop per kickoff Q4. This doc is the procedure
template; the populated results section lands when the owner runs the
script._

**Plan source:** `docs/implementation-plan.md` Sprint 11 → S11-T8.
**Script:** [`tools/load-test/core-loop.js`](../../tools/load-test/core-loop.js).
**Acceptance gate:** 50 concurrent VUs sustained on the owner's laptop
without p95 API latency >500 ms over a 5-min run; bottleneck fixes
verified by re-run; report includes hardware spec.

---

## 1. Hardware (per kickoff Q4)

- **CPU:** AMD Ryzen 7 5800H
- **RAM:** 32 GB
- **OS:** Windows 11
- **Stack:** docker-compose with mssql + redis + azurite + ai-service +
  qdrant + backend + frontend (per `docker-compose.yml`)

---

## 2. Install k6

Windows (recommended):

```powershell
winget install k6
# or:
choco install k6
```

macOS:

```bash
brew install k6
```

Linux (apt):

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Verify with `k6 version`.

---

## 3. Run procedure

### 3.1 Pre-flight

1. Bring up the full local stack:
   ```powershell
   docker-compose up -d
   ```
2. Wait for `/health` to return 200 (~10–20 s on cold start):
   ```powershell
   curl http://localhost:5000/health
   ```
3. Make sure the frontend is also reachable (some VUs hit dashboard which exercises the static-asset path):
   ```powershell
   curl http://localhost:5173
   ```
4. Stop or pause anything CPU-intensive on the laptop (browsers, Slack,
   IDE indexing). Plug in the charger — battery throttling skews results.

### 3.2 Execute baseline

Default profile = 50 VUs, 5-minute steady-state, 30 s ramp + 30 s ramp-down:

```powershell
cd "D:\Courses\Level_4\Graduation Project\Code_Review_Platform\Code Mentor V1"
k6 run tools/load-test/core-loop.js
```

Override examples:

```powershell
# Custom backend host:
k6 run -e BASE_URL=http://localhost:5000 tools/load-test/core-loop.js

# Different load profile:
k6 run --vus 100 --duration 10m tools/load-test/core-loop.js

# Enable the AI submission path (REAL OpenAI tokens — only with intent):
k6 run -e ENABLE_AI=1 tools/load-test/core-loop.js
```

The script emits a text summary to stdout + a JSON snapshot to
`tools/load-test/results/summary-latest.json`. Archive both into the
"Run history" table at the bottom of this doc after each pass.

### 3.3 What the run exercises

Each VU iteration walks the core-loop user journey:

1. `GET /health` (cheap liveness probe)
2. `POST /api/auth/register` (fresh per-VU email)
3. `POST /api/auth/login` (fallback path on registration collision)
4. `GET /api/dashboard/me`
5. `POST /api/assessments` (start an assessment for `track=FullStack`)
6. `POST /api/assessments/{id}/answers` × 5 turns
7. `GET /api/mentor-chat/{sessionId}` (lazy-create + readiness probe)

The AI-submission path (`POST /api/submissions` → background job → AI service)
is **disabled by default** because it spends real OpenAI tokens. Set
`-e ENABLE_AI=1` only when you want a brief multi-mode-under-load smoke
(plan note: "so multi-mode tested under load too, briefly" — S11-T4 dependency).

### 3.4 Multi-mode under load (brief)

To test the F13 path under load:

```powershell
# Switch the backend container to multi-agent mode
$env:AI_REVIEW_MODE = "multi"
docker-compose up -d backend  # restart to pick up env

# Run with submission path on, ~20 VUs for 60 s (small N to limit cost)
k6 run --vus 20 --duration 60s -e ENABLE_AI=1 tools/load-test/core-loop.js

# Switch back to single mode after the run
$env:AI_REVIEW_MODE = "single"
docker-compose up -d backend
```

Expect ~20 submissions × ~$0.022 each = ~$0.50 spent in 60 s. Watch the
Seq dashboard's `LlmCostSeries=ai-review-multi` series light up
(see `docs/demos/cost-dashboard.md`).

---

## 4. Bottleneck-hypothesis list

Where to look first when p95 blows past 500 ms. Plan call-out: "fix top
3 bottlenecks". This list is the order to investigate.

### 4.1 Hangfire pool sizing (high probability)

**Symptom:** dashboard p95 fine; submission-flow p95 inflates as VU count
climbs; backend logs show `WaitingForWorker` states piling up in Hangfire.

**Diagnose:**

```text
SELECT COUNT(*) FROM HangFire.JobQueue WHERE FetchedAt IS NULL;
```

If non-zero growing, queue depth is the bottleneck.

**Mitigation:** bump worker count in Hangfire DI registration (search for
`AddHangfireServer` in `Infrastructure/DependencyInjection.cs`). Ryzen 7
5800H has 16 logical cores — start with `WorkerCount = 8` (bumps from
default ~5).

### 4.2 SQL hot-query indexes (medium probability)

**Symptom:** `dashboard` and `assessment_answer` p95 climb together;
SQL Server `dm_exec_query_stats` shows table-scan plans.

**Diagnose:**

```sql
SELECT TOP 5 qs.total_elapsed_time / qs.execution_count AS avg_ms,
       qs.execution_count, SUBSTRING(qt.text, qs.statement_start_offset/2, 200) AS sql
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY avg_ms DESC;
```

**Likely candidates** (educated guesses based on schema review):

- `Submissions` queries by `(UserId, CreatedAt DESC)` — recent-submissions
  panel on dashboard. Add filtered index if missing.
- `AssessmentResponses` lookup by `(AssessmentId, IdempotencyKey)` —
  already a filtered unique index per ADR Sprint 2; verify it's still in
  place after migrations.
- `MentorChatMessages` ordered by `(SessionId, CreatedAt)` for history
  retrieval — ADR-036.

**Mitigation:** add covering indexes via a new EF migration; verify
plan switches to seek.

### 4.3 Qdrant query top-k tuning (medium probability, F12 only)

**Symptom:** mentor-chat readiness probe p95 stable, but full chat-turn
p95 (when exercised) creeps up under load.

**Diagnose:** Qdrant exposes Prometheus metrics at `:6334/metrics`. Look
for `qdrant_collection_search_duration_seconds` p95.

**Mitigation:** lower `mentor_chat_top_k` from 5 to 3 (in
`ai-service/app/config.py`); re-test. Or scale Qdrant memory (allocate
more in docker-compose).

### 4.4 Connection-pool exhaustion (lower probability but high impact)

**Symptom:** sudden spike to 500-level errors at high VU counts; "no
available connection" log noise.

**Mitigation:** EF Core default connection pool is 100; SQL Server
default 32767. The bottleneck is usually on the EF side under load.
Raise `MaxPoolSize` via the connection string if needed.

### 4.5 Static-analysis tool startup overhead (when ENABLE_AI=1)

**Symptom:** submission-job duration is long even on small inputs; AI
service container CPU spikes on each submission.

**Mitigation:** Bandit / ESLint cold-start is real. The AI service
already keeps the analyzer Python procs warm; the JS analyzer relies on
`npx eslint` which can be slow on Windows (mounted volume + npm cache).
Pre-build the eslint cache in the Dockerfile.

---

## 5. Results — first run

_(filled by owner after running the script)_

### 5.1 Run command

```text
k6 run tools/load-test/core-loop.js
```

### 5.2 Stdout summary

```text
(paste the textSummary block here)
```

### 5.3 Threshold compliance

| Threshold | Result |
|---|---|
| `http_req_duration p(95) < 500ms` |  |
| `rate_5xx < 1%` |  |
| `dur_register p(95) < 400ms` |  |
| `dur_login p(95) < 300ms` |  |
| `dur_dashboard p(95) < 300ms` |  |
| `dur_health p(95) < 100ms` |  |

### 5.4 Top bottleneck observed

_(narrative — what slowed down first as VU count climbed)_

### 5.5 Mitigation applied

_(per §4 above — which item, what change, what the re-run looked like)_

---

## 6. Run history

| Date (UTC) | Profile | p95 ms | Errors | Top bottleneck | Notes |
|---|---|---|---|---|---|
| _(empty — first run pending)_ | | | | | |

---

## 7. Why local-only (per ADR-038)

Per ADR-038 the M3 milestone is "defense-ready locally" — Azure
deployment is deferred. This load test is therefore a **sanity check
on the laptop demo stack**, not a production-readiness sign-off. The
50-VU target is half the original B1-tier 100-VU target because we're
measuring a workstation, not a hosted tier.

When the Post-Defense Azure slot ships (PD-T7 in
[`project_details.md`](../../project_details.md) Future Work appendix),
this same script runs against the Azure URL with `--vus 100 --duration
10m` and the threshold tightens. Until then, the script + this runbook
are the deliverables; the live run + populated §5 are the owner's
final-stretch validation before Rehearsal 1 (S11-T12).
