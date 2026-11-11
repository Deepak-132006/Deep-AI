<p align="center">
  <img src="client\public\logo.png" alt="Deep AI" height="110">
</p>

<p align="center">
  A local-first personal AI companion for Windows — chat, memory, documents and voice, with no cloud AI required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Ollama-local%20LLM-000000" alt="Ollama">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
</p>

---

## Overview

Deep AI runs entirely on your own machine. A FastAPI backend talks to local models through Ollama, stores personal memory in SQLite, answers questions from your documents using RAG, and supports voice input and output. The goal is a private AI environment you control, with no paid API subscription needed.

## Features

- **Local LLM chat** with streaming responses via Ollama
- **Persistent memory** that survives restarts, kept separate from conversation history
- **Document Q&A (RAG)** using ChromaDB and `nomic-embed-text`
- **Voice** — speech-to-text with Vosk / Whisper, text-to-speech with Piper
- **Orb** — a draggable floating desktop interface with click-to-talk voice

## Tech Stack

| Area | Tools |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| AI runtime | Ollama |
| Models | Qwen 3.5 9B (chat), Qwen 2.5 Coder 7B (code), nomic-embed-text (embeddings) |
| Storage | SQLite (memory, conversations), ChromaDB (vectors) |
| Speech | Vosk, Whisper (base, INT8), Piper (`en_US-lessac-medium`) |
| Frontend | Electron, React, TypeScript (planned) |

## Architecture

```
Frontend (Electron + React / Orb)
            │
         FastAPI
   ┌────────┼─────────┐
  Chat    Memory     Voice
   │        │      Vosk/Whisper → Piper
 Ollama   SQLite
   │
 Qwen models ── Embeddings ── ChromaDB (RAG)
```

**RAG settings:** chunk size 500, overlap 50, top-3 retrieval.

**Memory design:** `memories` (permanent facts), `conversations`, and `chat_messages`. Clearing history does not erase permanent memories. Up to 12 recent messages are sent as context.

## Getting Started

**Requirements:** Windows, Python 3.10, [Ollama](https://ollama.com), and a GPU with ~6 GB VRAM is recommended.

```powershell
# Terminal 1 – start Ollama
ollama serve

# Terminal 2 – start the backend
cd server
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn deepai.api:app --reload
```

Backend: `http://127.0.0.1:8000` · API docs: `http://127.0.0.1:8000/docs`

Pull the models:

```powershell
ollama pull qwen3.5:9b
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

> Optional voice dependencies are in `requirements-voice.txt`. Copy `.env.example` to `.env` before running.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check that the backend is running |
| POST | `/chat/stream` | Stream a chat response |
| POST | `/voice/speak` | Generate spoken audio |

## Project Structure

```
server/
├── deepai/              # FastAPI app
├── models/              # Voice models
├── scripts/
├── voice/
├── deepai_memory.db     # SQLite memory
├── requirements.txt
├── requirements-voice.txt
└── .env.example
```

## Status

| Feature | Status |
|---|---|
| Ollama + FastAPI streaming chat | ✅ Done |
| Piper TTS | ✅ Done |
| SQLite memory & conversation history | ✅ Done |
| Whisper / Vosk STT | 🧪 Experimental |
| ChromaDB RAG | 🚧 In progress |
| Orb interface | 🚧 Known issues (React hook usage, pointer state) |
| Electron + React app | 📋 Planned |
| Automatic model routing (chat vs. code) | 📋 Planned |

## Roadmap

1. Stable backend and reliable memory
2. Document ingestion and retrieval
3. Reliable voice with interruption handling
4. Full Electron + React desktop app
5. Model routing and better context management
6. Installable Windows package

## Author

**Deepak N** · [GitHub](https://github.com/Deepak-132006) · [LinkedIn](https://linkedin.com/in/deepak-n-b416bb309)