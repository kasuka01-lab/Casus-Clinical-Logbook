import React, { useEffect, useState, useRef } from "react";
import { getCaseMedia, publicUrl, getMarksForOwner, listFollowUps, addFollowUp, deleteFollowUp, listAssessments, uploadImageBlob } from "../lib/api";
import { resizeImage } from "../lib/media";
import DictateButton from "./DictateButton";

function clinicalPills(c) { return [c.specialty, c.category, c.involvement].filter(Boolean); }
function demoPills(c) { return [c.date, c.age, c.sex, c.tribe].filter(Boolean); }

function MediaItem({ m }) {
  const url = publicUrl(m.storage_path);
  const inner = m.kind === "video" ? <video src={url} controls />
    : m.kind === "file" ? <a className="doclink" href={url} target="_blank" rel="noreferrer">Open document ({(m.storage_path.split(".").pop() || "file").toUpperCase()})</a>
    : <img src={url} alt={m.caption || ""} />;
  return <figure className="mediafig">{inner}{m.caption && <figcaption>{m.caption}</figcaption>}</figure>;
}
function Gallery({ media, kindSection, label }) {
  const items = media.filter((m) => (m.section || "photo") === kindSection && !m.follow_up_id);
  if (!items.length) return null;
  return (<><div className="galhead">{label}</div><div className="gal">{items.map((m) => <MediaItem key={m.id} m={m} />)}</div></>);
}
function PendingPhotos({ photos, setPhotos, onPick }) {
  const ref = useRef(null);
  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" className="btn sm" onClick={() => ref.current && ref.current.click()}>Add photos</button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
      {photos.length > 0 && (
        <div className="thumbs" style={{ marginTop: 8 }}>
          {photos.map((p, i) => (
            <div className="pt" key={i}>
              <img src={p.url} alt="" />
              <button onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}>×</button>
              <input className="cap" value={p.caption} placeholder="Add a caption…" onChange={(e) => setPhotos((arr) => arr.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CaseDetail({ c, onClose, onEdit, onDelete }) {
  const [media, setMedia] = useState([]);
  const [mark, setMark] = useState(null);
  const [fus, setFus] = useState([]);
  const [fuDate, setFuDate] = useState(new Date().toISOString().slice(0, 10));
  const [fuNote, setFuNote] = useState("");
  const [pgDate, setPgDate] = useState(new Date().toISOString().slice(0, 10));
  const [pgNote, setPgNote] = useState("");
  const [pgPhotos, setPgPhotos] = useState([]);
  const [fuPhotos, setFuPhotos] = useState([]);

  const [assessments, setAssessments] = useState([]);
  const loadFus = () => listFollowUps(c.id).then(setFus);
  useEffect(() => {
    getCaseMedia(c.id).then(setMedia);
    getMarksForOwner().then((all) => setMark(all.find((m) => m.case_id === c.id) || null));
    loadFus();
    listAssessments(c.id).then(setAssessments);
  }, [c.id]);

  const progressNotes = fus.filter((f) => f.type === "progress");
  const followNotes = fus.filter((f) => f.type !== "progress");

  const addPhotos = async (files, setter) => {
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const blob = await resizeImage(f);
      setter((arr) => [...arr, { url: URL.createObjectURL(blob), blob, caption: "" }]);
    }
  };
  const reloadMedia = () => getCaseMedia(c.id).then(setMedia);
  const saveFu = async () => {
    if (!fuNote.trim() && fuPhotos.length === 0) return;
    const id = await addFollowUp(c.id, fuDate, fuNote.trim(), "followup");
    for (const ph of fuPhotos) await uploadImageBlob(c.id, ph.blob, "photo", ph.caption || null, id);
    setFuNote(""); setFuPhotos([]); loadFus(); reloadMedia();
  };
  const savePg = async () => {
    if (!pgNote.trim() && pgPhotos.length === 0) return;
    const id = await addFollowUp(c.id, pgDate, pgNote.trim(), "progress");
    for (const ph of pgPhotos) await uploadImageBlob(c.id, ph.blob, "photo", ph.caption || null, id);
    setPgNote(""); setPgPhotos([]); loadFus(); reloadMedia();
  };
  const fuMedia = (fid) => media.filter((m) => m.follow_up_id === fid);

  const head = (t) => ({ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: 10 });

  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">{c.case_no}</span>
          <button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <Gallery media={media} kindSection="photo" label="Clinical photos & videos" />
          <Gallery media={media} kindSection="radiology" label="Radiology" />
          <Gallery media={media} kindSection="lab" label="Labs & investigations" />
          <Gallery media={media} kindSection="notes" label="Clinical notes & documents" />

          <div className="dtitle serif" style={{ marginTop: media.length ? 16 : 0 }}>{c.title}</div>
          {clinicalPills(c).length > 0 && <div className="dpills">{clinicalPills(c).map((p, i) => <span key={i} className="pill gold">{p}</span>)}</div>}
          {demoPills(c).length > 0 && <div className="dpills">{demoPills(c).map((p, i) => <span key={i} className="pill">{p}</span>)}</div>}
          {c.admitted && <div className="dpills"><span className="pill" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>Admitted{c.ward ? " · " + c.ward : ""}{c.admission_date ? " · since " + c.admission_date : ""}</span></div>}
          {c.next_review && <div className="note" style={{ marginTop: 4 }}>Next review: {c.next_review}</div>}

          {c.diagnosis && <div className="sec"><h4>Diagnosis</h4><p>{c.diagnosis}</p></div>}
          <div className="sec"><h4>Brief description</h4><p>{c.description}</p></div>
          {c.examination_findings && <div className="sec"><h4>Examination findings</h4><p>{c.examination_findings}</p></div>}
          {c.management && <div className="sec"><h4>Management</h4><p>{c.management}</p></div>}
          {c.challenges && <div className="sec"><h4>Challenges</h4><p>{c.challenges}</p></div>}
          {c.discussion && <div className="sec"><h4>Discussion</h4><p>{c.discussion}</p></div>}
          {(c.supervisor || c.supervisor_qualification) && <div className="sec"><h4>Supervised by</h4><p>{[c.supervisor, c.supervisor_qualification].filter(Boolean).join(" — ")}</p></div>}
          {c.hospital && <div className="sec"><h4>Hospital / facility</h4><p>{c.hospital}</p></div>}
          {c.outcome && <div className="sec"><h4>Outcome</h4><p>{c.outcome}</p></div>}

          {(c.patient_name || c.patient_contact) && (
            <div className="private">
              <h4 style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 5 }}>Patient (private to you)</h4>
              {c.patient_name && <p style={{ fontSize: 14.5 }}>{c.patient_name}</p>}
              {c.patient_contact && <p style={{ fontSize: 15 }}><a className="tel" href={`tel:${c.patient_contact.replace(/[^+\d]/g, "")}`}>{c.patient_contact}</a></p>}
            </div>
          )}

          {c.admitted && (
            <div className="fu">
              <h4 style={head()}>Daily ward-round progress</h4>
              {progressNotes.map((f) => (
                <div className="fuitem" key={f.id}>
                  <div className="d">{f.date || ""}</div><div className="n">{f.note}</div>
                  {fuMedia(f.id).length > 0 && <div className="gal sm">{fuMedia(f.id).map((m) => <MediaItem key={m.id} m={m} />)}</div>}
                  <button className="linkbtn" style={{ fontSize: 12 }} onClick={async () => { await deleteFollowUp(f.id); loadFus(); reloadMedia(); }}>remove</button>
                </div>
              ))}
              <div className="row" style={{ marginTop: 8 }}>
                <div className="field" style={{ maxWidth: 160, marginBottom: 8 }}><label>Date</label>
                  <input type="date" value={pgDate} onChange={(e) => setPgDate(e.target.value)} /></div>
              </div>
              <div className="field" style={{ marginBottom: 8 }}><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Progress note</span><DictateButton onText={(t) => setPgNote((v) => (v ? v + " " : "") + t)} /></label>
                <textarea value={pgNote} onChange={(e) => setPgNote(e.target.value)} placeholder="Ward-round entry: today's findings, plan…" /></div>
              <PendingPhotos photos={pgPhotos} setPhotos={setPgPhotos} onPick={(files) => addPhotos(files, setPgPhotos)} />
              <button className="btn gold sm" onClick={savePg}>Add progress note</button>
            </div>
          )}

          <div className="fu">
            <h4 style={head()}>Follow-up</h4>
            {followNotes.map((f) => (
              <div className="fuitem" key={f.id}>
                <div className="d">{f.date || ""}</div><div className="n">{f.note}</div>
                {fuMedia(f.id).length > 0 && <div className="gal sm">{fuMedia(f.id).map((m) => <MediaItem key={m.id} m={m} />)}</div>}
                <button className="linkbtn" style={{ fontSize: 12 }} onClick={async () => { await deleteFollowUp(f.id); loadFus(); reloadMedia(); }}>remove</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <div className="field" style={{ maxWidth: 160, marginBottom: 8 }}><label>Date</label>
                <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} /></div>
            </div>
            <div className="field" style={{ marginBottom: 8 }}><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Follow-up note</span><DictateButton onText={(t) => setFuNote((v) => (v ? v + " " : "") + t)} /></label>
              <textarea value={fuNote} onChange={(e) => setFuNote(e.target.value)} placeholder="Progress, results, next steps…" /></div>
            <PendingPhotos photos={fuPhotos} setPhotos={setFuPhotos} onPick={(files) => addPhotos(files, setFuPhotos)} />
            <button className="btn gold sm" onClick={saveFu}>Add follow-up</button>
          </div>

          {assessments.length > 0 && (
            <div className="markpanel"><h4>Assessments &amp; sign-off</h4>
              {assessments.map((a) => (
                <div key={a.id} className="fuitem">
                  <div className="d">{a.type || "Assessment"}{a.rating ? " · " + a.rating : ""}{a.verified ? " · ✓ verified" : ""}{a.assessor_name ? " — " + a.assessor_name : ""}{a.assessor_role ? " (" + a.assessor_role + ")" : ""}{a.created_at ? " · " + new Date(a.created_at).toISOString().slice(0, 10) : ""}</div>
                  {a.strengths && <div className="n"><b>Strengths:</b> {a.strengths}</div>}
                  {a.improve && <div className="n"><b>To improve:</b> {a.improve}</div>}
                </div>
              ))}
            </div>
          )}
          {mark && (
            <div className="markpanel"><h4>Assessor mark</h4>
              <p style={{ fontSize: 14.5 }}><b>{mark.score}</b>{mark.comment ? " — " + mark.comment : ""}{mark.assessor_name ? "  (" + mark.assessor_name + ")" : ""}</p></div>
          )}
          <div className="detail-actions">
            <button className="btn sm" onClick={() => onEdit(c)}>Edit</button>
            <button className="btn sm" style={{ color: "#9c3b29" }} onClick={() => onDelete(c)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
