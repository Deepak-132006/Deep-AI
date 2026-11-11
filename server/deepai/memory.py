
"""Long-term memory commands and SQLite operations."""

import re
import sqlite3

from .database import get_connection


# Configuration
MAX_MEMORY_LENGTH = 500
MAX_MEMORIES = 100


MEMORY_PATTERNS = [
    re.compile(
        r"my name is .+|"
        r"my favorite .+|"
        r"my favourite .+|"
        r"my preferred .+|"
        r"my project is .+|"
        r"i prefer .+|"
        r"i like .+|"
        r"i love .+|"
        r"i work as .+|"
        r"i am .+|"
        r"i'm .+|"
        r"i use .+|"
        r"i study .+|"
        r"i want to .+|"
        r"i dislike .+|"
        r"i hate .+",
        re.IGNORECASE,
    )
]

REMEMBER_PREFIX = re.compile(
    r"^(?:remember(?:\s+that)?|"
    r"keep in mind(?:\s+that)?|"
    r"don't forget(?:\s+that)?|"
    r"do not forget(?:\s+that)?|"
    r"save this|"
    r"note that)"
    r"\s*[:,]?\s*",
    re.IGNORECASE,
)


LIST_COMMANDS = {
    "what do you remember about me",
    "what do you remember",
    "show my memories",
    "list my memories",
}

CLEAR_COMMANDS = {
    "forget everything",
    "forget everything you remember",
    "clear all memories",
    "forget all my memories",
}


def _clean_command(text: str) -> str:
    """Normalize command text without changing its internal content."""
    return text.strip().rstrip(" .!?").strip()


def _is_valid_memory(fact: str) -> bool:
    """Check whether a statement is a supported memory type."""
    return any(pattern.fullmatch(fact) for pattern in MEMORY_PATTERNS)


def save_memory(fact: str) -> str:
    """Save a memory if it is valid and not already stored."""
    fact = fact.strip()

    if not fact:
        return "Tell me what you'd like me to remember."

    if len(fact) > MAX_MEMORY_LENGTH:
        return (
            f"That memory is too long. "
            f"Please keep it under {MAX_MEMORY_LENGTH} characters."
        )

    try:
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO memories (fact) VALUES (?)",
                (fact,),
            )

        return f"I'll remember that {fact}"

    except sqlite3.IntegrityError as exc:
        error_name = getattr(exc, "sqlite_errorname", "")

        is_duplicate = (
            error_name in {
                "SQLITE_CONSTRAINT_UNIQUE",
                "SQLITE_CONSTRAINT_PRIMARYKEY",
            }
            or "UNIQUE constraint failed" in str(exc)
            or "PRIMARY KEY" in str(exc)
        )

        if is_duplicate:
            return "I already have that saved."

        raise


def get_memories() -> list[str]:
    """Return the most recently saved memories."""
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT fact
            FROM memories
            ORDER BY id DESC
            LIMIT ?
            """,
            (MAX_MEMORIES,),
        ).fetchall()

    return [row["fact"] if isinstance(row, sqlite3.Row) else row[0]
            for row in rows]


def delete_memory(fact: str) -> str:
    """
    Delete a memory safely.

    Exact match is preferred.
    Partial matches are deleted only when they identify one memory.
    """
    fact = fact.strip()

    if not fact:
        return "Tell me which memory you'd like me to forget."

    with get_connection() as connection:

        # First, try an exact case-insensitive match.
        exact_match = connection.execute(
            """
            SELECT id, fact
            FROM memories
            WHERE fact = ? COLLATE NOCASE
            LIMIT 1
            """,
            (fact,),
        ).fetchone()

        if exact_match:
            connection.execute(
                "DELETE FROM memories WHERE id = ?",
                (exact_match["id"] if isinstance(exact_match, sqlite3.Row)
                 else exact_match[0],),
            )
            return "Okay, I've removed that memory."

        # If no exact match exists, look for a partial match.
        matches = connection.execute(
            """
            SELECT id, fact
            FROM memories
            WHERE instr(lower(fact), lower(?)) > 0
            ORDER BY id DESC
            """,
            (fact,),
        ).fetchall()

        if not matches:
            return "I couldn't find that memory."

        # Avoid accidentally deleting multiple memories.
        if len(matches) > 1:
            matching_facts = [
                row["fact"] if isinstance(row, sqlite3.Row) else row[1]
                for row in matches
            ]

            return (
                "I found multiple matching memories. "
                "Please be more specific:\n"
                + "\n".join(f"- {item}" for item in matching_facts)
            )

        memory_id = (
            matches[0]["id"]
            if isinstance(matches[0], sqlite3.Row)
            else matches[0][0]
        )

        connection.execute(
            "DELETE FROM memories WHERE id = ?",
            (memory_id,),
        )

    return "Okay, I've removed that memory."


def clear_memories() -> str:
    """Delete all stored memories."""
    with get_connection() as connection:
        connection.execute("DELETE FROM memories")

    return "Okay, I've cleared all your saved memories."



def handle_memory_command(message: str) -> str | None:
    """Recognize and handle permanent memory commands."""

    text = _clean_command(message)

    if not text:
        return None

    normalized = text.casefold()

    # List memories
    if normalized in LIST_COMMANDS:
        memories = get_memories()

        if not memories:
            return "I don't have any saved memories yet."

        return (
            "Here's what I remember:\n"
            + "\n".join(f"- {fact}" for fact in memories)
        )

    # Clear all memories
    if normalized in CLEAR_COMMANDS:
        return clear_memories()

    # Delete a specific memory
    forget_match = re.fullmatch(
        r"(?:forget|delete|remove)"
        r"(?:\s+(?:that|memory|the memory))?\s+(.+)",
        text,
        flags=re.IGNORECASE,
    )

    if forget_match:
        return delete_memory(forget_match.group(1))

    # Detect explicit remember instructions
    prefix_match = REMEMBER_PREFIX.match(text)

    if prefix_match:
        fact = text[prefix_match.end():].strip()

        if not fact:
            return "What would you like me to remember?"

        return save_memory(fact)

    # Detect supported personal statements
    if _is_valid_memory(text):
        return save_memory(text)

    return None

