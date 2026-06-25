import uuid

from app.auth import create_token, decode_token, hash_password, verify_password


# ── Pure functions (no DB) ───────────────────────────────────────────────────

def test_password_hash_roundtrip():
    hashed = hash_password("correct horse")
    assert hashed != "correct horse"
    assert verify_password("correct horse", hashed)
    assert not verify_password("wrong", hashed)


def test_long_password_does_not_raise_and_verifies():
    # Over bcrypt's 72-byte limit (bcrypt 5.x raises rather than truncating).
    # A long passphrase must hash and verify instead of erroring out.
    pw = "a" * 100
    hashed = hash_password(pw)
    assert verify_password(pw, hashed)


def test_long_arabic_password_roundtrips():
    # The 72-byte limit is in bytes: Arabic characters are 2 UTF-8 bytes each,
    # so ~40 characters already exceed it. Must still work end to end.
    pw = "ك" * 50  # 100 bytes
    hashed = hash_password(pw)
    assert verify_password(pw, hashed)


def test_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_token(user_id)
    assert decode_token(token) == user_id


def test_decode_bad_token_returns_none():
    assert decode_token("not-a-real-token") is None
    assert decode_token("") is None


# ── Auth routes ──────────────────────────────────────────────────────────────

async def test_register_and_login_happy_path(client):
    reg = await client.post(
        "/auth/register", json={"email": "A@Example.com ", "password": "supersecret"}
    )
    assert reg.status_code == 200, reg.text
    body = reg.json()
    assert body["email"] == "a@example.com"  # normalized (lowercased/stripped)
    assert body["token"]

    login = await client.post(
        "/auth/login", json={"email": "a@example.com", "password": "supersecret"}
    )
    assert login.status_code == 200
    assert login.json()["email"] == "a@example.com"


async def test_register_rejects_short_password(client):
    resp = await client.post(
        "/auth/register", json={"email": "b@example.com", "password": "short"}
    )
    assert resp.status_code == 400


async def test_register_rejects_malformed_email(client):
    resp = await client.post(
        "/auth/register", json={"email": "not-an-email", "password": "supersecret"}
    )
    assert resp.status_code == 422  # pydantic EmailStr validation


async def test_register_rejects_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "supersecret"}
    assert (await client.post("/auth/register", json=payload)).status_code == 200
    second = await client.post("/auth/register", json=payload)
    assert second.status_code == 400


async def test_login_wrong_password(client):
    await client.post(
        "/auth/register", json={"email": "c@example.com", "password": "supersecret"}
    )
    resp = await client.post(
        "/auth/login", json={"email": "c@example.com", "password": "nope-nope-nope"}
    )
    assert resp.status_code == 401


async def test_has_users_toggles(client):
    before = await client.get("/auth/has-users")
    assert before.json() == {"hasUsers": False}

    await client.post(
        "/auth/register", json={"email": "d@example.com", "password": "supersecret"}
    )
    after = await client.get("/auth/has-users")
    assert after.json() == {"hasUsers": True}
