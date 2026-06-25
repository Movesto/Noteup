"""Tests for the Notion export importer."""

import uuid

from sqlalchemy import select

from app.models import Folder, Note
from app.services import notion_import
from app.services.notion_import import parse_export, strip_hash

# Mirrors the real Notion export structure: a top page + a sibling folder of
# children, with an internal link from parent to child.
EXPORT = {
    "Aqeedah 13accc0057b5809287e8f9563e01ef26.md": (
        "# Aqeedah\n\n[Ep2 ](Aqeedah/Ep2%2013accc0057b580cc8a39c83c9d01a75c.md)\n"
    ),
    "Aqeedah/Ep2 13accc0057b580cc8a39c83c9d01a75c.md": "# Ep2\n\nWhat is Aqeedah.\n",
}


def test_strip_hash():
    assert strip_hash("Aqeedah 13accc0057b5809287e8f9563e01ef26") == "Aqeedah"
    assert strip_hash("Ep2 13accc0057b580cc8a39c83c9d01a75c") == "Ep2"
    assert strip_hash("No Hash Here") == "No Hash Here"


def test_parse_builds_folder_tree():
    parsed = parse_export(EXPORT)
    assert [f.name for f in parsed.folders] == ["Aqeedah"]
    assert parsed.folders[0].path == ("Aqeedah",)
    assert parsed.folders[0].parent_path is None

    by_title = {n.title: n for n in parsed.notes}
    assert set(by_title) == {"Aqeedah", "Ep2"}
    # The page that has children and its child both land in the folder.
    assert by_title["Aqeedah"].folder_path == ("Aqeedah",)
    assert by_title["Ep2"].folder_path == ("Aqeedah",)


def test_internal_link_becomes_wikilink_and_h1_stripped():
    parsed = parse_export(EXPORT)
    aqeedah = next(n for n in parsed.notes if n.title == "Aqeedah")
    assert "[[Ep2]]" in aqeedah.content_html
    # The duplicate "# Aqeedah" heading is removed (title is stored separately).
    assert "<h1" not in aqeedah.content_html


def test_links_and_images():
    h = "0123456789abcdef0123456789abcdef"
    files = {
        f"Page {h}.md": (
            "# Page\n\n[site](https://example.com)\n\n"
            "![local](pic.png)\n\n![remote](https://cdn.example/x.png)\n"
        )
    }
    html = parse_export(files).notes[0].content_html
    assert 'href="https://example.com"' in html        # external link kept
    assert "image omitted" in html                      # local image dropped
    assert "https://cdn.example/x.png" in html          # external image kept


def test_embeds_local_image_and_sets_cover():
    h = "0123456789abcdef0123456789abcdef"
    files = {f"Page {h}.md": f"# Page\n\n![diagram](Page%20{h}/pic.png)\n"}
    assets = {f"Page {h}/pic.png": b"\x89PNG\r\n\x1a\nFAKE"}
    note = parse_export(files, assets).notes[0]
    assert "data:image/png;base64," in note.content_html
    assert note.cover_url and note.cover_url.startswith("data:image/png;base64,")
    assert "image omitted" not in note.content_html


def test_local_image_without_asset_is_omitted():
    h = "0123456789abcdef0123456789abcdef"
    files = {f"Page {h}.md": f"# Page\n\n![big](Page%20{h}/huge.png)\n"}
    note = parse_export(files, assets={}).notes[0]  # not loaded (e.g. over the cap)
    assert "image omitted" in note.content_html
    assert note.cover_url is None


def test_nested_three_levels():
    h = "0123456789abcdef0123456789abcde"  # 31 chars + one below per file
    files = {
        "A 00000000000000000000000000000000.md": "# A\n",
        "A/B 11111111111111111111111111111111.md": "# B\n",
        "A/B/C 22222222222222222222222222222222.md": "# C\n",
    }
    parsed = parse_export(files)
    folder_paths = {f.path: f for f in parsed.folders}
    assert ("A",) in folder_paths and ("A", "B") in folder_paths
    assert folder_paths[("A", "B")].parent_path == ("A",)
    by_title = {n.title: n for n in parsed.notes}
    assert by_title["A"].folder_path == ("A",)
    assert by_title["B"].folder_path == ("A", "B")
    assert by_title["C"].folder_path == ("A", "B")  # leaf lives in its parent folder


async def test_import_export_writes_rows(session_factory):
    user_id = uuid.uuid4()
    async with session_factory() as s:
        summary = await notion_import.import_export(s, user_id, EXPORT)

    assert summary.folders == 1
    assert summary.notes == 2

    async with session_factory() as s:
        folders = (await s.execute(select(Folder))).scalars().all()
        notes = (await s.execute(select(Note))).scalars().all()

    assert len(folders) == 1 and folders[0].name == "Aqeedah"
    assert {n.title for n in notes} == {"Aqeedah", "Ep2"}
    assert all(n.folder_id == folders[0].id for n in notes)
    # Notion ids are recorded for de-duplication.
    assert all(n.notion_id for n in notes)


async def test_import_strips_nul_bytes(session_factory):
    """NUL bytes (which PostgreSQL rejects) are stripped from imported rows.

    SQLite tolerates NUL, so the assertion checks the stored value is clean
    rather than relying on the DB to reject it.
    """
    h = "0123456789abcdef0123456789abcdef"
    files = {
        f"Bad\x00Title {h}.md": "# Heading\n\nbody with a \x00 nul byte\n",
    }
    user_id = uuid.uuid4()
    async with session_factory() as s:
        summary = await notion_import.import_export(s, user_id, files)
    assert summary.notes == 1

    async with session_factory() as s:
        note = (await s.execute(select(Note))).scalars().one()
    assert "\x00" not in note.title
    assert "\x00" not in note.content
    assert "nul byte" in note.content  # surrounding content survives


def test_sanitize_text_removes_nul():
    assert notion_import.sanitize_text("a\x00b\x00c") == "abc"
    assert notion_import.sanitize_text("") == ""
    assert notion_import.sanitize_text("clean") == "clean"


async def test_reimport_is_deduplicated(session_factory):
    user_id = uuid.uuid4()
    async with session_factory() as s:
        first = await notion_import.import_export(s, user_id, EXPORT)
    async with session_factory() as s:
        second = await notion_import.import_export(s, user_id, EXPORT)

    # First import creates everything; the second creates nothing and skips all.
    assert (first.folders, first.notes) == (1, 2)
    assert (second.folders, second.notes) == (0, 0)
    assert (second.folders_skipped, second.notes_skipped) == (1, 2)

    # No duplicate rows were written.
    async with session_factory() as s:
        folders = (await s.execute(select(Folder))).scalars().all()
        notes = (await s.execute(select(Note))).scalars().all()
    assert len(folders) == 1
    assert len(notes) == 2
