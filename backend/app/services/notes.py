"""Note domain logic.

Functions take an ``AsyncSession`` and never manage the transaction — the caller
(the GraphQL resolver layer) owns session creation and commit/rollback.
"""

import uuid
from typing import List, Optional, Sequence

from sqlalchemy import cast, delete, or_, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Folder, Note, NoteLink, utcnow
from app.services.common import scope_entity, scope_listing
from app.utils.link_parser import extract_links

# Sentinel meaning "field not provided" — lets callers distinguish "clear this
# value" (None) from "leave it untouched".
UNSET = object()


async def sync_links(
    session: AsyncSession, content: str, note_id: uuid.UUID, user_id
) -> None:
    """Rebuild the NoteLink edges originating from a note based on its [[links]].

    Targets resolve only against the *same owner's* notes (by title or alias), so
    one user's ``[[link]]`` can never attach to another user's note that happens
    to share a title. Resolution runs in Python over the owner's note stubs: that
    keeps it to a single query (instead of one per link), avoids a duplicate-edge
    error when the same ``[[target]]`` appears twice, and stays portable across
    databases (no Postgres-only JSONB containment).
    """
    await session.execute(delete(NoteLink).where(NoteLink.source_id == note_id))
    targets = extract_links(content)
    if not targets:
        return

    # Map every title/alias the owner has to its note id (first writer wins),
    # excluding the note itself so it can't link to itself.
    lookup: dict[str, uuid.UUID] = {}
    for stub in await list_note_stubs(session, user_id):
        if stub.id == note_id:
            continue
        for key in (stub.title, *(stub.aliases or [])):
            lookup.setdefault(key, stub.id)

    linked: set[uuid.UUID] = set()
    for target in targets:
        target_id = lookup.get(target)
        if target_id is not None and target_id not in linked:
            session.add(NoteLink(source_id=note_id, target_id=target_id))
            linked.add(target_id)


async def list_notes(session: AsyncSession, user_id):
    """Note metadata for the `notes` field (sidebar tree), newest first.

    Selects every column EXCEPT ``content``: the body can be several MB once
    images are embedded as base64 data URIs, and the sidebar runs this on every
    navigation — loading it made each page change read ~100 MB. ``note_to_gql``
    tolerates the absent body (returns an empty string).
    """
    q = scope_listing(
        select(
            Note.id, Note.title, Note.aliases, Note.folder_id, Note.cover_url,
            Note.deleted_at, Note.created_at, Note.updated_at,
        ).order_by(Note.created_at.desc()),
        Note, user_id,
    )
    return (await session.execute(q)).all()


async def list_note_stubs(session: AsyncSession, user_id):
    q = scope_listing(
        select(Note.id, Note.title, Note.aliases).order_by(Note.title), Note, user_id
    )
    return (await session.execute(q)).all()


async def list_trashed_notes(session: AsyncSession, user_id) -> Sequence[Note]:
    """Notes currently in the trash, most-recently-deleted first."""
    q = scope_listing(
        select(Note).where(Note.deleted_at != None).order_by(Note.deleted_at.desc()),
        Note, user_id, include_deleted=True,
    )  # noqa: E711
    return (await session.execute(q)).scalars().all()


async def get_note(
    session: AsyncSession, user_id, note_id: uuid.UUID, *, include_deleted: bool = False
) -> Optional[Note]:
    q = scope_entity(
        select(Note).where(Note.id == note_id), Note, user_id, include_deleted=include_deleted
    )
    return (await session.execute(q)).scalar_one_or_none()


async def get_note_by_title(session: AsyncSession, user_id, title: str) -> Optional[Note]:
    q = (
        select(Note)
        .where(or_(
            Note.title == title,
            cast(Note.aliases, JSONB).contains([title]),
        ))
        .limit(1)
    )
    q = scope_entity(q, Note, user_id)
    return (await session.execute(q)).scalar_one_or_none()


async def get_backlinks(session: AsyncSession, user_id, note_id: uuid.UUID) -> Sequence[Note]:
    # Verify the target note is visible to the caller before returning which
    # notes reference it (avoids leaking references for arbitrary IDs).
    target_q = scope_listing(select(Note.id).where(Note.id == note_id), Note, user_id)
    if (await session.execute(target_q)).first() is None:
        return []
    q = (
        select(Note)
        .join(NoteLink, NoteLink.source_id == Note.id)
        .where(NoteLink.target_id == note_id)
    )
    q = scope_listing(q, Note, user_id)
    return (await session.execute(q)).scalars().all()


