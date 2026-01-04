-- 1. Add codigo_cupon to alquileres table
ALTER TABLE alquileres
ADD COLUMN IF NOT EXISTS codigo_cupon TEXT NULL;

-- 2. Drop conflicting function signatures (to be safe)
DROP FUNCTION IF EXISTS crear_reserva_robusta (
    text,
    text,
    text,
    jsonb,
    timestamp
    with
        time zone,
        text,
        text,
        text,
        jsonb
);

-- 3. Recreate crear_reserva_robusta with p_cupon and using calcular_descuento_simulado
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT,
    p_metodo_pago_id TEXT,
    p_tipo_comprobante TEXT,
    p_datos_factura JSONB,
    p_cupon TEXT DEFAULT NULL -- Nuevo parámetro
)
RETURNS JSONB AS $$
DECLARE
    v_disponibilidad JSONB;
    v_calculo JSONB;
    v_alquiler_id TEXT;
    v_item JSONB;
    v_total_bruto NUMERIC;
    v_descuento NUMERIC;
    v_total_servicio NUMERIC;
    v_garantia NUMERIC;
    v_total_final NUMERIC;
    v_monto_pagado NUMERIC;
    v_saldo_pendiente NUMERIC;
    v_config_adelanto NUMERIC;
    v_config_igv NUMERIC;
    v_igv NUMERIC;
    v_fecha_fin_estimada TIMESTAMP WITH TIME ZONE;
    v_max_horas INTEGER := 0;
    v_precio_real NUMERIC;
    v_datos_factura_final JSONB;
BEGIN
    -- 1. Verificar Disponibilidad
    v_disponibilidad := verificar_disponibilidad_items(p_fecha_inicio, p_items);
    IF (v_disponibilidad->>'valido')::BOOLEAN = false THEN 
        RETURN jsonb_build_object('success', false, 'error', v_disponibilidad->>'mensaje'); 
    END IF;

    -- 2. Calcular Totales usando la lógica centralizada (incluye cupones y precios DB)
    v_calculo := calcular_descuento_simulado(p_items, p_fecha_inicio, p_tipo_reserva, p_cliente_id, p_cupon);
    
    v_total_bruto := (v_calculo->>'total_bruto')::NUMERIC;
    v_descuento := (v_calculo->>'descuento')::NUMERIC;
    v_total_servicio := (v_calculo->>'total_servicio')::NUMERIC;
    v_garantia := (v_calculo->>'garantia')::NUMERIC;
    v_total_final := (v_calculo->>'total_a_pagar')::NUMERIC;

    -- 3. Calcular Pagos y Fechas
    SELECT COALESCE(valor::NUMERIC, 0.60) INTO v_config_adelanto FROM CONFIGURACION WHERE clave = 'ADELANTO_RESERVA_ANTICIPADA';
    SELECT COALESCE(valor::NUMERIC, 0.18) INTO v_config_igv FROM CONFIGURACION WHERE clave = 'IGV';

    -- Calcular max horas
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'horas')::INTEGER > v_max_horas THEN
            v_max_horas := (v_item->>'horas')::INTEGER;
        END IF;
    END LOOP;
    v_fecha_fin_estimada := p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL;

    -- Calcular Pagos
    v_monto_pagado := CASE WHEN p_tipo_reserva = 'anticipada' THEN v_total_final * v_config_adelanto ELSE v_total_final END;
    v_saldo_pendiente := v_total_final - v_monto_pagado;

    -- Calcular IGV para factura
    v_igv := v_total_servicio - (v_total_servicio / (1 + v_config_igv));
    v_datos_factura_final := p_datos_factura || jsonb_build_object('igv_calculado', v_igv, 'impuesto_aplicado', v_config_igv);

    -- 4. Insertar Alquiler
    INSERT INTO ALQUILERES (
        cliente_id, vendedor_id, sede_id, fecha_inicio, fecha_fin_estimada, 
        total_bruto, descuento_promociones, total_servicio, garantia, total_final, 
        monto_pagado, saldo_pendiente, tipo_reserva, metodo_pago_id, 
        tipo_comprobante, datos_factura, estado_id, contrato_firmado, fecha_firma, codigo_cupon
    )
    VALUES (
        p_cliente_id, p_vendedor_id, p_sede_id, p_fecha_inicio, v_fecha_fin_estimada, 
        v_total_bruto, v_descuento, v_total_servicio, v_garantia, v_total_final, 
        v_monto_pagado, v_saldo_pendiente, p_tipo_reserva, p_metodo_pago_id, 
        p_tipo_comprobante, v_datos_factura_final, 
        CASE WHEN v_saldo_pendiente <= 0.05 THEN 'confirmado' ELSE 'pendiente' END, 
        TRUE, NOW(), p_cupon
    ) RETURNING id INTO v_alquiler_id;

    -- 5. Insertar Detalles
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT precio_por_hora INTO v_precio_real FROM RECURSOS WHERE id = (v_item->>'id')::INTEGER;
        
        INSERT INTO ALQUILER_DETALLES (alquiler_id, recurso_id, cantidad, horas, precio_unitario, subtotal)
        VALUES (
            v_alquiler_id, 
            (v_item->>'id')::INTEGER, 
            (v_item->>'cantidad')::INTEGER, 
            (v_item->>'horas')::INTEGER, 
            v_precio_real, 
            ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * v_precio_real)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_alquiler_id, 'total_final', v_total_final);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions again just in case
GRANT
EXECUTE ON FUNCTION crear_reserva_robusta TO anon,
authenticated,
service_role;