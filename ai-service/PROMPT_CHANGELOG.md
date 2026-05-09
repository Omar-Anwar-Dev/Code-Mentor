# Prompt Versioning Changelog

This file tracks every version of every AI-service prompt template. New
versions are introduced when prompt **structure**, **schema**, or **tone**
changes — not when typos or whitespace are tweaked.

The version string is returned with every AI response and persisted on the
backend (`AIAnalysisResult.PromptVersion` / `ProjectAuditResult.PromptVersion`)
so feedback rows in the database can be traced back to the prompt that
produced them.

Convention: bump the patch (`v1.0.1 → v1.0.2`) for clarifications that don't
change the response shape; bump the minor (`v1.0.x → v1.1.0`) when the
response schema gains optional fields; bump the major (`v1.x.y → v2.0.0`) for
breaking schema changes that require a backend update.

---

## Per-task code review prompt (`PROMPT_VERSION` in `app/services/prompts.py`)

### v1.0.0 — 2026-04-22 (Sprint 6 / S6-T1)

Initial structured prompt for the per-task review path (`POST /api/ai-review`).
Defines the 5 PRD F6 score categories (`correctness`, `readability`,
`security`, `performance`, `design`), the 5-section response schema (scores +
strengths + weaknesses + recommendations + summary), and an enhanced mode that
adds detailed inline annotations + learning resources for unfamiliar weak areas.

---

## Project audit prompt (`AUDIT_PROMPT_VERSION` in `app/services/audit_prompts.py`)

### project_audit.v1 — 2026-05-03 (Sprint 9 / S9-T6)

Initial structured prompt for the project-audit path (`POST /api/project-audit`),
introduced under F11 (ADR-031, ADR-034, ADR-035).

**System message (tone):**
- Senior staff engineer conducting a project-level audit on a personal project
  the developer uploaded for honest feedback.
- Direct + assertive (no hedging), prioritized output, structured findings,
  educational without being condescending.
- Honest about strengths — not only critical.
- PURE JSON output (no markdown fences, no prose), `{...}` only.

**Response schema (8 sections):**
1. `overallScore` (int 0-100) + `grade` (A/B/C/D/F)
2. `scores` — 6 categories: `codeQuality`, `security`, `performance`,
   `architectureDesign`, `maintainability`, `completeness` (each int 0-100).
   `completeness` is unique to F11 — compares the developer-supplied project
   description against what the code actually implements.
3. `strengths[]` — what the project does well
4. `criticalIssues[]` — must-fix (security / correctness / data-loss)
5. `warnings[]` — should-fix (architectural / performance)
6. `suggestions[]` — nice-to-have (style / minor)
7. `missingFeatures[]` — capabilities mentioned in description but not implemented
8. `recommendedImprovements[]` (≤5, prioritized) + `techStackAssessment` +
   `inlineAnnotations[]` (per-file/per-line, optional)

**Token caps (ADR-034):**
- Input: 10k tokens (≈ 40k chars, enforced server-side via
  `Settings.ai_audit_max_input_chars` — over-cap returns HTTP 413
  before any LLM call).
- Output: 3k tokens (`Settings.ai_audit_max_output_tokens`, passed as
  `max_output_tokens` to the OpenAI Responses API).

**Retry-on-malformed:** one retry with the standard PURE-JSON reminder
(`_RETRY_REMINDER` shared with the per-task reviewer). Token usage from both
attempts is combined when the retry succeeds, so cost monitoring sees the true
spend.

---

## Multi-agent code review prompts (Sprint 11 / S11-T1; ADR-037)

A second AI-review pipeline (`POST /api/ai-review-multi`) splits the single-prompt
review (F6) into three specialist agents that run in parallel via `asyncio.gather`
and are merged by `services/multi_agent.py`. Each agent has its own versioned
template and its own constrained output schema (only the categories the agent owns).
The orchestrator merges the three responses into the existing `AiReviewResponse`
shape so the backend and frontend continue to consume the same response contract.

The composed prompt-version recorded on `AIAnalysisResults.PromptVersion` is
`multi-agent.v1` (or `multi-agent.v1.partial` when one agent times out / returns
malformed JSON and the orchestrator returns a partial response).

### `prompts/agent_security.v1.txt` — 2026-05-08 (S11-T1)

**Owner agent:** Security agent. Owns the `security` score (1 of 5).

**System message (tone):**
- Senior application-security engineer (15+ yrs).
- OWASP Top 10 + secure-coding focus across Python / JS-TS / Java / C# / PHP / C/C++.
- Direct, high-signal, NO padding — empty findings array is a valid response if the code is genuinely secure.
- Stay strictly inside the security specialty (defer naming / patterns / perf to the other agents).
- PURE JSON output, no fences, no prose.

