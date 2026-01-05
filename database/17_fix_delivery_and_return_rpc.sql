-- Migración para corregir los RPC de entrega y devolución de alquileres
-- Añade soporte para el parámetro p_vendedor_id y seguimiento de auditoría

-- 1. Asegurar que existan las columnas de auditoría en ALQUILERES
ALTER TABLE ALQUILERES
ADD COLUMN IF NOT EXISTS entregado_por TEXT REFERENCES USUARIOS (id),
ADD COLUMN IF NOT EXISTS recibido_por TEXT REFERENCES USUARIOS (id);

-- 2. Eliminar firmas antiguas para evitar conflictos
DROP FUNCTION IF EXISTS entregar_alquiler_robusto (TEXT);

DROP FUNCTION IF EXISTS entregar_alquiler_robusto (BIGINT, UUID);

DROP FUNCTION IF EXISTS registrar_devolucion_robusta (TEXT);

DROP FUNCTION IF EXISTS registrar_devolucion_robusta (BIGINT, UUID);

DROP FUNCTION IF EXISTS registrar_devolucion_robusta (TEXT, TEXT);

-- 3. Actualizar entregar_alquiler_robusto
CREATE OR REPLACE FUNCTION entregar_alquiler_robusto(
    p_alquiler_id TEXT,
    p_vendedor_id TEXT DEFAULT NULL
) 
RETURNS JSONB AS $$
DECLARE 
    v_alquiler RECORD;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alquiler no encontrado');
    END IF;

    IF v_alquiler.saldo_pendiente > 0.05 THEN 
        RETURN jsonb_build_object('success', false, 'error', 'No se puede entregar: El cliente tiene un saldo pendiente de S/ ' || v_alquiler.saldo_pendiente); 
    END IF;
    
    -- Actualizar estado y quién entrega
    UPDATE ALQUILERES 
    SET estado_id = 'en_uso', 
        entregado_por = COALESCE(p_vendedor_id, v_alquiler.vendedor_id),
        updated_at = NOW() 
    WHERE id = p_alquiler_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar registrar_devolucion_robusta
CREATE OR REPLACE FUNCTION registrar_devolucion_robusta(
    p_alquiler_id TEXT,
    p_vendedor_id TEXT DEFAULT NULL
) 
RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
    v_detalle RECORD;
    v_fecha_devolucion TIMESTAMP WITH TIME ZONE := NOW();
    v_penalizacion_total NUMERIC := 0;
    v_config_gracia INTEGER;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    IF NOT FOUND THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Alquiler no encontrado'); 
    END IF;
    
    -- Solo se puede devolver algo que está 'en_uso' o 'confirmado'
    IF v_alquiler.estado_id NOT IN ('en_uso', 'confirmado') THEN
        RETURN jsonb_build_object('success', false, 'error', 'El alquiler no está en un estado que permita devolución (Estado actual: ' || v_alquiler.estado_id || ')');
    END IF;

    SELECT COALESCE(valor::INTEGER, 15) INTO v_config_gracia FROM CONFIGURACION WHERE clave = 'TIEMPO_GRACIA_MINUTOS';

    -- Calcular penalizaciones si hay demora
    FOR v_detalle IN SELECT * FROM ALQUILER_DETALLES WHERE alquiler_id = p_alquiler_id LOOP
        IF v_fecha_devolucion > (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL) THEN
            -- Más de X minutos de gracia?
            IF (EXTRACT(EPOCH FROM (v_fecha_devolucion - (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL))) / 60) > v_config_gracia THEN
                -- Cobrar por hora extra (mínimo 1 hora de penalización)
                v_penalizacion_total := v_penalizacion_total + (CEIL((EXTRACT(EPOCH FROM (v_fecha_devolucion - (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL))) / 60) / 60.0) * v_detalle.precio_unitario * 2 * v_detalle.cantidad);
            END IF;
        END IF;
    END LOOP;

    -- Actualizar Alquiler
    UPDATE ALQUILERES 
    SET fecha_devolucion_real = v_fecha_devolucion, 
        penalizacion = v_penalizacion_total, 
        total_final = total_final + v_penalizacion_total, 
        estado_id = 'limpieza', 
        recibido_por = COALESCE(p_vendedor_id, v_vendedor_id), -- p_vendedor_id es quien recibe
        updated_at = NOW() 
    WHERE id = p_alquiler_id;
    
    RETURN jsonb_build_object('success', true, 'penalizacion', v_penalizacion_total, 'nuevo_total', (v_alquiler.total_final + v_penalizacion_total));
END;
$$ LANGUAGE plpgsql;

-- 5. Dar permisos
GRANT
EXECUTE ON FUNCTION entregar_alquiler_robusto TO anon,
authenticated,
service_role;

GRANT
EXECUTE ON FUNCTION registrar_devolucion_robusta TO anon,
authenticated,
service_role;