from __future__ import annotations


def test_notifications_are_scoped_and_unread_counts_work(client, db, login):
    user = db.create_user(name="Notify Me", email="notify@cmail.carleton.ca")
    other = db.create_user(name="Other User", email="othernotify@cmail.carleton.ca")
    mine = db.create_notification(user_id=user["id"], title="Mine", message="Visible to me")
    db.create_notification(user_id=other["id"], title="Theirs", message="Hidden from me")

    login(client, user["email"])

    notifications = client.get("/api/notifications")
    unread = client.get("/api/notifications/unread-count")
    mark_read = client.post(f"/api/notifications/{mine['id']}/read")
    read_all = client.post("/api/notifications/read-all")

    assert notifications.status_code == 200
    assert [item["title"] for item in notifications.get_json()] == ["Mine"]
    assert unread.get_json()["count"] == 1
    assert mark_read.get_json()["notification"]["isRead"] is True
    assert read_all.get_json()["unreadCount"] == 0


def test_dismiss_and_cross_user_notification_access_is_blocked(client, db, login):
    owner = db.create_user(name="Owner", email="ownernotify@cmail.carleton.ca")
    other = db.create_user(name="Other", email="othernotify2@cmail.carleton.ca")
    owner_note = db.create_notification(user_id=owner["id"], title="Dismiss Me")
    other_note = db.create_notification(user_id=other["id"], title="Do Not Touch")

    login(client, owner["email"])

    dismiss = client.post(f"/api/notifications/{owner_note['id']}/dismiss")
    forbidden = client.post(f"/api/notifications/{other_note['id']}/read")

    assert dismiss.status_code == 200
    assert client.get("/api/notifications").get_json() == []
    assert forbidden.status_code == 404
