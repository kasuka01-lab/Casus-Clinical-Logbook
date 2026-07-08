import { createClient } from "@supabase/supabase-js";

// These are PUBLIC client keys — safe to expose. Your data is protected by
// Supabase Row Level Security, not by hiding these. Using them as fallbacks
// lets the project build anywhere (GitHub, Netlify) with no extra setup.
const url = import.meta.env.VITE_SUPABASE_URL || "https://jwedpxcptrpnultybutp.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_a7xJ_S8D3Ve8k9mLPC7EUw_HiUQ1Xhf";

export const supabase = url && key ? createClient(url, key) : null;
export const configured = Boolean(supabase);
