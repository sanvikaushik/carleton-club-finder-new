from __future__ import annotations

from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


INTEREST_OPTIONS = [
    "Tech",
    "Entrepreneurship",
    "Cultural",
    "Gaming",
    "Sports",
    "Academic",
    "Arts",
    "Volunteering",
    "Debate",
    "Music",
]

INTEREST_KEYWORDS = {
    "Tech": {"tech", "ai", "coding", "computer", "engineering", "robotics", "data"},
    "Entrepreneurship": {"startup", "entrepreneurship", "business", "innovation", "career"},
    "Cultural": {"culture", "cultural", "community", "language", "global"},
    "Gaming": {"gaming", "games", "esports", "board", "tabletop"},
    "Sports": {"sports", "fitness", "soccer", "basketball", "hockey", "wellness"},
    "Academic": {"academic", "research", "study", "learning", "science", "math"},
    "Arts": {"art", "arts", "design", "creative", "writing", "theatre", "film"},
    "Volunteering": {"volunteer", "service", "charity", "outreach", "community"},
    "Debate": {"debate", "policy", "speaking", "politics", "model", "argument"},
    "Music": {"music", "band", "choir", "concert", "song", "instrument"},
}


def get_interest_options() -> list[str]:
    return INTEREST_OPTIONS[:]


def get_interest_keywords() -> dict[str, set[str]]:
    return {name: set(values) for name, values in INTEREST_KEYWORDS.items()}


def get_user_interest_names(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT interest_name
            FROM user_interests
            WHERE user_id = ?
            ORDER BY created_at ASC, interest_name ASC;
            """,
            (user_id,),
        ).fetchall()
    return [row["interest_name"] for row in rows]


def replace_user_interests(user_id: str, interest_names: list[str]) -> list[str]:
    normalized = []
    seen = set()
    valid = set(INTEREST_OPTIONS)
    for interest_name in interest_names:
        if interest_name not in valid or interest_name in seen:
            continue
        seen.add(interest_name)
        normalized.append(interest_name)

    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM user_interests
            WHERE user_id = ?;
            """,
            (user_id,),
        )
        for interest_name in normalized:
            connection.execute(
                """
                INSERT INTO user_interests (id, user_id, interest_name)
                VALUES (?, ?, ?);
                """,
                (f"ui_{uuid4().hex[:12]}", user_id, interest_name),
            )
        connection.commit()

    return normalized


def set_onboarding_completed(user_id: str, completed: bool) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE users
            SET onboarding_completed = ?
            WHERE id = ?;
            """,
            (1 if completed else 0, user_id),
        )
        connection.commit()
