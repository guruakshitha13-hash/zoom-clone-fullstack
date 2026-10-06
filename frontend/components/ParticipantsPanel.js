"use client";
import { Avatar } from "./ui";
import { CloseIcon } from "./Icons";

export default function ParticipantsPanel({ participants, selfId, error, onClose }) {
  return (
    <aside className="side-panel" aria-label="Participants">
      <div className="side-head">
        <h3>Participants ({participants.length})</h3>
        <button className="icon-btn dark" aria-label="Close participants" onClick={onClose}><CloseIcon size={18} /></button>
      </div>
      <ul className="participant-list">
        {participants.length === 0 && <li className="side-empty">No one has joined yet.</li>}
        {participants.map((p) => (
          <li key={p.id} className="participant">
            <Avatar name={p.display_name} size={32} />
            <span className="participant-name">
              {p.display_name}
              {p.id === selfId && <em> (You)</em>}
            </span>
            {p.is_host && <span className="pill pill-host">Host</span>}
          </li>
        ))}
      </ul>
      {error && <p className="side-error">{error}</p>}
    </aside>
  );
}
