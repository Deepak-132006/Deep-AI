
"""Conversation history management for DeepAI."""
from uuid import uuid4

from .database import get_connection

MAX_CONTEXT_MESSAGES = 12
MAX_STORED_MESSAGES = 300
MAX_TITLE_LENGTH = 60


def create_conversation(title: str = "New chat") -> dict:
    conversation_id = str(uuid4())
    title = title.strip()[:MAX_TITLE_LENGTH] or "New chat"

    with get_connection() as connection:
        connection.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conversation_id, title),
        )
        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()

    return dict(zip(("id", "title", "created_at", "updated_at"), row))


def list_conversations() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            ORDER BY updated_at DESC, rowid DESC
            """
        ).fetchall()

    keys = ("id", "title", "created_at", "updated_at")
    return [dict(zip(keys, row)) for row in rows]


def conversation_exists(conversation_id: str) -> bool:
    with get_connection() as connection:
        return connection.execute(
            "SELECT 1 FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone() is not None


def get_default_conversation_id() -> str:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id FROM conversations ORDER BY updated_at DESC, rowid DESC LIMIT 1"
        ).fetchone()

    if row:
        return row[0]

    return create_conversation()["id"]


def get_conversation_messages(
    conversation_id: str,
    limit: int = MAX_STORED_MESSAGES,
) -> list[dict[str, str]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT role, content
            FROM (
                SELECT id, role, content
                FROM chat_messages
                WHERE conversation_id = ?
                ORDER BY id DESC
                LIMIT ?
            )
            ORDER BY id ASC
            """,
            (conversation_id, max(0, limit)),
        ).fetchall()

    return [{"role": role, "content": content} for role, content in rows]


def get_recent_messages(
    conversation_id: str,
    limit: int = MAX_CONTEXT_MESSAGES,
) -> list[dict[str, str]]:
    return get_conversation_messages(conversation_id, limit)


def save_message(role: str, content: str, conversation_id: str) -> None:
    if role not in {"user", "assistant"}:
        raise ValueError("role must be 'user' or 'assistant'")

    content = content.strip()
    if not content:
        return

    with get_connection() as connection:
        exists = connection.execute(
            "SELECT 1 FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()

        if not exists:
            raise ValueError(f"Conversation not found: {conversation_id}")

        connection.execute(
            """
            INSERT INTO chat_messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, role, content),
        )

        # Use the first user message as the conversation title.
        if role == "user":
            connection.execute(
                """
                UPDATE conversations
                SET title = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND title = 'New chat'
                  AND NOT EXISTS (
                      SELECT 1 FROM chat_messages
                      WHERE conversation_id = ?
                        AND role = 'user'
                        AND id < (
                            SELECT MAX(id) FROM chat_messages
                            WHERE conversation_id = ?
                        )
                  )
                """,
                (content[:MAX_TITLE_LENGTH], conversation_id,
                 conversation_id, conversation_id),
            )

        connection.execute(
            """
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (conversation_id,),
        )

        connection.execute(
            """
            DELETE FROM chat_messages
            WHERE conversation_id = ?
              AND id NOT IN (
                  SELECT id FROM chat_messages
                  WHERE conversation_id = ?
                  ORDER BY id DESC
                  LIMIT ?
              )
            """,
            (conversation_id, conversation_id, MAX_STORED_MESSAGES),
        )


def delete_conversation(conversation_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM conversations WHERE id = ?",
            (conversation_id,),
        )
        return cursor.rowcount > 0


def clear_conversation_history(conversation_id: str) -> str:
    with get_connection() as connection:
        connection.execute(
            "DELETE FROM chat_messages WHERE conversation_id = ?",
            (conversation_id,),
        )
        connection.execute(
            """
            UPDATE conversations
            SET title = 'New chat', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (conversation_id,),
        )

    return (
        "Conversation cleared. Your other chats and saved memories "
        "are unchanged."
    )


def is_clear_history_command(message: str) -> bool:
    import re

    normalized = message.strip().rstrip(" .?!").lower()
    return bool(
        re.fullmatch(
            r"(clear (?:our |the )?(?:conversation|chat) history|"
            r"clear history|forget our conversation|"
            r"clear recent conversation)",
            normalized,
        )
    )
