-- Función para estimar disponibilidad
CREATE OR REPLACE FUNCTION estimar_disponibilidad_recurso(p_recurso_id INTEGER) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_fecha_fin TIMESTAMP WITH TIME ZONE;
    v_buffer_limpieza INTERVAL := '30 minutes'; -- Tiempo de limpieza/preparación
BEGIN
    -- Buscar el alquiler activo (o confirmado/listo) que termine más tarde para este recurso
    SELECT MAX(a.fecha_fin_estimada) INTO v_fecha_fin
    FROM ALQUILERES a
    JOIN ALQUILER_DETALLES d ON a.id = d.alquiler_id
    WHERE d.recurso_id = p_recurso_id
      AND a.estado_id IN ('confirmado', 'en_uso', 'listo_para_entrega', 'pendiente') -- Estados activos
      AND a.fecha_fin_estimada > NOW();

    -- Si no hay alquileres futuros, verificar si está en mantenimiento
    IF v_fecha_fin IS NULL THEN
        -- Aquí podrías chequear la tabla MANTENIMIENTOS si existiera lógica compleja, 
        -- por ahora asumimos que si stock es 0 y no hay reservas, es un error de stock o mantenimiento indefinido.
        -- Retornamos NULL para que el frontend decida qué mostrar (ej. "Consultar").
        RETURN NULL;
    END IF;

    -- Retornar la fecha fin + buffer
    RETURN v_fecha_fin + v_buffer_limpieza;
END;
$$ LANGUAGE plpgsql;