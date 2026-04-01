from __future__ import annotations

from uuid import uuid4

try:
    from ..db import get_connection
    from .friend_queries import are_friends
except ImportError:
    from db import get_connection
    from queries.friend_queries import are_friends


def _serialize_user(prefix: str, row) -> dict[str, str | None]:
    return {
        "id": row[f"{prefix}_id"],
        "name": row[f"{prefix}_name"],
        "email": row[f"{prefix}_email"],
        "program": row[f"{prefix}_program"],
        "year": row[f"{prefix}_year"],
        "avatarColor": row[f"{prefix}_avatar_color"],
    }


def _serialize_invite_row(row) -> dict:
    return {
        "id": row["id"],
        "event_id": row["event_id"],
        "sender_user_id": row["sender_user_id"],
        "recipient_user_id": row["recipient_user_id"],
        "status": row["status"],
        "message": row["message"],
        "created_at": row["created_at"],
        "responded_at": row["responded_at"],
        "event": {
            "id": row["event_id"],
            "title": row["event_title"],
            "clubId": row["club_id"],
            "clubName": row["club_name"],
            "building": row["building_id"],
            "room": row["room"],
            "startTime": row["start_time"],
            "endTime": row["end_time"],
            "status": row["event_status"] or "active",
        },
        "sender": _serialize_user("sender", row),
        "recipient": _serialize_user("recipient", row),
    }


def _get_joined_invite_rows(connection, where_sql: str, params: tuple) -> list[dict]:
    rows = connection.execute(
        f"""
        SELECT
            ei.*,
            e.title AS event_title,
            e.club_id,
            e.building_id,
            e.room,
            e.start_time,
            e.end_time,
            e.status AS event_status,
            c.name AS club_name,
            sender.id AS sender_id,
            sender.name AS sender_name,
            sender.email AS sender_email,
            sender.program AS sender_program,
            sender.year AS sender_year,
            sender.avatar_color AS sender_avatar_color,
            recipient.id AS recipient_id,
            recipient.name AS recipient_name,
            recipient.email AS recipient_email,
            recipient.program AS recipient_program,
            recipient.year AS recipient_year,
            recipient.avatar_color AS recipient_avatar_color
        FROM event_invites ei
        JOIN events e ON e.id = ei.event_id
        JOIN clubs c ON c.id = e.club_id
        JOIN users sender ON sender.id = ei.sender_user_id
        JOIN users recipient ON recipient.id = ei.recipient_user_id
        WHERE {where_sql}
        ORDER BY datetime(ei.created_at) DESC, ei.id DESC;
        """,
        params,
    ).fetchall()
    return [_serialize_invite_row(row) for row in rows]


def create_event_invite(sender_user_id: str, event_id: str, recipient_user_id: str, message: str | None = None) -> dict:
    if sender_user_id == recipient_user_id:
        raise ValueError("You cannot invite yourself.")
    if not are_friends(sender_user_id, recipient_user_id):
        raise PermissionError("You can only invite friends to events.")

    cleaned_message = (message or "").strip()
    if len(cleaned_message) > 240:
        raise ValueError("Invite message must be 240 characters or fewer.")

    invite_id = f"invite_{uuid4().hex[:12]}"
    with get_connection() as connection:
        event_row = connection.execute(
            """
            SELECT id, status
            FROM events
            WHERE id = ?;
            """,
            (event_id,),
        ).fetchone()
        if event_row is None:
            raise LookupError("Event not found.")
        if (event_row["status"] or "active") != "active":
            raise ValueError("This event is not accepting invites.")

        recipient_row = connection.execute(
            "SELECT id FROM users WHERE id = ?;",
            (recipient_user_id,),
        ).fetchone()
        if recipient_row is None:
            raise LookupError("Student not found.")

        existing = connection.execute(
            """
            SELECT id
            FROM event_invites
            WHERE event_id = ?
              AND sender_user_id = ?
              AND recipient_user_id = ?
              AND status = 'pending'
            LIMIT 1;
            """,
            (event_id, sender_user_id, recipient_user_id),
        ).fetchone()
        if existing is not None:
            raise ValueError("An invite is already pending for this friend.")

        connection.execute(
            """
            INSERT INTO event_invites (
                id,
                event_id,
                sender_user_id,
                recipient_user_id,
                status,
                message
            )
            VALUES (?, ?, ?, ?, 'pending', ?);
            """,
            (invite_id, event_id, sender_user_id, recipient_user_id, cleaned_message or None),
        )
        connection.commit()

        rows = _get_joined_invite_rows(connection, "ei.id = ?", (invite_id,))

    return rows[0] if rows else {}


