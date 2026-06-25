"""Stale/invalid credentials are rejected instead of causing FK-violation 500s."""

import uuid

import pytest
import strawberry
from graphql import GraphQLError

from app.auth import create_token
from app.graphql.queries import Query
from app.graphql.types import get_user_id
from app.main import get_context
from app.models import User


class _FakeRequest:
    def __init__(self, authorization: str = ""):
        self.headers = {"Authorization": authorization} if authorization else {}


def _info(context):
    class _Info:
        pass
    info = _Info()
    info.context = context
    return info


def test_get_user_id_rejects_invalid_auth():
    with pytest.raises(GraphQLError):
        get_user_id(_info({"user_id": None, "auth_invalid": True}))


def test_get_user_id_allows_anonymous():
    # No token at all is anonymous access, not an error.
    assert get_user_id(_info({"user_id": None, "auth_invalid": False})) is None


async def test_context_anonymous_when_no_token(session_factory):
    ctx = await get_context(_FakeRequest())
    assert ctx == {"user_id": None, "auth_invalid": False}


async def test_context_valid_for_existing_user(session_factory):
    uid = uuid.uuid4()
    async with session_factory() as s:
        s.add(User(id=uid, email="u@x.com", password_hash="x"))
        await s.commit()
    ctx = await get_context(_FakeRequest(f"Bearer {create_token(uid)}"))
    assert ctx == {"user_id": uid, "auth_invalid": False}


async def test_context_flags_stale_token_for_missing_user(session_factory):
    # A well-formed token for a user that isn't in the DB (e.g. DB was reset).
    ghost = uuid.uuid4()
    ctx = await get_context(_FakeRequest(f"Bearer {create_token(ghost)}"))
    assert ctx == {"user_id": None, "auth_invalid": True}


async def test_context_flags_malformed_token(session_factory):
    ctx = await get_context(_FakeRequest("Bearer not-a-real-token"))
    assert ctx == {"user_id": None, "auth_invalid": True}


async def test_graphql_http_stale_token_returns_clean_error(client):
    """Over HTTP, a stale token yields 200 + an UNAUTHENTICATED error, not a 500."""
    token = create_token(uuid.uuid4())  # valid signature, user not in DB
    resp = await client.post(
        "/graphql",
        json={"query": 'mutation { createFolder(name: "X") { id } }'},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("data") is None or body["data"].get("createFolder") is None
    assert any("UNAUTHENTICATED" in e["message"] for e in body["errors"])


async def test_mutation_with_stale_token_errors_not_crashes(session_factory):
    """A create mutation under a stale token returns a clean auth error."""
    schema = strawberry.Schema(query=Query, mutation=__import__(
        "app.graphql.mutations", fromlist=["Mutation"]).Mutation)
    result = await schema.execute(
        'mutation { createFolder(name: "X") { id } }',
        context_value={"user_id": None, "auth_invalid": True},
    )
    assert result.errors is not None
    assert "UNAUTHENTICATED" in result.errors[0].message
