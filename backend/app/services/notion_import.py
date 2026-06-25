"""Import a Notion "Markdown & CSV" export into the app.

A Notion export is a tree of ``.md`` files. A page ``Title <hash>.md`` holds the
page body; if that page has sub-pages, a sibling directory ``Title <hash>/``
holds them. We map that structure onto the app's model:

* a page that has children becomes a **folder** (so its children can nest) and
  its own body becomes a **note** inside that folder;
* a leaf page becomes a **note** in its parent's folder;
* internal ``[text](Other%20Page.md)`` links become ``[[wiki-links]]`` so the
  knowledge graph reconnects;
* local images are embedded into the note as base64 data URIs (up to a size
  cap); external image URLs are kept as-is. A page's first image also becomes
  the note's cover.

The parsing/conversion (``parse_export``) is pure and DB-free; ``import_export``
writes the result for a user.
"""

import base64
import posixpath
import re
import urllib.parse
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import markdown as md_lib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Folder, Note
from app.services import notes as notes_service

# Notion suffixes names with a space + 32 hex chars (e.g. "Aqeedah 13accc…ef26").
_HASH_RE = re.compile(r"\s+[0-9a-fA-F]{32}$")
_HASH_CAPTURE_RE = re.compile(r"\s([0-9a-fA-F]{32})$")
_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
_H1_RE = re.compile(r"#\s+(.*)")

_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}

DirPath = Tuple[str, ...]
Assets = Dict[str, bytes]


def sanitize_text(value: str) -> str:
    """Drop NUL bytes, which PostgreSQL's text type cannot store.

    Notion exports occasionally carry a stray ``\\x00`` (e.g. from copied
    content); without this the whole import fails with a Postgres
    ``CharacterNotInRepertoireError``. SQLite tolerates NUL, so this only
    matters in production.
    """
    return value.replace("\x00", "") if value else value


def strip_hash(name: str) -> str:
    """Drop Notion's trailing ``<32-hex>`` id and surrounding whitespace."""
    return _HASH_RE.sub("", name).strip()


def extract_hash(name: str) -> Optional[str]:
    """Return Notion's trailing 32-hex page id, lowercased, or None."""
    m = _HASH_CAPTURE_RE.search(name.strip())
    return m.group(1).lower() if m else None


@dataclass
class ParsedFolder:
    path: DirPath               # directory components, the lookup key
    name: str
    parent_path: Optional[DirPath]
    notion_id: Optional[str] = None


@dataclass
class ParsedNote:
    title: str
    content_html: str
    folder_path: Optional[DirPath]  # None == top level
    cover_url: Optional[str] = None
    notion_id: Optional[str] = None


@dataclass
class ParsedExport:
    folders: List[ParsedFolder] = field(default_factory=list)
    notes: List[ParsedNote] = field(default_factory=list)


@dataclass
class ImportSummary:
    folders: int                # created
    notes: int                  # created
    folders_skipped: int = 0
    notes_skipped: int = 0


# ---------------------------------------------------------------------------
# Markdown conversion
# ---------------------------------------------------------------------------

def _is_external(url: str) -> bool:
    return url.lower().startswith(("http://", "https://", "mailto:"))


