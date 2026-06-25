"""Multi-tenant isolation: one user must never read another user's data."""

import uuid

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.models import Note, NoteLink, User

schema = strawberry.Schema(query=Query, mutation=Mutation)


async def _run(query: str, user_id, variables=None):
    result = await schema.execute(
        query, variable_values=variables, context_value={"user_id": user_id}
    )
    assert result.errors is None, result.errors
    return result.data


async def _seed(session_factory):
    """Two users; each owns one note. User A's notes are cross-linked."""
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    a1, a2 = uuid.uuid4(), uuid.uuid4()
    b1 = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(User(id=user_b, email="b@x.com", password_hash="x"))
        s.add(Note(id=a1, title="A-One", content="links [[A-Two]]", user_id=user_a))
        s.add(Note(id=a2, title="A-Two", content="", user_id=user_a))
        s.add(Note(id=b1, title="B-One", content="", user_id=user_b))
        s.add(NoteLink(source_id=a1, target_id=a2))  # A-One -> A-Two
        await s.commit()
    return {"user_a": user_a, "user_b": user_b, "a1": a1, "a2": a2, "b1": b1}


async def test_notes_query_is_per_user(session_factory):
    ids = await _seed(session_factory)
    data = await _run("{ notes { title } }", ids["user_b"])
    titles = {n["title"] for n in data["notes"]}
    assert titles == {"B-One"}  # never sees A's notes


async def test_note_by_id_blocks_other_user(session_factory):
    ids = await _seed(session_factory)
    q = "query($id: ID!) { note(id: $id) { title } }"
    # Owner can read it...
    owner = await _run(q, ids["user_a"], {"id": str(ids["a1"])})
    assert owner["note"]["title"] == "A-One"
    # ...another user cannot.
    other = await _run(q, ids["user_b"], {"id": str(ids["a1"])})
    assert other["note"] is None


async def test_backlinks_blocked_for_other_user(session_factory):
    ids = await _seed(session_factory)
    q = "query($id: ID!) { backlinks(id: $id) { title } }"
    # Owner sees A-One as a backlink of A-Two.
    owner = await _run(q, ids["user_a"], {"id": str(ids["a2"])})
    assert [n["title"] for n in owner["backlinks"]] == ["A-One"]
    # Other user must not learn that A-Two is referenced at all.
    other = await _run(q, ids["user_b"], {"id": str(ids["a2"])})
    assert other["backlinks"] == []


async def test_graph_data_is_per_user(session_factory):
    ids = await _seed(session_factory)
    data = await _run("{ graphData { nodes { name nodeType } } }", ids["user_b"])
    names = {n["name"] for n in data["graphData"]["nodes"]}
    assert names == {"B-One"}  # no A nodes leak in


async def test_anonymous_graph_does_not_leak_owned_notes(session_factory):
    # No token at all: an anonymous graphData request must not expose notes that
    # belong to a user — it sees only unowned rows (here, none).
    await _seed(session_factory)
    data = await _run("{ graphData { nodes { name } } }", None)
    assert data["graphData"]["nodes"] == []


async def test_anonymous_search_does_not_leak_owned_notes(session_factory):
    await _seed(session_factory)
    data = await _run('{ search(keyword: "A-One") { noteTitle } }', None)
    assert data["search"] == []


async def test_malformed_id_returns_null_not_error(session_factory):
    await _seed(session_factory)
    q = "query($id: ID!) { note(id: $id) { title } }"
    data = await _run(q, None, {"id": "not-a-uuid"})
    assert data["note"] is None