async def list_orphans(session: AsyncSession, user_id) -> Sequence[Note]:
    has_outbound = select(NoteLink.source_id).where(NoteLink.source_id == Note.id).exists()
    has_inbound = select(NoteLink.target_id).where(NoteLink.target_id == Note.id).exists()
    q = scope_entity(select(Note).where(~has_outbound & ~has_inbound), Note, user_id)
    return (await session.execute(q)).scalars().all()


async def create_note(
    session: AsyncSession, user_id, *,
    title: str, content: str, aliases: Optional[List[str]],
    folder_id: Optional[uuid.UUID],
) -> Note:
    note = Note(
        title=title, content=content,
        aliases=aliases or [],
        folder_id=folder_id, user_id=user_id,
    )
    session.add(note)
    await session.flush()
    await sync_links(session, content, note.id, user_id)
    return note


async def update_note(
    session: AsyncSession, user_id, note_id: uuid.UUID, *,
    title: Optional[str] = None,
    content: Optional[str] = None,
    aliases: Optional[List[str]] = None,
    cover_url=UNSET,
) -> Optional[Note]:
    note = await get_note(session, user_id, note_id)
    if not note:
        return None
    if title is not None:
        note.title = title
    if aliases is not None:
        note.aliases = aliases
    if content is not None:
        note.content = content
        await sync_links(session, content, note.id, user_id)
    if cover_url is not UNSET:
        note.cover_url = cover_url
    note.updated_at = utcnow()
    session.add(note)
    return note


async def move_note(
    session: AsyncSession, user_id, note_id: uuid.UUID, folder_id: Optional[uuid.UUID]
) -> Optional[Note]:
    note = await get_note(session, user_id, note_id)
    if not note:
        return None
    note.folder_id = folder_id
    note.updated_at = utcnow()
    session.add(note)
    return note


async def delete_notes(
    session: AsyncSession, user_id, note_ids: Sequence[uuid.UUID]
) -> int:
    """Move one or more notes to the trash. Returns how many were trashed.

    Wiki-links are left in place so a restore relinks cleanly; the query layer
    already hides trashed notes from backlinks, graph, and search.
    """
    if not note_ids:
        return 0
    notes = (await session.execute(
        scope_listing(select(Note).where(Note.id.in_(note_ids)), Note, user_id)
    )).scalars().all()
    ts = utcnow()
    for note in notes:
        note.deleted_at = ts
        session.add(note)
    return len(notes)


async def delete_note(session: AsyncSession, user_id, note_id: uuid.UUID) -> bool:
    return (await delete_notes(session, user_id, [note_id])) > 0


async def restore_notes(
    session: AsyncSession, user_id, note_ids: Sequence[uuid.UUID]
) -> int:
    """Bring notes back from the trash, unfiling any whose folder is gone."""
    if not note_ids:
        return 0
    notes = (await session.execute(scope_listing(
        select(Note).where(Note.id.in_(note_ids)), Note, user_id, include_deleted=True
    ))).scalars().all()
    restored = 0
    for note in notes:
        if note.deleted_at is None:
            continue
        note.deleted_at = None
        if note.folder_id is not None:
            folder = (await session.execute(scope_entity(
                select(Folder).where(Folder.id == note.folder_id), Folder, user_id
            ))).scalar_one_or_none()
            if folder is None:  # folder missing or still trashed
                note.folder_id = None
        session.add(note)
        restored += 1
    return restored


async def purge_notes(
    session: AsyncSession, user_id, note_ids: Sequence[uuid.UUID]
) -> int:
    """Permanently delete notes (and their links). Returns how many were removed."""
    if not note_ids:
        return 0
    ids = (await session.execute(scope_listing(
        select(Note.id).where(Note.id.in_(note_ids)), Note, user_id, include_deleted=True
    ))).scalars().all()
    if not ids:
        return 0
    await session.execute(delete(NoteLink).where(
        or_(NoteLink.source_id.in_(ids), NoteLink.target_id.in_(ids))
    ))
    await session.execute(delete(Note).where(Note.id.in_(ids)))
    return len(ids)


async def purge_note(session: AsyncSession, user_id, note_id: uuid.UUID) -> bool:
    return (await purge_notes(session, user_id, [note_id])) > 0


async def purge_trashed_notes(session: AsyncSession, user_id) -> None:
    """Permanently delete every trashed note (used by 'empty trash')."""
    ids = [n.id for n in await list_trashed_notes(session, user_id)]
    await purge_notes(session, user_id, ids)
