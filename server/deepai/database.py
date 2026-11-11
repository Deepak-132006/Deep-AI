
"""SQLite setup and connection helpers."""
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DB_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    """Create tables and migrate existing history without deleting it."""
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fact TEXT NOT NULL UNIQUE COLLATE NOCASE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'New chat',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id)
                    REFERENCES conversations(id) ON DELETE CASCADE
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
            ON chat_messages(conversation_id, id)
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY
            )
        """)

        migration = connection.execute(
            "SELECT 1 FROM schema_migrations WHERE name = ?",
            ("legacy_history_to_conversations",),
        ).fetchone()

        if migration is None:
            import uuid

            legacy_messages = connection.execute("""
                SELECT role, content, created_at
                FROM conversation_history
                ORDER BY id ASC
            """).fetchall()

            if legacy_messages:
                conversation_id = str(uuid.uuid4())
                first_user_message = next(
                    (
                        content.strip()
                        for role, content, _ in legacy_messages
                        if role == "user" and content.strip()
                    ),
                    "Previous conversation",
                )
                title = first_user_message[:60]

                connection.execute(
                    """
                    INSERT INTO conversations (id, title)
                    VALUES (?, ?)
                    """,
                    (conversation_id, title),
                )

                connection.executemany(
                    """
                    INSERT INTO chat_messages
                        (conversation_id, role, content, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    [
                        (conversation_id, role, content, created_at)
                        for role, content, created_at in legacy_messages
                    ],
                )

            connection.execute(
                "INSERT INTO schema_migrations (name) VALUES (?)",
                ("legacy_history_to_conversations",),
            )

        # Ensure the app always has at least one chat to open.
        has_conversation = connection.execute(
            "SELECT 1 FROM conversations LIMIT 1"
        ).fetchone()

        if has_conversation is None:
            connection.execute(
                "INSERT INTO conversations (id, title) VALUES (?, ?)",
                (str(uuid.uuid4()), "New chat"),
            )
