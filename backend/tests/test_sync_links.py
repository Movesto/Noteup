"""Wiki-link resolution (sync_links): owner-scoped, deduplicated, alias-aware."""

import uuid

from sqlalchemy import select

from app.models import Note, NoteLink, User
from app.services import notes as notes_service


async def _outgoing(session, source_id):
    rows = (await session.execute(
        select(NoteLink).where(NoteLink.source_id == source_id)
    )).scalars().all()
    return {r.target_id for r in rows}


async def test_link_resolves_to_same_owner_only(session_factory):
    """A [[Title]] must link to the author's own note, never another user's."""
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    a_target, b_target = uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(User(id=user_b, email="b@x.com", password_hash="x"))
        # Both users own a note titled "Tawhid".
        s.add(Note(id=a_target, title="Tawhid", content="", user_id=user_a))
        s.add(Note(id=b_target, title="Tawhid", content="", user_id=user_b))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, user_a, title="A-source", content="see [[Tawhid]]",
            aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == {a_target}  # never b_target


async def test_unowned_link_does_not_attach_to_owned_note(session_factory):
    """An anonymous note must not link into a real user's note of the same title."""
    user_a = uuid.uuid4()
    owned = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Note(id=owned, title="Shared", content="", user_id=user_a))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, None, title="anon", content="[[Shared]]", aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == set()  # nothing to link to


async def test_repeated_link_creates_single_edge(session_factory):
    """The same [[target]] repeated in content must not raise on a duplicate edge."""
    user_a = uuid.uuid4()
    target = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Note(id=target, title="Once", content="", user_id=user_a))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, user_a, title="src", content="[[Once]] and again [[Once]]",
            aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == {target}


async def test_link_resolves_via_alias(session_factory):
    """A target matching another note's alias resolves to that note."""
    user_a = uuid.uuid4()
    target = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Note(id=target, title="Monotheism", content="",
                   aliases=["Tawhid"], user_id=user_a))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, user_a, title="src", content="[[Tawhid]]", aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == {target}


async def test_update_rewrites_links(session_factory):
    """Editing content replaces the old outgoing edges with the new ones."""
    user_a = uuid.uuid4()
    first, second = uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Note(id=first, title="First", content="", user_id=user_a))
        s.add(Note(id=second, title="Second", content="", user_id=user_a))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, user_a, title="src", content="[[First]]", aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == {first}

        await notes_service.update_note(s, user_a, note.id, content="now [[Second]]")
        await s.commit()
        assert await _outgoing(s, note.id) == {second}


async def test_note_does_not_link_to_itself(session_factory):
    """A note referencing its own title must not create a self-edge."""
    user_a = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        await s.commit()

    async with session_factory() as s:
        note = await notes_service.create_note(
            s, user_a, title="Self", content="I am [[Self]]", aliases=None, folder_id=None,
        )
        await s.commit()
        assert await _outgoing(s, note.id) == set()
