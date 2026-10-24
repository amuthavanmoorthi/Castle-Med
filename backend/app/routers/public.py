"""Public endpoints: menu, availability, booking, self-service cancel, contact."""
from __future__ import annotations

import secrets
import threading
from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import mailer
from ..availability import bookable_dates, day_slots, slot_is_free
from ..catalog import Service, business, raw_catalog, services
from ..config import get_settings
from ..models import ACTIVE_STATUSES, Booking, ContactMessage
from ..schemas import (
    BookingCreate,
    BookingCreated,
    BookingPublic,
    ContactCreate,
    LookupRequest,
    LookupResult,
)
from ..security import DbSession, client_ip, rate_limit
from ..timeutil import fmt_local, utcnow

router = APIRouter(prefix="/api")

# Serialises "check the slot is free, then insert" so two people racing for the
# last therapist cannot both win. Run the API as a single worker process (see
# README); with several workers, move to SELECT ... FOR UPDATE on Postgres/MySQL.
_booking_lock = threading.Lock()

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


def _new_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
        if not db.scalar(select(func.count()).select_from(Booking).where(Booking.code == code)):
            return code


def can_cancel(b: Booking) -> bool:
    cutoff = timedelta(hours=get_settings().cancel_cutoff_hours)
    return b.status in ACTIVE_STATUSES and b.starts_at - utcnow() >= cutoff


def to_public(b: Booking) -> dict:
    return {
        "code": b.code,
        "service_slug": b.service_slug,
        "service_name": b.service_name,
        "minutes": b.minutes,
        "price_cents": b.price_cents,
        "starts_at": b.starts_at,
        "ends_at": b.ends_at,
        "starts_local": fmt_local(b.starts_at),
        "customer_name": b.customer_name,
        "status": b.status,
        "can_cancel": can_cancel(b),
        "cancel_cutoff_hours": get_settings().cancel_cutoff_hours,
    }


def resolve_service(slug: str, minutes: int) -> tuple[Service, int]:
    svc = services().get(slug)
    if svc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown service")
    opt = svc.option(minutes)
    if opt is None:
        raise HTTPException(422, "That duration is not offered for this service")
    return svc, opt.price_cents


def check_date_in_range(d: date) -> None:
    first, last = bookable_dates()
    if not first <= d <= last:
        raise HTTPException(422, "That date is not open for online booking")


def create_booking(db: Session, data: BookingCreate, *, source: str, ip: str, status_: str = "confirmed", enforce_notice: bool = True) -> Booking:
    svc, price = resolve_service(data.service_slug, data.minutes)
    with _booking_lock:
        starts_at = slot_is_free(db, svc, data.minutes, data.date, data.time, enforce_notice=enforce_notice)
        if starts_at is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Sorry, that time was just taken. Please choose another time.")
        b = Booking(
            code=_new_code(db),
            manage_token=secrets.token_urlsafe(32),
            service_slug=svc.slug,
            service_name=svc.name,
            minutes=data.minutes,
            price_cents=price,
            units=svc.units,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=data.minutes),
            customer_name=data.name,
            customer_email=str(data.email).lower(),
            customer_phone=data.phone,
            notes=data.notes.strip(),
            status=status_,
            source=source,
            client_ip=ip,
        )
        db.add(b)
        db.commit()
        db.refresh(b)
    return b


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/catalog")
def catalog() -> dict:
    """Full menu as served to the site (same JSON the frontend bundles)."""
    return raw_catalog()


@router.get("/booking-config")
def booking_config() -> dict:
    s = get_settings()
    first, last = bookable_dates()
    return {
        "first_date": first.isoformat(),
        "last_date": last.isoformat(),
        "slot_interval_minutes": s.slot_interval_minutes,
        "min_notice_minutes": s.min_notice_minutes,
        "cancel_cutoff_hours": s.cancel_cutoff_hours,
        "timezone": s.timezone,
        "phone": business()["phone"],
    }


@router.get("/availability")
def availability(
    service: str = Query(max_length=64),
    minutes: int = Query(gt=0, le=600),
    date_: date = Query(alias="date"),
    db: Session = DbSession,
) -> dict:
    svc, _ = resolve_service(service, minutes)
    check_date_in_range(date_)
    slots = day_slots(db, svc, minutes, date_)
    return {"date": date_.isoformat(), "slots": [{"time": s.time, "available": s.available} for s in slots]}


@router.post("/bookings", status_code=status.HTTP_201_CREATED, response_model=BookingCreated)
def book(data: BookingCreate, request: Request, background: BackgroundTasks, db: Session = DbSession) -> dict:
    if data.website:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not process this request")
    check_date_in_range(data.date)
    ip = client_ip(request)
    rate_limit(db, "booking", ip)
    b = create_booking(db, data, source="online", ip=ip)
    background.add_task(mailer.booking_confirmed, b)
    return {**to_public(b), "manage_token": b.manage_token, "confirmation_email": get_settings().mail_enabled}


@router.post("/bookings/lookup", response_model=LookupResult)
def lookup(data: LookupRequest, request: Request, db: Session = DbSession) -> dict:
    rate_limit(db, "lookup", client_ip(request))
    b = db.scalar(
        select(Booking).where(Booking.code == data.code.strip().upper(), Booking.customer_email == str(data.email).lower())
    )
    if b is None:
        # same message whether the code or the email is wrong
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We could not find a booking with that reference and email")
    return {"manage_token": b.manage_token}


def _by_token(db: Session, token: str) -> Booking:
    b = db.scalar(select(Booking).where(Booking.manage_token == token)) if 20 <= len(token) <= 64 else None
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return b


@router.get("/bookings/manage/{token}", response_model=BookingPublic)
def manage(token: str, db: Session = DbSession) -> dict:
    return to_public(_by_token(db, token))


@router.post("/bookings/manage/{token}/cancel", response_model=BookingPublic)
def cancel(token: str, background: BackgroundTasks, db: Session = DbSession) -> dict:
    b = _by_token(db, token)
    if b.status not in ACTIVE_STATUSES:
        raise HTTPException(status.HTTP_409_CONFLICT, "This booking is no longer active")
    if not can_cancel(b):
        hours = get_settings().cancel_cutoff_hours
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Online cancellation closes {hours} hours before the appointment. Please call us at {business()['phone']}.",
        )
    b.status = "cancelled"
    b.cancelled_at = utcnow()
    db.commit()
    background.add_task(mailer.booking_cancelled, b)
    return to_public(b)


@router.post("/contact", status_code=status.HTTP_201_CREATED)
def contact(data: ContactCreate, request: Request, background: BackgroundTasks, db: Session = DbSession) -> dict:
    if data.website:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not process this request")
    ip = client_ip(request)
    rate_limit(db, "contact", ip)
    m = ContactMessage(name=data.name, email=str(data.email).lower(), phone=data.phone, message=data.message, client_ip=ip)
    db.add(m)
    db.commit()  # saved before any email attempt, so an SMTP failure can't lose it
    background.add_task(mailer.contact_received, m)
    return {"ok": True}
