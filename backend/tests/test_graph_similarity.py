"""graph_data exposes 'similar' edges, scoped per user and de-duped vs wiki-links."""

import uuid

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.models import Folder, Note, NoteLink, User

schema = strawberry.Schema(query=Query, mutation=Mutation)


async def _run(query: str, user_id):
    result = await schema.execute(query, context_value={"user_id": user_id})
    assert result.errors is None, result.errors
    return result.data


def _links_edge_set(links, edge_type):
    return {
        frozenset((e["source"], e["target"]))
        for e in links
        if e["edgeType"] == edge_type
    }


def _edge_set(data, edge_type):
    return _links_edge_set(data["graphData"]["links"], edge_type)


async def _seed(session_factory, notes, links=()):
    user_id = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_id, email=f"{user_id}@x.com", password_hash="x"))
        for nid, title, content in notes:
            s.add(Note(id=nid, title=title, content=content, user_id=user_id))
        for src, tgt in links:
            s.add(NoteLink(source_id=src, target_id=tgt))
        await s.commit()
    return user_id


QUERY = "{ graphData { links { source target edgeType } } }"


async def test_similar_topic_edge_is_emitted(session_factory):
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    uid = await _seed(session_factory, [
        (a, "Tawhid", "tawhid is the oneness of God, the core of faith"),
        (b, "Oneness", "the oneness of God, tawhid, is the heart of faith"),
        (c, "Sourdough", "bake sourdough bread with flour, water and salt"),
    ])
    similar = _edge_set(await _run(QUERY, uid), "similar")
    assert frozenset((str(a), str(b))) in similar
    assert frozenset((str(a), str(c))) not in similar


async def test_similar_edge_not_duplicated_when_wiki_linked(session_factory):
    # Two notes both topically similar AND explicitly wiki-linked should show a
    # single wiki-link edge, not also a redundant 'similar' one.
    a, b = uuid.uuid4(), uuid.uuid4()
    uid = await _seed(
        session_factory,
        [
            (a, "Tawhid", "tawhid is the oneness of God, the core of faith [[Oneness]]"),
            (b, "Oneness", "the oneness of God, tawhid, is the heart of faith"),
        ],
        links=[(a, b)],
    )
    data = await _run(QUERY, uid)
    assert frozenset((str(a), str(b))) in _edge_set(data, "wikilink")
    assert frozenset((str(a), str(b))) not in _edge_set(data, "similar")


FOLDER_QUERY = (
    "query($id: ID!) { folderGraph(id: $id) { "
    "links { source target edgeType } } }"
)


async def _folder_graph(folder_id, user_id):
    result = await schema.execute(
        FOLDER_QUERY,
        variable_values={"id": str(folder_id)},
        context_value={"user_id": user_id},
    )
    assert result.errors is None, result.errors
    return result.data["folderGraph"]["links"]


async def _seed_folder(session_factory, folder_id, notes, links=()):
    """Seed a user with one folder containing ``notes`` (id, title, content)."""
    user_id = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_id, email=f"{user_id}@x.com", password_hash="x"))
        s.add(Folder(id=folder_id, name="Aqeedah", user_id=user_id))
        for nid, title, content in notes:
            s.add(Note(id=nid, title=title, content=content,
                       folder_id=folder_id, user_id=user_id))
        for src, tgt in links:
            s.add(NoteLink(source_id=src, target_id=tgt))
        await s.commit()
    return user_id


async def test_folder_graph_emits_similar_edge_between_folder_notes(session_factory):
    folder = uuid.uuid4()
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    uid = await _seed_folder(session_factory, folder, [
        (a, "Tawhid", "tawhid is the oneness of God, the core of faith"),
        (b, "Oneness", "the oneness of God, tawhid, is the heart of faith"),
        (c, "Sourdough", "bake sourdough bread with flour, water and salt"),
    ])
    similar = _links_edge_set(await _folder_graph(folder, uid), "similar")
    assert frozenset((str(a), str(b))) in similar
    assert frozenset((str(a), str(c))) not in similar


async def test_folder_graph_similar_edge_not_duplicated_when_wiki_linked(session_factory):
    folder = uuid.uuid4()
    a, b = uuid.uuid4(), uuid.uuid4()
    uid = await _seed_folder(
        session_factory,
        folder,
        [
            (a, "Tawhid", "tawhid is the oneness of God, the core of faith [[Oneness]]"),
            (b, "Oneness", "the oneness of God, tawhid, is the heart of faith"),
        ],
        links=[(a, b)],
    )
    links = await _folder_graph(folder, uid)
    assert frozenset((str(a), str(b))) in _links_edge_set(links, "wikilink")
    assert frozenset((str(a), str(b))) not in _links_edge_set(links, "similar")
