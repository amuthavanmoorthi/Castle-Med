"""Slot generation and capacity checks.

Capacity is counted in "units": each service declares how many therapists it
occupies (a couples massage takes two). A slot is bookable when the units
already committed during that window, plus the new service's units, fit inside
CAPACITY_UNITS, and no staff block overlaps it.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog import Service
from .config import get_settings
from .models import ACTIVE_STATUSES, BlockedTime, Booking
from .timeutil import local_to_utc, local_today, utcnow


@dataclass(frozen=True)
class Slot:
    time: str  # local HH:MM
    starts_at: datetime  # naive UTC
    available: bool


def bookable_dates() -> tuple[date, date]:
    s = get_settings()
    first = local_today()
    return first, first + timedelta(days=s.booking_horizon_days)


def _day_window(d: date) -> tuple[datetime, datetime]:
    s = get_settings()
    return local_to_utc(d, s.open_time), local_to_utc(d, s.close_time)


def _candidate_starts(d: date, minutes: int) -> list[tuple[str, datetime]]:
    s = get_settings()
    opens, closes = _day_window(d)
    step = timedelta(minutes=s.slot_interval_minutes)
    length = timedelta(minutes=minutes)
    out: list[tuple[str, datetime]] = []
    local_open = datetime.combine(d, s.open_time)
    cur, i = opens, 0
    while cur + length <= closes:
        # label from local wall clock so DST days still read 10:00, 10:30, ...
        label = (local_open + step * i).strftime("%H:%M")
        out.append((label, cur))
        cur += step
        i += 1
    return out


def _load_commitments(db: Session, start: datetime, end: datetime):
    bookings = db.execute(
        select(Booking.starts_at, Booking.ends_at, Booking.units).where(
            Booking.status.in_(ACTIVE_STATUSES),
            Booking.starts_at < end,
            Booking.ends_at > start,
        )
    ).all()
    blocks = db.execute(
        select(BlockedTime.starts_at, BlockedTime.ends_at).where(
            BlockedTime.starts_at < end, BlockedTime.ends_at > start
        )
    ).all()
    return bookings, blocks


def _fits(start: datetime, end: datetime, units: int, bookings, blocks) -> bool:
    if any(b_start < end and b_end > start for b_start, b_end in blocks):
        return False
    # Peak concurrent load inside [start, end): load only rises at a booking's
    # start, so it is enough to measure at `start` and at every booking start
    # that falls inside the window.
    points = [start] + [b_start for b_start, _, _ in bookings if start < b_start < end]
    capacity = get_settings().capacity_units
    for p in points:
        load = sum(u for b_start, b_end, u in bookings if b_start <= p < b_end)
        if load + units > capacity:
            return False
    return True


def day_slots(db: Session, service: Service, minutes: int, d: date, *, enforce_notice: bool = True) -> list[Slot]:
    candidates = _candidate_starts(d, minutes)
    if not candidates:
        return []
    length = timedelta(minutes=minutes)
    window_start = candidates[0][1]
    window_end = candidates[-1][1] + length
    bookings, blocks = _load_commitments(db, window_start, window_end)

    earliest = utcnow() + timedelta(minutes=get_settings().min_notice_minutes) if enforce_notice else utcnow()
    slots = []
    for label, start in candidates:
        ok = start >= earliest and _fits(start, start + length, service.units, bookings, blocks)
        slots.append(Slot(label, start, ok))
    return slots


def slot_is_free(db: Session, service: Service, minutes: int, d: date, hhmm: str, *, enforce_notice: bool = True) -> datetime | None:
    """Return the UTC start if `hhmm` on `d` is a real, currently free slot."""
    for slot in day_slots(db, service, minutes, d, enforce_notice=enforce_notice):
        if slot.time == hhmm:
            return slot.starts_at if slot.available else None
    return None


def parse_hhmm(value: str) -> time:
    hh, mm = value.split(":")
    return time(int(hh), int(mm))
