"""Runtime settings, read from environment variables (see .env.example).

Every value has a safe local-development default except the secrets, which are
deliberately left empty: an unset ADMIN_PASSWORD disables admin login rather
than falling back to a guessable default.
"""
from __future__ import annotations

import logging
import os
import secrets
from dataclasses import dataclass, field
from datetime import time
from functools import lru_cache

log = logging.getLogger("castle")


def _load_dotenv() -> None:
    """Read backend/.env into os.environ (real env vars win). Keeps local dev
    one-command without adding python-dotenv as a dependency."""
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


if not os.environ.get("CASTLE_SKIP_DOTENV"):
    _load_dotenv()


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _int(name: str, default: int) -> int:
    raw = _env(name)
    return int(raw) if raw else default


def _bool(name: str, default: bool) -> bool:
    raw = _env(name).lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _clock(name: str, default: str) -> time:
    """Parse HH:MM. "24:00" is accepted as end-of-day and stored as time.max."""
    raw = _env(name, default)
    if raw == "24:00":
        return time.max
    hh, mm = raw.split(":")
    return time(int(hh), int(mm))


@dataclass(frozen=True)
class Settings:
    database_url: str
    timezone: str
    open_time: time
    close_time: time
    slot_interval_minutes: int
    capacity_units: int
    min_notice_minutes: int
    booking_horizon_days: int
    cancel_cutoff_hours: int
    site_url: str
    cors_origins: list[str]
    trust_proxy: bool
    admin_password: str
    secret_key: str
    admin_token_hours: int
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_from: str
    smtp_starttls: bool
    notify_email: str
    rate_limits: dict[str, tuple[int, int]] = field(default_factory=dict)

    @property
    def mail_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)


@lru_cache
def get_settings() -> Settings:
    secret = _env("SECRET_KEY")
    if not secret:
        # Tokens signed with a per-process key stop working on restart, which is
        # fine for development and a loud signal in production.
        secret = secrets.token_urlsafe(48)
        log.warning("SECRET_KEY is not set - admin sessions will not survive a restart")
    elif len(secret) < 32:
        log.warning("SECRET_KEY is shorter than 32 characters - use a longer random value")

    origins = [o.strip() for o in _env("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

    return Settings(
        database_url=_env("DATABASE_URL", "sqlite:///./castle.db"),
        timezone=_env("TIMEZONE", "America/Los_Angeles"),
        open_time=_clock("OPEN_TIME", "10:00"),
        close_time=_clock("CLOSE_TIME", "22:00"),
        slot_interval_minutes=_int("SLOT_INTERVAL_MINUTES", 30),
        capacity_units=_int("CAPACITY_UNITS", 4),
        min_notice_minutes=_int("MIN_NOTICE_MINUTES", 120),
        booking_horizon_days=_int("BOOKING_HORIZON_DAYS", 60),
        cancel_cutoff_hours=_int("CANCEL_CUTOFF_HOURS", 12),
        site_url=_env("SITE_URL", "http://localhost:5173").rstrip("/"),
        cors_origins=origins,
        trust_proxy=_bool("TRUST_PROXY", False),
        admin_password=_env("ADMIN_PASSWORD"),
        secret_key=secret,
        admin_token_hours=_int("ADMIN_TOKEN_HOURS", 12),
        smtp_host=_env("SMTP_HOST"),
        smtp_port=_int("SMTP_PORT", 587),
        smtp_user=_env("SMTP_USER"),
        smtp_password=_env("SMTP_PASSWORD"),
        smtp_from=_env("SMTP_FROM"),
        smtp_starttls=_bool("SMTP_STARTTLS", True),
        notify_email=_env("NOTIFY_EMAIL"),
        # name -> (max events, window seconds), counted per client IP
        rate_limits={
            "booking": (_int("RATE_BOOKING_PER_HOUR", 6), 3600),
            "contact": (_int("RATE_CONTACT_PER_HOUR", 5), 3600),
            "lookup": (_int("RATE_LOOKUP_PER_HOUR", 20), 3600),
            "login": (_int("RATE_LOGIN_PER_15MIN", 10), 900),
        },
    )
