from __future__ import annotations

from datetime import datetime
import re
from typing import Any
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from .queries.auth_queries import create_auth_user, get_auth_user_by_email, get_auth_user_by_id
    from .queries.building_queries import get_all_buildings
    from .queries.club_queries import create_club, get_all_clubs, get_club_by_id, get_club_follower_user_ids, set_club_favorite, update_club
    from .queries.discovery_queries import get_club_detail_bundle, get_discovery_bundle
    from .queries.event_queries import (
        cancel_event,
        create_event,
        get_all_events,
        get_event_attendee_user_ids,
        get_event_by_id,
        set_event_attendance,
        update_event,
    )
    from .queries.event_invite_queries import (
        create_event_invite,
        get_event_invite_summary_for_user,
        list_event_invites_for_user,
        respond_to_event_invite,
    )
    from .queries.friend_queries import (
        are_friends,
        create_friend_request,
        get_friend_events_feed,
        get_friends_for_user,
        get_friends_going_to_event,
        get_pending_friend_requests,
        remove_friend,
        respond_to_friend_request,
        search_users_for_friendship,
    )
    from .queries.interest_queries import (
        get_interest_options,
        get_user_interest_names,
        replace_user_interests,
        set_onboarding_completed,
    )
    from .queries.notification_queries import (
        create_notification,
        dismiss_notification,
        get_unread_notification_count,
        list_notifications_for_user,
        mark_all_notifications_read,
        mark_notification_read,
    )
    from .queries.organizer_queries import (
        can_edit_club,
        can_manage_club_events,
        get_managed_clubs_for_user,
        get_membership_role,
        list_club_memberships,
    )
    from .queries.chat_queries import (
        create_or_get_direct_conversation,
        get_conversation_for_user,
        list_conversations_for_user,
        list_messages_for_conversation,
        mark_conversation_read,
        send_message,
    )
    from .queries.search_queries import search_everything
    from .queries.schedule_queries import get_schedule_for_user
    from .queries.user_queries import get_user_by_id
except ImportError:
    from queries.auth_queries import create_auth_user, get_auth_user_by_email, get_auth_user_by_id
    from queries.building_queries import get_all_buildings
    from queries.club_queries import create_club, get_all_clubs, get_club_by_id, get_club_follower_user_ids, set_club_favorite, update_club
    from queries.discovery_queries import get_club_detail_bundle, get_discovery_bundle
    from queries.event_queries import (
        cancel_event,
        create_event,
        get_all_events,
        get_event_attendee_user_ids,
        get_event_by_id,
        set_event_attendance,
        update_event,
    )
    from queries.event_invite_queries import (
        create_event_invite,
        get_event_invite_summary_for_user,
        list_event_invites_for_user,
        respond_to_event_invite,
    )
    from queries.friend_queries import (
        are_friends,
        create_friend_request,
        get_friend_events_feed,
        get_friends_for_user,
        get_friends_going_to_event,
        get_pending_friend_requests,
        remove_friend,
        respond_to_friend_request,
        search_users_for_friendship,
    )
    from queries.interest_queries import (
        get_interest_options,
        get_user_interest_names,
        replace_user_interests,
        set_onboarding_completed,
    )
    from queries.notification_queries import (
        create_notification,
        dismiss_notification,
        get_unread_notification_count,
        list_notifications_for_user,
        mark_all_notifications_read,
        mark_notification_read,
    )
    from queries.organizer_queries import (
        can_edit_club,
        can_manage_club_events,
        get_managed_clubs_for_user,
        get_membership_role,
        list_club_memberships,
    )
    from queries.chat_queries import (
        create_or_get_direct_conversation,
        get_conversation_for_user,
        list_conversations_for_user,
        list_messages_for_conversation,
        mark_conversation_read,
        send_message,
    )
    from queries.search_queries import search_everything
    from queries.schedule_queries import get_schedule_for_user
    from queries.user_queries import get_user_by_id

api_bp = Blueprint("api", __name__, url_prefix="/api")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _localize_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=datetime.now().astimezone().tzinfo)


def _parse_iso_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00") if value.endswith("Z") else value
    return _localize_datetime(datetime.fromisoformat(normalized))


def _get_primary_user() -> dict[str, Any]:
    session_user_id = session.get("user_id")
    if session_user_id:
        user = get_user_by_id(session_user_id)
        if user is not None:
            return user

    user_id = request.args.get("user_id")
    if request.is_json:
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("userId", user_id)
    user_id = user_id or "u1"
    user = get_user_by_id(user_id)
    if user is None:
        raise LookupError(f"User '{user_id}' not found")
    return user


def _truthy(value: str | None) -> bool:
    return value is not None and value.lower() in {"1", "true", "yes", "on"}


def _get_authenticated_user() -> dict[str, Any] | None:
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_user_by_id(user_id)


def _serialize_auth_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user.get("email"),
        "program": user.get("program"),
        "year": user.get("year"),
        "onboardingCompleted": bool(user.get("onboarding_completed", user.get("onboardingCompleted", True))),
        "interests": user.get("interests", []),
        "favoriteClubIds": user.get("favoriteClubIds", []),
        "attendingEventIds": user.get("attendingEventIds", []),
    }


def _serialize_friend_summary(friend: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": friend["id"],
        "name": friend["name"],
        "email": friend.get("email"),
        "program": friend.get("program"),
        "year": friend.get("year"),
        "avatarColor": friend.get("avatarColor"),
        "attendingEventIds": friend.get("attendingEventIds", []),
        "sharedClubCount": friend.get("sharedClubCount", 0),
        "mutualFriendsCount": friend.get("mutualFriendsCount", 0),
    }


def _serialize_notification(notification: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": notification["id"],
        "type": notification["type"],
        "title": notification["title"],
        "message": notification["message"],
        "isRead": bool(notification["is_read"]),
        "isDismissed": bool(notification["is_dismissed"]),
        "createdAt": notification["created_at"],
        "actorUserId": notification.get("actor_user_id"),
        "eventId": notification.get("event_id"),
        "clubId": notification.get("club_id"),
        "link": notification.get("link"),
    }


def _serialize_social_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user.get("email"),
        "program": user.get("program"),
        "year": user.get("year"),
        "avatarColor": user.get("avatarColor"),
    }


