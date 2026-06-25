"""Graph data fetching.

These functions return raw ORM rows; the GraphQL layer shapes them into the
API's GraphNode/GraphEdge types (node sizing, edge construction). Keeping the
presentation out of here avoids a service -> GraphQL-types dependency.
"""

import uuid
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Folder, Note, NoteLink
from app.services.common import scope_listing


@dataclass
class FolderGraph:
    folder: Folder
    notes: Sequence[Note]
    subfolders: Sequence[Folder]
    external_notes: Sequence[Note]
    # Folders (other than this one and its subfolders) that own an externally
    # linked note — i.e. folders this one is topically *related* to.
    external_folders: Sequence[Folder]
    links: Sequence[NoteLink]


async def fetch_graph(
    session: AsyncSession, user_id
) -> Tuple[Sequence[Note], Sequence[Folder], Sequence[NoteLink]]:
    """All of a user's notes/folders, plus the wiki-links internal to that set.

    Scoping matches the canonical ``scope_listing`` rule: an authenticated user
    sees their own rows, an anonymous caller sees only unowned (``user_id IS
    NULL``) rows — never every user's data.
    """
    note_q = scope_listing(select(Note), Note, user_id)
    folder_q = scope_listing(select(Folder), Folder, user_id)
    notes = (await session.execute(note_q)).scalars().all()
    folders = (await session.execute(folder_q)).scalars().all()

    note_ids = {n.id for n in notes}
    if note_ids:
        wiki_links = (await session.execute(
            select(NoteLink).where(
                NoteLink.source_id.in_(note_ids) & NoteLink.target_id.in_(note_ids)
            )
        )).scalars().all()
    else:
        wiki_links = []
    return notes, folders, wiki_links


async def fetch_folder_graph(
    session: AsyncSession, user_id, folder_uuid: uuid.UUID
) -> Optional[FolderGraph]:
    """A folder's notes/subfolders plus any externally-linked notes.

    Every lookup is scoped with ``scope_listing`` so an authenticated user only
    reaches their own rows and an anonymous caller only reaches unowned ones.
    """
    folder_q = scope_listing(select(Folder).where(Folder.id == folder_uuid), Folder, user_id)
    folder = (await session.execute(folder_q)).scalar_one_or_none()
    if not folder:
        return None

    note_q = scope_listing(select(Note).where(Note.folder_id == folder_uuid), Note, user_id)
    folder_notes = (await session.execute(note_q)).scalars().all()
    folder_note_ids = {n.id for n in folder_notes}

    subfolder_q = scope_listing(
        select(Folder).where(Folder.parent_id == folder_uuid), Folder, user_id
    )
    subfolders = (await session.execute(subfolder_q)).scalars().all()

    if folder_note_ids:
        relevant_links = (await session.execute(
            select(NoteLink).where(
                NoteLink.source_id.in_(folder_note_ids)
                | NoteLink.target_id.in_(folder_note_ids)
            )
        )).scalars().all()
    else:
        relevant_links = []

    external_ids = set()
    for lnk in relevant_links:
        if lnk.source_id not in folder_note_ids:
            external_ids.add(lnk.source_id)
        if lnk.target_id not in folder_note_ids:
            external_ids.add(lnk.target_id)

    external_notes: List[Note] = []
    if external_ids:
        external_q = scope_listing(
            select(Note).where(Note.id.in_(list(external_ids))), Note, user_id
        )
        external_notes = (await session.execute(external_q)).scalars().all()

    # The folders those external notes live in (excluding this folder and its
    # subfolders, which are already shown) are the "related" folders.
    shown_folder_ids = {folder.id} | {sf.id for sf in subfolders}
    external_folder_ids = {
        n.folder_id for n in external_notes
        if n.folder_id is not None and n.folder_id not in shown_folder_ids
    }
    external_folders: List[Folder] = []
    if external_folder_ids:
        ext_folder_q = scope_listing(
            select(Folder).where(Folder.id.in_(list(external_folder_ids))), Folder, user_id
        )
        external_folders = (await session.execute(ext_folder_q)).scalars().all()

    return FolderGraph(
        folder=folder,
        notes=folder_notes,
        subfolders=subfolders,
        external_notes=external_notes,
        external_folders=external_folders,
        links=relevant_links,
    )
