from __future__ import annotations

from collections import defaultdict
from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def _placeholders(count: int) -> str:
    return ",".join("?" for _ in range(count))


def _get_favorite_sets(connection, user_ids: list[str]) -> dict[str, set[str]]:
    if not user_ids:
        return {}

    rows = connection.execute(
        f"""
        SELECT user_id, club_id
        FROM favorites
        WHERE user_id IN ({_placeholders(len(user_ids))});
        """,
        tuple(user_ids),
    ).fetchall()

    favorites_by_user: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        favorites_by_user[row["user_id"]].add(row["club_id"])
    return favorites_by_user


def _get_friend_sets(connection, user_ids: list[str]) -> dict[str, set[str]]:
    if not user_ids:
        return {}

    rows = connection.execute(
        f"""
        SELECT user_id, friend_id
        FROM friends
        WHERE user_id IN ({_placeholders(len(user_ids))});
        """,
        tuple(user_ids),
    ).fetchall()

    friends_by_user: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        friends_by_user[row["user_id"]].add(row["friend_id"])
    return friends_by_user


def _get_attending_event_ids(connection, user_ids: list[str]) -> dict[str, list[str]]:
    if not user_ids:
        return {}

    rows = connection.execute(
        f"""
        SELECT user_id, event_id
        FROM event_attendees
        WHERE user_id IN ({_placeholders(len(user_ids))})
        ORDER BY user_id ASC, created_at ASC, event_id ASC;
        """,
        tuple(user_ids),
    ).fetchall()

    events_by_user: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        events_by_user[row["user_id"]].append(row["event_id"])
    return events_by_user


def _get_user_profile_map(connection, target_ids: list[str], viewer_id: str | None = None) -> dict[str, dict]:
    if not target_ids:
        return {}

    rows = connection.execute(
        f"""
        SELECT id, name, email, program, year, avatar_color
        FROM users
        WHERE id IN ({_placeholders(len(target_ids))});
        """,
        tuple(target_ids),
    ).fetchall()

    comparison_ids = list(dict.fromkeys(([viewer_id] if viewer_id else []) + target_ids))
    favorite_sets = _get_favorite_sets(connection, comparison_ids)
    friend_sets = _get_friend_sets(connection, comparison_ids)
    attending_sets = _get_attending_event_ids(connection, target_ids)

    viewer_favorites = favorite_sets.get(viewer_id or "", set())
    viewer_friends = friend_sets.get(viewer_id or "", set())

    profiles: dict[str, dict] = {}
    for row in rows:
        target_id = row["id"]
        target_favorites = favorite_sets.get(target_id, set())
        target_friends = friend_sets.get(target_id, set())
        profiles[target_id] = {
            "id": target_id,
            "name": row["name"],
            "email": row["email"],
            "program": row["program"],
            "year": row["year"],
            "avatarColor": row["avatar_color"],
            "attendingEventIds": attending_sets.get(target_id, []),
            "sharedClubCount": len(viewer_favorites & target_favorites) if viewer_id else 0,
            "mutualFriendsCount": len((viewer_friends & target_friends) - {viewer_id}) if viewer_id else 0,
        }

    return profiles


def _get_pending_request_maps(connection, user_id: str, target_ids: list[str]) -> tuple[dict[str, str], dict[str, str]]:
    if not target_ids:
        return {}, {}

    params = (user_id, *target_ids, user_id, *target_ids)
    rows = connection.execute(
        f"""
        SELECT id, sender_user_id, receiver_user_id
        FROM friend_requests
        WHERE status = 'pending'
          AND (
            (sender_user_id = ? AND receiver_user_id IN ({_placeholders(len(target_ids))}))
            OR
            (receiver_user_id = ? AND sender_user_id IN ({_placeholders(len(target_ids))}))
          );
        """,
        params,
    ).fetchall()

    outgoing: dict[str, str] = {}
    incoming: dict[str, str] = {}
    for row in rows:
        if row["sender_user_id"] == user_id:
            outgoing[row["receiver_user_id"]] = row["id"]
        else:
            incoming[row["sender_user_id"]] = row["id"]
    return outgoing, incoming


def get_friends_for_user(user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT u.id
            FROM friends f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ?
            ORDER BY u.name ASC;
            """,
            (user_id,),
        ).fetchall()
        target_ids = [row["id"] for row in rows]
        profiles = _get_user_profile_map(connection, target_ids, viewer_id=user_id)

    return [profiles[target_id] for target_id in target_ids if target_id in profiles]


def are_friends(user_id: str, other_user_id: str) -> bool:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT 1
            FROM friends
            WHERE user_id = ? AND friend_id = ?;
            """,
            (user_id, other_user_id),
        ).fetchone()
    return row is not None


