from __future__ import annotations

try:
    from .DB_management.init_db import init_db
    from .db import get_connection
    from .temp_data import get_temp_seed_data
except ImportError:
    from DB_management.init_db import init_db
    from db import get_connection
    from temp_data import get_temp_seed_data


def seed_database() -> None:
    init_db()
    data = get_temp_seed_data()

    primary_user = data["user"]
    friend_items = data["friends"]
    all_users = [primary_user, *friend_items]

    with get_connection() as connection:
        connection.executemany(
            """
            INSERT INTO users (id, name, program, avatar_color, is_friend_profile)
            VALUES (?, ?, ?, ?, ?);
            """,
            [
                (
                    user["id"],
                    user["name"],
                    user.get("program"),
                    user.get("avatarColor"),
                    0 if user["id"] == primary_user["id"] else 1,
                )
                for user in all_users
            ],
        )

        connection.executemany(
            """
            INSERT INTO buildings (id, name)
            VALUES (?, ?);
            """,
            [(building["id"], building["name"]) for building in data["buildings"]],
        )
        connection.executemany(
            """
            INSERT INTO building_floors (building_id, floor)
            VALUES (?, ?);
            """,
            [
                (building["id"], floor)
                for building in data["buildings"]
                for floor in building["floors"]
            ],
        )

        connection.executemany(
            """
            INSERT INTO clubs (id, name, category, description)
            VALUES (?, ?, ?, ?);
            """,
            [
                (club["id"], club["name"], club["category"], club["description"])
                for club in data["clubs"]
            ],
        )

        connection.executemany(
            """
            INSERT INTO events (
                id,
                title,
                club_id,
                building_id,
                floor,
                room,
                start_time,
                end_time,
                attendance_count,
                capacity,
                food_available,
                food_type,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            [
                (
                    event["id"],
                    event["title"],
                    event["clubId"],
                    event["building"],
                    event["floor"],
                    event["room"],
                    event["startTime"],
                    event["endTime"],
                    event["attendanceCount"],
                    event["capacity"],
                    1 if event["foodAvailable"] else 0,
                    event.get("foodType"),
                    event["description"],
                )
                for event in data["events"]
            ],
        )
        connection.executemany(
            """
            INSERT INTO event_tags (event_id, position, value)
            VALUES (?, ?, ?);
            """,
            [
                (event["id"], position, tag_value)
                for event in data["events"]
                for position, tag_value in enumerate(event.get("tags", []))
            ],
        )

        connection.executemany(
            """
            INSERT INTO favorites (user_id, club_id)
            VALUES (?, ?);
            """,
            [(primary_user["id"], club_id) for club_id in primary_user["favoriteClubIds"]],
        )

        friend_pairs = []
        for friend in friend_items:
            friend_pairs.append((primary_user["id"], friend["id"]))
            friend_pairs.append((friend["id"], primary_user["id"]))
        connection.executemany(
            """
            INSERT INTO friends (user_id, friend_id)
            VALUES (?, ?);
            """,
            friend_pairs,
        )

        attendee_rows = [(primary_user["id"], event_id) for event_id in primary_user["attendingEventIds"]]
        attendee_rows.extend(
            (friend["id"], event_id)
            for friend in friend_items
            for event_id in friend.get("attendingEventIds", [])
        )
        connection.executemany(
            """
            INSERT INTO event_attendees (user_id, event_id)
            VALUES (?, ?);
            """,
            attendee_rows,
        )

        connection.executemany(
            """
            INSERT INTO schedule_classes (
                id,
                user_id,
                title,
                day_of_week,
                start_time,
                end_time,
                start_datetime,
                end_datetime,
                location
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            [
                (
                    item["id"],
                    primary_user["id"],
                    item["title"],
                    item["dayOfWeek"],
                    item["startTime"],
                    item["endTime"],
                    item["startDateTime"],
                    item["endDateTime"],
                    item["location"],
                )
                for item in data["schedule"]["classes"]
            ],
        )

        connection.commit()


if __name__ == "__main__":
    seed_database()
    print("Seeded SQLite database with sample campus club data.")
