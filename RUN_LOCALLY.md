# Run locally

Two servers, two terminals. Start the backend first.

| What | URL |
|---|---|
| Site | http://localhost:5173 |
| Staff area | http://localhost:5173/admin |
| API docs | http://localhost:8000/api/docs |

## First time only (setup)

Needs Python 3.12 and Node 20+.

**Backend**

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
```

Open `backend/.env` and set your own `ADMIN_PASSWORD` and a long random
`SECRET_KEY`. Change `SITE_URL` and `CORS_ORIGINS` to `http://localhost:5173`.

**Frontend**

```bash
cd frontend
npm install
```

## Every time

**Terminal 1 - backend**

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - frontend**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. Staff login at `/admin` uses `ADMIN_PASSWORD`
from `backend/.env`.

Stop either server with `Ctrl+C`.

## Run the tests

```bash
cd backend && .venv/bin/python -m pytest -q
cd frontend && npm test
```

## Problems

- **Booking or contact shows "couldn't reach our booking system"**: the
  backend isn't running. Start Terminal 1.
- **"Address already in use"**: something is already on port 8000 or 5173.
  Find it with `lsof -i :8000` (or `:5173`), then stop it with `kill <PID>`.
- **`npm install` fails with a permissions error on `~/.npm`**: run
  `npm install --cache /tmp/npm-cache` instead.
- **Staff login says "Admin login is not configured"**: `ADMIN_PASSWORD` is
  empty in `backend/.env`.
- **Start over with an empty database**: stop the backend, delete
  `backend/castle.db*`, and start it again.
