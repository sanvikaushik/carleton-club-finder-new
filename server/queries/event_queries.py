from __future__ import annotations

from collections import defaultdict
from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def _serialize_event_rows(event_rows, tag_rows, attendee_rows) -> list[dict]:
    tags_by_event: dict[str, list[str]] = defaultdict(list)
    for row in tag_rows:
        tags_by_event[row["event_id"]].append(row["value"])

    attendees_by_event: dict[str, list[str]] = defaultdict(list)
    for row in attendee_rows:
        attendees_by_event[row["event_id"]].append(row["user_id"])

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "clubId": row["club_id"],
            "createdByUserId": row["created_by_user_id"],
            "building": row["building_id"],
            "floor": row["floor"],
            "room": row["room"],
            "startTime": row["start_time"],
            "endTime": row["end_time"],
            "attendanceCount": row["attendance_count"],
            "capacity": row["capacity"],
            "foodAvailable": bool(row["food_available"]),
            "foodType": row["food_type"],
            "description": row["description"],
            "imageUrl": row["image_url"],
            "status": row["status"] or "active",
            "tags": tags_by_event.get(row["id"], []),
            "attendeeIds": attendees_by_event.get(row["id"], []),
        }
        for row in event_rows
    ]


def get_all_events(*, include_cancelled: bool = False) -> list[dict]:
    with get_connection() as connection:
        if include_cancelled:
            event_rows = connection.execute(
                """
                SELECT
                    id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    attendance_count,
                    capacity,
                    food_available,
                    food_type,
                    description,
                    image_url,
                    status
                FROM events
                ORDER BY start_time ASC;
                """
            ).fetchall()
        else:
            event_rows = connection.execute(
                """
                SELECT
                    id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    attendance_count,
                    capacity,
                    food_available,
                    food_type,
                    description,
                    image_url,
                    status
                FROM events
                WHERE COALESCE(status, 'active') = 'active'
                ORDER BY start_time ASC;
                """
            ).fetchall()

        tag_rows = connection.execute(
            """
            SELECT event_id, value
            FROM event_tags
            ORDER BY event_id ASC, position ASC;
            """
        ).fetchall()
        attendee_rows = connection.execute(
            """
            SELECT event_id, user_id
            FROM event_attendees
            ORDER BY event_id ASC, user_id ASC;
            """
        ).fetchall()

    return _serialize_event_rows(event_rows, tag_rows, attendee_rows)


def get_event_by_id(event_id: str, *, include_cancelled: bool = True) -> dict | None:
    with get_connection() as connection:
        if include_cancelled:
            event_row = connection.execute(
                """
                SELECT
                    id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    attendance_count,
                    capacity,
                    food_available,
                    food_type,
                    description,
                    image_url,
                    status
                FROM events
                WHERE id = ?;
                """,
                (event_id,),
            ).fetchone()
        else:
            event_row = connection.execute(
                """
                SELECT
                    id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    attendance_count,
                    capacity,
                    food_available,
                    food_type,
                    description,
                    image_url,
                    status
                FROM events
                WHERE id = ?
                  AND COALESCE(status, 'active') = 'active';
                """,
                (event_id,),
            ).fetchone()
        if event_row is None:
            return None

        tag_rows = connection.execute(
            """
            SELECT event_id, value
            FROM event_tags
            WHERE event_id = ?
            ORDER BY position ASC;
            """,
            (event_id,),
        ).fetchall()
        attendee_rows = connection.execute(
            """
            SELECT event_id, user_id
            FROM event_attendees
            WHERE event_id = ?
            ORDER BY user_id ASC;
            """,
            (event_id,),
        ).fetchall()

    events = _serialize_event_rows([event_row], tag_rows, attendee_rows)
    return events[0] if events else None


def get_attending_event_ids(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT ea.event_id
            FROM event_attendees ea
            JOIN events e ON e.id = ea.event_id
            WHERE ea.user_id = ?
              AND COALESCE(e.status, 'active') = 'active'
            ORDER BY ea.event_id ASC;
            """,
            (user_id,),
        ).fetchall()
    return [row["event_id"] for row in rows]


def get_event_attendee_user_ids(event_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT user_id
            FROM event_attendees
            WHERE event_id = ?
            ORDER BY created_at ASC, user_id ASC;
            """,
            (event_id,),
        ).fetchall()
    return [row["user_id"] for row in rows]


