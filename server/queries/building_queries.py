from __future__ import annotations

from collections import defaultdict

try:
    from ..db import get_connection
except ImportError:
    from db import get_connection


def get_all_buildings() -> list[dict]:
    with get_connection() as connection:
        building_rows = connection.execute(
            "SELECT id, name FROM buildings ORDER BY name ASC;"
        ).fetchall()
        floor_rows = connection.execute(
            "SELECT building_id, floor FROM building_floors ORDER BY building_id ASC, floor ASC;"
        ).fetchall()

    floors_by_building: dict[str, list[int]] = defaultdict(list)
    for row in floor_rows:
        floors_by_building[row["building_id"]].append(row["floor"])

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "floors": floors_by_building.get(row["id"], []),
        }
        for row in building_rows
    ]