def search_users_for_friendship(user_id: str, query: str, limit: int = 8) -> list[dict]:
    normalized_query = query.strip().lower()
    with get_connection() as connection:
        if normalized_query:
            like_value = f"%{normalized_query}%"
            rows = connection.execute(
                """
                SELECT id
                FROM users
                WHERE id <> ?
                  AND (
                    lower(name) LIKE ?
                    OR lower(COALESCE(email, '')) LIKE ?
                  )
                ORDER BY name ASC
                LIMIT ?;
                """,
                (user_id, like_value, like_value, limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id
                FROM users
                WHERE id <> ?
                ORDER BY is_friend_profile ASC, name ASC
                LIMIT ?;
                """,
                (user_id, limit),
            ).fetchall()

        target_ids = [row["id"] for row in rows]
        profiles = _get_user_profile_map(connection, target_ids, viewer_id=user_id)
        friend_ids = _get_friend_sets(connection, [user_id]).get(user_id, set())
        outgoing_requests, incoming_requests = _get_pending_request_maps(connection, user_id, target_ids)

    results: list[dict] = []
    for target_id in target_ids:
        profile = profiles.get(target_id)
        if profile is None:
            continue

        status = "none"
        request_id = None
        if target_id in friend_ids:
            status = "friends"
        elif target_id in outgoing_requests:
            status = "requested"
            request_id = outgoing_requests[target_id]
        elif target_id in incoming_requests:
            status = "incoming_request"
            request_id = incoming_requests[target_id]

        results.append(
            {
                **profile,
                "status": status,
                "requestId": request_id,
            }
        )
    return results


def create_friend_request(sender_user_id: str, receiver_user_id: str) -> dict:
    if sender_user_id == receiver_user_id:
        raise ValueError("You cannot send a friend request to yourself.")

    with get_connection() as connection:
        receiver = connection.execute(
            "SELECT id FROM users WHERE id = ?;",
            (receiver_user_id,),
        ).fetchone()
        if receiver is None:
            raise LookupError("User not found.")

        existing_friendship = connection.execute(
            """
            SELECT 1
            FROM friends
            WHERE user_id = ? AND friend_id = ?;
            """,
            (sender_user_id, receiver_user_id),
        ).fetchone()
        if existing_friendship is not None:
            raise ValueError("You are already friends with this student.")

        existing_request = connection.execute(
            """
            SELECT id, sender_user_id, receiver_user_id
            FROM friend_requests
            WHERE status = 'pending'
              AND (
                (sender_user_id = ? AND receiver_user_id = ?)
                OR
                (sender_user_id = ? AND receiver_user_id = ?)
              )
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            (sender_user_id, receiver_user_id, receiver_user_id, sender_user_id),
        ).fetchone()
        if existing_request is not None:
            if existing_request["sender_user_id"] == sender_user_id:
                raise ValueError("Friend request already sent.")
            raise ValueError("This student has already sent you a friend request.")

        request_id = f"fr_{uuid4().hex[:12]}"
        connection.execute(
            """
            INSERT INTO friend_requests (id, sender_user_id, receiver_user_id, status)
            VALUES (?, ?, ?, 'pending');
            """,
            (request_id, sender_user_id, receiver_user_id),
        )
        connection.commit()

        profile = _get_user_profile_map(connection, [receiver_user_id], viewer_id=sender_user_id).get(receiver_user_id)

    return {
        "id": request_id,
        "status": "pending",
        "receiverUserId": receiver_user_id,
        "user": profile,
    }


def get_pending_friend_requests(user_id: str) -> dict[str, list[dict]]:
    with get_connection() as connection:
        incoming_rows = connection.execute(
            """
            SELECT id, sender_user_id, receiver_user_id, status, created_at
            FROM friend_requests
            WHERE receiver_user_id = ? AND status = 'pending'
            ORDER BY created_at DESC;
            """,
            (user_id,),
        ).fetchall()
        outgoing_rows = connection.execute(
            """
            SELECT id, sender_user_id, receiver_user_id, status, created_at
            FROM friend_requests
            WHERE sender_user_id = ? AND status = 'pending'
            ORDER BY created_at DESC;
            """,
            (user_id,),
        ).fetchall()

        target_ids = [row["sender_user_id"] for row in incoming_rows]
        target_ids.extend(row["receiver_user_id"] for row in outgoing_rows)
        profiles = _get_user_profile_map(connection, list(dict.fromkeys(target_ids)), viewer_id=user_id)

    def _serialize(row, other_user_id: str, direction: str) -> dict:
        return {
            "id": row["id"],
            "senderUserId": row["sender_user_id"],
            "receiverUserId": row["receiver_user_id"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "direction": direction,
            "user": profiles.get(other_user_id),
        }

    return {
        "incoming": [_serialize(row, row["sender_user_id"], "incoming") for row in incoming_rows],
        "outgoing": [_serialize(row, row["receiver_user_id"], "outgoing") for row in outgoing_rows],
    }


def respond_to_friend_request(user_id: str, request_id: str, *, accept: bool) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, sender_user_id, receiver_user_id, status
            FROM friend_requests
            WHERE id = ?;
            """,
            (request_id,),
        ).fetchone()
        if row is None:
            return None
        if row["receiver_user_id"] != user_id:
            raise PermissionError("You cannot respond to this friend request.")
        if row["status"] != "pending":
            raise ValueError("This friend request has already been handled.")

        new_status = "accepted" if accept else "declined"
        connection.execute(
            """
            UPDATE friend_requests
            SET status = ?
            WHERE id = ?;
            """,
            (new_status, request_id),
        )

        if accept:
            connection.execute(
                """
                INSERT OR IGNORE INTO friends (user_id, friend_id)
                VALUES (?, ?), (?, ?);
                """,
                (row["sender_user_id"], row["receiver_user_id"], row["receiver_user_id"], row["sender_user_id"]),
            )

        connection.commit()
        profile = _get_user_profile_map(connection, [row["sender_user_id"]], viewer_id=user_id).get(row["sender_user_id"])

    return {
        "id": row["id"],
        "status": new_status,
        "user": profile,
    }


def remove_friend(user_id: str, friend_id: str) -> bool:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT 1
            FROM friends
            WHERE user_id = ? AND friend_id = ?;
            """,
            (user_id, friend_id),
        ).fetchone()
        if existing is None:
            return False

        connection.execute(
            """
            DELETE FROM friends
            WHERE (user_id = ? AND friend_id = ?)
               OR (user_id = ? AND friend_id = ?);
            """,
            (user_id, friend_id, friend_id, user_id),
        )
        connection.commit()
    return True


def get_friends_going_to_event(user_id: str, event_id: str) -> list[dict] | None:
    with get_connection() as connection:
        event_exists = connection.execute(
            "SELECT id FROM events WHERE id = ? AND COALESCE(status, 'active') = 'active';",
            (event_id,),
        ).fetchone()
        if event_exists is None:
            return None

        rows = connection.execute(
            """
            SELECT u.id
            FROM event_attendees ea
            JOIN friends f ON f.friend_id = ea.user_id
            JOIN users u ON u.id = ea.user_id
            WHERE f.user_id = ? AND ea.event_id = ?
            ORDER BY u.name ASC;
            """,
            (user_id, event_id),
        ).fetchall()
        target_ids = [row["id"] for row in rows]
        profiles = _get_user_profile_map(connection, target_ids, viewer_id=user_id)

    return [profiles[target_id] for target_id in target_ids if target_id in profiles]


def get_friend_events_feed(user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                e.id AS event_id,
                e.title,
                e.club_id,
                c.name AS club_name,
                e.building_id,
                e.floor,
                e.room,
                e.start_time,
                e.end_time,
                u.id AS friend_id
            FROM event_attendees ea
            JOIN friends f ON f.friend_id = ea.user_id
            JOIN users u ON u.id = ea.user_id
            JOIN events e ON e.id = ea.event_id
            JOIN clubs c ON c.id = e.club_id
            WHERE f.user_id = ?
              AND COALESCE(e.status, 'active') = 'active'
            ORDER BY e.start_time ASC, u.name ASC;
            """,
            (user_id,),
        ).fetchall()

        friend_ids = list(dict.fromkeys(row["friend_id"] for row in rows))
        profiles = _get_user_profile_map(connection, friend_ids, viewer_id=user_id)

    by_event: dict[str, dict] = {}
    for row in rows:
        event_id = row["event_id"]
        if event_id not in by_event:
            by_event[event_id] = {
                "eventId": event_id,
                "title": row["title"],
                "clubId": row["club_id"],
                "clubName": row["club_name"],
                "building": row["building_id"],
                "floor": row["floor"],
                "room": row["room"],
                "startTime": row["start_time"],
                "endTime": row["end_time"],
                "friends": [],
            }
        profile = profiles.get(row["friend_id"])
        if profile is not None:
            by_event[event_id]["friends"].append(profile)

    return [
        {
            **event,
            "friendCount": len(event["friends"]),
        }
        for event in by_event.values()
    ]
