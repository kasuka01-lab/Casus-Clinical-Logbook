import React from "react";
import { generatePortfolio } from "../lib/exportCsv";
import { summarizeProcedures } from "../lib/procedureTracking";

function Bars({ data, color, maxValue }) {
  const max = maxValue || Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <div className="note" style={{ marginTop: 0 }}>No data yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
            <span>{d.label}</span><span className="mono" style={{ color: "var(--ink2)" }}>{d.value}</span>
          </div>
          <div style={{ height: 8, background: "var(--line)", borderRadius: 4 }}>
            <div style={{ height: 8, width: `${(d.value / max) * 100}%`, background: color || "var(--accent)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ cases, procedures = [], profile, onClose }) {
  const total = cases.length;
  const procSummary = summarizeProcedures(procedures, profile);
  const now = new Date();
  const dt = (c) => new Date(c.created_at || c.date || Date.now());
  const thisMonth = cases.filter((c) => { const d = dt(c); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const thisYear = cases.filter((c) => dt(c).getFullYear() === now.getFullYear()).length;

  const countBy = (key) => {
    const m = {}; cases.forEach((c) => { const v = c[key] || "Unspecified"; m[v] = (m[v] || 0) + 1; });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };

  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  const byMonth = months.map((d) => ({
    label: d.toLocaleString(undefined, { month: "short" }),
    value: cases.filter((c) => { const cd = dt(c); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length,
  }));

  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const nextMs = milestones.find((m) => m > total);
  const fullName = [profile.first_name, profile.surname].filter(Boolean).join(" ") || profile.full_name || profile.email;

  return (
    <div className="back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><span className="t serif">Dashboard</span><button className="x" onClick={onClose}>×</button></div>
        <div className="mbody">
          <div className="statgrid dashboardstats">
            <div className="stat"><div className="n">{total}</div><div className="l">Total cases</div></div>
            <div className="stat"><div className="n">{thisMonth}</div><div className="l">This month</div></div>
            <div className="stat"><div className="n">{thisYear}</div><div className="l">This year</div></div>
            <div className="stat"><div className="n">{procSummary.total}</div><div className="l">Procedures</div></div>
          </div>
          {nextMs && total > 0 && (
            <div className="note" style={{ marginTop: 0, marginBottom: 12 }}>{nextMs - total} more case{nextMs - total === 1 ? "" : "s"} to reach your next milestone of {nextMs}.</div>
          )}

          <div className="sec"><h4>Cases by month</h4><Bars data={byMonth} color="var(--gold)" /></div>
          <div className="sec"><h4>By specialty</h4><Bars data={countBy("specialty")} /></div>
          <div className="sec"><h4>By level of involvement</h4><Bars data={countBy("involvement")} /></div>
          <div className="sec"><h4>Procedure counts</h4><Bars data={procSummary.byName} color="var(--gold)" /></div>
          <div className="sec"><h4>Competency progress</h4><Bars data={procSummary.progress.map((p) => ({ label: `${p.name} (${p.count}/${p.target})`, value: p.percent }))} maxValue={100} /></div>
          <div className="sec"><h4>Missing competencies</h4>
            {procSummary.missing.length === 0 ? <div className="note" style={{ marginTop: 0 }}>No missing competencies for current targets.</div>
              : procSummary.missing.slice(0, 8).map((p) => (
                <div className="tablerow" key={`${p.specialty}-${p.name}`}>
                  <span>{p.name}</span><span className="role">{p.missing} more</span>
                </div>
              ))}
          </div>

          <div className="actions">
            <button className="btn pri" disabled={!total && !procedures.length} onClick={() => generatePortfolio(cases, fullName, profile, procedures)}>Generate Portfolio PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
