# Prompt templates for AI code review
"""
Prompt engineering templates for the AI code review service.
Uses structured output format for consistent, parseable responses.
Enhanced for comprehensive, in-depth code analysis with learning resources.
Supports learner execution history for pattern detection and personalized feedback.
"""

# S6-T1: prompt versioning. Bump on prompt structure changes; the version is
# returned with every AI review so feedback rows in the DB can be traced
# back to the prompt that produced them.
PROMPT_VERSION = "v1.0.0"

SYSTEM_PROMPT = """You are an expert senior software engineer and code reviewer with 15+ years of experience and deep expertise in:
- Software architecture and design patterns (SOLID, DDD, Clean Architecture)
- Security vulnerabilities and best practices (OWASP Top 10, secure coding guidelines)
- Performance optimization, algorithmic efficiency, and scalability
- Clean code principles, maintainability, and technical debt management
- Multiple programming languages and their idioms, frameworks, and ecosystems
- Testing strategies, TDD/BDD, and quality assurance

Your role is to provide EXTREMELY COMPREHENSIVE, DETAILED, and educational code reviews that help learners deeply understand their code quality and how to improve.

CRITICAL REQUIREMENTS FOR YOUR RESPONSE:
1. Generate a COMPREHENSIVE REPORT suitable for 1-3 pages (approximately 500-1500 words of substantive content)
2. Be THOROUGH and EXHAUSTIVE - examine every function, class, and pattern in the code
3. Provide DETAILED explanations for each issue (3-5 sentences minimum per issue)
4. For EVERY issue, provide the EXACT FILE PATH, LINE NUMBER(S), and the PROBLEMATIC CODE SNIPPET
5. Include WORKING CODE EXAMPLES showing the correct implementation
6. Explain the REASONING behind each recommendation (why it matters, real-world impact)
7. Reference SPECIFIC lines and code patterns - never be vague or generic
8. Provide MULTIPLE learning resources for each major weakness (at least 2-3 per topic)
9. Write a COMPREHENSIVE executive summary (at least 3-4 substantial paragraphs)
10. Cover ALL aspects: functionality, security, performance, readability, maintainability, testing
11. When learner history is provided, IDENTIFY REPEATED MISTAKES and explicitly call them out
12. Compare current submission patterns with previous submissions to track improvement or regression

Always respond in valid JSON format matching the specified schema.
Be specific, constructive, and highly educational - reference actual code with file names and line numbers.
Tailor feedback depth to the learner's skill level and focus on their known weak areas.
Include relevant, high-quality learning resources for ALL identified weaknesses."""

