from __future__ import annotations

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_all_clubs() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, category, description
            FROM clubs
            ORDER BY name ASC;
            """
        ).fetchall()
    return [dict(row) for row in rows]


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
