import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth import create_token, hash_password, verify_password
from app.database import AsyncSessionLocal
from app.models import Folder, Note, User

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    # EmailStr rejects malformed addresses (returning a 422) before any DB work;
    # the route still lower()s the value since EmailStr lowercases only the domain.
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str


@router.post("/register", response_model=AuthResponse)
async def register(req: AuthRequest):
    email = req.email.lower().strip()
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Determine whether this is the very first user before inserting.
        is_first_user = (
            await session.execute(select(User.id).limit(1))
        ).first() is None

        user = User(email=email, password_hash=hash_password(req.password))
        session.add(user)

        try:
            await session.flush()
        except IntegrityError:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Only the first user claims pre-existing unowned notes and folders.
        if is_first_user:
            await session.execute(
                Note.__table__.update()
                .where(Note.user_id == None)  # noqa: E711
                .values(user_id=user.id)
            )
            await session.execute(
                Folder.__table__.update()
                .where(Folder.user_id == None)  # noqa: E711
                .values(user_id=user.id)
            )

        await session.commit()
        await session.refresh(user)

    return AuthResponse(token=create_token(user.id), email=user.email)


@router.post("/login", response_model=AuthResponse)
async def login(req: AuthRequest):
    email = req.email.lower().strip()

    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthResponse(token=create_token(user.id), email=user.email)


@router.get("/has-users")
async def has_users():
    async with AsyncSessionLocal() as session:
        count = (await session.execute(select(User))).scalars().first()
    return {"hasUsers": count is not None}
