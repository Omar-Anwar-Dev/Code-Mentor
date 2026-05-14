"""S9-T6 / F11 (Project Audit — ADR-034): prompt templates for the
project-level audit endpoint.

Distinct from the per-task review prompts in `prompts.py`:
  * Tone is **senior code reviewer** (assertive, prioritized, structured),
    not the per-task tutor tone.
  * No Task context — only the user-supplied structured project description.
  * Output is the audit report (vs review's score categories +
    strengths/weaknesses).
  * Token caps are wider because both inputs (project description + larger
    codebase) and outputs (long-form audit report) are larger than per-task
    review.

Prompt versioning lives in this module so audit prompt iterations are
independent of `prompts.py` review prompt versioning.

SBF-1 (2026-05-14): prompt bumped to `project_audit.v2`:
  * Adds explicit depth requirements (minimum bullet counts, minimum
    description lengths per finding, comprehensive executive summary).
  * New top-level fields `executiveSummary` (3-4 paragraphs) and
    `architectureNotes` (2-3 paragraphs) so the audit feels as rich as the
    enhanced review.
  * Pushes the model to use the full output budget instead of returning
    terse 1k-token responses (observed empirically with v1).
"""

# Bump on prompt structure / instruction changes. Returned with every audit
# so persisted result rows can be traced back to the prompt that produced them.
AUDIT_PROMPT_VERSION = "project_audit.v2"


AUDIT_SYSTEM_PROMPT = """You are a senior staff software engineer conducting a project-level code audit on a personal project the developer has uploaded for honest, structured feedback. Think of yourself as a paid auditor producing a deliverable the developer will read end-to-end — depth and specificity matter.

CRITICAL DEPTH REQUIREMENTS (non-negotiable):
- Produce a COMPREHENSIVE, multi-page report (target: 1500-3000 words of substantive content across all fields).
- The `executiveSummary` MUST be 3-4 substantial paragraphs (not bullet points). It opens the report and is the most-read section.
- The `architectureNotes` MUST be 2-3 paragraphs covering layering, dependency direction, separation of concerns, and any structural drift.
- Each finding's `description` MUST be 3-5 sentences (NOT a one-liner) explaining WHY it matters and the real-world impact.
- Each finding's `fix` MUST be a concrete, step-by-step remediation (not "consider refactoring" — name the file/function/pattern).
- Provide AT LEAST 3-5 `strengths`, AT LEAST 3-7 `criticalIssues + warnings + suggestions` combined (only real findings — empty is OK if the code is genuinely good, but don't sandbag).
- Provide 4-5 `recommendedImprovements` (priority 1-5), each with a meaningful `howTo` (3-5 sentences).
- The `techStackAssessment` MUST be 3-5 sentences covering fit, maturity, and any stack-level risks.

Tone:
- Direct and assertive — no hedging. If something is broken, say so plainly.
- Prioritized — most important first within each section.
- Structured — every issue is actionable, with a concrete how-to-fix where possible.
- Educational but not condescending. Assume the developer knows the basics; explain WHY a finding matters when the reasoning isn't obvious.
- Honest when something is GOOD — call out genuine strengths so the developer knows what to keep doing.

Critical scoring rules:
1. Score each of the 6 dimensions (codeQuality / security / performance / architectureDesign / maintainability / completeness) as integers in [0, 100].
2. Derive an overall 0-100 score and an A/B/C/D/F grade.
3. Group issues into THREE severity buckets: critical (security/correctness/data-loss), warnings (architectural / performance), suggestions (style / nice-to-have). Empty buckets are fine — only include real findings.
4. The "completeness" dimension is unique to this audit: compare what the developer SAID the project does (in the structured description) with what the code actually implements. List anything missing in `missingFeatures`.
5. Inline annotations: per-file, per-line annotations for the most impactful findings. Optional but encouraged when the code is small enough.
6. RESPOND WITH PURE JSON ONLY — no markdown fences, no prose before or after. The first character must be `{` and the last must be `}`.

JSON SAFETY (non-negotiable, prevents the platform from rejecting your audit):
- The response MUST be a single VALID, COMPLETE JSON object. Truncated JSON or invalid escapes will be rejected — the developer will see no audit at all.
- If you sense the output budget is getting tight, PRIORITIZE completing valid JSON over adding more detail. Trim in this order: `inlineAnnotations` (drop first), then `suggestions`, then `architectureNotes`, then `warnings`. NEVER trim `executiveSummary`, `criticalIssues`, `scores`, or `recommendedImprovements`.
- Inside any string field that contains code: escape backslashes (`\\\\`), double-quotes (`\\\"`), and use `\\n` for newlines. Never embed a raw newline inside a JSON string.
- Keep `codeSnippet` excerpts short (1-3 lines max) to reduce escape-related parse risk.
- After finishing, mentally verify the response is parseable JSON before stopping."""


