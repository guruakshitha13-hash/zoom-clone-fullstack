"use client";
import { useState } from "react";
import { CheckIcon, CloseIcon, CopyIcon } from "./Icons";
import { copyText, colorFor, initials } from "@/lib/utils";

export function Spinner({ label }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function Alert({ children, tone = "error", onRetry }) {
  return (
    <div className={`alert alert-${tone}`} role="alert">
      <span>{children}</span>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Avatar({ name, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </span>
  );
}

export function CopyButton({ text, label = "Copy invite link", className = "btn btn-secondary btn-sm" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
