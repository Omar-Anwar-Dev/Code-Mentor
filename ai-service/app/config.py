# Configuration settings for AI Analysis Layer
import os
import sys
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Load environment variables from .env file
from dotenv import load_dotenv

# Try loading from .env, fallback to .env.example
env_file = Path(__file__).parent.parent / ".env"
if not env_file.exists():
    env_file = Path(__file__).parent.parent / ".env.example"
if env_file.exists():
    load_dotenv(env_file)



def get_venv_script_path(script_name: str) -> str:
    """Get the full path to a script in the current venv's Scripts/bin directory."""
    python_path = Path(sys.executable)
    # On Windows: venv/Scripts/python.exe -> venv/Scripts/script.exe
    # On Unix: venv/bin/python -> venv/bin/script
    scripts_dir = python_path.parent
    if sys.platform == "win32":
        script_path = scripts_dir / f"{script_name}.exe"
    else:
        script_path = scripts_dir / script_name
    
    if script_path.exists():
        return str(script_path)
    return script_name  # Fallback to PATH lookup


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="AI_ANALYSIS_",
    )

    # Application
    app_name: str = "AI Analysis Layer"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    
    # Static Analysis settings
    analysis_timeout: int = 180  # seconds
    max_file_size: int = 1048576  # 1MB per file
    max_files: int = 50

    # Submission ZIP caps (S5-T8; SBF-1 bumped 2026-05-14).
    # Defaults sized for realistic graduation-project repos: a typical MERN
    # or .NET-React submission has 200-800 source/config files post-filter,
    # so the 500-entry cap was hitting real submissions (owner walkthrough
    # showed `Omar-Anwar-Dev/Code-Mentor` itself rejected at 813 entries).
    # 1000 is the owner-chosen middle ground — 2× the original cap so a
    # realistic graduation repo passes, but still tight enough that a
    # 10k-file attack payload trips the structural gate. The per-agent
    # token budget below still enforces what actually gets sent to the LLM
    # via the `truncate_code_files_to_budget()` proportional shrink.
    max_zip_size_bytes: int = 100 * 1024 * 1024  # 100 MB hard cap on uploaded ZIP
    max_zip_entries: int = 1000                  # max analyzable entries inside the ZIP (post-filter)
    max_uncompressed_bytes: int = 500 * 1024 * 1024  # ZIP-bomb defense (500 MB total)
    
    # OpenAI Settings
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.1-codex-mini"  # Codex model optimized for code review
    ai_timeout: int = 180  # seconds for AI review (increased for detailed output)
    # ADR-045: reasoning model (`gpt-5.1-codex-mini`) consumes this budget for
    # BOTH internal reasoning tokens AND visible JSON. Per-task review prompts
    # are F14-enhanced (~6k input tokens with full snapshot + recurring-mistake
    # context) and the response carries 6 nested sections — empirically the
    # model needs ~12-14k just to write the JSON when reasoning effort is
    # capped at "low".
    # SBF-1 bumped 2026-05-14: 16k → 24k so the now-larger inputs (widened
    # extraction + bigger per-agent budget below) leave room for the
    # taskFit axis + rationale + the longer executive summaries the
    # widened code surface tends to elicit.
    ai_max_tokens: int = 24576

    # S9-T6 / F11 (ADR-034): project-audit token cap is wider than per-task review
    # because the audit response has 8 sections vs review's 5, and the input
    # carries the full structured project description on top of code files.
    # ADR-045 bump: same reasoning-model headroom rationale as ai_max_tokens.
    # SBF-1 bump #1 (2026-05-14): 8k → 16k output. Audit's 8 sections each need
    # ~1.5-2k tokens to be useful, and the codex-mini reasoning model also
    # consumes some of the budget before the JSON starts streaming.
    # SBF-1 bump #2 (2026-05-14, same session): 16k → 32k. The audit-v2 prompt
    # demands 1500-3000 words across 10+ JSON sections; observed live truncation
    # at 16k where the model + "medium" reasoning was eating ~5-10k internal
    # before the JSON started, leaving the visible output truncated mid-string
    # and breaking the parse. 32k buys enough headroom for both reasoning AND
    # a complete v2-shaped audit JSON. Codex-mini's 128k context window has
    # plenty of room for input + this output ceiling.
    ai_audit_max_output_tokens: int = 32768

    # S9-T7: input cap enforced server-side before the LLM call to keep cost
    # predictable. ~4 chars per token rule of thumb.
    # SBF-1 bump (2026-05-14): 40k → 200k chars (~50k tokens). Brought in
    # line with `ai_review_max_input_chars` so the audit endpoint can analyze
    # the same multi-service repos the single-prompt review handles. The
    # audit endpoint also now runs the prompt through
    # `truncate_code_files_to_budget()` so over-cap projects shrink instead
    # of hard-rejecting (matching the review side's UX).
    ai_audit_max_input_chars: int = 200_000

    # S11-T2 / F13 (ADR-037): multi-agent code review input cap.
    # SBF-1 bump #2 (2026-05-14): 60k → 120k chars per agent (~30k tokens at
    # 4 chars/token). Owner dogfood after the first bump showed real
    # multi-service repos were still getting heavy proportional truncation
    # because Dockerfile + docker-compose + .github/workflows/*.yml + lots
    # of source files easily blew past 60k once concatenated. 120k leaves
    # comfortable headroom for the SYSTEM block (~300 tokens) + the
    # placeholder template (~500 tokens) + reasoning budget on the
    # gpt-5.1-codex-mini Responses API, inside the model's 128k context
    # window. Output is unchanged at 4096 per agent.
    ai_multi_max_input_chars: int = 120_000

    # SBF-1: proactive input ceiling for the single-prompt reviewer too. The
    # ai_max_tokens setting only caps OUTPUT — without an input cap the
    # single-prompt path could send unbounded content and get a 400 from
    # OpenAI (context_length_exceeded).
    # SBF-1 bump #2 (2026-05-14): 80k → 200k chars (~50k input tokens),
    # matching the per-agent multi-agent budget × 1.6× because the
    # single-prompt reviewer carries the FULL prompt in one call (system +
    # template + history + code + scoring schema) — it doesn't get to
    # parallelise across three agents like multi mode.
    ai_review_max_input_chars: int = 200_000

    # S10 / F12 (Mentor Chat — ADR-036): Qdrant + embeddings settings.
    # qdrant_url: prod via docker-compose → http://qdrant:6333; host runs → http://localhost:6333
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "mentor_chunks"
    embedding_model: str = "text-embedding-3-small"  # 1536 dims per ADR-036
    embedding_batch_size: int = 50  # OpenAI batch cap per S10-T3 acceptance
    # ~500 tokens × ~4 chars/token = 2000 chars; gives us the 500-token cap
    # without invoking a tokenizer on the hot path. Hard cap on the chunk-walker.
    chunk_max_chars: int = 2000

    # S10-T5: mentor-chat token + retrieval caps (ADR-036).
    mentor_chat_top_k: int = 5
    mentor_chat_history_limit: int = 10  # last N turns sent to the LLM
    # ~6k tokens × ~4 chars/token = 24k chars for the RAG-prompt input ceiling.
    # Same char-based-proxy approach as audit input cap (S9-T7).
    mentor_chat_max_input_chars: int = 24_000
    # ADR-045: reasoning-model budget pressure applies to streamed chat too —
    # the model still consumes reasoning tokens before the first visible delta.
    # Doubled from 1024 → 2048 so reasoning at "low" effort has room to think
    # before streaming begins; the user-visible answer length is still bounded
    # by the prompt's "stay concise" instructions, not by this cap.
    mentor_chat_max_output_tokens: int = 2048
    # When fewer than this many chunks are retrieved, fall back to "raw context mode"
    # (sends the full feedback payload to the LLM instead of retrieved chunks).
    mentor_chat_rag_min_chunks: int = 1
    
    # Tool paths (auto-detected from venv, can be overridden)
    eslint_path: str = "npx eslint"
    bandit_path: str = ""  # Will be set in __init__
    
    # Additional tool paths (system PATH lookup by default)
    cppcheck_path: str = "cppcheck"
    phpstan_path: str = "phpstan"
    pmd_path: str = "pmd"
    dotnet_path: str = "dotnet"
    
    # Logging
    log_level: str = "INFO"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Auto-detect bandit path if not explicitly set
        if not self.bandit_path:
            object.__setattr__(self, 'bandit_path', get_venv_script_path("bandit"))


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

