"""Clock helpers. Everything is stored as naive UTC; local time only exists at
the edges (availability, display). `utcnow` is the single source of "now" so
tests can freeze it."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from .config import get_settings


# Tests set this to pin "now"; production never touches it.
frozen_now: datetime | None = None


def utcnow() -> datetime:
    if frozen_now is not None:
        return frozen_now
    return datetime.now(timezone.utc).replace(tzinfo=None)


def tz() -> ZoneInfo:
    return ZoneInfo(get_settings().timezone)


def local_to_utc(d: date, t: time) -> datetime:
    """Local wall-clock date+time -> naive UTC. time.max means end of day."""
    if t == time.max:
        local = datetime.combine(d + timedelta(days=1), time(0, 0), tz())
    else:
        local = datetime.combine(d, t, tz())
    return local.astimezone(timezone.utc).replace(tzinfo=None)


def utc_to_local(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc).astimezone(tz())


def local_today() -> date:
    return utc_to_local(utcnow()).date()


def fmt_local(dt: datetime) -> str:
    """e.g. 'Saturday, October 25, 2026 at 2:30 PM'"""
    loc = utc_to_local(dt)
    # built by hand: %-d / %-I are glibc/BSD-only and fail on Windows
    hour = loc.hour % 12 or 12
    ampm = "AM" if loc.hour < 12 else "PM"
    return f"{loc:%A}, {loc:%B} {loc.day}, {loc.year} at {hour}:{loc:%M} {ampm}"