def create_event(
    *,
    title: str,
    club_id: str,
    created_by_user_id: str | None,
    building_id: str,
    floor: int,
    room: str,
    start_time: str,
    end_time: str,
    capacity: int,
    food_available: bool,
    food_type: str | None,
    description: str,
    image_url: str | None,
    tags: list[str],
) -> dict:
    event_id = f"event-{uuid4().hex[:12]}"
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO events (
                id,
                title,
                club_id,
                created_by_user_id,
                building_id,
                floor,
                room,
                start_time,
                end_time,
                attendance_count,
                capacity,
                food_available,
                food_type,
                description,
                image_url,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'active');
            """,
            (
                event_id,
                title,
                club_id,
                created_by_user_id,
                building_id,
                floor,
                room,
                start_time,
                end_time,
                capacity,
                1 if food_available else 0,
                food_type,
                description,
                image_url,
            ),
        )
        for index, tag in enumerate(tags):
            connection.execute(
                """
                INSERT INTO event_tags (event_id, position, value)
                VALUES (?, ?, ?);
                """,
                (event_id, index, tag),
            )
        connection.commit()
    return get_event_by_id(event_id) or {}


def update_event(
    event_id: str,
    *,
    title: str,
    building_id: str,
    floor: int,
    room: str,
    start_time: str,
    end_time: str,
    capacity: int,
    food_available: bool,
    food_type: str | None,
    description: str,
    image_url: str | None,
    tags: list[str],
) -> dict | None:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id
            FROM events
            WHERE id = ?;
            """,
            (event_id,),
        ).fetchone()
        if existing is None:
            return None

        connection.execute(
            """
            UPDATE events
            SET
                title = ?,
                building_id = ?,
                floor = ?,
                room = ?,
                start_time = ?,
                end_time = ?,
                capacity = ?,
                food_available = ?,
                food_type = ?,
                description = ?,
                image_url = ?
            WHERE id = ?;
            """,
            (title, building_id, floor, room, start_time, end_time, capacity, 1 if food_available else 0, food_type, description, image_url, event_id),
        )
        connection.execute(
            """
            DELETE FROM event_tags
            WHERE event_id = ?;
            """,
            (event_id,),
        )
        for index, tag in enumerate(tags):
            connection.execute(
                """
                INSERT INTO event_tags (event_id, position, value)
                VALUES (?, ?, ?);
                """,
                (event_id, index, tag),
            )
        connection.commit()
    return get_event_by_id(event_id)


def cancel_event(event_id: str) -> dict | None:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id
            FROM events
            WHERE id = ?;
            """,
            (event_id,),
        ).fetchone()
        if existing is None:
            return None

        connection.execute(
            """
            UPDATE events
            SET status = 'cancelled'
            WHERE id = ?;
            """,
            (event_id,),
        )
        connection.commit()
    return get_event_by_id(event_id)


def set_event_attendance(user_id: str, event_id: str, attending: bool) -> tuple[int | None, list[str]]:
    with get_connection() as connection:
        event_row = connection.execute(
            "SELECT attendance_count, status FROM events WHERE id = ?;",
            (event_id,),
        ).fetchone()
        if event_row is None:
            return None, []
        if (event_row["status"] or "active") != "active":
            return None, get_attending_event_ids(user_id)

        existing_row = connection.execute(
            """
            SELECT 1
            FROM event_attendees
            WHERE user_id = ? AND event_id = ?;
            """,
            (user_id, event_id),
        ).fetchone()

        attendance_count = event_row["attendance_count"]
        if attending and existing_row is None:
            connection.execute(
                """
                INSERT INTO event_attendees (user_id, event_id)
                VALUES (?, ?);
                """,
                (user_id, event_id),
            )
            attendance_count += 1
        elif not attending and existing_row is not None:
            connection.execute(
                """
                DELETE FROM event_attendees
                WHERE user_id = ? AND event_id = ?;
                """,
                (user_id, event_id),
            )
            attendance_count = max(0, attendance_count - 1)

        connection.execute(
            """
            UPDATE events
            SET attendance_count = ?
            WHERE id = ?;
            """,
            (attendance_count, event_id),
        )
        connection.commit()

    return attendance_count, get_attending_event_ids(user_id)
