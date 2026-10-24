from __future__ import annotations

import re
import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


_PHONE_DIGITS = re.compile(r"\d")
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _clean_phone(v: str) -> str:
    v = v.strip()
    digits = "".join(_PHONE_DIGITS.findall(v))
    if not 10 <= len(digits) <= 15:
        raise ValueError("Enter a valid phone number")
    if not re.fullmatch(r"[\d\s()+.\-]+", v):
        raise ValueError("Enter a valid phone number")
    return v


def _single_line(v: str) -> str:
    v = " ".join(v.split())
    if not v:
        raise ValueError("Required")
    return v


class BookingCreate(BaseModel):
    service_slug: str = Field(max_length=64)
    minutes: int = Field(gt=0, le=600)
    date: dt.date
    time: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(max_length=32)
    notes: str = Field(default="", max_length=1000)
    website: str = Field(default="", max_length=200)  # honeypot - must stay empty

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _single_line(v)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return _clean_phone(v)

    @field_validator("time")
    @classmethod
    def _time(cls, v: str) -> str:
        if not _HHMM.match(v):
            raise ValueError("Time must be HH:MM")
        return v


class StaffBookingCreate(BookingCreate):
    status: Literal["pending", "confirmed"] = "confirmed"


class BookingPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    service_slug: str
    service_name: str
    minutes: int
    price_cents: int
    starts_at: dt.datetime
    ends_at: dt.datetime
    starts_local: str
    customer_name: str
    status: str
    can_cancel: bool
    cancel_cutoff_hours: int


class BookingCreated(BookingPublic):
    manage_token: str
    confirmation_email: bool  # true only when the server is set up to send mail


class LookupRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)
    email: EmailStr


class LookupResult(BaseModel):
    manage_token: str


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(default="", max_length=32)
    message: str = Field(min_length=5, max_length=4000)
    website: str = Field(default="", max_length=200)  # honeypot

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _single_line(v)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return _clean_phone(v) if v.strip() else ""

    @field_validator("message")
    @classmethod
    def _message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Message is too short")
        return v


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class LoginResult(BaseModel):
    token: str
    expires_at: dt.datetime


class BookingAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    service_slug: str
    service_name: str
    minutes: int
    price_cents: int
    units: int
    starts_at: dt.datetime
    ends_at: dt.datetime
    starts_local: str
    customer_name: str
    customer_email: str
    customer_phone: str
    notes: str
    status: str
    source: str
    created_at: dt.datetime


class BookingStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "completed", "cancelled", "no_show"]


class MessageAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str
    message: str
    status: str
    created_at: dt.datetime


class MessageStatusUpdate(BaseModel):
    status: Literal["new", "read", "archived"]


class BlockCreate(BaseModel):
    date: dt.date
    start: str = "00:00"
    end: str = "24:00"
    reason: str = Field(default="", max_length=200)

    @field_validator("start", "end")
    @classmethod
    def _clock(cls, v: str) -> str:
        if v != "24:00" and not _HHMM.match(v):
            raise ValueError("Use HH:MM")
        return v


class BlockAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    starts_at: dt.datetime
    ends_at: dt.datetime
    starts_local: str
    ends_local: str
    reason: str


class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
