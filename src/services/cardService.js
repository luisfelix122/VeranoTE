import { supabase } from '../supabase/client';

export const obtenerTarjetas = async (usuarioId) => {
    const { data, error } = await supabase
        .from('tarjetas_credito')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('activa', true)
        .order('es_principal', { ascending: false });

    if (error) {
        console.error('Error al obtener tarjetas:', error);
        return [];
    }
    return data;
};

export const agregarTarjeta = async (usuarioId, tarjeta) => {
    // Si es principal, desmarcar otras
    if (tarjeta.principal) {
        await supabase.from('tarjetas_credito').update({ es_principal: false }).eq('usuario_id', usuarioId);
    }

    const { data, error } = await supabase
        .from('tarjetas_credito')
        .insert([{
            usuario_id: usuarioId,
            numero_oculto: tarjeta.numero ? tarjeta.numero.slice(-4) : '0000', // Guardar solo ultimos 4
            token: 'tok_simulado_' + Date.now(),
            expiracion: tarjeta.exp,
            titular: tarjeta.nombre,
            marca: tarjeta.marca || 'Desconocida',
            tipo: tarjeta.tipo || 'credito',
            es_principal: tarjeta.principal,
            activa: true
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
        .from('tarjetas_credito')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar tarjeta:', error);
        return false;
    }
    return true;
};
