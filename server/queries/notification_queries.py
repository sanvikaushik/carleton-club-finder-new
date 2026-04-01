from __future__ import annotations

from typing import Any
from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def _serialize_notification_row(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "type": row["type"],
        "title": row["title"],
        "message": row["message"],
        "is_read": bool(row["is_read"]),
        "is_dismissed": bool(row["is_dismissed"]),
        "created_at": row["created_at"],
        "actor_user_id": row["actor_user_id"],
        "event_id": row["event_id"],
        "club_id": row["club_id"],
        "link": row["link"],
    }


def create_notification(
    *,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    actor_user_id: str | None = None,
    event_id: str | None = None,
    club_id: str | None = None,
    link: str | None = None,
    dedupe_existing: bool = False,
) -> dict[str, Any]:
    with get_connection() as connection:
        if dedupe_existing:
            existing = connection.execute(
                """
                SELECT *
                FROM notifications
                WHERE user_id = ?
                  AND type = ?
                  AND COALESCE(actor_user_id, '') = COALESCE(?, '')
                  AND COALESCE(event_id, '') = COALESCE(?, '')
                  AND COALESCE(club_id, '') = COALESCE(?, '')
                  AND is_dismissed = 0
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (user_id, notification_type, actor_user_id, event_id, club_id),
            ).fetchone()
            if existing is not None:
                return _serialize_notification_row(existing)

        notification_id = f"notif_{uuid4().hex[:12]}"
        connection.execute(
            """
            INSERT INTO notifications (
                id,
                user_id,
                type,
                title,
                message,
                actor_user_id,
                event_id,
                club_id,
                link
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (notification_id, user_id, notification_type, title, message, actor_user_id, event_id, club_id, link),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT *
            FROM notifications
            WHERE id = ?;
            """,
            (notification_id,),
        ).fetchone()

    return _serialize_notification_row(row) if row else {}


def list_notifications_for_user(user_id: str, *, include_dismissed: bool = False) -> list[dict[str, Any]]:
    with get_connection() as connection:
        if include_dismissed:
            rows = connection.execute(
                """
                SELECT *
                FROM notifications
                WHERE user_id = ?
                ORDER BY datetime(created_at) DESC, id DESC;
                """,
                (user_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT *
                FROM notifications
                WHERE user_id = ?
                  AND is_dismissed = 0
                ORDER BY datetime(created_at) DESC, id DESC;
                """,
                (user_id,),
            ).fetchall()

    return [_serialize_notification_row(row) for row in rows]


def get_unread_notification_count(user_id: str) -> int:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE user_id = ?
              AND is_read = 0
              AND is_dismissed = 0;
            """,
            (user_id,),
        ).fetchone()
    return int(row["unread_count"]) if row is not None else 0


def mark_notification_read(user_id: str, notification_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT *
            FROM notifications
            WHERE id = ?
              AND user_id = ?;
            """,
            (notification_id, user_id),
        ).fetchone()
        if existing is None:
            return None

        connection.execute(
            """
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
              AND user_id = ?;
            """,
            (notification_id, user_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT *
            FROM notifications
            WHERE id = ?;
            """,
            (notification_id,),
        ).fetchone()

    return _serialize_notification_row(row) if row else None


def mark_all_notifications_read(user_id: str) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
              AND is_read = 0
              AND is_dismissed = 0;
            """,
            (user_id,),
        )
        connection.commit()
    return int(cursor.rowcount or 0)


def dismiss_notification(user_id: str, notification_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT *
            FROM notifications
            WHERE id = ?
              AND user_id = ?;
            """,
            (notification_id, user_id),
        ).fetchone()
        if existing is None:
            return None

        connection.execute(
            """
            UPDATE notifications
            SET is_dismissed = 1
            WHERE id = ?
              AND user_id = ?;
            """,
            (notification_id, user_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT *
            FROM notifications
            WHERE id = ?;
            """,
            (notification_id,),
        ).fetchone()

    return _serialize_notification_row(row) if row else None
