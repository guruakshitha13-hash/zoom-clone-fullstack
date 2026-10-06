"""Zoom Clone FastAPI backend. Run with:  python main.py"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from fastapi import FastAPI, HTTPException, Query, status  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

import crud  # noqa: E402
from database import get_db_path, init_db  # noqa: E402
from schemas import (  # noqa: E402
    InstantMeetingIn, JoinIn, LeaveIn, MeetingOut, MessageIn, MessageOut,
    ParticipantOut, ScheduleMeetingIn, UserOut,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    print(f"SQLite database ready at {get_db_path()}")
    yield


app = FastAPI(title="Zoom Clone API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_meeting(meeting_id: str) -> dict:
    mid = crud.normalize_meeting_id(meeting_id)
    meeting = crud.get_meeting(mid) if mid else None
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found. Check the Meeting ID or invite link.")
    return meeting


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/users/me", response_model=UserOut)
def me():
    return crud.get_default_user()


@app.get("/meetings/upcoming", response_model=list[MeetingOut])
def upcoming():
    return crud.list_upcoming()


@app.get("/meetings/recent", response_model=list[MeetingOut])
def recent():
    return crud.list_recent()


@app.post("/meetings/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def instant(body: InstantMeetingIn | None = None):
    return crud.create_instant(body.title if body else None)


@app.post("/meetings/schedule", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def schedule(body: ScheduleMeetingIn):
    return crud.create_scheduled(body.title, body.description, body.scheduled_at, body.duration_minutes)


@app.get("/meetings/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: str):
    return require_meeting(meeting_id)


@app.post("/meetings/{meeting_id}/join", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def join(meeting_id: str, body: JoinIn):
    m = require_meeting(meeting_id)
    return crud.join_meeting(m["id"], body.display_name, body.is_host, body.participant_id)


@app.get("/meetings/{meeting_id}/participants", response_model=list[ParticipantOut])
def participants(meeting_id: str):
    return crud.list_participants(require_meeting(meeting_id)["id"])


@app.post("/meetings/{meeting_id}/leave")
def leave(meeting_id: str, body: LeaveIn):
    m = require_meeting(meeting_id)
    if not crud.leave_meeting(m["id"], body.participant_id):
        raise HTTPException(status_code=404, detail="Participant is not in this meeting")
    return {"status": "left"}


@app.get("/meetings/{meeting_id}/messages", response_model=list[MessageOut])
def messages(meeting_id: str, after_id: int = Query(default=0, ge=0)):
    return crud.list_messages(require_meeting(meeting_id)["id"], after_id)


@app.post("/meetings/{meeting_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def post_message(meeting_id: str, body: MessageIn):
    m = require_meeting(meeting_id)
    return crud.add_message(m["id"], body.participant_id, body.sender_name, body.content)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
