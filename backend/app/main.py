import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import select

from app import database
from app.auth import decode_token
from app.database import apply_migrations
from app.models import User
from app.routes.auth import router as auth_router
from app.routes.imports import router as import_router
from app.graphql.schema import build_graphql_router


async def get_context(request: Request):
    """Resolve the request's user.

    A *missing* Authorization header is anonymous access (``user_id`` None). A
    *present* token that fails to decode, or that decodes to a user who no
    longer exists (e.g. the database was reset while a browser kept an old
    session), is a stale credential: we flag it as ``auth_invalid`` so resolvers
    reject it cleanly instead of letting writes fail with a foreign-key error.
    """
    user_id = None
    auth_invalid = False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        user_id = decode_token(auth[7:])
        if user_id is None:
            auth_invalid = True  # token present but malformed/expired
        else:
            async with database.AsyncSessionLocal() as session:
                exists = (await session.execute(
                    select(User.id).where(User.id == user_id)
                )).first() is not None
            if not exists:
                user_id, auth_invalid = None, True  # stale token: user is gone
    return {"user_id": user_id, "auth_invalid": auth_invalid}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await apply_migrations()
    yield


app = FastAPI(title="Second Brain API", lifespan=lifespan)
Instrumentator().instrument(app).expose(app)

_cors_origins = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(import_router)
app.include_router(build_graphql_router(get_context), prefix="/graphql")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
