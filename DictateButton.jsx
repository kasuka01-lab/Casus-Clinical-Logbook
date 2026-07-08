import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import InstallButton from "./InstallButton";

const I = {
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v15l-4-2-4 2V3" /><path d="M9 7h4M9 11h4" /></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-6M3 20h18" /><path d="M14 6l3-3 3 3" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeoff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.6 6.7A17 17 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 3.4-.6" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg>,
  login: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>,
  signup: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>,
};

const VERIFY_REDIRECT = "https://casuslog.com/login";

const FEATURES = [
  [I.book, "Log cases", "Capture every clinical experience"],
  [I.camera, "Add media", "Photos & notes made simple"],
  [I.chat, "Get feedback", "Learn and grow with insights"],
  [I.chart, "Track growth", "Monitor progress, achieve more"],
];

export default function Auth() {
  const [tab, setTab] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setMsg(""); setShowResend(false); setBusy(true);
    try {
      if (tab === "signup") {
        if (!firstName.trim() || !surname.trim()) { setErr("Enter your first name and surname."); setBusy(false); return; }
        const dup = "That email already has an account. Switch to Log in above, or use \u201cForgot password?\u201d to get back in.";
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password: pw,
          options: {
            emailRedirectTo: VERIFY_REDIRECT,
            data: { full_name: (firstName.trim() + " " + surname.trim()), first_name: firstName.trim(), surname: surname.trim() },
          },
        });
        if (error) {
          if (/already.*regist|already.*exist|already.*use/i.test(error.message)) { setErr(dup); setBusy(false); return; }
          setErr(error.message); setBusy(false); return;
        }
        // Supabase returns a user with an empty identities array when the email is already in use.
        if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { setErr(dup); setBusy(false); return; }
        // Do NOT sign in — the user must confirm their email first.
        setMsg("Account created. Please check your email and confirm your account before signing in.");
        setShowResend(true);
        setTab("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) {
          if (/email not confirmed|not confirmed|confirm your email/i.test(error.message)) {
            setErr("Please confirm your email before signing in. Check your inbox (and spam) for the confirmation link.");
            setShowResend(true); setBusy(false); return;
          }
          throw error;
        }
      }
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy(false);
  };

  const resendVerify = async () => {
    setErr(""); setMsg("");
    if (!email.trim()) { setErr("Type your email address above first, then tap Resend."); return; }
    try {
      const { error } = await supabase.auth.resend({
        type: "signup", email: email.trim(),
        options: { emailRedirectTo: VERIFY_REDIRECT },
      });
      if (error) throw error;
      setMsg("Verification email sent. Check your inbox and spam folder.");
    } catch (e) { setErr(e.message || "Could not resend the verification email right now."); }
  };

  const forgot = async () => {
    setErr(""); setMsg("");
    if (!email.trim()) { setErr("Type your email address above first, then tap Forgot password."); return; }
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      setMsg("If an account uses that email, a reset link is on its way. Check your inbox and spam.");
    } catch (e) { setErr(e.message || "Could not send a reset link right now."); }
  };

  return (
    <div className="center">
      <div className="auth">
        <div className="authcol brandcol">
        <div className="auth-brand">
          <img src="/casus-brand.png" alt="Casus — Clinical Logbook" style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "block", borderRadius: 12 }} />
        </div>

        <div className="feat">
          {FEATURES.map(([icon, title, sub], i) => (
            <div className="fi" key={i}>{icon}<b>{title}</b><span>{sub}</span></div>
          ))}
        </div>
        </div>

        <div className="authcol formcol">
        <div className="seg">
          <button data-on={tab === "login" ? 1 : 0} onClick={() => { setTab("login"); setErr(""); setMsg(""); }}>
            {I.login}<span className="st"><b>LOG IN</b><span>Welcome back!</span></span>
          </button>
          <button data-on={tab === "signup" ? 1 : 0} onClick={() => { setTab("signup"); setErr(""); setMsg(""); }}>
            {I.signup}<span className="st"><b>SIGN UP</b><span>Create an account</span></span>
          </button>
        </div>

        <div className="box">
          {tab === "signup" && (
            <div className="row">
              <div className="field"><label>First name <span className="req">*</span></label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="field"><label>Surname <span className="req">*</span></label>
                <input value={surname} onChange={(e) => setSurname(e.target.value)} /></div>
            </div>
          )}
          <div className="field"><label>Email address <span className="req">*</span></label>
            <div className="inwrap"><span className="ic">{I.mail}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </div>
          <div className="field"><label>Password <span className="req">*</span></label>
            <div className="inwrap"><span className="ic">{I.lock}</span>
              <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
              <button type="button" className="eye" onClick={() => setShowPw((v) => !v)} aria-label="Show or hide password">
                {showPw ? I.eyeoff : I.eye}</button>
            </div>
          </div>

          {tab === "login" && (
            <div className="authrow">
              <label className="chk"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
              <button type="button" className="linkbtn" onClick={forgot}>Forgot password?</button>
            </div>
          )}

          {err && <div className="err">{err}</div>}
          {msg && <div className="note" style={{ color: "var(--ok)" }}>{msg}</div>}

          <button className="btn pri bigbtn" onClick={submit} disabled={busy}>
            {busy ? "Please wait…" : tab === "signup" ? "Create account" : "Log in"}
            {!busy && <span className="arr">{I.arrow}</span>}
          </button>

          {(tab === "login" || showResend) && (
            <button type="button" className="linkbtn" style={{ display: "block", margin: "12px auto 0" }} onClick={resendVerify}>
              Didn’t get the email? Resend verification
            </button>
          )}

          <div className="secure">{I.shield} Your data is secure &amp; private</div>
        </div>

        <InstallButton />
        </div>
      </div>
    </div>
  );
}
