"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { NAME_KEY, formatDate, formatMeetingId, formatTime, inviteLinkFor, parseMeetingInput } from "@/lib/utils";
import { Alert, CopyButton, Spinner } from "./ui";
import { ArrowLeftIcon } from "./Icons";

export function MeetingInfo({ meeting }) {
  return (
    <div className="meeting-info">
      <h3>{meeting.title}</h3>
      {meeting.description && <p className="muted">{meeting.description}</p>}
      <dl>
        <div><dt>Meeting ID</dt><dd>{formatMeetingId(meeting.meeting_id)}</dd></div>
        <div><dt>Host</dt><dd>{meeting.host_name}</dd></div>
        <div><dt>When</dt><dd>{formatDate(meeting.scheduled_at)}, {formatTime(meeting.scheduled_at)}</dd></div>
        <div><dt>Duration</dt><dd>{meeting.duration_minutes} min</dd></div>
      </dl>
      <CopyButton text={inviteLinkFor(meeting.meeting_id)} />
    </div>
  );
}

// Step 1: enter ID/link (skipped when initialId provided). Step 2: show meeting + ask for display name.
export default function JoinFlow({ initialId = "" }) {
  const router = useRouter();
  const [input, setInput] = useState(initialId);
  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [joining, setJoining] = useState(false);

  const validate = async (raw) => {
    setError("");
    setMeeting(null);
    const id = parseMeetingInput(raw);
    if (!id) {
      setError(raw.trim() ? "That doesn't look like a valid Meeting ID or invite link." : "Please enter a Meeting ID or invite link.");
      return;
    }
    if (id.length < 9 || id.length > 11) {
      setError("Meeting IDs are 10 digits long. Please check and try again.");
      return;
    }
    setChecking(true);
    try {
      setMeeting(await api.getMeeting(id));
    } catch (e) {
      setError(e.status === 404 ? "Meeting not found. Check the Meeting ID or invite link." : e.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    api.me().then((u) => setName((n) => n || localStorage.getItem(NAME_KEY) || u.name)).catch(() => setName((n) => n || localStorage.getItem(NAME_KEY) || ""));
    if (initialId) validate(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const join = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setNameError("Please enter your display name.");
      return;
    }
    setNameError("");
    setJoining(true);
    sessionStorage.setItem(`zc-name-${meeting.meeting_id}`, n);
    router.push(`/meeting/${meeting.meeting_id}?name=${encodeURIComponent(n)}`);
  };

  return (
    <main className="container narrow">
      <Link href="/" className="back-link"><ArrowLeftIcon size={16} /> Back to home</Link>
      <div className="card form-card">
        <h1>Join Meeting</h1>
        {!meeting && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); validate(input); }}>
            <label className="field">
              <span>Meeting ID or invite link</span>
              <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 123 456 7890 or http://localhost:3000/join/1234567890" />
            </label>
            {error && <Alert>{error}</Alert>}
            <button className="btn btn-primary btn-block" disabled={checking}>
              {checking ? "Checking…" : "Continue"}
            </button>
          </form>
        )}
        {checking && meeting === null && initialId && <Spinner label="Finding meeting…" />}
        {meeting && (
          <form className="form" onSubmit={join}>
            <MeetingInfo meeting={meeting} />
            <label className="field">
              <span>Your display name</span>
              <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} placeholder="Enter your name" maxLength={60} />
            </label>
            {nameError && <Alert>{nameError}</Alert>}
            <div className="row-gap">
              {!initialId && <button type="button" className="btn btn-secondary" onClick={() => setMeeting(null)}>Change meeting</button>}
              <button className="btn btn-primary btn-grow" disabled={joining}>{joining ? "Joining…" : "Join Meeting"}</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
