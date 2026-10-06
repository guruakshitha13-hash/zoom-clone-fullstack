"""SQLite connection, schema creation and seed data."""
import os
import random
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_USER = {
    "name": "Alex Morgan",
    "email": "alex.morgan@example.com",
    "avatar_color": "#0B5CFF",
}


def get_db_path() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./zoomclone.db")
    path = url.replace("sqlite:///", "", 1) if url.startswith("sqlite:///") else url
    if not os.path.isabs(path):
        path = os.path.normpath(os.path.join(BASE_DIR, path))
    return path


def frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def get_conn():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_color TEXT NOT NULL DEFAULT '#0B5CFF',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 40,
    invite_link TEXT NOT NULL,
    is_instant INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    is_host INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL,
    left_at TEXT
);

CREATE TABLE IF NOT EXISTS meeting_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    participant_id INTEGER REFERENCES meeting_participants(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_messages_meeting ON meeting_messages(meeting_id);
"""


def generate_meeting_id(conn: sqlite3.Connection) -> str:
    """Unique 10-digit meeting id (first digit non-zero)."""
    while True:
        candidate = str(random.randint(1_000_000_000, 9_999_999_999))
        exists = conn.execute(
            "SELECT 1 FROM meetings WHERE meeting_id = ?", (candidate,)
        ).fetchone()
        if not exists:
            return candidate


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        has_user = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if not has_user:
            seed(conn)


def seed(conn: sqlite3.Connection) -> None:
    now = utcnow().replace(second=0, microsecond=0)
    cur = conn.execute(
        "INSERT INTO users (name, email, avatar_color, created_at) VALUES (?, ?, ?, ?)",
        (DEFAULT_USER["name"], DEFAULT_USER["email"], DEFAULT_USER["avatar_color"], iso(now)),
    )
    host_id = cur.lastrowid

    samples = [
        ("Weekly Team Standup", "Quick sync on progress and blockers.", timedelta(hours=2), 30, False),
        ("Product Roadmap Review", "Review Q4 priorities with the product team.", timedelta(days=1, hours=3), 60, False),
        ("Client Demo: Acme Corp", "Live walkthrough of the new dashboard features.", timedelta(days=3), 45, False),
        ("Design Critique", "Feedback session on the onboarding redesign.", timedelta(days=-1), 45, False),
        ("Sprint Retrospective", "What went well, what to improve.", timedelta(days=-3), 60, False),
        ("Quick Sync", "", timedelta(days=-5), 40, True),
    ]
    for title, desc, offset, duration, instant in samples:
        mid = generate_meeting_id(conn)
        when = now + offset
        conn.execute(
            """INSERT INTO meetings (meeting_id, title, description, host_id, scheduled_at,
               duration_minutes, invite_link, is_instant, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                mid, title, desc, host_id, iso(when), duration,
                f"{frontend_url()}/join/{mid}", int(instant),
                iso(min(when, now) - timedelta(days=1)),
            ),
        )
