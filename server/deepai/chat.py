
"""Ollama response generation and Server-Sent Events formatting."""
import json
from typing import Iterator

import ollama

from .chat_history import (
    clear_conversation_history,
    get_recent_messages,
    is_clear_history_command,
    save_message,
)
from .config import (
    MAX_CHAT_RESPONSE_TOKENS,
    MAX_DEEP_RESPONSE_TOKENS,
    MODEL,
    TEMPERATURE,
)
from .memory import get_memories, handle_memory_command

SYSTEM_PROMPT = """
You are DeepAI, a friendly personal AI companion.

Talk naturally, like a relaxed human friend.
Keep casual replies short, warm, and simple.
Usually reply in one or two sentences.
Don't explain things unless asked.
Avoid unnecessary lists, headings, and long answers.
For technical questions, explain clearly and concisely.

Use the recent conversation and saved memories when relevant.
Recent conversation provides context for follow-up questions.
Saved memories are longer-term facts and preferences the user explicitly asked you to remember.
Do not claim to see the user's surroundings, screen, or current activity unless they explicitly described it.
Never claim to remember something that is not present in the supplied conversation or saved memories.

SAVED MEMORIES:
{memories}
"""


def make_event(text: str) -> str:
    return f"data: {json.dumps({'text': text})}\n\n"


def _stream_text_reply(
    message: str,
    conversation_id: str,
    mode: str,
) -> Iterator[str]:
    save_message("user", message, conversation_id)
    history = get_recent_messages(conversation_id)

    memories = get_memories()
    memory_text = (
        "\n".join(f"- {fact}" for fact in memories)
        if memories
        else "No saved memories yet."
    )

    system_message = SYSTEM_PROMPT.format(memories=memory_text)
    max_tokens = (
        MAX_DEEP_RESPONSE_TOKENS
        if mode == "deep"
        else MAX_CHAT_RESPONSE_TOKENS
    )
    stream = ollama.chat(
        model=MODEL,
        messages=[{"role": "system", "content": system_message}, *history],
        stream=True,
        think=False,
        options={
            "temperature": TEMPERATURE,
            "num_predict": max_tokens,
        },
    )

    response_parts: list[str] = []

    for chunk in stream:
        content = chunk["message"]["content"]
        if content:
            response_parts.append(content)
            yield make_event(content)

    full_response = "".join(response_parts).strip()

    if full_response:
        save_message("assistant", full_response, conversation_id)

    yield "data: [DONE]\n\n"


def generate_response(
    message: str,
    conversation_id: str,
    mode: str = "chat",
) -> Iterator[str]:
    """Handle local commands and stream a reply for one conversation."""
    try:
        if is_clear_history_command(message):
            reply = clear_conversation_history(conversation_id)
            yield make_event(reply)
            yield "data: [DONE]\n\n"
            return

        memory_reply = handle_memory_command(message)

        if memory_reply is not None:
            save_message("user", message, conversation_id)
            save_message("assistant", memory_reply, conversation_id)
            yield make_event(memory_reply)
            yield "data: [DONE]\n\n"
            return

        yield from _stream_text_reply(message, conversation_id, mode)

    except Exception as exc:
        error = json.dumps({"error": str(exc)})
        yield f"event: error\ndata: {error}\n\n"
