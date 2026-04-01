from __future__ import annotations

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection

try:
    from .club_queries import get_favorite_club_ids
    from .event_queries import get_attending_event_ids
    from .interest_queries import get_user_interest_names
except ImportError:
    from queries.club_queries import get_favorite_club_ids
    from queries.event_queries import get_attending_event_ids
    from queries.interest_queries import get_user_interest_names


def get_user_by_id(user_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, program, email, year, onboarding_completed
            FROM users
            WHERE id = ?;
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return {
        "id": row["id"],
        "name": row["name"],
        "program": row["program"],
        "email": row["email"],
        "year": row["year"],
        "onboardingCompleted": bool(row["onboarding_completed"]),
        "interests": get_user_interest_names(user_id),
        "favoriteClubIds": get_favorite_club_ids(user_id),
        "attendingEventIds": get_attending_event_ids(user_id),
    }


def get_all_users() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, program, email, year, onboarding_completed
            FROM users
            ORDER BY name ASC;
            """
        ).fetchall()

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "program": row["program"],
            "email": row["email"],
            "year": row["year"],
            "onboardingCompleted": bool(row["onboarding_completed"]),
        }
        for row in rows
    ]
