"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatMeetingId, formatTime, inviteLinkFor } from "@/lib/utils";
import { Alert, CopyButton } from "./ui";
import { ArrowLeftIcon, CheckIcon } from "./Icons";

const pad = (n) => String(n).padStart(2, "0");

export default function ScheduleForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", duration: "30" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const d = new Date(Date.now() + 60 * 60000);
    d.setMinutes(0);
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    setMinDate(today);
    setForm((f) => ({ ...f, date: today, time: `${pad(d.getHours())}:00` }));
  }, []);

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: "" }); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.date) errs.date = "Date is required.";
    if (!form.time) errs.time = "Time is required.";
    const when = form.date && form.time ? new Date(`${form.date}T${form.time}`) : null;
    if (when && isNaN(when.getTime())) errs.date = "Invalid date or time.";
    else if (when && when < new Date()) errs.time = "Please pick a time in the future.";
    const dur = Number(form.duration);
    if (!dur || dur < 15 || dur > 480) errs.duration = "Duration must be between 15 and 480 minutes.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setSubmitError("");
    try {
      const m = await api.schedule({
        title: form.title.trim(),
        description: form.description.trim(),
        scheduled_at: when.toISOString(),
        duration_minutes: dur,
      });
      setCreated(m);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <main className="container narrow">
        <div className="card form-card success-card">
          <span className="success-icon"><CheckIcon size={32} /></span>
          <h1>Meeting scheduled</h1>
          <p className="muted">{created.title}</p>
          <dl className="success-details">
            <div><dt>When</dt><dd>{formatDate(created.scheduled_at)}, {formatTime(created.scheduled_at)}</dd></div>
            <div><dt>Duration</dt><dd>{created.duration_minutes} min</dd></div>
            <div><dt>Meeting ID</dt><dd>{formatMeetingId(created.meeting_id)}</dd></div>
            <div><dt>Invite link</dt><dd className="break">{inviteLinkFor(created.meeting_id)}</dd></div>
          </dl>
          <div className="row-gap center">
            <CopyButton text={inviteLinkFor(created.meeting_id)} className="btn btn-secondary" />
            <button className="btn btn-primary" onClick={() => router.push("/#upcoming")}>View Upcoming Meetings</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container narrow">
      <Link href="/" className="back-link"><ArrowLeftIcon size={16} /> Back to home</Link>
      <div className="card form-card">
        <h1>Schedule Meeting</h1>
        <form className="form" onSubmit={submit} noValidate>
          <label className="field">
            <span>Title</span>
            <input value={form.title} onChange={set("title")} placeholder="My Meeting" maxLength={120} />
            {errors.title && <small className="field-error">{errors.title}</small>}
          </label>
          <label className="field">
            <span>Description <em>(optional)</em></span>
            <textarea value={form.description} onChange={set("description")} rows={3} maxLength={1000} placeholder="What's this meeting about?" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Date</span>
              <input type="date" min={minDate} value={form.date} onChange={set("date")} />
              {errors.date && <small className="field-error">{errors.date}</small>}
            </label>
            <label className="field">
              <span>Time</span>
              <input type="time" value={form.time} onChange={set("time")} />
              {errors.time && <small className="field-error">{errors.time}</small>}
            </label>
          </div>
          <label className="field">
            <span>Duration</span>
            <select value={form.duration} onChange={set("duration")}>
              {[15, 30, 45, 60, 90, 120, 180].map((d) => <option key={d} value={d}>{d < 60 ? `${d} minutes` : `${d / 60} hour${d > 60 ? "s" : ""}`}</option>)}
            </select>
            {errors.duration && <small className="field-error">{errors.duration}</small>}
          </label>
          {submitError && <Alert>{submitError}</Alert>}
          <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Scheduling…" : "Schedule"}</button>
        </form>
      </div>
    </main>
  );
}
