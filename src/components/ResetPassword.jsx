import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function paramsHaveRecoveryToken(params) {
  return (
    params.get("type") === "recovery" ||
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("code") ||
    params.has("token_hash")
  );
}

function urlHasRecoveryTokens() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return paramsHaveRecoveryToken(searchParams) || paramsHaveRecoveryToken(hashParams);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const hasTokens = urlHasRecoveryTokens();

    if (hasTokens) setCanReset(true);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErr(error.message);
      if (data?.session || hasTokens) setCanReset(true);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setErr("");
        setCanReset(true);
        setReady(true);
      }
      if (session && hasTokens) {
        setCanReset(true);
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (newPassword.length < 6) {
      setErr("Enter a password with at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setUpdated(true);
      setMsg("Password updated successfully. Please log in with your new password.");
      setNewPassword("");
      setConfirmPassword("");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (e) {
      setErr(e.message || "Could not update your password right now.");
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <div className="auth">
        <div className="authcol formcol">
          <div className="box">
            <h3 className="serif" style={{ fontSize: 20, marginBottom: 14 }}>Reset password</h3>

            {!ready && <div className="note">Preparing your reset link...</div>}

            {ready && !canReset && (
              <>
                <div className="err">Open the password reset link from your email to choose a new password.</div>
                <button type="button" className="linkbtn" style={{ display: "block", margin: "12px auto 0" }} onClick={() => navigate("/login")}>
                  Back to log in
                </button>
              </>
            )}

            {ready && canReset && (
              <form onSubmit={updatePassword}>
                <div className="field">
                  <label>New password <span className="req">*</span></label>
                  <div className="inwrap">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy || updated}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Confirm password <span className="req">*</span></label>
                  <div className="inwrap">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy || updated}
                    />
                  </div>
                </div>

                {err && <div className="err">{err}</div>}
                {msg && <div className="note" style={{ color: "var(--ok)" }}>{msg}</div>}

                <button className="btn pri bigbtn" type="submit" disabled={busy || updated}>
                  {busy ? "Updating..." : "Update password"}
                </button>
                <button type="button" className="linkbtn" style={{ display: "block", margin: "12px auto 0" }} onClick={() => navigate("/login")}>
                  Back to log in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
