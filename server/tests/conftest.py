from __future__ import annotations

import importlib
import sqlite3
from pathlib import Path
from uuid import uuid4

import pytest
from werkzeug.security import generate_password_hash


class DBFactory:
    def __init__(self, db_path: Path):
        self.db_path = db_path

    def connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON;")
        return connection

    def create_user(
        self,
        *,
        user_id: str | None = None,
        name: str = "Test User",
        email: str | None = None,
        password: str = "CampusPass123",
        program: str = "Computer Science",
        year: str = "2nd Year",
        onboarding_completed: int = 1,
        is_friend_profile: int = 0,
        avatar_color: str | None = None,
    ) -> dict:
        user_id = user_id or f"user-{uuid4().hex[:8]}"
        email = email or f"{user_id}@cmail.carleton.ca"
        with self.connection() as connection:
            connection.execute(
                """
                INSERT INTO users (
                    id,
                    name,
                    program,
                    year,
                    email,
                    password_hash,
                    onboarding_completed,
                    avatar_color,
                    is_friend_profile
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    user_id,
                    name,
                    program,
                    year,
                    email.lower(),
                    generate_password_hash(password),
                    onboarding_completed,
                    avatar_color,
                    is_friend_profile,
                ),
            )
            connection.commit()
            row = connection.execute("SELECT * FROM users WHERE id = ?;", (user_id,)).fetchone()
        return dict(row)

    def create_building(self, *, building_id: str, name: str, floors: list[int]) -> dict:
        with self.connection() as connection:
            connection.execute("INSERT INTO buildings (id, name) VALUES (?, ?);", (building_id, name))
            for floor in floors:
                connection.execute(
                    "INSERT INTO building_floors (building_id, floor) VALUES (?, ?);",
                    (building_id, floor),
                )
            connection.commit()
        return {"id": building_id, "name": name, "floors": floors}

    def create_club(
        self,
        *,
        club_id: str | None = None,
        name: str = "Test Club",
        category: str = "Technology",
        description: str = "A club used for tests.",
        meeting_location: str = "Nicol 4020",
        contact_email: str = "club@cmail.carleton.ca",
        social_link: str | None = None,
        image_url: str | None = None,
        owner_user_id: str | None = None,
    ) -> dict:
        club_id = club_id or f"club-{uuid4().hex[:8]}"
        with self.connection() as connection:
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
                (club_id, name, category, description, meeting_location, contact_email, social_link, image_url),
            )
            if owner_user_id:
                connection.execute(
                    """
                    INSERT INTO club_memberships (id, user_id, club_id, role)
                    VALUES (?, ?, ?, 'owner');
                    """,
                    (f"cm-{uuid4().hex[:8]}", owner_user_id, club_id),
                )
            connection.commit()
        return {"id": club_id, "name": name, "category": category, "description": description}

    def create_membership(self, *, user_id: str, club_id: str, role: str) -> None:
        with self.connection() as connection:
            connection.execute(
                """
                INSERT INTO club_memberships (id, user_id, club_id, role)
                VALUES (?, ?, ?, ?);
                """,
                (f"cm-{uuid4().hex[:8]}", user_id, club_id, role),
            )
            connection.commit()

    def create_event(
        self,
        *,
        event_id: str | None = None,
        title: str = "Test Event",
        club_id: str,
        created_by_user_id: str | None = None,
        building_id: str = "nicol",
        floor: int = 4,
        room: str = "4020",
        start_time: str = "2026-04-10T18:00:00-04:00",
        end_time: str = "2026-04-10T20:00:00-04:00",
        capacity: int = 80,
        food_available: bool = False,
        food_type: str | None = None,
        description: str = "A test event.",
        image_url: str | None = None,
        status: str = "active",
        tags: list[str] | None = None,
    ) -> dict:
        event_id = event_id or f"event-{uuid4().hex[:8]}"
        tags = tags or ["Tech"]
        with self.connection() as connection:
            connection.execute(
                """
                INSERT INTO events (
                    id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    attendance_count,
                    capacity,
                    food_available,
                    food_type,
                    description,
                    image_url,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?);
                """,
                (
                    event_id,
                    title,
                    club_id,
                    created_by_user_id,
                    building_id,
                    floor,
                    room,
                    start_time,
                    end_time,
                    capacity,
                    1 if food_available else 0,
                    food_type,
                    description,
                    image_url,
                    status,
                ),
            )
            for position, tag in enumerate(tags):
                connection.execute(
                    "INSERT INTO event_tags (event_id, position, value) VALUES (?, ?, ?);",
                    (event_id, position, tag),
                )
            connection.commit()
        return {"id": event_id, "club_id": club_id, "title": title}

    def add_attendance(self, *, user_id: str, event_id: str) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO event_attendees (user_id, event_id) VALUES (?, ?);",
                (user_id, event_id),
            )
            connection.execute(
                """
                UPDATE events
                SET attendance_count = (SELECT COUNT(*) FROM event_attendees WHERE event_id = ?)
                WHERE id = ?;
                """,
                (event_id, event_id),
            )
            connection.commit()

    def follow_club(self, *, user_id: str, club_id: str) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO favorites (user_id, club_id) VALUES (?, ?);",
                (user_id, club_id),
            )
            connection.commit()

    def add_friendship(self, *, user_id: str, friend_id: str) -> None:
        with self.connection() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?);",
                (user_id, friend_id),
            )
            connection.execute(
                "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?);",
                (friend_id, user_id),
            )
            connection.commit()

    def create_notification(
        self,
        *,
        user_id: str,
        notification_type: str = "friend_request",
        title: str = "Notice",
        message: str = "Test notification",
        actor_user_id: str | None = None,
        event_id: str | None = None,
        club_id: str | None = None,
    ) -> dict:
        notification_id = f"notif-{uuid4().hex[:8]}"
        with self.connection() as connection:
            connection.execute(
                """
                INSERT INTO notifications (
                    id,
                    user_id,
                    type,
                    title,
                    message,
                    actor_user_id,
                    event_id,
                    club_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (notification_id, user_id, notification_type, title, message, actor_user_id, event_id, club_id),
            )
            connection.commit()
            row = connection.execute("SELECT * FROM notifications WHERE id = ?;", (notification_id,)).fetchone()
        return dict(row)

    def fetchone(self, query: str, params: tuple = ()) -> dict | None:
        with self.connection() as connection:
            row = connection.execute(query, params).fetchone()
        return dict(row) if row else None

    def fetchall(self, query: str, params: tuple = ()) -> list[dict]:
        with self.connection() as connection:
            rows = connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]


@pytest.fixture
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "clubfinder-test.sqlite3"
    monkeypatch.setenv("CLUBFINDER_DB_PATH", str(db_path))

    schema_path = Path(__file__).resolve().parents[1] / "DB_management" / "schema.sql"
    connection = sqlite3.connect(db_path)
    connection.executescript(schema_path.read_text(encoding="utf-8"))
    connection.commit()
    connection.close()

    factory = DBFactory(db_path)
    factory.create_building(building_id="nicol", name="Nicol Building", floors=[1, 2, 3, 4])
    factory.create_building(building_id="uc", name="University Centre", floors=[1, 2])
    factory.create_user(
        user_id="u1",
        name="Demo User",
        email="demo@cmail.carleton.ca",
        password="CampusPass123",
        onboarding_completed=1,
    )

    app_module = importlib.import_module("server.app")
    app_module = importlib.reload(app_module)
    flask_app = app_module.create_app()
    flask_app.config.update(TESTING=True)
    flask_app.db_factory = factory
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app) -> DBFactory:
    return app.db_factory


@pytest.fixture
def login():
    def _login(client, email: str, password: str = "CampusPass123"):
        return client.post("/api/auth/login", json={"email": email, "password": password})

    return _login
