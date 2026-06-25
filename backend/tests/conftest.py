"""Shared test fixtures.

Tests run against an in-memory SQLite database (shared across sessions via a
StaticPool) instead of Postgres. We override the app's ``AsyncSessionLocal`` in
every module that imported it so all DB access flows through the test database.
The one remaining Postgres-only query path (``note_by_title`` uses ``JSONB``)
is exercised by seeding rows directly through the session instead.
"""

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

import app.database as database_mod
import app.routes.auth as auth_routes_mod


@pytest_asyncio.fixture
async def session_factory(monkeypatch):
    """In-memory SQLite session factory, patched in everywhere it's used."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Ensure all tables are registered on SQLModel.metadata before create_all.
    from app.models import Folder, Note, NoteLink, User  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    # The GraphQL resolvers reference database.AsyncSessionLocal by attribute, so
    # patching it here is enough; auth routes keep their own imported binding.
    monkeypatch.setattr(database_mod, "AsyncSessionLocal", factory)
    monkeypatch.setattr(auth_routes_mod, "AsyncSessionLocal", factory)

    yield factory

    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_factory):
    """HTTP client bound to the FastAPI app (lifespan/startup not triggered)."""
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
