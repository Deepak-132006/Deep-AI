"""Central configuration for DeepAI."""

import os
from pathlib import Path

# Project root is the folder containing deepai/, voice/, models/, and this README.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Keep the existing database in the project root so existing saved memories remain usable.
DB_PATH = Path(os.getenv("DEEPAI_DB_PATH", str(PROJECT_ROOT / "deepai_memory.db")))

MODEL = os.getenv("DEEPAI_MODEL", "qwen2.5-coder:7b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
API_HOST = os.getenv("DEEPAI_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("DEEPAI_API_PORT", "8000"))


TEMPERATURE = float(os.getenv("DEEPAI_TEMPERATURE", "0.7"))

MAX_CHAT_RESPONSE_TOKENS = int(os.getenv("DEEPAI_MAX_CHAT_RESPONSE_TOKENS", "4096"))

MAX_DEEP_RESPONSE_TOKENS = int(os.getenv("DEEPAI_MAX_DEEP_RESPONSE_TOKENS", "150"))
