"""Database operations (kept separate from the API routes)."""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from database import frontend_url, generate_meeting_id, get_conn, iso, utcnow

MEETING_SELECT = """
SELECT m.*, u.name AS host_name,
  (SELECT COUNT(*) FROM meeting_participants p
     WHERE p.meeting_id = m.id AND p.left_at IS NULL) AS active_participants
FROM meetings m JOIN users u ON u.id = m.host_id
"""


def normalize_meeting_id(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


def _meeting(row) -> dict:
    d = dict(row)
    d["is_instant"] = bool(d["is_instant"])
    return d


def get_default_user() -> dict:
    with get_conn() as conn:
        return dict(conn.execute("SELECT * FROM users ORDER BY id LIMIT 1").fetchone())


def get_meeting(meeting_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(MEETING_SELECT + " WHERE m.meeting_id = ?", (meeting_id,)).fetchone()
        return _meeting(row) if row else None


def _end(m: dict) -> datetime:
    return datetime.fromisoformat(m["scheduled_at"]) + timedelta(minutes=m["duration_minutes"])


def list_upcoming() -> list[dict]:
    now = utcnow()
    with get_conn() as conn:
        rows = conn.execute(MEETING_SELECT + " WHERE m.is_instant = 0 ORDER BY m.scheduled_at ASC").fetchall()
    return [m for m in map(_meeting, rows) if _end(m) > now]


def list_recent(limit: int = 10) -> list[dict]:
    now = utcnow()
    with get_conn() as conn:
        rows = conn.execute(MEETING_SELECT + " ORDER BY m.scheduled_at DESC").fetchall()
    recent = [m for m in map(_meeting, rows) if m["is_instant"] or _end(m) <= now]
    return recent[:limit]


def _insert_meeting(title, description, scheduled_at: datetime, duration, instant) -> dict:
    with get_conn() as conn:
        host_id = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()[0]
        mid = generate_meeting_id(conn)
        conn.execute(
            """INSERT INTO meetings (meeting_id, title, description, host_id, scheduled_at,
               duration_minutes, invite_link, is_instant, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (mid, title, description, host_id, iso(scheduled_at), duration,
             f"{frontend_url()}/join/{mid}", int(instant), iso(utcnow())),
        )
    return get_meeting(mid)


def create_instant(title: Optional[str]) -> dict:
    user = get_default_user()
    t = (title or "").strip() or f"{user['name']}'s Instant Meeting"
    return _insert_meeting(t, "", utcnow(), 40, True)


def create_scheduled(title, description, scheduled_at: datetime, duration) -> dict:
    return _insert_meeting(title, description.strip(), scheduled_at.astimezone(timezone.utc), duration, False)


def join_meeting(meeting_pk: int, display_name: str, is_host: bool, participant_id: Optional[int]) -> dict:
    with get_conn() as conn:
        if participant_id:
            row = conn.execute(
                "SELECT * FROM meeting_participants WHERE id = ? AND meeting_id = ?",
                (participant_id, meeting_pk),
            ).fetchone()
            if row:
                conn.execute(
                    "UPDATE meeting_participants SET left_at = NULL, display_name = ? WHERE id = ?",
                    (display_name, participant_id),
                )
                return _participant(conn, participant_id)
        cur = conn.execute(
            "INSERT INTO meeting_participants (meeting_id, display_name, is_host, joined_at) VALUES (?, ?, ?, ?)",
            (meeting_pk, display_name, int(is_host), iso(utcnow())),
        )
        return _participant(conn, cur.lastrowid)


def _participant(conn, pid) -> dict:
    d = dict(conn.execute(
        "SELECT id, display_name, is_host, joined_at, left_at FROM meeting_participants WHERE id = ?", (pid,)
    ).fetchone())
    d["is_host"] = bool(d["is_host"])
    return d


def leave_meeting(meeting_pk: int, participant_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE meeting_participants SET left_at = ? WHERE id = ? AND meeting_id = ? AND left_at IS NULL",
            (iso(utcnow()), participant_id, meeting_pk),
        )
        return cur.rowcount > 0


def list_participants(meeting_pk: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, display_name, is_host, joined_at, left_at FROM meeting_participants
               WHERE meeting_id = ? AND left_at IS NULL ORDER BY is_host DESC, joined_at ASC""",
            (meeting_pk,),
        ).fetchall()
    return [{**dict(r), "is_host": bool(r["is_host"])} for r in rows]


def list_messages(meeting_pk: int, after_id: int = 0) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, participant_id, sender_name, content, created_at FROM meeting_messages
               WHERE meeting_id = ? AND id > ? ORDER BY id ASC""",
            (meeting_pk, after_id),
        ).fetchall()
    return [dict(r) for r in rows]


def add_message(meeting_pk: int, participant_id, sender_name, content) -> dict:
    with get_conn() as conn:
        if participant_id is not None:
            ok = conn.execute(
                "SELECT 1 FROM meeting_participants WHERE id = ? AND meeting_id = ?",
                (participant_id, meeting_pk),
            ).fetchone()
            if not ok:
                participant_id = None
        cur = conn.execute(
            "INSERT INTO meeting_messages (meeting_id, participant_id, sender_name, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (meeting_pk, participant_id, sender_name, content, iso(utcnow())),
        )
        return dict(conn.execute(
            "SELECT id, participant_id, sender_name, content, created_at FROM meeting_messages WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone())
