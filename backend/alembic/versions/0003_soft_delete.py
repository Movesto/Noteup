"""add deleted_at for the trash (soft delete)

Adds a nullable ``deleted_at`` timestamp to note and folder. NULL means the row
is active; a non-NULL value means it is in the trash and can be restored or
permanently deleted. Items trashed together in one operation (a folder and all
of its descendant folders/notes) share the same timestamp, which is what lets a
restore bring back exactly that batch.

Revision ID: 0003_soft_delete
Revises: 0002_notion_id
Create Date: 2026-06-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_soft_delete"
down_revision: Union[str, None] = "0002_notion_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("note", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("folder", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.create_index("ix_note_deleted_at", "note", ["deleted_at"], unique=False)
    op.create_index("ix_folder_deleted_at", "folder", ["deleted_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_folder_deleted_at", table_name="folder")
    op.drop_index("ix_note_deleted_at", table_name="note")
    op.drop_column("folder", "deleted_at")
    op.drop_column("note", "deleted_at")
