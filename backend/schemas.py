"""Pydantic request/response models."""
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_color: str


class MeetingOut(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: str
    host_id: int
    host_name: str
    scheduled_at: str
    duration_minutes: int
    invite_link: str
    is_instant: bool
    created_at: str
    active_participants: int


class InstantMeetingIn(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)


class ScheduleMeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    scheduled_at: datetime
    duration_minutes: int = Field(ge=15, le=480)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title is required")
        return v

    @field_validator("scheduled_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v < datetime.now(timezone.utc):
            raise ValueError("Meeting time must be in the future")
        return v


class JoinIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    is_host: bool = False
    participant_id: Optional[int] = None

    @field_validator("display_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Display name is required")
        return v


class LeaveIn(BaseModel):
    participant_id: int


class ParticipantOut(BaseModel):
    id: int
    display_name: str
    is_host: bool
    joined_at: str
    left_at: Optional[str]


class MessageIn(BaseModel):
    participant_id: Optional[int] = None
    sender_name: str = Field(min_length=1, max_length=60)
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content", "sender_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class MessageOut(BaseModel):
    id: int
    participant_id: Optional[int]
    sender_name: str
    content: str
    created_at: str
