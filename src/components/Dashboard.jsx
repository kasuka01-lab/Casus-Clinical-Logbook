import React from "react";
import { generatePortfolio } from "../lib/exportCsv";

function Bars({ data, color }) {
  const max = Math.max(1, ...data.map((d) => d.value));
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

export default function Dashboard({ cases, profile, onClose }) {
  const total = cases.length;
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
          <div className="statgrid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="stat"><div className="n">{total}</div><div className="l">Total cases</div></div>
            <div className="stat"><div className="n">{thisMonth}</div><div className="l">This month</div></div>
            <div className="stat"><div className="n">{thisYear}</div><div className="l">This year</div></div>
          </div>
          {nextMs && total > 0 && (
            <div className="note" style={{ marginTop: 0, marginBottom: 12 }}>{nextMs - total} more case{nextMs - total === 1 ? "" : "s"} to reach your next milestone of {nextMs}.</div>
          )}

          <div className="sec"><h4>Cases by month</h4><Bars data={byMonth} color="var(--gold)" /></div>
          <div className="sec"><h4>By specialty</h4><Bars data={countBy("specialty")} /></div>
          <div className="sec"><h4>By level of involvement</h4><Bars data={countBy("involvement")} /></div>

          <div className="actions">
            <button className="btn pri" disabled={!total} onClick={() => generatePortfolio(cases, fullName, profile)}>Download portfolio</button>
          </div>
        </div>
      </div>
    </div>
  );
}
