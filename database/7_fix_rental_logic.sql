-- 7_fix_rental_logic.sql
-- Fix: Stop decrementing physical stock on rental creation.
-- Use dynamic View to calculate availability.

-- 1. Drop existing view to avoid "cannot drop columns" error on Replace
DROP VIEW IF EXISTS v_recursos_disponibles;

-- 2. Create View v_recursos_disponibles
CREATE OR REPLACE VIEW v_recursos_disponibles AS
SELECT
    r.id,
    r.sede_id,
    r.nombre,
    r.categoria_id,
    r.precio_por_hora,
    r.stock_total,
    r.imagen,
    r.descripcion,
    r.guia_seguridad,
    r.activo,
    c.nombre as categoria_nombre,
    (
        r.stock_total - (
            SELECT COALESCE(SUM(d.cantidad), 0)
            FROM
                ALQUILER_DETALLES d
                JOIN ALQUILERES a ON a.id = d.alquiler_id
            WHERE
                d.recurso_id = r.id
                AND a.estado_id IN (
                    'confirmado',
                    'en_uso',
                    'listo_para_entrega',
                    'pendiente'
                )
                AND a.fecha_fin_estimada > NOW()
                AND a.fecha_inicio < (NOW() + interval '1 hour')
        )
    ) as stock_disponible
FROM RECURSOS r
    JOIN CATEGORIAS c ON r.categoria_id = c.id
WHERE
    r.activo = TRUE;

-- 3. Update crear_reserva_robusta (REMOVE Stock Update)
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT,
    p_metodo_pago_id TEXT,
    p_tipo_comprobante TEXT,
    p_datos_factura JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_disponibilidad JSONB;
    v_calculo_descuento JSONB;
    v_alquiler_id TEXT;
    v_item JSONB;
    v_total_bruto NUMERIC := 0;
    v_descuento NUMERIC := 0;
    v_total_servicio NUMERIC;
    v_garantia NUMERIC;
    v_total_final NUMERIC;
    v_monto_pagado NUMERIC;
    v_saldo_pendiente NUMERIC;
    v_config_garantia NUMERIC;
    v_config_adelanto NUMERIC;
    v_subtotal_item NUMERIC;
    v_max_horas INTEGER := 0;
    v_fecha_fin_estimada TIMESTAMP WITH TIME ZONE;
    
    v_usuario RECORD;
    v_tiene_motor BOOLEAN := FALSE;
BEGIN
    BEGIN
        -- 1. Validate User
        SELECT * INTO v_usuario FROM USUARIOS WHERE id = p_cliente_id;
        IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado'); END IF;

        -- 2. Validate Items & License
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            IF (v_item->>'categoria') IS NOT NULL AND (v_item->>'categoria') = 'Motor' THEN
                v_tiene_motor := TRUE;
            END IF;
            IF (v_item->>'id') IS NULL OR (v_item->>'cantidad') IS NULL THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Item inválido');
            END IF;
        END LOOP;

        IF v_tiene_motor THEN
            IF v_usuario.licencia_conducir IS NULL OR v_usuario.licencia_conducir IS FALSE THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Se requiere licencia de conducir validada.');
            END IF;
        END IF;

        -- 3. Check Availability
        v_disponibilidad := verificar_disponibilidad_items(p_fecha_inicio, p_items);
        IF (v_disponibilidad->>'valido')::BOOLEAN = false THEN 
            RETURN jsonb_build_object('success', false, 'error', v_disponibilidad->>'mensaje'); 
        END IF;

        -- 4. Calculate Totals
        SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
        SELECT valor::NUMERIC INTO v_config_adelanto FROM CONFIGURACION WHERE clave = 'ADELANTO_PORCENTAJE';
        IF v_config_garantia IS NULL THEN v_config_garantia := 0.20; END IF;
        IF v_config_adelanto IS NULL THEN v_config_adelanto := 0.60; END IF;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            v_subtotal_item := (v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC;
            v_total_bruto := v_total_bruto + v_subtotal_item;
            IF (v_item->>'horas')::INTEGER > v_max_horas THEN v_max_horas := (v_item->>'horas')::INTEGER; END IF;
        END LOOP;

        v_calculo_descuento := calcular_descuento_simulado(p_items, p_fecha_inicio);
        v_descuento := (v_calculo_descuento->>'descuentoTotal')::NUMERIC;
        v_total_servicio := v_total_bruto - v_descuento;
        v_garantia := v_total_servicio * v_config_garantia;
        v_total_final := v_total_servicio + v_garantia;

        IF p_tipo_reserva = 'anticipada' THEN
            v_monto_pagado := v_total_final * v_config_adelanto;
            v_saldo_pendiente := v_total_final - v_monto_pagado;
        ELSE 
            v_monto_pagado := v_total_final;
            v_saldo_pendiente := 0;
        END IF;

        v_fecha_fin_estimada := p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL;

        -- 5. Insert Rental
        INSERT INTO ALQUILERES (
            cliente_id, vendedor_id, sede_id, fecha_inicio, fecha_fin_estimada,
            total_bruto, descuento_promociones, total_servicio, garantia, total_final,
            monto_pagado, saldo_pendiente, tipo_reserva, metodo_pago_id, tipo_comprobante, datos_factura,
            estado_id, contrato_firmado, fecha_firma
        ) VALUES (
            p_cliente_id, p_vendedor_id, p_sede_id, p_fecha_inicio, v_fecha_fin_estimada,
            v_total_bruto, v_descuento, v_total_servicio, v_garantia, v_total_final,
            v_monto_pagado, v_saldo_pendiente, p_tipo_reserva, p_metodo_pago_id, p_tipo_comprobante, p_datos_factura,
            CASE WHEN v_saldo_pendiente = 0 THEN 'confirmado' ELSE 'pendiente' END,
            TRUE, NOW()
        ) RETURNING id INTO v_alquiler_id;

        -- 6. Insert Details (NO STOCK DECREMENT HERE)
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
             INSERT INTO ALQUILER_DETALLES (alquiler_id, recurso_id, cantidad, horas, precio_unitario, subtotal)
             VALUES (
                v_alquiler_id, 
                (v_item->>'id')::INTEGER, 
                (v_item->>'cantidad')::INTEGER, 
                (v_item->>'horas')::INTEGER, 
                (v_item->>'precioPorHora')::NUMERIC,
                ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC)
            );
        END LOOP;
        
        RETURN jsonb_build_object('success', true, 'id', v_alquiler_id, 'total_final', v_total_final);

    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;