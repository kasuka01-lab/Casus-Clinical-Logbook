import React, { useRef, useState } from "react";

// Tap to dictate into a text field. Uses the browser's built-in speech
// recognition (works on Android Chrome and desktop Chrome). If the browser
// doesn't support it, the button simply doesn't appear.
export default function DictateButton({ onText }) {
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const [on, setOn] = useState(false);
  const recRef = useRef(null);
  if (!SR) return null;

  const toggle = () => {
    if (on) { try { recRef.current && recRef.current.stop(); } catch (e) {} setOn(false); return; }
    try {
      const rec = new SR();
      rec.lang = "en-US"; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (e) => {
        let t = "";
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        if (t.trim()) onText(t.trim());
      };
      rec.onend = () => setOn(false);
      rec.onerror = () => setOn(false);
      recRef.current = rec; rec.start(); setOn(true);
    } catch (e) { setOn(false); }
  };

  return (
    <button type="button" className="linkbtn" onClick={toggle}
      style={{ fontSize: 12, textTransform: "none", letterSpacing: 0, color: on ? "#9c3b29" : "var(--gold-dk)" }}>
      {on ? "● stop" : "🎙 dictate"}
    </button>
  );
}
