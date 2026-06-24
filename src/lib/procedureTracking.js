import { COMPETENCY_ROLES, PROCEDURE_TARGETS } from "./taxonomy";

export function cleanProcedureText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

export function normalizeProcedureName(value) {
  return cleanProcedureText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function countBy(procedures, key) {
  const map = {};
  procedures.forEach((p) => {
    const label = cleanProcedureText(typeof key === "function" ? key(p) : p[key]) || "Unspecified";
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function matchesTarget(procedure, target) {
  const logged = normalizeProcedureName(procedure.procedure_name);
  const expected = normalizeProcedureName(target.name);
  if (!logged || !expected) return false;
  return logged === expected || logged.includes(expected) || expected.includes(logged);
}

export function relevantProcedureTargets(profile, procedures = []) {
  const primary = cleanProcedureText(typeof profile === "string" ? profile : profile?.specialty);
  const specialties = new Set(["Core"]);
  if (primary) specialties.add(primary);
  procedures.forEach((p) => {
    const specialty = cleanProcedureText(p.specialty);
    if (specialty) specialties.add(specialty);
  });
  const targets = PROCEDURE_TARGETS.filter((target) => specialties.has(target.specialty));
  return targets.length ? targets : PROCEDURE_TARGETS.filter((target) => target.specialty === "Core");
}

export function summarizeProcedures(procedures = [], profile = null) {
  const items = Array.isArray(procedures) ? procedures : [];
  const targets = relevantProcedureTargets(profile, items);
  const progress = targets.map((target) => {
    const matching = items.filter((p) => matchesTarget(p, target));
    const competent = matching.filter((p) => COMPETENCY_ROLES.includes(p.role));
    const signedOff = matching.filter((p) => p.signed_off).length;
    const count = competent.length;
    const targetCount = Number(target.target) || 1;
    return {
      ...target,
      count,
      signedOff,
      percent: Math.min(100, Math.round((count / targetCount) * 100)),
      missing: Math.max(0, targetCount - count),
    };
  });
  return {
    total: items.length,
    performed: items.filter((p) => COMPETENCY_ROLES.includes(p.role)).length,
    independent: items.filter((p) => p.role === "Performed independently").length,
    signedOff: items.filter((p) => p.signed_off).length,
    byName: countBy(items, "procedure_name"),
    bySpecialty: countBy(items, "specialty"),
    byRole: countBy(items, "role"),
    progress,
    missing: progress.filter((p) => p.missing > 0),
  };
}
