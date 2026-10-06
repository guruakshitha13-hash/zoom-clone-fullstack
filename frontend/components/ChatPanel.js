"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { CloseIcon, SendIcon } from "./Icons";

export default function ChatPanel({ meetingId, participantId, displayName, onClose, onNewMessages }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const fresh = await api.messages(meetingId, lastId.current);
        if (!alive) return;
        setError("");
        if (fresh.length) {
          lastId.current = fresh[fresh.length - 1].id;
          setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))]);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [meetingId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    onNewMessages?.(messages.length);
  }, [messages, onNewMessages]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(meetingId, { participant_id: participantId, sender_name: displayName, content });
      setText("");
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      lastId.current = Math.max(lastId.current, msg.id);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="side-panel" aria-label="Chat">
      <div className="side-head">
        <h3>Chat</h3>
        <button className="icon-btn dark" aria-label="Close chat" onClick={onClose}><CloseIcon size={18} /></button>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="side-empty">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = participantId ? m.participant_id === participantId : m.sender_name === displayName;
            return (
              <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
                <div className="chat-meta"><strong>{mine ? "You" : m.sender_name}</strong><span>{formatTime(m.created_at)}</span></div>
                <div className="chat-bubble">{m.content}</div>
              </div>
            );
          })
        )}
      </div>
      {error && <p className="side-error">{error}</p>}
      <form className="chat-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message here…" maxLength={2000} aria-label="Message" />
        <button className="send-btn" disabled={sending || !text.trim()} aria-label="Send"><SendIcon size={18} /></button>
      </form>
    </aside>
  );
}
