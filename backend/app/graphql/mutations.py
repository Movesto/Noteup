"""GraphQL mutations — thin resolvers that own the session/transaction boundary."""

import uuid
from typing import List, Optional

import strawberry
from strawberry import UNSET
from strawberry.types import Info

from app import database
from app.graphql.types import (
    FolderType,
    NoteType,
    folder_to_gql,
    get_user_id,
    note_to_gql,
)
from app.services import folders as folders_service
from app.services import notes as notes_service
from app.services.common import parse_uuid


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_note(
        self, info: Info,
        title: str, content: str = "",
        aliases: Optional[List[str]] = None,
        folder_id: Optional[strawberry.ID] = None,
    ) -> NoteType:
        user_id = get_user_id(info)
        folder_uuid = uuid.UUID(str(folder_id)) if folder_id else None
        async with database.AsyncSessionLocal() as session:
            note = await notes_service.create_note(
                session, user_id,
                title=title, content=content, aliases=aliases, folder_id=folder_uuid,
            )
            await session.commit()
            await session.refresh(note)
            return note_to_gql(note)

    @strawberry.mutation
    async def update_note(
        self, info: Info,
        id: strawberry.ID,
        title: Optional[str] = None,
        content: Optional[str] = None,
        aliases: Optional[List[str]] = None,
        cover_url: Optional[str] = UNSET,
    ) -> Optional[NoteType]:
        user_id = get_user_id(info)
        note_id = parse_uuid(id)
        if note_id is None:
            return None
        service_cover = notes_service.UNSET if cover_url is UNSET else cover_url
        async with database.AsyncSessionLocal() as session:
            note = await notes_service.update_note(
                session, user_id, note_id,
                title=title, content=content, aliases=aliases, cover_url=service_cover,
            )
            if note is None:
                return None
            await session.commit()
            await session.refresh(note)
            return note_to_gql(note)

    @strawberry.mutation
    async def move_note(
        self, info: Info,
        id: strawberry.ID,
        folder_id: Optional[strawberry.ID] = None,
    ) -> Optional[NoteType]:
        user_id = get_user_id(info)
        note_id = parse_uuid(id)
        if note_id is None:
            return None
        folder_uuid = uuid.UUID(str(folder_id)) if folder_id else None
        async with database.AsyncSessionLocal() as session:
            note = await notes_service.move_note(session, user_id, note_id, folder_uuid)
            if note is None:
                return None
            await session.commit()
            await session.refresh(note)
            return note_to_gql(note)

    @strawberry.mutation
    async def delete_note(self, info: Info, id: strawberry.ID) -> bool:
        user_id = get_user_id(info)
        note_id = parse_uuid(id)
        if note_id is None:
            return False
        async with database.AsyncSessionLocal() as session:
            ok = await notes_service.delete_note(session, user_id, note_id)
            if ok:
                await session.commit()
            return ok

    @strawberry.mutation
    async def delete_notes(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Move notes to the trash. Returns how many were trashed."""
        user_id = get_user_id(info)
        note_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = await notes_service.delete_notes(session, user_id, note_ids)
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def restore_notes(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Restore notes from the trash. Returns how many were restored."""
        user_id = get_user_id(info)
        note_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = await notes_service.restore_notes(session, user_id, note_ids)
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def purge_notes(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Permanently delete notes from the trash. Returns how many were removed."""
        user_id = get_user_id(info)
        note_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = await notes_service.purge_notes(session, user_id, note_ids)
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def create_folder(
        self, info: Info,
        name: str,
        parent_id: Optional[strawberry.ID] = None,
    ) -> FolderType:
        user_id = get_user_id(info)
        parent_uuid = uuid.UUID(str(parent_id)) if parent_id else None
        async with database.AsyncSessionLocal() as session:
            folder = await folders_service.create_folder(
                session, user_id, name=name, parent_id=parent_uuid
            )
            await session.commit()
            await session.refresh(folder)
            return folder_to_gql(folder)

    @strawberry.mutation
    async def rename_folder(
        self, info: Info,
        id: strawberry.ID, name: str,
    ) -> Optional[FolderType]:
        user_id = get_user_id(info)
        folder_id = parse_uuid(id)
        if folder_id is None:
            return None
        async with database.AsyncSessionLocal() as session:
            folder = await folders_service.rename_folder(session, user_id, folder_id, name)
            if folder is None:
                return None
            await session.commit()
            await session.refresh(folder)
            return folder_to_gql(folder)

    @strawberry.mutation
    async def move_folder(
        self, info: Info,
        id: strawberry.ID,
        parent_id: Optional[strawberry.ID] = None,
    ) -> Optional[FolderType]:
        """Re-parent a folder. Returns null if the move is invalid (cycle, or
        a missing/unowned folder or target parent)."""
        user_id = get_user_id(info)
        folder_id = parse_uuid(id)
        if folder_id is None:
            return None
        parent_uuid = uuid.UUID(str(parent_id)) if parent_id else None
        async with database.AsyncSessionLocal() as session:
            folder = await folders_service.move_folder(
                session, user_id, folder_id, parent_uuid
            )
            if folder is None:
                return None
            await session.commit()
            await session.refresh(folder)
            return folder_to_gql(folder)

    @strawberry.mutation
    async def delete_folder(self, info: Info, id: strawberry.ID) -> bool:
        user_id = get_user_id(info)
        folder_id = parse_uuid(id)
        if folder_id is None:
            return False
        async with database.AsyncSessionLocal() as session:
            ok = await folders_service.delete_folder(session, user_id, folder_id)
            if ok:
                await session.commit()
            return ok

    @strawberry.mutation
    async def delete_folders(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Move folders (and everything inside them) to the trash."""
        user_id = get_user_id(info)
        folder_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = 0
            for fid in folder_ids:
                if await folders_service.delete_folder(session, user_id, fid):
                    count += 1
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def restore_folders(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Restore folders (and their batch) from the trash."""
        user_id = get_user_id(info)
        folder_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = 0
            for fid in folder_ids:
                if await folders_service.restore_folder(session, user_id, fid):
                    count += 1
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def purge_folders(self, info: Info, ids: List[strawberry.ID]) -> int:
        """Permanently delete folders (and everything inside them) from the trash."""
        user_id = get_user_id(info)
        folder_ids = [u for u in (parse_uuid(i) for i in ids) if u is not None]
        async with database.AsyncSessionLocal() as session:
            count = 0
            for fid in folder_ids:
                if await folders_service.purge_folder(session, user_id, fid):
                    count += 1
            if count:
                await session.commit()
            return count

    @strawberry.mutation
    async def empty_trash(self, info: Info) -> bool:
        """Permanently delete everything in the trash — notes and folders."""
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            # Notes first: a note's folder_id FK must not outlive its folder.
            await notes_service.purge_trashed_notes(session, user_id)
            await folders_service.purge_trashed_folders(session, user_id)
            await session.commit()
        return True
