from __future__ import annotations

import uuid

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_auth_user_by_email(email: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, email, password_hash, program, year, onboarding_completed, created_at
            FROM users
            WHERE lower(email) = lower(?);
            """,
            (email,),
        ).fetchone()
    return dict(row) if row else None


def get_auth_user_by_id(user_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, email, password_hash, program, year, onboarding_completed, created_at
            FROM users
            WHERE id = ?;
            """,
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def create_auth_user(*, full_name: str, email: str, password_hash: str, program: str | None, year: str | None) -> dict:
    user_id = f"user-{uuid.uuid4().hex[:12]}"
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (id, name, email, password_hash, program, year, onboarding_completed, is_friend_profile)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0);
            """,
            (user_id, full_name, email.lower(), password_hash, program, year),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT id, name, email, program, year, onboarding_completed, created_at
            FROM users
            WHERE id = ?;
            """,
            (user_id,),
        ).fetchone()
    return dict(row)
