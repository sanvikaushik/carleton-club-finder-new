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

EVENT_COLUMN_MIGRATIONS = {
    "created_by_user_id": "ALTER TABLE events ADD COLUMN created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;",
    "image_url": "ALTER TABLE events ADD COLUMN image_url TEXT;",
    "status": "ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
}

USER_COLUMN_MIGRATIONS = {
    "year": "ALTER TABLE users ADD COLUMN year TEXT;",
    "email": "ALTER TABLE users ADD COLUMN email TEXT;",
    "password_hash": "ALTER TABLE users ADD COLUMN password_hash TEXT;",
    "onboarding_completed": "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1;",
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

NOTIFICATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_dismissed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id TEXT,
    event_id TEXT,
    club_id TEXT,
    link TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL
);
"""

USER_INTERESTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS user_interests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    interest_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CLUB_MEMBERSHIPS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS club_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CHECK (role IN ('owner', 'admin', 'member'))
);
"""

EVENT_INVITES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS event_invites (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    recipient_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (sender_user_id <> recipient_user_id),
    CHECK (status IN ('pending', 'accepted', 'declined'))
);
"""

CONVERSATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

CONVERSATION_PARTICIPANTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS conversation_participants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

MESSAGES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
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

        events_table_exists = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'events';
            """
        ).fetchone()
        if events_table_exists is not None:
            existing_event_columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(events);").fetchall()
            }
            for column_name, sql in EVENT_COLUMN_MIGRATIONS.items():
                if column_name not in existing_event_columns:
                    connection.execute(sql)

            connection.execute(
                """
                UPDATE events
                SET status = 'active'
                WHERE status IS NULL OR trim(status) = '';
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_events_status
                ON events(status);
                """
            )

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

        notifications_table_exists = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'notifications';
            """
        ).fetchone()
        if notifications_table_exists is not None or users_table_exists is not None:
            connection.execute(NOTIFICATIONS_TABLE_SQL)
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_notifications_user_read
                ON notifications(user_id, is_read);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_notifications_user_dismissed
                ON notifications(user_id, is_dismissed);
                """
            )

        if users_table_exists is not None:
            connection.execute(USER_INTERESTS_TABLE_SQL)
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_user_interests_user_id
                ON user_interests(user_id);
                """
            )

            connection.execute(CLUB_MEMBERSHIPS_TABLE_SQL)
            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_club_memberships_user_club
                ON club_memberships(user_id, club_id);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_club_memberships_user_role
                ON club_memberships(user_id, role);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_club_memberships_club_role
                ON club_memberships(club_id, role);
                """
            )

            connection.execute(EVENT_INVITES_TABLE_SQL)
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_event_invites_event_status
                ON event_invites(event_id, status);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_event_invites_recipient_status
                ON event_invites(recipient_user_id, status);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_event_invites_sender_status
                ON event_invites(sender_user_id, status);
                """
            )

            connection.execute(CONVERSATIONS_TABLE_SQL)
            connection.execute(CONVERSATION_PARTICIPANTS_TABLE_SQL)
            connection.execute(MESSAGES_TABLE_SQL)
            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique
                ON conversation_participants(conversation_id, user_id);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
                ON conversation_participants(user_id, conversation_id);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
                ON messages(conversation_id, created_at);
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_read
                ON messages(conversation_id, is_read);
                """
            )

        connection.commit()


if __name__ == "__main__":
    apply_migrations()
    print("SQLite migrations applied successfully.")
