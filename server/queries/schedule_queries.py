from __future__ import annotations

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_schedule_for_user(user_id: str) -> dict:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                title,
                day_of_week,
                start_time,
                end_time,
                start_datetime,
                end_datetime,
                location
            FROM schedule_classes
            WHERE user_id = ?
            ORDER BY start_datetime ASC;
            """,
            (user_id,),
        ).fetchall()

    week_start = rows[0]["start_datetime"][:10] if rows else ""
    return {
        "weekStart": week_start,
        "classes": [
            {
                "id": row["id"],
                "title": row["title"],
                "dayOfWeek": row["day_of_week"],
                "startTime": row["start_time"],
                "endTime": row["end_time"],
                "startDateTime": row["start_datetime"],
                "endDateTime": row["end_datetime"],
                "location": row["location"],
            }
            for row in rows
        ],
    }
