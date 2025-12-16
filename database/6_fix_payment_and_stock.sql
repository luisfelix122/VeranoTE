-- Fix Payment Boolean Error and Stock Logic
-- 1. Actualizar gestionar_mantenimiento para manejar stock por unidad (restando/sumando) en vez de desactivar recurso completo.
CREATE OR REPLACE FUNCTION gestionar_mantenimiento(
    p_recurso_id INTEGER,
    p_accion TEXT, -- 'iniciar', 'finalizar'
    p_motivo TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_mantenimiento_id INTEGER;
    v_stock_actual INTEGER;
BEGIN
    -- Validar recurso
    SELECT stock_total INTO v_stock_actual FROM RECURSOS WHERE id = p_recurso_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Recurso no encontrado');
    END IF;

    IF p_accion = 'iniciar' THEN
        -- Verificar stock suficiente (Si es por tipo, solo bajamos 1 stock)
        IF v_stock_actual < 1 THEN
             RETURN jsonb_build_object('success', false, 'error', 'No hay stock físico para enviar a mantenimiento.');
        END IF;

        -- Registrar Mantenimiento
        INSERT INTO MANTENIMIENTOS (recurso_id, descripcion, estado, fecha_inicio)
        VALUES (p_recurso_id, p_motivo, 'en_proceso', NOW());

        -- DISMINUIR STOCK (No desactivar recurso completo)
        UPDATE RECURSOS 
        SET stock_total = stock_total - 1 
        WHERE id = p_recurso_id;
        
        RETURN jsonb_build_object('success', true, 'mensaje', 'Recurso enviado a mantenimiento. Stock ajustado.');

    ELSIF p_accion = 'finalizar' THEN
        -- Buscar mantenimiento activo
        SELECT id INTO v_mantenimiento_id FROM MANTENIMIENTOS 
        WHERE recurso_id = p_recurso_id AND estado = 'en_proceso' 
        ORDER BY fecha_inicio ASC LIMIT 1; -- Finalizar el más antiguo

        IF v_mantenimiento_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No hay mantenimientos activos para este recurso.');
        END IF;

        -- Actualizar Mantenimiento
        UPDATE MANTENIMIENTOS SET 
            fecha_fin = NOW(), 
            estado = 'finalizado' 
        WHERE id = v_mantenimiento_id;

        -- AUMENTAR STOCK
        UPDATE RECURSOS SET stock_total = stock_total + 1 WHERE id = p_recurso_id;

        RETURN jsonb_build_object('success', true, 'mensaje', 'Mantenimiento finalizado. Stock restaurado.');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Acción no válida.');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Actualizar crear_reserva_robusta con manejo defensivo de tipos y logs de error
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT, -- 'inmediata', 'anticipada'
    p_metodo_pago_id TEXT,
    p_tipo_comprobante TEXT, -- 'boleta', 'factura'
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
    
    -- Variables para validación de usuario
    v_usuario RECORD;
    v_tiene_motor BOOLEAN := FALSE;
    v_stock_actual INTEGER;
BEGIN
    -- Wrap in block to catch errors
    BEGIN
        -- 1. Validaciones de Negocio (Usuario y Licencia)
        SELECT * INTO v_usuario FROM USUARIOS WHERE id = p_cliente_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
        END IF;

        -- Verificar categoría 'Motor' y STOCK
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            -- Chequeo Motor (Defensive Text Comparison)
            IF (v_item->>'categoria') IS NOT NULL AND (v_item->>'categoria') = 'Motor' THEN
                v_tiene_motor := TRUE;
            END IF;

            -- STOCK CHECK
            IF (v_item->>'id') IS NULL OR (v_item->>'id') = '' THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Item con ID inválido');
            END IF;

            SELECT stock_total INTO v_stock_actual FROM RECURSOS WHERE id = (v_item->>'id')::INTEGER;
            IF NOT FOUND THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Recurso no encontrado: ' || (v_item->>'id'));
            END IF;

            IF v_stock_actual < (v_item->>'cantidad')::INTEGER THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente para el recurso: ' || (v_item->>'id'));
            END IF;
        END LOOP;

        IF v_tiene_motor THEN
            -- Verificación robusta de licencia
            IF v_usuario.licencia_conducir IS NULL OR v_usuario.licencia_conducir IS FALSE THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Se requiere licencia de conducir validada en el perfil.');
            END IF;
        END IF;

        -- 2. Calcular Totales (Replicar lógica de servidor)
        -- Obtener Configuración
        SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
        SELECT valor::NUMERIC INTO v_config_adelanto FROM CONFIGURACION WHERE clave = 'ADELANTO_PORCENTAJE';
        
        IF v_config_garantia IS NULL THEN v_config_garantia := 0.20; END IF;
        IF v_config_adelanto IS NULL THEN v_config_adelanto := 0.60; END IF;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            v_subtotal_item := (v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC;
            v_total_bruto := v_total_bruto + v_subtotal_item;
            
            -- Calcular max horas para fecha fin
            IF (v_item->>'horas')::INTEGER > v_max_horas THEN
                v_max_horas := (v_item->>'horas')::INTEGER;
            END IF;
        END LOOP;

        -- 3. Calcular Descuentos
        v_descuento := 0; 
        
        -- 4. Totales Finales
        v_total_servicio := v_total_bruto - v_descuento;
        v_garantia := v_total_servicio * v_config_garantia;
        v_total_final := v_total_servicio + v_garantia;

        -- 5. Pagos (Adelanto vs Total)
        IF p_tipo_reserva = 'anticipada' THEN
            v_monto_pagado := v_total_final * v_config_adelanto;
            v_saldo_pendiente := v_total_final - v_monto_pagado;
        ELSE -- inmediata
            v_monto_pagado := v_total_final;
            v_saldo_pendiente := 0;
        END IF;

        -- 6. Fechas
        v_fecha_fin_estimada := p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL;

        -- 7. Insertar Alquiler
        INSERT INTO ALQUILERES (
            cliente_id, vendedor_id, sede_id, 
            fecha_inicio, fecha_fin_estimada,
            total_bruto, descuento_promociones, total_servicio, garantia, total_final, monto_pagado, saldo_pendiente,
            tipo_reserva, metodo_pago_id, tipo_comprobante, datos_factura,
            estado_id, contrato_firmado, fecha_firma
        ) VALUES (
            p_cliente_id, p_vendedor_id, p_sede_id,
            p_fecha_inicio, v_fecha_fin_estimada,
            v_total_bruto, v_descuento, v_total_servicio, v_garantia, v_total_final, v_monto_pagado, v_saldo_pendiente,
            p_tipo_reserva, p_metodo_pago_id, p_tipo_comprobante, p_datos_factura,
            CASE WHEN v_saldo_pendiente = 0 THEN 'confirmado' ELSE 'pendiente' END,
            TRUE, NOW()
        ) RETURNING id INTO v_alquiler_id;

        -- 8. Insertar Detalles y DECREMENTAR STOCK
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO ALQUILER_DETALLES (
                alquiler_id, recurso_id, cantidad, horas, precio_unitario, subtotal
            ) VALUES (
                v_alquiler_id, 
                (v_item->>'id')::INTEGER, 
                (v_item->>'cantidad')::INTEGER, 
                (v_item->>'horas')::INTEGER, 
                (v_item->>'precioPorHora')::NUMERIC,
                ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC)
            );

            -- UPDATE STOCK
            UPDATE RECURSOS 
            SET stock_total = stock_total - (v_item->>'cantidad')::INTEGER
            WHERE id = (v_item->>'id')::INTEGER;
        END LOOP;

        RETURN jsonb_build_object('success', true, 'id', v_alquiler_id, 'total_final', v_total_final);

    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')');
    END;
END;
$$ LANGUAGE plpgsql;