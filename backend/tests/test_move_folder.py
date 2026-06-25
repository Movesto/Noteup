"""moveFolder mutation: re-parenting, root moves, cycle/ownership rejection."""

import uuid

import strawberry

from sqlalchemy import select

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.models import Folder, User

schema = strawberry.Schema(query=Query, mutation=Mutation)

MOVE = "mutation($id: ID!, $parentId: ID) { moveFolder(id: $id, parentId: $parentId) { id parentId } }"


async def _run(query, user_id, variables=None):
    result = await schema.execute(
        query, variable_values=variables, context_value={"user_id": user_id}
    )
    assert result.errors is None, result.errors
    return result.data


async def _parent_id(session_factory, folder_id):
    async with session_factory() as s:
        return (await s.execute(
            select(Folder.parent_id).where(Folder.id == folder_id)
        )).scalar_one()


async def _seed(session_factory):
    """user owns A (root), B (root), C (child of A)."""
    user = uuid.uuid4()
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=user, email="u@x.com", password_hash="x"))
        s.add(Folder(id=a, name="A", user_id=user))
        s.add(Folder(id=b, name="B", user_id=user))
        s.add(Folder(id=c, name="C", parent_id=a, user_id=user))
        await s.commit()
    return {"user": user, "a": a, "b": b, "c": c}


async def test_move_folder_under_another(session_factory):
    ids = await _seed(session_factory)
    data = await _run(MOVE, ids["user"], {"id": str(ids["b"]), "parentId": str(ids["a"])})
    assert data["moveFolder"]["parentId"] == str(ids["a"])
    assert await _parent_id(session_factory, ids["b"]) == ids["a"]


async def test_move_folder_to_root(session_factory):
    ids = await _seed(session_factory)
    data = await _run(MOVE, ids["user"], {"id": str(ids["c"]), "parentId": None})
    assert data["moveFolder"]["parentId"] is None
    assert await _parent_id(session_factory, ids["c"]) is None


async def test_cannot_move_into_self(session_factory):
    ids = await _seed(session_factory)
    data = await _run(MOVE, ids["user"], {"id": str(ids["a"]), "parentId": str(ids["a"])})
    assert data["moveFolder"] is None
    assert await _parent_id(session_factory, ids["a"]) is None  # unchanged


async def test_cannot_move_into_own_descendant(session_factory):
    # Moving A under its child C would create a cycle.
    ids = await _seed(session_factory)
    data = await _run(MOVE, ids["user"], {"id": str(ids["a"]), "parentId": str(ids["c"])})
    assert data["moveFolder"] is None
    assert await _parent_id(session_factory, ids["a"]) is None  # unchanged


async def test_cannot_move_into_another_users_folder(session_factory):
    ids = await _seed(session_factory)
    other = uuid.uuid4()
    other_folder = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=other, email="o@x.com", password_hash="x"))
        s.add(Folder(id=other_folder, name="Other", user_id=other))
        await s.commit()
    data = await _run(MOVE, ids["user"], {"id": str(ids["b"]), "parentId": str(other_folder)})
    assert data["moveFolder"] is None
    assert await _parent_id(session_factory, ids["b"]) is None  # unchanged
