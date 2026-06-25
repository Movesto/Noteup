"""Folder domain logic. Callers own the transaction (see services.notes)."""

import uuid
from typing import List, Optional, Sequence

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Folder, Note, NoteLink, utcnow
from app.services.common import scope_entity, scope_listing


async def list_folders(session: AsyncSession, user_id) -> Sequence[Folder]:
    q = scope_listing(select(Folder).order_by(Folder.created_at), Folder, user_id)
    return (await session.execute(q)).scalars().all()


async def list_trashed_folders(session: AsyncSession, user_id) -> Sequence[Folder]:
    """Folders currently in the trash, most-recently-deleted first."""
    q = scope_listing(
        select(Folder).where(Folder.deleted_at != None).order_by(Folder.deleted_at.desc()),
        Folder, user_id, include_deleted=True,
    )  # noqa: E711
    return (await session.execute(q)).scalars().all()


async def get_folder(
    session: AsyncSession, user_id, folder_id: uuid.UUID, *, include_deleted: bool = False
) -> Optional[Folder]:
    q = scope_entity(
        select(Folder).where(Folder.id == folder_id), Folder, user_id,
        include_deleted=include_deleted,
    )
    return (await session.execute(q)).scalar_one_or_none()


async def _all_folders(session: AsyncSession, user_id) -> Sequence[Folder]:
    """Every folder the user owns, trashed or not — used to walk the hierarchy."""
    q = scope_listing(select(Folder), Folder, user_id, include_deleted=True)
    return (await session.execute(q)).scalars().all()


def _subtree_ids(folders: Sequence[Folder], root_id: uuid.UUID) -> List[uuid.UUID]:
    """root_id plus every descendant folder id, walking parent_id links."""
    children: dict = {}
    for f in folders:
        children.setdefault(f.parent_id, []).append(f)
    ordered: List[uuid.UUID] = []
    stack = [root_id]
    while stack:
        current = stack.pop()
        ordered.append(current)
        for child in children.get(current, []):
            stack.append(child.id)
    return ordered


async def create_folder(
    session: AsyncSession, user_id, *, name: str, parent_id: Optional[uuid.UUID]
) -> Folder:
    folder = Folder(name=name, parent_id=parent_id, user_id=user_id)
    session.add(folder)
    return folder


async def rename_folder(
    session: AsyncSession, user_id, folder_id: uuid.UUID, name: str
) -> Optional[Folder]:
    folder = await get_folder(session, user_id, folder_id)
    if not folder:
        return None
    folder.name = name
    session.add(folder)
    return folder


async def move_folder(
    session: AsyncSession, user_id, folder_id: uuid.UUID, parent_id: Optional[uuid.UUID]
) -> Optional[Folder]:
    """Re-parent a folder (``parent_id=None`` moves it to the root).

    Returns the updated folder, or ``None`` if the move is invalid: the folder
    or target parent doesn't exist (or isn't the user's), or the move would
    create a cycle (into itself or one of its own descendants).
    """
    folder = await get_folder(session, user_id, folder_id)
    if not folder:
        return None
    if parent_id is not None:
        parent = await get_folder(session, user_id, parent_id)
        if parent is None:
            return None
        # _subtree_ids includes folder_id itself, so this rejects both
        # "into itself" and "into a descendant".
        subtree = set(_subtree_ids(await _all_folders(session, user_id), folder_id))
        if parent_id in subtree:
            return None
    if folder.parent_id == parent_id:
        return folder  # no-op move; nothing to change
    folder.parent_id = parent_id
    session.add(folder)
    return folder


async def delete_folder(session: AsyncSession, user_id, folder_id: uuid.UUID) -> bool:
    """Move a folder to the trash along with everything inside it.

    The folder, all of its descendant folders, and every note filed anywhere in
    that subtree are stamped with the same ``deleted_at`` time. Sharing the
    timestamp is what lets :func:`restore_folder` bring back exactly this batch.
    The hierarchy (parent_id / folder_id) is left intact so a restore can put
    everything back where it was.
    """
    folder = await get_folder(session, user_id, folder_id)
    if not folder:
        return False

    subtree = _subtree_ids(await _all_folders(session, user_id), folder_id)
    ts = utcnow()

    folders = (await session.execute(
        scope_listing(select(Folder).where(Folder.id.in_(subtree)), Folder, user_id)
    )).scalars().all()
    for f in folders:
        f.deleted_at = ts
        session.add(f)

    notes = (await session.execute(
        scope_listing(select(Note).where(Note.folder_id.in_(subtree)), Note, user_id)
    )).scalars().all()
    for n in notes:
        n.deleted_at = ts
        session.add(n)

    return True


async def restore_folder(session: AsyncSession, user_id, folder_id: uuid.UUID) -> bool:
    """Bring a trashed folder (and the batch trashed with it) back from the trash."""
    folder = await get_folder(session, user_id, folder_id, include_deleted=True)
    if not folder or folder.deleted_at is None:
        return False

    ts = folder.deleted_at
    all_folders = await _all_folders(session, user_id)
    subtree = _subtree_ids(all_folders, folder_id)

    folders = (await session.execute(scope_listing(
        select(Folder).where(Folder.id.in_(subtree)), Folder, user_id, include_deleted=True
    ))).scalars().all()
    for f in folders:
        if f.deleted_at == ts:
            f.deleted_at = None
            session.add(f)

    notes = (await session.execute(scope_listing(
        select(Note).where(Note.folder_id.in_(subtree)), Note, user_id, include_deleted=True
    ))).scalars().all()
    for n in notes:
        if n.deleted_at == ts:
            n.deleted_at = None
            session.add(n)

    # If the folder's parent is gone or still trashed, restore it to the root so
    # it doesn't reappear orphaned under an invisible parent.
    if folder.parent_id is not None:
        parent_active = any(
            f.id == folder.parent_id and f.deleted_at is None for f in all_folders
        )
        if not parent_active:
            folder.parent_id = None
            session.add(folder)

    return True


async def purge_folder(session: AsyncSession, user_id, folder_id: uuid.UUID) -> bool:
    """Permanently delete a folder and everything inside it."""
    folder = await get_folder(session, user_id, folder_id, include_deleted=True)
    if not folder:
        return False

    subtree = _subtree_ids(await _all_folders(session, user_id), folder_id)

    note_ids = (await session.execute(scope_listing(
        select(Note.id).where(Note.folder_id.in_(subtree)), Note, user_id, include_deleted=True
    ))).scalars().all()
    if note_ids:
        await session.execute(delete(NoteLink).where(
            or_(NoteLink.source_id.in_(note_ids), NoteLink.target_id.in_(note_ids))
        ))
        await session.execute(delete(Note).where(Note.id.in_(note_ids)))

    # A single DELETE over the whole subtree removes parents and children
    # together, so the self-referential parent_id FK is never left dangling.
    await session.execute(scope_listing(
        delete(Folder).where(Folder.id.in_(subtree)), Folder, user_id, include_deleted=True
    ))
    return True


async def purge_trashed_folders(session: AsyncSession, user_id) -> None:
    """Permanently delete every trashed folder (used by 'empty trash')."""
    trashed = await list_trashed_folders(session, user_id)
    for folder in trashed:
        await purge_folder(session, user_id, folder.id)
