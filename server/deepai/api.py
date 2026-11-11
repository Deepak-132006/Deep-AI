"""FastAPI application entry point for DeepAI."""

from contextlib import asynccontextmanager
from typing import AsyncIterator
import io
import wave

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from fastapi import File, UploadFile
from fastapi.responses import Response
from typing import AsyncIterator, Literal
from .voice import transcribe_audio, synthesize_speech
from .chat import generate_response
from .chat_history import (
    clear_conversation_history,
    conversation_exists,
    create_conversation,
    delete_conversation,
    get_conversation_messages,
    get_default_conversation_id,
    is_clear_history_command,
    list_conversations,
)
from .config import MODEL
from .database import init_db
from .memory import get_memories, delete_memory
from pathlib import Path


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    conversation_id: str | None = None
    mode: Literal["chat", "deep"] = "chat"


class DeleteMemoryRequest(BaseModel):
    fact: str = Field(min_length=1, max_length=500)


class CreateConversationRequest(BaseModel):
    title: str = Field(default="New chat", min_length=1, max_length=60)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title="DeepAI Local Assistant",
    description="Local AI assistant API for chat, history, and memory.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL, "service": "DeepAI"}


@app.get("/conversations")
def read_conversations() -> dict:
    return {"conversations": list_conversations()}


@app.post("/conversations")
def new_conversation(
    request: CreateConversationRequest | None = None,
) -> dict:
    title = request.title if request else "New chat"
    return {"conversation": create_conversation(title)}


@app.get("/conversations/{conversation_id}/messages")
def read_conversation_messages(conversation_id: str) -> dict:
    if not conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation_id": conversation_id,
        "messages": get_conversation_messages(conversation_id),
    }


@app.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str) -> dict[str, str]:
    if not delete_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Keep at least one conversation available to the application.
    if not list_conversations():
        create_conversation()

    return {"message": "Conversation deleted"}


@app.get("/history")
def read_history(
    conversation_id: str | None = Query(default=None),
) -> dict:
    selected_id = conversation_id or get_default_conversation_id()

    if not conversation_exists(selected_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation_id": selected_id,
        "messages": get_conversation_messages(selected_id),
    }


@app.delete("/history")
def delete_history(
    conversation_id: str | None = Query(default=None),
) -> dict[str, str]:
    selected_id = conversation_id or get_default_conversation_id()

    if not conversation_exists(selected_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"message": clear_conversation_history(selected_id)}


@app.post("/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    conversation_id = request.conversation_id or get_default_conversation_id()

    if not conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    if is_clear_history_command(request.message):
        # The command is handled by generate_response within this chat.
        pass

    return StreamingResponse(
        generate_response(
            request.message,
            conversation_id,
            request.mode,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/memory")
def read_memories() -> dict[str, list[str]]:
    return {"memories": get_memories()}


@app.delete("/memory")
def remove_memory(request: DeleteMemoryRequest) -> dict[str, str]:
    result = delete_memory(request.fact)

    if result == "I couldn't find that memory.":
        raise HTTPException(status_code=404, detail=result)

    return {"message": result}


@app.post("/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()

    try:
        text = transcribe_audio(
            audio_bytes,
            Path(audio.filename or "recording.webm").suffix or ".webm",
        )
        return {"text": text}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/voice/speak")
def voice_speak(request: ChatRequest):
    try:
        audio = synthesize_speech(request.message)
        return Response(content=audio, media_type="audio/wav")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.websocket("/voice/live")
async def voice_live(websocket: WebSocket):
    """Detect speech, capture complete utterances, and transcribe them."""
    from collections import deque

    await websocket.accept()

    sample_rate = 16000
    frame_duration_ms = 100

    # PCM is signed 16-bit, so RMS is measured on a 0–32768 scale.
    speech_threshold = 600
    silence_limit_ms = 1500
    max_utterance_ms = 20000
    min_utterance_ms = 300
    preroll_ms = 300

    silence_limit_frames = silence_limit_ms // frame_duration_ms
    max_frames = max_utterance_ms // frame_duration_ms
    min_frames = min_utterance_ms // frame_duration_ms
    preroll_frames = preroll_ms // frame_duration_ms

    preroll = deque(maxlen=preroll_frames)
    utterance_chunks: list[bytes] = []
    speech_started = False
    silence_frames = 0
    speech_frames = 0

    await websocket.send_json(
        {
            "type": "status",
            "message": "Connected. Listening for speech.",
        }
    )

    async def transcribe_utterance(chunks: list[bytes]) -> None:
        pcm_bytes = b"".join(chunks)

        if not pcm_bytes:
            return

        # Reject extremely short recordings that are likely noise or clicks.
        if len(chunks) < min_frames:
            await websocket.send_json(
                {
                    "type": "status",
                    "message": "Speech was too short. Listening again.",
                }
            )
            return

        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_bytes)

        try:
            text = await run_in_threadpool(
                transcribe_audio,
                wav_buffer.getvalue(),
                ".wav",
            )

            text = text.strip() if text else ""

            if text:
                await websocket.send_json(
                    {
                        "type": "transcript",
                        "text": text,
                    }
                )
            else:
                await websocket.send_json(
                    {
                        "type": "status",
                        "message": "Speech not recognized. Listening again.",
                    }
                )

        except Exception as exc:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": f"Transcription failed: {exc}",
                }
            )

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if message.get("text"):
                if message["text"] == '{"type":"stop"}':
                    # Do not transcribe an unfinished utterance when the
                    # client intentionally locks the microphone.
                    break
                continue

            chunk = message.get("bytes")
            if not chunk:
                continue

            usable_length = len(chunk) - (len(chunk) % 2)
            if usable_length == 0:
                continue

            chunk = chunk[:usable_length]
            samples = np.frombuffer(chunk, dtype="<i2").astype(np.float32)
            rms = float(np.sqrt(np.mean(samples * samples)))

            # Keep recent audio so the beginning of a word is not clipped.
            if not speech_started:
                preroll.append(chunk)

                if rms >= speech_threshold:
                    speech_started = True
                    utterance_chunks = list(preroll)
                    speech_frames = len(utterance_chunks)
                    silence_frames = 0
                    preroll.clear()

                    await websocket.send_json(
                        {
                            "type": "status",
                            "message": "Speech detected. Listening…",
                        }
                    )

                continue

            utterance_chunks.append(chunk)
            speech_frames += 1

            if rms < speech_threshold:
                silence_frames += 1
            else:
                silence_frames = 0

            reached_pause = silence_frames >= silence_limit_frames
            reached_maximum = len(utterance_chunks) >= max_frames

            if reached_pause or reached_maximum:
                chunks_to_transcribe = utterance_chunks

                # Reset detection before transcription so state is clean.
                utterance_chunks = []
                speech_started = False
                silence_frames = 0
                speech_frames = 0
                preroll.clear()

                await transcribe_utterance(chunks_to_transcribe)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": str(exc),
                }
            )
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
