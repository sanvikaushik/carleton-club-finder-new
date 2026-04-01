from __future__ import annotations


def test_privacy_settings_round_trip(client, db, login):
    user = db.create_user(name="Private Student", email="private@cmail.carleton.ca")
    login(client, user["email"])

    initial = client.get("/api/users/me/privacy-settings")
    update = client.put(
        "/api/users/me/privacy-settings",
        json={
            "profileVisibility": "friends",
            "clubsVisibility": "private",
            "attendanceVisibility": "private",
            "activityVisibility": "friends",
            "allowFriendRequestsFrom": "mutuals_only",
            "allowMessagesFrom": "nobody",
            "allowEventInvitesFrom": "nobody",
            "showInSearch": False,
        },
    )
    current = client.get("/api/users/me/privacy-settings")

    assert initial.status_code == 200
    assert initial.get_json()["settings"]["profileVisibility"] == "public"
    assert update.status_code == 200
    assert update.get_json()["settings"]["allowMessagesFrom"] == "nobody"
    assert current.get_json()["settings"]["showInSearch"] is False


def test_search_and_friend_requests_respect_privacy(client, db, login):
    requester = db.create_user(name="Requester", email="requester@cmail.carleton.ca")
    hidden = db.create_user(name="Hidden Student", email="hidden@cmail.carleton.ca", is_friend_profile=1)
    blocked = db.create_user(name="Blocked Student", email="blocked@cmail.carleton.ca", is_friend_profile=1)

    login(client, hidden["email"])
    client.put(
        "/api/users/me/privacy-settings",
        json={
            "profileVisibility": "public",
            "clubsVisibility": "public",
            "attendanceVisibility": "public",
            "activityVisibility": "public",
            "allowFriendRequestsFrom": "everyone",
            "allowMessagesFrom": "friends",
            "allowEventInvitesFrom": "friends",
            "showInSearch": False,
        },
    )

    login(client, blocked["email"])
    client.put(
        "/api/users/me/privacy-settings",
        json={
            "profileVisibility": "public",
            "clubsVisibility": "public",
            "attendanceVisibility": "public",
            "activityVisibility": "public",
            "allowFriendRequestsFrom": "nobody",
            "allowMessagesFrom": "friends",
            "allowEventInvitesFrom": "friends",
            "showInSearch": True,
        },
    )

    login(client, requester["email"])
    hidden_search = client.get("/api/users/search", query_string={"q": "Hidden"})
    blocked_search = client.get("/api/users/search", query_string={"q": "Blocked"})
    blocked_request = client.post("/api/friends/request", json={"receiverUserId": blocked["id"]})

    hidden_ids = {item["id"] for item in hidden_search.get_json()}
    blocked_results = blocked_search.get_json()

    assert hidden["id"] not in hidden_ids
    assert blocked_search.status_code == 200
    assert blocked_results[0]["canReceiveFriendRequests"] is False
    assert blocked_request.status_code == 403


def test_attendance_and_activity_privacy_filters_social_views(client, db, login):
    viewer = db.create_user(name="Viewer", email="viewer@cmail.carleton.ca")
    friend = db.create_user(name="Quiet Friend", email="quiet@cmail.carleton.ca")
    club = db.create_club(name="Quiet Club")
    event = db.create_event(club_id=club["id"], title="Quiet Event")
    db.add_friendship(user_id=viewer["id"], friend_id=friend["id"])
    db.add_attendance(user_id=friend["id"], event_id=event["id"])

    login(client, friend["email"])
    client.put(
        "/api/users/me/privacy-settings",
        json={
            "profileVisibility": "public",
            "clubsVisibility": "public",
            "attendanceVisibility": "private",
            "activityVisibility": "private",
            "allowFriendRequestsFrom": "everyone",
            "allowMessagesFrom": "friends",
            "allowEventInvitesFrom": "friends",
            "showInSearch": True,
        },
    )

    login(client, viewer["email"])
    friends_going = client.get(f"/api/events/{event['id']}/friends-going")
    friends_events = client.get("/api/users/me/friends-events")
    friends_list = client.get("/api/friends")

    assert friends_going.status_code == 200
    assert friends_going.get_json()["count"] == 0
    assert friends_events.get_json() == []
    assert friends_list.get_json()[0]["attendingEventIds"] == []


def test_message_and_event_invite_privacy_blocks_actions(client, db, login):
    sender = db.create_user(name="Sender", email="sender2@cmail.carleton.ca")
    recipient = db.create_user(name="Recipient", email="recipient2@cmail.carleton.ca")
    club = db.create_club(name="Invite Club")
    event = db.create_event(club_id=club["id"], title="Invite Event")
    db.add_friendship(user_id=sender["id"], friend_id=recipient["id"])

    login(client, recipient["email"])
    client.put(
        "/api/users/me/privacy-settings",
        json={
            "profileVisibility": "public",
            "clubsVisibility": "public",
            "attendanceVisibility": "public",
            "activityVisibility": "public",
            "allowFriendRequestsFrom": "everyone",
            "allowMessagesFrom": "nobody",
            "allowEventInvitesFrom": "nobody",
            "showInSearch": True,
        },
    )

    login(client, sender["email"])
    conversation = client.post("/api/conversations", json={"friendUserId": recipient["id"]})
    invite = client.post(f"/api/events/{event['id']}/invites", json={"recipientUserId": recipient["id"], "message": "Come through"})

    assert conversation.status_code == 403
    assert invite.status_code == 403
