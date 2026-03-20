from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


def _now() -> datetime:
    # Use local timezone to keep "Now" filters consistent for the developer running the prototype.
    return datetime.now().astimezone().replace(microsecond=0)


def _week_start_monday(d: datetime) -> datetime:
    # Monday as week start; keep timezone.
    monday = d - timedelta(days=d.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def get_mock_data() -> dict[str, Any]:
    now = _now()
    base_hour = now.replace(minute=0, second=0, microsecond=0)

    buildings = [
        {
            "id": "nicol",
            "name": "Nicol Building",
            "mapPosition": {"x": 32, "y": 26},
            "floors": [1, 2, 3, 4],
        },
        {
            "id": "uc",
            "name": "University Centre (UC)",
            "mapPosition": {"x": 58, "y": 32},
            "floors": [0, 1, 2, 3],
        },
        {
            "id": "minto",
            "name": "Minto",
            "mapPosition": {"x": 45, "y": 52},
            "floors": [1, 2, 3],
        },
        {
            "id": "canal",
            "name": "Canal Building",
            "mapPosition": {"x": 70, "y": 58},
            "floors": [1, 2, 3],
        },
    ]

    # Mock clubs (>= 8).
    clubs = [
        {
            "id": "club-ai",
            "name": "AI Society",
            "category": "Technology",
            "description": "Hands-on ML workshops and student-led projects.",
            "favorite": True,
        },
        {
            "id": "club-debate",
            "name": "Debate Club",
            "category": "Community",
            "description": "Practice argumentation, public speaking, and critical thinking.",
            "favorite": False,
        },
        {
            "id": "club-photography",
            "name": "Photography Club",
            "category": "Arts",
            "description": "Learn composition, editing, and meet other creators.",
            "favorite": True,
        },
        {
            "id": "club-game-dev",
            "name": "Game Design Night",
            "category": "Technology",
            "description": "Design critiques, prototyping sessions, and mini game jams.",
            "favorite": False,
        },
        {
            "id": "club-robotics",
            "name": "Robotics Lab",
            "category": "Engineering",
            "description": "Build robots, run demos, and explore automation ideas.",
            "favorite": False,
        },
        {
            "id": "club-board-games",
            "name": "Board Games & Puzzles",
            "category": "Leisure",
            "description": "Casual strategy nights and puzzle challenges.",
            "favorite": False,
        },
        {
            "id": "club-data",
            "name": "Data Viz Collective",
            "category": "Technology",
            "description": "Create meaningful visualizations and share insights.",
            "favorite": True,
        },
        {
            "id": "club-writing",
            "name": "Creative Writing",
            "category": "Arts",
            "description": "Writing circles, peer feedback, and short story readings.",
            "favorite": False,
        },
    ]

    # Mock friends (>= 5).
    friends = [
        {"id": "f1", "name": "Amina", "avatarColor": "#2E86FF", "attendingEventIds": []},
        {"id": "f2", "name": "Ethan", "avatarColor": "#00B894", "attendingEventIds": []},
        {"id": "f3", "name": "Priya", "avatarColor": "#FD79A8", "attendingEventIds": []},
        {"id": "f4", "name": "Noah", "avatarColor": "#6C5CE7", "attendingEventIds": []},
        {"id": "f5", "name": "Maya", "avatarColor": "#FDCB6E", "attendingEventIds": []},
    ]
    friend_by_id = {f["id"]: f for f in friends}

    # Events: 12 total (3 per building).
    # Time strategy:
    # - One "past" event per building (yesterday-ish)
    # - One "current" event per building around the developer's current hour (Now pins)
    # - One "upcoming" event per building (some within next 2 hours; some later today)
    def mk_event(
        *,
        eid: str,
        title: str,
        club_id: str,
        building_id: str,
        floor: int,
        room: str,
        start: datetime,
        end: datetime,
        attendance: int,
        capacity: int,
        food_available: bool,
        food_type: str | None,
        description: str,
        tags: list[str],
        friends_going: list[str],
    ) -> dict[str, Any]:
        for fid in friends_going:
            friend_by_id[fid]["attendingEventIds"].append(eid)

        return {
            "id": eid,
            "title": title,
            "clubId": club_id,
            "building": building_id,
            "floor": floor,
            "room": room,
            "startTime": start.isoformat(),
            "endTime": end.isoformat(),
            "attendanceCount": attendance,
            "capacity": capacity,
            "foodAvailable": food_available,
            "foodType": food_type,
            "description": description,
            "tags": tags,
            "friendsGoing": friends_going,
        }

    current_start = base_hour - timedelta(minutes=45)
    current_end = base_hour + timedelta(minutes=45)

    # Upcoming: choose a mix so "Next 2 Hours" has content.
    upcoming_soon_start = base_hour + timedelta(hours=1, minutes=10)
    upcoming_soon_end = base_hour + timedelta(hours=2, minutes=5)
    upcoming_late_start = base_hour + timedelta(hours=5, minutes=15)
    upcoming_late_end = base_hour + timedelta(hours=6, minutes=30)

    past_start = base_hour - timedelta(days=1, hours=2)
    past_end = base_hour - timedelta(days=1, hours=1)

    events: list[dict[str, Any]] = [
        # Nicol
        mk_event(
            eid="e_nicol_past",
            title="Welcome to Nicol: Club Open House",
            club_id="club-writing",
            building_id="nicol",
            floor=2,
            room="Nicol-201",
            start=past_start,
            end=past_end,
            attendance=34,
            capacity=60,
            food_available=False,
            food_type=None,
            description="Meet club reps, ask questions, and learn how to get involved.",
            tags=["intro", "community"],
            friends_going=["f1", "f4"],
        ),
        mk_event(
            eid="e_nicol_now",
            title="AI Society Workshop: Intro to ML",
            club_id="club-ai",
            building_id="nicol",
            floor=3,
            room="Nicol-312",
            start=current_start,
            end=current_end,
            attendance=58,
            capacity=80,
            food_available=True,
            food_type="Pizza",
            description="A practical session on machine learning basics and quick demos.",
            tags=["machine-learning", "workshop"],
            friends_going=["f1", "f2", "f5"],
        ),
        mk_event(
            eid="e_nicol_upcoming",
            title="Data Viz Collective: Visual Storytelling",
            club_id="club-data",
            building_id="nicol",
            floor=1,
            room="Nicol-105",
            start=upcoming_soon_start,
            end=upcoming_soon_end,
            attendance=26,
            capacity=45,
            food_available=True,
            food_type="Coffee & Cookies",
            description="Learn how to turn data into compelling stories with examples and templates.",
            tags=["data-viz", "design"],
            friends_going=["f3"],
        ),
        # UC
        mk_event(
            eid="e_uc_past",
            title="Debate Club: Motion & Argument Sprint",
            club_id="club-debate",
            building_id="uc",
            floor=1,
            room="UC-110",
            start=past_start + timedelta(hours=3),
            end=past_end + timedelta(hours=3),
            attendance=29,
            capacity=40,
            food_available=False,
            food_type=None,
            description="Quick rounds to practice structure, rebuttals, and clarity.",
            tags=["debate", "practice"],
            friends_going=["f4"],
        ),
        mk_event(
            eid="e_uc_now",
            title="Robotics Lab: Mini Demo Night",
            club_id="club-robotics",
            building_id="uc",
            floor=0,
            room="UC-G09",
            start=current_start + timedelta(minutes=15),
            end=current_end + timedelta(minutes=15),
            attendance=44,
            capacity=70,
            food_available=True,
            food_type="Sushi Bites",
            description="See small robots in action and learn how teams collaborate.",
            tags=["robotics", "demos"],
            friends_going=["f2", "f5"],
        ),
        mk_event(
            eid="e_uc_upcoming",
            title="Creative Writing: Short Story Circle",
            club_id="club-writing",
            building_id="uc",
            floor=2,
            room="UC-217",
            start=upcoming_late_start,
            end=upcoming_late_end,
            attendance=22,
            capacity=35,
            food_available=False,
            food_type=None,
            description="Bring a paragraph to share and get peer feedback in a welcoming space.",
            tags=["writing", "community"],
            friends_going=["f1"],
        ),
        # Minto
        mk_event(
            eid="e_minto_past",
            title="Board Games: Strategy & Social Night",
            club_id="club-board-games",
            building_id="minto",
            floor=2,
            room="Minto-244",
            start=past_start + timedelta(hours=1),
            end=past_end + timedelta(hours=1),
            attendance=38,
            capacity=50,
            food_available=True,
            food_type="Snacks",
            description="Casual games, light snacks, and new people welcome.",
            tags=["games", "social"],
            friends_going=["f3", "f5"],
        ),
        mk_event(
            eid="e_minto_now",
            title="Game Design Night: Prototyping Lounge",
            club_id="club-game-dev",
            building_id="minto",
            floor=3,
            room="Minto-330",
            start=current_start,
            end=current_end,
            attendance=51,
            capacity=90,
            food_available=True,
            food_type="Poutine Vibes (mock)",
            description="Bring an idea and get feedback; pair up for rapid prototype challenges.",
            tags=["game-dev", "design"],
            friends_going=["f2", "f4"],
        ),
        mk_event(
            eid="e_minto_upcoming",
            title="Photography Club: Golden Hour Walk",
            club_id="club-photography",
            building_id="minto",
            floor=1,
            room="Minto-118",
            start=upcoming_soon_start + timedelta(minutes=25),
            end=upcoming_soon_end + timedelta(minutes=25),
            attendance=18,
            capacity=30,
            food_available=False,
            food_type=None,
            description="A campus walk focused on composition. Cameras encouraged.",
            tags=["photography", "walk"],
            friends_going=["f1", "f3"],
        ),
        # Canal
        mk_event(
            eid="e_canal_past",
            title="Data Viz Clinic: Charts that Convert",
            club_id="club-data",
            building_id="canal",
            floor=2,
            room="Canal-210",
            start=past_start + timedelta(hours=4),
            end=past_end + timedelta(hours=4),
            attendance=24,
            capacity=40,
            food_available=False,
            food_type=None,
            description="Office hours on chart selection, labeling, and narrative flow.",
            tags=["clinic", "data-viz"],
            friends_going=["f5"],
        ),
        mk_event(
            eid="e_canal_now",
            title="AI Society: Ethics & Responsible Models",
            club_id="club-ai",
            building_id="canal",
            floor=1,
            room="Canal-145",
            start=current_start + timedelta(minutes=30),
            end=current_end + timedelta(minutes=30),
            attendance=61,
            capacity=85,
            food_available=True,
            food_type="Trail Mix",
            description="Discussion and case studies on fairness, transparency, and policy.",
            tags=["ai-ethics", "discussion"],
            friends_going=["f3", "f4"],
        ),
        mk_event(
            eid="e_canal_upcoming",
            title="Debate Club: Public Speaking Lab",
            club_id="club-debate",
            building_id="canal",
            floor=3,
            room="Canal-305",
            start=upcoming_late_start + timedelta(minutes=10),
            end=upcoming_late_end + timedelta(minutes=10),
            attendance=27,
            capacity=50,
            food_available=False,
            food_type=None,
            description="Practice speeches with timed rounds and supportive coaching.",
            tags=["public-speaking", "lab"],
            friends_going=["f2", "f5"],
        ),
    ]

    # Clean up friend attending arrays (ensure unique + stable order).
    for f in friends:
        f["attendingEventIds"] = list(dict.fromkeys(f["attendingEventIds"]))

    # User seeded from favorites + attending state.
    favorite_club_ids = ["club-ai", "club-photography", "club-data"]
    attending_event_ids = ["e_nicol_now", "e_minto_now"]
    user = {
        "id": "u1",
        "name": "Sanvika",
        "program": "Computer Science (BSc)",
        "favoriteClubIds": favorite_club_ids,
        "attendingEventIds": attending_event_ids,
    }

    # Weekly schedule with overlaps for some events.
    # We'll build classes around the same "base" week so the frontend overlap check can be direct.
    week_start = _week_start_monday(now)

    def day_offset(d: datetime) -> int:
        return (d.date() - week_start.date()).days

    # Map event start to its weekday in this week.
    def iso_on_week(d: datetime, base_time: datetime) -> datetime:
        # Use the base_time's clock on the date matching d's weekday within the current week.
        target_date = week_start.date() + timedelta(days=day_offset(d))
        return datetime(
            target_date.year,
            target_date.month,
            target_date.day,
            base_time.hour,
            base_time.minute,
            tzinfo=base_time.tzinfo,
        )

    # Pick a subset of event times to force conflicts on "Now" events.
    # Schedule is meant to be hardcoded, but generated from the same now anchor so it remains interactive.
    today = now
    today_event_dates = sorted([datetime.fromisoformat(e["startTime"]) for e in events], key=lambda x: x)

    # Create a few classes on the same weekday as some events.
    class_blocks: list[dict[str, Any]] = []
    # Class that overlaps with "e_nicol_now" (within the current window).
    nicol_now = datetime.fromisoformat(next(e for e in events if e["id"] == "e_nicol_now")["startTime"])
    nicol_now_end = datetime.fromisoformat(next(e for e in events if e["id"] == "e_nicol_now")["endTime"])
    class_blocks.append(
        {
            "id": "c1",
            "title": "CS 241: Algorithms",
            "dayOfWeek": nicol_now.strftime("%a"),
            "startTime": (nicol_now - timedelta(minutes=15)).time().strftime("%H:%M"),
            "endTime": (nicol_now_end - timedelta(minutes=15)).time().strftime("%H:%M"),
            "startDateTime": (nicol_now - timedelta(minutes=15)).isoformat(),
            "endDateTime": (nicol_now_end - timedelta(minutes=15)).isoformat(),
            "location": "Dunton 301",
        }
    )
    # Class that conflicts with "e_uc_now" (also around now but shifted).
    uc_now = datetime.fromisoformat(next(e for e in events if e["id"] == "e_uc_now")["startTime"])
    class_blocks.append(
        {
            "id": "c2",
            "title": "MATH 223: Linear Algebra",
            "dayOfWeek": uc_now.strftime("%a"),
            "startTime": (uc_now - timedelta(minutes=5)).time().strftime("%H:%M"),
            "endTime": (uc_now + timedelta(minutes=35)).time().strftime("%H:%M"),
            "startDateTime": (uc_now - timedelta(minutes=5)).isoformat(),
            "endDateTime": (uc_now + timedelta(minutes=35)).isoformat(),
            "location": "Richards 210",
        }
    )
    # Non-conflicting class later today.
    class_blocks.append(
        {
            "id": "c3",
            "title": "STAT 310: Data Modeling",
            "dayOfWeek": today.strftime("%a"),
            "startTime": (today.replace(hour=16, minute=0) + timedelta(minutes=0)).time().strftime("%H:%M"),
            "endTime": (today.replace(hour=17, minute=15) + timedelta(minutes=0)).time().strftime("%H:%M"),
            "startDateTime": today.replace(hour=16, minute=0, second=0, microsecond=0).isoformat(),
            "endDateTime": today.replace(hour=17, minute=15, second=0, microsecond=0).isoformat(),
            "location": "DT 201",
        }
    )

    # Add some other week items to make the schedule page feel full.
    # Use fixed offsets (still based on now's week so it aligns with event "today").
    for i, dow in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri"]):
        day_date = week_start.date() + timedelta(days=i)
        start = datetime(day_date.year, day_date.month, day_date.day, 10 + (i % 2), 0, tzinfo=now.tzinfo)
        end = start + timedelta(minutes=90)
        class_blocks.append(
            {
                "id": f"c_week_{i}",
                "title": f"GENED {200+i}: Seminar {i+1}",
                "dayOfWeek": dow,
                "startTime": start.time().strftime("%H:%M"),
                "endTime": end.time().strftime("%H:%M"),
                "startDateTime": start.isoformat(),
                "endDateTime": end.isoformat(),
                "location": "Forum Hall",
            }
        )

    schedule = {
        "weekStart": week_start.date().isoformat(),
        "classes": class_blocks,
    }

    return {
        "buildings": buildings,
        "clubs": clubs,
        "friends": friends,
        "events": events,
        "user": user,
        "schedule": schedule,
    }


_DATA = get_mock_data()


def get_buildings() -> list[dict[str, Any]]:
    return _DATA["buildings"]


def get_events() -> list[dict[str, Any]]:
    return _DATA["events"]


def get_event(event_id: str) -> dict[str, Any] | None:
    for e in _DATA["events"]:
        if e["id"] == event_id:
            return e
    return None


def get_clubs() -> list[dict[str, Any]]:
    return _DATA["clubs"]


def get_friends() -> list[dict[str, Any]]:
    return _DATA["friends"]


def get_user() -> dict[str, Any]:
    return _DATA["user"]


def get_schedule() -> dict[str, Any]:
    return _DATA["schedule"]

