import asyncio
import os
from pathlib import Path

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://amor:changeme@localhost:5432/amor_db",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def _alembic_config():
    from alembic.config import Config

    cfg = Config(str(_ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
    return cfg


_BASELINE_REVISION = "0001_initial"


def _upgrade_head() -> None:
    from alembic import command

    command.upgrade(_alembic_config(), "head")


def _stamp_baseline() -> None:
    from alembic import command

    command.stamp(_alembic_config(), _BASELINE_REVISION)


async def apply_migrations() -> None:
    """Bring the database schema up to date via Alembic.

    A pre-Alembic database (tables already present, but no ``alembic_version``
    table) is stamped to the *baseline* revision — its schema matches that
    baseline — and then upgraded, so it adopts later migrations without
    re-creating or losing data. Everything else just upgrades to head.

    Alembic uses a synchronous-style API, so it runs in a worker thread to avoid
    nesting event loops inside the async startup.
    """
    async with engine.begin() as conn:
        has_version = await conn.run_sync(
            lambda c: inspect(c).has_table("alembic_version")
        )
        has_legacy_schema = await conn.run_sync(
            lambda c: inspect(c).has_table("note")
        )

    loop = asyncio.get_running_loop()
    if has_legacy_schema and not has_version:
        await loop.run_in_executor(None, _stamp_baseline)
    await loop.run_in_executor(None, _upgrade_head)
