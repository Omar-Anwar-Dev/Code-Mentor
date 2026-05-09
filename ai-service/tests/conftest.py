"""Pytest configuration for AI service tests."""
import os
import sys
from pathlib import Path

# Ensure `app` is importable when tests run from the ai-service root.
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# S6-T1 / S9-T7: developer convenience. The AI service config reads
# AI_ANALYSIS_OPENAI_API_KEY (env_prefix=AI_ANALYSIS_), but the project root
# .env (consumed by docker-compose) uses the un-prefixed OPENAI_API_KEY. We
# need to:
#   1. Load .env files BEFORE the bridge check (otherwise the unprefixed key
#      isn't visible yet — pytest runs conftest before app.config does its own
#      dotenv load, which is why the original S6-T1 bridge missed the key when
#      it lived only in the file).
#   2. Treat well-known placeholder values as empty so .env.example's
#      AI_ANALYSIS_OPENAI_API_KEY="your-openai-api-key-here" doesn't shadow the
#      real un-prefixed key.
try:
    from dotenv import load_dotenv

    for _env_path in (
        _ROOT / ".env",
        _ROOT.parent / ".env",          # project root (where docker-compose looks)
        _ROOT / ".env.example",
    ):
        if _env_path.exists():
            load_dotenv(_env_path, override=False)
except ImportError:
    pass

_PLACEHOLDER_KEYS = {"your-openai-api-key-here", "dummy-key-placeholder", ""}
_unprefixed = os.environ.get("OPENAI_API_KEY", "")
_prefixed = os.environ.get("AI_ANALYSIS_OPENAI_API_KEY", "")
if _unprefixed and (_prefixed in _PLACEHOLDER_KEYS):
    os.environ["AI_ANALYSIS_OPENAI_API_KEY"] = _unprefixed
