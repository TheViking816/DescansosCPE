import { supabase } from '../lib/supabaseClient';

export async function getGroups() {
  const { data, error } = await supabase
    .from('grupos_descanso')
    .select('*')
    .order('codigo', { ascending: true });

  if (error) {
    console.warn('Error fetching grupos_descanso:', error);
    return null;
  }
  return data;
}

