"""Staff endpoints. Everything except /login requires a valid admin token."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import mailer
from ..availability import day_slots, parse_hhmm
from ..models import ACTIVE_STATUSES, BlockedTime, Booking, ContactMessage
from ..schemas import (
    BlockCreate,
    BookingStatusUpdate,
    LoginRequest,
    LoginResult,
    MessageStatusUpdate,
    StaffBookingCreate,
)
from ..security import DbSession, check_admin_password, client_ip, issue_admin_token, rate_limit, require_admin
from ..timeutil import fmt_local, local_to_utc, local_today, utc_to_local, utcnow
from .public import create_booking, resolve_service

router = APIRouter(prefix="/api/admin")
guarded = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


def _admin_booking(b: Booking) -> dict:
    return {
        "id": b.id,
        "code": b.code,
        "service_slug": b.service_slug,
        "service_name": b.service_name,
        "minutes": b.minutes,
        "price_cents": b.price_cents,
        "units": b.units,
        "starts_at": b.starts_at,
        "ends_at": b.ends_at,
        "starts_local": fmt_local(b.starts_at),
        "customer_name": b.customer_name,
        "customer_email": b.customer_email,
        "customer_phone": b.customer_phone,
        "notes": b.notes,
        "status": b.status,
        "source": b.source,
        "created_at": b.created_at,
    }


def _local_label(dt) -> str:
    loc = utc_to_local(dt)
    hour = loc.hour % 12 or 12
    return f"{loc:%a} {loc:%b} {loc.day}, {hour}:{loc:%M} {'AM' if loc.hour < 12 else 'PM'}"


@router.post("/login", response_model=LoginResult)
def login(data: LoginRequest, request: Request, db: Session = DbSession) -> dict:
    rate_limit(db, "login", client_ip(request))
    if not check_admin_password(data.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect password")
    token, exp = issue_admin_token()
    return {"token": token, "expires_at": exp}


@guarded.get("/summary")
def summary(db: Session = DbSession) -> dict:
    today = local_today()
    start, end = local_to_utc(today, parse_hhmm("00:00")), local_to_utc(today + timedelta(days=1), parse_hhmm("00:00"))
    active = Booking.status.in_(ACTIVE_STATUSES)
    return {
        "today": db.scalar(select(func.count()).select_from(Booking).where(active, Booking.starts_at >= start, Booking.starts_at < end)),
        "upcoming": db.scalar(select(func.count()).select_from(Booking).where(active, Booking.starts_at >= utcnow())),
        "new_messages": db.scalar(select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "new")),
    }


@guarded.get("/bookings")
def list_bookings(
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = None,
    status_: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = DbSession,
) -> dict:
    stmt = select(Booking)
    midnight = parse_hhmm("00:00")
    if from_:
        stmt = stmt.where(Booking.starts_at >= local_to_utc(from_, midnight))
    if to:
        stmt = stmt.where(Booking.starts_at < local_to_utc(to + timedelta(days=1), midnight))
    if status_:
        stmt = stmt.where(Booking.status == status_)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Booking.customer_name.ilike(like), Booking.customer_email.ilike(like), Booking.customer_phone.ilike(like), Booking.code.ilike(like))
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Booking.starts_at).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [_admin_booking(b) for b in rows], "total": total, "page": page, "page_size": page_size}


@guarded.get("/availability")
def staff_availability(
    service: str = Query(max_length=64),
    minutes: int = Query(gt=0, le=600),
    date_: date = Query(alias="date"),
    db: Session = DbSession,
) -> dict:
    """Like the public endpoint but without the minimum-notice rule or horizon."""
    svc, _ = resolve_service(service, minutes)
    slots = day_slots(db, svc, minutes, date_, enforce_notice=False)
    return {"date": date_.isoformat(), "slots": [{"time": s.time, "available": s.available} for s in slots]}


@guarded.post("/bookings", status_code=status.HTTP_201_CREATED)
def staff_booking(data: StaffBookingCreate, request: Request, background: BackgroundTasks, db: Session = DbSession) -> dict:
    """Phone/walk-in bookings. Skips the minimum-notice rule but still respects capacity."""
    b = create_booking(db, data, source="staff", ip=client_ip(request), status_=data.status, enforce_notice=False)
    background.add_task(mailer.booking_confirmed, b)
    return _admin_booking(b)


@guarded.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, data: BookingStatusUpdate, background: BackgroundTasks, db: Session = DbSession) -> dict:
    b = db.get(Booking, booking_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    was_active = b.status in ACTIVE_STATUSES
    if data.status in ACTIVE_STATUSES and not was_active:
        # re-activating would silently overbook if the slot was given away
        raise HTTPException(status.HTTP_409_CONFLICT, "A closed booking cannot be re-opened. Create a new booking instead.")
    b.status = data.status
    if data.status == "cancelled" and was_active:
        b.cancelled_at = utcnow()
        background.add_task(mailer.booking_cancelled, b)
    db.commit()
    return _admin_booking(b)


@guarded.get("/messages")
def list_messages(
    status_: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = DbSession,
) -> dict:
    stmt = select(ContactMessage)
    if status_:
        stmt = stmt.where(ContactMessage.status == status_)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(ContactMessage.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [
        {"id": m.id, "name": m.name, "email": m.email, "phone": m.phone, "message": m.message, "status": m.status, "created_at": m.created_at}
        for m in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@guarded.patch("/messages/{message_id}")
def update_message(message_id: int, data: MessageStatusUpdate, db: Session = DbSession) -> dict:
    m = db.get(ContactMessage, message_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    m.status = data.status
    db.commit()
    return {"id": m.id, "status": m.status}


def _block_out(b: BlockedTime) -> dict:
    return {
        "id": b.id,
        "starts_at": b.starts_at,
        "ends_at": b.ends_at,
        "starts_local": _local_label(b.starts_at),
        "ends_local": _local_label(b.ends_at),
        "reason": b.reason,
    }


@guarded.get("/blocked-times")
def list_blocks(db: Session = DbSession) -> list[dict]:
    rows = db.scalars(select(BlockedTime).where(BlockedTime.ends_at >= utcnow()).order_by(BlockedTime.starts_at)).all()
    return [_block_out(b) for b in rows]


@guarded.post("/blocked-times", status_code=status.HTTP_201_CREATED)
def create_block(data: BlockCreate, db: Session = DbSession) -> dict:
    start = local_to_utc(data.date, parse_hhmm(data.start))
    if data.end == "24:00":
        end = local_to_utc(data.date + timedelta(days=1), parse_hhmm("00:00"))
    else:
        end = local_to_utc(data.date, parse_hhmm(data.end))
    if end <= start:
        raise HTTPException(422, "End must be after start")
    b = BlockedTime(starts_at=start, ends_at=end, reason=data.reason.strip())
    db.add(b)
    db.commit()
    return _block_out(b)


@guarded.delete("/blocked-times/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(block_id: int, db: Session = DbSession) -> None:
    b = db.get(BlockedTime, block_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    db.delete(b)
    db.commit()
