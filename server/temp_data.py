from __future__ import annotations

from copy import deepcopy
from typing import Any

try:
    from .mock_data import get_mock_data
except ImportError:
    from mock_data import get_mock_data


def get_temp_seed_data() -> dict[str, Any]:
    """Temporary sample dataset used to seed the SQLite database.

    The live API should read from the SQLite query layer only. This module exists
    solely to provide beginner-friendly seed content while the app is still in
    prototype mode.
    """

    return deepcopy(get_mock_data())
