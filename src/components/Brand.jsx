import React from "react";

// Casus mark: concentric diamonds (a focused case) on deep green, in gold.
export function CasusLogo({ size = 40, className = "" }) {
  return (
    <img src="/casus-mark.png" alt="Casus" width={size} height={size} className={className}
      style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} />
  );
}

// Thin African-print band (kente / mudcloth inspired) for the top of headers.
export function CasusBand() {
  return (
    <svg className="band" width="100%" height="13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="casusband" width="48" height="13" patternUnits="userSpaceOnUse">
          <rect width="48" height="13" fill="#1B4A3A" />
          <path d="M0 6.5 L6 0 L12 6.5 L6 13 Z" fill="#C0922E" />
          <path d="M12 6.5 L18 0 L24 6.5 L18 13 Z" fill="#F7F4EC" />
          <path d="M24 6.5 L30 0 L36 6.5 L30 13 Z" fill="#C0922E" />
          <path d="M36 6.5 L42 0 L48 6.5 L42 13 Z" fill="#F7F4EC" />
          <rect x="5.5" y="5.5" width="2" height="2" fill="#1B4A3A" />
          <rect x="17.5" y="5.5" width="2" height="2" fill="#1B4A3A" />
          <rect x="29.5" y="5.5" width="2" height="2" fill="#1B4A3A" />
          <rect x="41.5" y="5.5" width="2" height="2" fill="#1B4A3A" />
        </pattern>
      </defs>
      <rect width="100%" height="13" fill="url(#casusband)" />
    </svg>
  );
}
