from __future__ import annotations

from datetime import datetime
from typing import Any

from flask import Blueprint, jsonify, request

try:
    from .queries.building_queries import get_all_buildings
    from .queries.club_queries import get_all_clubs, set_club_favorite
    from .queries.event_queries import get_all_events, get_event_by_id, set_event_attendance
    from .queries.friend_queries import get_friends_for_user
    from .queries.schedule_queries import get_schedule_for_user
    from .queries.user_queries import get_user_by_id
except ImportError:
    from queries.building_queries import get_all_buildings
    from queries.club_queries import get_all_clubs, set_club_favorite
    from queries.event_queries import get_all_events, get_event_by_id, set_event_attendance
    from queries.friend_queries import get_friends_for_user
    from queries.schedule_queries import get_schedule_for_user
    from queries.user_queries import get_user_by_id

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _localize_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=datetime.now().astimezone().tzinfo)


def _parse_iso_datetime(value: str) -> datetime:
    return _localize_datetime(datetime.fromisoformat(value))


def _get_primary_user() -> dict[str, Any]:
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


def _serialize_club(club: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    favorite_ids = set(user["favoriteClubIds"]) if user else set()
    return {
        "id": club["id"],
        "name": club["name"],
        "category": club["category"],
        "description": club["description"],
        "favorite": club["id"] in favorite_ids,
    }


def _serialize_event(event: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    friend_ids = {friend["id"] for friend in get_friends_for_user(user["id"])} if user else set()
    attendee_ids = event.get("attendeeIds", [])
    return {
        "id": event["id"],
        "title": event["title"],
        "clubId": event["clubId"],
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
        "tags": event["tags"],
        "friendsGoing": [attendee_id for attendee_id in attendee_ids if attendee_id in friend_ids],
    }


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
    user = _get_primary_user()
    event = get_event_by_id(event_id)
    if event is None:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(_serialize_event(event, user))


@api_bp.route("/events/<event_id>/attendance", methods=["PUT"])
def api_update_event_attendance(event_id: str):
    user = _get_primary_user()
    payload = request.get_json(silent=True) or {}
    attending = bool(payload.get("attending"))

    attendance_count, attending_event_ids = set_event_attendance(user["id"], event_id, attending)
    if attendance_count is None:
        return jsonify({"error": "Event not found"}), 404

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
    user = _get_primary_user()
    return jsonify([_serialize_club(club, user) for club in get_all_clubs()])


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


@api_bp.route("/friends", methods=["GET"])
def api_friends():
    user = _get_primary_user()
    return jsonify(get_friends_for_user(user["id"]))


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
