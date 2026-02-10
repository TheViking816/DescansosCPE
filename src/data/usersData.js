import { supabase } from '../lib/supabaseClient';

export async function getProfileByAuthUserId(authUserId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
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



