export function formatMeetingId(id) {
  const s = String(id || "");
  if (s.length !== 10) return s;
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
}

// Accepts "123 456 7890", "1234567890" or any invite link containing /join/<id> or /meeting/<id>
export function parseMeetingInput(input) {
  const value = (input || "").trim();
  if (!value) return "";
  const m = value.match(/\/(?:join|meeting)\/([\d\s-]+)/i);
  const raw = m ? m[1] : value;
  if (/[a-z]/i.test(raw) && !m) return "";
  return raw.replace(/\D/g, "");
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

const COLORS = ["#0B5CFF", "#FF742E", "#16A34A", "#9333EA", "#DB2777", "#0891B2", "#CA8A04"];
export function colorFor(name) {
  let h = 0;
  for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

// Invite links point at the frontend that's actually open, so they always work.
export function inviteLinkFor(meetingId) {
  if (typeof window === "undefined") return `/join/${meetingId}`;
  return `${window.location.origin}/join/${meetingId}`;
}

export const NAME_KEY = "zc-display-name";
