import { supabase } from "./supabase";
import { resizeImage } from "./media";

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ? { ...data, email: user.email } : { id: user.id, email: user.email, role: "trainee" };
}

export async function updateProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
  if (error) throw error;
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  const blob = await resizeImage(file, 512, 0.85);
  const path = `${user.id}/profile/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("case-media").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  return path;
}

export function publicUrl(path) {
  if (!path) return null;
  return supabase.storage.from("case-media").getPublicUrl(path).data.publicUrl;
}

export async function listMyCases() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("cases").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCaseMedia(caseId) {
  const { data } = await supabase.from("case_media").select("*").eq("case_id", caseId).order("created_at");
  return data || [];
}

export async function saveCase(values, id) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { ...values, owner_id: user.id };
  if (id) {
    const { data, error } = await supabase.from("cases").update(payload).eq("id", id).select().single();
    if (error) throw error; return data;
  }
  const { data, error } = await supabase.from("cases").insert(payload).select().single();
  if (error) throw error; return data;
}

export async function deleteCase(id) {
  const media = await getCaseMedia(id);
  if (media.length) await supabase.storage.from("case-media").remove(media.map((m) => m.storage_path));
  const { error } = await supabase.from("cases").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadMedia(caseId, blob, kind, ext, section = "photo", caption = null, followUpId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user.id}/${caseId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("case-media").upload(path, blob, { contentType: blob.type || "application/octet-stream" });
  if (error) throw error;
  const row = { case_id: caseId, owner_id: user.id, kind, storage_path: path, section };
  if (caption != null) row.caption = caption;
  if (followUpId != null) row.follow_up_id = followUpId;
  const { error: e2 } = await supabase.from("case_media").insert(row);
  if (e2) throw e2;
  return path;
}
export async function uploadImageBlob(caseId, blob, section = "photo", caption = null, followUpId = null) {
  return uploadMedia(caseId, blob, "image", "jpg", section, caption, followUpId);
}
export async function uploadVideoFile(caseId, file, section = "photo", caption = null, followUpId = null) {
  return uploadMedia(caseId, file, "video", (file.name.split(".").pop() || "mp4").toLowerCase(), section, caption, followUpId);
}
export async function uploadDocumentFile(caseId, file, section = "notes", caption = null, followUpId = null) {
  return uploadMedia(caseId, file, "file", (file.name.split(".").pop() || "pdf").toLowerCase(), section, caption, followUpId);
}
export async function updateMediaCaption(id, caption) {
  await supabase.from("case_media").update({ caption }).eq("id", id);
}
export async function removeMedia(item) {
  await supabase.storage.from("case-media").remove([item.storage_path]);
  await supabase.from("case_media").delete().eq("id", item.id);
}

// follow-ups
export async function listFollowUps(caseId) {
  const { data } = await supabase.from("follow_ups").select("*").eq("case_id", caseId).order("created_at");
  return data || [];
}
export async function addFollowUp(caseId, date, note, type = "followup") {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("follow_ups").insert({ case_id: caseId, owner_id: user.id, date: date || null, note, type }).select("id").single();
  if (error) throw error;
  return data?.id;
}
export async function deleteFollowUp(id) {
  await supabase.from("follow_ups").delete().eq("id", id);
}

// share links
export async function listShareLinks() {
  const { data } = await supabase.from("share_links").select("*").order("created_at", { ascending: false });
  return data || [];
}
export async function createShareLink(label) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("share_links").insert({ owner_id: user.id, label }).select().single();
  if (error) throw error; return data;
}
export async function revokeShareLink(id) {
  await supabase.from("share_links").update({ revoked: true }).eq("id", id);
}
export async function submitAssessment(token, caseId, a) {
  const { error } = await supabase.rpc("submit_assessment", {
    p_token: token, p_case_id: caseId, p_type: a.type, p_rating: a.rating,
    p_strengths: a.strengths, p_improve: a.improve, p_assessor_name: a.assessor_name,
    p_assessor_role: a.assessor_role, p_verified: a.verified,
  });
  if (error) throw error;
}
export async function listAssessments(caseId) {
  const { data } = await supabase.from("assessments").select("*").eq("case_id", caseId).order("created_at");
  return data || [];
}
export async function getMarksForOwner() {
  const { data } = await supabase.from("marks").select("*");
  return data || [];
}

// shared (token) surface
export async function getSharedLogbook(token) {
  const { data, error } = await supabase.rpc("get_shared_logbook", { p_token: token });
  if (error) throw error;
  return data;
}
export async function submitMark(token, caseId, score, comment, assessor) {
  const { error } = await supabase.rpc("submit_mark", {
    p_token: token, p_case_id: caseId, p_score: score, p_comment: comment, p_assessor: assessor,
  });
  if (error) throw error;
}

// admin
export async function adminStats() {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw error; return data;
}
export async function adminListUsers() {
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return data || [];
}
export async function adminAllCases() {
  const { data, error } = await supabase.rpc("admin_all_cases");
  if (error) throw error;
  return data || [];
}
