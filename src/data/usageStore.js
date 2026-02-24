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

  // Avoid PostgREST/RLS edge cases with UPSERT by doing insert first, then update on duplicate.
  const { error: insertError } = await supabase
    .from('uso_app')
    .insert(payload);

  if (!insertError) {
    return { skipped: false, error: null };
  }

  const isDuplicate =
    insertError.code === '23505' ||
    String(insertError.message || '').toLowerCase().includes('duplicate');

  if (!isDuplicate) {
    console.warn('uso_app insert failed', insertError);
    return { skipped: false, error: insertError };
  }

  const { error: updateError } = await supabase
    .from('uso_app')
    .update({
      ultima_actualizacion: payload.ultima_actualizacion,
      seccion: payload.seccion,
    })
    .eq('chapa', payload.chapa);

  if (updateError) {
    console.warn('uso_app update failed', updateError);
    return { skipped: false, error: updateError };
  }

  return { skipped: false, error: null };
}