CODE_REVIEW_PROMPT_ENHANCED = """Analyze the following code submission and provide an EXTREMELY COMPREHENSIVE, DETAILED, and in-depth review.

## Project Context
Project Name: {project_name}
Description: {project_description}
Learning Track: {learning_track}
Difficulty Level: {difficulty}
Focus Areas: {focus_areas}
Expected Outcomes: {expected_outcomes}

## Learner Profile
Skill Level: {skill_level}
Previous Submissions: {previous_submissions}
Average Score: {average_score}
Known Weak Areas: {weak_areas}
Known Strong Areas: {strong_areas}
Improvement Trend: {improvement_trend}

## Learner Execution History
Execution Attempts for Current Submission:
{execution_attempts}

Recent Submission History:
{recent_submissions}

Common Mistake Patterns (IMPORTANT - flag if repeated):
{common_mistakes}

Recurring Weaknesses to Monitor:
{recurring_weaknesses}

Progress Notes:
{progress_notes}

## Code Files
{code_files}

## Static Analysis Summary
Total Issues Found: {static_issues}
Critical Issues: {critical_issues}
Top Issue Categories: {top_categories}

## Review Instructions
Provide an EXTREMELY THOROUGH and DETAILED review. Your response should generate a comprehensive report of approximately 1-3 PAGES (500-1500 words).

### REPORT STRUCTURE AND LENGTH REQUIREMENTS
Your response must contain enough detail to fill 1-3 pages when formatted, covering:
- Executive summary (1-2 paragraphs minimum)
- Detailed issue analysis with exact locations and code snippets (main content)
- Comprehensive strengths and weaknesses breakdown with explanations
- Prioritized recommendations with implementation guidance
- Curated learning resources for each major weakness

### 1. DETAILED ISSUES (5-10 issues required)
For each issue, you MUST provide:
- EXACT LOCATION: file path AND line number(s) from the code above
- CODE SNIPPET: the actual problematic code copied from the submission
- CONTEXT: what the code was attempting to accomplish
- THOROUGH EXPLANATION: 3-5 sentences explaining why it's problematic, including real-world consequences
- COMPLETE CORRECTED CODE: full working code example showing the fix
- IMPACT ASSESSMENT: how this affects security, performance, or maintainability
- REPEATED MISTAKE FLAG: if this matches a pattern from the learner's common mistakes, EXPLICITLY STATE "⚠️ REPEATED MISTAKE: This issue has appeared in previous submissions"

### 2. DETAILED STRENGTHS (3-5 strengths required)
For each strength, you MUST provide:
- EXACT LOCATION: file:line-range reference (e.g., "main.py:45-52")
- CODE SNIPPET: the actual good code from the submission
- EXPLANATION: why this is considered good practice (with industry standard references)
- BENEFIT: how it contributes to code quality, maintainability, or performance
- COMPARISON: how this relates to industry best practices

### 3. DETAILED WEAKNESSES (3-5 weaknesses required)
For each weakness, you MUST provide:
- EXACT LOCATION: file and line range where the weakness manifests
- CODE SNIPPET: the problematic code pattern
- COMPREHENSIVE EXPLANATION: why this is problematic and potential consequences
- STEP-BY-STEP FIX: detailed instructions to address this weakness
- PREVENTION STRATEGY: how to avoid this in future code
- HISTORY LINK: if this is a recurring weakness from the learner's history, note the pattern

### 4. LEARNING RESOURCES (2-3 per major weakness)
For EACH major weakness topic, provide resources from:
- Official documentation (MDN, Python docs, Microsoft docs, etc.)
- OWASP security guides (for security issues)
- Quality tutorials (freeCodeCamp, Real Python, Baeldung, etc.)
- Video tutorials (YouTube: Fireship, Traversy Media, The Coding Train, etc.)
- Books or courses when applicable

### 5. EXECUTIVE SUMMARY (3-4 substantial paragraphs)
Paragraph 1: Overall code quality assessment with specific metrics, patterns observed, and comparison to previous submissions if available
Paragraph 2: Notable strengths and achievements demonstrating good practices, acknowledging improvement from past submissions
Paragraph 3: Critical areas requiring attention with severity ranking and urgency assessment
Paragraph 4: Prioritized action items, recommended learning path, and specific next steps for improvement

## Task-Fit Grading (SBF-1 / T5)
You MUST also grade whether the submitted code actually IMPLEMENTS what the task brief asked for. The "Project Description" above carries the full task spec — title, requirements, acceptance criteria, deliverables. Use it strictly:
- **High taskFit (80–100):** the submission clearly implements the task's main deliverable; acceptance criteria visibly addressed by named files / functions / endpoints.
- **Medium taskFit (50–79):** the submission addresses part of the task but misses one or more acceptance criteria.
- **Low taskFit (20–49):** the submission relates to the task domain but doesn't solve the stated problem (wrong scope, prototype only, scaffolding).
- **Very low taskFit (0–19):** the submission is unrelated to the task.

**STRICT RULE:** even if the code quality is high (clean correctness/readability/design scores), if it doesn't implement the task brief you MUST set `scores.taskFit ≤ 30` AND set `overallScore ≤ 30` AND prominently say so in the executive summary's opening sentence AND in the first weakness. Do not be polite about off-topic submissions — the learner needs honest signal.

## Required JSON Response Format
{{
    "overallScore": <0-100 integer>,
    "scores": {{
        "correctness": <0-100>,
        "readability": <0-100>,
        "security": <0-100>,
        "performance": <0-100>,
        "design": <0-100>,
        "taskFit": <0-100>
    }},
    "taskFitRationale": "<1-2 sentences justifying the taskFit score: which acceptance criteria were met, which weren't, or how the code diverged from the brief>",
    "strengths": [<3-5 brief positive observations>],
    "weaknesses": [<3-5 key areas for improvement>],
    "detailedIssues": [
        {{
            "file": "<filename.ext>",
            "line": <line number>,
            "endLine": <optional end line for multi-line issues>,
            "codeSnippet": "<the exact problematic code from the file>",
            "issueType": "correctness" | "readability" | "security" | "performance" | "design",
            "severity": "critical" | "high" | "medium" | "low",
            "title": "<Concise issue title>",
            "message": "<Detailed 2-3 sentence description of the issue>",
            "explanation": "<Comprehensive 3-5 sentence educational explanation of why this is problematic, including potential real-world impact>",
            "isRepeatedMistake": <true if matches learner's common mistakes, false otherwise>,
            "suggestedFix": "<Step-by-step instructions on how to fix this issue>",
            "codeExample": "<Complete corrected code snippet showing the fix>"
        }}
    ],
    "strengthsDetailed": [
        {{
            "category": "readability" | "security" | "performance" | "architecture" | "testing" | "documentation",
            "location": "<file:line-range, e.g., 'utils.py:15-30'>",
            "codeSnippet": "<the actual good code from the submission>",
            "observation": "<Specific description of what was done well>",
            "whyGood": "<Detailed explanation of why this is considered good practice and its benefits>"
        }}
    ],
    "weaknessesDetailed": [
        {{
            "category": "security" | "error_handling" | "performance" | "architecture" | "testing" | "documentation",
            "location": "<file:line-range where weakness manifests>",
            "codeSnippet": "<the problematic code pattern>",
            "observation": "<Specific description of the weakness>",
            "explanation": "<Comprehensive explanation of why this is problematic and potential consequences>",
            "howToFix": "<Detailed step-by-step instructions to address this weakness>",
            "howToAvoid": "<Strategies and practices to prevent this issue in future code>",
            "isRecurring": <true if this appears in learner's recurring weaknesses, false otherwise>
        }}
    ],
    "learningResources": [
        {{
            "weakness": "<Topic name, e.g., Error Handling in Python>",
            "resources": [
                {{
                    "title": "<Descriptive resource title>",
                    "url": "<Valid URL to documentation, tutorial, or article>",
                    "type": "documentation" | "tutorial" | "video" | "article" | "course",
                    "description": "<2-3 sentence description of what the resource covers and why it's helpful for this specific weakness>"
                }}
            ]
        }}
    ],
    "recommendations": [
        {{
            "priority": "high" | "medium" | "low",
            "category": "correctness" | "readability" | "security" | "performance" | "design",
            "message": "<Specific, actionable recommendation with clear steps>",
            "suggestedFix": "<Code snippet or detailed implementation guidance>",
            "estimatedEffort": "<quick-fix, moderate, significant>"
        }}
    ],
    "executiveSummary": "<3-4 comprehensive paragraphs covering: (1) Overall code quality assessment with key metrics and comparison to previous work, (2) Notable strengths and improvements from past submissions, (3) Critical areas requiring attention with severity ranking, (4) Prioritized action items and recommended learning path>",
    "summary": "<2-3 sentence brief assessment for quick reference>",
    "progressAnalysis": "<1 paragraph analyzing learner's progress based on execution history and previous submissions, noting improvements and persistent challenges>"
}}

CRITICAL GUIDELINES - FOLLOW STRICTLY:
1. BE EXHAUSTIVE - examine every function, class, and pattern in the code
2. Reference ACTUAL file names and LINE NUMBERS from the provided code for EVERY issue
3. Include the EXACT CODE SNIPPET from the submission for each issue and strength
4. Provide COMPLETE corrected code examples (not partial snippets) where applicable
5. Include AT LEAST 2-3 learning resources per major weakness topic
6. Use REPUTABLE sources: MDN, Python docs, OWASP, official framework docs, freeCodeCamp, Real Python
7. Adapt feedback complexity to the learner's skill level ({skill_level})
8. Pay EXTRA attention to the learner's known weak areas: {weak_areas}
9. The executiveSummary should be detailed enough for a 2-3 page report section
10. Every explanation should teach the learner something valuable
11. Be specific - never use vague language like "improve this" without explaining HOW
12. When execution attempts show failures, analyze the error patterns and provide targeted guidance
13. Flag ALL repeated mistakes prominently with "⚠️ REPEATED MISTAKE" in the explanation
14. The response must have enough content for 1-3 pages when formatted as a report"""