def _serialize_event_invite(invite: dict[str, Any]) -> dict[str, Any]:
    event = invite.get("event") or {}
    return {
        "id": invite["id"],
        "eventId": invite["event_id"],
        "senderUserId": invite["sender_user_id"],
        "recipientUserId": invite["recipient_user_id"],
        "status": invite["status"],
        "message": invite.get("message") or "",
        "createdAt": invite["created_at"],
        "respondedAt": invite.get("responded_at"),
        "event": {
            "id": event.get("id"),
            "title": event.get("title"),
            "clubId": event.get("clubId"),
            "clubName": event.get("clubName"),
            "building": event.get("building"),
            "room": event.get("room"),
            "startTime": event.get("startTime"),
            "endTime": event.get("endTime"),
            "status": event.get("status"),
        },
        "sender": _serialize_social_user(invite.get("sender")),
        "recipient": _serialize_social_user(invite.get("recipient")),
    }


def _serialize_conversation(conversation: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": conversation["id"],
        "createdAt": conversation["created_at"],
        "updatedAt": conversation["updated_at"],
        "otherParticipant": _serialize_social_user(conversation.get("other_participant")),
        "lastMessagePreview": conversation.get("last_message_preview") or "",
        "lastMessageTime": conversation.get("last_message_time"),
        "unreadCount": int(conversation.get("unread_count") or 0),
    }


def _serialize_message(message: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": message["id"],
        "conversationId": message["conversation_id"],
        "senderUserId": message["sender_user_id"],
        "body": message["body"],
        "createdAt": message["created_at"],
        "isRead": bool(message["is_read"]),
        "sender": _serialize_social_user(message.get("sender")),
    }


def _serialize_building_search_result(building: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": building["id"],
        "name": building["name"],
        "floors": building.get("floors", []),
        "todayEventsCount": int(building.get("todayEventsCount") or 0),
    }


