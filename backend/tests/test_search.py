"""Keyword search: diacritic-insensitive matching, scoping, sentence extraction."""

import uuid

from app.models import Note, User
from app.utils.note_search import keyword_search


async def _seed(session_factory, notes):
    """notes: list of (title, content[, deleted]) for one user. Returns (factory-bound) user_id."""
    user_id = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_id, email=f"{user_id}@x.com", password_hash="x"))
        for spec in notes:
            title, content = spec[0], spec[1]
            deleted = spec[2] if len(spec) > 2 else None
            s.add(Note(id=uuid.uuid4(), title=title, content=content,
                       user_id=user_id, deleted_at=deleted))
        await s.commit()
    return user_id


def _titles(results):
    return {r["note_title"] for r in results}


async def test_finds_arabic_match_ignoring_tashkeel(session_factory):
    """The core fix: searching without diacritics finds text written with them."""
    uid = await _seed(session_factory, [
        ("Tawhid", "<p>هذا اللَّه عظيم.</p>"),   # content carries tashkeel
    ])
    results = await _run(session_factory, "الله", uid)
    assert _titles(results) == {"Tawhid"}
    assert results[0]["sentences"] == ["هذا اللَّه عظيم."]


async def test_finds_tashkeel_query_against_plain_text(session_factory):
    """Symmetric: a query that carries diacritics still matches plain content."""
    uid = await _seed(session_factory, [("N", "<p>الله اكبر.</p>")])
    results = await _run(session_factory, "اللَّه", uid)
    assert _titles(results) == {"N"}


async def test_case_and_accent_insensitive_latin(session_factory):
    uid = await _seed(session_factory, [("Coffee", "<p>I love Café au lait.</p>")])
    results = await _run(session_factory, "cafe", uid)
    assert _titles(results) == {"Coffee"}


async def test_returns_only_matching_sentences(session_factory):
    uid = await _seed(session_factory, [
        ("Doc", "<p>First about cats. Second about dogs. Third about cats again.</p>"),
    ])
    results = await _run(session_factory, "cats", uid)
    assert results[0]["sentences"] == ["First about cats.", "Third about cats again."]


async def test_title_only_match_returns_note_with_empty_sentences(session_factory):
    uid = await _seed(session_factory, [("Tawhid notes", "<p>nothing relevant here.</p>")])
    results = await _run(session_factory, "tawhid", uid)
    assert _titles(results) == {"Tawhid notes"}
    assert results[0]["sentences"] == []


async def test_unlinked_note_is_found(session_factory):
    """No graph link needed — the old BFS made connectivity matter; it must not."""
    uid = await _seed(session_factory, [("Lonely", "<p>orphan keyword zebra here.</p>")])
    results = await _run(session_factory, "zebra", uid)
    assert _titles(results) == {"Lonely"}


async def test_trashed_notes_excluded(session_factory):
    from app.models import utcnow
    uid = await _seed(session_factory, [
        ("Live", "<p>keep this apple.</p>"),
        ("Trashed", "<p>deleted apple.</p>", utcnow()),
    ])
    results = await _run(session_factory, "apple", uid)
    assert _titles(results) == {"Live"}


async def test_scoped_to_user(session_factory):
    # Two users each own a note containing the keyword; search sees only its own.
    uid_a = await _seed(session_factory, [("A", "<p>shared term grapefruit.</p>")])
    uid_b = await _seed(session_factory, [("B", "<p>shared term grapefruit.</p>")])
    results = await _run(session_factory, "grapefruit", uid_a)
    assert _titles(results) == {"A"}


async def test_anonymous_search_does_not_span_users(session_factory):
    # An anonymous caller (user_id=None) must not see any owned note — only
    # unowned (user_id IS NULL) ones, matching the canonical listing scope.
    await _seed(session_factory, [("Owned", "<p>secret pineapple here.</p>")])
    results = await _run(session_factory, "pineapple", None)
    assert results == []


async def test_no_match_returns_empty(session_factory):
    uid = await _seed(session_factory, [("N", "<p>nothing here.</p>")])
    assert await _run(session_factory, "absent", uid) == []


async def test_blank_keyword_returns_empty(session_factory):
    uid = await _seed(session_factory, [("N", "<p>content.</p>")])
    assert await _run(session_factory, "   ", uid) == []


# --- helper -----------------------------------------------------------------

async def _run(session_factory, keyword, user_id):
    async with session_factory() as s:
        return await keyword_search(keyword, s, user_id)
