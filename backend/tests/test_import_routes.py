"""Route-level tests for the import endpoints (auth/error handling)."""

import io
import uuid
import zipfile

import pytest

from app.auth import create_token
from app.models import User

_MINIMAL_ZIP_FILES = {
    "Page 13accc0057b5809287e8f9563e01ef26.md": "# Page\n\nHello world.\n",
}


def _zip_bytes(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, body in files.items():
            z.writestr(name, body)
    buf.seek(0)
    return buf


@pytest.mark.asyncio
async def test_notion_import_succeeds_for_real_user(client, session_factory):
    async with session_factory() as s:
        uid = uuid.uuid4()
        s.add(User(id=uid, email="real@x.com", password_hash="x"))
        await s.commit()
    token = create_token(uid)
    r = await client.post(
        "/import/notion",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("export.zip", _zip_bytes(_MINIMAL_ZIP_FILES), "application/zip")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["notes"] == 1


@pytest.mark.asyncio
async def test_notion_import_stale_session_returns_clear_401(client, session_factory):
    # Token for a user that was never inserted (e.g. DB recreated post-rebuild).
    token = create_token(uuid.uuid4())
    r = await client.post(
        "/import/notion",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("export.zip", _zip_bytes(_MINIMAL_ZIP_FILES), "application/zip")},
    )
    assert r.status_code == 401
    assert "log" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_pdf_import_stale_session_returns_401(client, session_factory):
    token = create_token(uuid.uuid4())
    r = await client.post(
        "/import/pdf",
        headers={"Authorization": f"Bearer {token}"},
        data={"mode": "text"},
        files={"file": ("x.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert r.status_code == 401