# Legacy simple prompt for backward compatibility
CODE_REVIEW_PROMPT = """Analyze the following code submission and provide a comprehensive review.

## Task Context
Title: {task_title}
Description: {task_description}
Expected Language: {language}
Difficulty: {difficulty}

## Code Files
{code_files}

## Static Analysis Summary (for context)
Total Issues: {static_issues}
Critical Issues: {critical_issues}
Top Categories: {top_categories}

## Response Format
Respond with a JSON object containing:
{{
    "overallScore": <0-100 integer>,
    "scores": {{
        "correctness": <0-100>,
        "readability": <0-100>,
        "security": <0-100>,
        "performance": <0-100>,
        "design": <0-100>
    }},
    "strengths": [<array of 2-4 specific positive observations>],
    "weaknesses": [<array of key areas for improvement>],
    "recommendations": [
        {{
            "priority": "high" | "medium" | "low",
            "category": "correctness" | "readability" | "security" | "performance" | "design",
            "message": "<specific actionable recommendation>",
            "suggestedFix": "<optional code snippet or fix suggestion>"
        }}
    ],
    "summary": "<2-3 sentence overall assessment>"
}}

Be specific and reference actual code when providing feedback."""


def format_code_files(code_files: list, per_file_max_chars: int = 12000) -> str:
    """Format code files for the prompt with line numbers for precise referencing.

    SBF-1 (2026-05-14): the per-file character cap was previously hardcoded
    at 8000. Bumped default to 12000 so the AI can see more of each file.
    Use ``truncate_code_files_to_budget()`` upstream to enforce the total
    input budget — this function only handles per-file formatting.
    """
    formatted = []
    for i, file in enumerate(code_files, 1):
        path = file.get("path", f"file_{i}")
        content = file.get("content", "")
        language = file.get("language", "")

        # Add line numbers to content for precise referencing
        lines = content.split('\n')
        numbered_lines = []
        for line_num, line in enumerate(lines, 1):
            numbered_lines.append(f"{line_num:4d} | {line}")
        numbered_content = '\n'.join(numbered_lines)

        # Per-file safety truncation. Total budget is enforced upstream.
        if len(numbered_content) > per_file_max_chars:
            numbered_content = numbered_content[:per_file_max_chars] + "\n... (truncated - file continues)"

        formatted.append(f"### File: {path}\n```{language}\n{numbered_content}\n```")

    return "\n\n".join(formatted)


