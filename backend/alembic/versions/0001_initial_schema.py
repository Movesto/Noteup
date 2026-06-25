"""initial schema

Baseline capturing the schema that was previously created imperatively at
startup (user, folder, note, notelink). Pre-Alembic databases are auto-stamped
to this revision instead of re-running it (see app.database.apply_migrations).

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_id", "user", ["id"], unique=False)
    op.create_index("ix_user_email", "user", ["email"], unique=True)

    op.create_table(
        "folder",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["folder.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_folder_id", "folder", ["id"], unique=False)
    op.create_index("ix_folder_name", "folder", ["name"], unique=False)

    op.create_table(
        "note",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
        sa.Column("folder_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["folder_id"], ["folder.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_note_id", "note", ["id"], unique=False)
    op.create_index("ix_note_title", "note", ["title"], unique=False)

    op.create_table(
        "notelink",
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["note.id"]),
        sa.ForeignKeyConstraint(["target_id"], ["note.id"]),
        sa.PrimaryKeyConstraint("source_id", "target_id"),
    )


def downgrade() -> None:
    op.drop_table("notelink")
    op.drop_index("ix_note_title", table_name="note")
    op.drop_index("ix_note_id", table_name="note")
    op.drop_table("note")
    op.drop_index("ix_folder_name", table_name="folder")
    op.drop_index("ix_folder_id", table_name="folder")
    op.drop_table("folder")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_index("ix_user_id", table_name="user")
    op.drop_table("user")
