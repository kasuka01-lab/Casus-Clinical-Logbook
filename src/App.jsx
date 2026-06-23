import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase, configured } from "./lib/supabase";
import { getProfile } from "./lib/api";
import Auth from "./components/Auth";
import Logbook from "./components/Logbook";
import SharedView from "./components/SharedView";
import Admin from "./components/Admin";

function SetupNotice() {
  return (
    <div className="center"><div className="auth">
      <div className="auth-brand"><div className="wm serif">Casus</div></div>
      <div className="box">
        <h3 className="serif" style={{ fontSize: 18, marginBottom: 10 }}>Almost there</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>
          Add your Supabase keys to a <code>.env</code> file, then rebuild. See the README.
        </p>
      </div>
    </div></div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  const reloadProfile = useCallback(() => { getProfile().then(setProfile); }, []);

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    setReady(true);
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) reloadProfile(); else setProfile(null); }, [session, reloadProfile]);

  if (!configured) return <SetupNotice />;
  if (!ready) return <div className="load">Loading…</div>;

  // Only treat a user as signed in once their email is confirmed.
  const authed = !!(session && session.user && (session.user.email_confirmed_at || session.user.confirmed_at));

  return (
    <Routes>
      <Route path="/s/:token" element={<SharedView />} />
      <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/admin" element={authed && profile ? <Admin profile={profile} /> : <Auth />} />
      <Route path="/" element={!authed ? <Auth /> : profile ? <Logbook profile={profile} onProfileUpdated={reloadProfile} /> : <div className="load">Loading…</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
