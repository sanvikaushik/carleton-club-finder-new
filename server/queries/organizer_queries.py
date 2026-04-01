from __future__ import annotations

from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


ROLE_PRIORITY = {"member": 0, "admin": 1, "owner": 2}
EVENT_MANAGER_ROLES = {"owner", "admin"}


def upsert_club_membership(user_id: str, club_id: str, role: str) -> dict:
    normalized_role = role if role in ROLE_PRIORITY else "member"
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id, role
            FROM club_memberships
            WHERE user_id = ? AND club_id = ?;
            """,
            (user_id, club_id),
        ).fetchone()

        if existing is None:
            membership_id = f"cm_{uuid4().hex[:12]}"
            connection.execute(
                """
                INSERT INTO club_memberships (id, user_id, club_id, role)
                VALUES (?, ?, ?, ?);
                """,
                (membership_id, user_id, club_id, normalized_role),
            )
        else:
            membership_id = existing["id"]
            upgraded_role = normalized_role
            if ROLE_PRIORITY.get(existing["role"], 0) > ROLE_PRIORITY.get(normalized_role, 0):
                upgraded_role = existing["role"]
            connection.execute(
                """
                UPDATE club_memberships
                SET role = ?
                WHERE id = ?;
                """,
                (upgraded_role, membership_id),
            )
        connection.commit()

        row = connection.execute(
            """
            SELECT id, user_id, club_id, role, created_at
            FROM club_memberships
            WHERE user_id = ? AND club_id = ?;
            """,
            (user_id, club_id),
        ).fetchone()

    return dict(row) if row else {}


def get_membership_role(user_id: str | None, club_id: str) -> str | None:
    if not user_id:
        return None

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT role
            FROM club_memberships
            WHERE user_id = ? AND club_id = ?;
            """,
            (user_id, club_id),
        ).fetchone()
    return row["role"] if row else None


def can_manage_club_events(user_id: str | None, club_id: str) -> bool:
    role = get_membership_role(user_id, club_id)
    return role in EVENT_MANAGER_ROLES


def can_edit_club(user_id: str | None, club_id: str) -> bool:
    role = get_membership_role(user_id, club_id)
    return role == "owner"


def list_club_memberships(club_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                cm.id,
                cm.user_id,
                cm.club_id,
                cm.role,
                cm.created_at,
                u.name,
                u.email,
                u.program,
                u.year
            FROM club_memberships cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.club_id = ?
            ORDER BY
                CASE cm.role
                    WHEN 'owner' THEN 0
                    WHEN 'admin' THEN 1
                    ELSE 2
                END,
                u.name ASC;
            """,
            (club_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_managed_clubs_for_user(user_id: str) -> list[dict]:
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
                cm.role,
                COUNT(DISTINCT f.user_id) AS follower_count,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) AS active_event_count
            FROM club_memberships cm
            JOIN clubs c ON c.id = cm.club_id
            LEFT JOIN favorites f ON f.club_id = c.id
            LEFT JOIN events e ON e.club_id = c.id
            WHERE cm.user_id = ?
              AND cm.role IN ('owner', 'admin')
            GROUP BY
                c.id,
                c.name,
                c.category,
                c.description,
                c.meeting_location,
                c.contact_email,
                c.social_link,
                c.image_url,
                c.created_at,
                cm.role
            ORDER BY c.name ASC;
            """,
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]
