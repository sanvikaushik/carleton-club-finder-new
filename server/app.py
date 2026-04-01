from __future__ import annotations

import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

try:
    from .DB_management.migrate_db import apply_migrations
    from .routes import api_bp
    from .uploads import MAX_IMAGE_BYTES, ensure_upload_directories, get_upload_root
except ImportError:
    from DB_management.migrate_db import apply_migrations
    from routes import api_bp
    from uploads import MAX_IMAGE_BYTES, ensure_upload_directories, get_upload_root


def create_app() -> Flask:
    apply_migrations()
    ensure_upload_directories()

    app = Flask(__name__)
    app.config.update(
        JSON_SORT_KEYS=False,
        SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        MAX_CONTENT_LENGTH=MAX_IMAGE_BYTES,
        UPLOAD_FOLDER=str(get_upload_root()),
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    )

    app.register_blueprint(api_bp)

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_upload(_error):
        return jsonify({"error": "Image too large", "details": "Images must be 5 MB or smaller."}), 413

    @app.route("/uploads/<path:filename>", methods=["GET"])
    def serve_upload(filename: str):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/health", methods=["GET"])
    def health() -> tuple[str, int]:
        return "ok", 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
