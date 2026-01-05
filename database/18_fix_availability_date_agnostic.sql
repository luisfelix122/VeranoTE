-- 18_fix_availability_date_agnostic.sql
-- Fix: Redefine obtain_disponibilidad_recurso to be more robust and support date filtering.

CREATE OR REPLACE FUNCTION obtener_disponibilidad_recurso(
    p_recurso_id INTEGER,
    p_fecha TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_fisico INTEGER;
    v_cantidad_reservada INTEGER;
    v_fecha_evaluar TIMESTAMP WITH TIME ZONE;
    v_proximos_liberados JSONB;
BEGIN
    -- Determinar fecha de evaluación: Si es NULL o es HOY (mismo día que NOW), usar NOW()
    -- Esto asegura que "Hoy" muestre lo disponible AHORITA.
    -- Si es una fecha futura, usar el inicio de ese día (o la hora actual de ese día futuro por simplicidad)
    v_fecha_evaluar := COALESCE(p_fecha, NOW());
    
    -- Si la fecha es hoy pero en el pasado, ajustar a NOW
    IF v_fecha_evaluar < NOW() THEN
        v_fecha_evaluar := NOW();
    END IF;

    SELECT stock_total INTO v_total_fisico FROM RECURSOS WHERE id = p_recurso_id;
    
    -- Calcular cantidad reservada que se solapa con "ahora" o el inicio del periodo solicitado
    -- Ventana de 1 hora por defecto para el stock "rápido" de la tienda
    SELECT COALESCE(SUM(d.cantidad), 0) INTO v_cantidad_reservada
    FROM ALQUILER_DETALLES d
    JOIN ALQUILERES a ON a.id = d.alquiler_id
    WHERE d.recurso_id = p_recurso_id
      AND a.estado_id IN ('pendiente', 'confirmado', 'en_uso', 'listo_para_entrega')
      AND (
          a.fecha_inicio < (v_fecha_evaluar + interval '1 hour')
          AND
          a.fecha_fin_estimada > v_fecha_evaluar
      );

    -- Obtener próximos liberados ( rentals que terminan pronto )
    SELECT jsonb_agg(item) INTO v_proximos_liberados
    FROM (
        SELECT d.cantidad, a.fecha_fin_estimada as hora
        FROM ALQUILER_DETALLES d
        JOIN ALQUILERES a ON a.id = d.alquiler_id
        WHERE d.recurso_id = p_recurso_id
          AND a.estado_id IN ('pendiente', 'confirmado', 'en_uso', 'listo_para_entrega')
          AND a.fecha_fin_estimada > v_fecha_evaluar
        ORDER BY a.fecha_fin_estimada ASC
        LIMIT 5
    ) item;

    RETURN jsonb_build_object(
        'disponibles_ahora', GREATEST(0, v_total_fisico - v_cantidad_reservada),
        'total_fisico', v_total_fisico,
        'proximos_liberados', COALESCE(v_proximos_liberados, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- Asegurar permisos
GRANT
EXECUTE ON FUNCTION obtener_disponibilidad_recurso TO anon,
authenticated,
service_role;