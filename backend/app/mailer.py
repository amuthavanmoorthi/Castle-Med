"""Outgoing email. Always called from a background task, and never raises:
a broken SMTP server must not fail a booking or lose a contact message."""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from .catalog import business
from .config import get_settings
from .models import Booking, ContactMessage
from .timeutil import fmt_local

log = logging.getLogger("castle.mail")


def _send(to: str, subject: str, body: str, reply_to: str | None = None) -> None:
    s = get_settings()
    if not s.mail_enabled or not to:
        log.info("mail disabled, not sending %r to %s", subject, to)
        return
    msg = EmailMessage()
    msg["From"] = s.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    try:
        if s.smtp_port == 465:
            with smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, context=ssl.create_default_context(), timeout=20) as smtp:
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20) as smtp:
                if s.smtp_starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(msg)
    except Exception:  # noqa: BLE001 - mail must never break a request
        log.exception("failed to send %r to %s", subject, to)


def _money(cents: int) -> str:
    return f"${cents / 100:,.0f}" if cents % 100 == 0 else f"${cents / 100:,.2f}"


def _booking_lines(b: Booking) -> str:
    return (
        f"Booking reference: {b.code}\n"
        f"Service: {b.service_name} ({b.minutes} minutes)\n"
        f"When: {fmt_local(b.starts_at)}\n"
        f"Price: {_money(b.price_cents)} (paid at the spa)\n"
    )


def booking_confirmed(b: Booking) -> None:
    biz, s = business(), get_settings()
    manage = f"{s.site_url}/manage-booking/{b.manage_token}"
    _send(
        b.customer_email,
        f"Your appointment at {biz['name']} - {b.code}",
        f"Hi {b.customer_name},\n\n"
        f"Thank you for booking with {biz['name']}. Your appointment is confirmed.\n\n"
        f"{_booking_lines(b)}\n"
        f"Address: {biz['street']}, {biz['city']}, {biz['region']} {biz['postal_code']}\n\n"
        f"View or cancel your booking: {manage}\n"
        f"Free cancellation up to {s.cancel_cutoff_hours} hours before your appointment. "
        f"After that, please call us at {biz['phone']}.\n\n"
        f"We look forward to seeing you.\n{biz['name']}\n",
        reply_to=biz["email"],
    )
    _send(
        s.notify_email,
        f"New booking {b.code}: {b.service_name}, {fmt_local(b.starts_at)}",
        f"{_booking_lines(b)}\nName: {b.customer_name}\nPhone: {b.customer_phone}\nEmail: {b.customer_email}\n"
        f"Notes: {b.notes or '-'}\nSource: {b.source}\n",
        reply_to=b.customer_email,
    )


def booking_cancelled(b: Booking) -> None:
    biz, s = business(), get_settings()
    _send(
        b.customer_email,
        f"Appointment cancelled - {b.code}",
        f"Hi {b.customer_name},\n\nYour appointment has been cancelled.\n\n{_booking_lines(b)}\n"
        f"We hope to see you another time. Book again at {s.site_url}/appointment/\n\n{biz['name']}\n",
        reply_to=biz["email"],
    )
    _send(
        s.notify_email,
        f"Cancelled {b.code}: {b.service_name}, {fmt_local(b.starts_at)}",
        f"{_booking_lines(b)}\nName: {b.customer_name}\nPhone: {b.customer_phone}\n",
    )


def contact_received(m: ContactMessage) -> None:
    _send(
        get_settings().notify_email,
        f"Website message from {m.name}",
        f"Name: {m.name}\nEmail: {m.email}\nPhone: {m.phone or '-'}\n\n{m.message}\n",
        reply_to=m.email,
    )
