"""Soft-delete (trash): deleting moves to trash, folders cascade, restore/purge."""

import uuid

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.models import Folder, Note, User

schema = strawberry.Schema(query=Query, mutation=Mutation)


async def _run(query: str, user_id, variables=None):
    result = await schema.execute(
        query, variable_values=variables, context_value={"user_id": user_id}
    )
    assert result.errors is None, result.errors
    return result.data


async def _seed(session_factory):
    """A folder with a child folder; a note in each, plus one unfiled note."""
    user = uuid.uuid4()
    parent, child = uuid.uuid4(), uuid.uuid4()
    n_parent, n_child, n_loose = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user, email="u@x.com", password_hash="x"))
        s.add(Folder(id=parent, name="Parent", user_id=user))
        s.add(Folder(id=child, name="Child", parent_id=parent, user_id=user))
        s.add(Note(id=n_parent, title="InParent", folder_id=parent, user_id=user))
        s.add(Note(id=n_child, title="InChild", folder_id=child, user_id=user))
        s.add(Note(id=n_loose, title="Loose", user_id=user))
        await s.commit()
    return {
        "user": user, "parent": parent, "child": child,
        "n_parent": n_parent, "n_child": n_child, "n_loose": n_loose,
    }


async def test_delete_note_moves_to_trash_not_gone(session_factory):
    ids = await _seed(session_factory)
    await _run(
        "mutation($id: ID!){ deleteNote(id: $id) }", ids["user"], {"id": str(ids["n_loose"])}
    )
    # Hidden from the normal listing...
    notes = await _run("{ notes { title } }", ids["user"])
    assert "Loose" not in {n["title"] for n in notes["notes"]}
    # ...but present in the trash.
    trash = await _run("{ trash { notes { title } folders { name } } }", ids["user"])
    assert {n["title"] for n in trash["trash"]["notes"]} == {"Loose"}


async def test_delete_folder_cascades_into_trash(session_factory):
    ids = await _seed(session_factory)
    await _run(
        "mutation($id: ID!){ deleteFolder(id: $id) }", ids["user"], {"id": str(ids["parent"])}
    )
    trash = await _run("{ trash { notes { title } folders { name } } }", ids["user"])
    # Both folders and both contained notes land in the trash; the loose note stays.
    assert {f["name"] for f in trash["trash"]["folders"]} == {"Parent", "Child"}
    assert {n["title"] for n in trash["trash"]["notes"]} == {"InParent", "InChild"}
    folders = await _run("{ folders { name } }", ids["user"])
    assert folders["folders"] == []


async def test_restore_folder_brings_back_the_batch(session_factory):
    ids = await _seed(session_factory)
    await _run(
        "mutation($id: ID!){ deleteFolder(id: $id) }", ids["user"], {"id": str(ids["parent"])}
    )
    await _run(
        "mutation($ids: [ID!]!){ restoreFolders(ids: $ids) }",
        ids["user"], {"ids": [str(ids["parent"])]},
    )
    folders = await _run("{ folders { name } }", ids["user"])
    assert {f["name"] for f in folders["folders"]} == {"Parent", "Child"}
    notes = await _run("{ notes { title } }", ids["user"])
    assert {"InParent", "InChild"} <= {n["title"] for n in notes["notes"]}
    trash = await _run("{ trash { notes { title } folders { name } } }", ids["user"])
    assert trash["trash"]["folders"] == [] and trash["trash"]["notes"] == []


async def test_purge_permanently_removes(session_factory):
    ids = await _seed(session_factory)
    await _run(
        "mutation($id: ID!){ deleteFolder(id: $id) }", ids["user"], {"id": str(ids["parent"])}
    )
    await _run(
        "mutation($ids: [ID!]!){ purgeFolders(ids: $ids) }",
        ids["user"], {"ids": [str(ids["parent"])]},
    )
    trash = await _run("{ trash { notes { title } folders { name } } }", ids["user"])
    assert trash["trash"]["folders"] == [] and trash["trash"]["notes"] == []
    # Gone for good: the rows no longer exist.
    async with session_factory() as s:
        assert await s.get(Folder, ids["parent"]) is None
        assert await s.get(Note, ids["n_child"]) is None


async def test_empty_trash_clears_everything(session_factory):
    ids = await _seed(session_factory)
    await _run(
        "mutation($ids: [ID!]!){ deleteNotes(ids: $ids) }",
        ids["user"], {"ids": [str(ids["n_loose"])]},
    )
    await _run(
        "mutation($id: ID!){ deleteFolder(id: $id) }", ids["user"], {"id": str(ids["child"])}
    )
    await _run("mutation{ emptyTrash }", ids["user"])
    trash = await _run("{ trash { notes { title } folders { name } } }", ids["user"])
    assert trash["trash"]["folders"] == [] and trash["trash"]["notes"] == []
