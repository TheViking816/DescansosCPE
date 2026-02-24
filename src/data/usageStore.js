import { supabase } from '../lib/supabaseClient';

const EXCLUDED_CHAPAS = new Set(['72683']);

export function shouldTrackUsage(chapa) {
  const normalized = String(chapa || '').trim();
  return Boolean(normalized) && !EXCLUDED_CHAPAS.has(normalized);
}

export async function upsertUsageActivity({ chapa, seccion }) {
  if (!shouldTrackUsage(chapa)) return { skipped: true };

  const payload = {
    chapa: String(chapa).trim(),
    ultima_actualizacion: new Date().toISOString(),
    seccion: String(seccion || '').slice(0, 120) || null,
  };

  const { error } = await supabase
    .from('uso_app')
    .upsert(payload, { onConflict: 'chapa' });

  if (error) {
    return { skipped: false, error };
  }

  return { skipped: false, error: null };
}
