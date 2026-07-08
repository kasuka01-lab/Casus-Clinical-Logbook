import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminStats, adminListUsers, adminAllCases, publicUrl } from "../lib/api";
import { CasusBand } from "./Brand";

function Gallery({ media, section, label }) {
  const items = (media || []).filter((m) => (m.section || "photo") === section);
  if (!items.length) return null;
  return (<><div className="galhead">{label}</div><div className="gal">
    {items.map((m, i) => (
      <figure className="mediafig" key={i}>
        {m.kind === "video" ? <video src={publicUrl(m.path)} controls />
          : m.kind === "file" ? <a className="doclink" href={publicUrl(m.path)} target="_blank" rel="noreferrer">Open document ({(m.path.split(".").pop() || "file").toUpperCase()})</a>
          : <img src={publicUrl(m.path)} alt={m.caption || ""} />}
        {m.caption && <figcaption>{m.caption}</figcaption>}
      </figure>
    ))}
  </div></>);
}

function AdminCaseDetail({ c, onClose }) {
  const clin = [c.specialty, c.category, c.involvement].filter(Boolean);
  const demo = [c.date, c.age, c.sex, c.tribe].filter(Boolean);
  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">{c.case_no}</span><button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <div className="note" style={{ marginTop: 0 }}>Logged by {c.owner_name}{c.owner_institution ? " · " + c.owner_institution : ""}</div>
          <Gallery media={c.media} section="photo" label="Clinical photos & videos" />
          <Gallery media={c.media} section="radiology" label="Radiology" />
          <Gallery media={c.media} section="lab" label="Labs & investigations" />
          <Gallery media={c.media} section="notes" label="Clinical notes & documents" />
          <div className="dtitle serif" style={{ marginTop: (c.media && c.media.length) ? 16 : 8 }}>{c.title}</div>
          {clin.length > 0 && <div className="dpills">{clin.map((p, i) => <span key={i} className="pill gold">{p}</span>)}</div>}
          {demo.length > 0 && <div className="dpills">{demo.map((p, i) => <span key={i} className="pill">{p}</span>)}</div>}
          {c.admitted && <div className="dpills"><span className="pill" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>Admitted{c.ward ? " · " + c.ward : ""}</span></div>}
          {c.diagnosis && <div className="sec"><h4>Diagnosis</h4><p>{c.diagnosis}</p></div>}
          <div className="sec"><h4>Brief description</h4><p>{c.description}</p></div>
          {c.management && <div className="sec"><h4>Management</h4><p>{c.management}</p></div>}
          {c.challenges && <div className="sec"><h4>Challenges</h4><p>{c.challenges}</p></div>}
          {c.discussion && <div className="sec"><h4>Discussion</h4><p>{c.discussion}</p></div>}
          {(c.supervisor || c.supervisor_qualification) && <div className="sec"><h4>Supervised by</h4><p>{[c.supervisor, c.supervisor_qualification].filter(Boolean).join(" — ")}</p></div>}
          {c.followups && c.followups.some((f) => f.type === "progress") && (
            <div className="fu"><h4 style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: 10 }}>Daily ward-round progress</h4>
              {c.followups.filter((f) => f.type === "progress").map((f, i) => <div className="fuitem" key={i}><div className="d">{f.date || ""}</div><div className="n">{f.note}</div></div>)}
            </div>
          )}
          {c.followups && c.followups.some((f) => f.type !== "progress") && (
            <div className="fu"><h4 style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: 10 }}>Follow-up</h4>
              {c.followups.filter((f) => f.type !== "progress").map((f, i) => <div className="fuitem" key={i}><div className="d">{f.date || ""}</div><div className="n">{f.note}</div></div>)}
            </div>
          )}
          {c.assessments && c.assessments.length > 0 && (
            <div className="markpanel"><h4>Assessments &amp; sign-off</h4>
              {c.assessments.map((a, i) => (
                <div key={i} className="fuitem">
                  <div className="d">{a.type || "Assessment"}{a.rating ? " · " + a.rating : ""}{a.verified ? " · ✓ verified" : ""}{a.assessor_name ? " — " + a.assessor_name : ""}{a.assessor_role ? " (" + a.assessor_role + ")" : ""}</div>
                  {a.strengths && <div className="n"><b>Strengths:</b> {a.strengths}</div>}
                  {a.improve && <div className="n"><b>To improve:</b> {a.improve}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="private" style={{ marginTop: 18 }}><p className="note" style={{ margin: 0 }}>Patient name and contact are kept private to the treating doctor and are not shown here.</p></div>
        </div>
      </div>
    </div>
  );
}

export default function Admin({ profile }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [err, setErr] = useState("");
  const [viewing, setViewing] = useState(null);
  const [open, setOpen] = useState({}); // owner_id -> expanded

  useEffect(() => {
    adminStats().then(setStats).catch((e) => setErr(e.message || "Not authorized."));
    adminListUsers().then(setUsers).catch(() => {});
    adminAllCases().then(setCases).catch(() => {});
  }, []);

  if (err) return (<><CasusBand /><div className="wrap"><div className="empty"><h3 className="serif">Admin only</h3><p>{err}</p><Link className="btn" to="/">Back to my logbook</Link></div></div></>);

  const byOwner = {};
  cases.forEach((c) => { (byOwner[c.owner_id] = byOwner[c.owner_id] || []).push(c); });
  const name = (u) => [u.first_name, u.surname].filter(Boolean).join(" ") || u.full_name || "(no name)";

  return (
    <>
      <CasusBand />
      <div className="wrap">
        <div className="tool">
          <div><h2 className="serif">Administrator</h2><div className="meta">Casus — platform overview</div></div>
          <Link className="btn sm" to="/">My logbook</Link>
        </div>
        <div className="statgrid">
          <div className="stat"><div className="n">{stats?.users ?? "—"}</div><div className="l">Users</div></div>
          <div className="stat"><div className="n">{stats?.cases ?? cases.length}</div><div className="l">Cases</div></div>
          <div className="stat"><div className="n">{stats?.institutions ?? "—"}</div><div className="l">Institutions</div></div>
          <div className="stat"><div className="n">{stats?.share_links ?? "—"}</div><div className="l">Active links</div></div>
        </div>

        <h2 className="serif" style={{ fontSize: 18, marginBottom: 4 }}>Doctors &amp; their cases</h2>
        <div className="note" style={{ marginTop: 0, marginBottom: 14 }}>Tap a doctor to see their cases, then a case to open it. Patient names &amp; contacts stay private to each doctor.</div>

        {users.map((u) => {
          const list = byOwner[u.id] || [];
          const isOpen = open[u.id];
          return (
            <div key={u.id} style={{ border: "1px solid var(--line)", borderRadius: 4, marginBottom: 10, background: "var(--card)" }}>
              <div className="tablerow" style={{ padding: "12px 14px", margin: 0, cursor: "pointer", borderBottom: isOpen ? "1px solid var(--line)" : "none" }}
                onClick={() => setOpen((o) => ({ ...o, [u.id]: !o[u.id] }))}>
                <span>{name(u)} {u.institution ? <span className="role"> · {u.institution}</span> : null}</span>
                <span className="role">{list.length} {list.length === 1 ? "case" : "cases"} · {u.role}{isOpen ? " ▲" : " ▼"}</span>
              </div>
              {isOpen && (
                <div style={{ padding: "6px 14px 12px" }}>
                  {list.length === 0 ? <div className="note" style={{ marginTop: 8 }}>No cases yet.</div>
                    : list.map((c) => (
                      <div key={c.id} className="tablerow" style={{ cursor: "pointer" }} onClick={() => setViewing(c)}>
                        <span>{c.title}<span className="role"> · {c.specialty || "—"}{c.category ? " / " + c.category : ""}</span></span>
                        <span className="role">{c.date || ""}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {viewing && <AdminCaseDetail c={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
