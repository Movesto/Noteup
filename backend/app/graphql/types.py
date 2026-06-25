"""GraphQL output types and the mappers from ORM models to them."""

import uuid
from datetime import datetime
from typing import List, Optional

import strawberry
from graphql import GraphQLError
from strawberry.types import Info

from app.models import Folder, Note

# Sent verbatim in GraphQL errors so the client can detect a stale session and
# redirect to re-login. Keep in sync with the frontend's graphql-client check.
UNAUTHENTICATED = "UNAUTHENTICATED"


@strawberry.type
class FolderType:
    id: strawberry.ID
    name: str
    parent_id: Optional[strawberry.ID]
    deleted_at: Optional[datetime]


@strawberry.type
class NoteType:
    id: strawberry.ID
    title: str
    content: str
    aliases: List[str]
    folder_id: Optional[strawberry.ID]
    cover_url: Optional[str]
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


@strawberry.type
class GraphNode:
    id: strawberry.ID
    name: str
    node_type: str
    val: int


@strawberry.type
class GraphEdge:
    source: strawberry.ID
    target: strawberry.ID
    edge_type: str


@strawberry.type
class GraphData:
    nodes: List[GraphNode]
    links: List[GraphEdge]


@strawberry.type
class SearchResult:
    note_id: strawberry.ID
    note_title: str
    sentences: List[str]


@strawberry.type
class NoteStub:
    id: strawberry.ID
    title: str
    aliases: List[str]


@strawberry.type
class TrashData:
    notes: List["NoteType"]
    folders: List["FolderType"]


def folder_to_gql(folder: Folder) -> FolderType:
    return FolderType(
        id=strawberry.ID(str(folder.id)),
        name=folder.name,
        parent_id=strawberry.ID(str(folder.parent_id)) if folder.parent_id else None,
        deleted_at=folder.deleted_at,
    )


def note_to_gql(note: Note) -> NoteType:
    return NoteType(
        id=strawberry.ID(str(note.id)),
        title=note.title,
        content=note.content,
        aliases=note.aliases or [],
        folder_id=strawberry.ID(str(note.folder_id)) if note.folder_id else None,
        cover_url=note.cover_url,
        deleted_at=note.deleted_at,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def get_user_id(info: Info) -> Optional[uuid.UUID]:
    # A stale/invalid credential is rejected outright; a genuinely anonymous
    # request (no token) still returns None and is allowed.
    if info.context.get("auth_invalid"):
        raise GraphQLError(f"{UNAUTHENTICATED}: your session is no longer valid; please sign in again.")
    return info.context.get("user_id")
