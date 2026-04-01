from __future__ import annotations

from uuid import uuid4

try:
    from ..db import get_connection
    from .friend_queries import are_friends
except ImportError:
    from db import get_connection
    from queries.friend_queries import are_friends


def _serialize_user(row, prefix: str) -> dict[str, str | None]:
    return {
        "id": row[f"{prefix}_id"],
        "name": row[f"{prefix}_name"],
        "email": row[f"{prefix}_email"],
        "program": row[f"{prefix}_program"],
        "year": row[f"{prefix}_year"],
        "avatarColor": row[f"{prefix}_avatar_color"],
    }


def _serialize_message_row(row) -> dict:
    return {
        "id": row["id"],
        "conversation_id": row["conversation_id"],
        "sender_user_id": row["sender_user_id"],
        "body": row["body"],
        "created_at": row["created_at"],
        "is_read": bool(row["is_read"]),
        "sender": _serialize_user(row, "sender"),
    }


def _serialize_conversation_row(row) -> dict:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "other_participant": _serialize_user(row, "other"),
        "last_message_preview": row["last_message_preview"] or "",
        "last_message_time": row["last_message_time"] or row["updated_at"],
        "unread_count": int(row["unread_count"] or 0),
    }


def _get_direct_conversation_id(connection, user_id: str, other_user_id: str) -> str | None:
    row = connection.execute(
        """
        SELECT cp1.conversation_id
        FROM conversation_participants cp1
        JOIN conversation_participants cp2
          ON cp2.conversation_id = cp1.conversation_id
        WHERE cp1.user_id = ?
          AND cp2.user_id = ?
          AND (
            SELECT COUNT(*)
            FROM conversation_participants cp
            WHERE cp.conversation_id = cp1.conversation_id
          ) = 2
        LIMIT 1;
        """,
        (user_id, other_user_id),
    ).fetchone()
    return row["conversation_id"] if row is not None else None


def _get_conversation_row_for_user(connection, user_id: str, conversation_id: str):
    return connection.execute(
        """
        SELECT
            c.id,
            c.created_at,
            c.updated_at,
            other.id AS other_id,
            other.name AS other_name,
            other.email AS other_email,
            other.program AS other_program,
            other.year AS other_year,
            other.avatar_color AS other_avatar_color,
            (
                SELECT m.body
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY datetime(m.created_at) DESC, m.id DESC
                LIMIT 1
            ) AS last_message_preview,
            (
                SELECT m.created_at
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY datetime(m.created_at) DESC, m.id DESC
                LIMIT 1
            ) AS last_message_time,
            (
                SELECT COUNT(*)
                FROM messages unread
                WHERE unread.conversation_id = c.id
                  AND unread.sender_user_id <> ?
                  AND unread.is_read = 0
            ) AS unread_count
        FROM conversations c
        JOIN conversation_participants mine
          ON mine.conversation_id = c.id
         AND mine.user_id = ?
        JOIN conversation_participants other_cp
          ON other_cp.conversation_id = c.id
         AND other_cp.user_id <> ?
        JOIN users other
          ON other.id = other_cp.user_id
        WHERE c.id = ?;
        """,
        (user_id, user_id, user_id, conversation_id),
    ).fetchone()


