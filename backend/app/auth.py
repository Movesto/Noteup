import os
import uuid
from datetime import timedelta
from typing import Optional

import bcrypt
import jwt

from app.models import utcnow

_DEV_SECRET = "amor-dev-secret-change-in-production"
SECRET_KEY = os.environ.get("JWT_SECRET", _DEV_SECRET)
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

# In production, refuse to start with the insecure development default.
_ENV = (os.environ.get("ENV") or os.environ.get("NODE_ENV") or "").lower()
if _ENV in ("production", "prod") and SECRET_KEY == _DEV_SECRET:
    raise RuntimeError(
        "JWT_SECRET must be set to a secure value in production "
        "(the development default is not allowed)."
    )


# bcrypt only considers the first 72 *bytes* of a password and (as of bcrypt
# 5.x) raises ValueError on anything longer. We truncate to 72 bytes on both the
# hash and verify paths so a long passphrase is accepted instead of 500-ing.
# This matters here in particular: the limit is in bytes, and a single Arabic
# character is 2 UTF-8 bytes, so even a fairly short Arabic passphrase can exceed
# it. Truncating identically on both sides keeps hashing and checking consistent.
_BCRYPT_MAX_BYTES = 72


def _bcrypt_bytes(password: str) -> bytes:
    return password.encode()[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_bytes(password), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_bcrypt_bytes(plain), hashed.encode())


def create_token(user_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[uuid.UUID]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
