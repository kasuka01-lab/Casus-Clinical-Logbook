import React, { useEffect, useState } from "react";
import { listShareLinks, createShareLink, revokeShareLink } from "../lib/api";

export default function ShareManager({ onClose }) {
  const [links, setLinks] = useState([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const load = () => listShareLinks().then(setLinks);
  useEffect(() => { load(); }, []);

  const make = async () => {
    setBusy(true);
    try { await createShareLink(label.trim() || null); setLabel(""); await load(); } catch {}
    setBusy(false);
  };
  const linkFor = (t) => `${window.location.origin}/s/${t}`;
  const copy = (t) => { try { navigator.clipboard.writeText(linkFor(t)); setCopied(t); setTimeout(() => setCopied(""), 1500); } catch {} };

  const active = links.filter((l) => !l.revoked);
  return (
    <div className="back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">Share your logbook</span>
          <button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <p className="note" style={{ marginTop: 0, marginBottom: 14 }}>
            Each link gives read-only access to your whole logbook and lets the viewer leave marks. No account needed.
            Make a separate link per supervisor or panel so you can revoke them individually.
          </p>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Label (optional)</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Prof. Kagawa — MOG8204" />
            </div>
            <button className="btn pri" onClick={make} disabled={busy} style={{ marginBottom: 0 }}>{busy ? "…" : "Create link"}</button>
          </div>
          <div style={{ marginTop: 18 }}>
            {active.length === 0 && <div className="note">No active links yet.</div>}
            {active.map((l) => (
              <div className="sharebox" key={l.id}>
                {l.label && <div className="mono" style={{ fontSize: 12, color: "var(--ink2)" }}>{l.label}</div>}
                <div className="tokenrow">
                  <input readOnly value={linkFor(l.token)} onFocus={(e) => e.target.select()} />
                  <button className="btn sm" onClick={() => copy(l.token)}>{copied === l.token ? "Copied" : "Copy"}</button>
                  <button className="btn sm" style={{ color: "var(--accent-dk)" }}
                    onClick={async () => { await revokeShareLink(l.id); load(); }}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
