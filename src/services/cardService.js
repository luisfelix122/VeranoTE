import { supabase } from '../supabase/client';

export const obtenerTarjetas = async (usuarioId) => {
    const { data, error } = await supabase
        .from('tarjetas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('principal', { ascending: false });

    if (error) {
        console.error('Error al obtener tarjetas:', error);
        return [];
    }
    return data.map(t => ({
        ...t,
        numero: t.numero, // Ya guardamos solo los ultimos 4
        numero_oculto: t.numero, // Compatibilidad con UI
        expiracion: t.exp, // Compatibilidad
        titular: t.nombre // Compatibilidad
    }));
};

export const agregarTarjeta = async (usuarioId, tarjeta) => {
    // Si es principal, desmarcar otras
    if (tarjeta.principal) {
        await supabase.from('tarjetas').update({ principal: false }).eq('usuario_id', usuarioId);
    }

    const { data, error } = await supabase
        .from('tarjetas')
        .insert([{
            usuario_id: usuarioId,
            numero: (tarjeta.numero.replace(/\D/g, '') || '0000').slice(-4),
            exp: tarjeta.exp,
            nombre: tarjeta.nombre,
            marca: tarjeta.marca || 'Desconocida',
            principal: tarjeta.principal || false,
            tipo: tarjeta.tipo || 'credito'
        }])
        .select()
        .single();

    if (error) {
        console.error('Error al agregar tarjeta:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

export const eliminarTarjeta = async (id) => {
    const { error } = await supabase
        .from('tarjetas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar tarjeta:', error);
        return false;
    }
    return true;
};