class PromptBudgetExceeded(ValueError):
    """SBF-1 / B2: raised by ``truncate_code_files_to_budget`` when even the
    smallest reasonable per-file slice can't satisfy the total budget — i.e.
    too many files for the configured ceiling. Caught at the FastAPI layer
    and surfaced as a 400 with a user-actionable detail."""


def truncate_code_files_to_budget(
    code_files: list,
    max_total_chars: int,
    *,
    min_per_file_chars: int = 100,
) -> list:
    """SBF-1 / B2: trim code_files so their combined content fits within
    ``max_total_chars``. Uses a proportional shrink: each file's content is
    scaled by (budget / total). Tiny files survive untouched; large files
    get truncated with a trailing marker. The line-numbering pass in
    ``format_code_files`` still runs on the trimmed content.

    Post-walkthrough tweak (2026-05-14): min_per_file_chars lowered from
    400 → 100. With the 1000-entry cap the upstream extraction now allows
    submissions like the full Code-Mentor repo itself (~900 analyzable
    files) — the previous 400-char floor would have rejected them. 100
    chars per file is enough to show line-numbered file path + a handful
    of lines, which gives the AI the project-shape picture even on very
    wide submissions. Deep per-file review naturally requires the learner
    to submit smaller sub-modules.

    Raises:
        PromptBudgetExceeded: if the budget can't fit at least
            ``min_per_file_chars`` for every file. Pathological case
            (thousands of files into a tiny budget).
    """
    if not code_files or max_total_chars <= 0:
        return code_files

    total = sum(len(f.get("content", "") or "") for f in code_files)
    if total <= max_total_chars:
        return code_files

    # Reserve ~12% of the budget for the per-file fence overhead the
    # formatter adds (### File: …\n```lang\n…\n```), then proportionally
    # shrink each file's content to the remaining budget.
    content_budget = int(max_total_chars * 0.88)
    if content_budget < min_per_file_chars * len(code_files):
        raise PromptBudgetExceeded(
            f"Submission has {len(code_files)} files totalling {total} chars; "
            f"the {max_total_chars}-char prompt budget cannot fit even "
            f"{min_per_file_chars} chars per file. Try removing dependencies "
            f"or splitting the submission into smaller modules."
        )

    ratio = content_budget / total
    trimmed = []
    for f in code_files:
        content = f.get("content", "") or ""
        new_len = max(min_per_file_chars, int(len(content) * ratio))
        if new_len < len(content):
            new_content = content[:new_len] + "\n... (truncated for token budget — see other files for the full picture)"
        else:
            new_content = content
        trimmed.append({**f, "content": new_content})
    return trimmed


