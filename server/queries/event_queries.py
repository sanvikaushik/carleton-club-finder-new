from __future__ import annotations

from collections import defaultdict

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_all_events() -> list[dict]:
    with get_connection() as connection:
        event_rows = connection.execute(
            """
            SELECT
                id,
                title,
                club_id,
                building_id,
                floor,
                room,
                start_time,
                end_time,
                attendance_count,
                capacity,
                food_available,
                food_type,
                description
            FROM events
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
            "tags": tags_by_event.get(row["id"], []),
            "attendeeIds": attendees_by_event.get(row["id"], []),
        }
        for row in event_rows
    ]


def get_event_by_id(event_id: str) -> dict | None:
    for event in get_all_events():
        if event["id"] == event_id:
            return event
    return None


def get_attending_event_ids(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT event_id
            FROM event_attendees
            WHERE user_id = ?
            ORDER BY event_id ASC;
            """,
            (user_id,),
        ).fetchall()
    return [row["event_id"] for row in rows]


def set_event_attendance(user_id: str, event_id: str, attending: bool) -> tuple[int | None, list[str]]:
    with get_connection() as connection:
        event_row = connection.execute(
            "SELECT attendance_count FROM events WHERE id = ?;",
            (event_id,),
        ).fetchone()
        if event_row is None:
            return None, []

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
