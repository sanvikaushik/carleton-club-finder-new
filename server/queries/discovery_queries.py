from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection

try:
    from .club_queries import get_all_clubs, get_club_by_id, get_club_tags
    from .event_queries import get_all_events
    from .friend_queries import get_friend_events_feed, get_friends_for_user, search_users_for_friendship
    from .user_queries import get_user_by_id
except ImportError:
    from queries.club_queries import get_all_clubs, get_club_by_id, get_club_tags
    from queries.event_queries import get_all_events
    from queries.friend_queries import get_friend_events_feed, get_friends_for_user, search_users_for_friendship
    from queries.user_queries import get_user_by_id


def _parse_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return parsed


def _serialize_activity_item(kind: str, *, actor_name: str, primary_text: str, time_value: str, payload: dict) -> dict:
    return {
        "id": f"{kind}:{payload.get('id', primary_text)}:{time_value}",
        "kind": kind,
        "actorName": actor_name,
        "text": primary_text,
        "time": time_value,
        "payload": payload,
    }


def _get_friend_follow_rows(friend_ids: list[str]) -> list[dict]:
    if not friend_ids:
        return []

    placeholders = ",".join("?" for _ in friend_ids)
    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT
                fav.user_id,
                fav.club_id,
                fav.followed_at,
                u.name AS user_name,
                c.name AS club_name
            FROM favorites fav
            JOIN users u ON u.id = fav.user_id
            JOIN clubs c ON c.id = fav.club_id
            WHERE fav.user_id IN ({placeholders})
            ORDER BY fav.followed_at DESC;
            """,
            tuple(friend_ids),
        ).fetchall()
    return [dict(row) for row in rows]


def _derive_user_interests(user_id: str, events: list[dict], clubs: list[dict]) -> list[str]:
    user = get_user_by_id(user_id)
    if user is None:
        return []

    favorite_club_ids = set(user.get("favoriteClubIds", []))
    attending_event_ids = set(user.get("attendingEventIds", []))
    categories_by_club = {club["id"]: club["category"] for club in clubs}

    counter: Counter[str] = Counter()
    for event in events:
        if event["clubId"] in favorite_club_ids:
            counter.update(event.get("tags", []))
            category = categories_by_club.get(event["clubId"])
            if category:
                counter.update([category.lower()])

        if event["id"] in attending_event_ids:
            counter.update(event.get("tags", []))
            counter.update(event.get("tags", []))

    return [item for item, _ in counter.most_common(6)]


def _score_event(event: dict, *, favorite_club_ids: set[str], interest_tags: set[str], friend_count: int, now: datetime) -> float:
    start = _parse_iso(event["startTime"])
    end = _parse_iso(event["endTime"])
    score = 0.0

    if end < now - timedelta(hours=6):
        return -999.0

    if event["clubId"] in favorite_club_ids:
        score += 6

    score += min(friend_count * 3, 9)
    score += min(len(interest_tags.intersection(set(event.get("tags", [])))) * 2, 8)

    if start <= now <= end:
        score += 8
    elif start > now:
        hours_until = max((start - now).total_seconds() / 3600, 0.0)
        score += max(0.0, 6 - min(hours_until, 6))

    if event.get("foodAvailable"):
        score += 0.75

    crowd_ratio = (event["attendanceCount"] / event["capacity"]) if event.get("capacity") else 0
    score += min(crowd_ratio * 4, 4)
    return score


def get_discovery_bundle(user_id: str) -> dict:
    user = get_user_by_id(user_id)
    if user is None:
        return {
            "forYouEvents": [],
            "trendingEvents": [],
            "recommendedClubs": [],
            "suggestedFriends": [],
            "activityFeed": [],
            "notifications": [],
            "interests": [],
        }

    now = datetime.now().astimezone()
    clubs = get_all_clubs()
    events = get_all_events()
    friends = get_friends_for_user(user_id)
    friend_ids = [friend["id"] for friend in friends]
    friend_event_feed = get_friend_events_feed(user_id)
    friend_follow_rows = _get_friend_follow_rows(friend_ids)
    favorite_club_ids = set(user.get("favoriteClubIds", []))
    interest_list = _derive_user_interests(user_id, events, clubs)
    interest_tags = set(interest_list)

    friend_counts_by_event: dict[str, int] = defaultdict(int)
    for friend in friends:
        for event_id in friend.get("attendingEventIds", []):
            friend_counts_by_event[event_id] += 1

    scored_events = sorted(
        (
            (
                _score_event(
                    event,
                    favorite_club_ids=favorite_club_ids,
                    interest_tags=interest_tags,
                    friend_count=friend_counts_by_event.get(event["id"], 0),
                    now=now,
                ),
                event,
            )
            for event in events
        ),
        key=lambda item: item[0],
        reverse=True,
    )
    for_you_events = [event for score, event in scored_events if score > -100][:4]

    trending_events = sorted(
        events,
        key=lambda event: (
            1 if _parse_iso(event["startTime"]) <= now <= _parse_iso(event["endTime"]) else 0,
            friend_counts_by_event.get(event["id"], 0),
            event["attendanceCount"],
        ),
        reverse=True,
    )[:4]

    friend_follow_counts: Counter[str] = Counter(row["club_id"] for row in friend_follow_rows)
    recommended_clubs = sorted(
        clubs,
        key=lambda club: (
            friend_follow_counts.get(club["id"], 0) * 4,
            4 if club["category"].lower() in interest_tags else 0,
            club.get("follower_count", 0),
        ),
        reverse=True,
    )
    recommended_clubs = [club for club in recommended_clubs if club["id"] not in favorite_club_ids][:4]

    suggested_friends = [
        result
        for result in search_users_for_friendship(user_id, "", limit=6)
        if result.get("status") in {"none", "incoming_request"}
    ][:4]

    activity_items: list[dict] = []
    for item in friend_event_feed[:4]:
        for friend in item["friends"][:2]:
            activity_items.append(
                _serialize_activity_item(
                    "event_join",
                    actor_name=friend["name"],
                    primary_text=f"{friend['name']} is going to {item['title']}",
                    time_value=item["startTime"],
                    payload={"id": item["eventId"], "eventId": item["eventId"], "clubName": item["clubName"]},
                )
            )

    for row in friend_follow_rows[:4]:
        activity_items.append(
            _serialize_activity_item(
                "club_follow",
                actor_name=row["user_name"],
                primary_text=f"{row['user_name']} followed {row['club_name']}",
                time_value=row["followed_at"],
                payload={"id": row["club_id"], "clubId": row["club_id"]},
            )
        )

    activity_feed = sorted(activity_items, key=lambda item: item["time"], reverse=True)[:6]

    notifications: list[dict] = []
    for event in for_you_events[:3]:
        notifications.append(
            {
                "id": f"notif:event:{event['id']}",
                "kind": "event_recommendation",
                "title": f"{event['title']} feels like a match",
                "subtitle": f"{event['attendanceCount']} going · {event['building']} · {event['room']}",
                "time": event["startTime"],
            }
        )

    for item in friend_event_feed[:3]:
        friend_names = ", ".join(friend["name"] for friend in item["friends"][:2])
        notifications.append(
            {
                "id": f"notif:friend:{item['eventId']}",
                "kind": "friend_activity",
                "title": f"{friend_names} picked {item['title']}",
                "subtitle": f"{item['friendCount']} friends going",
                "time": item["startTime"],
            }
        )

    notifications = sorted(notifications, key=lambda item: item["time"], reverse=True)[:6]

    return {
        "forYouEvents": for_you_events,
        "trendingEvents": trending_events,
        "recommendedClubs": recommended_clubs,
        "suggestedFriends": suggested_friends,
        "activityFeed": activity_feed,
        "notifications": notifications,
        "interests": interest_list,
    }


def get_club_detail_bundle(club_id: str, user_id: str | None = None) -> dict | None:
    club = get_club_by_id(club_id)
    if club is None:
        return None

    events = [event for event in get_all_events() if event["clubId"] == club_id]
    now = datetime.now().astimezone()
    upcoming_events = [event for event in events if _parse_iso(event["endTime"]) >= now]
    upcoming_events.sort(key=lambda event: _parse_iso(event["startTime"]))
    tags = get_club_tags(club_id)
    related_clubs = [candidate for candidate in get_all_clubs() if candidate["id"] != club_id and candidate["category"] == club["category"]][:3]

    friend_count = 0
    if user_id:
        friend_follow_rows = _get_friend_follow_rows([friend["id"] for friend in get_friends_for_user(user_id)])
        friend_count = sum(1 for row in friend_follow_rows if row["club_id"] == club_id)

    return {
        "club": club,
        "upcomingEvents": upcoming_events[:5],
        "tags": tags or [club["category"].lower()],
        "relatedClubs": related_clubs,
        "friendFollowerCount": friend_count,
    }
