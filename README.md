# Castle Spa & Massage - website and booking system

Replacement for the WordPress site at https://castlespalv.com.

```
frontend/   React 19 + TypeScript (Vite). Static build, uploads to Bluehost.
backend/    Python 3.12 + FastAPI. Booking, contact and staff API.
content/    JSON snapshot of the old WordPress site (source material).
tools/      crawl.py (snapshot the old site), build_media.py (web images/video).
```

The service menu (names, prices, durations, descriptions, FAQs) lives in one
file, `backend/app/data/catalog.json`. The frontend bundles that same file at
build time, so the site can never show a price the API won't accept.

## What it does

**Public site**
- Home (hero video), Massages and Body Treatment menus with prices and FAQs,
  Gift Cards, About, Location (map and policies), Contact, FAQ, Terms.
- Online booking: treatment and duration, then date and live time slots, then details.
  Confirmation page with booking reference and add-to-calendar.
- Self-service: look up a booking by reference and email, and cancel online up to
  12 hours before (after that it shows the phone number).
- Every old WordPress URL 301-redirects to its new page (`frontend/public/.htaccess`).

**Staff (`/admin`)**
- Day schedule: mark bookings done, no-show or cancelled.
- New booking for phone and walk-in guests (skips the 2-hour notice rule, still
  respects capacity).
- Search all bookings, read contact messages, and block out closures (holidays,
  busy periods).

**Booking rules** (all in `backend/.env`): opening hours, 30-minute slots, therapist
capacity (a couples massage uses 2), 2-hour minimum notice, 60-day horizon, and a
12-hour cancellation cut-off. Times are Las Vegas time.

## Run locally

```bash
# API  ->  http://127.0.0.1:8000  (docs at /api/docs)
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env            # then set ADMIN_PASSWORD and SECRET_KEY
.venv/bin/uvicorn app.main:app --reload

# Site  ->  http://localhost:5173  (proxies /api to the API)
cd frontend
npm install
npm run dev
```

Staff area: http://localhost:5173/admin, using `ADMIN_PASSWORD` from `backend/.env`.

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q     # booking rules, capacity, auth, cancel cut-off
cd frontend && npm test && npm run build         # unit tests, type-check, production build
```

## Deploy

**Frontend (Bluehost, shared hosting):**
1. `cd frontend && VITE_API_URL=https://<api-host> npm run build`
2. Upload everything inside `frontend/dist/` (including the hidden `.htaccess`)
   into `public_html`, replacing the WordPress files. Keep a backup of the old
   site first.

**Backend:** Bluehost shared hosting cannot run a Python server. Options:
- **A small Python host** (Render, Railway, Fly.io). Start command:
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, with **one worker**
  (the booking lock is per-process).
- **A Bluehost VPS**, running uvicorn behind Apache/nginx.

Set these on the API host: `SECRET_KEY`, `ADMIN_PASSWORD`,
`SITE_URL=https://castlespalv.com`, `CORS_ORIGINS=https://castlespalv.com`,
`DATABASE_URL`, and the `SMTP_*` settings for email. Hosts with a temporary disk
need Postgres or MySQL rather than the default SQLite file (see `.env.example`).

Email is optional. Without SMTP, bookings still work, and the site doesn't
promise a confirmation email.

## Rebuilding media

```bash
python3 tools/crawl.py                                   # re-snapshot the old site into content/ and media/
uv run --with pillow python tools/build_media.py         # -> frontend/public/media (needs ffmpeg)
```

## Open questions for the owner

- **Opening hours.** The old site says "Open 24 hours, by appointment". Online booking
  defaults to 10:00-22:00 (`OPEN_TIME`/`CLOSE_TIME`). Confirm the real hours.
- **Capacity.** It defaults to 4 therapists at once (`CAPACITY_UNITS`). Confirm.
- **Deposits.** The cancellation policy mentions a deposit, but online booking takes no
  payment. Payment is at the spa.
- **Gift cards.** The old site said both "no expiration" and "valid 6 months". The new
  site uses the 6-month wording from the gift card FAQ and terms. Gift cards are sold
  by phone or in person, not online.
- **"Sand & Foam" vs "Stand Foam".** The old pages used both names. The new site uses
  "Sand & Foam" (the menu heading).
- **Not carried over (theme demo content):** Our Team bios, blog posts, shop products,
  hair, nail and makeup courses, careers, and the other company's Terms page. Real team
  bios and photos can be added later.
