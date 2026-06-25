import logging
import os
import zipfile

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import database
from app.auth import decode_token
from app.models import User
from app.services.notion_import import import_export, persist_export
from app.services.pdf_import import embed_pdf_as_note, parse_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["import"])


async def _require_user(authorization: str):
    """Resolve the request's user, ensuring the account still exists.

    The import routes write rows owned by ``user_id`` directly, so a token for a
    user who is gone (e.g. the database was recreated while the browser kept an
    old session) would otherwise fail deep inside the import with a foreign-key
    violation — surfaced to the user as a baffling "unsupported content" error.
    Checking up front lets us return a clear, actionable 401 instead.
    """
    user_id = decode_token(authorization[7:]) if authorization.startswith("Bearer ") else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    async with database.AsyncSessionLocal() as session:
        exists = (
            await session.execute(select(User.id).where(User.id == user_id))
        ).first() is not None
    if not exists:
        raise HTTPException(
            status_code=401,
            detail="Your session is no longer valid (account not found). "
            "Please log out and log back in, then try the import again.",
        )
    return user_id


def _error_detail(exc: Exception) -> str:
    """A short, human-readable reason for an import failure."""
    if isinstance(exc, IntegrityError):
        return (
            "a database constraint was violated, likely a stale session. "
            "Log out and log back in, then retry."
        )
    text = str(exc).strip()
    first_line = text.splitlines()[0] if text else exc.__class__.__name__
    return first_line[:300]

# Notion *project* exports bundle images/attachments inside the .zip. The total
# cap is generous (override with IMPORT_MAX_MB); individual images are embedded
# into notes as data URIs only up to a per-image cap.
_MAX_BYTES = int(os.environ.get("IMPORT_MAX_MB", "1024")) * 1024 * 1024
_PER_IMAGE_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")
# A single PDF is read fully into memory to parse, so it gets a tighter cap.
_PDF_MAX_BYTES = int(os.environ.get("IMPORT_PDF_MAX_MB", "64")) * 1024 * 1024


@router.post("/notion")
async def import_notion(
    file: UploadFile = File(...),
    authorization: str = Header(default=""),
):
    user_id = await _require_user(authorization)

    # The upload is spooled to a temp file by Starlette; measure it without
    # reading it into memory, then let zipfile stream only the .md entries.
    spooled = file.file
    spooled.seek(0, os.SEEK_END)
    size = spooled.tell()
    spooled.seek(0)
    if size > _MAX_BYTES:
        limit_mb = _MAX_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Export is too large (limit {limit_mb} MB). Set IMPORT_MAX_MB to raise it.",
        )

    try:
        archive = zipfile.ZipFile(spooled)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Please upload a valid Notion export .zip file")

    md_files: dict[str, str] = {}
    assets: dict[str, bytes] = {}
    try:
        for info in archive.infolist():
            name = info.filename
            lower = name.lower()
            if lower.endswith(".md"):
                md_files[name] = archive.read(name).decode("utf-8", errors="replace")
            elif lower.endswith(_IMAGE_EXTS) and info.file_size <= _PER_IMAGE_MAX_BYTES:
                # Only load images small enough to embed; larger ones are skipped.
                assets[name] = archive.read(name)
    except (zipfile.BadZipFile, OSError):
        raise HTTPException(status_code=400, detail="The export .zip appears to be corrupt or unreadable")

    if not md_files:
        raise HTTPException(status_code=400, detail="No Markdown pages found in the export")

    try:
        async with database.AsyncSessionLocal() as session:
            summary = await import_export(session, user_id, md_files, assets)
    except Exception as exc:
        # Surface the real cause (this is a personal tool) instead of a bare 500
        # or a vague "unsupported content" message, and log the full traceback.
        logger.exception("Notion import failed for user %s", user_id)
        raise HTTPException(
            status_code=422,
            detail=f"Could not import this export: {_error_detail(exc)}",
        )

    return {
        "folders": summary.folders,
        "notes": summary.notes,
        "foldersSkipped": summary.folders_skipped,
        "notesSkipped": summary.notes_skipped,
    }


@router.post("/pdf")
async def import_pdf(
    file: UploadFile = File(...),
    mode: str = Form(default="text"),
    authorization: str = Header(default=""),
):
    """Import a PDF in one of three modes:

    * ``text`` (default): read the embedded text — a short doc becomes a note, a
      structured/long one a folder of notes split by outline/headings/pages.
    * ``ocr``: rasterize and OCR each page (scanned PDFs, or fonts with no text).
    * ``embed``: store the whole PDF, unmodified, as one note's inline viewer —
      for PDFs whose text can't be extracted at all (e.g. typeset Arabic books).
    """
    user_id = await _require_user(authorization)

    mode = (mode or "text").strip().lower()

    spooled = file.file
    spooled.seek(0, os.SEEK_END)
    size = spooled.tell()
    spooled.seek(0)
    if size == 0:
        raise HTTPException(status_code=400, detail="The PDF is empty.")
    if size > _PDF_MAX_BYTES:
        limit_mb = _PDF_MAX_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"PDF is too large (limit {limit_mb} MB). Set IMPORT_PDF_MAX_MB to raise it.",
        )

    data = spooled.read()
    filename = file.filename or "Imported PDF"
    try:
        if mode == "embed":
            parsed = embed_pdf_as_note(data, filename)
        else:
            parsed = parse_pdf(data, filename, ocr=(mode == "ocr"))
    except ValueError as exc:
        # parse_pdf raises ValueError with a user-facing message for bad/empty/
        # scanned/encrypted PDFs.
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        async with database.AsyncSessionLocal() as session:
            summary = await persist_export(session, user_id, parsed)
    except Exception as exc:
        logger.exception("PDF import failed for user %s", user_id)
        raise HTTPException(
            status_code=422,
            detail=f"Could not import this PDF: {_error_detail(exc)}",
        )

    return {
        "folders": summary.folders,
        "notes": summary.notes,
        "foldersSkipped": summary.folders_skipped,
        "notesSkipped": summary.notes_skipped,
    }
