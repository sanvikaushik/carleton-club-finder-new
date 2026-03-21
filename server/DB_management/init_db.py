from __future__ import annotations

from pathlib import Path

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        connection.commit()


if __name__ == "__main__":
    init_db()
    print("SQLite schema created successfully.")
