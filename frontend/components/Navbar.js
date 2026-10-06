"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NAME_KEY } from "@/lib/utils";
import { SettingsIcon } from "./Icons";
import { Avatar, Modal } from "./ui";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [defaultName, setDefaultName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
    setDefaultName(localStorage.getItem(NAME_KEY) || "");
  }, []);

  const save = (e) => {
    e.preventDefault();
    const v = defaultName.trim();
    if (v) localStorage.setItem(NAME_KEY, v);
    else localStorage.removeItem(NAME_KEY);
    setSaved(true);
    setTimeout(() => { setSaved(false); setSettings(false); }, 900);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">z</span>
          <span className="brand-text">zoomclone</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/join">Join</Link>
          <Link href="/schedule">Schedule</Link>
        </nav>
        <div className="nav-right">
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettings(true)}>
            <SettingsIcon size={20} />
          </button>
          <div className="profile">
            <button className="profile-btn" aria-label="Profile" onClick={() => setMenu((m) => !m)}>
              <Avatar name={user?.name || "User"} size={34} />
            </button>
            {menu && (
              <div className="dropdown" onMouseLeave={() => setMenu(false)}>
                <div className="dropdown-user">
                  <Avatar name={user?.name || "User"} size={44} />
                  <div>
                    <strong>{user?.name || "Guest"}</strong>
                    <span>{user?.email || "Backend offline"}</span>
                  </div>
                </div>
                <span className="badge">Licensed · Default user</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {settings && (
        <Modal title="Settings" onClose={() => setSettings(false)}>
          <form onSubmit={save} className="form">
            <label className="field">
              <span>Default display name when joining</span>
              <input value={defaultName} onChange={(e) => setDefaultName(e.target.value)} placeholder={user?.name || "Your name"} maxLength={60} />
            </label>
            <button className="btn btn-primary" type="submit">{saved ? "Saved" : "Save settings"}</button>
          </form>
        </Modal>
      )}
    </header>
  );
}
