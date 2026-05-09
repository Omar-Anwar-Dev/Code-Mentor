"""Quick test to verify API key loading and OpenAI connection."""
import os
import sys
sys.path.insert(0, ".")

from app.config import get_settings
from openai import OpenAI

settings = get_settings()

print("=" * 50)
print("Configuration Check")
print("=" * 50)
print(f"OpenAI API Key loaded: {bool(settings.openai_api_key)}")
if settings.openai_api_key:
    # Show first 10 and last 4 chars for verification
    key = settings.openai_api_key
    print(f"API Key: {key[:10]}...{key[-4:]}")
print(f"Model: {settings.openai_model}")

# Try direct OpenAI call
print("\n" + "=" * 50)
print("Testing Direct OpenAI Call")
print("=" * 50)

try:
    client = OpenAI(api_key=settings.openai_api_key)
    
    # List available models
    models = client.models.list()
    print(f"Available models (first 5): {[m.id for m in list(models.data)[:5]]}")
    
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
