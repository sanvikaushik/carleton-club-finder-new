from __future__ import annotations

from datetime import datetime

try:
    from .building_queries import get_all_buildings
    from .club_queries import get_all_clubs
    from .event_queries import get_all_events
    from .friend_queries import search_users_for_friendship
    from .user_queries import get_all_users
except ImportError:
    from queries.building_queries import get_all_buildings
    from queries.club_queries import get_all_clubs
    from queries.event_queries import get_all_events
    from queries.friend_queries import search_users_for_friendship
    from queries.user_queries import get_all_users


def _score_text(query: str, primary: str, *extras: str) -> int:
    query_lower = query.strip().lower()
    if not query_lower:
        return 0

    values = [primary, *extras]
    normalized = [value.lower() for value in values if value]

    score = 0
    if primary.lower() == query_lower:
        score += 120
    elif primary.lower().startswith(query_lower):
        score += 90
    elif query_lower in primary.lower():
        score += 70

    for value in normalized[1:]:
        if value == query_lower:
            score += 55
        elif value.startswith(query_lower):
            score += 40
        elif query_lower in value:
            score += 24

    return score


def _today_event_count_for_building(building_id: str, events: list[dict]) -> int:
    today = datetime.now().astimezone().date()
    return sum(1 for event in events if event["building"] == building_id and datetime.fromisoformat(event["startTime"]).date() == today)


def search_everything(query: str, *, viewer_id: str | None, limit_per_section: int = 5) -> dict:
    normalized_query = query.strip()
    if not normalized_query:
        return {"clubs": [], "events": [], "users": [], "buildings": []}

    clubs = get_all_clubs()
    events = get_all_events()
    buildings = get_all_buildings()
    building_name_by_id = {building["id"]: building["name"] for building in buildings}
    club_name_by_id = {club["id"]: club["name"] for club in clubs}

    club_matches = []
    for club in clubs:
        score = _score_text(normalized_query, club["name"], club["category"], club["description"])
        if score <= 0:
            continue
        club_matches.append((score, club))
    club_matches.sort(key=lambda item: (item[0], item[1]["name"].lower()), reverse=True)

    event_matches = []
    for event in events:
        building_name = building_name_by_id.get(event["building"], event["building"])
        club_name = club_name_by_id.get(event["clubId"], "")
        score = _score_text(
            normalized_query,
            event["title"],
            event["description"],
            " ".join(event.get("tags", [])),
            building_name,
            event["building"],
            event["room"],
            club_name,
        )
        if score <= 0:
            continue
        event_matches.append(
            (
                score,
                {
                    **event,
                    "buildingName": building_name,
                    "clubName": club_name,
                },
            )
        )
    event_matches.sort(key=lambda item: (item[0], item[1]["startTime"]), reverse=True)

    if viewer_id:
        user_matches = search_users_for_friendship(viewer_id, normalized_query, limit=limit_per_section)
    else:
        user_matches = []
        for user in get_all_users():
            score = _score_text(normalized_query, user["name"], user.get("email") or "", user.get("program") or "", user.get("year") or "")
            if score <= 0:
                continue
            user_matches.append(
                (
                    score,
                    {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user.get("email"),
                        "program": user.get("program"),
                        "year": user.get("year"),
                        "status": "none",
                    },
                )
            )
        user_matches.sort(key=lambda item: (item[0], item[1]["name"].lower()), reverse=True)
        user_matches = [item[1] for item in user_matches[:limit_per_section]]

    building_matches = []
    for building in buildings:
        score = _score_text(normalized_query, building["name"], building["id"])
        if score <= 0:
            continue
        building_matches.append(
            (
                score,
                {
                    **building,
                    "todayEventsCount": _today_event_count_for_building(building["id"], events),
                },
            )
        )
    building_matches.sort(key=lambda item: (item[0], item[1]["name"].lower()), reverse=True)

    return {
        "clubs": [item[1] for item in club_matches[:limit_per_section]],
        "events": [item[1] for item in event_matches[:limit_per_section]],
        "users": user_matches if viewer_id else user_matches,
        "buildings": [item[1] for item in building_matches[:limit_per_section]],
    }
