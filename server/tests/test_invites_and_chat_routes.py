from __future__ import annotations


def test_event_invite_flow_marks_attendance_and_creates_notifications(client, db, login):
    sender = db.create_user(name="Plan Sender", email="plansender@cmail.carleton.ca")
    recipient = db.create_user(name="Plan Recipient", email="planrecipient@cmail.carleton.ca")
    owner = db.create_user(name="Club Owner", email="ownerinvite@cmail.carleton.ca")
    club = db.create_club(name="Invite Club", owner_user_id=owner["id"])
    event = db.create_event(club_id=club["id"], created_by_user_id=owner["id"])
    db.add_friendship(user_id=sender["id"], friend_id=recipient["id"])

    login(client, sender["email"])
    create = client.post(
        f"/api/events/{event['id']}/invites",
        json={"recipientUserId": recipient["id"], "message": "Meet me outside Nicol first."},
    )
    summary = client.get(f"/api/events/{event['id']}/invites")

    assert create.status_code == 201
    assert summary.status_code == 200
    assert len(summary.get_json()["outgoing"]) == 1

    login(client, recipient["email"])
    inbox = client.get("/api/users/me/event-invites")
    accept = client.post(f"/api/event-invites/{create.get_json()['invite']['id']}/accept")
    notifications = client.get("/api/notifications")

    assert inbox.status_code == 200
    assert len(inbox.get_json()["incoming"]) == 1
    assert accept.status_code == 200
    assert event["id"] in accept.get_json()["attendingEventIds"]
    assert any(item["type"] == "event_invite" for item in notifications.get_json())

    login(client, sender["email"])
    sender_notifications = client.get("/api/notifications")
    event_summary = client.get(f"/api/events/{event['id']}/invites")

    assert any(item["type"] == "invite_accepted" for item in sender_notifications.get_json())
    assert len(event_summary.get_json()["accepted"]) == 1


def test_direct_message_flow_requires_friends_and_tracks_unread_counts(client, db, login):
    sender = db.create_user(name="Message Sender", email="messagesender@cmail.carleton.ca")
    recipient = db.create_user(name="Message Recipient", email="messagerecipient@cmail.carleton.ca")
    stranger = db.create_user(name="Message Stranger", email="strangerchat@cmail.carleton.ca")
    db.add_friendship(user_id=sender["id"], friend_id=recipient["id"])

    login(client, sender["email"])
    forbidden = client.post("/api/conversations", json={"friendUserId": stranger["id"]})
    create = client.post("/api/conversations", json={"friendUserId": recipient["id"]})
    conversation_id = create.get_json()["id"]
    send = client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"body": "Still on for the event tonight?"},
    )

    assert forbidden.status_code == 403
    assert create.status_code == 201
    assert send.status_code == 201

    login(client, recipient["email"])
    conversations = client.get("/api/conversations")
    messages = client.get(f"/api/conversations/{conversation_id}/messages")
    mark_read = client.post(f"/api/conversations/{conversation_id}/read")
    recipient_notifications = client.get("/api/notifications")

    assert conversations.status_code == 200
    assert conversations.get_json()[0]["unreadCount"] == 1
    assert messages.status_code == 200
    assert messages.get_json()[0]["body"] == "Still on for the event tonight?"
    assert mark_read.status_code == 200
    assert any(item["type"] == "direct_message" for item in recipient_notifications.get_json())