def _serialize_club(club: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    favorite_ids = set(user["favoriteClubIds"]) if user else set()
    membership_role = get_membership_role(user.get("id") if user else None, club["id"])
    return {
        "id": club["id"],
        "name": club["name"],
        "category": club["category"],
        "description": club["description"],
        "favorite": club["id"] in favorite_ids,
        "meetingLocation": club.get("meeting_location") or "",
        "contactEmail": club.get("contact_email") or "",
        "socialLink": club.get("social_link") or "",
        "imageUrl": club.get("image_url") or "",
        "followerCount": int(club.get("follower_count") or 0),
        "becauseYouLike": club.get("becauseYouLike"),
        "userRole": membership_role,
        "canManageEvents": membership_role in {"owner", "admin"},
        "canEditClub": membership_role == "owner",
        "activeEventCount": int(club.get("active_event_count") or 0),
    }


def _valid_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _validate_create_club_payload(payload: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    normalized = {
        "name": str(payload.get("name", "")).strip(),
        "category": str(payload.get("category", "")).strip(),
        "description": str(payload.get("description", "")).strip(),
        "meetingLocation": str(payload.get("meetingLocation", "")).strip(),
        "contactEmail": str(payload.get("contactEmail", "")).strip(),
        "socialLink": str(payload.get("socialLink", "")).strip(),
        "imageUrl": str(payload.get("imageUrl", "")).strip(),
    }
    errors: dict[str, str] = {}

    if len(normalized["name"]) < 3:
        errors["name"] = "Club name must be at least 3 characters."
    elif len(normalized["name"]) > 100:
        errors["name"] = "Club name must be 100 characters or fewer."

    if len(normalized["category"]) < 2:
        errors["category"] = "Category must be at least 2 characters."
    elif len(normalized["category"]) > 60:
        errors["category"] = "Category must be 60 characters or fewer."

    if len(normalized["description"]) < 10:
        errors["description"] = "Description must be at least 10 characters."
    elif len(normalized["description"]) > 1200:
        errors["description"] = "Description must be 1200 characters or fewer."

    if len(normalized["meetingLocation"]) < 2:
        errors["meetingLocation"] = "Meeting location is required."

    if not normalized["contactEmail"]:
        errors["contactEmail"] = "Contact email is required."
    elif len(normalized["contactEmail"]) > 200 or not EMAIL_RE.match(normalized["contactEmail"]):
        errors["contactEmail"] = "Enter a valid contact email."

    if normalized["socialLink"] and not _valid_url(normalized["socialLink"]):
        errors["socialLink"] = "Social link must be a valid http or https URL."

    if normalized["imageUrl"] and not _valid_url(normalized["imageUrl"]):
        errors["imageUrl"] = "Image URL must be a valid http or https URL."

    return normalized, errors


def _validate_event_payload(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    normalized = {
        "title": str(payload.get("title", "")).strip(),
        "description": str(payload.get("description", "")).strip(),
        "building": str(payload.get("building", "")).strip(),
        "room": str(payload.get("room", "")).strip(),
        "floor": payload.get("floor"),
        "startTime": str(payload.get("startTime", "")).strip(),
        "endTime": str(payload.get("endTime", "")).strip(),
        "capacity": payload.get("capacity"),
        "foodAvailable": bool(payload.get("foodAvailable")),
        "foodType": str(payload.get("foodType", "")).strip(),
        "tags": payload.get("tags", []),
        "imageUrl": str(payload.get("imageUrl", "")).strip(),
    }
    errors: dict[str, str] = {}

    if len(normalized["title"]) < 3:
        errors["title"] = "Event title must be at least 3 characters."
    elif len(normalized["title"]) > 120:
        errors["title"] = "Event title must be 120 characters or fewer."

    if len(normalized["description"]) < 10:
        errors["description"] = "Description must be at least 10 characters."
    elif len(normalized["description"]) > 2000:
        errors["description"] = "Description must be 2000 characters or fewer."

    buildings = {building["id"]: building for building in get_all_buildings()}
    building = buildings.get(normalized["building"])
    if building is None:
        errors["building"] = "Choose a valid campus building."

    if len(normalized["room"]) < 1:
        errors["room"] = "Room is required."
    elif len(normalized["room"]) > 40:
        errors["room"] = "Room must be 40 characters or fewer."

    floors = building.get("floors", []) if building else []
    floor_value = normalized["floor"]
    if floor_value in {None, ""}:
        normalized["floor"] = floors[0] if floors else 1
    else:
        try:
            normalized["floor"] = int(floor_value)
        except (TypeError, ValueError):
            errors["floor"] = "Floor must be a number."
        else:
            if floors and normalized["floor"] not in floors:
                errors["floor"] = "Choose a valid floor for this building."

    if not normalized["startTime"]:
        errors["startTime"] = "Start time is required."
    if not normalized["endTime"]:
        errors["endTime"] = "End time is required."
    if normalized["startTime"] and normalized["endTime"]:
        try:
            start_time = _parse_iso_datetime(normalized["startTime"])
            end_time = _parse_iso_datetime(normalized["endTime"])
        except ValueError:
            errors["startTime"] = "Enter valid start and end times."
        else:
            if start_time >= end_time:
                errors["endTime"] = "End time must be after start time."

    if normalized["capacity"] in {None, ""}:
        normalized["capacity"] = 100
    else:
        try:
            normalized["capacity"] = int(normalized["capacity"])
        except (TypeError, ValueError):
            errors["capacity"] = "Capacity must be a whole number."
        else:
            if normalized["capacity"] < 1 or normalized["capacity"] > 5000:
                errors["capacity"] = "Capacity must be between 1 and 5000."

    if not normalized["foodAvailable"]:
        normalized["foodType"] = ""
    elif len(normalized["foodType"]) > 80:
        errors["foodType"] = "Food type must be 80 characters or fewer."

    tags_value = normalized["tags"]
    if isinstance(tags_value, str):
        tag_candidates = [part.strip() for part in tags_value.split(",")]
    elif isinstance(tags_value, list):
        tag_candidates = [str(item).strip() for item in tags_value]
    else:
        tag_candidates = []
        errors["tags"] = "Tags must be a list or comma-separated string."

    normalized_tags = []
    seen_tags = set()
    for tag in tag_candidates:
        if not tag:
            continue
        lowered = tag.lower()
        if lowered in seen_tags:
            continue
        seen_tags.add(lowered)
        normalized_tags.append(tag[:24])
    normalized["tags"] = normalized_tags[:8]

    if normalized["imageUrl"] and not _valid_url(normalized["imageUrl"]):
        errors["imageUrl"] = "Image URL must be a valid http or https URL."

    return normalized, errors


def _validate_signup_payload(payload: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    normalized = {
        "fullName": str(payload.get("fullName", "")).strip(),
        "email": str(payload.get("email", "")).strip().lower(),
        "password": str(payload.get("password", "")),
        "confirmPassword": str(payload.get("confirmPassword", "")),
        "program": str(payload.get("program", "")).strip(),
        "year": str(payload.get("year", "")).strip(),
    }
    errors: dict[str, str] = {}

    if len(normalized["fullName"]) < 2:
        errors["fullName"] = "Full name is required."

    if not normalized["email"]:
        errors["email"] = "Carleton email is required."
    elif not EMAIL_RE.match(normalized["email"]):
        errors["email"] = "Enter a valid email address."
    elif "@cmail.carleton.ca" not in normalized["email"] and "@carleton.ca" not in normalized["email"]:
        errors["email"] = "Use your Carleton email address."

    if len(normalized["password"]) < 8:
        errors["password"] = "Password must be at least 8 characters."
    elif normalized["password"] != normalized["confirmPassword"]:
        errors["confirmPassword"] = "Passwords do not match."

    return normalized, errors


def _validate_login_payload(payload: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    normalized = {
        "email": str(payload.get("email", "")).strip().lower(),
        "password": str(payload.get("password", "")),
    }
    errors: dict[str, str] = {}

    if not normalized["email"]:
        errors["email"] = "Email is required."
    if not normalized["password"]:
        errors["password"] = "Password is required."

    return normalized, errors


def _serialize_event(event: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    friend_ids = {friend["id"] for friend in get_friends_for_user(user["id"])} if user else set()
    attendee_ids = event.get("attendeeIds", [])
    now = datetime.now().astimezone()
    start = _parse_iso_datetime(event["startTime"])
    end = _parse_iso_datetime(event["endTime"])
    membership_role = get_membership_role(user.get("id") if user else None, event["clubId"])
    status = event.get("status") or "active"
    return {
        "id": event["id"],
        "title": event["title"],
        "clubId": event["clubId"],
        "createdByUserId": event.get("createdByUserId"),
        "building": event["building"],
        "floor": event["floor"],
        "room": event["room"],
        "startTime": event["startTime"],
        "endTime": event["endTime"],
        "attendanceCount": event["attendanceCount"],
        "capacity": event["capacity"],
        "foodAvailable": event["foodAvailable"],
        "foodType": event["foodType"],
        "description": event["description"],
        "imageUrl": event.get("imageUrl") or "",
        "status": status,
        "isCancelled": status == "cancelled",
        "tags": event["tags"],
        "friendsGoing": [attendee_id for attendee_id in attendee_ids if attendee_id in friend_ids],
        "friendCount": len([attendee_id for attendee_id in attendee_ids if attendee_id in friend_ids]),
        "happeningNow": status == "active" and start <= now <= end,
        "becauseYouLike": event.get("becauseYouLike"),
        "canManage": membership_role in {"owner", "admin"},
    }


def _validate_interest_names(value: Any) -> tuple[list[str], dict[str, str]]:
    if not isinstance(value, list):
        return [], {"interests": "Interests must be provided as a list."}

    normalized = []
    seen = set()
    valid = set(get_interest_options())
    for item in value:
        name = str(item).strip()
        if not name or name in seen:
            continue
        seen.add(name)
        normalized.append(name)

    invalid = [name for name in normalized if name not in valid]
    if invalid:
        return normalized, {"interests": "One or more selected interests are invalid."}
    return normalized[:6], {}


def _event_overlaps_schedule(event: dict[str, Any], schedule_classes: list[dict[str, Any]]) -> bool:
    event_start = _parse_iso_datetime(event["startTime"])
    event_end = _parse_iso_datetime(event["endTime"])
    for schedule_class in schedule_classes:
        class_start = _parse_iso_datetime(schedule_class["startDateTime"])
        class_end = _parse_iso_datetime(schedule_class["endDateTime"])
        if event_start < class_end and event_end > class_start:
            return True
    return False


def _filter_events(
    events: list[dict[str, Any]],
    *,
    filter_key: str | None,
    user: dict[str, Any] | None,
    schedule_conflicts: bool,
) -> list[dict[str, Any]]:
    now = datetime.now().astimezone().replace(microsecond=0)
    today = now.date()

    filtered = events
    if filter_key == "now":
        filtered = [
            event
            for event in filtered
            if _parse_iso_datetime(event["startTime"]) <= now <= _parse_iso_datetime(event["endTime"])
        ]
    elif filter_key == "upcoming":
        filtered = [event for event in filtered if _parse_iso_datetime(event["startTime"]) > now]
    elif filter_key == "today":
        filtered = [event for event in filtered if _parse_iso_datetime(event["startTime"]).date() == today]
    elif filter_key == "myclubs" and user is not None:
        favorite_ids = set(user["favoriteClubIds"])
        filtered = [
            event
            for event in filtered
            if event["clubId"] in favorite_ids
            and (
                _parse_iso_datetime(event["startTime"]) <= now <= _parse_iso_datetime(event["endTime"])
                or _parse_iso_datetime(event["startTime"]) > now
            )
        ]

    if schedule_conflicts and user is not None:
        schedule = get_schedule_for_user(user["id"])
        filtered = [event for event in filtered if not _event_overlaps_schedule(event, schedule["classes"])]

    return sorted(filtered, key=lambda event: _parse_iso_datetime(event["startTime"]))


@api_bp.route("/events", methods=["GET"])
def api_events():
    user = _get_primary_user()
    filter_key = request.args.get("filter")
    schedule_conflicts = _truthy(request.args.get("schedule_conflicts"))
    club_id = request.args.get("club_id")
    building_id = request.args.get("building_id")

    events = get_all_events()
    if club_id:
        events = [event for event in events if event["clubId"] == club_id]
    if building_id:
        events = [event for event in events if event["building"] == building_id]

    filtered = _filter_events(events, filter_key=filter_key, user=user, schedule_conflicts=schedule_conflicts)
    return jsonify([_serialize_event(event, user) for event in filtered])


@api_bp.route("/events/<event_id>", methods=["GET"])
def api_event_by_id(event_id: str):
    user = _get_authenticated_user() or _get_primary_user()
    event = get_event_by_id(event_id)
    if event is None:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(_serialize_event(event, user))


@api_bp.route("/events/<event_id>/attendance", methods=["PUT"])
def api_update_event_attendance(event_id: str):
    user = _get_primary_user()
    payload = request.get_json(silent=True) or {}
    attending = bool(payload.get("attending"))
    was_attending = event_id in set(user.get("attendingEventIds", []))
    existing_event = get_event_by_id(event_id)

    if existing_event is None:
        return jsonify({"error": "Event not found"}), 404
    if (existing_event.get("status") or "active") != "active":
        return jsonify({"error": "This event has been cancelled."}), 409

    attendance_count, attending_event_ids = set_event_attendance(user["id"], event_id, attending)
    if attendance_count is None:
        return jsonify({"error": "Event not found"}), 404

    authenticated_user = _get_authenticated_user()
    if authenticated_user is not None and authenticated_user["id"] == user["id"] and attending and not was_attending:
        event = get_event_by_id(event_id)
        if event is not None:
            for friend in get_friends_for_user(user["id"]):
                create_notification(
                    user_id=friend["id"],
                    notification_type="friend_activity",
                    title=f"{user['name']} is going to {event['title']}",
                    message=f"{user['name']} just joined {event['title']}.",
                    actor_user_id=user["id"],
                    event_id=event_id,
                    club_id=event["clubId"],
                    link=f"/event/{event_id}",
                    dedupe_existing=True,
                )

    return jsonify(
        {
            "eventId": event_id,
            "attending": event_id in attending_event_ids,
            "attendanceCount": attendance_count,
            "attendingEventIds": attending_event_ids,
        }
    )


@api_bp.route("/clubs", methods=["GET"])
def api_clubs():
    user = _get_authenticated_user() or _get_primary_user()
    return jsonify([_serialize_club(club, user) for club in get_all_clubs()])


@api_bp.route("/clubs/<club_id>/detail", methods=["GET"])
def api_club_detail(club_id: str):
    user = _get_authenticated_user() or _get_primary_user()
    payload = get_club_detail_bundle(club_id, user["id"] if user else None)
    if payload is None:
        return jsonify({"error": "Club not found"}), 404

    memberships = []
    if can_manage_club_events(user.get("id") if user else None, club_id) or can_edit_club(user.get("id") if user else None, club_id):
        memberships = [
            {
                "id": membership["id"],
                "userId": membership["user_id"],
                "clubId": membership["club_id"],
                "role": membership["role"],
                "createdAt": membership["created_at"],
                "name": membership["name"],
                "email": membership.get("email"),
                "program": membership.get("program"),
                "year": membership.get("year"),
            }
            for membership in list_club_memberships(club_id)
        ]

    return jsonify(
        {
            "club": _serialize_club(payload["club"], user),
            "upcomingEvents": [_serialize_event(event, user) for event in payload["upcomingEvents"]],
            "tags": payload["tags"],
            "relatedClubs": [_serialize_club(club, user) for club in payload["relatedClubs"]],
            "friendFollowerCount": payload["friendFollowerCount"],
            "memberships": memberships,
        }
    )


@api_bp.route("/discover", methods=["GET"])
def api_discover():
    user = _get_authenticated_user() or _get_primary_user()
    payload = get_discovery_bundle(user["id"])
    return jsonify(
        {
            "forYouEvents": [_serialize_event(event, user) for event in payload["forYouEvents"]],
            "trendingEvents": [_serialize_event(event, user) for event in payload["trendingEvents"]],
            "recommendedClubs": [_serialize_club(club, user) for club in payload["recommendedClubs"]],
            "suggestedFriends": [
                {
                    **_serialize_friend_summary(friend),
                    "status": friend.get("status"),
                    "requestId": friend.get("requestId"),
                }
                for friend in payload["suggestedFriends"]
            ],
            "activityFeed": payload["activityFeed"],
            "notifications": payload["notifications"],
            "interests": payload["interests"],
            "selectedInterests": payload.get("selectedInterests", []),
        }
    )


@api_bp.route("/interests", methods=["GET"])
def api_interests():
    return jsonify({"interests": get_interest_options()})


@api_bp.route("/users/me/interests", methods=["GET"])
def api_my_interests():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    return jsonify({"interests": get_user_interest_names(user["id"])})


@api_bp.route("/users/me/interests", methods=["POST"])
def api_save_my_interests():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_interest_names(payload.get("interests", []))
    if field_errors:
        return jsonify({"error": "Invalid interests", "fieldErrors": field_errors}), 400

    saved = replace_user_interests(user["id"], normalized)
    updated_user = get_user_by_id(user["id"])
    return jsonify({"interests": saved, "user": _serialize_auth_user(updated_user)})


@api_bp.route("/users/me/onboarding", methods=["POST"])
def api_complete_onboarding():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    interest_names, field_errors = _validate_interest_names(payload.get("interests", []))
    if field_errors:
        return jsonify({"error": "Invalid onboarding data", "fieldErrors": field_errors}), 400

    starter_club_ids = payload.get("starterClubIds", [])
    if not isinstance(starter_club_ids, list):
        return jsonify({"error": "Invalid onboarding data", "fieldErrors": {"starterClubIds": "Starter clubs must be a list."}}), 400

    starter_friend_ids = payload.get("starterFriendIds", [])
    if not isinstance(starter_friend_ids, list):
        return jsonify({"error": "Invalid onboarding data", "fieldErrors": {"starterFriendIds": "Starter friends must be a list."}}), 400

    valid_club_ids = {club["id"] for club in get_all_clubs()}
    normalized_club_ids = []
    for club_id in starter_club_ids[:6]:
        club_id_str = str(club_id).strip()
        if club_id_str in valid_club_ids and club_id_str not in normalized_club_ids:
            normalized_club_ids.append(club_id_str)

    replace_user_interests(user["id"], interest_names)
    for club_id in normalized_club_ids:
        set_club_favorite(user["id"], club_id, True)

    sent_friend_requests = []
    for friend_id in starter_friend_ids[:4]:
        friend_id_str = str(friend_id).strip()
        if not friend_id_str or friend_id_str == user["id"]:
            continue
        try:
            created_request = create_friend_request(user["id"], friend_id_str)
        except (LookupError, ValueError):
            continue

        receiver_user = get_user_by_id(friend_id_str)
        if receiver_user is not None:
            create_notification(
                user_id=friend_id_str,
                notification_type="friend_request",
                title=f"{user['name']} sent you a friend request",
                message=f"Open Friends to accept or decline {user['name']}'s request.",
                actor_user_id=user["id"],
                link="/friends",
                dedupe_existing=True,
            )
        sent_friend_requests.append(created_request["receiverUserId"])

    set_onboarding_completed(user["id"], True)
    updated_user = get_user_by_id(user["id"])
    return jsonify(
        {
            "ok": True,
            "interests": interest_names,
            "starterClubIds": normalized_club_ids,
            "starterFriendIds": sent_friend_requests,
            "user": _serialize_auth_user(updated_user),
        }
    )


@api_bp.route("/search", methods=["GET"])
def api_search():
    query = str(request.args.get("q", "")).strip()
    auth_user = _get_authenticated_user()
    primary_user = auth_user or _get_primary_user()
    payload = search_everything(query, viewer_id=auth_user["id"] if auth_user else None)

    return jsonify(
        {
            "clubs": [_serialize_club(club, primary_user) for club in payload["clubs"]],
            "events": [
                {
                    **_serialize_event(event, primary_user),
                    "clubName": event.get("clubName") or "",
                    "buildingName": event.get("buildingName") or event.get("building"),
                }
                for event in payload["events"]
            ],
            "users": [
                {
                    **_serialize_friend_summary(user),
                    "status": user.get("status", "none"),
                    "requestId": user.get("requestId"),
                }
                for user in payload["users"]
            ],
            "buildings": [_serialize_building_search_result(building) for building in payload["buildings"]],
        }
    )


@api_bp.route("/notifications", methods=["GET"])
def api_notifications():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    include_dismissed = _truthy(request.args.get("include_dismissed"))
    notifications = list_notifications_for_user(user["id"], include_dismissed=include_dismissed)
    return jsonify([_serialize_notification(notification) for notification in notifications])


@api_bp.route("/notifications/unread-count", methods=["GET"])
def api_notifications_unread_count():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    return jsonify({"count": get_unread_notification_count(user["id"])})


@api_bp.route("/notifications/<notification_id>/read", methods=["POST"])
def api_notification_mark_read(notification_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    updated = mark_notification_read(user["id"], notification_id)
    if updated is None:
        return jsonify({"error": "Notification not found"}), 404

    return jsonify({"notification": _serialize_notification(updated), "unreadCount": get_unread_notification_count(user["id"])})


@api_bp.route("/notifications/read-all", methods=["POST"])
def api_notifications_mark_all_read():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    updated_count = mark_all_notifications_read(user["id"])
    return jsonify({"updatedCount": updated_count, "unreadCount": get_unread_notification_count(user["id"])})


@api_bp.route("/notifications/<notification_id>/dismiss", methods=["POST"])
def api_notification_dismiss(notification_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    updated = dismiss_notification(user["id"], notification_id)
    if updated is None:
        return jsonify({"error": "Notification not found"}), 404

    return jsonify({"notification": _serialize_notification(updated), "unreadCount": get_unread_notification_count(user["id"])})


@api_bp.route("/auth/signup", methods=["POST"])
def api_auth_signup():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_signup_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid sign up data", "fieldErrors": field_errors}), 400

    existing_user = get_auth_user_by_email(normalized["email"])
    if existing_user is not None:
        return jsonify({
            "error": "Account already exists",
            "fieldErrors": {"email": "An account with this email already exists."},
        }), 409

    created_user = create_auth_user(
        full_name=normalized["fullName"],
        email=normalized["email"],
        password_hash=generate_password_hash(normalized["password"]),
        program=normalized["program"] or None,
        year=normalized["year"] or None,
    )
    session["user_id"] = created_user["id"]
    user = get_user_by_id(created_user["id"])
    return jsonify(_serialize_auth_user(user)), 201


@api_bp.route("/auth/login", methods=["POST"])
def api_auth_login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_login_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid login data", "fieldErrors": field_errors}), 400

    existing_user = get_auth_user_by_email(normalized["email"])
    if existing_user is None or not existing_user.get("password_hash") or not check_password_hash(
        existing_user["password_hash"], normalized["password"]
    ):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = existing_user["id"]
    user = get_user_by_id(existing_user["id"])
    return jsonify(_serialize_auth_user(user))


@api_bp.route("/auth/logout", methods=["POST"])
def api_auth_logout():
    session.pop("user_id", None)
    return jsonify({"ok": True})


@api_bp.route("/auth/me", methods=["GET"])
def api_auth_me():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"user": None})
    return jsonify({"user": _serialize_auth_user(user)})


@api_bp.route("/clubs", methods=["POST"])
def api_create_club():
    authenticated_user = _get_authenticated_user()
    user = authenticated_user or _get_primary_user()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_create_club_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid club data", "fieldErrors": field_errors}), 400

    existing_names = {club["name"].casefold() for club in get_all_clubs()}
    if normalized["name"].casefold() in existing_names:
        return jsonify({
            "error": "Invalid club data",
            "fieldErrors": {"name": "A club with this name already exists."},
        }), 409

    created = create_club(
        name=normalized["name"],
        category=normalized["category"],
        description=normalized["description"],
        meeting_location=normalized["meetingLocation"],
        contact_email=normalized["contactEmail"],
        social_link=normalized["socialLink"] or None,
        image_url=normalized["imageUrl"] or None,
        creator_user_id=authenticated_user["id"] if authenticated_user else None,
    )
    return jsonify(_serialize_club(created, user)), 201


@api_bp.route("/users/me/managed-clubs", methods=["GET"])
def api_managed_clubs():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    managed_clubs = get_managed_clubs_for_user(user["id"])
    return jsonify([_serialize_club(club, user) for club in managed_clubs])


@api_bp.route("/clubs/<club_id>/memberships", methods=["GET"])
def api_club_memberships(club_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401
    if get_club_by_id(club_id) is None:
        return jsonify({"error": "Club not found"}), 404
    if not (can_manage_club_events(user["id"], club_id) or can_edit_club(user["id"], club_id)):
        return jsonify({"error": "You do not have permission to view memberships for this club."}), 403

    memberships = list_club_memberships(club_id)
    return jsonify(
        [
            {
                "id": membership["id"],
                "userId": membership["user_id"],
                "clubId": membership["club_id"],
                "role": membership["role"],
                "createdAt": membership["created_at"],
                "name": membership["name"],
                "email": membership.get("email"),
                "program": membership.get("program"),
                "year": membership.get("year"),
            }
            for membership in memberships
        ]
    )


@api_bp.route("/clubs/<club_id>", methods=["PUT"])
def api_update_club(club_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401
    current_club = get_club_by_id(club_id)
    if current_club is None:
        return jsonify({"error": "Club not found"}), 404
    if not can_edit_club(user["id"], club_id):
        return jsonify({"error": "You do not have permission to edit this club."}), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_create_club_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid club data", "fieldErrors": field_errors}), 400

    duplicate = next(
        (
            club
            for club in get_all_clubs()
            if club["id"] != club_id and club["name"].casefold() == normalized["name"].casefold()
        ),
        None,
    )
    if duplicate is not None:
        return jsonify({
            "error": "Invalid club data",
            "fieldErrors": {"name": "A club with this name already exists."},
        }), 409

    updated = update_club(
        club_id,
        name=normalized["name"],
        category=normalized["category"],
        description=normalized["description"],
        meeting_location=normalized["meetingLocation"],
        contact_email=normalized["contactEmail"],
        social_link=normalized["socialLink"] or None,
        image_url=normalized["imageUrl"] or None,
    )
    return jsonify(_serialize_club(updated, user))


@api_bp.route("/clubs/<club_id>/events", methods=["POST"])
def api_create_event(club_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401
    club = get_club_by_id(club_id)
    if club is None:
        return jsonify({"error": "Club not found"}), 404
    if not can_manage_club_events(user["id"], club_id):
        return jsonify({"error": "You do not have permission to create events for this club."}), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_event_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid event data", "fieldErrors": field_errors}), 400

    created = create_event(
        title=normalized["title"],
        club_id=club_id,
        created_by_user_id=user["id"],
        building_id=normalized["building"],
        floor=normalized["floor"],
        room=normalized["room"],
        start_time=normalized["startTime"],
        end_time=normalized["endTime"],
        capacity=normalized["capacity"],
        food_available=normalized["foodAvailable"],
        food_type=normalized["foodType"] or None,
        description=normalized["description"],
        image_url=normalized["imageUrl"] or None,
        tags=normalized["tags"],
    )

    for follower_user_id in get_club_follower_user_ids(club_id):
        if follower_user_id == user["id"]:
            continue
        create_notification(
            user_id=follower_user_id,
            notification_type="club_event",
            title=f"{club['name']} posted {created['title']}",
            message=f"A new event from {club['name']} is now live.",
            actor_user_id=user["id"],
            event_id=created["id"],
            club_id=club_id,
            link=f"/event/{created['id']}",
        )

    return jsonify(_serialize_event(created, user)), 201


@api_bp.route("/events/<event_id>", methods=["PUT"])
def api_update_managed_event(event_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    existing_event = get_event_by_id(event_id)
    if existing_event is None:
        return jsonify({"error": "Event not found"}), 404
    if not can_manage_club_events(user["id"], existing_event["clubId"]):
        return jsonify({"error": "You do not have permission to edit this event."}), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    normalized, field_errors = _validate_event_payload(payload)
    if field_errors:
        return jsonify({"error": "Invalid event data", "fieldErrors": field_errors}), 400

    updated = update_event(
        event_id,
        title=normalized["title"],
        building_id=normalized["building"],
        floor=normalized["floor"],
        room=normalized["room"],
        start_time=normalized["startTime"],
        end_time=normalized["endTime"],
        capacity=normalized["capacity"],
        food_available=normalized["foodAvailable"],
        food_type=normalized["foodType"] or None,
        description=normalized["description"],
        image_url=normalized["imageUrl"] or None,
        tags=normalized["tags"],
    )
    if updated is None:
        return jsonify({"error": "Event not found"}), 404

    club = get_club_by_id(updated["clubId"])
    for attendee_user_id in get_event_attendee_user_ids(event_id):
        if attendee_user_id == user["id"]:
            continue
        create_notification(
            user_id=attendee_user_id,
            notification_type="event_update",
            title=f"{updated['title']} was updated",
            message=f"{club['name'] if club else 'This club'} updated an event you are attending.",
            actor_user_id=user["id"],
            event_id=event_id,
            club_id=updated["clubId"],
            link=f"/event/{event_id}",
        )

    return jsonify(_serialize_event(updated, user))


@api_bp.route("/events/<event_id>", methods=["DELETE"])
def api_cancel_managed_event(event_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    existing_event = get_event_by_id(event_id)
    if existing_event is None:
        return jsonify({"error": "Event not found"}), 404
    if not can_manage_club_events(user["id"], existing_event["clubId"]):
        return jsonify({"error": "You do not have permission to cancel this event."}), 403

    cancelled = cancel_event(event_id)
    if cancelled is None:
        return jsonify({"error": "Event not found"}), 404

    club = get_club_by_id(cancelled["clubId"])
    for attendee_user_id in get_event_attendee_user_ids(event_id):
        if attendee_user_id == user["id"]:
            continue
        create_notification(
            user_id=attendee_user_id,
            notification_type="event_cancelled",
            title=f"{cancelled['title']} was cancelled",
            message=f"{club['name'] if club else 'A club'} cancelled an event you planned to attend.",
            actor_user_id=user["id"],
            event_id=event_id,
            club_id=cancelled["clubId"],
            link=f"/event/{event_id}",
        )

    return jsonify(_serialize_event(cancelled, user))


@api_bp.route("/clubs/<club_id>/favorite", methods=["PUT"])
def api_update_club_favorite(club_id: str):
    user = _get_primary_user()
    payload = request.get_json(silent=True) or {}
    favorite = bool(payload.get("favorite"))

    club_ids = {club["id"] for club in get_all_clubs()}
    if club_id not in club_ids:
        return jsonify({"error": "Club not found"}), 404

    favorite_club_ids = set_club_favorite(user["id"], club_id, favorite)
    return jsonify(
        {
            "clubId": club_id,
            "favorite": club_id in favorite_club_ids,
            "favoriteClubIds": favorite_club_ids,
        }
    )


@api_bp.route("/clubs/<club_id>/follow", methods=["POST"])
def api_follow_club(club_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    club_ids = {club["id"] for club in get_all_clubs()}
    if club_id not in club_ids:
        return jsonify({"error": "Club not found"}), 404

    favorite_club_ids = set_club_favorite(user["id"], club_id, True)
    return jsonify({"clubId": club_id, "following": True, "favoriteClubIds": favorite_club_ids})


@api_bp.route("/clubs/<club_id>/follow", methods=["DELETE"])
def api_unfollow_club(club_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    club_ids = {club["id"] for club in get_all_clubs()}
    if club_id not in club_ids:
        return jsonify({"error": "Club not found"}), 404

    favorite_club_ids = set_club_favorite(user["id"], club_id, False)
    return jsonify({"clubId": club_id, "following": False, "favoriteClubIds": favorite_club_ids})


@api_bp.route("/users/me/followed-clubs", methods=["GET"])
def api_followed_clubs():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    favorite_ids = set(user["favoriteClubIds"])
    clubs = [_serialize_club(club, user) for club in get_all_clubs() if club["id"] in favorite_ids]
    return jsonify(clubs)


@api_bp.route("/friends", methods=["GET"])
def api_friends():
    user = _get_primary_user()
    return jsonify([_serialize_friend_summary(friend) for friend in get_friends_for_user(user["id"])])


@api_bp.route("/users/search", methods=["GET"])
def api_search_users():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    query = request.args.get("q", "")
    results = search_users_for_friendship(user["id"], query)
    return jsonify([
        {
            **_serialize_friend_summary(result),
            "status": result.get("status", "none"),
            "requestId": result.get("requestId"),
        }
        for result in results
    ])


@api_bp.route("/friends/requests", methods=["GET"])
def api_friend_requests():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    requests_payload = get_pending_friend_requests(user["id"])
    return jsonify(
        {
            "incoming": [
                {
                    "id": item["id"],
                    "senderUserId": item["senderUserId"],
                    "receiverUserId": item["receiverUserId"],
                    "status": item["status"],
                    "createdAt": item["createdAt"],
                    "direction": item["direction"],
                    "user": _serialize_friend_summary(item["user"]) if item.get("user") else None,
                }
                for item in requests_payload["incoming"]
            ],
            "outgoing": [
                {
                    "id": item["id"],
                    "senderUserId": item["senderUserId"],
                    "receiverUserId": item["receiverUserId"],
                    "status": item["status"],
                    "createdAt": item["createdAt"],
                    "direction": item["direction"],
                    "user": _serialize_friend_summary(item["user"]) if item.get("user") else None,
                }
                for item in requests_payload["outgoing"]
            ],
        }
    )


@api_bp.route("/friends/request", methods=["POST"])
def api_send_friend_request():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    receiver_user_id = str(payload.get("receiverUserId", "")).strip()
    if not receiver_user_id:
        return jsonify({"error": "receiverUserId is required"}), 400

    try:
        created_request = create_friend_request(user["id"], receiver_user_id)
    except LookupError:
        return jsonify({"error": "Student not found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    receiver_user = get_user_by_id(receiver_user_id)
    if receiver_user is not None:
        create_notification(
            user_id=receiver_user_id,
            notification_type="friend_request",
            title=f"{user['name']} sent you a friend request",
            message=f"Open Friends to accept or decline {user['name']}'s request.",
            actor_user_id=user["id"],
            link="/friends",
            dedupe_existing=True,
        )

    return jsonify(
        {
            "id": created_request["id"],
            "status": created_request["status"],
            "receiverUserId": created_request["receiverUserId"],
            "user": _serialize_friend_summary(created_request["user"]) if created_request.get("user") else None,
        }
    ), 201


@api_bp.route("/friends/request/<request_id>/accept", methods=["POST"])
def api_accept_friend_request(request_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        result = respond_to_friend_request(user["id"], request_id, accept=True)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    if result is None:
        return jsonify({"error": "Friend request not found"}), 404

    if result.get("user"):
        create_notification(
            user_id=result["user"]["id"],
            notification_type="friend_accept",
            title=f"{user['name']} accepted your friend request",
            message=f"You are now friends with {user['name']}.",
            actor_user_id=user["id"],
            link="/friends",
            dedupe_existing=True,
        )

    return jsonify(
        {
            "id": result["id"],
            "status": result["status"],
            "user": _serialize_friend_summary(result["user"]) if result.get("user") else None,
        }
    )


@api_bp.route("/friends/request/<request_id>/decline", methods=["POST"])
def api_decline_friend_request(request_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        result = respond_to_friend_request(user["id"], request_id, accept=False)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    if result is None:
        return jsonify({"error": "Friend request not found"}), 404

    return jsonify({"id": result["id"], "status": result["status"]})


@api_bp.route("/friends/<friend_id>", methods=["DELETE"])
def api_remove_friend(friend_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    removed = remove_friend(user["id"], friend_id)
    if not removed:
        return jsonify({"error": "Friend not found"}), 404

    return jsonify({"friendId": friend_id, "removed": True})


@api_bp.route("/events/<event_id>/friends-going", methods=["GET"])
def api_event_friends_going(event_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    friends = get_friends_going_to_event(user["id"], event_id)
    if friends is None:
        return jsonify({"error": "Event not found"}), 404

    return jsonify(
        {
            "eventId": event_id,
            "count": len(friends),
            "currentUserGoing": event_id in set(user.get("attendingEventIds", [])),
            "friends": [_serialize_friend_summary(friend) for friend in friends],
        }
    )


@api_bp.route("/users/me/friends-events", methods=["GET"])
def api_friends_events():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    events = get_friend_events_feed(user["id"])
    return jsonify(
        [
            {
                **event,
                "friends": [_serialize_friend_summary(friend) for friend in event["friends"]],
            }
            for event in events
        ]
    )


@api_bp.route("/events/<event_id>/invites", methods=["GET"])
def api_event_invites_for_event(event_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = get_event_invite_summary_for_user(user["id"], event_id)
    if payload is None:
        return jsonify({"error": "Event not found"}), 404

    return jsonify(
        {
            "eventId": payload["eventId"],
            "incoming": [_serialize_event_invite(invite) for invite in payload["incoming"]],
            "outgoing": [_serialize_event_invite(invite) for invite in payload["outgoing"]],
            "accepted": [_serialize_event_invite(invite) for invite in payload["accepted"]],
            "invitableFriends": [_serialize_social_user(friend) for friend in payload["invitableFriends"]],
        }
    )


@api_bp.route("/events/<event_id>/invites", methods=["POST"])
def api_create_event_invite(event_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    recipient_user_id = str(payload.get("recipientUserId", "")).strip()
    if not recipient_user_id:
        return jsonify({"error": "recipientUserId is required"}), 400

    message = str(payload.get("message", "")).strip()
    try:
        invite = create_event_invite(user["id"], event_id, recipient_user_id, message)
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    create_notification(
        user_id=recipient_user_id,
        notification_type="event_invite",
        title=f"{user['name']} invited you to {invite['event']['title']}",
        message=message or f"Open the event to accept or decline the invite.",
        actor_user_id=user["id"],
        event_id=event_id,
        club_id=invite["event"]["clubId"],
        link="/friends",
    )

    return jsonify({"invite": _serialize_event_invite(invite)}), 201


@api_bp.route("/users/me/event-invites", methods=["GET"])
def api_my_event_invites():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = list_event_invites_for_user(user["id"])
    return jsonify(
        {
            "incoming": [_serialize_event_invite(invite) for invite in payload["incoming"]],
            "outgoing": [_serialize_event_invite(invite) for invite in payload["outgoing"]],
            "history": [_serialize_event_invite(invite) for invite in payload["history"]],
        }
    )


@api_bp.route("/event-invites/<invite_id>/accept", methods=["POST"])
def api_accept_event_invite(invite_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        invite = respond_to_event_invite(user["id"], invite_id, accept=True)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    if invite is None:
        return jsonify({"error": "Invite not found"}), 404

    attendance_count, attending_event_ids = set_event_attendance(user["id"], invite["event_id"], True)
    if attendance_count is None:
        return jsonify({"error": "This event is no longer available."}), 409

    create_notification(
        user_id=invite["sender_user_id"],
        notification_type="invite_accepted",
        title=f"{user['name']} accepted your invite",
        message=f"{user['name']} is now going to {invite['event']['title']}.",
        actor_user_id=user["id"],
        event_id=invite["event_id"],
        club_id=invite["event"]["clubId"],
        link=f"/event/{invite['event_id']}",
    )

    return jsonify(
        {
            "invite": _serialize_event_invite(invite),
            "attendanceCount": attendance_count,
            "attendingEventIds": attending_event_ids,
        }
    )


@api_bp.route("/event-invites/<invite_id>/decline", methods=["POST"])
def api_decline_event_invite(invite_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    try:
        invite = respond_to_event_invite(user["id"], invite_id, accept=False)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    if invite is None:
        return jsonify({"error": "Invite not found"}), 404

    return jsonify({"invite": _serialize_event_invite(invite)})


@api_bp.route("/conversations", methods=["GET"])
def api_conversations():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    conversations = list_conversations_for_user(user["id"])
    return jsonify([_serialize_conversation(conversation) for conversation in conversations])


@api_bp.route("/conversations", methods=["POST"])
def api_create_conversation():
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    friend_user_id = str(payload.get("friendUserId", "")).strip()
    if not friend_user_id:
        return jsonify({"error": "friendUserId is required"}), 400

    try:
        conversation = create_or_get_direct_conversation(user["id"], friend_user_id)
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    return jsonify(_serialize_conversation(conversation)), 201


@api_bp.route("/conversations/<conversation_id>", methods=["GET"])
def api_conversation_detail(conversation_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    conversation = get_conversation_for_user(user["id"], conversation_id)
    if conversation is None:
        return jsonify({"error": "Conversation not found"}), 404

    return jsonify(_serialize_conversation(conversation))


@api_bp.route("/conversations/<conversation_id>/messages", methods=["GET"])
def api_conversation_messages(conversation_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    messages = list_messages_for_conversation(user["id"], conversation_id)
    if messages is None:
        return jsonify({"error": "Conversation not found"}), 404

    return jsonify([_serialize_message(message) for message in messages])


@api_bp.route("/conversations/<conversation_id>/messages", methods=["POST"])
def api_conversation_send_message(conversation_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body", "details": "Expected a JSON object."}), 400

    body = str(payload.get("body", ""))
    try:
        message, recipient_user_id = send_message(user["id"], conversation_id, body)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    create_notification(
        user_id=recipient_user_id,
        notification_type="direct_message",
        title=f"New message from {user['name']}",
        message=message["body"][:120],
        actor_user_id=user["id"],
        link=f"/messages/{conversation_id}",
    )

    return jsonify({"message": _serialize_message(message)}), 201


@api_bp.route("/conversations/<conversation_id>/read", methods=["POST"])
def api_conversation_mark_read(conversation_id: str):
    user = _get_authenticated_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    updated_count = mark_conversation_read(user["id"], conversation_id)
    if updated_count is None:
        return jsonify({"error": "Conversation not found"}), 404

    return jsonify({"updatedCount": updated_count})


@api_bp.route("/schedule", methods=["GET"])
def api_schedule():
    user = _get_primary_user()
    return jsonify(get_schedule_for_user(user["id"]))


@api_bp.route("/profile", methods=["GET"])
@api_bp.route("/user", methods=["GET"])
def api_profile():
    user = _get_primary_user()
    return jsonify(user)


@api_bp.route("/buildings", methods=["GET"])
def api_buildings():
    return jsonify(get_all_buildings())
