"use client";
import Link from "next/link";
import { formatDate, formatMeetingId, formatTime, inviteLinkFor } from "@/lib/utils";
import { CopyButton } from "./ui";

export default function MeetingCard({ meeting, variant = "upcoming" }) {
  const start = new Date(meeting.scheduled_at);
  const live = start <= new Date() && new Date(start.getTime() + meeting.duration_minutes * 60000) > new Date();
  return (
    <article className="meeting-card">
      <div className="meeting-time">
        <span className="meeting-time-main">{formatTime(meeting.scheduled_at)}</span>
        <span className="meeting-time-sub">{formatDate(meeting.scheduled_at)}</span>
      </div>
      <div className="meeting-body">
        <div className="meeting-title-row">
          <h3>{meeting.title}</h3>
          {variant === "upcoming" && live && <span className="pill pill-live">Live</span>}
          {meeting.is_instant && <span className="pill">Instant</span>}
        </div>
        {meeting.description && <p className="meeting-desc">{meeting.description}</p>}
        <p className="meeting-meta">
          ID: {formatMeetingId(meeting.meeting_id)} · {meeting.duration_minutes} min · Host: {meeting.host_name}
          {meeting.active_participants > 0 && ` · ${meeting.active_participants} in meeting`}
        </p>
      </div>
      <div className="meeting-actions">
        <Link href={`/join/${meeting.meeting_id}`} className={`btn btn-sm ${variant === "upcoming" ? "btn-primary" : "btn-secondary"}`}>
          {variant === "upcoming" ? "Start" : "Rejoin"}
        </Link>
        <CopyButton text={inviteLinkFor(meeting.meeting_id)} label="Copy link" />
      </div>
    </article>
  );
}
