import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { listMyCases, deleteCase, getCaseMedia, publicUrl, getMarksForOwner } from "../lib/api";
import { downloadCasesCsv, generateCaseSeries } from "../lib/exportCsv";
import { SPECIALTIES } from "../lib/taxonomy";
import { CasusLogo, CasusBand } from "./Brand";
import { SpecialtyIcon } from "./Specialty";
import CaseForm from "./CaseForm";
import CaseDetail from "./CaseDetail";
import ShareManager from "./ShareManager";
import Profile from "./Profile";
import Dashboard from "./Dashboard";

function Entry({ c, mark, onOpen }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    getCaseMedia(c.id).then((m) => { const img = m.find((x) => x.kind === "image"); if (img) setThumb(publicUrl(img.storage_path)); });
  }, [c.id]);
  return (
    <div className="entry" tabIndex={0} role="button" onClick={() => onOpen(c)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(c); }}>
      <div className="th">{thumb ? <img src={thumb} alt="" /> : <span className="th-icon"><SpecialtyIcon specialty={c.specialty} /></span>}</div>
      <div className="ec">
        <div className="erow">
          <span className="num">{c.case_no}</span>
          {c.specialty && <span className="pill gold">{c.category || c.specialty}</span>}
          {c.involvement && <span className="pill">{c.involvement}</span>}
          {c.date && <span className="pill">{c.date}</span>}
          {mark && <span className="markbadge">marked · {mark.score}</span>}
        </div>
        <div className="etitle serif">{c.title}</div>
        <div className="esnip">{c.diagnosis || c.description}</div>
      </div>
    </div>
  );
}

export default function Logbook({ profile, onProfileUpdated }) {
  const [cases, setCases] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const reload = useCallback(async () => {
    const [cs, ms] = await Promise.all([listMyCases(), getMarksForOwner()]);
    setCases(cs); setMarks(ms); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const markFor = (id) => marks.find((m) => m.case_id === id);
  const remove = async (c) => { setViewing(null); await deleteCase(c.id); reload(); };

  const usedSpecs = SPECIALTIES.filter((s) => cases.some((c) => c.specialty === s));
  const ql = q.trim().toLowerCase();
  const shown = cases.filter((c) => {
    if (filter !== "All" && c.specialty !== filter) return false;
    if (!ql) return true;
    return [c.title, c.diagnosis, c.specialty, c.category, c.patient_name, c.supervisor]
      .filter(Boolean).some((v) => v.toLowerCase().includes(ql));
  });
  const reveal = ql.length > 0 || filter !== "All" || showAll;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueCases = cases.filter((c) => c.next_review && c.next_review <= todayStr).sort((a, b) => (a.next_review || "").localeCompare(b.next_review || ""));
  const fullName = [profile.first_name, profile.surname].filter(Boolean).join(" ") || profile.full_name || profile.email;
  const avatar = publicUrl(profile.avatar_path);
  const initials = ((profile.first_name?.[0] || "") + (profile.surname?.[0] || "")).toUpperCase() || "?";

  return (
    <>
      <CasusBand />
      <header className="head"><div className="head-in">
        <div className="brand"><CasusLogo size={34} /><div className="brandtext"><span className="eyebrow">Clinical logbook</span><span className="wm serif">Casus</span></div></div>
        <div className="userbar">
          {profile.role === "admin" && <Link className="linkbtn" to="/admin">Admin</Link>}
          <button className="linkbtn" onClick={() => setShowProfile(true)}>Profile</button>
          {avatar ? <img className="avatar-sm" src={avatar} alt="" /> : <span className="avatar-sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--gold-dk)" }}>{initials}</span>}
          <button className="linkbtn" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      </div></header>

      <div className="wrap">
        <div className="tool">
          <div><h2 className="serif">My logbook</h2>
            <div className="meta">{cases.length} {cases.length === 1 ? "case" : "cases"} · {fullName}</div></div>
          <div className="tool-actions">
            <button className="btn sm" onClick={() => setShowDashboard(true)}>Dashboard</button>
            <button className="btn sm" disabled={!shown.length} onClick={() => downloadCasesCsv(shown)}>Download list</button>
            <button className="btn sm" disabled={!shown.length} onClick={() => generateCaseSeries(shown, fullName, filter === "All" ? "Case Series" : filter + " — Case Series")}>Case series</button>
            <button className="btn sm" onClick={() => setShowShare(true)}>Share link</button>
            <button className="btn pri sm" onClick={() => { setEditing(null); setShowForm(true); }}>+ New case</button>
          </div>
        </div>

        {dueCases.length > 0 && (
          <div className="duebox">
            <div className="duehead">{dueCases.length} case{dueCases.length === 1 ? "" : "s"} due for review</div>
            {dueCases.map((c) => (
              <div className="duerow" key={c.id} onClick={() => setViewing(c)}>
                <span>{c.title}</span><span className="mono">due {c.next_review}</span>
              </div>
            ))}
          </div>
        )}

        {cases.length > 0 && (
          <div className="searchbar">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by patient, diagnosis, title, specialty, supervisor…" />
          </div>
        )}

        {usedSpecs.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
            <button className="btn sm" style={filter === "All" ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}} onClick={() => setFilter("All")}>All</button>
            {usedSpecs.map((s) => (
              <button key={s} className="btn sm" style={{ whiteSpace: "nowrap", ...(filter === s ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}) }} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        )}

        {loading ? <div className="load">Loading…</div>
          : cases.length === 0 ? (
            <div className="empty"><h3 className="serif">Your logbook is empty</h3>
              <p>Log your first case — the diagnosis, your level of involvement, management, challenges, follow-up and images. It stays private until you share a link.</p>
              <button className="btn pri" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add the first case</button></div>
          ) : !reveal ? (
            <div className="empty"><h3 className="serif">Find a case</h3>
              <p>Your cases stay private and aren't listed here. Search above to pull up a case, or show your full list.</p>
              <button className="btn" onClick={() => setShowAll(true)}>Show all {cases.length} {cases.length === 1 ? "case" : "cases"}</button></div>
          ) : shown.length === 0 ? (
            <div className="empty"><h3 className="serif">No matches</h3><p>Nothing matches your search or filter.</p></div>
          ) : (
            <>
              {showAll && !ql && filter === "All" && (
                <div style={{ marginBottom: 10 }}><button className="linkbtn" onClick={() => setShowAll(false)}>Hide list</button></div>
              )}
              <div className="list">{shown.map((c) => <Entry key={c.id} c={c} mark={markFor(c.id)} onOpen={setViewing} />)}</div>
            </>
          )}
      </div>

      {viewing && <CaseDetail c={viewing} author={fullName} onClose={() => setViewing(null)}
        onEdit={(c) => { setViewing(null); setEditing(c); setShowForm(true); }} onDelete={remove} />}
      {showForm && <CaseForm profile={profile} existing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); reload(); }} />}
      {showShare && <ShareManager onClose={() => setShowShare(false)} />}
      {showDashboard && <Dashboard cases={cases} profile={profile} onClose={() => setShowDashboard(false)} />}
      {showProfile && <Profile profile={profile} onClose={() => setShowProfile(false)}
        onSaved={() => { setShowProfile(false); onProfileUpdated && onProfileUpdated(); }} />}
    </>
  );
}
