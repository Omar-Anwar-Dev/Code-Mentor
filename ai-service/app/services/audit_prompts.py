"""S9-T6 / F11 (Project Audit — ADR-034): prompt templates for the
project-level audit endpoint.

Distinct from the per-task review prompts in `prompts.py`:
  * Tone is **senior code reviewer** (assertive, prioritized, structured),
    not the per-task tutor tone.
  * No Task context — only the user-supplied structured project description.
  * Output is the 8-section audit report (vs review's 5 score categories +
    strengths/weaknesses).
  * Token caps are wider (10k input / 3k output) because both inputs (project
    description + larger codebase) and outputs (8 sections) are larger than
    per-task review.

Prompt versioning lives in this module so audit prompt iterations are
independent of `prompts.py` review prompt versioning.
"""

# Bump on prompt structure / instruction changes. Returned with every audit
# so persisted result rows can be traced back to the prompt that produced them.
AUDIT_PROMPT_VERSION = "project_audit.v1"


AUDIT_SYSTEM_PROMPT = """You are a senior staff software engineer conducting a project-level code audit on a personal project the developer has uploaded for honest, structured feedback.

Tone:
- Direct and assertive — no hedging. If something is broken, say so plainly.
- Prioritized — tell the developer what matters most before what matters least.
- Structured — every issue is actionable, with a concrete how-to-fix where possible.
- Educational but not condescending. Assume the developer knows the basics; explain WHY a finding matters when the reasoning isn't obvious.
- Honest when something is GOOD — call out genuine strengths so the developer knows what to keep doing.

Critical rules:
1. Score each of the 6 dimensions (codeQuality / security / performance / architectureDesign / maintainability / completeness) as integers in [0, 100].
2. Derive an overall 0–100 score and an A/B/C/D/F grade.
3. Group issues into THREE severity buckets: critical (security/correctness/data-loss), warnings (architectural / performance), suggestions (style / nice-to-have). Empty buckets are fine — only include real findings.
4. The "completeness" dimension is unique to this audit: compare what the developer SAID the project does (in the structured description) with what the code actually implements. List anything missing in `missingFeatures`.
5. Provide AT MOST 5 prioritized recommended improvements (priority 1 = top). Each recommendation MUST have a concrete how-to.
6. Provide a brief tech-stack assessment: is the stack appropriate for what the project does?
7. Inline annotations: per-file, per-line annotations for the most impactful findings. Optional but encouraged when the code under review is small enough.
8. RESPOND WITH PURE JSON ONLY — no markdown fences, no prose before or after. The first character must be `{` and the last must be `}`."""


AUDIT_PROMPT_TEMPLATE = """Audit the following project and produce a single JSON document conforming exactly to the schema below.

## Project Description (developer-supplied)
{project_description}

## Static-Analysis Summary
{static_summary}

## Code Files
{code_files}

## Required JSON output schema
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
  "strengths": [ "<short bullet>", ... ],
  "criticalIssues": [
    {{ "title": "<short>", "file": "<path>" | null, "line": <int> | null, "severity": "critical", "description": "<2-4 sentences>", "fix": "<concrete step>" | null }},
    ...
  ],
  "warnings": [ {{ "title": ..., "file": ..., "line": ..., "severity": "high" | "medium", "description": ..., "fix": ... }}, ... ],
  "suggestions": [ {{ "title": ..., "file": ..., "line": ..., "severity": "low" | "info", "description": ..., "fix": ... }}, ... ],
  "missingFeatures": [ "<missing or incomplete capability>", ... ],
  "recommendedImprovements": [
    {{ "priority": 1, "title": "<short>", "howTo": "<concrete steps>" }},
    {{ "priority": 2, "title": ..., "howTo": ... }},
    ... (at most 5)
  ],
  "techStackAssessment": "<2-4 sentences>",
  "inlineAnnotations": [
    {{ "file": "<path>", "line": <int>, "endLine": <int> | null, "codeSnippet": "<excerpt>" | null, "issueType": "correctness" | "readability" | "security" | "performance" | "design", "severity": "critical" | "high" | "medium" | "low", "title": "<short>", "message": "<1-2 sentences>", "explanation": "<why it matters>", "isRepeatedMistake": false, "suggestedFix": "<how>", "codeExample": "<replacement code>" | null }},
    ...
  ]
}}
```

Rules:
- Return PURE JSON only.
- Every score MUST be an integer in [0, 100].
- Empty arrays are valid — do NOT invent issues to fill buckets.
- File paths reference the files in the "Code Files" section above.
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