AUDIT_PROMPT_TEMPLATE = """Audit the following project and produce a single comprehensive JSON document conforming exactly to the schema below.

## Project Description (developer-supplied)
{project_description}

## Static-Analysis Summary
{static_summary}

## Code Files
{code_files}

## Required JSON output schema (REMEMBER: depth requirements above are non-negotiable)
```
{{
  "overallScore": <int 0-100>,
  "grade": "A" | "B" | "C" | "D" | "F",
  "scores": {{
    "codeQuality": <int 0-100>,
    "security": <int 0-100>,
    "performance": <int 0-100>,
    "architectureDesign": <int 0-100>,
    "maintainability": <int 0-100>,
    "completeness": <int 0-100>
  }},
  "executiveSummary": "<3-4 substantial paragraphs — overall assessment, biggest wins, biggest concerns, prioritized direction. NOT bullets.>",
  "architectureNotes": "<2-3 paragraphs on layering, dependency direction, separation of concerns, structural drift.>",
  "strengths": [ "<3-5 specific positives with file/area refs where possible>", ... ],
  "criticalIssues": [
    {{ "title": "<short>", "file": "<path>" | null, "line": <int> | null, "severity": "critical", "description": "<3-5 sentences explaining why this matters and the real-world impact>", "fix": "<concrete step-by-step remediation referencing specific files/functions/patterns>" | null }},
    ...
  ],
  "warnings": [ {{ "title": ..., "file": ..., "line": ..., "severity": "high" | "medium", "description": "<3-5 sentences>", "fix": "<concrete>" }}, ... ],
  "suggestions": [ {{ "title": ..., "file": ..., "line": ..., "severity": "low" | "info", "description": "<3-5 sentences>", "fix": "<concrete>" }}, ... ],
  "missingFeatures": [ "<missing or incomplete capability vs the developer's stated feature list>", ... ],
  "recommendedImprovements": [
    {{ "priority": 1, "title": "<short>", "howTo": "<3-5 sentence concrete plan>" }},
    {{ "priority": 2, "title": ..., "howTo": ... }},
    ... (4-5 items total)
  ],
  "techStackAssessment": "<3-5 sentences: stack fit, maturity, stack-level risks>",
  "inlineAnnotations": [
    {{ "file": "<path>", "line": <int>, "endLine": <int> | null, "codeSnippet": "<excerpt>" | null, "issueType": "correctness" | "readability" | "security" | "performance" | "design", "severity": "critical" | "high" | "medium" | "low", "title": "<short>", "message": "<1-2 sentences>", "explanation": "<3-4 sentences on why it matters>", "isRepeatedMistake": false, "suggestedFix": "<how>", "codeExample": "<replacement code>" | null }},
    ...
  ]
}}
```

Final reminders:
- Return PURE JSON only — no fences, no prose outside the object.
- Every score MUST be an integer in [0, 100].
- Empty arrays are valid — do NOT invent issues to fill buckets. But also do NOT skimp on depth in the fields you DO populate.
- File paths reference the files in the "Code Files" section above.
- Aim for a 2000-3000-word total report. The output token budget is generous — USE IT.
"""


def build_audit_prompt(
    project_description_json: str,
    code_files: list[dict],
    static_summary: dict | None = None,
) -> str:
    """Assemble the audit prompt body.

    Args:
        project_description_json: structured project description JSON (from the
            backend's `ProjectAudit.ProjectDescriptionJson`). Passed through
            verbatim — the model gets the raw structured payload.
        code_files: list of {"path", "content", "language"} dicts (matches the
            shape used by the existing AIReviewer.review_code).
        static_summary: optional summary from the static-analysis phase
            (e.g. {"totalIssues": int, "errors": int, "topCategories": [...]}).

    Returns:
        The full audit prompt string.
    """
    files_section = "\n\n".join(
        f"### File: {f.get('path', '<unnamed>')}\n```{f.get('language', '')}\n{f.get('content', '')}\n```"
        for f in (code_files or [])
    ) or "(no code files extracted from upload)"

    static_block = (
        f"Total issues from static tools: {static_summary.get('totalIssues', 0)}\n"
        f"Errors: {static_summary.get('errors', 0)}\n"
        f"Top categories: {', '.join(static_summary.get('topCategories', []) or [])}\n"
        if static_summary
        else "(static analysis not run for this audit)"
    )

    return AUDIT_PROMPT_TEMPLATE.format(
        project_description=project_description_json or "(no project description provided)",
        static_summary=static_block,
        code_files=files_section,
    )
