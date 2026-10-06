# ZoomClone — Next.js + FastAPI + SQLite

A Zoom-inspired video meeting web app. Create instant meetings, schedule meetings, join by Meeting ID or invite link, and meet in a Zoom-style room with camera, microphone, screen sharing, chat and a participants list. All data is stored in SQLite and served by a FastAPI backend.

## Features

- **Dashboard** – Zoom-style navbar (profile + settings), live clock, the four main actions (New Meeting, Join Meeting, Schedule, Upcoming) and Upcoming / Recent meeting lists loaded from the backend.
- **New Meeting** – `POST /meetings/instant` creates a real SQLite record with a unique 10‑digit Meeting ID and invite link, then redirects to `/meeting/<id>`.
- **Join Meeting** – enter a Meeting ID (`1234567890`, `123 456 7890`) or a full invite link; the backend validates it, shows meeting info, asks for a display name, then opens the room.
- **Invite links** – `http://localhost:3000/join/<meetingId>` opens the join screen for that meeting. Copy Invite Link buttons on cards, the join screen and inside the room.
- **Schedule Meeting** – title, description, date, time, duration with client + server validation; success screen with ID and invite link; it appears in Upcoming Meetings.
- **Meeting room** – camera (`getUserMedia`), microphone (`getUserMedia`), screen share (`getDisplayMedia`), participants panel, chat panel, meeting info dialog, Meeting ID, copy invite, timer, display name and Leave. Denied permissions show a friendly notice; the room still works.
- **Chat** – stored in SQLite, delivered with simple REST polling (every 2s), uses the participant's display name.
- **Participants** – each join is stored in `meeting_participants`; the panel lists people currently in the meeting (polled every 3s). Leaving marks `left_at`.
- **Persistence** – the room URL is `/meeting/<meetingId>?name=<displayName>`, so refreshing never loses the ID or name. Refreshing the browser or restarting the backend keeps all data.
- **Responsive** – desktop, tablet and mobile layouts (side panels become overlays on small screens).
- **Settings** – set a default display name used when joining (saved in the browser).

> Note: video/audio is local only (your own camera preview). There is no WebRTC signaling between participants, by design, to keep the app simple and reliable. Other participants are shown as avatar tiles; chat and the participant list are shared through the backend.

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 14 (App Router), React 18, plain CSS |
| Backend  | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| Database | SQLite (Python built-in `sqlite3`) |

## Project structure

```
zoom-clone/
├── backend/
│   ├── main.py            # FastAPI app + routes (entry point: python main.py)
│   ├── database.py        # SQLite connection, schema, seed data
│   ├── crud.py            # Database operations
│   ├── schemas.py         # Pydantic models + validation
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/               # Pages: /, /join, /join/[meetingId], /schedule, /meeting/[meetingId]
│   ├── components/        # Navbar, Dashboard, MeetingList, MeetingCard, JoinFlow, ScheduleForm,
│   │                      # MeetingRoom, ChatPanel, ParticipantsPanel, useLocalMedia, ui, Icons
│   ├── lib/api.js         # Central API helper (uses NEXT_PUBLIC_API_URL)
│   ├── lib/utils.js
│   ├── package.json
│   └── .env.example
├── README.md
└── .gitignore
```

## Database design

```
users (id PK, name, email UNIQUE, avatar_color, created_at)
   │1
   │
   └──< meetings (id PK, meeting_id UNIQUE, title, description, host_id FK→users.id,
          │       scheduled_at, duration_minutes, invite_link, is_instant, created_at)
          │1
          ├──< meeting_participants (id PK, meeting_id FK→meetings.id, display_name,
          │                          is_host, joined_at, left_at)
          │                 │1
          └──< meeting_messages (id PK, meeting_id FK→meetings.id,
                                 participant_id FK→meeting_participants.id NULLABLE,
                                 sender_name, content, created_at)
```

- Foreign keys are enforced (`PRAGMA foreign_keys = ON`), with `ON DELETE CASCADE`.
- Times are stored as UTC ISO‑8601 strings.
- The database file (`backend/zoomclone.db`) is created automatically on first start and seeded with a default user (Alex Morgan) and 6 sample meetings (3 upcoming, 3 recent). Seeding only runs when the database is empty, so restarts keep your data.
- To reset, stop the backend and delete `backend/zoomclone.db`.

## Setup

Requirements: **Python 3.12** (3.10+ works) and **Node.js 18.17+** (20 LTS recommended).

### Terminal 1 — backend

```bash
cd backend
python -m venv venv
# Windows:      venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
python main.py
```

The API runs at http://localhost:8000 (interactive docs at http://localhost:8000/docs).

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

Production build: `npm run build && npm start`.

No `.env` file is needed — defaults are built in. To customise, copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Environment variables

**backend/.env**

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8000` | API port |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allowed frontend origins |
| `DATABASE_URL` | `sqlite:///./zoomclone.db` | SQLite file (relative to `backend/`) |
| `FRONTEND_URL` | `http://localhost:3000` | Base used for stored invite links |

**frontend/.env.local**

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI base URL |

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Health check |
| GET  | `/users/me` | Default logged-in user |
| GET  | `/meetings/upcoming` | Scheduled meetings that haven't ended |
| GET  | `/meetings/recent` | Past and instant meetings (latest 10) |
| POST | `/meetings/instant` | Create instant meeting → 201 |
| POST | `/meetings/schedule` | Create scheduled meeting `{title, description, scheduled_at, duration_minutes}` → 201, 422 on invalid data |
| GET  | `/meetings/{meeting_id}` | Meeting details, 404 if not found (spaces/dashes in the ID are ignored) |
| POST | `/meetings/{meeting_id}/join` | `{display_name, is_host?, participant_id?}` → participant |
| GET  | `/meetings/{meeting_id}/participants` | Participants currently in the meeting |
| POST | `/meetings/{meeting_id}/leave` | `{participant_id}` |
| GET  | `/meetings/{meeting_id}/messages?after_id=0` | Chat messages (incremental polling) |
| POST | `/meetings/{meeting_id}/messages` | `{participant_id?, sender_name, content}` |

## Assumptions

- No authentication: a default user (Alex Morgan) is always "logged in" and hosts all created meetings.
- The person who clicks **New Meeting** joins as host. Anyone else joins as a participant.
- Media is local preview only (no peer-to-peer video). Camera/mic require `localhost` or HTTPS in browsers.
- Duration must be 15–480 minutes; scheduled times must be in the future.
- Opening the same meeting in a second browser tab with a different name lets you test participants and chat locally.

## Deployment notes

- **Backend**: any Python host (Render, Railway, Fly.io, a VM). Start command: `python main.py` (or `uvicorn main:app --host 0.0.0.0 --port $PORT`). Set `CORS_ORIGINS` and `FRONTEND_URL` to the frontend's URL. Use a persistent disk for the SQLite file.
- **Frontend**: Vercel/Netlify or `npm run build && npm start`. Set `NEXT_PUBLIC_API_URL` to the backend URL *before* building.
- Serve over HTTPS in production so camera, microphone and screen sharing are allowed by browsers.