def get_event_invite_summary_for_user(user_id: str, event_id: str) -> dict | None:
    with get_connection() as connection:
        event_row = connection.execute(
            "SELECT id FROM events WHERE id = ?;",
            (event_id,),
        ).fetchone()
        if event_row is None:
            return None

        friend_rows = connection.execute(
            """
            SELECT u.id, u.name, u.email, u.program, u.year, u.avatar_color
            FROM friends f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ?
            ORDER BY u.name ASC;
            """,
            (user_id,),
        ).fetchall()
        pending_or_accepted_rows = connection.execute(
            """
            SELECT recipient_user_id
            FROM event_invites
            WHERE event_id = ?
              AND sender_user_id = ?
              AND status IN ('pending', 'accepted')
            UNION
            SELECT sender_user_id
            FROM event_invites
            WHERE event_id = ?
              AND recipient_user_id = ?
              AND status IN ('pending', 'accepted');
            """,
            (event_id, user_id, event_id, user_id),
        ).fetchall()

        blocked_ids = {row[0] for row in pending_or_accepted_rows}
        invitable_friends = [
            {
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "program": row["program"],
                "year": row["year"],
                "avatarColor": row["avatar_color"],
            }
            for row in friend_rows
            if row["id"] not in blocked_ids
        ]

        incoming = _get_joined_invite_rows(
            connection,
            "ei.event_id = ? AND ei.recipient_user_id = ? AND ei.status = 'pending'",
            (event_id, user_id),
        )
        outgoing = _get_joined_invite_rows(
            connection,
            "ei.event_id = ? AND ei.sender_user_id = ? AND ei.status = 'pending'",
            (event_id, user_id),
        )
        accepted = _get_joined_invite_rows(
            connection,
            """
            ei.event_id = ?
            AND ei.status = 'accepted'
            AND (ei.sender_user_id = ? OR ei.recipient_user_id = ?)
            """,
            (event_id, user_id, user_id),
        )

    return {
        "eventId": event_id,
        "incoming": incoming,
        "outgoing": outgoing,
        "accepted": accepted,
        "invitableFriends": invitable_friends,
    }


def list_event_invites_for_user(user_id: str) -> dict[str, list[dict]]:
    with get_connection() as connection:
        incoming = _get_joined_invite_rows(
            connection,
            "ei.recipient_user_id = ? AND ei.status = 'pending'",
            (user_id,),
        )
        outgoing = _get_joined_invite_rows(
            connection,
            "ei.sender_user_id = ? AND ei.status = 'pending'",
            (user_id,),
        )
        history = _get_joined_invite_rows(
            connection,
            """
            (ei.sender_user_id = ? OR ei.recipient_user_id = ?)
            AND ei.status <> 'pending'
            """,
            (user_id, user_id),
        )

    return {
        "incoming": incoming,
        "outgoing": outgoing,
        "history": history,
    }


def respond_to_event_invite(user_id: str, invite_id: str, *, accept: bool) -> dict | None:
    with get_connection() as connection:
        invite_row = connection.execute(
            """
            SELECT ei.id, ei.recipient_user_id, ei.status, e.status AS event_status
            FROM event_invites ei
            JOIN events e ON e.id = ei.event_id
            WHERE ei.id = ?;
            """,
            (invite_id,),
        ).fetchone()
        if invite_row is None:
            return None
        if invite_row["recipient_user_id"] != user_id:
            raise PermissionError("You cannot respond to this invite.")
        if invite_row["status"] != "pending":
            raise ValueError("This invite has already been handled.")
        if accept and (invite_row["event_status"] or "active") != "active":
            raise ValueError("This event is no longer accepting invites.")

        new_status = "accepted" if accept else "declined"
        connection.execute(
            """
            UPDATE event_invites
            SET status = ?, responded_at = CURRENT_TIMESTAMP
            WHERE id = ?;
            """,
            (new_status, invite_id),
        )
        connection.commit()

        rows = _get_joined_invite_rows(connection, "ei.id = ?", (invite_id,))

    return rows[0] if rows else None
