"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { NAME_KEY } from "@/lib/utils";
import MeetingList from "./MeetingList";
import { Alert } from "./ui";
import { CalendarIcon, ClockIcon, PlusIcon, VideoIcon } from "./Icons";

function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hero-clock">
      <div className="hero-time">{now ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "\u00a0"}</div>
      <div className="hero-date">{now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00a0"}</div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, r] = await Promise.all([api.upcoming(), api.recent()]);
      setUpcoming(u);
      setRecent(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const newMeeting = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const [meeting, me] = await Promise.all([api.createInstant(), api.me()]);
      const name = localStorage.getItem(NAME_KEY) || me.name;
      sessionStorage.setItem(`zc-name-${meeting.meeting_id}`, name);
      router.push(`/meeting/${meeting.meeting_id}?name=${encodeURIComponent(name)}&host=1`);
    } catch (e) {
      setCreateError(e.message);
      setCreating(false);
    }
  };

  return (
    <main className="container dashboard">
      <section className="hero">
        <Clock />
        <div className="actions">
          <button className="action-tile" onClick={newMeeting} disabled={creating}>
            <span className="action-icon action-orange">{creating ? <span className="spinner spinner-light" /> : <VideoIcon size={30} />}</span>
            <span className="action-label">{creating ? "Starting…" : "New Meeting"}</span>
          </button>
          <button className="action-tile" onClick={() => router.push("/join")}>
            <span className="action-icon"><PlusIcon size={30} /></span>
            <span className="action-label">Join Meeting</span>
          </button>
          <button className="action-tile" onClick={() => router.push("/schedule")}>
            <span className="action-icon"><CalendarIcon size={30} /></span>
            <span className="action-label">Schedule</span>
          </button>
          <button className="action-tile" onClick={() => document.getElementById("upcoming")?.scrollIntoView({ behavior: "smooth" })}>
            <span className="action-icon"><ClockIcon size={30} /></span>
            <span className="action-label">Upcoming</span>
          </button>
        </div>
        {createError && <Alert>{createError}</Alert>}
      </section>

      <div className="lists">
        <MeetingList id="upcoming" title="Upcoming Meetings" meetings={upcoming} loading={loading} error={error} onRetry={load} variant="upcoming" emptyText="No upcoming meetings. Schedule one to see it here." />
        <MeetingList id="recent" title="Recent Meetings" meetings={recent} loading={loading} error={error} onRetry={load} variant="recent" emptyText="No recent meetings yet." />
      </div>
    </main>
  );
}
