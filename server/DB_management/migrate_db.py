from __future__ import annotations

try:
    from ..db import get_connection
except ImportError:
    import sys
    from pathlib import Path

    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_connection


CLUB_COLUMN_MIGRATIONS = {
    "meeting_location": "ALTER TABLE clubs ADD COLUMN meeting_location TEXT;",
    "contact_email": "ALTER TABLE clubs ADD COLUMN contact_email TEXT;",
    "social_link": "ALTER TABLE clubs ADD COLUMN social_link TEXT;",
    "image_url": "ALTER TABLE clubs ADD COLUMN image_url TEXT;",
}

USER_COLUMN_MIGRATIONS = {
    "year": "ALTER TABLE users ADD COLUMN year TEXT;",
    "email": "ALTER TABLE users ADD COLUMN email TEXT;",
    "password_hash": "ALTER TABLE users ADD COLUMN password_hash TEXT;",
}

FRIEND_REQUESTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    sender_user_id TEXT NOT NULL,
    receiver_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (sender_user_id <> receiver_user_id),
    CHECK (status IN ('pending', 'accepted', 'declined'))
);
"""


def apply_migrations() -> None:
    with get_connection() as connection:
        clubs_table_exists = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'clubs';
            """
        ).fetchone()
        if clubs_table_exists is None:
            return

        existing_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(clubs);").fetchall()
        }

        for column_name, sql in CLUB_COLUMN_MIGRATIONS.items():
            if column_name not in existing_columns:
                connection.execute(sql)

        users_table_exists = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'users';
            """
        ).fetchone()
        if users_table_exists is not None:
            existing_user_columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(users);").fetchall()
            }
            for column_name, sql in USER_COLUMN_MIGRATIONS.items():
                if column_name not in existing_user_columns:
                    connection.execute(sql)

            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
                ON users(email)
                WHERE email IS NOT NULL;
                """
            )

        friends_table_exists = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'friends';
            """
        ).fetchone()
        if friends_table_exists is not None:
            connection.execute(FRIEND_REQUESTS_TABLE_SQL)
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_friend_requests_sender
                ON friend_requests(sender_user_id, status);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver
                ON friend_requests(receiver_user_id, status);
                """
            )

        connection.commit()


if __name__ == "__main__":
    apply_migrations()
    print("SQLite migrations applied successfully.")
