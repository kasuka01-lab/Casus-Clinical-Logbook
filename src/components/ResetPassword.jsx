import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
      setMsg("Password updated. You can log in with your new password.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setErr(e.message || "Could not update your password right now.");
    }
    setBusy(false);
  };

  return (
    <div className="center">
      <div className="auth">
        <div className="authcol formcol">
          <div className="box">
            <h3 className="serif" style={{ fontSize: 20, marginBottom: 14 }}>Reset password</h3>
            <form onSubmit={updatePassword}>
              <div className="field">
                <label>New password <span className="req">*</span></label>
                <div className="inwrap">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
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
                  />
                </div>
              </div>

              {err && <div className="err">{err}</div>}
              {msg && <div className="note" style={{ color: "var(--ok)" }}>{msg}</div>}

              <button className="btn pri bigbtn" type="submit" disabled={busy}>
                {busy ? "Updating..." : "Update password"}
              </button>
              <button type="button" className="linkbtn" style={{ display: "block", margin: "12px auto 0" }} onClick={() => navigate("/login")}>
                Back to log in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
