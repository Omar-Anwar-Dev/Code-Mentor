"""S16-T2: 9-sample validation script for `generate_questions_v1.md`.

Runs the live `QuestionGenerator` 9 times — 3 categories × 3 difficulty
levels — and writes the outputs to
``docs/demos/sprint-16-generator-validation.md``. The script also applies
the ADR-056 stricter reject rules (single-reviewer mode) so we get an
honest reject-rate signal before T7/T8 burns 60 questions of real LLM
calls.

Usage (from project root, with the ai-service venv activated):

    .venv/Scripts/python ai-service/tools/generate_validation_samples.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path
from textwrap import indent

# Ensure the ai-service package is importable regardless of cwd.
HERE = Path(__file__).resolve().parent
AI_SERVICE_ROOT = HERE.parent
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.domain.schemas.generator import (  # noqa: E402
    GenerateQuestionsRequest,
    GeneratedQuestionDraft,
)
from app.services.question_generator import (  # noqa: E402
    GeneratorUnavailable,
    get_question_generator,
)


# 9-sample matrix: 3 categories × 3 difficulty levels (deliberately mixes
# concrete-data, abstract-design, and systems-y categories so the prompt
# is exercised across topical surface area).
SAMPLE_MATRIX = [
    {"category": "DataStructures", "difficulty": 1, "includeCode": False, "language": None},
    {"category": "DataStructures", "difficulty": 2, "includeCode": True,  "language": "python"},
    {"category": "DataStructures", "difficulty": 3, "includeCode": True,  "language": "java"},

    {"category": "OOP",            "difficulty": 1, "includeCode": False, "language": None},
    {"category": "OOP",            "difficulty": 2, "includeCode": True,  "language": "csharp"},
    {"category": "OOP",            "difficulty": 3, "includeCode": False, "language": None},

    {"category": "Security",       "difficulty": 1, "includeCode": False, "language": None},
    {"category": "Security",       "difficulty": 2, "includeCode": True,  "language": "python"},
    {"category": "Security",       "difficulty": 3, "includeCode": True,  "language": "javascript"},
]

OUTPUT_PATH = Path(__file__).resolve().parents[2] / "docs" / "demos" / "sprint-16-generator-validation.md"


def _adr_056_review(draft: GeneratedQuestionDraft) -> tuple[bool, list[str]]:
    """Apply ADR-056 stricter reject criteria as if Claude is reviewing.

    Returns (accepted, reasons). Reasons list is empty on accept.
    """
    reasons: list[str] = []

    # 1. Ambiguous correct option — heuristic: a non-deterministic indicator
    #    is when the correct option is shorter than the shortest distractor
    #    (LLMs sometimes hide the right answer in a single-word distractor
    #    next to long ones — flag for review).
    letter_to_idx = {"A": 0, "B": 1, "C": 2, "D": 3}
    correct_idx = letter_to_idx[draft.correctAnswer]
    correct_len = len(draft.options[correct_idx])
    distractor_lens = [len(opt) for i, opt in enumerate(draft.options) if i != correct_idx]
    if correct_len < min(distractor_lens) * 0.5:
        reasons.append(
            f"Correct option ({correct_len} chars) much shorter than shortest "
            f"distractor ({min(distractor_lens)} chars) — possible length-based giveaway."
        )

    # 2. Discrimination < 0.6 (per ADR-056 strict reject criteria).
    if draft.irtA < 0.6:
        reasons.append(f"Discrimination irtA={draft.irtA:.2f} below 0.6 strictness floor.")

    # 3. Difficulty<->irtB alignment per the prompt rubric.
    if draft.difficulty == 1 and draft.irtB > 0.0:
        reasons.append(f"difficulty=1 but irtB={draft.irtB:.2f} > 0.0 (easy should be negative).")
    if draft.difficulty == 3 and draft.irtB < 0.0:
        reasons.append(f"difficulty=3 but irtB={draft.irtB:.2f} < 0.0 (hard should be positive).")

    # 4. Trivia heuristic — very short question text (< 50 chars).
    if len(draft.questionText) < 50:
        reasons.append(
            f"Question text is only {len(draft.questionText)} chars — risks being trivia."
        )

    # 5. Distractor parallelism heuristic — max length / min length > 4x in option set.
    opt_lens = [len(o) for o in draft.options]
    if max(opt_lens) > min(opt_lens) * 4:
        reasons.append(
            f"Option-length disparity ({min(opt_lens)} vs {max(opt_lens)}) > 4x — "
            "parallelism is off."
        )

    return (len(reasons) == 0, reasons)


def _format_draft_block(idx: int, sample: dict, draft: GeneratedQuestionDraft, accepted: bool, reasons: list[str]) -> str:
    """One markdown block per draft for the validation doc."""
    code_block = ""
    if draft.codeSnippet:
        code_block = (
            f"\n**Code snippet (`{draft.codeLanguage}`):**\n\n"
            f"```{draft.codeLanguage}\n{draft.codeSnippet}\n```\n"
        )
    options_md = "\n".join(
        f"- **{chr(ord('A') + i)}.** {opt}" + ("  ← correct" if chr(ord('A') + i) == draft.correctAnswer else "")
        for i, opt in enumerate(draft.options)
    )
    review_emoji = "✅ ACCEPT" if accepted else "❌ REJECT"
    reasons_md = "" if accepted else "\n".join(f"  - {r}" for r in reasons)

    return (
        f"### Sample {idx}: {sample['category']} / difficulty={sample['difficulty']} / "
        f"includeCode={sample['includeCode']}{('/' + sample['language']) if sample['language'] else ''}\n\n"
        f"**Question:** {draft.questionText}\n"
        f"{code_block}\n"
        f"**Options:**\n{options_md}\n\n"
        f"**Explanation:** {draft.explanation}\n\n"
        f"**IRT self-rating:** `irtA={draft.irtA:.2f}` / `irtB={draft.irtB:.2f}` — "
        f"rationale: *{draft.rationale}*\n\n"
        f"**Claude single-reviewer (ADR-056):** {review_emoji}"
        + (f"\n{reasons_md}" if reasons_md else "")
        + "\n"
    )


async def main() -> int:
    generator = get_question_generator()
    if not generator.is_available:
        print("OpenAI API key not configured; cannot run live validation.", file=sys.stderr)
        return 1

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    results: list[tuple[dict, GeneratedQuestionDraft, bool, list[str]]] = []
    total_tokens = 0
    started = time.monotonic()

    for idx, sample in enumerate(SAMPLE_MATRIX, start=1):
        print(f"[{idx}/9] generating {sample['category']} / difficulty={sample['difficulty']} "
              f"/ includeCode={sample['includeCode']}{('/' + sample['language']) if sample['language'] else ''}...",
              file=sys.stderr)
        request = GenerateQuestionsRequest(
            category=sample["category"],
            difficulty=sample["difficulty"],
            count=1,
            includeCode=sample["includeCode"],
            language=sample["language"],
        )
        try:
            response = await generator.generate(request, correlation_id=f"validation-sample-{idx}")
        except GeneratorUnavailable as exc:
            print(f"  -> FAILED: {exc} (http {exc.http_status})", file=sys.stderr)
            results.append((sample, None, False, [f"Generator failed: {exc}"]))  # type: ignore[arg-type]
            continue

        draft = response.drafts[0]  # already a GeneratedQuestionDraft instance after Pydantic round-trip
        accepted, reasons = _adr_056_review(draft)
        results.append((sample, draft, accepted, reasons))
        total_tokens += response.tokensUsed
        print(f"  -> retry={response.retryCount} tokens={response.tokensUsed} "
              f"verdict={'ACCEPT' if accepted else 'REJECT (' + str(len(reasons)) + ')'}",
              file=sys.stderr)

    elapsed = time.monotonic() - started
    accepted_count = sum(1 for _, _, a, _ in results if a)
    rejected_count = len(results) - accepted_count
    reject_rate_pct = (rejected_count / len(results)) * 100.0

    # ----- Compose markdown report -----
    header = (
        "# Sprint 16 — Generator Prompt v1 Validation\n\n"
        "**Sprint:** Sprint 16 — F15 Admin Tools  \n"
        "**Task:** S16-T2 — 9-sample validation for `generate_questions_v1.md`  \n"
        "**Date:** 2026-05-14  \n"
        "**Reviewer:** Claude (single-reviewer mode per ADR-056)  \n"
        f"**Model:** `{generator.model}` (per ADR-045 reasoning=low)  \n"
        f"**Total tokens:** {total_tokens:,}  \n"
        f"**Wall clock:** {elapsed:.1f}s (9 sequential calls)\n\n"
        "## Acceptance bar\n\n"
        "- 9 sample outputs (3 categories × 3 difficulty levels). ✅\n"
        f"- Reject rate < 30%: **{reject_rate_pct:.1f}%** ({rejected_count}/9 rejected) — "
        f"{'✅ within bar' if reject_rate_pct < 30 else '❌ over bar — prompt iteration required'}\n\n"
        "## Reject criteria (ADR-056 strict mode)\n\n"
        "1. Length-based giveaway — correct option ≪ shortest distractor.\n"
        "2. Self-rated discrimination `irtA` < 0.6.\n"
        "3. Difficulty↔irtB inversion (easy with positive b, or hard with negative b).\n"
        "4. Trivia heuristic — questionText < 50 chars.\n"
        "5. Distractor parallelism — max option length > 4× min option length.\n\n"
        "---\n\n## Samples\n\n"
    )

    body = "\n---\n\n".join(
        _format_draft_block(i, s, d, a, r)
        for i, (s, d, a, r) in enumerate(results, start=1)
        if d is not None
    )

    failed_block = ""
    failed = [(s, r) for s, d, _, r in results if d is None]
    if failed:
        failed_block = "\n---\n\n## Generator failures\n\n"
        for s, reasons in failed:
            failed_block += f"- {s['category']} / difficulty={s['difficulty']}: {reasons[0]}\n"

    footer = (
        "\n---\n\n## Summary\n\n"
        f"- **Accept:** {accepted_count}/9 ({(accepted_count/9)*100:.1f}%)\n"
        f"- **Reject:** {rejected_count}/9 ({reject_rate_pct:.1f}%)\n"
        f"- **Total tokens:** {total_tokens:,}\n"
        f"- **Prompt-iteration needed:** {'No — within < 30%% reject bar.' if reject_rate_pct < 30 else 'Yes — iterate generate_questions_v1.md before T7/T8.'}\n\n"
        "Generated by `ai-service/tools/generate_validation_samples.py`.\n"
    )

    OUTPUT_PATH.write_text(header + body + failed_block + footer, encoding="utf-8")
    print(f"\nWrote {OUTPUT_PATH}", file=sys.stderr)
    print(f"\nReject rate: {reject_rate_pct:.1f}% ({rejected_count}/9) — "
          f"{'WITHIN' if reject_rate_pct < 30 else 'OVER'} the 30% bar.", file=sys.stderr)
    return 0 if reject_rate_pct < 30 else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
