from __future__ import annotations

import os

from flask import Flask
from flask_cors import CORS

try:
    from .DB_management.migrate_db import apply_migrations
    from .routes import api_bp
except ImportError:
    from DB_management.migrate_db import apply_migrations
    from routes import api_bp


def create_app() -> Flask:
    apply_migrations()

    app = Flask(__name__)
    app.config.update(
        JSON_SORT_KEYS=False,
        SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    )

    app.register_blueprint(api_bp)

    @app.route("/health", methods=["GET"])
    def health() -> tuple[str, int]:
        return "ok", 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