**Constrained response schema:**
1. `securityScore` (int 0-100) with explicit rubric in the prompt.
2. `securityFindings[]` — capped at 8; `{file, line, [endLine,] codeSnippet, severity, title, message, explanation, suggestedFix, codeExample}`.
3. `securityAnnotations[]` — concise inline-display items, `{file, line, message, severity}`.
4. `summary` — 1-2 sentence security-posture assessment for the orchestrator.

**Token budget:** 6k input + 1.5k output per agent (3 × 1.5k = 4.5k total output across the multi-agent run, vs 2k for single-prompt). Roughly 2.2× cost per submission in `multi` mode (see ADR-037).

### `prompts/agent_performance.v1.txt` — 2026-05-08 (S11-T1)

**Owner agent:** Performance agent. Owns the `performance` score (1 of 5).

**System message (tone):**
- Senior performance engineer (15+ yrs).
- Big-O analysis + DB query patterns + concurrency + I/O + caching + memory.
- Concrete impact at realistic scale ("at 10k users this becomes 100M ops"), not micro-optimization.
- Direct, high-signal, NO padding — empty findings if the code is performant for its workload.
- Stay strictly inside the performance specialty.
- PURE JSON output, no fences, no prose.

**Constrained response schema:**
1. `performanceScore` (int 0-100) with explicit rubric.
2. `performanceFindings[]` — capped at 8; same shape as security findings.
3. `performanceAnnotations[]` — concise inline-display items.
4. `summary` — 1-2 sentence perf-posture assessment.

### `prompts/agent_architecture.v1.txt` — 2026-05-08 (S11-T1)

**Owner agent:** Architecture agent. Owns `correctness` + `readability` + `design` scores (3 of 5, the broadest scope by design — per ADR-037).

**System message (tone):**
- Senior staff engineer (15+ yrs).
- SOLID / DDD / Clean Architecture / API design + naming + maintainability + correctness.
- Also produces the LEARNER-FACING fields the merged response needs:
  `strengths`, `weaknesses`, `strengthsDetailed`, `weaknessesDetailed`,
  `recommendations`, `learningResources`, `executiveSummary`, `summary`,
  `progressAnalysis` (since these are not security- or performance-specific).
- Adapts depth to learner skill level (`{skill_level}` parameter).
- Honest about strengths AND weaknesses — not only critical.
- Defers to the security and performance agents for those specialties.
- PURE JSON output, no fences, no prose.

**Constrained response schema:**
1. Three scores: `correctnessScore`, `readabilityScore`, `designScore` (int 0-100 each).
2. `strengths[]` (3-5 strings) and `weaknesses[]` (3-5 strings) for the merged response's summary lists.
3. `strengthsDetailed[]` and `weaknessesDetailed[]` — same shape as the single-prompt review fields.
4. `architectureFindings[]` — capped at ~6; `{file, line, codeSnippet, issueType, severity, title, message, explanation, suggestedFix, codeExample}`. `issueType` constrained to `correctness | readability | design`.
5. `architectureAnnotations[]` — inline-display items.
6. `recommendations[]` — 2-4 items with priority + category + estimatedEffort.
7. `learningResources[]` — 1-3 reputable sources per major weakness.
8. `executiveSummary` (3-4 paragraphs) + `summary` (2-3 sentences) + `progressAnalysis`.

### Orchestrator behavior (recap, see ADR-037)

- Three coroutines spawned in parallel via `asyncio.gather`.
- Per-agent timeout 90 s. Any agent that times out or returns malformed JSON → orchestrator marks affected categories `null`, populates `meta.partialAgents`, and persists `PromptVersion = "multi-agent.v1.partial"`.
- Score merge: assemble 5-category vector from agent-owned scores. `overallScore` = mean of available (non-null) scores.
- Strengths / weaknesses: from architecture agent, deduped by Jaccard similarity ≥0.7 (no-op when only one agent emits them; future-proof for multi-agent expansion).
- Detailed issues: union of `securityFindings` (issueType=`security`) + `performanceFindings` (issueType=`performance`) + `architectureFindings` (issueType varies).
- Inline annotations: union by `(file, line)`. If two agents annotate the same line, both are kept with agent prefix in displayed text.
- Recommended tasks / resources / executive summary: architecture agent only.
- Default `AI_REVIEW_MODE=single` in production; `multi` is opt-in for thesis evaluation runs (S11-T6).
