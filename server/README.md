# DeepAI — organized codebase

DeepAI is a local AI companion with an Ollama-powered FastAPI backend, SQLite-based explicit memories, and an optional local voice interface using Faster-Whisper and Piper.

## Structure

```text
DeepAI/
├── deepai/
│   ├── api.py          # FastAPI routes and app lifecycle
│   ├── chat.py         # Ollama prompt + streaming response generation
│   ├── config.py       # Central configuration
│   ├── database.py     # SQLite setup and connection helper
│   └── memory.py       # Save/list/delete/clear memory commands
├── voice/
│   └── voice_assistant.py
├── scripts/
│   └── direct_ollama_chat.py  # Optional low-level Ollama test (bypasses API)
├── models/
│   └── piper/          # Place Piper model files here
├── deepai_memory.db    # Created automatically; not included in source control
├── requirements.txt
├── requirements-voice.txt
└── README.md
```

## Requirements

- Python 3.10+
- Ollama installed and running
- The configured model available locally (default: `qwen3.5:9b`)

Install backend dependencies from the project root:

```powershell
python -m pip install -r requirements.txt
```

For the microphone/voice interface:

```powershell
python -m pip install -r requirements-voice.txt
```

## Start the backend

Run from the **project root**:

```powershell
python -m uvicorn deepai.api:app --reload --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/health`. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

## Start the voice interface

Keep the backend running in one terminal. Open a second terminal at the project root and run:

```powershell
python -m voice.voice_assistant
```

Expected Piper model path:

```text
models/piper/en_US-lessac-medium.onnx
```

The voice assistant still sends requests to `/chat/stream` and expects the same SSE event format as before. The microphone device defaults to `1`; change `DEEPAI_MICROPHONE_DEVICE` if your device index differs.

## Optional direct Ollama test

This script bypasses the FastAPI backend, saved memories, and any future API-level conversation history. It is useful only for checking whether Ollama responds directly:

```powershell
python scripts/direct_ollama_chat.py
```

## Configuration

Defaults can be overridden with environment variables. See `.env.example`. The app does not automatically load `.env`; set environment variables in PowerShell or your launch configuration.

## Data and privacy

Explicit memories remain in `deepai_memory.db` in the project root by default, matching the original code's database location. The database is created when the backend starts and is ignored by Git. Do not commit local databases or secrets.

## Current scope

This refactor separates responsibilities while preserving the current behavior. Recent conversation history is **not added yet**; it should be implemented as a separate, testable milestone after confirming this structure runs correctly.
