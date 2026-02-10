import { supabase } from '../lib/supabaseClient';
import { sha256Hex } from '../lib/sha256';

export async function getProfileByAuthUserId(authUserId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
    return null;
  }
  return data;
}

export async function updateUserPhone(authUserId, phone) {
  const { error } = await supabase
    .from('usuarios')
    .update({ telefono: phone ? String(phone).trim() : null })
    .eq('id', authUserId);

  return !error;
}

export async function updateUserProfile(authUserId, patch) {
  // Changing chapa affects login identity (synthetic email). We handle that via an Edge Function
  // so we can update both auth.users and public.usuarios safely.
  const { data, error } = await supabase.functions.invoke('profile-update', {
    body: { patch },
  });

  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || 'No se pudo guardar' };
  return { success: true };
}

export async function uploadUserAvatar(authUserId, file) {
  try {
    if (!file) return { success: false, error: 'Archivo no valido' };
    if (!String(file.type || '').startsWith('image/')) return { success: false, error: 'Debe ser una imagen' };

    const ext = (String(file.name || '').split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.match(/^[a-z0-9]{1,5}$/) ? ext : 'jpg';
    const path = `${authUserId}/avatar.${safeExt}`;

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
    });
    if (upErr) return { success: false, error: upErr.message };

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = pub?.publicUrl;
    if (!url) return { success: false, error: 'No se pudo obtener la URL' };

    const { error: dbErr } = await supabase.from('usuarios').update({ avatar_url: url }).eq('id', authUserId);
    if (dbErr) return { success: false, error: dbErr.message };

    return { success: true, url };
  } catch (e) {
    return { success: false, error: String(e?.message || e) };
  }
}

export async function deleteUserAvatar(authUserId) {
  try {
    // Remove any avatar files under `${uid}/` and clear the profile field.
    const prefix = `${authUserId}/`;
    const { data: objects, error: listErr } = await supabase.storage.from('avatars').list(prefix, { limit: 50 });
    if (listErr) return { success: false, error: listErr.message };

    const paths = (objects || [])
      .filter((o) => o?.name)
      .map((o) => `${prefix}${o.name}`);

    if (paths.length) {
      const { error: rmErr } = await supabase.storage.from('avatars').remove(paths);
      if (rmErr) return { success: false, error: rmErr.message };
    }

    const { error: dbErr } = await supabase.from('usuarios').update({ avatar_url: null }).eq('id', authUserId);
    if (dbErr) return { success: false, error: dbErr.message };

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e?.message || e) };
  }
}

export async function setRecoveryCode(authUserId, code) {
  try {
    const c = String(code ?? '').trim();
    if (!/^[0-9]{6}$/.test(c)) return { success: false, error: 'El codigo debe tener 6 digitos.' };
    const hash = await sha256Hex(c);

    const { error } = await supabase.from('usuarios').update({ recovery_code_hash: hash }).eq('id', authUserId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e?.message || e) };
  }
}




