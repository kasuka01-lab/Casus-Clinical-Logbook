import React, { useState, useRef } from "react";
import { updateProfile, uploadAvatar, publicUrl } from "../lib/api";
import { SPECIALTIES } from "../lib/taxonomy";

const ROLES = ["Medical student", "Intern", "Medical officer", "Resident (MMed)", "Specialist", "Consultant"];

export default function Profile({ profile, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [surname, setSurname] = useState(profile.surname || "");
  const [role, setRole] = useState(profile.specialty_role || profile.role_title || "");
  const [regStatus, setRegStatus] = useState(profile.reg_status || "");
  const [regNumber, setRegNumber] = useState(profile.reg_number || "");
  const [institution, setInstitution] = useState(profile.institution || "");
  const [specialty, setSpecialty] = useState(profile.specialty || "");
  const [year, setYear] = useState(profile.year_of_training || "");
  const [country, setCountry] = useState(profile.country || "");
  const [contact, setContact] = useState(profile.contact || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const preview = avatarFile ? URL.createObjectURL(avatarFile) : publicUrl(profile.avatar_path);
  const initials = ((firstName[0] || "") + (surname[0] || "")).toUpperCase() || "?";

  const save = async () => {
    setBusy(true); setErr("");
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      await updateProfile({
        first_name: firstName.trim(), surname: surname.trim(),
        full_name: (firstName.trim() + " " + surname.trim()).trim(),
        reg_status: regStatus || null, reg_number: regNumber.trim(),
        institution: institution.trim(), specialty: specialty || null,
        year_of_training: year.trim(), country: country.trim(), contact: contact.trim(),
      });
      onSaved();
    } catch (e) { setErr(e.message || "Could not save."); setBusy(false); }
  };

  const regLabel = regStatus === "student" ? "Student registration number"
    : regStatus === "registered" ? "Medical council registration number" : "Registration number";

  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">My profile</span>
          <button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <div className="prof-top">
            {preview ? <img className="avatar" src={preview} alt="" /> : <div className="avatar">{initials}</div>}
            <div>
              <button className="btn sm" onClick={() => fileRef.current && fileRef.current.click()}>Upload photo</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files[0]) setAvatarFile(e.target.files[0]); e.target.value = ""; }} />
              <div className="note" style={{ marginTop: 6 }}>{profile.email}</div>
            </div>
          </div>

          <div className="row">
            <div className="field"><label>First name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="field"><label>Surname</label><input value={surname} onChange={(e) => setSurname(e.target.value)} /></div>
          </div>
          <div className="row">
            <div className="field">
              <label>Status</label>
              <select value={regStatus} onChange={(e) => setRegStatus(e.target.value)}>
                <option value="">Select…</option>
                <option value="student">Student / trainee</option>
                <option value="registered">Registered doctor</option>
              </select>
            </div>
            <div className="field"><label>{regLabel}</label><input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="optional" /></div>
          </div>
          <div className="field">
            <label>Training institution / hospital</label>
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Makerere University / Ryan HC Hospital" />
          </div>
          <div className="row">
            <div className="field">
              <label>Specialty / department</label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Year of training</label><input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. Year 2" /></div>
          </div>
          <div className="row">
            <div className="field"><label>Country</label><input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Uganda" /></div>
            <div className="field"><label>Your contact</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="your phone / email" /></div>
          </div>

          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn pri" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
