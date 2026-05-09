"""S10-T3 / F12: chunk code, feedback text, and inline annotations into
~500-token windows for embedding + RAG retrieval (ADR-036).

Strategy is intentionally simple — file boundary + sliding-line window — to
keep this module portable across the 6 supported languages without an AST or
tree-sitter dependency. Chunking quality is tuned via dogfood (S10-T10), not
language semantics.

A *chunk* is the unit we embed:

    (kind, file_path, start_line, end_line, content)

The deterministic Qdrant point ID is computed elsewhere (`qdrant_repo`) from
``sha1(scope|scopeId|file_path|start_line|end_line)`` — re-running the chunker
on the same input therefore produces identical IDs, making upserts idempotent.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional


@dataclass(frozen=True)
class Chunk:
    """A single embedding unit. ``content`` is the raw text we'll send to OpenAI."""
    kind: str            # "code" | "feedback" | "annotation"
    file_path: str       # e.g. "app/search.py" or "feedback/strengths" for non-code
    start_line: int      # 1-based, inclusive
    end_line: int        # 1-based, inclusive
    content: str

    def __post_init__(self) -> None:  # pragma: no cover - dataclass guards
        if not self.content:
            raise ValueError("Chunk.content must be non-empty")
        if self.start_line < 1 or self.end_line < self.start_line:
            raise ValueError(
                f"Chunk lines must be 1-based and ordered (got {self.start_line}..{self.end_line})"
            )


def chunk_code_file(
    file_path: str,
    content: str,
    *,
    max_chars: int,
    kind: str = "code",
) -> List[Chunk]:
    """Split a single file's content into line-aware chunks.

    Lines are accumulated into a buffer that flushes whenever it exceeds
    ``max_chars`` OR the file ends. Each emitted chunk preserves the exact
    line range it covers (1-based, inclusive). Empty/whitespace-only files
    yield an empty list.
    """
    if not content or not content.strip():
        return []

    lines = content.splitlines()
    chunks: List[Chunk] = []
    buf: List[str] = []
    buf_len = 0
    chunk_start = 1
    cursor = 0

    for line in lines:
        cursor += 1
        # +1 accounts for the newline we'll re-insert when joining.
        line_len = len(line) + 1
        if buf and buf_len + line_len > max_chars:
            chunks.append(Chunk(
                kind=kind,
                file_path=file_path,
                start_line=chunk_start,
                end_line=cursor - 1,
                content="\n".join(buf),
            ))
            buf = []
            buf_len = 0
            chunk_start = cursor
        buf.append(line)
        buf_len += line_len

    if buf:
        chunks.append(Chunk(
            kind=kind,
            file_path=file_path,
            start_line=chunk_start,
            end_line=cursor,
            content="\n".join(buf),
        ))

    return chunks


def chunk_files(
    files: Iterable[tuple[str, str]],
    *,
    max_chars: int,
) -> List[Chunk]:
    """Chunk a collection of (file_path, content) tuples (kind=code)."""
    out: List[Chunk] = []
    for path, content in files:
        out.extend(chunk_code_file(path, content, max_chars=max_chars, kind="code"))
    return out


def chunk_feedback_text(
    label: str,
    text: Optional[str],
    *,
    max_chars: int,
) -> List[Chunk]:
    """Chunk a single feedback paragraph (kind=feedback). ``label`` becomes the
    pseudo-file-path in the chunk (e.g. ``feedback/summary``) so the retrieval
    payload can render attribution.
    """
    if not text or not text.strip():
        return []
    return chunk_code_file(
        file_path=f"feedback/{label}",
        content=text,
        max_chars=max_chars,
        kind="feedback",
    )


def chunk_annotations(
    annotations: Iterable[dict],
    *,
    max_chars: int,
) -> List[Chunk]:
    """Inline annotations from a feedback payload become their own chunks
    (kind=annotation). We expect each dict to carry ``file``/``filePath``,
    ``line``/``lineNumber``, and a ``message``/``description`` string.

    Annotations missing both line + message are skipped silently — the
    upstream payload format has drifted across sprints, so the chunker
    tolerates the older + newer shapes without raising.
    """
    out: List[Chunk] = []
    for idx, ann in enumerate(annotations or [], start=1):
        file_path = ann.get("file") or ann.get("filePath") or f"annotation/{idx}"
        line_raw = ann.get("line") or ann.get("lineNumber") or 1
        try:
            line = max(1, int(line_raw))
        except (TypeError, ValueError):
            line = 1
        message = ann.get("message") or ann.get("description") or ""
        title = ann.get("title") or ann.get("severity") or ""
        body = "\n".join(p for p in (title, message) if p).strip()
        if not body:
            continue
        out.extend(chunk_code_file(
            file_path=f"{file_path}#L{line}",
            content=body,
            max_chars=max_chars,
            kind="annotation",
        ))
    return out
