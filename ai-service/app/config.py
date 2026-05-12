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

    # Submission ZIP caps (S5-T8)
    max_zip_size_bytes: int = 50 * 1024 * 1024  # 50 MB hard cap on uploaded ZIP
    max_zip_entries: int = 500                  # max entries inside the ZIP
    max_uncompressed_bytes: int = 200 * 1024 * 1024  # ZIP-bomb defense (200 MB total)
    
    # OpenAI Settings
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.1-codex-mini"  # Codex model optimized for code review
    ai_timeout: int = 180  # seconds for AI review (increased for detailed output)
    # ADR-045: reasoning model (`gpt-5.1-codex-mini`) consumes this budget for
    # BOTH internal reasoning tokens AND visible JSON. Per-task review prompts
    # are F14-enhanced (~6k input tokens with full snapshot + recurring-mistake
    # context) and the response carries 6 nested sections — empirically the
    # model needs ~12-14k just to write the JSON when reasoning effort is
    # capped at "low". 16k gives ~2-4k headroom for the bounded reasoning.
    ai_max_tokens: int = 16384

    # S9-T6 / F11 (ADR-034): project-audit token cap is wider than per-task review
    # because the audit response has 8 sections vs review's 5, and the input
    # carries the full structured project description on top of code files.
    # ADR-045 bump: same reasoning-model headroom rationale as ai_max_tokens.
    ai_audit_max_output_tokens: int = 8192

    # S9-T7: input cap enforced server-side before the LLM call to keep cost
    # predictable. ~4 chars per token rule of thumb → 40k chars ≈ 10k tokens
    # (ADR-034 input ceiling). Includes code-file content + description payload;
    # static-summary + prompt-template overhead is small enough to ignore.
    ai_audit_max_input_chars: int = 40_000

    # S11-T2 / F13 (ADR-037): multi-agent code review input cap. The same code
    # is sent to all three agents in parallel, so this is the per-agent input
    # ceiling — at 6k tokens (~24k chars) per agent the wire cost is ~18k input
    # tokens per submission, plus 4.5k output (3 × 1.5k). Roughly 2.2× the
    # single-prompt path (ADR-037 cost note).
    ai_multi_max_input_chars: int = 24_000

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

