import { supabase } from '../lib/supabaseClient';

export async function getSpecialties() {
  const { data, error } = await supabase
    .from('especialidades')
    .select('*')
    .order('codigo', { ascending: true });

  if (error) {
    console.warn('Error fetching especialidades:', error);
    return null;
  }
  return data;
}

