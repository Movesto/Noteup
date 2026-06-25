"""Shared helpers for the service layer.

The two scoping helpers intentionally differ — they preserve the app's existing
behavior:

* ``scope_listing`` — list endpoints show the user's own rows when authenticated,
  and the *unowned* rows (``user_id IS NULL``) when anonymous.
* ``scope_entity`` — single-entity lookups restrict to the user's rows only when
  authenticated; anonymous access is unrestricted.

NOTE: that asymmetry is legacy behavior, not a deliberate design — anonymous
single-entity access being unscoped is a latent gap worth tightening later. It is
preserved here so this refactor changes structure only, not behavior.
"""

import uuid
from typing import Optional


def parse_uuid(value) -> Optional[uuid.UUID]:
    """Parse a value into a UUID, returning None on malformed input."""
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def scope_listing(stmt, model, user_id, *, include_deleted: bool = False):
    """Scope a listing query to the user's rows, or unowned rows when anonymous.

    By default trashed (soft-deleted) rows are excluded; pass
    ``include_deleted=True`` for trash views and restore/purge operations.
    """
    if not include_deleted:
        stmt = stmt.where(model.deleted_at == None)  # noqa: E711
    if user_id:
        return stmt.where(model.user_id == user_id)
    return stmt.where(model.user_id == None)  # noqa: E711


def scope_entity(stmt, model, user_id, *, include_deleted: bool = False):
    """Scope a single-entity query to the user's rows only when authenticated.

    By default trashed (soft-deleted) rows are excluded; pass
    ``include_deleted=True`` to look one up for restore/purge.
    """
    if not include_deleted:
        stmt = stmt.where(model.deleted_at == None)  # noqa: E711
    if user_id:
        return stmt.where(model.user_id == user_id)
    return stmt
