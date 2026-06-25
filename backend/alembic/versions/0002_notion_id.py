"""add notion_id for import de-duplication

Adds a nullable Notion page id (32-hex) to note and folder so re-importing the
same Notion export skips already-imported pages instead of duplicating them.

Revision ID: 0002_notion_id
Revises: 0001_initial
Create Date: 2026-06-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_notion_id"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("note", sa.Column("notion_id", sa.String(), nullable=True))
    op.add_column("folder", sa.Column("notion_id", sa.String(), nullable=True))
    op.create_index("ix_note_notion_id", "note", ["notion_id"], unique=False)
    op.create_index("ix_folder_notion_id", "folder", ["notion_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_folder_notion_id", table_name="folder")
    op.drop_index("ix_note_notion_id", table_name="note")
    op.drop_column("folder", "notion_id")
    op.drop_column("note", "notion_id")
