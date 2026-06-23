import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSharedLogbook, submitMark, submitAssessment, publicUrl } from "../lib/api";
import { downloadCasesCsv, generateCaseSeries } from "../lib/exportCsv";
import { CasusBand } from "./Brand";
import { SpecialtyIcon } from "./Specialty";

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

function SharedDetail({ token, c, onClose, onMarked }) {
  const [score, setScore] = useState(c.mark?.score || "");
  const [comment, setComment] = useState(c.mark?.comment || "");
  const [assessor, setAssessor] = useState(c.mark?.assessor_name || "");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [aType, setAType] = useState("Mini-CEX");
  const [aRating, setARating] = useState("");
  const [aStrengths, setAStrengths] = useState("");
  const [aImprove, setAImprove] = useState("");
  const [aName, setAName] = useState("");
  const [aRole, setARole] = useState("");
  const [aVerified, setAVerified] = useState(false);
  const [aSaved, setASaved] = useState(false);
  const [aErr, setAErr] = useState("");
  const saveAssessment = async () => {
    setAErr("");
    if (!aName.trim()) { setAErr("Please add your name."); return; }
    try {
      await submitAssessment(token, c.id, { type: aType, rating: aRating, strengths: aStrengths.trim(), improve: aImprove.trim(), assessor_name: aName.trim(), assessor_role: aRole.trim(), verified: aVerified });
      setASaved(true); setTimeout(() => setASaved(false), 1800); setAStrengths(""); setAImprove(""); setAVerified(false); onMarked();
    } catch (e) { setAErr(e.message || "Could not submit."); }
  };
  const save = async () => {
    setErr("");
    try { await submitMark(token, c.id, score, comment.trim(), assessor.trim()); setSaved(true); setTimeout(() => setSaved(false), 1800); onMarked(); }
    catch (e) { setErr(e.message || "Could not save mark."); }
  };
  const clin = [c.specialty, c.category, c.involvement].filter(Boolean);
  const demo = [c.date, c.patient_initials, c.age, c.sex, c.tribe].filter(Boolean);
  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">{c.case_no}</span><button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <Gallery media={c.media} section="photo" label="Clinical photos & videos" />
          <Gallery media={c.media} section="radiology" label="Radiology" />
          <Gallery media={c.media} section="lab" label="Labs & investigations" />
          <Gallery media={c.media} section="notes" label="Clinical notes & documents" />
          <div className="dtitle serif" style={{ marginTop: (c.media && c.media.length) ? 16 : 0 }}>{c.title}</div>
          {clin.length > 0 && <div className="dpills">{clin.map((p, i) => <span key={i} className="pill gold">{p}</span>)}</div>}
          {demo.length > 0 && <div className="dpills">{demo.map((p, i) => <span key={i} className="pill">{p}</span>)}</div>}
          {c.admitted && <div className="dpills"><span className="pill" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>Admitted{c.ward ? " · " + c.ward : ""}</span></div>}
          {c.diagnosis && <div className="sec"><h4>Diagnosis</h4><p>{c.diagnosis}</p></div>}
          {c.examination_findings && <div className="sec"><h4>Examination findings</h4><p>{c.examination_findings}</p></div>}
          <div className="sec"><h4>Brief description</h4><p>{c.description}</p></div>
          {c.management && <div className="sec"><h4>Management</h4><p>{c.management}</p></div>}
          {c.outcome && <div className="sec"><h4>Outcome</h4><p>{c.outcome}</p></div>}
          {c.hospital && <div className="sec"><h4>Hospital / facility</h4><p>{c.hospital}</p></div>}
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
          <div className="markpanel">
            <h4>Award a mark</h4>
            <div className="row">
              <div className="field" style={{ maxWidth: 140 }}><label>Score</label><input value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 8/10 or A" /></div>
              <div className="field"><label>Your name</label><input value={assessor} onChange={(e) => setAssessor(e.target.value)} placeholder="Assessor" /></div>
            </div>
            <div className="field"><label>Comment</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Feedback for the trainee" /></div>
            {err && <div className="err">{err}</div>}
            <button className="btn pri sm" onClick={save}>{saved ? "Saved ✓" : c.mark ? "Update mark" : "Save mark"}</button>
          </div>
          <div className="markpanel" style={{ marginTop: 14 }}>
            <h4>Workplace-based assessment &amp; sign-off</h4>
            {c.assessments && c.assessments.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {c.assessments.map((a, i) => (
                  <div key={i} className="fuitem">
                    <div className="d">{a.type || "Assessment"}{a.rating ? " · " + a.rating : ""}{a.verified ? " · ✓ verified" : ""}{a.assessor_name ? " — " + a.assessor_name : ""}{a.assessor_role ? " (" + a.assessor_role + ")" : ""}</div>
                    {a.strengths && <div className="n"><b>Strengths:</b> {a.strengths}</div>}
                    {a.improve && <div className="n"><b>To improve:</b> {a.improve}</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="row">
              <div className="field"><label>Assessment type</label>
                <select value={aType} onChange={(e) => setAType(e.target.value)}>{["Mini-CEX", "DOPS", "Case-based discussion (CBD)", "Direct observation", "Other"].map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Overall rating</label>
                <select value={aRating} onChange={(e) => setARating(e.target.value)}><option value="">—</option>{["Below expectations", "Borderline", "Meets expectations", "Above expectations"].map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="field"><label>Strengths</label><textarea value={aStrengths} onChange={(e) => setAStrengths(e.target.value)} /></div>
            <div className="field"><label>Areas to improve</label><textarea value={aImprove} onChange={(e) => setAImprove(e.target.value)} /></div>
            <div className="row">
              <div className="field"><label>Assessor name</label><input value={aName} onChange={(e) => setAName(e.target.value)} /></div>
              <div className="field"><label>Assessor role / grade</label><input value={aRole} onChange={(e) => setARole(e.target.value)} placeholder="e.g. Consultant" /></div>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 10, textTransform: "none", letterSpacing: 0 }}>
              <input type="checkbox" checked={aVerified} onChange={(e) => setAVerified(e.target.checked)} style={{ width: "auto" }} />
              <span>I confirm I supervised or observed this case and verify this assessment.</span>
            </label>
            {aErr && <div className="err">{aErr}</div>}
            <button className="btn pri sm" onClick={saveAssessment}>{aSaved ? "Saved ✓" : "Submit assessment"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharedView() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null });
  const [viewing, setViewing] = useState(null);
  const load = () => getSharedLogbook(token).then((data) => setState({ loading: false, data })).catch(() => setState({ loading: false, data: null }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  if (state.loading) return <div className="load">Loading logbook…</div>;
  if (!state.data) return (<div className="empty"><h3 className="serif">Link not found</h3><p>This share link is invalid or has been revoked by its owner.</p></div>);

  const { owner_name, cases } = state.data;
  return (
    <>
      <CasusBand />
      <div className="banner">Shared logbook · read-only · you can leave marks</div>
      <header className="head"><div className="head-in">
        <div className="brand"><div className="brandtext"><span className="eyebrow">Logbook of</span><span className="wm serif">{owner_name}</span></div></div>
        <div className="userbar">
          <span>{cases.length} {cases.length === 1 ? "case" : "cases"}</span>
          {cases.length > 0 && <button className="btn sm" onClick={() => downloadCasesCsv(cases)}>Download list</button>}
          {cases.length > 0 && <button className="btn sm" onClick={() => generateCaseSeries(cases, owner_name, "Case Series")}>Case series</button>}
        </div>
      </div></header>
      <div className="wrap">
        {cases.length === 0 ? (<div className="empty"><h3 className="serif">Empty logbook</h3><p>No cases yet.</p></div>) : (
          <div className="list">
            {cases.map((c) => (
              <div className="entry" key={c.id} tabIndex={0} role="button" onClick={() => setViewing(c)} onKeyDown={(e) => { if (e.key === "Enter") setViewing(c); }}>
                <div className="th">{c.media?.find((m) => m.kind === "image") ? <img src={publicUrl(c.media.find((m) => m.kind === "image").path)} alt="" /> : <span className="th-icon"><SpecialtyIcon specialty={c.specialty} /></span>}</div>
                <div className="ec">
                  <div className="erow">
                    <span className="num">{c.case_no}</span>
                    {c.specialty && <span className="pill gold">{c.category || c.specialty}</span>}
                    {c.involvement && <span className="pill">{c.involvement}</span>}
                    {c.mark && <span className="markbadge">marked · {c.mark.score}</span>}
                  </div>
                  <div className="etitle serif">{c.title}</div>
                  <div className="esnip">{c.diagnosis || c.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {viewing && <SharedDetail token={token} c={viewing} onClose={() => setViewing(null)} onMarked={load} />}
    </>
  );
}
