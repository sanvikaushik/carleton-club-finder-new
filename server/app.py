from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS

try:
    # Works when running via `python -m server.app` from repo root.
    from . import mock_data
except ImportError:
    # Works when running via `cd server && python app.py`.
    import mock_data


def create_app() -> Flask:
    app = Flask(__name__)

    # Allow local dev for Vite and common ports.
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    )

    @app.route("/health", methods=["GET"])
    def health() -> tuple[str, int]:
        return "ok", 200

    @app.route("/api/events", methods=["GET"])
    def get_events():
        return jsonify(mock_data.get_events())

    @app.route("/api/events/<event_id>", methods=["GET"])
    def get_event(event_id: str):
        ev = mock_data.get_event(event_id)
        if not ev:
            return jsonify({"error": "Event not found"}), 404
        return jsonify(ev)

    @app.route("/api/clubs", methods=["GET"])
    def get_clubs():
        return jsonify(mock_data.get_clubs())

    @app.route("/api/friends", methods=["GET"])
    def get_friends():
        return jsonify(mock_data.get_friends())

    @app.route("/api/schedule", methods=["GET"])
    def get_schedule():
        return jsonify(mock_data.get_schedule())

    @app.route("/api/user", methods=["GET"])
    def get_user():
        return jsonify(mock_data.get_user())

    @app.route("/api/buildings", methods=["GET"])
    def get_buildings():
        return jsonify(mock_data.get_buildings())

    return app


app = create_app()


if __name__ == "__main__":
    # Run with:
    #   cd server
    #   pip install -r requirements.txt
    #   python app.py
    app.run(host="0.0.0.0", port=5000, debug=True)

