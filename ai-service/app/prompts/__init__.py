"""S16-T1 / F15: prompt template loader.

Per `assessment-learning-path.md` §6.1, AI service prompts live as ``.md``
files under ``ai-service/app/prompts/``. The loader reads the file and
interpolates ``{variables}`` at call time via :py:meth:`str.format`. Every
AI response stores ``prompt_version`` (e.g., ``generate_questions_v1``) so
the persistence layer can track which template produced a given draft.

Bumping a prompt version creates a new file (``generate_questions_v2.md``);
the old file stays for thesis/comparison purposes.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent


@lru_cache(maxsize=32)
def load_prompt(name: str) -> str:
    """Load a prompt template by file name (without the ``.md`` suffix).

    Cached after first read; the cache is process-wide and survives the
    request hot path. Re-load by clearing :py:func:`load_prompt.cache_clear`.

    Raises :class:`FileNotFoundError` if the template is missing — the
    caller is responsible for translating that into the appropriate HTTP
    error (5xx, since a missing prompt is a deployment-time fault).
    """
    path = PROMPTS_DIR / f"{name}.md"
    if not path.is_file():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")