def format_execution_attempts(attempts: list) -> str:
    """Format execution attempts for the prompt."""
    if not attempts:
        return "No execution attempts recorded for this submission."
    
    formatted = []
    for attempt in attempts:
        status = attempt.get("status", "unknown")
        attempt_num = attempt.get("attemptNumber", "?")
        
        entry = f"Attempt #{attempt_num}: {status.upper()}"
        
        if attempt.get("errorType"):
            entry += f"\n  - Error Type: {attempt.get('errorType')}"
        if attempt.get("errorMessage"):
            # Truncate long error messages
            msg = attempt.get("errorMessage", "")[:200]
            entry += f"\n  - Error: {msg}"
        if attempt.get("errorFile") and attempt.get("errorLine"):
            entry += f"\n  - Location: {attempt.get('errorFile')}:{attempt.get('errorLine')}"
        if attempt.get("testsPassed") is not None and attempt.get("testsTotal") is not None:
            entry += f"\n  - Tests: {attempt.get('testsPassed')}/{attempt.get('testsTotal')} passed"
        
        formatted.append(entry)
    
    return "\n".join(formatted)


def format_recent_submissions(submissions: list) -> str:
    """Format recent submissions for context."""
    if not submissions:
        return "No previous submissions recorded."
    
    formatted = []
    for sub in submissions[:5]:  # Limit to 5 most recent
        name = sub.get("taskName", "Unknown Task")
        score = sub.get("score", "N/A")
        date = sub.get("date", "Unknown date")
        issues = sub.get("mainIssues", [])
        
        entry = f"- {name}: Score {score} ({date})"
        if issues:
            entry += f"\n  Main issues: {', '.join(issues[:3])}"
        formatted.append(entry)
    
    return "\n".join(formatted)


def build_review_prompt(
    code_files: list,
    task_context: dict = None,
    static_summary: dict = None
) -> str:
    """Build the simple review prompt with context (backward compatible)."""
    task = task_context or {}
    static = static_summary or {}
    
    return CODE_REVIEW_PROMPT.format(
        task_title=task.get("title", "Code Review"),
        task_description=task.get("description", "General code review"),
        language=task.get("expectedLanguage", "Auto-detect"),
        difficulty=task.get("difficulty", "Unknown"),
        code_files=format_code_files(code_files),
        static_issues=static.get("totalIssues", 0),
        critical_issues=static.get("criticalIssues", 0),
        top_categories=", ".join(static.get("topCategories", ["general"]))
    )


def build_enhanced_review_prompt(
    code_files: list,
    project_context: dict = None,
    learner_profile: dict = None,
    static_summary: dict = None,
    learner_history: dict = None
) -> str:
    """Build the enhanced review prompt with full context for in-depth analysis."""
    project = project_context or {}
    learner = learner_profile or {}
    static = static_summary or {}
    history = learner_history or {}
    
    # Format learner's weak and strong areas
    weak_areas = learner.get("weakAreas", [])
    strong_areas = learner.get("strongAreas", [])
    focus_areas = project.get("focusAreas", [])
    expected_outcomes = project.get("expectedOutcomes", [])
    
    # Format execution history
    execution_attempts = format_execution_attempts(history.get("executionAttempts", []))
    recent_submissions = format_recent_submissions(history.get("recentSubmissions", []))
    common_mistakes = history.get("commonMistakes", [])
    recurring_weaknesses = history.get("recurringWeaknesses", [])
    progress_notes = history.get("progressNotes", "No progress notes available.")
    
    return CODE_REVIEW_PROMPT_ENHANCED.format(
        # Project context
        project_name=project.get("name", "Code Review"),
        project_description=project.get("description", "General code review"),
        learning_track=project.get("learningTrack", "General"),
        difficulty=project.get("difficulty", "Unknown"),
        focus_areas=", ".join(focus_areas) if focus_areas else "General review",
        expected_outcomes=", ".join(expected_outcomes) if expected_outcomes else "Quality code",
        # Learner profile
        skill_level=learner.get("skillLevel", "Intermediate"),
        previous_submissions=learner.get("previousSubmissions", 0),
        average_score=learner.get("averageScore", "N/A"),
        weak_areas=", ".join(weak_areas) if weak_areas else "None identified",
        strong_areas=", ".join(strong_areas) if strong_areas else "None identified",
        improvement_trend=learner.get("improvementTrend", "Unknown"),
        # Learner history
        execution_attempts=execution_attempts,
        recent_submissions=recent_submissions,
        common_mistakes=", ".join(common_mistakes) if common_mistakes else "None identified",
        recurring_weaknesses=", ".join(recurring_weaknesses) if recurring_weaknesses else "None identified",
        progress_notes=progress_notes,
        # Code files
        code_files=format_code_files(code_files),
        # Static analysis summary
        static_issues=static.get("totalIssues", 0),
        critical_issues=static.get("criticalIssues", 0),
        top_categories=", ".join(static.get("topCategories", ["general"]))
    )
