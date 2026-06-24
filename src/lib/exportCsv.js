import { getCaseMedia, publicUrl, getMarksForOwner, listAssessments, listCaseReviews, listMyProcedures } from "./api";
import { summarizeProcedures } from "./procedureTracking";
const COLS = [
  ["case_no", "Case No"], ["date", "Date"], ["specialty", "Specialty"],
  ["category", "Sub-classification"], ["title", "Title"], ["diagnosis", "Diagnosis"],
  ["involvement", "Level of involvement"], ["supervisor", "Supervisor"], ["supervisor_qualification", "Supervisor qualification"],
  ["patient_name", "Patient"], ["age", "Age"], ["sex", "Sex"],
  ["patient_initials", "Initials"], ["tribe", "Tribe"], ["description", "Description"],
  ["management", "Management"], ["challenges", "Challenges"], ["discussion", "Discussion"],
];
function cell(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }

export function downloadCasesCsv(cases, filename = "casus-logbook.csv") {
  const header = COLS.map((c) => cell(c[1])).join(",");
  const rows = cases.map((c) => COLS.map((col) => cell(c[col[0]])).join(","));
  const csv = "\uFEFF" + [header, ...rows].join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function block(label, val) { return val ? `<p><b>${label}:</b> ${esc(val)}</p>` : ""; }

// Build a Case Series PDF (with photos) using jsPDF.
async function fetchJpeg(url, maxW = 720) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(blob); });
    if (!dataUrl) return null;
    const img = await new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = dataUrl; });
    if (!img || !img.width) return null;
    const scale = Math.min(1, maxW / img.width);
    const cw = Math.round(img.width * scale), ch = Math.round(img.height * scale);
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
    return { data: cv.toDataURL("image/jpeg", 0.72), w: cw, h: ch };
  } catch { return null; }
}

async function caseImages(c, limit = 3) {
  let list = [];
  if (Array.isArray(c.media)) {
    list = c.media.filter((m) => (m.kind === "image")).map((m) => ({ url: publicUrl(m.path || m.storage_path), cap: m.caption }));
  } else {
    try {
      const media = await getCaseMedia(c.id);
      list = (media || []).filter((m) => m.kind === "image").map((m) => ({ url: publicUrl(m.storage_path), cap: m.caption }));
    } catch { list = []; }
  }
  return list.slice(0, limit);
}

export async function generateCaseSeries(cases, author, title) {
  try {
  if (!cases || !cases.length) { alert("There are no cases to include in the series yet."); return; }
  const mod = await import("jspdf");
  const jsPDF = mod.jsPDF || (mod.default && (mod.default.jsPDF || mod.default)) || mod;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 42, CW = W - 2 * M; let y = M;
  const need = (h) => { if (y + h > H - M) { doc.addPage(); y = M; } };

  doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(21, 41, 77);
  doc.text(title || "Case Series", M, y + 6); y += 16;
  doc.setDrawColor(192, 146, 46); doc.setLineWidth(2); doc.line(M, y, W - M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 104, 120);
  doc.text(`${author || ""}  ·  ${cases.length} case${cases.length === 1 ? "" : "s"}  ·  generated from Casus`, M, y); y += 22;

  const para = (label, val) => {
    if (!val) return;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(156, 118, 32);
    need(16); doc.text(label, M, y); y += 13;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30, 51, 84);
    const lines = doc.splitTextToSize(String(val), CW);
    for (const ln of lines) { need(14); doc.text(ln, M, y); y += 14; }
    y += 4;
  };

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    need(40);
    doc.setFont("times", "bold"); doc.setFontSize(14); doc.setTextColor(21, 41, 77);
    const head = doc.splitTextToSize(`${i + 1}. ${c.title || c.diagnosis || c.case_no || "Case"}`, CW);
    for (const ln of head) { need(18); doc.text(ln, M, y); y += 18; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(156, 118, 32);
    need(14); doc.text(`${c.case_no || ""}  ·  ${c.date || ""}  ·  ${c.specialty || ""}${c.category ? " — " + c.category : ""}${c.hospital ? "  ·  " + c.hospital : ""}`, M, y); y += 16;

    para("Diagnosis", c.diagnosis);
    para("Level of involvement", c.involvement);
    para("Examination findings", c.examination_findings);
    para("Brief description", c.description);
    para("Management", c.management);
    para("Outcome", c.outcome);
    para("Challenges", c.challenges);
    para("Discussion", c.discussion);
    if (c.supervisor || c.supervisor_qualification) para("Supervised by", [c.supervisor, c.supervisor_qualification].filter(Boolean).join(" — "));

    const imgs = await caseImages(c);
    for (const im of imgs) {
      const jp = await fetchJpeg(im.url);
      if (!jp) continue;
      const dispW = Math.min(CW, 250);
      const dispH = dispW * (jp.h / jp.w);
      need(dispH + (im.cap ? 16 : 8));
      try { doc.addImage(jp.data, "JPEG", M, y, dispW, dispH); } catch { continue; }
      y += dispH + 3;
      if (im.cap) { doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(90, 104, 120); doc.text(doc.splitTextToSize(im.cap, dispW), M, y + 8); y += 14; }
      y += 6;
    }

    need(16); doc.setDrawColor(220, 228, 242); doc.setLineWidth(0.7); doc.line(M, y, W - M, y); y += 16;
  }
  doc.save("casus-case-series.pdf");
  } catch (e) { console.error("case series pdf error", e); alert("Sorry — the case-series PDF couldn't be generated. " + (e && e.message ? e.message : "Please try again.")); }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Printable clinical portfolio: summary stats + full case log (open, then Print → Save as PDF).
