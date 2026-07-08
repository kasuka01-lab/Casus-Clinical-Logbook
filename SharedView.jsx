import React, { useState, useEffect, useRef } from "react";
import { saveCase, getCaseMedia, uploadImageBlob, uploadVideoFile, uploadDocumentFile, removeMedia, publicUrl, updateMediaCaption } from "../lib/api";
import { resizeImage, coverRegion } from "../lib/media";
import { SPECIALTIES, CATEGORIES, INVOLVEMENT } from "../lib/taxonomy";
import DictateButton from "./DictateButton";

const SEXES = ["Female", "Male", "Other"];

function CoverTool({ file, onDone, onCancel }) {
  const [url, setUrl] = useState("");
  const [box, setBox] = useState(null);
  const start = useRef(null);
  const imgRef = useRef(null);
  useEffect(() => { const r = new FileReader(); r.onload = (e) => setUrl(e.target.result); r.readAsDataURL(file); }, [file]);
  const down = (e) => { const r = e.currentTarget.getBoundingClientRect(); start.current = { x: e.clientX - r.left, y: e.clientY - r.top }; setBox({ ...start.current, w: 0, h: 0 }); };
  const move = (e) => { if (!start.current) return; const r = e.currentTarget.getBoundingClientRect(); const cx = e.clientX - r.left, cy = e.clientY - r.top; setBox({ x: Math.min(cx, start.current.x), y: Math.min(cy, start.current.y), w: Math.abs(cx - start.current.x), h: Math.abs(cy - start.current.y) }); };
  const up = () => { start.current = null; };
  const apply = async () => { if (!box || box.w < 4 || box.h < 4) { onDone(null); return; } const covered = await coverRegion(imgRef.current, box); onDone(await resizeImage(new File([covered], "c.jpg", { type: "image/jpeg" }))); };
  return (
    <div className="back" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">Cover a face</span><button className="x" onClick={onCancel}>×</button></div>
        <div className="mbody">
          <p className="note" style={{ marginTop: 0, marginBottom: 12 }}>Drag a box over any face or identifying mark, then apply.</p>
          {url && (
            <div className="cropwrap" onMouseDown={down} onMouseMove={move} onMouseUp={up}
              onTouchStart={(e) => down(e.touches[0])} onTouchMove={(e) => move(e.touches[0])} onTouchEnd={up}>
              <img ref={imgRef} src={url} alt="" draggable={false} />
              {box && <div className="cropbox" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
            </div>
          )}
          <div className="actions">
            <button className="btn sm" onClick={() => onDone(null)}>Skip — add as is</button>
            <button className="btn pri sm" onClick={apply}>Apply &amp; add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaSection({ label, section, kindHint, accept, media, pending, onAddFiles, onRemoveSaved, onRemovePending, onCaptionSaved, onCaptionPending }) {
  const ref = useRef(null);
  const savedHere = media.filter((m) => (m.section || "photo") === section && !m.follow_up_id);
  const pendHere = pending.filter((p) => p.section === section);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="drop" onClick={() => ref.current && ref.current.click()}>{kindHint}</div>
      <input ref={ref} type="file" accept={accept || "image/*,video/*"} multiple hidden
        onChange={(e) => { onAddFiles(section, e.target.files); e.target.value = ""; }} />
      {(savedHere.length > 0 || pendHere.length > 0) && (
        <div className="thumbs">
          {savedHere.map((m) => (
            <div className="pt" key={m.id}>
              {m.kind === "video" ? <video src={publicUrl(m.storage_path)} muted />
                : m.kind === "file" ? <a className="filetile" href={publicUrl(m.storage_path)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{(m.storage_path.split(".").pop() || "doc").toUpperCase()}</a>
                : <img src={publicUrl(m.storage_path)} alt="" />}
              <button onClick={() => onRemoveSaved(m)}>×</button>
              {m.kind !== "file" && <input className="cap" defaultValue={m.caption || ""} placeholder="Add a caption…" onBlur={(e) => onCaptionSaved(m, e.target.value)} />}
            </div>
          ))}
          {pendHere.map((p, i) => (
            <div className="pt" key={"p" + i}>
              {p.kind === "video" ? <video src={p.url} muted />
                : p.kind === "file" ? <span className="filetile">{(p.ext || "doc").toUpperCase()}</span>
                : <img src={p.url} alt="" />}
              <button onClick={() => onRemovePending(p)}>×</button>
              {p.kind !== "file" && <input className="cap" value={p.caption || ""} placeholder="Add a caption…" onChange={(e) => onCaptionPending(p, e.target.value)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CaseForm({ profile, existing, onClose, onSaved }) {
  const e0 = existing || {};
  const [title, setTitle] = useState(e0.title || "");
  const [diagnosis, setDiagnosis] = useState(e0.diagnosis || "");
  const [specialty, setSpecialty] = useState(e0.specialty || "");
  const [category, setCategory] = useState(e0.category || "");
  const [involvement, setInvolvement] = useState(e0.involvement || "");
  const [supervisor, setSupervisor] = useState(e0.supervisor || "");
  const [supervisorQual, setSupervisorQual] = useState(e0.supervisor_qualification || "");
  const [date, setDate] = useState(e0.date || new Date().toISOString().slice(0, 10));
  const [patientName, setPatientName] = useState(e0.patient_name || "");
  const [patientContact, setPatientContact] = useState(e0.patient_contact || "");
  const [age, setAge] = useState(e0.age || "");
  const [sex, setSex] = useState(e0.sex || "");
  const [tribe, setTribe] = useState(e0.tribe || "");
  const [description, setDescription] = useState(e0.description || "");
  const [management, setManagement] = useState(e0.management || "");
  const [challenges, setChallenges] = useState(e0.challenges || "");
  const [discussion, setDiscussion] = useState(e0.discussion || "");
  const [admitted, setAdmitted] = useState(e0.admitted || false);
  const [admissionDate, setAdmissionDate] = useState(e0.admission_date || "");
  const [ward, setWard] = useState(e0.ward || "");
  const [nextReview, setNextReview] = useState(e0.next_review || "");
  const [hospital, setHospital] = useState(e0.hospital || "");
  const [examFindings, setExamFindings] = useState(e0.examination_findings || "");
  const [outcome, setOutcome] = useState(e0.outcome || "");
  const [media, setMedia] = useState([]);
  const [pending, setPending] = useState([]);           // {url, blob|file, kind, ext, section}
  const [coverQueue, setCoverQueue] = useState([]);      // files awaiting face-cover (photo section)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (e0.id) getCaseMedia(e0.id).then(setMedia); }, [e0.id]);

  const pushImage = async (file, section) => {
    const blob = await resizeImage(file);
    setPending((p) => [...p, { url: URL.createObjectURL(blob), blob, kind: "image", ext: "jpg", section, caption: "" }]);
  };
  const addFiles = async (section, files) => {
    setErr("");
    for (const f of Array.from(files)) {
      if (f.type.startsWith("video/")) {
        if (f.size > 200 * 1024 * 1024) { setErr("A video is over 200 MB and was skipped — try a shorter clip."); continue; }
        setPending((p) => [...p, { url: URL.createObjectURL(f), file: f, kind: "video", ext: (f.name.split(".").pop() || "mp4").toLowerCase(), section, caption: "" }]);
      } else if (f.type.startsWith("image/")) {
        if (section === "photo") setCoverQueue((q) => [...q, f]);  // clinical photos -> offer face cover
        else await pushImage(f, section);                          // radiology/lab -> straight in
      } else {
        if (f.size > 50 * 1024 * 1024) { setErr("A file is over 50 MB and was skipped."); continue; }
        setPending((p) => [...p, { url: URL.createObjectURL(f), file: f, kind: "file", ext: (f.name.split(".").pop() || "pdf").toLowerCase(), section, caption: "" }]);
      }
    }
  };
  const onCoverDone = async (blob) => {
    const file = coverQueue[0];
    setCoverQueue((q) => q.slice(1));
    if (blob) setPending((p) => [...p, { url: URL.createObjectURL(blob), blob, kind: "image", ext: "jpg", section: "photo", caption: "" }]);
    else await pushImage(file, "photo");
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) { setErr("A case title and a description are required."); return; }
    setBusy(true); setErr("");
    try {
      const saved = await saveCase({
        title: title.trim(), diagnosis: diagnosis.trim(), specialty, category, involvement,
        supervisor: supervisor.trim(), supervisor_qualification: supervisorQual.trim(), date, patient_name: patientName.trim(), patient_contact: patientContact.trim(),
        age: age.trim(), sex, tribe: tribe.trim(), description: description.trim(),
        management: management.trim(), challenges: challenges.trim(), discussion: discussion.trim(),
        admitted, admission_date: admitted ? (admissionDate || null) : null, ward: admitted ? ward.trim() : "", next_review: nextReview || null,
        hospital: hospital.trim(), examination_findings: examFindings.trim(), outcome,
      }, e0.id);
      for (const p of pending) {
        if (p.kind === "video") await uploadVideoFile(saved.id, p.file, p.section, p.caption || null);
        else if (p.kind === "file") await uploadDocumentFile(saved.id, p.file, p.section, p.caption || null);
        else await uploadImageBlob(saved.id, p.blob, p.section, p.caption || null);
      }
      onSaved(saved);
    } catch (e) { setErr(e.message || "Could not save."); setBusy(false); }
  };

  const catList = specialty ? (CATEGORIES[specialty] || []) : [];
  const removePending = (p) => setPending((arr) => arr.filter((x) => x !== p));
  const removeSaved = async (m) => { await removeMedia(m); setMedia((x) => x.filter((y) => y.id !== m.id)); };
  const onCaptionPending = (p, val) => setPending((arr) => arr.map((x) => (x === p ? { ...x, caption: val } : x)));
  const onCaptionSaved = async (m, val) => { if ((m.caption || "") === val) return; await updateMediaCaption(m.id, val); setMedia((arr) => arr.map((x) => (x.id === m.id ? { ...x, caption: val } : x))); };

  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">{existing ? "Edit case" : "New case"}</span>
          <button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <div className="field"><label>Case title <span className="req">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 26-year-old with ruptured ectopic" maxLength={140} /></div>
          <div className="field"><label>Diagnosis</label>
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Ruptured tubal ectopic pregnancy" maxLength={160} /></div>
          <div className="row">
            <div className="field"><label>Specialty</label>
              <select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setCategory(""); }}>
                <option value="">Select…</option>{SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className="field"><label>Sub-classification</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!specialty}>
                <option value="">{specialty ? "Select…" : "Pick a specialty first"}</option>
                {catList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="row">
            <div className="field"><label>Level of involvement</label>
              <select value={involvement} onChange={(e) => setInvolvement(e.target.value)}>
                <option value="">Select…</option>{INVOLVEMENT.map((i) => <option key={i} value={i}>{i}</option>)}
              </select></div>
            <div className="field"><label>Supervised by</label>
              <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="e.g. Dr. … (optional)" /></div>
          </div>
          <div className="field"><label>Supervisor's qualification / title</label>
            <input value={supervisorQual} onChange={(e) => setSupervisorQual(e.target.value)} placeholder="e.g. Consultant Obstetrician, Senior Consultant, Professor" /></div>
          <div className="field"><label>Hospital / facility where the case was done</label>
            <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g. Mulago National Referral Hospital" /></div>

          <div className="subhead">Patient details — private to you, never shared</div>
          <div className="row">
            <div className="field"><label>Patient name</label><input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="for your records only" /></div>
            <div className="field"><label>Patient contact</label><input value={patientContact} onChange={(e) => setPatientContact(e.target.value)} placeholder="phone, for follow-up" /></div>
          </div>
          <div className="row">
            <div className="field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="field"><label>Age</label><input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 26 / 6 months" /></div>
          </div>
          <div className="row">
            <div className="field"><label>Sex</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)}><option value="">—</option>{SEXES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="field"><label>Tribe</label><input value={tribe} onChange={(e) => setTribe(e.target.value)} placeholder="optional" /></div>
          </div>

          <div className="subhead">Admission & follow-up</div>
          <div className="row">
            <div className="field"><label>Admitted patient?</label>
              <select value={admitted ? "yes" : "no"} onChange={(e) => setAdmitted(e.target.value === "yes")}>
                <option value="no">No / outpatient</option><option value="yes">Yes — admitted</option>
              </select></div>
            <div className="field"><label>Next review / follow-up date</label><input type="date" value={nextReview || ""} onChange={(e) => setNextReview(e.target.value)} /></div>
          </div>
          {admitted && (
            <div className="row">
              <div className="field"><label>Admission date</label><input type="date" value={admissionDate || ""} onChange={(e) => setAdmissionDate(e.target.value)} /></div>
              <div className="field"><label>Ward / bed</label><input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Gynae ward, bed 4" /></div>
            </div>
          )}
          {admitted && <div className="note" style={{ marginTop: 0 }}>You can add daily ward-round progress notes once you open this case.</div>}

          <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Brief description <span className="req">*</span></span><DictateButton onText={(t) => setDescription((v) => (v ? v + " " : "") + t)} /></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Presentation and course." /></div>
          <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Examination findings</span><DictateButton onText={(t) => setExamFindings((v) => (v ? v + " " : "") + t)} /></label>
            <textarea value={examFindings} onChange={(e) => setExamFindings(e.target.value)} placeholder="General & systemic examination, vitals, relevant signs." /></div>
          <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Management</span><DictateButton onText={(t) => setManagement((v) => (v ? v + " " : "") + t)} /></label><textarea value={management} onChange={(e) => setManagement(e.target.value)} /></div>
          <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Challenges</span><DictateButton onText={(t) => setChallenges((v) => (v ? v + " " : "") + t)} /></label><textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} /></div>
          <div className="field"><label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Discussion</span><DictateButton onText={(t) => setDiscussion((v) => (v ? v + " " : "") + t)} /></label><textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} /></div>
          <div className="field"><label>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">—</option>
              {["Recovered / discharged", "Improved", "Referred / transferred", "Ongoing care", "Complication", "Death", "Lost to follow-up", "Other"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select></div>

          <MediaSection label="Clinical photos / videos" section="photo" media={media} pending={pending}
            kindHint="Tap to add photos or clips (you'll be offered the face-cover step)"
            onAddFiles={addFiles} onRemoveSaved={removeSaved} onRemovePending={removePending} onCaptionSaved={onCaptionSaved} onCaptionPending={onCaptionPending} />
          <MediaSection label="Radiology images" section="radiology" media={media} pending={pending}
            kindHint="Tap to add X-rays, CT, MRI, ultrasound…" onAddFiles={addFiles} onRemoveSaved={removeSaved} onRemovePending={removePending} onCaptionSaved={onCaptionSaved} onCaptionPending={onCaptionPending} />
          <MediaSection label="Labs & investigations" section="lab" media={media} pending={pending}
            kindHint="Tap to add lab reports, ECGs, histology…" onAddFiles={addFiles} onRemoveSaved={removeSaved} onRemovePending={removePending} onCaptionSaved={onCaptionSaved} onCaptionPending={onCaptionPending} />
          <MediaSection label="Clinical notes & documents" section="notes" media={media} pending={pending}
            accept="application/pdf,.pdf,.doc,.docx,image/*"
            kindHint="Tap to upload clinical notes, discharge summaries, PDFs, scans…"
            onAddFiles={addFiles} onRemoveSaved={removeSaved} onRemovePending={removePending} onCaptionSaved={onCaptionSaved} onCaptionPending={onCaptionPending} />

          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn pri" onClick={submit} disabled={busy}>{busy ? "Saving…" : existing ? "Save changes" : "Add to logbook"}</button>
          </div>
        </div>
      </div>
      {coverQueue.length > 0 && <CoverTool file={coverQueue[0]} onDone={onCoverDone} onCancel={() => { setCoverQueue((q) => q.slice(1)); }} />}
    </div>
  );
}
