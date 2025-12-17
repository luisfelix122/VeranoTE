-- 9_fix_availability_check.sql
-- Fix: verificar_disponibilidad_items reads from ALQUILER_DETALLES instead of JSON items.

CREATE OR REPLACE FUNCTION verificar_disponibilidad_items(
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_recurso_id INTEGER;
    v_cantidad_solicitada INTEGER;
    v_horas INTEGER;
    v_fecha_fin_solicitada TIMESTAMP WITH TIME ZONE;
    v_stock_total INTEGER;
    v_cantidad_reservada INTEGER;
    v_recurso_nombre TEXT;
BEGIN
    -- Loop through requested items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_recurso_id := (v_item->>'id')::INTEGER;
        v_cantidad_solicitada := (v_item->>'cantidad')::INTEGER;
        v_horas := (v_item->>'horas')::INTEGER;
        
        -- Calculate requested end time
        v_fecha_fin_solicitada := p_fecha_inicio + (v_horas || ' hours')::INTERVAL;

        -- Get Resource Info
        SELECT stock_total, nombre INTO v_stock_total, v_recurso_nombre
        FROM RECURSOS WHERE id = v_recurso_id;

        IF NOT FOUND THEN
             RETURN jsonb_build_object('valido', false, 'mensaje', 'Recurso no encontrado: ID ' || v_recurso_id);
        END IF;

        -- Calculate Reserved Quantity during the requested period (Overlap Logic)
        -- Overlap: (ReqStart < ExistingEnd) AND (ReqEnd > ExistingStart)
        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_cantidad_reservada
        FROM ALQUILERES a
        JOIN ALQUILER_DETALLES d ON a.id = d.alquiler_id
        WHERE d.recurso_id = v_recurso_id
        AND a.estado_id IN ('pendiente', 'confirmado', 'en_uso', 'listo_para_entrega') -- Active statuses
        AND (
            p_fecha_inicio < a.fecha_fin_estimada
            AND
            v_fecha_fin_solicitada > a.fecha_inicio
        );

        -- Check Availability
        IF (v_cantidad_reservada + v_cantidad_solicitada) > v_stock_total THEN
            RETURN jsonb_build_object(
                'valido', false, 
                'mensaje', 'No hay stock suficiente para ' || v_recurso_nombre || '. Disponibles: ' || (v_stock_total - v_cantidad_reservada)
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('valido', true, 'mensaje', 'Disponible');
END;
$$ LANGUAGE plpgsql;