export function generatePortfolioHtml(cases, author, profile) {
  const total = cases.length;
  const by = (key) => { const m = {}; cases.forEach((c) => { const v = c[key] || "Unspecified"; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const rows2 = (pairs) => pairs.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${v}</td></tr>`).join("");
  const caseRows = cases.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.date || "")}</td><td>${esc(c.specialty || "")}${c.category ? " / " + esc(c.category) : ""}</td><td>${esc(c.title || "")}</td><td>${esc(c.diagnosis || "")}</td><td>${esc(c.involvement || "")}</td></tr>`).join("");
  const who = profile ? [profile.institution, profile.specialty, profile.reg_number ? "Reg: " + profile.reg_number : ""].filter(Boolean).join(" · ") : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Casus Portfolio</title>
   <style>
    body{font-family:Georgia,serif;max-width:820px;margin:36px auto;padding:0 24px;color:#173E31;line-height:1.5}
    h1{font-size:28px;border-bottom:3px solid #C0922E;padding-bottom:10px;margin-bottom:4px}
    .sub{color:#52645B;font-family:Arial,sans-serif;font-size:13px;margin-bottom:24px}
    h2{font-size:17px;margin-top:26px;color:#1B4A3A}
    table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-top:8px}
    th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #E4DDCC}
    th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9C7620}
    .small{max-width:320px}
    @media print{body{margin:0}}
   </style></head><body>
    <h1>Clinical Portfolio</h1>
    <div class="sub">${esc(author || "")}${who ? " · " + esc(who) : ""} · ${total} case${total === 1 ? "" : "s"} · generated from Casus</div>
    <h2>Cases by specialty</h2><table class="small">${rows2(by("specialty"))}</table>
    <h2>By level of involvement</h2><table class="small">${rows2(by("involvement"))}</table>
    <h2>Full case log</h2>
    <table><tr><th>#</th><th>Date</th><th>Specialty</th><th>Title</th><th>Diagnosis</th><th>Role</th></tr>${caseRows}</table>
   </body></html>`;
  download(new Blob([html], { type: "text/html;charset=utf-8;" }), "casus-portfolio.html");
}

function cleanText(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
function escapeRegExp(v) { return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const PATIENT_IDENTIFIER_KEYS = [
  "patient_name", "patient_contact", "patient_initials", "tribe",
  "patient_id", "hospital_number", "medical_record_number", "mrn",
  "nhis", "dob", "date_of_birth",
];
function deidentifyCaseText(value, c) {
  let text = cleanText(value);
  if (!text || !c) return text;
  const values = [...new Set(PATIENT_IDENTIFIER_KEYS.map((key) => cleanText(c[key])).filter((v) => v.length >= 2))];
  values.forEach((v) => {
    const start = /^[A-Za-z0-9]/.test(v) ? "\\b" : "";
    const end = /[A-Za-z0-9]$/.test(v) ? "\\b" : "";
    text = text.replace(new RegExp(`${start}${escapeRegExp(v)}${end}`, "gi"), "[redacted]");
  });
  return text;
}
function countBy(cases, key) {
  const m = {};
  cases.forEach((c) => {
    const v = cleanText(c[key]) || "Unspecified";
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
function portfolioName(profile, fallback) {
  return cleanText([profile?.first_name, profile?.surname].filter(Boolean).join(" ")) || cleanText(profile?.full_name) || fallback || "Trainee";
}

export async function generatePortfolio(cases, author, profile, proceduresInput = null) {
  try {
    const portfolioCases = Array.isArray(cases) ? cases : [];
    const procedureRecords = Array.isArray(proceduresInput) ? proceduresInput : await listMyProcedures().catch(() => []);
    if (!portfolioCases.length && !procedureRecords.length) { alert("There are no cases or procedures to include in the portfolio yet."); return; }
    const mod = await import("jspdf");
    const jsPDF = mod.jsPDF || (mod.default && (mod.default.jsPDF || mod.default)) || mod;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const M = 46, CW = W - 2 * M;
    let y = M;
    let page = 1;
    const generated = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const name = portfolioName(profile, author);
    const institution = cleanText(profile?.institution) || "Not specified";
    const specialty = cleanText(profile?.specialty) || "Not specified";
    const training = cleanText(profile?.year_of_training) || "Not specified";

    const footer = () => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 132, 150);
      doc.text("Casus clinical portfolio - de-identified export", M, H - 24);
      doc.text(String(page), W - M, H - 24, { align: "right" });
    };
    const addPage = () => { footer(); doc.addPage(); page += 1; y = M; };
    const need = (h) => { if (y + h > H - M - 20) addPage(); };
    const heading = (text) => {
      need(30);
      doc.setFont("times", "bold"); doc.setFontSize(16); doc.setTextColor(19, 40, 76);
      doc.text(text, M, y); y += 20;
      doc.setDrawColor(224, 132, 56); doc.setLineWidth(1.2); doc.line(M, y, W - M, y); y += 14;
    };
    const subheading = (text) => {
      need(20);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(37, 99, 235);
      doc.text(text.toUpperCase(), M, y); y += 14;
    };
    const para = (label, value, indent = 0, sourceCase = null) => {
      const text = sourceCase ? deidentifyCaseText(value, sourceCase) : cleanText(value);
      if (!text) return;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(194, 108, 34);
      need(14); doc.text(label, M + indent, y); y += 12;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30, 51, 84);
      const lines = doc.splitTextToSize(text, CW - indent);
      for (const ln of lines) { need(13); doc.text(ln, M + indent, y); y += 13; }
      y += 4;
    };
    const table = (title, pairs) => {
      subheading(title);
      if (!pairs.length) { para("No entries", "None recorded."); return; }
      pairs.forEach(([label, value]) => {
        need(18);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30, 51, 84);
        doc.text(cleanText(label), M, y);
        doc.setFont("helvetica", "bold"); doc.text(String(value), W - M, y, { align: "right" });
        y += 16;
      });
      y += 4;
    };
    const rule = () => { need(12); doc.setDrawColor(215, 227, 244); doc.line(M, y, W - M, y); y += 12; };
    const asPairs = (rows) => rows.map((row) => [row.label, row.value]);

    let marks = [];
    try { marks = await getMarksForOwner(); } catch { marks = []; }
    const enriched = await Promise.all(portfolioCases.map(async (c) => {
      const [reviews, assessments] = await Promise.all([
        listCaseReviews(c.id).catch(() => []),
        listAssessments(c.id).catch(() => []),
      ]);
      return {
        ...c,
        portfolioReviews: reviews,
        portfolioAssessments: assessments,
        portfolioMark: marks.find((m) => m.case_id === c.id),
      };
    }));
    const procedureSummary = summarizeProcedures(procedureRecords, profile);
    const caseById = new Map(enriched.map((c) => [c.id, c]));

    doc.setFillColor(19, 40, 76); doc.rect(0, 0, W, 168, "F");
    doc.setFont("times", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255);
    doc.text("Clinical Portfolio", M, 82);
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    doc.text("MMed examinations | Fellowship portfolios | Specialist accreditation", M, 108);
    doc.setDrawColor(224, 132, 56); doc.setLineWidth(3); doc.line(M, 132, W - M, 132);
    y = 218;
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(19, 40, 76);
    doc.text(name, M, y); y += 28;
    [["Institution", institution], ["Specialty", specialty], ["Training year", training], ["Date generated", generated], ["Total cases", String(enriched.length)], ["Total procedures", String(procedureRecords.length)]].forEach(([k, v]) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(90, 107, 134);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(19, 40, 76);
      doc.text(v, M + 130, y);
      y += 22;
    });
    y += 18;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 107, 134);
    doc.text(doc.splitTextToSize("This portfolio is generated from de-identified clinical logbook data. It omits structured patient names, contacts, initials, tribe, and media, and redacts known patient identifiers from narrative text.", CW), M, y);

    addPage();
    heading("Portfolio Summary");
    const reviewCount = enriched.reduce((sum, c) => sum + (c.portfolioReviews?.length || 0), 0);
    const assessmentCount = enriched.reduce((sum, c) => sum + (c.portfolioAssessments?.length || 0), 0);
    table("Core totals", [
      ["Total cases", enriched.length],
      ["Logged procedures", procedureSummary.total],
      ["Competency-role procedures", procedureSummary.performed],
      ["Signed-off procedures", procedureSummary.signedOff],
      ["Missing procedure competencies", procedureSummary.missing.length],
      ["Supervisor reviews", reviewCount],
      ["Assessments/sign-offs", assessmentCount],
    ]);
    table("Cases by specialty", countBy(enriched, "specialty"));
    table("Cases by level of involvement", countBy(enriched, "involvement"));
    table("Procedure counts", asPairs(procedureSummary.byName));
    table("Procedures by specialty", asPairs(procedureSummary.bySpecialty));
    table("Procedures by role", asPairs(procedureSummary.byRole));
    table("Procedure competency progress", procedureSummary.progress.map((p) => [p.name, `${p.count}/${p.target}${p.signedOff ? " | " + p.signedOff + " signed off" : ""}`]));
    table("Missing procedure competencies", procedureSummary.missing.map((p) => [p.name, `${p.missing} more`]));

    heading("Procedure Log");
    if (!procedureRecords.length) {
      para("No procedures recorded", "No dedicated procedure log entries have been recorded yet.");
    } else {
      procedureRecords.forEach((p, i) => {
        const linked = p.case_id ? caseById.get(p.case_id) : null;
        const linkedLabel = linked ? [linked.case_no, deidentifyCaseText(linked.title || linked.diagnosis, linked)].filter(Boolean).join(" - ") : (p.cases?.case_no || "");
        need(42);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(19, 40, 76);
        doc.text(`${i + 1}. ${cleanText(p.procedure_name) || "Procedure"}`, M, y); y += 14;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 107, 134);
        doc.text(doc.splitTextToSize([p.procedure_date, p.specialty, p.role, p.signed_off ? "signed off" : ""].filter(Boolean).join(" | "), CW), M, y); y += 16;
        para("Linked case", linkedLabel, 14, linked);
        para("Notes", p.notes, 14);
        if (p.signed_off) {
          para("Supervisor sign-off", [p.supervisor_name, p.supervisor_role, p.signed_off_at ? new Date(p.signed_off_at).toLocaleDateString() : "", p.supervisor_comment].filter(Boolean).join(" - "), 14);
        }
      });
    }

    heading("Case Summaries, Reflections, and Reviews");
    if (!enriched.length) para("No cases recorded", "No clinical case summaries were available for this export.");
    enriched.forEach((c, i) => {
      need(72);
      doc.setFont("times", "bold"); doc.setFontSize(14); doc.setTextColor(19, 40, 76);
      const title = `${i + 1}. ${deidentifyCaseText(c.title, c) || deidentifyCaseText(c.diagnosis, c) || c.case_no || "Case"}`;
      doc.splitTextToSize(title, CW).forEach((ln) => { need(17); doc.text(ln, M, y); y += 17; });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(90, 107, 134);
      doc.text([c.case_no, c.date, c.specialty, c.category, c.involvement].filter(Boolean).join(" | "), M, y); y += 16;
      para("Diagnosis", c.diagnosis, 0, c);
      para("Case summary", c.description, 0, c);
      para("Management / procedure", c.management, 0, c);
      para("Outcome", c.outcome, 0, c);
      para("Reflection - challenges", c.challenges, 0, c);
      para("Reflection - discussion", c.discussion, 0, c);
      if (c.portfolioMark) para("Assessor score", `${c.portfolioMark.score || ""}${c.portfolioMark.comment ? " - " + c.portfolioMark.comment : ""}${c.portfolioMark.assessor_name ? " (" + c.portfolioMark.assessor_name + ")" : ""}`, 0, c);
      if (c.portfolioReviews?.length) {
        subheading("Supervisor reviews");
        c.portfolioReviews.forEach((r) => {
          para(`${r.score}/10${r.supervisor_name ? " - " + r.supervisor_name : ""}`, r.comments || "No comment recorded.", 14, c);
        });
      }
      if (c.portfolioAssessments?.length) {
        subheading("Workplace assessments");
        c.portfolioAssessments.forEach((a) => {
          para([a.type || "Assessment", a.rating, a.assessor_name].filter(Boolean).join(" - "), [a.strengths && "Strengths: " + a.strengths, a.improve && "To improve: " + a.improve].filter(Boolean).join(" | "), 14, c);
        });
      }
      rule();
    });

    footer();
    doc.save("casus-portfolio.pdf");
  } catch (e) {
    console.error("portfolio pdf error", e);
    alert("Sorry - the portfolio PDF couldn't be generated. " + (e && e.message ? e.message : "Please try again."));
  }
}
