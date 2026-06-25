"""graphData 'related' edges: folders connect when their notes wiki-link."""

import uuid

import strawberry

from app.graphql.queries import Query
from app.models import Folder, Note, NoteLink, User

schema = strawberry.Schema(query=Query)


async def _graph(user_id):
    result = await schema.execute(
        "{ graphData { links { source target edgeType } } }",
        context_value={"user_id": user_id},
    )
    assert result.errors is None, result.errors
    return result.data["graphData"]["links"]


def _related(links):
    return {
        frozenset((e["source"], e["target"]))
        for e in links if e["edgeType"] == "related"
    }


async def _seed_two_folders(session_factory, *, same_folder=False, user_b_owns=False):
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    fa, fb = uuid.uuid4(), uuid.uuid4()
    na, nb = uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(User(id=user_b, email="b@x.com", password_hash="x"))
        owner = user_b if user_b_owns else user_a
        s.add(Folder(id=fa, name="Aqeedah", user_id=owner))
        s.add(Folder(id=fb, name="Fiqh", user_id=owner))
        nb_folder = fa if same_folder else fb
        s.add(Note(id=na, title="A", content="[[B]]", folder_id=fa, user_id=owner))
        s.add(Note(id=nb, title="B", content="", folder_id=nb_folder, user_id=owner))
        s.add(NoteLink(source_id=na, target_id=nb))
        await s.commit()
    return {"user_a": user_a, "user_b": user_b, "fa": str(fa), "fb": str(fb)}


async def test_cross_folder_link_creates_related_edge(session_factory):
    ids = await _seed_two_folders(session_factory)
    links = await _graph(ids["user_a"])
    assert _related(links) == {frozenset((ids["fa"], ids["fb"]))}


async def test_same_folder_link_creates_no_related_edge(session_factory):
    ids = await _seed_two_folders(session_factory, same_folder=True)
    links = await _graph(ids["user_a"])
    assert _related(links) == set()


async def test_related_edges_are_per_user(session_factory):
    # Folders/notes belong to user_b; user_a's graph must show no related edges.
    ids = await _seed_two_folders(session_factory, user_b_owns=True)
    links = await _graph(ids["user_a"])
    assert links == []


async def _folder_graph(folder_id, user_id):
    result = await schema.execute(
        "query($id: ID!) { folderGraph(id: $id) { "
        "nodes { id nodeType } links { source target edgeType } } }",
        variable_values={"id": str(folder_id)},
        context_value={"user_id": user_id},
    )
    assert result.errors is None, result.errors
    return result.data["folderGraph"]


async def test_folder_graph_relates_to_external_folder(session_factory):
    """folderGraph mirrors the global graph: a related edge to the linked folder."""
    user_a = uuid.uuid4()
    fa, fb = uuid.uuid4(), uuid.uuid4()
    na, nb = uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Folder(id=fa, name="Aqeedah", user_id=user_a))
        s.add(Folder(id=fb, name="Fiqh", user_id=user_a))
        s.add(Note(id=na, title="A", content="[[B]]", folder_id=fa, user_id=user_a))
        s.add(Note(id=nb, title="B", content="", folder_id=fb, user_id=user_a))
        s.add(NoteLink(source_id=na, target_id=nb))
        await s.commit()

    data = await _folder_graph(fa, user_a)
    # The external folder appears as a node...
    assert any(
        n["id"] == str(fb) and n["nodeType"] == "folder-external" for n in data["nodes"]
    )
    # ...joined by a single related edge from the focused folder.
    related = _related(data["links"])
    assert related == {frozenset((str(fa), str(fb)))}


async def test_folder_graph_subfolder_link_is_not_related(session_factory):
    """A link into the folder's own subfolder stays structural, not 'related'."""
    user_a = uuid.uuid4()
    parent, child = uuid.uuid4(), uuid.uuid4()
    np_, nc = uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Folder(id=parent, name="Parent", user_id=user_a))
        s.add(Folder(id=child, name="Child", parent_id=parent, user_id=user_a))
        s.add(Note(id=np_, title="P", content="[[C]]", folder_id=parent, user_id=user_a))
        s.add(Note(id=nc, title="C", content="", folder_id=child, user_id=user_a))
        s.add(NoteLink(source_id=np_, target_id=nc))
        await s.commit()

    data = await _folder_graph(parent, user_a)
    assert _related(data["links"]) == set()


async def test_duplicate_cross_folder_links_collapse_to_one_edge(session_factory):
    """Multiple notes linking across the same two folders yield a single edge."""
    user_a = uuid.uuid4()
    fa, fb = uuid.uuid4(), uuid.uuid4()
    a1, a2, b1, b2 = (uuid.uuid4() for _ in range(4))
    async with session_factory() as s:
        s.add(User(id=user_a, email="a@x.com", password_hash="x"))
        s.add(Folder(id=fa, name="Aqeedah", user_id=user_a))
        s.add(Folder(id=fb, name="Fiqh", user_id=user_a))
        s.add(Note(id=a1, title="A1", content="", folder_id=fa, user_id=user_a))
        s.add(Note(id=a2, title="A2", content="", folder_id=fa, user_id=user_a))
        s.add(Note(id=b1, title="B1", content="", folder_id=fb, user_id=user_a))
        s.add(Note(id=b2, title="B2", content="", folder_id=fb, user_id=user_a))
        s.add(NoteLink(source_id=a1, target_id=b1))
        s.add(NoteLink(source_id=a2, target_id=b2))  # second cross-folder link
        await s.commit()
    links = await _graph(user_a)
    assert _related(links) == {frozenset((str(fa), str(fb)))}
