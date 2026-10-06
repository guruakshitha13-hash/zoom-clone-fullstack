"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { NAME_KEY, formatMeetingId, inviteLinkFor } from "@/lib/utils";
import useLocalMedia from "./useLocalMedia";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import { MeetingInfo } from "./JoinFlow";
import { Alert, Avatar, CopyButton, Modal, Spinner } from "./ui";
import { ChatIcon, InfoIcon, MicIcon, MicOffIcon, ScreenIcon, UsersIcon, VideoIcon, VideoOffIcon } from "./Icons";

function VideoEl({ stream, mirrored }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={mirrored ? "mirrored" : ""} />;
}

function Timer({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const p = (n) => String(n).padStart(2, "0");
  return <span className="timer">{s >= 3600 ? `${Math.floor(s / 3600)}:` : ""}{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}

function Control({ on, onClick, label, icon, offIcon, danger, badge }) {
  return (
    <button className={`ctrl ${on === false ? "ctrl-off" : ""} ${danger ? "ctrl-danger" : ""}`} onClick={onClick} aria-pressed={on}>
      <span className="ctrl-icon">{on === false && offIcon ? offIcon : icon}{badge ? <span className="ctrl-badge">{badge}</span> : null}</span>
      <span className="ctrl-label">{label}</span>
    </button>
  );
}

export default function MeetingRoom({ meetingId }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState(null); // null = not yet resolved
  const [nameInput, setNameInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [participant, setParticipant] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [participants, setParticipants] = useState([]);
  const [pError, setPError] = useState("");
  const [panel, setPanel] = useState(null); // "chat" | "participants" | null
  const [showInfo, setShowInfo] = useState(false);
  const [joinedAt] = useState(() => Date.now());
  const [unread, setUnread] = useState(0);
  const seenCount = useRef(0);
  const media = useLocalMedia();

  // Resolve meeting + display name (URL query → sessionStorage → prompt).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = (q.get("name") || sessionStorage.getItem(`zc-name-${meetingId}`) || "").trim();
    setIsHost(q.get("host") === "1");
    setName(n);
    setNameInput(localStorage.getItem(NAME_KEY) || "");
    api.getMeeting(meetingId).then(setMeeting).catch((e) => setLoadError(e.status === 404 ? "This meeting doesn't exist. Check the Meeting ID or invite link." : e.message));
  }, [meetingId]);

  // Register participant in SQLite once we have a meeting and name.
  useEffect(() => {
    if (!meeting || !name) return;
    let cancelled = false;
    const key = `zc-pid-${meetingId}`;
    const prev = Number(sessionStorage.getItem(key)) || undefined;
    api.join(meetingId, { display_name: name, is_host: isHost, participant_id: prev })
      .then((p) => {
        if (cancelled) return;
        sessionStorage.setItem(key, String(p.id));
        sessionStorage.setItem(`zc-name-${meetingId}`, name);
        setParticipant(p);
        // Keep the name in the URL so a refresh never loses it.
        const url = new URL(window.location.href);
        url.searchParams.set("name", name);
        window.history.replaceState(null, "", url.toString());
        media.startMic();
        media.startCamera();
      })
      .catch((e) => !cancelled && setJoinError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, name]);

  // Poll participants.
  useEffect(() => {
    if (!participant) return;
    let alive = true;
    const load = () => api.participants(meetingId).then((p) => { if (alive) { setParticipants(p); setPError(""); } }).catch((e) => alive && setPError(e.message));
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [participant, meetingId]);

  const onMessages = useCallback((count) => {
    if (panel === "chat") { seenCount.current = count; setUnread(0); }
    else setUnread(Math.max(0, count - seenCount.current));
  }, [panel]);

  const leave = async () => {
    media.stopAll();
    if (participant) {
      try { await api.leave(meetingId, participant.id); } catch { /* still leave locally */ }
      sessionStorage.removeItem(`zc-pid-${meetingId}`);
    }
    router.push("/");
  };

  if (loadError) {
    return (
      <main className="room-message">
        <div className="card form-card">
          <h1>Unable to join</h1>
          <Alert>{loadError}</Alert>
          <div className="row-gap">
            <Link className="btn btn-secondary" href="/">Home</Link>
            <Link className="btn btn-primary" href="/join">Join another meeting</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!meeting || name === null) return <main className="room-message"><Spinner label="Loading meeting…" /></main>;

  if (!name) {
    return (
      <main className="room-message">
        <form className="card form-card form" onSubmit={(e) => { e.preventDefault(); if (nameInput.trim()) setName(nameInput.trim()); }}>
          <h1>Enter your name</h1>
          <MeetingInfo meeting={meeting} />
          <label className="field"><span>Display name</span>
            <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)} maxLength={60} placeholder="Your name" />
          </label>
          {!nameInput.trim() && <small className="muted">A display name is required to join.</small>}
          <button className="btn btn-primary btn-block" disabled={!nameInput.trim()}>Join Meeting</button>
        </form>
      </main>
    );
  }

  if (joinError) {
    return (
      <main className="room-message">
        <div className="card form-card"><h1>Couldn&apos;t join</h1><Alert onRetry={() => { setJoinError(""); setMeeting({ ...meeting }); }}>{joinError}</Alert></div>
      </main>
    );
  }

  const others = participants.filter((p) => p.id !== participant?.id);
  const sharing = !!media.screenStream;
  const selfTile = (
    <div className={`tile ${sharing ? "tile-mini" : "tile-self"}`}>
      {media.camOn && media.camStream ? <VideoEl stream={media.camStream} mirrored /> : <div className="tile-avatar"><Avatar name={name} size={sharing ? 48 : 96} /></div>}
      <span className="tile-name">{!media.micOn && <MicOffIcon size={14} />} {name} (You)</span>
    </div>
  );

  return (
    <div className="room">
      <header className="room-top">
        <div className="room-title">
          <button className="room-info-btn" onClick={() => setShowInfo(true)} aria-label="Meeting information"><InfoIcon size={18} /></button>
          <div>
            <strong>{meeting.title}</strong>
            <span>ID: {formatMeetingId(meeting.meeting_id)}</span>
          </div>
        </div>
        <div className="room-top-right">
          <CopyButton text={inviteLinkFor(meeting.meeting_id)} label="Invite" className="btn btn-dark btn-sm" />
          <Timer since={joinedAt} />
        </div>
      </header>

      {media.notice && (
        <div className="room-notice" role="status">
          <span>{media.notice}</span>
          <button onClick={() => media.setNotice("")} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="room-body">
        <section className={`stage ${sharing ? "stage-share" : ""}`}>
          {!participant ? (
            <Spinner label="Joining meeting…" />
          ) : sharing ? (
            <>
              <div className="tile tile-screen"><VideoEl stream={media.screenStream} /><span className="tile-name">You are sharing your screen</span></div>
              <div className="filmstrip">{selfTile}{others.map((p) => <div key={p.id} className="tile tile-mini"><div className="tile-avatar"><Avatar name={p.display_name} size={48} /></div><span className="tile-name">{p.display_name}</span></div>)}</div>
            </>
          ) : (
            <div className={`grid grid-${Math.min(others.length + 1, 6)}`}>
              {selfTile}
              {others.map((p) => (
                <div key={p.id} className="tile">
                  <div className="tile-avatar"><Avatar name={p.display_name} size={80} /></div>
                  <span className="tile-name">{p.display_name}{p.is_host ? " · Host" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        {panel === "chat" && participant && <ChatPanel meetingId={meetingId} participantId={participant.id} displayName={name} onClose={() => setPanel(null)} onNewMessages={onMessages} />}
        {panel === "participants" && <ParticipantsPanel participants={participants} selfId={participant?.id} error={pError} onClose={() => setPanel(null)} />}
      </div>

      {/* Hidden chat poller keeps the unread badge current while chat is closed */}
      {panel !== "chat" && participant && <div hidden><ChatPanel meetingId={meetingId} participantId={participant.id} displayName={name} onClose={() => {}} onNewMessages={onMessages} /></div>}

      <footer className="controls">
        <div className="controls-group">
          <Control on={media.micOn} onClick={media.toggleMic} label={media.micOn ? "Mute" : "Unmute"} icon={<MicIcon />} offIcon={<MicOffIcon />} />
          <Control on={media.camOn} onClick={media.toggleCamera} label={media.camOn ? "Stop Video" : "Start Video"} icon={<VideoIcon />} offIcon={<VideoOffIcon />} />
        </div>
        <div className="controls-group">
          <Control onClick={() => setPanel(panel === "participants" ? null : "participants")} label="Participants" icon={<UsersIcon />} badge={participants.length || null} />
          <Control onClick={() => setPanel(panel === "chat" ? null : "chat")} label="Chat" icon={<ChatIcon />} badge={unread || null} />
          <Control onClick={media.toggleScreen} label={sharing ? "Stop Share" : "Share Screen"} icon={<ScreenIcon />} danger={sharing} />
        </div>
        <button className="btn btn-danger leave-btn" onClick={leave}>Leave</button>
      </footer>

      {showInfo && (
        <Modal title="Meeting information" onClose={() => setShowInfo(false)}>
          <MeetingInfo meeting={meeting} />
          <p className="muted small">You joined as <strong>{name}</strong>{participant?.is_host ? " (Host)" : ""}.</p>
        </Modal>
      )}
    </div>
  );
}
