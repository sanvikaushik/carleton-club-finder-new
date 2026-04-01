from __future__ import annotations


def test_search_returns_grouped_results_and_handles_empty_query(client, db):
    club = db.create_club(club_id="club-alpha", name="Alpha Robotics", category="Technology", description="Robotics builders club.")
    db.create_user(name="Alpha Student", email="alpha@cmail.carleton.ca", is_friend_profile=1)
    db.create_event(
        event_id="event-alpha",
        title="Alpha Demo Night",
        club_id=club["id"],
        created_by_user_id="u1",
        building_id="nicol",
        tags=["robotics", "demo"],
    )

    empty = client.get("/api/search", query_string={"q": ""})
    populated = client.get("/api/search", query_string={"q": "alpha"})
    building_match = client.get("/api/search", query_string={"q": "nicol"})

    assert empty.status_code == 200
    assert empty.get_json() == {"clubs": [], "events": [], "users": [], "buildings": []}
    payload = populated.get_json()
    assert payload["clubs"][0]["name"] == "Alpha Robotics"
    assert payload["events"][0]["title"] == "Alpha Demo Night"
    assert payload["users"][0]["name"] == "Alpha Student"
    assert building_match.get_json()["buildings"][0]["id"] == "nicol"


def test_interests_and_onboarding_flow_updates_user_state(client):
    signup = client.post(
        "/api/auth/signup",
        json={
            "fullName": "Onboard Me",
            "email": "onboard@cmail.carleton.ca",
            "password": "CampusPass123",
            "confirmPassword": "CampusPass123",
            "program": "CS",
            "year": "2nd Year",
        },
    )
    assert signup.status_code == 201

    interests = client.get("/api/interests")
    save_interests = client.post("/api/users/me/interests", json={"interests": ["Tech", "Music"]})
    complete = client.post(
        "/api/users/me/onboarding",
        json={"interests": ["Tech", "Music"], "starterClubIds": [], "starterFriendIds": []},
    )
    me = client.get("/api/auth/me")
    discover = client.get("/api/discover")

    assert "Tech" in interests.get_json()["interests"]
    assert save_interests.get_json()["interests"] == ["Tech", "Music"]
    assert complete.status_code == 200
    assert me.get_json()["user"]["onboardingCompleted"] is True
    discover_payload = discover.get_json()
    assert "forYouEvents" in discover_payload
    assert "selectedInterests" in discover_payload
    assert set(discover_payload["selectedInterests"]) == {"Tech", "Music"}
