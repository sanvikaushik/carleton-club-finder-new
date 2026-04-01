from __future__ import annotations


def test_signup_success_sets_session(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "fullName": "Signup User",
            "email": "signup@cmail.carleton.ca",
            "password": "CampusPass123",
            "confirmPassword": "CampusPass123",
            "program": "Computer Science",
            "year": "2nd Year",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["email"] == "signup@cmail.carleton.ca"
    assert payload["onboardingCompleted"] is False

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["user"]["email"] == "signup@cmail.carleton.ca"


def test_signup_duplicate_email_fails(client, db):
    db.create_user(name="Existing", email="existing@cmail.carleton.ca")

    response = client.post(
        "/api/auth/signup",
        json={
            "fullName": "Existing Two",
            "email": "existing@cmail.carleton.ca",
            "password": "CampusPass123",
            "confirmPassword": "CampusPass123",
            "program": "Business",
            "year": "1st Year",
        },
    )

    assert response.status_code == 409
    assert response.get_json()["fieldErrors"]["email"]


def test_login_success_and_logout(client, db, login):
    db.create_user(name="Login User", email="login@cmail.carleton.ca", onboarding_completed=1)

    response = login(client, "login@cmail.carleton.ca")
    assert response.status_code == 200
    assert response.get_json()["email"] == "login@cmail.carleton.ca"

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["user"]["email"] == "login@cmail.carleton.ca"

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.get_json()["ok"] is True
    assert client.get("/api/auth/me").get_json()["user"] is None


def test_login_invalid_password_fails(client, db, login):
    db.create_user(name="Wrong Password", email="wrong@cmail.carleton.ca")

    response = login(client, "wrong@cmail.carleton.ca", password="NotThePassword")

    assert response.status_code == 401
    assert response.get_json()["error"] == "Invalid email or password"
