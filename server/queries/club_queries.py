from __future__ import annotations

import re

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_all_clubs() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                c.id,
                c.name,
                c.category,
                c.description,
                c.meeting_location,
                c.contact_email,
                c.social_link,
                c.image_url,
                c.created_at,
                COUNT(f.user_id) AS follower_count
            FROM clubs c
            LEFT JOIN favorites f ON f.club_id = c.id
            GROUP BY
                c.id,
                c.name,
                c.category,
                c.description,
                c.meeting_location,
                c.contact_email,
                c.social_link,
                c.image_url,
                c.created_at
            ORDER BY c.name ASC;
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_club_by_id(club_id: str) -> dict | None:
    for club in get_all_clubs():
        if club["id"] == club_id:
            return club
    return None


def get_club_tags(club_id: str, limit: int = 5) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT et.value, COUNT(*) AS uses
            FROM event_tags et
            JOIN events e ON e.id = et.event_id
            WHERE e.club_id = ?
            GROUP BY et.value
            ORDER BY uses DESC, et.value ASC
            LIMIT ?;
            """,
            (club_id, limit),
        ).fetchall()
    return [row["value"] for row in rows]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "new-club"


def _generate_unique_club_id(connection, club_name: str) -> str:
    base_id = f"club-{_slugify(club_name)}"
    candidate_id = base_id
    suffix = 2

    while (
        connection.execute(
            """
            SELECT 1
            FROM clubs
            WHERE id = ?;
            """,
            (candidate_id,),
        ).fetchone()
        is not None
    ):
        candidate_id = f"{base_id}-{suffix}"
        suffix += 1

    return candidate_id


def create_club(
    *,
    name: str,
    category: str,
    description: str,
    meeting_location: str,
    contact_email: str,
    social_link: str | None,
    image_url: str | None,
) -> dict:
    with get_connection() as connection:
        club_id = _generate_unique_club_id(connection, name)
        connection.execute(
            """
            INSERT INTO clubs (
                id,
                name,
                category,
                description,
                meeting_location,
                contact_email,
                social_link,
                image_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                club_id,
                name,
                category,
                description,
                meeting_location,
                contact_email,
                social_link,
                image_url,
            ),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT
                c.id,
                c.name,
                c.category,
                c.description,
                c.meeting_location,
                c.contact_email,
                c.social_link,
                c.image_url,
                c.created_at,
                COUNT(f.user_id) AS follower_count
            FROM clubs c
            LEFT JOIN favorites f ON f.club_id = c.id
            WHERE c.id = ?
            GROUP BY
                c.id,
                c.name,
                c.category,
                c.description,
                c.meeting_location,
                c.contact_email,
                c.social_link,
                c.image_url,
                c.created_at;
            """,
            (club_id,),
        ).fetchone()

    return dict(row) if row else {}


def get_favorite_club_ids(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT club_id
            FROM favorites
            WHERE user_id = ?
            ORDER BY club_id ASC;
            """,
            (user_id,),
        ).fetchall()
    return [row["club_id"] for row in rows]


def set_club_favorite(user_id: str, club_id: str, favorite: bool) -> list[str]:
    with get_connection() as connection:
        if favorite:
            connection.execute(
                """
                INSERT OR IGNORE INTO favorites (user_id, club_id)
                VALUES (?, ?);
                """,
                (user_id, club_id),
            )
        else:
            connection.execute(
                """
                DELETE FROM favorites
                WHERE user_id = ? AND club_id = ?;
                """,
                (user_id, club_id),
            )
        connection.commit()

    return get_favorite_club_ids(user_id)
