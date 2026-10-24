"""Database tables. All datetimes are stored as naive UTC."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .timeutil import utcnow

# A booking in one of these states holds its slot.
ACTIVE_STATUSES = ("pending", "confirmed")
BOOKING_STATUSES = ("pending", "confirmed", "completed", "cancelled", "no_show")
MESSAGE_STATUSES = ("new", "read", "archived")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    manage_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Service details are copied at booking time so later price or menu changes
    # never rewrite what a customer actually booked.
    service_slug: Mapped[str] = mapped_column(String(64))
    service_name: Mapped[str] = mapped_column(String(120))
    minutes: Mapped[int] = mapped_column(Integer)
    price_cents: Mapped[int] = mapped_column(Integer)
    units: Mapped[int] = mapped_column(Integer, default=1)

    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)

    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(254), index=True)
    customer_phone: Mapped[str] = mapped_column(String(32))
    notes: Mapped[str] = mapped_column(Text, default="")

    status: Mapped[str] = mapped_column(String(16), default="confirmed", index=True)
    source: Mapped[str] = mapped_column(String(16), default="online")  # online | staff
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    client_ip: Mapped[str] = mapped_column(String(64), default="")

    __table_args__ = (Index("ix_bookings_window", "starts_at", "ends_at"),)


class BlockedTime(Base):
    """Staff-entered closures (holidays, private events, maintenance)."""

    __tablename__ = "blocked_times"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    reason: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(32), default="")
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    client_ip: Mapped[str] = mapped_column(String(64), default="")


class RateEvent(Base):
    """One row per rate-limited action. Lives in the DB so limits hold across
    worker processes and restarts."""

    __tablename__ = "rate_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
