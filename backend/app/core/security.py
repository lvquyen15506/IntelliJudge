# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
from datetime import datetime, timedelta, timezone
from typing import Any, Union
import bcrypt
import jwt
from app.core.config import settings


import hashlib

def _pre_hash_password(password: str) -> bytes:
    """Bam password bang SHA-256 truoc de tranh loi bcrypt 72-byte limit"""
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xac thuc mat khau goc voi mat khau da duoc bam"""
    if not plain_password or not hashed_password:
        return False
    try:
        password_bytes = _pre_hash_password(plain_password)
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Bam mat khau bang bcrypt voi sha256 pre-hashing"""
    password_bytes = _pre_hash_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Tao JWT Access Token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

