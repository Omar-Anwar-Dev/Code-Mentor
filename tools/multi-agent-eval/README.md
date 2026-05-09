# Multi-Agent Evaluation Harness (S11-T6 / F13 / ADR-037)

Compares the **single-prompt** AI review (`/api/ai-review`) against the
**multi-agent** review (`/api/ai-review-multi`) on the same submissions.
Output feeds the thesis chapter on "AI Review Architecture: Single-Prompt
vs Specialist-Agent Decomposition."

## Quick start

From the repository root, with the AI service running on
`http://localhost:8001` (or whatever you've set):

```bash
# Real run (uses OpenAI tokens — see cost note below)
python tools/multi-agent-eval/run.py

# Dry run (no HTTP, no cost — verifies fixtures parse + writes the
# requests that WOULD be sent under tools/multi-agent-eval/results/.../raw/)
python tools/multi-agent-eval/run.py --dry-run

# Custom base URL / fixture set
python tools/multi-agent-eval/run.py \
    --base-url http://localhost:8001 \
    --fixtures-dir tools/multi-agent-eval/fixtures
```

The script uses **only the Python stdlib** (`urllib`, `json`, `csv`) — no extra
deps to install. It runs on the same Python that runs the rest of the AI
service tooling.

## What gets written

Every run lands under `tools/multi-agent-eval/results/<UTC-timestamp>/`:

```
results/20260908-141730/
├── raw/
│   ├── python-01-flask-sql-injection-single.json
│   ├── python-01-flask-sql-injection-multi.json
│   ├── ...
├── comparison.csv          # one row per fixture, machine-readable
├── comparison.md           # human-readable side-by-side table + aggregates
└── scoring-sheet-blank.md  # blank rubric for the 2 supervisors
```

`comparison.md` is the artifact for the thesis chapter — copy the table
straight into `docs/demos/multi-agent-evaluation.md` when the run is final.

## Cost expectations

At default caps (single = 2k output, multi = 3 × 1.5k = 4.5k output) and
typical inputs of ~1–2k tokens, **one fixture costs roughly:**

- Single mode: ~$0.005–0.015 on `gpt-5.1-codex-mini`
- Multi mode: ~$0.011–0.033 (~2.2× single, per ADR-037)

For the 6 fixtures shipped here, expect ~$0.20–0.30 total per full pass.
For the plan's N=15 target, ~$0.50–0.80.

## Adding fixtures

Each fixture is a single JSON file in `fixtures/` with this shape:

```json
{
  "id": "lang-NN-short-slug",
  "language": "python | javascript | csharp",
  "expected_signal": "Free-form note for human reviewers — what each agent should flag.",
  "submissionId": "eval-lang-NN",
  "code_files": [
    {"path": "...", "language": "python", "content": "..."}
  ],
  "project_context": {
    "name": "...", "description": "...",
    "learningTrack": "Backend",
    "difficulty": "Intermediate",
    "focusAreas": ["security"]
  }
}
```

The plan calls for **N=15 (5 per language)**. 6 fixtures ship as a
starting set — extend as needed:

| Language | Shipped | Add |
|---|---|---|
| Python | `python-01` (SQL injection), `python-02` (N+1 query) | 3 more — see suggestions below |
| JavaScript | `js-01` (hardcoded API key), `js-02` (sync I/O + O(n²)) | 3 more |
| C# | `cs-01` (clean baseline), `cs-02` (insecure deserialization) | 3 more |

Suggested additions to reach N=15:
- A clean Python sample (no obvious flaws — tests the "no padding" rule)
- A clean JS sample (same)
- A C# sample with an N+1 LINQ query (perf agent target)
- A Python sample with poor naming / 200-line function (architecture agent target)
- A JS sample with prototype-pollution vector (security agent target)
- A C# sample with thread-unsafe singleton (architecture + perf overlap)

Mix language-internal patterns: some fixtures should be obviously flawed
(stress the "find it" capability), some should be subtle (stress the
"don't invent issues" discipline encoded in the prompts).

## Supervisor scoring sheet

`scoring-sheet-blank.md` is auto-generated from the fixture list. Each
fixture gets two unlabeled review blocks (A / B) and a 1–5 rubric across
five dimensions:

- **Specificity** — exact files/lines, real code quoted
- **Actionability** — could a learner act without further help?
- **Educational value** — does it *teach*, not just point?
- **Tone** — encouraging, honest, age-appropriate
- **Coverage** — strengths AND weaknesses; balanced; no padding

Supervisors score blind. The harness records the A/B ↔ single/multi
mapping in the run's `raw/` folder so the mapping can be revealed only
after scores are submitted.

## Aggregation

Once both supervisor sheets come back, average the scores per fixture
per mode per dimension, then aggregate across fixtures. Numbers go into
`docs/demos/multi-agent-evaluation.md` Section 4 (Supervisor relevance
scores) along with the harness-produced score deltas, response length,
and token cost from `comparison.md`.

## Plumbing notes

- The harness **does not crash** on errors. If the AI service returns
  503 (no API key) or the orchestrator times out, the response is captured
  with `_harness_error` and the row in `comparison.md` shows the failure
  in place of metrics. This makes the harness valid as a CI smoke too.
- `--dry-run` lets you author fixtures without spending any tokens — it
  writes the request bodies to disk so you can inspect what the
  endpoints would receive.
- All outputs are UTF-8. The markdown is GFM-flavored.
