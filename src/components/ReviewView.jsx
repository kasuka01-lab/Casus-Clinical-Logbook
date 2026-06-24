import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReviewLink, submitSupervisorReview } from "../lib/api";
import { CasusBand } from "./Brand";
import { SpecialtyIcon } from "./Specialty";

function CaseReviewForm({ token, c }) {
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaved(false);
    if (score === "") {
      setErr("Enter a score from 0 to 10.");
      return;
    }
    const numericScore = Number(score);
    if (!Number.isInteger(numericScore) || numericScore < 0 || numericScore > 10) {
      setErr("Score must be a whole number from 0 to 10.");
      return;
    }
    setBusy(true);
    try {
      await submitSupervisorReview(token, c.id, {
        supervisor_name: c._supervisorName,
        supervisor_role: c._supervisorRole,
        score: numericScore,
        comments: comments.trim(),
      });
      setSaved(true);
    } catch (e) {
      setErr(e.message || "Could not submit review.");
    }
    setBusy(false);
  };

  return (
    <form className="markpanel" onSubmit={submit}>
      <h4>Supervisor review</h4>
      <div className="row">
        <div className="field" style={{ maxWidth: 150 }}>
          <label>Score / 10</label>
          <input
            type="number"
            min="0"
            max="10"
            step="1"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="0-10"
          />
        </div>
        <div className="field">
          <label>Comments</label>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Feedback for the trainee" />
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      {saved && <div className="note" style={{ color: "var(--ok)" }}>Review submitted.</div>}
      <button className="btn pri sm" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit review"}</button>
    </form>
  );
}

function ReviewCase({ token, c, supervisorName, supervisorRole }) {
  const caseWithReviewer = { ...c, _supervisorName: supervisorName, _supervisorRole: supervisorRole };
  const clinical = [c.specialty, c.category, c.involvement].filter(Boolean);
  const demographics = [c.date, c.age, c.sex].filter(Boolean);
  const progress = (c.followups || []).filter((f) => f.type === "progress");
  const followups = (c.followups || []).filter((f) => f.type !== "progress");

  return (
    <div className="entry reviewcase">
      <div className="th"><span className="th-icon"><SpecialtyIcon specialty={c.specialty} /></span></div>
      <div className="ec">
        <div className="erow">
          <span className="num">{c.case_no}</span>
          {clinical.map((p, i) => <span key={i} className={i === 0 ? "pill gold" : "pill"}>{p}</span>)}
          {demographics.map((p, i) => <span key={"d" + i} className="pill">{p}</span>)}
        </div>
        <div className="etitle serif">{c.title}</div>
        {c.diagnosis && <div className="sec"><h4>Diagnosis</h4><p>{c.diagnosis}</p></div>}
        <div className="sec"><h4>Brief description</h4><p>{c.description}</p></div>
        {c.examination_findings && <div className="sec"><h4>Examination findings</h4><p>{c.examination_findings}</p></div>}
        {c.management && <div className="sec"><h4>Management</h4><p>{c.management}</p></div>}
        {c.outcome && <div className="sec"><h4>Outcome</h4><p>{c.outcome}</p></div>}
        {c.hospital && <div className="sec"><h4>Hospital / facility</h4><p>{c.hospital}</p></div>}
        {c.challenges && <div className="sec"><h4>Challenges</h4><p>{c.challenges}</p></div>}
        {c.discussion && <div className="sec"><h4>Discussion</h4><p>{c.discussion}</p></div>}
        {(c.supervisor || c.supervisor_qualification) && <div className="sec"><h4>Supervised by</h4><p>{[c.supervisor, c.supervisor_qualification].filter(Boolean).join(" - ")}</p></div>}

        {progress.length > 0 && (
          <div className="fu">
            <h4>Daily ward-round progress</h4>
            {progress.map((f, i) => <div className="fuitem" key={i}><div className="d">{f.date || ""}</div><div className="n">{f.note}</div></div>)}
          </div>
        )}
        {followups.length > 0 && (
          <div className="fu">
            <h4>Follow-up</h4>
            {followups.map((f, i) => <div className="fuitem" key={i}><div className="d">{f.date || ""}</div><div className="n">{f.note}</div></div>)}
          </div>
        )}

        <CaseReviewForm token={token} c={caseWithReviewer} />
      </div>
    </div>
  );
}

export default function ReviewView() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null });
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorRole, setSupervisorRole] = useState("");

  useEffect(() => {
    getReviewLink(token)
      .then((data) => setState({ loading: false, data }))
      .catch(() => setState({ loading: false, data: null }));
  }, [token]);

  if (state.loading) return <div className="load">Loading review link...</div>;
  if (!state.data) return (<div className="empty"><h3 className="serif">Review link not found</h3><p>This link is invalid or has been revoked.</p></div>);

  const { owner_name, cases } = state.data;

  return (
    <>
      <CasusBand />
      <div className="banner">Supervisor review link</div>
      <header className="head"><div className="head-in">
        <div className="brand"><div className="brandtext"><span className="eyebrow">Review for</span><span className="wm serif">{owner_name || "Trainee"}</span></div></div>
        <div className="userbar"><span>{cases.length} {cases.length === 1 ? "case" : "cases"}</span></div>
      </div></header>

      <div className="wrap">
        <div className="box reviewerbox">
          <div className="row">
            <div className="field">
              <label>Your name</label>
              <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="Supervisor name" />
            </div>
            <div className="field">
              <label>Role / grade</label>
              <input value={supervisorRole} onChange={(e) => setSupervisorRole(e.target.value)} placeholder="Consultant, registrar..." />
            </div>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="empty"><h3 className="serif">No cases selected</h3><p>This review link does not contain any cases.</p></div>
        ) : (
          <div className="list reviewlist">
            {cases.map((c) => (
              <ReviewCase
                key={c.id}
                token={token}
                c={c}
                supervisorName={supervisorName}
                supervisorRole={supervisorRole}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
