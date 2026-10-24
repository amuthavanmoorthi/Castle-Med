from __future__ import annotations

import os

os.environ["CASTLE_SKIP_DOTENV"] = "1"

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

# 2026-06-01 09:00 UTC = 02:00 in Las Vegas (PDT, UTC-7). Bookings tests use
# 2026-06-02 so every slot is safely beyond the 2-hour minimum notice.
FROZEN = datetime(2026, 6, 1, 9, 0)
DAY = "2026-06-02"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("SECRET_KEY", "test-secret-0123456789-abcdefghijklmnop")
    monkeypatch.setenv("ADMIN_PASSWORD", "letmein")
    monkeypatch.setenv("CAPACITY_UNITS", "2")
    monkeypatch.setenv("SMTP_HOST", "")

    from app import config, db, timeutil

    config.get_settings.cache_clear()
    db.reset_engine()
    timeutil.frozen_now = FROZEN

    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c

    timeutil.frozen_now = None
    db.reset_engine()
    config.get_settings.cache_clear()


def booking_body(**over) -> dict:
    body = {
        "service_slug": "swedish",
        "minutes": 60,
        "date": DAY,
        "time": "14:00",
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "phone": "(702) 555-0101",
        "notes": "",
        "website": "",
    }
    body.update(over)
    return body


@pytest.fixture()
def admin_headers(client) -> dict:
    r = client.post("/api/admin/login", json={"password": "letmein"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
