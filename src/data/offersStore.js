import { supabase } from '../lib/supabaseClient';

export async function getOffers() {
    const { data, error } = await supabase
        .from('ofertas')
        .select('*')
        .eq('activa', true)
        .order('created_at', { ascending: false });

    if (error) return [];

    // Also fetch user details for each offer to avoid N+1
    // For now, matchingEngine will fetch users individually which is okay for small scale
    return data.map(o => ({
        id: o.id,
        userId: o.user_id,
        tengoDesde: o.tengo_desde,
        tengoHasta: o.tengo_hasta,
        necesitoDesde: o.necesito_desde,
        necesitoHasta: o.necesito_hasta,
        createdAt: o.created_at,
        activa: o.activa
    }));
}

export async function getOffersByUser(userId) {
    const { data, error } = await supabase
        .from('ofertas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map(o => ({
        id: o.id,
        userId: o.user_id,
        tengoDesde: o.tengo_desde,
        tengoHasta: o.tengo_hasta,
        necesitoDesde: o.necesito_desde,
        necesitoHasta: o.necesito_hasta,
        createdAt: o.created_at,
        activa: o.activa
    }));
}

export async function createOffer(offer) {
    const { data, error } = await supabase
        .from('ofertas')
        .insert([{
            user_id: offer.userId,
            tengo_desde: offer.tengoDesde,
            tengo_hasta: offer.tengoHasta,
            necesito_desde: offer.necesitoDesde,
            necesito_hasta: offer.necesitoHasta
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteOffer(offerId) {
    await supabase
        .from('ofertas')
        .delete()
        .eq('id', offerId);
}
