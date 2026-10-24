"""Client IP, rate limiting and admin authentication."""
from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_session
from .models import RateEvent
from .timeutil import utcnow

ALGO = "HS256"
_bearer = HTTPBearer(auto_error=False)


def client_ip(request: Request) -> str:
    if get_settings().trust_proxy:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def rate_limit(db: Session, name: str, ip: str) -> None:
    """Raise 429 when `ip` has used up its allowance for `name`; else record one."""
    limit, window = get_settings().rate_limits[name]
    key = f"{name}:{ip}"
    since = utcnow() - timedelta(seconds=window)
    used = db.scalar(select(func.count()).select_from(RateEvent).where(RateEvent.key == key, RateEvent.created_at >= since))
    if used >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please try again later or call us.")
    db.add(RateEvent(key=key))
    # opportunistic cleanup keeps the table small without a cron job
    db.execute(delete(RateEvent).where(RateEvent.created_at < utcnow() - timedelta(days=2)))
    db.commit()


def issue_admin_token() -> tuple[str, datetime]:
    s = get_settings()
    # Real wall clock, not utcnow(): PyJWT checks exp against time.time().
    exp = datetime.now(timezone.utc) + timedelta(hours=s.admin_token_hours)
    token = jwt.encode({"sub": "admin", "exp": exp}, s.secret_key, algorithm=ALGO)
    return token, exp


def check_admin_password(candidate: str) -> bool:
    expected = get_settings().admin_password
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Admin login is not configured on this server")
    return hmac.compare_digest(candidate.encode(), expected.encode())


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    try:
        # jwt.decode verifies the signature AND the exp claim
        payload = jwt.decode(creds.credentials, get_settings().secret_key, algorithms=[ALGO], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please sign in again")
    if payload.get("sub") != "admin":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")


DbSession = Depends(get_session)
