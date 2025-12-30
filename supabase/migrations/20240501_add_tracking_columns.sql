-- 1. Agregar columnas para auditar quién realiza la entrega y devolución
ALTER TABLE public.alquileres 
ADD COLUMN IF NOT EXISTS entregado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS recibido_por UUID REFERENCES auth.users(id);

-- 2. Actualizar las funciones RPC para aceptar estos parámetros
-- Nota: En Supabase, debes ir al Editor SQL para reemplazar las funciones existentes.

-- Ejemplo de cómo debería quedar 'entregar_alquiler_robusto' actualizado (COPIAR Y PEGAR EN EDITOR SQL DE SUPABASE):
/*
CREATE OR REPLACE FUNCTION entregar_alquiler_robusto(p_alquiler_id BIGINT, p_vendedor_id UUID)
RETURNS JSON AS $$
DECLARE
    v_estado_actual VARCHAR;
    v_nuevo_estado_id INT;
BEGIN
    -- Validar estado actual
    SELECT ea.nombre INTO v_estado_actual
    FROM alquileres a
    JOIN estados_alquiler ea ON a.estado_id = ea.id
    WHERE a.id = p_alquiler_id;

    IF v_estado_actual != 'listo_para_entrega' THEN
        RETURN json_build_object('success', false, 'error', 'El alquiler no está listo para entrega (Estado: ' || v_estado_actual || ')');
    END IF;

    -- Obtener ID del estado 'en_uso'
    SELECT id INTO v_nuevo_estado_id FROM estados_alquiler WHERE nombre = 'en_uso';

    -- Actualizar
    UPDATE alquileres 
    SET estado_id = v_nuevo_estado_id,
        fecha_entrega = NOW(),
        entregado_por = p_vendedor_id
    WHERE id = p_alquiler_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION registrar_devolucion_robusta(p_alquiler_id BIGINT, p_vendedor_id UUID)
RETURNS JSON AS $$
DECLARE
    v_estado_actual VARCHAR;
    v_nuevo_estado_id INT;
    v_penalizacion NUMERIC := 0;
    v_total_final NUMERIC;
BEGIN
    SELECT ea.nombre, a.total_final INTO v_estado_actual, v_total_final
    FROM alquileres a
    JOIN estados_alquiler ea ON a.estado_id = ea.id
    WHERE a.id = p_alquiler_id;

    IF v_estado_actual != 'en_uso' THEN
        RETURN json_build_object('success', false, 'error', 'El alquiler no está en uso');
    END IF;

    -- Lógica simple de devolución (podrías agregar cálculos de mora aquí)
    
    SELECT id INTO v_nuevo_estado_id FROM estados_alquiler WHERE nombre = 'limpieza';

    UPDATE alquileres 
    SET estado_id = v_nuevo_estado_id,
        fecha_devolucion_real = NOW(),
        recibido_por = p_vendedor_id
    WHERE id = p_alquiler_id;

    RETURN json_build_object('success', true, 'penalizacion', 0, 'nuevo_total', v_total_final);
END;
$$ LANGUAGE plpgsql;
*/
