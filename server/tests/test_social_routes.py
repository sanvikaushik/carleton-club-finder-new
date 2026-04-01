from __future__ import annotations


def test_follow_and_unfollow_club_flow(client, db, login):
    user = db.create_user(name="Follower", email="follower@cmail.carleton.ca")
    club = db.create_club(name="Follow Club")

    login(client, user["email"])

    first_follow = client.post(f"/api/clubs/{club['id']}/follow")
    second_follow = client.post(f"/api/clubs/{club['id']}/follow")
    followed = client.get("/api/users/me/followed-clubs")
    unfollow = client.delete(f"/api/clubs/{club['id']}/follow")

    assert first_follow.status_code == 200
    assert second_follow.status_code == 200
    assert len(followed.get_json()) == 1
    assert followed.get_json()[0]["id"] == club["id"]
    assert unfollow.status_code == 200
    assert client.get("/api/users/me/followed-clubs").get_json() == []


def test_search_users_and_friend_request_guards(client, db, login):
    requester = db.create_user(name="Requester", email="requester@cmail.carleton.ca")
    target = db.create_user(name="Alex Moreau", email="alex@cmail.carleton.ca", is_friend_profile=1)

    login(client, requester["email"])

    search = client.get("/api/users/search", query_string={"q": "alex"})
    send = client.post("/api/friends/request", json={"receiverUserId": target["id"]})
    duplicate = client.post("/api/friends/request", json={"receiverUserId": target["id"]})
    self_request = client.post("/api/friends/request", json={"receiverUserId": requester["id"]})

    assert search.status_code == 200
    assert any(item["id"] == target["id"] for item in search.get_json())
    assert send.status_code == 201
    assert duplicate.status_code == 409
    assert self_request.status_code == 409


def test_accept_and_decline_friend_requests(client, db, login):
    sender = db.create_user(name="Sender", email="sender@cmail.carleton.ca")
    receiver = db.create_user(name="Receiver", email="receiver@cmail.carleton.ca")
    other_sender = db.create_user(name="Other Sender", email="other@cmail.carleton.ca")

    login(client, sender["email"])
    request_response = client.post("/api/friends/request", json={"receiverUserId": receiver["id"]})
    request_id = request_response.get_json()["id"]

    login(client, other_sender["email"])
    decline_response = client.post("/api/friends/request", json={"receiverUserId": receiver["id"]})
    decline_request_id = decline_response.get_json()["id"]

    login(client, receiver["email"])
    accept = client.post(f"/api/friends/request/{request_id}/accept")
    decline = client.post(f"/api/friends/request/{decline_request_id}/decline")
    friends = client.get("/api/friends")

    assert accept.status_code == 200
    assert decline.status_code == 200
    friend_ids = {item["id"] for item in friends.get_json()}
    assert sender["id"] in friend_ids
    assert other_sender["id"] not in friend_ids
