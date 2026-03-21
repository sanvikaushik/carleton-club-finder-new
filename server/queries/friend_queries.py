from __future__ import annotations

from collections import defaultdict

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_friends_for_user(user_id: str) -> list[dict]:
    with get_connection() as connection:
        friend_rows = connection.execute(
            """
            SELECT u.id, u.name, u.avatar_color
            FROM friends f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ?
            ORDER BY u.name ASC;
            """,
            (user_id,),
        ).fetchall()
        attendance_rows = connection.execute(
            """
            SELECT ea.user_id, ea.event_id
            FROM event_attendees ea
            JOIN friends f ON f.friend_id = ea.user_id
            WHERE f.user_id = ?
            ORDER BY ea.user_id ASC, ea.event_id ASC;
            """,
            (user_id,),
        ).fetchall()

    events_by_friend: dict[str, list[str]] = defaultdict(list)
    for row in attendance_rows:
        events_by_friend[row["user_id"]].append(row["event_id"])

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "avatarColor": row["avatar_color"],
            "attendingEventIds": events_by_friend.get(row["id"], []),
        }
        for row in friend_rows
    ]
