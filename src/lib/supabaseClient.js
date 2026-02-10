import { createClient } from '@supabase/supabase-js';

// Vite: define these in `.env` (not committed). Keep anon key on the client (RLS enforces access).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fail fast so misconfig doesn't look like an "auth bug".
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
