import React from "react";

// Simple anatomical line-art glyphs, one per specialty. Stroke uses currentColor
// so the parent (.th) sets the tint. Shown when a case has no photo of its own.
function S({ children }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">{children}</svg>
  );
}

const ICONS = {
  "General Practice / Family Medicine": (
    <S><path d="M14 9v7a10 10 0 0020 0V9" /><circle cx="14" cy="8" r="2" /><circle cx="34" cy="8" r="2" />
      <path d="M24 26v6a7 7 0 007 7 7 7 0 007-7v-3" /><circle cx="38" cy="27" r="3.2" /></S>
  ),
  "Obstetrics & Gynaecology": (
    <S><path d="M24 37c-6 0-10-5-10-11 0-4 1-7 2-11" /><path d="M24 37c6 0 10-5 10-11 0-4-1-7-2-11" />
      <path d="M16 15c-3-1-5 1-6 4" /><path d="M32 15c3-1 5 1 6 4" />
      <circle cx="8.5" cy="21" r="2.2" /><circle cx="39.5" cy="21" r="2.2" /></S>
  ),
  "ENT (Otolaryngology)": (
    <S><path d="M18 39c-4-2-7-7-7-14a13 13 0 0126 0c0 4-2 7-6 7-3 0-4-2-4-4" />
      <path d="M24 22a5 5 0 00-5 5c0 4 3 5 3 9" /></S>
  ),
  "General Surgery": (
    <S><path d="M12 35l15-15a3 3 0 014 4L17 39l-7 2z" /><path d="M27 20l9-9" /></S>
  ),
  "Internal Medicine": (
    <S><path d="M24 37S9 28 9 18a7.5 7.5 0 0115-3 7.5 7.5 0 0115 3c0 10-15 19-15 19z" /></S>
  ),
  "Paediatrics": (
    <S><circle cx="24" cy="13" r="5.5" /><path d="M24 18.5v12M16 25h16M24 30.5l-5 8M24 30.5l5 8" /></S>
  ),
  "Orthopaedics": (
    <S><path d="M16 32l16-16" /><circle cx="13" cy="31" r="3" /><circle cx="16.5" cy="34.5" r="3" />
      <circle cx="35" cy="17" r="3" /><circle cx="31.5" cy="13.5" r="3" /></S>
  ),
  "Ophthalmology": (
    <S><path d="M8 24s7-9 16-9 16 9 16 9-7 9-16 9S8 24 8 24z" /><circle cx="24" cy="24" r="4.5" /></S>
  ),
  "Urology": (
    <S><path d="M28 11c-9 0-15 6-15 14s5 12 11 12c5 0 6-5 2-8-2-2-2-4 0-6 3-3 2-9-2-11 2-1 4-1 4-1z" />
      <path d="M30 25l5-5" /></S>
  ),
  "Dermatology": (
    <S><rect x="11" y="13" width="26" height="22" rx="5" /><path d="M11 23h26" />
      <circle cx="19" cy="29" r="1.4" /><circle cx="26" cy="30" r="1.4" /><circle cx="31" cy="27" r="1.4" /></S>
  ),
  "Psychiatry": (
    <S><path d="M16 37v-5c-3-2-5-6-5-10a12 12 0 1118 10v5" /><path d="M22 19a3.5 3.5 0 013 3.5c0 2-2 2.5-2 4.5" /></S>
  ),
  "Anaesthesia & Critical Care": (
    <S><path d="M16 16h16a4 4 0 014 4v3a12 12 0 01-24 0v-3a4 4 0 014-4z" /><path d="M36 21h6M12 21H6" /></S>
  ),
  "Emergency Medicine": (
    <S><circle cx="24" cy="24" r="14" /><path d="M11 24h6l3-8 4 16 3-8h6" /></S>
  ),
  "Radiology": (
    <S><path d="M24 9v30" /><path d="M24 14c-6 0-10 2-12 4M24 14c6 0 10 2 12 4" />
      <path d="M24 21c-7 0-11 2-13 4M24 21c7 0 11 2 13 4" /><path d="M24 28c-6 0-10 2-12 4M24 28c6 0 10 2 12 4" /></S>
  ),
  "Pathology": (
    <S><path d="M17 38h15" /><path d="M25 38v-6" /><path d="M25 32c-5 0-8-4-8-8l4-4" />
      <circle cx="22" cy="14" r="3.2" /><path d="M24.5 16.5l3 4" /></S>
  ),
  "Oncology": (
    <S><path d="M20 39l4-13 4 13" /><path d="M24 26c5-6 8-11 6-15-1.5-3-9.5-3-11 0-2 4 0 9 5 15z" /></S>
  ),
  "Neurosurgery": (
    <S><path d="M24 12c-3 0-5 1.5-5.5 3.5-2.5 0-4.5 2-4.5 4.5 0 1.5.7 2.7 1.6 3.5C14.6 24.4 14 25.6 14 27c0 3 2.6 5 5.6 5H24V12z" />
      <path d="M24 12c3 0 5 1.5 5.5 3.5 2.5 0 4.5 2 4.5 4.5 0 1.5-.7 2.7-1.6 3.5C33.4 24.4 34 25.6 34 27c0 3-2.6 5-5.6 5H24" />
      <path d="M24 12v20" /></S>
  ),
  "Oral & Maxillofacial Surgery": (
    <S><path d="M14 22a10 10 0 0120 0v6h-4l-2 3h-8l-2-3h-4z" /><circle cx="19.5" cy="22" r="2" />
      <circle cx="28.5" cy="22" r="2" /><path d="M22 28h4" /></S>
  ),
  "Dental Surgery": (
    <S><path d="M16 13c4-3 6-1 8 1 2-2 4-4 8-1 4 3 2 10-.5 17-1 3-3 3-3.5 0l-1.5-7h-3l-1.5 7c-.5 3-2.5 3-3.5 0C14 23 12 16 16 13z" /></S>
  ),
  "Other": (
    <S><path d="M24 12v24M12 24h24" /></S>
  ),
};

export function SpecialtyIcon({ specialty }) {
  return ICONS[specialty] || ICONS["Other"];
}
