from __future__ import annotations

from typing import Any
from uuid import uuid4

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


DEFAULT_PRIVACY_SETTINGS: dict[str, Any] = {
    "profile_visibility": "public",
    "clubs_visibility": "public",
    "attendance_visibility": "public",
    "activity_visibility": "public",
    "allow_friend_requests_from": "everyone",
    "allow_messages_from": "friends",
    "allow_event_invites_from": "friends",
    "show_in_search": True,
}

VISIBILITY_OPTIONS = {"public", "friends", "private"}
FRIEND_REQUEST_OPTIONS = {"everyone", "mutuals_only", "nobody"}
MESSAGE_OPTIONS = {"friends", "nobody"}


def _serialize_privacy_row(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "profileVisibility": row["profile_visibility"],
        "clubsVisibility": row["clubs_visibility"],
        "attendanceVisibility": row["attendance_visibility"],
        "activityVisibility": row["activity_visibility"],
        "allowFriendRequestsFrom": row["allow_friend_requests_from"],
        "allowMessagesFrom": row["allow_messages_from"],
        "allowEventInvitesFrom": row["allow_event_invites_from"],
        "showInSearch": bool(row["show_in_search"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def ensure_user_privacy_settings(connection, user_id: str) -> None:
    existing = connection.execute(
        """
        SELECT id
        FROM user_privacy_settings
        WHERE user_id = ?;
        """,
        (user_id,),
    ).fetchone()
    if existing is not None:
        return

    connection.execute(
        """
        INSERT INTO user_privacy_settings (
            id,
            user_id,
            profile_visibility,
            clubs_visibility,
            attendance_visibility,
            activity_visibility,
            allow_friend_requests_from,
            allow_messages_from,
            allow_event_invites_from,
            show_in_search
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        (
            f"privacy_{uuid4().hex[:12]}",
            user_id,
            DEFAULT_PRIVACY_SETTINGS["profile_visibility"],
            DEFAULT_PRIVACY_SETTINGS["clubs_visibility"],
            DEFAULT_PRIVACY_SETTINGS["attendance_visibility"],
            DEFAULT_PRIVACY_SETTINGS["activity_visibility"],
            DEFAULT_PRIVACY_SETTINGS["allow_friend_requests_from"],
            DEFAULT_PRIVACY_SETTINGS["allow_messages_from"],
            DEFAULT_PRIVACY_SETTINGS["allow_event_invites_from"],
            1 if DEFAULT_PRIVACY_SETTINGS["show_in_search"] else 0,
        ),
    )


def get_user_privacy_settings(user_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        ensure_user_privacy_settings(connection, user_id)
        connection.commit()
        row = connection.execute(
            """
            SELECT *
            FROM user_privacy_settings
            WHERE user_id = ?;
            """,
            (user_id,),
        ).fetchone()
    return _serialize_privacy_row(row)


def update_user_privacy_settings(user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        ensure_user_privacy_settings(connection, user_id)
        connection.execute(
            """
            UPDATE user_privacy_settings
            SET
                profile_visibility = ?,
                clubs_visibility = ?,
                attendance_visibility = ?,
                activity_visibility = ?,
                allow_friend_requests_from = ?,
                allow_messages_from = ?,
                allow_event_invites_from = ?,
                show_in_search = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?;
            """,
            (
                updates["profileVisibility"],
                updates["clubsVisibility"],
                updates["attendanceVisibility"],
                updates["activityVisibility"],
                updates["allowFriendRequestsFrom"],
                updates["allowMessagesFrom"],
                updates["allowEventInvitesFrom"],
                1 if updates["showInSearch"] else 0,
                user_id,
            ),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT *
            FROM user_privacy_settings
            WHERE user_id = ?;
            """,
            (user_id,),
        ).fetchone()
    return _serialize_privacy_row(row)


def _get_friend_ids(connection, user_id: str | None) -> set[str]:
    if not user_id:
        return set()
    rows = connection.execute(
        """
        SELECT friend_id
        FROM friends
        WHERE user_id = ?;
        """,
        (user_id,),
    ).fetchall()
    return {row["friend_id"] for row in rows}


def _has_mutual_friend(connection, user_id: str | None, target_user_id: str) -> bool:
    if not user_id or user_id == target_user_id:
        return False
    viewer_friends = _get_friend_ids(connection, user_id)
    target_friends = _get_friend_ids(connection, target_user_id)
    return len((viewer_friends & target_friends) - {user_id, target_user_id}) > 0


def build_privacy_context(connection, viewer_user_id: str | None, target_user_id: str) -> dict[str, Any]:
    ensure_user_privacy_settings(connection, target_user_id)
    settings_row = connection.execute(
        """
        SELECT *
        FROM user_privacy_settings
        WHERE user_id = ?;
        """,
        (target_user_id,),
    ).fetchone()
    settings = _serialize_privacy_row(settings_row)
    is_self = viewer_user_id == target_user_id and viewer_user_id is not None
    is_friend = target_user_id in _get_friend_ids(connection, viewer_user_id)
    has_mutual_friend = _has_mutual_friend(connection, viewer_user_id, target_user_id)
    return {
        "viewerUserId": viewer_user_id,
        "targetUserId": target_user_id,
        "settings": settings,
        "isSelf": is_self,
        "isFriend": is_friend,
        "hasMutualFriend": has_mutual_friend,
    }


def _is_visible(scope: str, context: dict[str, Any]) -> bool:
    if context["isSelf"]:
        return True
    if scope == "public":
        return True
    if scope == "friends":
        return bool(context["isFriend"])
    return False


def can_view_profile_context(context: dict[str, Any]) -> bool:
    return _is_visible(context["settings"]["profileVisibility"], context)


def can_view_clubs_context(context: dict[str, Any]) -> bool:
    return _is_visible(context["settings"]["clubsVisibility"], context)


def can_view_attendance_context(context: dict[str, Any]) -> bool:
    return _is_visible(context["settings"]["attendanceVisibility"], context)


def can_view_activity_context(context: dict[str, Any]) -> bool:
    return _is_visible(context["settings"]["activityVisibility"], context)


def can_show_in_search_context(context: dict[str, Any]) -> bool:
    if context["isSelf"]:
        return True
    return bool(context["settings"]["showInSearch"])


def can_send_friend_request_context(context: dict[str, Any]) -> bool:
    if context["isSelf"] or context["isFriend"]:
        return False
    allowed = context["settings"]["allowFriendRequestsFrom"]
    if allowed == "everyone":
        return True
    if allowed == "mutuals_only":
        return bool(context["hasMutualFriend"])
    return False


def can_send_message_context(context: dict[str, Any]) -> bool:
    if context["isSelf"]:
        return True
    allowed = context["settings"]["allowMessagesFrom"]
    return allowed == "friends" and bool(context["isFriend"])


def can_send_event_invite_context(context: dict[str, Any]) -> bool:
    if context["isSelf"]:
        return False
    allowed = context["settings"]["allowEventInvitesFrom"]
    return allowed == "friends" and bool(context["isFriend"])


def privacy_note_for_profile(context: dict[str, Any]) -> str | None:
    if context["isSelf"] or can_view_profile_context(context):
        return None
    setting = context["settings"]["profileVisibility"]
    if setting == "friends":
        return "This profile is only visible to friends."
    return "This profile is private."


def get_privacy_context(viewer_user_id: str | None, target_user_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        context = build_privacy_context(connection, viewer_user_id, target_user_id)
        connection.commit()
    return context
