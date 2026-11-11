
import json
import re
import sqlite3
from pathlib import Path
from typing import Iterator

import ollama
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="DeepAI Local Assistant")

MODEL = "qwen3.5:9b"
DB_PATH = Path(__file__).with_name("deepai_memory.db")

SYSTEM_PROMPT = """
You are DeepAI, a friendly personal AI companion.

Talk naturally, like a relaxed human friend.
Keep casual replies short, warm, and simple.
Usually reply in one or two sentences.
Don't explain things unless asked.
Avoid unnecessary lists, headings, and long answers.
For technical questions, explain clearly and concisely.

Use the saved memories below when they are relevant.
Treat them as facts and preferences the user has shared.
Never claim to remember something that is not provided.

SAVED MEMORIES:
{memories}
"""


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)


# ---------- DATABASE ----------

def init_db():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fact TEXT NOT NULL UNIQUE COLLATE NOCASE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


def save_memory(fact: str) -> str:
    fact = fact.strip()

    if not fact:
        return "Tell me what you'd like me to remember."

    if len(fact) > 500:
        return "That memory is too long. Please keep it under 500 characters."

    try:
        with sqlite3.connect(DB_PATH) as connection:
            connection.execute(
                "INSERT INTO memories (fact) VALUES (?)",
                (fact,)
            )
        return f"I'll remember that {fact}"

    except sqlite3.IntegrityError:
        return "I already have that saved."


def get_memories() -> list[str]:
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute(
            "SELECT fact FROM memories ORDER BY id DESC LIMIT 100"
        ).fetchall()

    return [row[0] for row in rows]


def delete_memory(fact: str) -> str:
    fact = fact.strip()

    if not fact:
        return "Tell me which memory you'd like me to forget."

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            DELETE FROM memories
            WHERE fact = ? COLLATE NOCASE
               OR fact LIKE '%' || ? || '%' COLLATE NOCASE
            """,
            (fact, fact)
        )

    if cursor.rowcount:
        return "Okay, I've removed the matching memory."
    return "I couldn't find that memory."


def clear_memories() -> str:
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("DELETE FROM memories")

    return "Okay, I've cleared all your saved memories."



def handle_memory_command(message: str) -> str | None:
    text = message.strip()

    # Save memories using natural variations:
    # "Remember that I like coffee"
    # "Remember, my name is Deepak"
    # "My name is Deepak"
    # "Remember I prefer short replies"
    match = re.match(
        r"^(?:remember(?:\s+that)?\s*[:,]?\s+)?"
        r"(my name is .+|"
        r"i prefer .+|"
        r"i like .+|"
        r"i love .+|"
        r"i work as .+|"
        r"i am .+|i'm .+)$",
        text,
        flags=re.IGNORECASE,
    )

    if match:
        fact = match.group(1).strip()
        return save_memory(fact)

    # Show saved memories
    if re.fullmatch(
        r"(what do you remember about me|"
        r"what do you remember|show my memories|"
        r"list my memories)",
        text.rstrip(" .?!"),
        flags=re.IGNORECASE,
    ):
        memories = get_memories()

        if not memories:
            return "I don't have any saved memories yet."

        return "Here's what I remember:\n" + "\n".join(
            f"- {fact}" for fact in memories
        )

    # Clear all saved memories
    if re.fullmatch(
        r"(forget everything|forget everything you remember|"
        r"clear all memories|forget all my memories)",
        text.rstrip(" .?!"),
        flags=re.IGNORECASE,
    ):
        return clear_memories()

    # Delete a specific saved memory
    match = re.match(
        r"^forget that\s+(.+)$",
        text,
        flags=re.IGNORECASE,
    )

    if match:
        return delete_memory(match.group(1))

    return None



# ---------- API ----------

@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL,
        "service": "DeepAI"
    }


def make_event(text: str) -> str:
    return f"data: {json.dumps({'text': text})}\n\n"


def generate_response(message: str) -> Iterator[str]:
    try:
        # Handle explicit memory commands locally.
        memory_reply = handle_memory_command(message)

        if memory_reply is not None:
            yield make_event(memory_reply)
            yield "data: [DONE]\n\n"
            return

        # Include saved facts in the model's context.
        memories = get_memories()

        if memories:
            memory_text = "\n".join(f"- {fact}" for fact in memories)
        else:
            memory_text = "No saved memories yet."

        system_message = SYSTEM_PROMPT.format(memories=memory_text)

        stream = ollama.chat(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message}
            ],
            stream=True,
            think=False,
            options={
                "temperature": 0.7,
                "num_predict": 100
            }
        )

        for chunk in stream:
            content = chunk["message"]["content"]

            if content:
                yield make_event(content)

        yield "data: [DONE]\n\n"

    except Exception as exc:
        error = json.dumps({"error": str(exc)})
        yield f"event: error\ndata: {error}\n\n"


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    return StreamingResponse(
        generate_response(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
