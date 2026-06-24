import React, { useMemo, useState } from "react";
import { deleteProcedure, saveProcedure } from "../lib/api";
import { PROCEDURE_ROLES, SPECIALTIES } from "../lib/taxonomy";
import { summarizeProcedures } from "../lib/procedureTracking";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(profile) {
  return {
    procedure_name: "",
    specialty: profile?.specialty || "",
    procedure_date: today(),
    role: "Observed",
    case_id: "",
    notes: "",
    signed_off: false,
    supervisor_name: "",
    supervisor_role: "",
    supervisor_comment: "",
  };
}

function caseLabel(c) {
  return [c.case_no, c.title || c.diagnosis].filter(Boolean).join(" - ");
}

function linkedCaseLabel(procedure, cases) {
  const local = cases.find((c) => c.id === procedure.case_id);
  if (local) return caseLabel(local);
  if (procedure.cases) return [procedure.cases.case_no, procedure.cases.title || procedure.cases.diagnosis].filter(Boolean).join(" - ");
  return "";
}

function ProgressBar({ value }) {
  return (
    <div className="progbar">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export default function Procedures({ cases = [], procedures = [], profile, onClose, onChanged }) {
  const [draft, setDraft] = useState(() => emptyDraft(profile));
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const summary = useMemo(() => summarizeProcedures(procedures, profile), [procedures, profile]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const startNew = () => {
    setErr("");
    setEditingId(null);
    setDraft(emptyDraft(profile));
  };
  const startEdit = (procedure) => {
    setErr("");
    setEditingId(procedure.id);
    setDraft({
      procedure_name: procedure.procedure_name || "",
      specialty: procedure.specialty || profile?.specialty || "",
      procedure_date: procedure.procedure_date || today(),
      role: procedure.role || "Observed",
      case_id: procedure.case_id || "",
      notes: procedure.notes || "",
      signed_off: !!procedure.signed_off,
      signed_off_at: procedure.signed_off_at || "",
      supervisor_name: procedure.supervisor_name || "",
      supervisor_role: procedure.supervisor_role || "",
      supervisor_comment: procedure.supervisor_comment || "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await saveProcedure(draft, editingId);
      startNew();
      if (onChanged) await onChanged();
    } catch (error) {
      setErr(error.message || "Could not save procedure.");
    }
    setBusy(false);
  };

  const remove = async (procedure) => {
    if (!window.confirm("Delete this procedure entry?")) return;
    setErr("");
    setBusy(true);
    try {
      await deleteProcedure(procedure.id);
      if (editingId === procedure.id) startNew();
      if (onChanged) await onChanged();
    } catch (error) {
      setErr(error.message || "Could not delete procedure.");
    }
    setBusy(false);
  };

  return (
    <div className="back" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <span className="t serif">Procedures</span>
          <button className="x" onClick={onClose}>x</button>
        </div>
        <div className="mbody">
          <div className="statgrid procstats">
            <div className="stat"><div className="n">{summary.total}</div><div className="l">Procedures</div></div>
            <div className="stat"><div className="n">{summary.performed}</div><div className="l">Competency roles</div></div>
            <div className="stat"><div className="n">{summary.signedOff}</div><div className="l">Signed off</div></div>
            <div className="stat"><div className="n">{summary.missing.length}</div><div className="l">Missing targets</div></div>
          </div>

          <div className="procgrid">
            <section className="procpanel">
              <h4>Progress toward targets</h4>
              {summary.progress.length === 0 ? (
                <div className="note" style={{ marginTop: 0 }}>No targets available.</div>
              ) : summary.progress.map((target) => (
                <div className="targetrow" key={`${target.specialty}-${target.name}`}>
                  <div>
                    <b>{target.name}</b>
                    <span>{target.specialty} | {target.count}/{target.target} | {target.signedOff} signed off</span>
                  </div>
                  <ProgressBar value={target.percent} />
                </div>
              ))}
            </section>

            <section className="procpanel">
              <h4>Missing competencies</h4>
              {summary.missing.length === 0 ? (
                <div className="note" style={{ marginTop: 0 }}>All current procedure targets have been met.</div>
              ) : summary.missing.map((target) => (
                <div className="missingrow" key={`${target.specialty}-${target.name}`}>
                  <span>{target.name}</span>
                  <b>{target.missing} more</b>
                </div>
              ))}

              <h4 style={{ marginTop: 18 }}>Procedure counts</h4>
              {summary.byName.length === 0 ? (
                <div className="note" style={{ marginTop: 0 }}>No procedures logged yet.</div>
              ) : summary.byName.slice(0, 8).map((row) => (
                <div className="missingrow" key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.value}</b>
                </div>
              ))}
            </section>
          </div>

          <form className="procpanel procform" onSubmit={submit}>
            <div className="formtitle">
              <h4>{editingId ? "Edit procedure" : "Log procedure"}</h4>
              {editingId && <button type="button" className="linkbtn" onClick={startNew}>New entry</button>}
            </div>
            <div className="row">
              <div className="field"><label>Procedure name <span className="req">*</span></label>
                <input value={draft.procedure_name} onChange={(e) => setField("procedure_name", e.target.value)} placeholder="e.g. Caesarean section" />
              </div>
              <div className="field"><label>Date</label>
                <input type="date" value={draft.procedure_date} onChange={(e) => setField("procedure_date", e.target.value)} />
              </div>
            </div>
            <div className="row">
              <div className="field"><label>Specialty</label>
                <select value={draft.specialty} onChange={(e) => setField("specialty", e.target.value)}>
                  <option value="">Select...</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>Role <span className="req">*</span></label>
                <select value={draft.role} onChange={(e) => setField("role", e.target.value)}>
                  {PROCEDURE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Linked case</label>
              <select value={draft.case_id} onChange={(e) => setField("case_id", e.target.value)}>
                <option value="">No linked case</option>
                {cases.map((c) => <option key={c.id} value={c.id}>{caseLabel(c)}</option>)}
              </select>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={draft.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Brief competency notes, challenges, or learning points." />
            </div>

            <label className="checkrow">
              <input type="checkbox" checked={draft.signed_off} onChange={(e) => setField("signed_off", e.target.checked)} />
              <span>Supervisor sign-off obtained</span>
            </label>
            <div className="row">
              <div className="field"><label>Supervisor name</label>
                <input value={draft.supervisor_name} onChange={(e) => setField("supervisor_name", e.target.value)} />
              </div>
              <div className="field"><label>Supervisor role</label>
                <input value={draft.supervisor_role} onChange={(e) => setField("supervisor_role", e.target.value)} />
              </div>
            </div>
            <div className="field"><label>Sign-off comment</label>
              <textarea value={draft.supervisor_comment} onChange={(e) => setField("supervisor_comment", e.target.value)} />
            </div>
            {err && <div className="err">{err}</div>}
            <div className="actions">
              <button type="button" className="btn" onClick={startNew}>Clear</button>
              <button className="btn pri" disabled={busy}>{busy ? "Saving..." : editingId ? "Save procedure" : "Log procedure"}</button>
            </div>
          </form>

          <section className="procpanel">
            <h4>Procedure logbook</h4>
            {procedures.length === 0 ? (
              <div className="empty small"><h3 className="serif">No procedures yet</h3><p>Log your first procedure above.</p></div>
            ) : (
              <div className="proclist">
                {procedures.map((procedure) => (
                  <div className="procitem" key={procedure.id}>
                    <div>
                      <div className="procname">{procedure.procedure_name}</div>
                      <div className="procmeta">
                        {[procedure.procedure_date, procedure.specialty, procedure.role].filter(Boolean).join(" | ")}
                      </div>
                      {linkedCaseLabel(procedure, cases) && <div className="procmeta">Case: {linkedCaseLabel(procedure, cases)}</div>}
                      {procedure.signed_off && <span className="markbadge">signed off</span>}
                      {procedure.notes && <p>{procedure.notes}</p>}
                      {procedure.supervisor_comment && <p><b>Supervisor:</b> {procedure.supervisor_comment}</p>}
                    </div>
                    <div className="procactions">
                      <button className="btn sm" onClick={() => startEdit(procedure)}>Edit</button>
                      <button className="btn sm" onClick={() => remove(procedure)} disabled={busy}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
