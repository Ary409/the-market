"""
security.py — Hash de contraseñas y JWT.

Hash: bcrypt (estándar actual) para todo hash nuevo. Los hashes antiguos
sha256_crypt siguen verificándose (passlib) y se re-hashean automáticamente
a bcrypt en el siguiente login exitoso (ver routers/auth.py), de modo que la
migración es transparente para los usuarios existentes.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Solo para verificar hashes heredados (sha256_crypt)
_legacy_context = CryptContext(schemes=["sha256_crypt"])

_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith(_BCRYPT_PREFIXES):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False
    # Hash heredado (sha256_crypt)
    try:
        return _legacy_context.verify(plain, hashed)
    except Exception:
        return False


def password_needs_rehash(hashed: str) -> bool:
    """True si el hash usa un esquema heredado y debe migrarse a bcrypt."""
    return not hashed.startswith(_BCRYPT_PREFIXES)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
