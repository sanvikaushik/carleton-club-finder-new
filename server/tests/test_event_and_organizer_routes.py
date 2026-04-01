from __future__ import annotations

from io import BytesIO


def test_event_attendance_toggles_and_updates_count(client, db, login):
    user = db.create_user(name="Attendee", email="attendee@cmail.carleton.ca")
    owner = db.create_user(name="Owner", email="eventowner@cmail.carleton.ca")
    club = db.create_club(name="Attendance Club", owner_user_id=owner["id"])
    event = db.create_event(club_id=club["id"], created_by_user_id=owner["id"])

    login(client, user["email"])

    join = client.put(f"/api/events/{event['id']}/attendance", json={"attending": True})
    leave = client.put(f"/api/events/{event['id']}/attendance", json={"attending": False})

    assert join.status_code == 200
    assert join.get_json()["attendanceCount"] == 1
    assert leave.status_code == 200
    assert leave.get_json()["attendanceCount"] == 0


def test_owner_can_create_update_and_cancel_event(client, db, login):
    owner = db.create_user(name="Organizer", email="organizer@cmail.carleton.ca")
    follower = db.create_user(name="Follower", email="follower@cmail.carleton.ca")
    club = db.create_club(name="Organizer Club", owner_user_id=owner["id"])
    db.follow_club(user_id=follower["id"], club_id=club["id"])

    login(client, owner["email"])

    create = client.post(
        f"/api/clubs/{club['id']}/events",
        json={
            "title": "Organizer Night",
            "description": "Organizer-only event create test.",
            "building": "nicol",
            "floor": 4,
            "room": "4020",
            "startTime": "2026-04-15T18:00",
            "endTime": "2026-04-15T20:00",
            "capacity": 50,
            "foodAvailable": True,
            "foodType": "Pizza",
            "tags": ["Tech", "Social"],
            "imageUrl": "",
        },
    )
    assert create.status_code == 201
    event_id = create.get_json()["id"]

    login(client, follower["email"])
    notifications = client.get("/api/notifications")
    assert any(item["type"] == "club_event" for item in notifications.get_json())

    login(client, owner["email"])
    update = client.put(
        f"/api/events/{event_id}",
        json={
            "title": "Organizer Night Updated",
            "description": "Updated event.",
            "building": "nicol",
            "floor": 4,
            "room": "4020",
            "startTime": "2026-04-15T19:00",
            "endTime": "2026-04-15T21:00",
            "capacity": 60,
            "foodAvailable": False,
            "foodType": "",
            "tags": ["Updated"],
            "imageUrl": "",
        },
    )
    cancel = client.delete(f"/api/events/{event_id}")
    active_events = client.get("/api/events").get_json()
    cancelled_detail = client.get(f"/api/events/{event_id}").get_json()

    assert update.status_code == 200
    assert update.get_json()["title"] == "Organizer Night Updated"
    assert cancel.status_code == 200
    assert cancel.get_json()["status"] == "cancelled"
    assert all(event["id"] != event_id for event in active_events)
    assert cancelled_detail["isCancelled"] is True


def test_admin_can_manage_events_but_unauthorized_user_gets_403(client, db, login):
    owner = db.create_user(name="Owner", email="owner@cmail.carleton.ca")
    admin = db.create_user(name="Admin", email="admin@cmail.carleton.ca")
    stranger = db.create_user(name="Stranger", email="stranger@cmail.carleton.ca")
    club = db.create_club(name="Permissions Club", owner_user_id=owner["id"])
    db.create_membership(user_id=admin["id"], club_id=club["id"], role="admin")

    login(client, admin["email"])
    create = client.post(
        f"/api/clubs/{club['id']}/events",
        json={
            "title": "Admin Managed Event",
            "description": "Admin can create this event.",
            "building": "uc",
            "floor": 1,
            "room": "Atrium",
            "startTime": "2026-04-18T17:00",
            "endTime": "2026-04-18T18:30",
            "capacity": 30,
            "foodAvailable": False,
            "foodType": "",
            "tags": ["Admin"],
            "imageUrl": "",
        },
    )
    assert create.status_code == 201
    event_id = create.get_json()["id"]

    login(client, stranger["email"])
    forbidden = client.put(
        f"/api/events/{event_id}",
        json={
            "title": "Should Fail",
            "description": "Unauthorized update.",
            "building": "uc",
            "floor": 1,
            "room": "Atrium",
            "startTime": "2026-04-18T17:00",
            "endTime": "2026-04-18T18:30",
            "capacity": 30,
            "foodAvailable": False,
            "foodType": "",
            "tags": ["Nope"],
            "imageUrl": "",
        },
    )

    assert forbidden.status_code == 403


def test_owner_can_upload_club_and_event_images(client, db, login):
    owner = db.create_user(name="Image Owner", email="image-owner@cmail.carleton.ca")
    club = db.create_club(name="Media Club", owner_user_id=owner["id"])
    event = db.create_event(club_id=club["id"], created_by_user_id=owner["id"])

    login(client, owner["email"])

    club_upload = client.post(
        f"/api/clubs/{club['id']}/image",
        data={"image": (BytesIO(b"\x89PNG\r\n\x1a\nclub-image"), "club.png")},
        content_type="multipart/form-data",
    )
    event_upload = client.post(
        f"/api/events/{event['id']}/image",
        data={"image": (BytesIO(b"\x89PNG\r\n\x1a\nevent-image"), "event.png")},
        content_type="multipart/form-data",
    )

    assert club_upload.status_code == 200
    assert club_upload.get_json()["imageUrl"].startswith("/uploads/clubs/")
    assert event_upload.status_code == 200
    assert event_upload.get_json()["imageUrl"].startswith("/uploads/events/")


def test_unauthorized_user_cannot_upload_club_or_event_images(client, db, login):
    owner = db.create_user(name="Upload Owner", email="upload-owner@cmail.carleton.ca")
    stranger = db.create_user(name="Upload Stranger", email="upload-stranger@cmail.carleton.ca")
    club = db.create_club(name="Locked Media Club", owner_user_id=owner["id"])
    event = db.create_event(club_id=club["id"], created_by_user_id=owner["id"])

    login(client, stranger["email"])

    club_upload = client.post(
        f"/api/clubs/{club['id']}/image",
        data={"image": (BytesIO(b"\x89PNG\r\n\x1a\nclub-image"), "club.png")},
        content_type="multipart/form-data",
    )
    event_upload = client.post(
        f"/api/events/{event['id']}/image",
        data={"image": (BytesIO(b"\x89PNG\r\n\x1a\nevent-image"), "event.png")},
        content_type="multipart/form-data",
    )

    assert club_upload.status_code == 403
    assert event_upload.status_code == 403
