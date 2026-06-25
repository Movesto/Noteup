import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utcnow)


class Folder(SQLModel, table=True):
    __tablename__ = "folder"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    name: str = Field(index=True)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="folder.id")
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    # Notion page id (32-hex) this folder came from, for import de-duplication.
    notion_id: Optional[str] = Field(default=None, index=True)
    # Set when the folder is in the trash (soft-deleted); NULL means active.
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utcnow)


class NoteLink(SQLModel, table=True):
    __tablename__ = "notelink"

    source_id: uuid.UUID = Field(foreign_key="note.id", primary_key=True)
    target_id: uuid.UUID = Field(foreign_key="note.id", primary_key=True)


class Note(SQLModel, table=True):
    __tablename__ = "note"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    title: str = Field(index=True)
    content: str = Field(default="")
    aliases: List[str] = Field(default=[], sa_column=Column(JSON, nullable=False))
    folder_id: Optional[uuid.UUID] = Field(default=None, foreign_key="folder.id")
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    # Notion page id (32-hex) this note came from, for import de-duplication.
    notion_id: Optional[str] = Field(default=None, index=True)
    cover_url: Optional[str] = Field(default=None)
    # Set when the note is in the trash (soft-deleted); NULL means active.
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
