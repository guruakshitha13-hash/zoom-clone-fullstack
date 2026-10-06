"use client";
import MeetingCard from "./MeetingCard";
import { Alert, Spinner } from "./ui";
import { CalendarIcon } from "./Icons";

export default function MeetingList({ id, title, meetings, loading, error, onRetry, variant, emptyText }) {
  return (
    <section className="panel" id={id}>
      <div className="panel-head">
        <h2>{title}</h2>
        {!loading && !error && <span className="count">{meetings.length}</span>}
      </div>
      {loading ? (
        <Spinner label="Loading meetings…" />
      ) : error ? (
        <Alert onRetry={onRetry}>{error}</Alert>
      ) : meetings.length === 0 ? (
        <div className="empty">
          <CalendarIcon size={36} />
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="meeting-list">
          {meetings.map((m) => <MeetingCard key={m.id} meeting={m} variant={variant} />)}
        </div>
      )}
    </section>
  );
}
