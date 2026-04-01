from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class UploadValidationError(ValueError):
    pass


def get_upload_root() -> Path:
    return Path(__file__).resolve().parent / "uploads"


def ensure_upload_directories() -> None:
    root = get_upload_root()
    for folder in ("profiles", "clubs", "events"):
        (root / folder).mkdir(parents=True, exist_ok=True)


def _validate_upload(file: FileStorage) -> str:
    if not file or not file.filename:
        raise UploadValidationError("Choose an image to upload.")

    filename = secure_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise UploadValidationError("Only JPG, PNG, WEBP, or GIF images are allowed.")

    if file.mimetype not in ALLOWED_EXTENSIONS.values():
        raise UploadValidationError("That file type is not supported.")

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_IMAGE_BYTES:
        raise UploadValidationError("Images must be 5 MB or smaller.")

    return extension


def _safe_remove_existing(relative_url: str | None) -> None:
    if not relative_url or not relative_url.startswith("/uploads/"):
        return

    upload_root = get_upload_root().resolve()
    candidate = (Path(__file__).resolve().parent / relative_url.lstrip("/")).resolve()
    try:
        candidate.relative_to(upload_root)
    except ValueError:
        return

    if candidate.is_file():
        candidate.unlink(missing_ok=True)


def save_image_upload(file: FileStorage, *, folder: str, entity_id: str, existing_url: str | None = None) -> str:
    ensure_upload_directories()
    extension = _validate_upload(file)
    filename = f"{entity_id}-{uuid4().hex[:12]}{extension}"
    relative_path = Path("uploads") / folder / filename
    absolute_path = Path(__file__).resolve().parent / relative_path

    file.save(absolute_path)
    _safe_remove_existing(existing_url)
    return f"/{relative_path.as_posix()}"
