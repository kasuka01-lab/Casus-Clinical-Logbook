import React, { useEffect, useState } from "react";

// Shows an install button when the browser offers PWA install (Android / desktop Chrome).
// On iPhone there's no prompt event, so we show short "Add to Home Screen" guidance instead.
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  if (installed || standalone) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (deferred) {
    return (
      <button className="btn gold" style={{ width: "100%", marginTop: 12 }}
        onClick={async () => { deferred.prompt(); await deferred.userChoice; setDeferred(null); }}>
        Install Casus app
      </button>
    );
  }
  if (isIOS) {
    return (
      <div className="note" style={{ textAlign: "center", marginTop: 14 }}>
        To install on iPhone: tap the <b>Share</b> button, then <b>Add to Home Screen</b>.
      </div>
    );
  }
  return null;
}