def _attr_escape(value: str) -> str:
    return (
        (value or "")
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _image_html(
    alt: str, url: str, page_dir: DirPath, assets: Assets
) -> Optional[Tuple[str, str]]:
    """Return (``<img>`` HTML, src) for a renderable image, or None to skip it.

    External URLs are kept; local files are embedded as data URIs if present in
    ``assets`` (the route only loads images under the size cap).
    """
    alt_esc = _attr_escape(alt)
    if _is_external(url):
        return f'<img src="{_attr_escape(url)}" alt="{alt_esc}">', url

    decoded = urllib.parse.unquote(url).split("#")[0]
    base = "/".join(page_dir)
    path = posixpath.normpath(posixpath.join(base, decoded) if base else decoded)
    data = assets.get(path)
    if data is None:
        return None

    mime = _MIME.get(posixpath.splitext(path)[1].lower(), "application/octet-stream")
    src = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
    return f'<img src="{src}" alt="{alt_esc}">', src


def _convert_markdown(
    text: str, page_dir: DirPath, title_by_path: Dict[str, str], title: str, assets: Assets
) -> Tuple[str, Optional[str]]:
    """Convert one page's Markdown to HTML; returns (html, cover_url)."""
    cover: List[Optional[str]] = [None]
    tokens: Dict[str, str] = {}

    # 1. Images. Embedded/external images become <img> via a placeholder token
    #    (so the long data URI survives Markdown conversion untouched); missing
    #    local images degrade to a small placeholder. First image -> cover.
    def image_sub(m: re.Match) -> str:
        alt, url = m.group(1), m.group(2)
        result = _image_html(alt, url, page_dir, assets)
        if result is None:
            return f"*(image omitted: {alt})*" if alt else "*(image omitted)*"
        tag, src = result
        if cover[0] is None:
            cover[0] = src
        token = f"@@IMG{len(tokens)}@@"
        tokens[token] = tag
        return token

    text = _IMAGE_RE.sub(image_sub, text)

    # 2. Internal page links -> [[wiki-links]]; leave external links alone.
    def link_sub(m: re.Match) -> str:
        label, url = m.group(1), m.group(2)
        if _is_external(url):
            return m.group(0)
        decoded = urllib.parse.unquote(url).split("#")[0]
        if not decoded.endswith(".md"):
            return m.group(0)
        base = "/".join(page_dir)
        target = posixpath.normpath(posixpath.join(base, decoded) if base else decoded)
        target_title = title_by_path.get(target) or title_by_path.get(decoded)
        return f"[[{target_title}]]" if target_title else label.strip()

    text = _LINK_RE.sub(link_sub, text)

    # 3. Drop a leading "# Title" that just repeats the note title.
    text = _strip_leading_h1(text, title)

    # 4. Markdown -> HTML, then swap image placeholders back in.
    html = md_lib.markdown(text, extensions=["extra", "sane_lists"])
    for token, tag in tokens.items():
        html = html.replace(token, tag)
    return html, cover[0]


def _strip_leading_h1(text: str, title: str) -> str:
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.strip() == "":
            continue
        m = _H1_RE.match(line.strip())
        if m and strip_hash(m.group(1).strip()).casefold() == title.casefold():
            del lines[i]
            return "\n".join(lines)
        break  # first content line isn't a matching H1
    return text


# ---------------------------------------------------------------------------
# Export parsing (pure)
# ---------------------------------------------------------------------------

def parse_export(md_files: Dict[str, str], assets: Optional[Assets] = None) -> ParsedExport:
    """Turn {zip-path: markdown} (+ optional {zip-path: image bytes}) into folders + notes."""
    norm_assets: Assets = {k.replace("\\", "/"): v for k, v in (assets or {}).items()}
    paths = [p.replace("\\", "/") for p in md_files]

    # Every directory prefix becomes a folder.
    dirset: set[DirPath] = set()
    for p in paths:
        comps = p.split("/")[:-1]
        for i in range(1, len(comps) + 1):
            dirset.add(tuple(comps[:i]))

    # Resolve each page; a page with a matching sibling directory "owns" that
    # directory's folder, so the folder can inherit the page's Notion id.
    owner_hash_by_dir: Dict[DirPath, str] = {}
    pages = []
    for original, p in zip(md_files, paths):
        comps = p.split("/")
        page_dir: DirPath = tuple(comps[:-1])
        stem = comps[-1][:-3]  # drop ".md"
        title = strip_hash(stem)
        page_hash = extract_hash(stem)
        child_dir = next(
            (d for d in dirset if d[:-1] == page_dir and strip_hash(d[-1]) == title),
            None,
        )
        if child_dir is not None and page_hash:
            owner_hash_by_dir[child_dir] = page_hash
        pages.append((original, page_dir, title, page_hash, child_dir))

    folders = [
        ParsedFolder(
            path=d,
            name=strip_hash(d[-1]),
            parent_path=d[:-1] if len(d) > 1 else None,
            notion_id=extract_hash(d[-1]) or owner_hash_by_dir.get(d),
        )
        for d in sorted(dirset, key=len)
    ]

    title_by_path = {p: strip_hash(p.split("/")[-1][:-3]) for p in paths}

    notes: List[ParsedNote] = []
    for original, page_dir, title, page_hash, child_dir in pages:
        folder_path = child_dir if child_dir is not None else (page_dir or None)
        html, cover = _convert_markdown(
            md_files[original], page_dir, title_by_path, title, norm_assets
        )
        notes.append(
            ParsedNote(
                title=title,
                content_html=html,
                folder_path=folder_path,
                cover_url=cover,
                notion_id=page_hash,
            )
        )

    return ParsedExport(folders=folders, notes=notes)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

async def _existing_folder_id(session, user_id, notion_id, name, parent_id):
    q = select(Folder.id).where(Folder.user_id == user_id)
    if notion_id:
        q = q.where(Folder.notion_id == notion_id)
    else:
        q = q.where(
            Folder.notion_id.is_(None), Folder.name == name, Folder.parent_id == parent_id
        )
    return (await session.execute(q)).scalars().first()


async def _note_exists(session, user_id, notion_id, title, folder_id):
    q = select(Note.id).where(Note.user_id == user_id)
    if notion_id:
        q = q.where(Note.notion_id == notion_id)
    else:
        q = q.where(
            Note.notion_id.is_(None), Note.title == title, Note.folder_id == folder_id
        )
    return (await session.execute(q)).first() is not None


async def import_export(
    session: AsyncSession, user_id, md_files: Dict[str, str], assets: Optional[Assets] = None
) -> ImportSummary:
    """Import the export, skipping pages already imported (matched by Notion id)."""
    return await persist_export(session, user_id, parse_export(md_files, assets))


async def persist_export(
    session: AsyncSession, user_id, parsed: ParsedExport
) -> ImportSummary:
    """Write a parsed export (folders + notes) for a user.

    Shared by the Notion (.zip) and PDF importers. Pages already imported are
    skipped — matched by Notion id when present, otherwise by title + folder so
    re-importing the same source is idempotent. ``[[wiki-links]]`` in the new
    notes are resolved into graph edges, scoped to this user.
    """
    folders_created = folders_skipped = 0
    folder_id_by_path: Dict[DirPath, object] = {}
    for pf in parsed.folders:
        parent_id = folder_id_by_path.get(pf.parent_path) if pf.parent_path else None
        existing = await _existing_folder_id(session, user_id, pf.notion_id, pf.name, parent_id)
        if existing is not None:
            folder_id_by_path[pf.path] = existing
            folders_skipped += 1
            continue
        folder = Folder(
            name=sanitize_text(pf.name), parent_id=parent_id,
            notion_id=pf.notion_id, user_id=user_id,
        )
        session.add(folder)
        await session.flush()
        folder_id_by_path[pf.path] = folder.id
        folders_created += 1

    created: List[Note] = []
    notes_skipped = 0
    for pn in parsed.notes:
        folder_id = folder_id_by_path.get(pn.folder_path) if pn.folder_path else None
        if await _note_exists(session, user_id, pn.notion_id, pn.title, folder_id):
            notes_skipped += 1
            continue
        note = Note(
            title=sanitize_text(pn.title),
            content=sanitize_text(pn.content_html),
            aliases=[],
            folder_id=folder_id,
            cover_url=sanitize_text(pn.cover_url) if pn.cover_url else pn.cover_url,
            notion_id=pn.notion_id,
            user_id=user_id,
        )
        session.add(note)
        created.append(note)
    await session.flush()

    # Now that every note exists, resolve [[wiki-links]] into edges (scoped to
    # the importing user, so links never resolve into another user's notes).
    for note in created:
        await notes_service.sync_links(session, note.content, note.id, user_id)

    await session.commit()
    return ImportSummary(
        folders=folders_created,
        notes=len(created),
        folders_skipped=folders_skipped,
        notes_skipped=notes_skipped,
    )
