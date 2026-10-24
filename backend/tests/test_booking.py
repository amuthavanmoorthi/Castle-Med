from __future__ import annotations

from datetime import datetime, timedelta

from app import timeutil

from .conftest import DAY, FROZEN, booking_body


def slots(client, service="swedish", minutes=60, date=DAY):
    r = client.get("/api/availability", params={"service": service, "minutes": minutes, "date": date})
    assert r.status_code == 200, r.text
    return {s["time"]: s["available"] for s in r.json()["slots"]}


def test_slots_cover_opening_hours(client):
    s = slots(client)
    # 10:00 open, 22:00 close, 30-minute steps, 60-minute service -> last start 21:00
    assert next(iter(s)) == "10:00"
    assert list(s)[-1] == "21:00"
    assert all(s.values())


def test_unknown_service_and_duration_rejected(client):
    assert client.get("/api/availability", params={"service": "nope", "minutes": 60, "date": DAY}).status_code == 404
    assert client.get("/api/availability", params={"service": "swedish", "minutes": 75, "date": DAY}).status_code == 422


def test_date_outside_horizon_rejected(client):
    far = (FROZEN + timedelta(days=200)).date().isoformat()
    assert client.get("/api/availability", params={"service": "swedish", "minutes": 60, "date": far}).status_code == 422


def test_booking_happy_path(client):
    r = client.post("/api/bookings", json=booking_body())
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["service_name"] == "Swedish Massage"
    assert b["price_cents"] == 10000  # price comes from the catalog, not the client
    assert b["status"] == "confirmed"
    assert len(b["code"]) == 8 and b["manage_token"]
    assert "2:00 PM" in b["starts_local"]
    # 14:00 PDT is 21:00 UTC
    assert b["starts_at"].startswith("2026-06-02T21:00")


def test_capacity_is_enforced(client):
    # capacity 2 in tests: two singles fill the 14:00 slot
    assert client.post("/api/bookings", json=booking_body(email="a@example.com")).status_code == 201
    assert slots(client)["14:00"] is True
    assert client.post("/api/bookings", json=booking_body(email="b@example.com")).status_code == 201
    assert slots(client)["14:00"] is False
    # overlapping 13:30 (runs to 14:30) is now full too, 15:00 is free again
    s = slots(client)
    assert s["13:30"] is False and s["15:00"] is True
    r = client.post("/api/bookings", json=booking_body(email="c@example.com"))
    assert r.status_code == 409


def test_couples_uses_two_units(client):
    assert client.post("/api/bookings", json=booking_body(service_slug="couples")).status_code == 201
    # a single now fails at 14:00 because couples took both units
    assert slots(client)["14:00"] is False
    # and a couples booking can't start while one single is running
    assert client.post("/api/bookings", json=booking_body(time="16:00")).status_code == 201
    assert slots(client, service="couples")["16:00"] is False


def test_minimum_notice(client):
    timeutil.frozen_now = datetime(2026, 6, 2, 19, 30)  # 12:30 PDT on DAY
    s = slots(client)
    assert s["14:00"] is False  # inside 2-hour notice
    assert s["14:30"] is True
    assert client.post("/api/bookings", json=booking_body(time="14:00")).status_code == 409


def test_rejects_slot_not_on_grid(client):
    assert client.post("/api/bookings", json=booking_body(time="14:10")).status_code == 409


def test_validation_messages(client):
    r = client.post("/api/bookings", json=booking_body(phone="123", email="nope"))
    assert r.status_code == 422
    fields = r.json()["fields"]
    assert "phone" in fields and "email" in fields


def test_honeypot_blocks_bots(client):
    assert client.post("/api/bookings", json=booking_body(website="http://spam")).status_code == 400


def test_rate_limit(client):
    for i in range(6):
        t = f"{10 + i}:00"
        assert client.post("/api/bookings", json=booking_body(time=t, email=f"x{i}@example.com")).status_code == 201
    assert client.post("/api/bookings", json=booking_body(time="17:00")).status_code == 429


def test_lookup_and_cancel(client):
    created = client.post("/api/bookings", json=booking_body()).json()
    bad = client.post("/api/bookings/lookup", json={"code": created["code"], "email": "other@example.com"})
    assert bad.status_code == 404
    ok = client.post("/api/bookings/lookup", json={"code": created["code"].lower(), "email": "ADA@example.com"})
    assert ok.status_code == 200
    token = ok.json()["manage_token"]
    assert client.get(f"/api/bookings/manage/{token}").json()["can_cancel"] is True

    r = client.post(f"/api/bookings/manage/{token}/cancel")
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    # cancelling frees the slot and cannot be repeated
    assert slots(client)["14:00"] is True
    assert client.post(f"/api/bookings/manage/{token}/cancel").status_code == 409


def test_cancel_cutoff(client):
    token = client.post("/api/bookings", json=booking_body()).json()["manage_token"]
    timeutil.frozen_now = datetime(2026, 6, 2, 12, 0)  # 05:00 PDT, 9h before 14:00
    view = client.get(f"/api/bookings/manage/{token}").json()
    assert view["can_cancel"] is False
    r = client.post(f"/api/bookings/manage/{token}/cancel")
    assert r.status_code == 409 and "702-565-5980" in r.json()["detail"]


def test_unknown_token(client):
    assert client.get("/api/bookings/manage/" + "x" * 43).status_code == 404


def test_confirmation_email_flag_reflects_mail_setup(client):
    # SMTP_HOST is empty in tests, so the site must not promise an email
    assert client.post("/api/bookings", json=booking_body()).json()["confirmation_email"] is False
