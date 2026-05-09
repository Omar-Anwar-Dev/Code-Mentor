# Local Seq Cost-Monitoring Dashboard (S11-T5 / F13 / ADR-037)

**Purpose:** chart the three LLM token series side-by-side on the local
Seq instance that already runs in `docker-compose.yml`. Even though
Azure deployment is deferred per ADR-038, the local dashboards are the
day-to-day cost-visibility surface during Sprint 11 dogfood, the thesis
evaluation runs (S11-T6), and rehearsal demos (S11-T12 / T13).

The same Seq queries below port 1:1 to Application Insights once the
Post-Defense slot ships — only the syntax flavor differs. Append the
production Application Insights query block when PD-T8 lands.

---

## What the backend logs

Every AI-review or audit persistence path emits a single structured log
line with a `LlmCostSeries` discriminator. One field, three values:

| `LlmCostSeries` | Source path | Log emitted by |
|---|---|---|
| `ai-review` | Submission, single-prompt mode (default) | `SubmissionAnalysisJob` (`AI review persisted: ...`) |
| `ai-review-multi` | Submission, multi-agent mode | same line, `ReviewMode=multi` |
| `project-audit` | Project audit (F11) | `ProjectAuditJob` (`Project audit persisted: ...`) |

Submission-analysis lines also carry `ReviewMode={single|multi}` and
`PromptVersion={v1.0.0|multi-agent.v1|multi-agent.v1.partial}` for finer
slicing. Project-audit lines carry `PromptVersion=project_audit.v1`.

Tokens fields:

- `ai-review` and `ai-review-multi`: `Tokens={int}` (single combined count).
- `project-audit`: `TokensIn={int}` and `TokensOut={int}` (split,
  matching the Responses API breakdown introduced in S9-T6).

---

## Seq queries

Open Seq at `http://localhost:5341` (or whatever port `docker-compose.yml`
publishes — check the `seq` service). Paste each query below. Save as
named queries via "Save signal" so they persist across restarts.

### 1. Token spend per series, last 24h

Group by `LlmCostSeries` and sum tokens:

```seq
LlmCostSeries is not null
| select LlmCostSeries, Tokens = coalesce(Tokens, TokensIn + TokensOut)
| summarize total_tokens = sum(Tokens), count = count() by LlmCostSeries
```

Switch to a Bar chart in the Seq UI; you get one bar per series. This is
the headline cost view.

### 2. Token-spend timeline, three lines

Save this as a signal and graph it:

```seq
LlmCostSeries is not null
| select Timestamp, LlmCostSeries, Tokens = coalesce(Tokens, TokensIn + TokensOut)
| summarize total_tokens = sum(Tokens) by bin(Timestamp, 1h), LlmCostSeries
```

Pick "Time series" with `LlmCostSeries` as the partitioning dimension —
three lines, one per series, sliced into 1-hour buckets.

### 3. Multi-agent partial-failure rate

Counts what fraction of multi-mode runs ended up partial:

```seq
LlmCostSeries == 'ai-review-multi'
| select PromptVersion, ok = (PromptVersion == 'multi-agent.v1')
| summarize total = count(), partial = countif(ok == false) by bin(Timestamp, 1d)
| extend partial_rate = round(100.0 * partial / total, 1)
```

If `partial_rate` ever creeps above ~5% sustained, look at agent timeouts
(`PER_AGENT_TIMEOUT_S` in `multi_agent.py`) or OpenAI 5xx patterns.

### 4. Per-PromptVersion token average

Useful when iterating prompt revisions during the S11-T6 evaluation:

```seq
LlmCostSeries is not null
| select PromptVersion, Tokens = coalesce(Tokens, TokensIn + TokensOut)
| summarize avg_tokens = round(avg(Tokens)), runs = count() by PromptVersion
```

### 5. Per-submission detail (drill-down)

```seq
LlmCostSeries == 'ai-review-multi'
| select Timestamp, SubmissionId, Score, Tokens, PromptVersion, ReviewMode
| order by Timestamp desc
| limit 50
```

---

## Cost expectations (sanity baselines, ADR-037)

| Series | Typical tokens / run | Approx $ / run on `gpt-5.1-codex-mini` |
|---|---|---|
| `ai-review` | ~2k–5k combined | ~$0.005–0.015 |
| `ai-review-multi` | ~4k–10k combined (3 agents × 1.5k output cap + ~6k input each) | ~$0.011–0.033 |
| `project-audit` | ~6k–10k combined | ~$0.015–0.030 |

Multi mode is ~2.2× the single-prompt baseline at default caps. If a
24-hour query shows multi-mode tokens climbing >3× single-mode tokens
per submission, an agent is producing oversized output and the per-agent
output cap (`PER_AGENT_MAX_OUTPUT_TOKENS = 1536` in
`ai-service/app/services/multi_agent.py`) needs revisiting.

---

## How to verify the dashboard works locally

Quick end-to-end smoke (no need to actually spend OpenAI dollars —
mocked agents can drive the log lines):

1. Start the local stack: `docker-compose up -d seq backend`.
2. Run the `SubmissionAnalysisJobMultiModeTests` test suite (which
   already drives both single and multi paths through the logger).
3. Open Seq at `http://localhost:5341` and run query #1 above. You
   should see at least two series — `ai-review` and `ai-review-multi` —
   with non-zero token totals.
4. Trigger a project audit (or run an AI-service `project-audit`
   integration test) to populate the third series.

If a series is missing, grep for the matching log message in source:

```text
"AI review persisted: ..."     -> ai-review / ai-review-multi
"Project audit persisted: ..." -> project-audit
```

and confirm `LlmCostSeries=` is present in the format string.
