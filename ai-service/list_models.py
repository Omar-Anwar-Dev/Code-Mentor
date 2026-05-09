"""List all available models."""
import sys
sys.path.insert(0, ".")

from app.config import get_settings
from openai import OpenAI

settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)

print("Available models:")
print("=" * 50)
models = client.models.list()
for m in models.data:
    print(f"  - {m.id}")
