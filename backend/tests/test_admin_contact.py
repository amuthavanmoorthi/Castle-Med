from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app import timeutil

from .conftest import DAY, booking_body


def test_admin_requires_token(client):
    assert client.get("/api/admin/bookings").status_code == 401
    assert client.get("/api/admin/bookings", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_wrong_password(client):
    assert client.post("/api/admin/login", json={"password": "wrong"}).status_code == 401


def test_login_disabled_without_password(client, monkeypatch):
    from app import config

    monkeypatch.setenv("ADMIN_PASSWORD", "")
    config.get_settings.cache_clear()
    assert client.post("/api/admin/login", json={"password": "anything"}).status_code == 503


def test_expired_token_rejected(client, admin_headers):
    assert client.get("/api/admin/summary", headers=admin_headers).status_code == 200
    expired = jwt.encode({"sub": "admin", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, "test-secret-0123456789-abcdefghijklmnop", algorithm="HS256")
    assert client.get("/api/admin/summary", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_forged_token_rejected(client):
    forged = jwt.encode({"sub": "admin", "exp": 4102444800}, "not-the-secret-0123456789-abcdefghijklmnop", algorithm="HS256")
    assert client.get("/api/admin/summary", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_admin_lists_and_updates_bookings(client, admin_headers):
    client.post("/api/bookings", json=booking_body())
    r = client.get("/api/admin/bookings", params={"from": DAY, "to": DAY}, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    b = data["items"][0]
    assert b["customer_phone"] == "(702) 555-0101"

    r = client.patch(f"/api/admin/bookings/{b['id']}", json={"status": "completed"}, headers=admin_headers)
    assert r.json()["status"] == "completed"
    # closed bookings can't be re-opened (would risk overbooking)
    r = client.patch(f"/api/admin/bookings/{b['id']}", json={"status": "confirmed"}, headers=admin_headers)
    assert r.status_code == 409

    r = client.get("/api/admin/bookings", params={"q": "lovelace"}, headers=admin_headers)
    assert r.json()["total"] == 1


def test_staff_booking_skips_notice_but_not_capacity(client, admin_headers):
    timeutil.frozen_now = datetime(2026, 6, 2, 20, 30)  # 13:30 PDT
    body = booking_body(time="14:00")
    assert client.post("/api/bookings", json=body).status_code == 409  # online: too soon
    assert client.post("/api/admin/bookings", json=body, headers=admin_headers).status_code == 201
    assert client.post("/api/admin/bookings", json=body, headers=admin_headers).status_code == 201
    assert client.post("/api/admin/bookings", json=body, headers=admin_headers).status_code == 409  # full


def test_blocked_time_closes_slots(client, admin_headers):
    r = client.post("/api/admin/blocked-times", json={"date": DAY, "start": "13:00", "end": "15:00", "reason": "Staff training"}, headers=admin_headers)
    assert r.status_code == 201
    s = {x["time"]: x["available"] for x in client.get("/api/availability", params={"service": "swedish", "minutes": 60, "date": DAY}).json()["slots"]}
    assert s["12:00"] is True and s["12:30"] is False and s["14:30"] is False and s["15:00"] is True

    block_id = r.json()["id"]
    assert client.delete(f"/api/admin/blocked-times/{block_id}", headers=admin_headers).status_code == 204


def test_whole_day_block(client, admin_headers):
    client.post("/api/admin/blocked-times", json={"date": DAY, "reason": "Holiday"}, headers=admin_headers)
    s = client.get("/api/availability", params={"service": "swedish", "minutes": 60, "date": DAY}).json()["slots"]
    assert not any(x["available"] for x in s)


def test_contact_saved_and_listed(client, admin_headers):
    r = client.post("/api/contact", json={"name": "Grace", "email": "grace@example.com", "message": "Do you have parking?"})
    assert r.status_code == 201
    msgs = client.get("/api/admin/messages", headers=admin_headers).json()
    assert msgs["total"] == 1 and msgs["items"][0]["status"] == "new"
    mid = msgs["items"][0]["id"]
    assert client.patch(f"/api/admin/messages/{mid}", json={"status": "read"}, headers=admin_headers).json()["status"] == "read"
    assert client.get("/api/admin/summary", headers=admin_headers).json()["new_messages"] == 0


def test_contact_validation_and_rate_limit(client):
    assert client.post("/api/contact", json={"name": "G", "email": "bad", "message": "hi"}).status_code == 422
    body = {"name": "Grace", "email": "grace@example.com", "message": "Hello there"}
    for _ in range(5):
        assert client.post("/api/contact", json=body).status_code == 201
    assert client.post("/api/contact", json=body).status_code == 429


def test_errors_do_not_leak_internals(client, monkeypatch):
    from app.routers import public

    def boom(*a, **k):
        raise RuntimeError("secret db path /var/lib/x")

    monkeypatch.setattr(public, "day_slots", boom)
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(), raise_server_exceptions=False) as c:
        r = c.get("/api/availability", params={"service": "swedish", "minutes": 60, "date": DAY})
    assert r.status_code == 500
    assert "secret" not in r.text


def test_staff_availability_ignores_notice(client, admin_headers):
    from datetime import datetime

    timeutil.frozen_now = datetime(2026, 6, 2, 20, 30)  # 13:30 PDT
    staff = client.get("/api/admin/availability", params={"service": "swedish", "minutes": 60, "date": DAY}, headers=admin_headers)
    assert {s["time"]: s["available"] for s in staff.json()["slots"]}["14:00"] is True
    assert client.get("/api/admin/availability", params={"service": "swedish", "minutes": 60, "date": DAY}).status_code == 401
