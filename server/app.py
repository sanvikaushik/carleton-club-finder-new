from __future__ import annotations

from flask import Flask
from flask_cors import CORS

try:
    from .routes import api_bp
except ImportError:
    from routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(JSON_SORT_KEYS=False)

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
