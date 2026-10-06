// Central API helper. All backend calls go through here.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Can't reach the server. Make sure the backend is running at ${API_URL}.`, 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    let msg = data && data.detail;
    if (Array.isArray(msg)) {
      msg = msg.map((d) => String(d.msg || "").replace(/^Value error, /, "")).join(". ");
    }
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body || {}) });

export const api = {
  health: () => request("/health"),
  me: () => request("/users/me"),
  upcoming: () => request("/meetings/upcoming"),
  recent: () => request("/meetings/recent"),
  createInstant: (title) => post("/meetings/instant", { title }),
  schedule: (data) => post("/meetings/schedule", data),
  getMeeting: (id) => request(`/meetings/${encodeURIComponent(id)}`),
  join: (id, data) => post(`/meetings/${encodeURIComponent(id)}/join`, data),
  leave: (id, participantId) => post(`/meetings/${encodeURIComponent(id)}/leave`, { participant_id: participantId }),
  participants: (id) => request(`/meetings/${encodeURIComponent(id)}/participants`),
  messages: (id, afterId = 0) => request(`/meetings/${encodeURIComponent(id)}/messages?after_id=${afterId}`),
  sendMessage: (id, data) => post(`/meetings/${encodeURIComponent(id)}/messages`, data),
};