def list_conversations_for_user(user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                c.id,
                c.created_at,
                c.updated_at,
                other.id AS other_id,
                other.name AS other_name,
                other.email AS other_email,
                other.program AS other_program,
                other.year AS other_year,
                other.avatar_color AS other_avatar_color,
                (
                    SELECT m.body
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY datetime(m.created_at) DESC, m.id DESC
                    LIMIT 1
                ) AS last_message_preview,
                (
                    SELECT m.created_at
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY datetime(m.created_at) DESC, m.id DESC
                    LIMIT 1
                ) AS last_message_time,
                (
                    SELECT COUNT(*)
                    FROM messages unread
                    WHERE unread.conversation_id = c.id
                      AND unread.sender_user_id <> ?
                      AND unread.is_read = 0
                ) AS unread_count
            FROM conversations c
            JOIN conversation_participants mine
              ON mine.conversation_id = c.id
             AND mine.user_id = ?
            JOIN conversation_participants other_cp
              ON other_cp.conversation_id = c.id
             AND other_cp.user_id <> ?
            JOIN users other
              ON other.id = other_cp.user_id
            ORDER BY datetime(COALESCE(last_message_time, c.updated_at)) DESC, c.id DESC;
            """,
            (user_id, user_id, user_id),
        ).fetchall()

    return [_serialize_conversation_row(row) for row in rows]


def create_or_get_direct_conversation(user_id: str, other_user_id: str) -> dict:
    if user_id == other_user_id:
        raise ValueError("You cannot start a conversation with yourself.")
    if not are_friends(user_id, other_user_id):
        raise PermissionError("You can only message friends.")

    with get_connection() as connection:
        other_user = connection.execute(
            "SELECT id FROM users WHERE id = ?;",
            (other_user_id,),
        ).fetchone()
        if other_user is None:
            raise LookupError("Student not found.")

        conversation_id = _get_direct_conversation_id(connection, user_id, other_user_id)
        if conversation_id is None:
            conversation_id = f"conv_{uuid4().hex[:12]}"
            connection.execute(
                """
                INSERT INTO conversations (id)
                VALUES (?);
                """,
                (conversation_id,),
            )
            connection.execute(
                """
                INSERT INTO conversation_participants (id, conversation_id, user_id)
                VALUES (?, ?, ?), (?, ?, ?);
                """,
                (
                    f"cp_{uuid4().hex[:12]}",
                    conversation_id,
                    user_id,
                    f"cp_{uuid4().hex[:12]}",
                    conversation_id,
                    other_user_id,
                ),
            )
            connection.commit()

        row = _get_conversation_row_for_user(connection, user_id, conversation_id)

    return _serialize_conversation_row(row) if row is not None else {}


def get_conversation_for_user(user_id: str, conversation_id: str) -> dict | None:
    with get_connection() as connection:
        row = _get_conversation_row_for_user(connection, user_id, conversation_id)
    return _serialize_conversation_row(row) if row is not None else None


def list_messages_for_conversation(user_id: str, conversation_id: str) -> list[dict] | None:
    with get_connection() as connection:
        membership = connection.execute(
            """
            SELECT 1
            FROM conversation_participants
            WHERE conversation_id = ? AND user_id = ?;
            """,
            (conversation_id, user_id),
        ).fetchone()
        if membership is None:
            return None

        rows = connection.execute(
            """
            SELECT
                m.*,
                sender.id AS sender_id,
                sender.name AS sender_name,
                sender.email AS sender_email,
                sender.program AS sender_program,
                sender.year AS sender_year,
                sender.avatar_color AS sender_avatar_color
            FROM messages m
            JOIN users sender ON sender.id = m.sender_user_id
            WHERE m.conversation_id = ?
            ORDER BY datetime(m.created_at) ASC, m.id ASC;
            """,
            (conversation_id,),
        ).fetchall()

    return [_serialize_message_row(row) for row in rows]


def send_message(user_id: str, conversation_id: str, body: str) -> tuple[dict, str]:
    cleaned_body = body.strip()
    if len(cleaned_body) < 1:
        raise ValueError("Message cannot be empty.")
    if len(cleaned_body) > 1000:
        raise ValueError("Message must be 1000 characters or fewer.")

    message_id = f"msg_{uuid4().hex[:12]}"
    with get_connection() as connection:
        participant_rows = connection.execute(
            """
            SELECT cp.user_id
            FROM conversation_participants cp
            WHERE cp.conversation_id = ?
            ORDER BY cp.created_at ASC, cp.user_id ASC;
            """,
            (conversation_id,),
        ).fetchall()
        participant_ids = [row["user_id"] for row in participant_rows]
        if user_id not in participant_ids:
            raise PermissionError("You are not part of this conversation.")
        if len(participant_ids) != 2:
            raise PermissionError("Only direct conversations are supported.")

        other_user_id = next(participant_id for participant_id in participant_ids if participant_id != user_id)
        if not are_friends(user_id, other_user_id):
            raise PermissionError("You can only message friends.")

        connection.execute(
            """
            INSERT INTO messages (id, conversation_id, sender_user_id, body)
            VALUES (?, ?, ?, ?);
            """,
            (message_id, conversation_id, user_id, cleaned_body),
        )
        connection.execute(
            """
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
            """,
            (conversation_id,),
        )
        connection.commit()

        rows = connection.execute(
            """
            SELECT
                m.*,
                sender.id AS sender_id,
                sender.name AS sender_name,
                sender.email AS sender_email,
                sender.program AS sender_program,
                sender.year AS sender_year,
                sender.avatar_color AS sender_avatar_color
            FROM messages m
            JOIN users sender ON sender.id = m.sender_user_id
            WHERE m.id = ?;
            """,
            (message_id,),
        ).fetchall()

    return (_serialize_message_row(rows[0]) if rows else {}), other_user_id


def mark_conversation_read(user_id: str, conversation_id: str) -> int | None:
    with get_connection() as connection:
        membership = connection.execute(
            """
            SELECT 1
            FROM conversation_participants
            WHERE conversation_id = ? AND user_id = ?;
            """,
            (conversation_id, user_id),
        ).fetchone()
        if membership is None:
            return None

        cursor = connection.execute(
            """
            UPDATE messages
            SET is_read = 1
            WHERE conversation_id = ?
              AND sender_user_id <> ?
              AND is_read = 0;
            """,
            (conversation_id, user_id),
        )
        connection.commit()

    return int(cursor.rowcount or 0)
