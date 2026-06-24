import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { listMyCases, deleteCase, getCaseMedia, publicUrl, getMarksForOwner, createReviewLink, listMyProcedures } from "../lib/api";
import { downloadCasesCsv, generateCaseSeries, generatePortfolio } from "../lib/exportCsv";
import { SPECIALTIES } from "../lib/taxonomy";
import { CasusLogo, CasusBand } from "./Brand";
import { SpecialtyIcon } from "./Specialty";
import CaseForm from "./CaseForm";
import CaseDetail from "./CaseDetail";
import ShareManager from "./ShareManager";
import Profile from "./Profile";
import Dashboard from "./Dashboard";
import Procedures from "./Procedures";

const REVIEW_BASE_URL = "https://casuslog.com/review";

function Entry({ c, mark, selected, onSelect, onOpen }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    getCaseMedia(c.id).then((m) => { const img = m.find((x) => x.kind === "image"); if (img) setThumb(publicUrl(img.storage_path)); });
  }, [c.id]);
  return (
    <div className="entry" tabIndex={0} role="button" onClick={() => onOpen(c)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(c); }}>
      <label className="casecheck" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(c.id)} aria-label={`Select ${c.case_no} for review`} />
      </label>
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
  const [procedures, setProcedures] = useState([]);
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
  const [showProcedures, setShowProcedures] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [reviewLink, setReviewLink] = useState("");
  const [reviewErr, setReviewErr] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);

  const reload = useCallback(async () => {
    const [cs, ms, ps] = await Promise.all([
      listMyCases(),
      getMarksForOwner(),
      listMyProcedures().catch((e) => { console.warn("procedures unavailable", e); return []; }),
    ]);
    setCases(cs); setMarks(ms); setProcedures(ps); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const markFor = (id) => marks.find((m) => m.case_id === id);
  const remove = async (c) => {
    setViewing(null);
    setSelectedCaseIds((ids) => ids.filter((id) => id !== c.id));
    await deleteCase(c.id);
    reload();
  };
  const toggleSelected = (id) => {
    setReviewErr("");
    setReviewLink("");
    setSelectedCaseIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };
  const selectShown = () => {
    setReviewErr("");
    setReviewLink("");
    const visibleIds = shown.map((c) => c.id);
    setSelectedCaseIds((ids) => Array.from(new Set([...ids, ...visibleIds])));
  };
  const clearSelected = () => {
    setSelectedCaseIds([]);
    setReviewLink("");
    setReviewErr("");
  };
  const generateReviewLink = async () => {
    setReviewErr("");
    setReviewLink("");
    if (selectedCaseIds.length === 0) { setReviewErr("Select at least one case."); return; }
    setReviewBusy(true);
    try {
      const link = await createReviewLink(selectedCaseIds);
      setReviewLink(`${REVIEW_BASE_URL}/${link.token}`);
    } catch (e) {
      setReviewErr(e.message || "Could not create review link.");
    }
    setReviewBusy(false);
  };
  const copyReviewLink = () => {
    try {
      navigator.clipboard.writeText(reviewLink);
      setCopiedReview(true);
      setTimeout(() => setCopiedReview(false), 1500);
    } catch {}
  };

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
            <button className="btn sm" onClick={() => setShowProcedures(true)}>Procedures</button>
            <button className="btn sm" disabled={!shown.length} onClick={() => downloadCasesCsv(shown)}>Download list</button>
            <button className="btn sm" disabled={!shown.length} onClick={() => generateCaseSeries(shown, fullName, filter === "All" ? "Case Series" : filter + " — Case Series")}>Case series</button>
            <button className="btn sm" disabled={!cases.length && !procedures.length} onClick={() => generatePortfolio(cases, fullName, profile, procedures)}>Generate Portfolio PDF</button>
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

        {reveal && shown.length > 0 && (
          <div className="reviewbar">
            <div>
              <b>{selectedCaseIds.length}</b> selected for supervisor review
              {reviewErr && <div className="err">{reviewErr}</div>}
            </div>
            <div className="reviewactions">
              <button className="btn sm" onClick={selectShown}>Select visible</button>
              <button className="btn sm" disabled={!selectedCaseIds.length} onClick={clearSelected}>Clear</button>
              <button className="btn pri sm" disabled={!selectedCaseIds.length || reviewBusy} onClick={generateReviewLink}>
                {reviewBusy ? "Generating..." : "Generate Review Link"}
              </button>
            </div>
            {reviewLink && (
              <div className="tokenrow reviewtoken">
                <input readOnly value={reviewLink} onFocus={(e) => e.target.select()} />
                <button className="btn sm" onClick={copyReviewLink}>{copiedReview ? "Copied" : "Copy"}</button>
              </div>
            )}
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
              <div className="list">{shown.map((c) => (
                <Entry
                  key={c.id}
                  c={c}
                  mark={markFor(c.id)}
                  selected={selectedCaseIds.includes(c.id)}
                  onSelect={toggleSelected}
                  onOpen={setViewing}
                />
              ))}</div>
            </>
          )}
      </div>

      {viewing && <CaseDetail c={viewing} onClose={() => setViewing(null)}
        onEdit={(c) => { setViewing(null); setEditing(c); setShowForm(true); }} onDelete={remove} />}
      {showForm && <CaseForm profile={profile} existing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); reload(); }} />}
      {showShare && <ShareManager onClose={() => setShowShare(false)} />}
      {showDashboard && <Dashboard cases={cases} procedures={procedures} profile={profile} onClose={() => setShowDashboard(false)} />}
      {showProcedures && <Procedures cases={cases} procedures={procedures} profile={profile} onClose={() => setShowProcedures(false)} onChanged={reload} />}
      {showProfile && <Profile profile={profile} onClose={() => setShowProfile(false)}
        onSaved={() => { setShowProfile(false); onProfileUpdated && onProfileUpdated(); }} />}
    </>
  );
}
