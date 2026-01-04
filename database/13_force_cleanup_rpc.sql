-- 1. ELIMINACIÓN AGRESIVA DE VARIANTES
-- Variante detectada de 3 argumentos
DROP FUNCTION IF EXISTS calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text
);

-- Variante de 5 argumentos (TEXT para cliente_id)
DROP FUNCTION IF EXISTS calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text,
        text,
        text
);

-- Posible variante antigua (UUID para cliente_id)
DROP FUNCTION IF EXISTS calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text,
        uuid,
        text
);

-- 2. RECREACIÓN ÚNICA Y AUTORITATIVA
CREATE OR REPLACE FUNCTION calcular_descuento_simulado(
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT DEFAULT 'inmediata',
    p_cliente_id TEXT DEFAULT NULL,
    p_cupon TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_promo RECORD;
    v_item JSONB;
    v_descuento_total NUMERIC := 0;
    v_alertas TEXT[] := ARRAY[]::TEXT[];
    v_promos_aplicadas JSONB[] := ARRAY[]::JSONB[];
    v_monto_base_items NUMERIC;
    v_cantidad_total INTEGER;
    v_desc_monto NUMERIC;
    v_total_bruto NUMERIC := 0;
    v_total_servicio NUMERIC := 0;
    v_total_a_pagar NUMERIC := 0;
    v_garantia NUMERIC := 0;
    v_aplicar BOOLEAN;
    v_config_garantia NUMERIC;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_total_bruto := v_total_bruto + ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC);
    END LOOP;

    FOR v_promo IN SELECT * FROM PROMOCIONES WHERE activo = TRUE LOOP
        v_aplicar := FALSE;
        IF v_promo.es_automatico IS TRUE THEN
             v_aplicar := TRUE;
        ELSIF v_promo.es_automatico IS FALSE AND p_cupon IS NOT NULL AND v_promo.codigo_cupon IS NOT NULL AND UPPER(v_promo.codigo_cupon) = UPPER(p_cupon) THEN
             v_aplicar := TRUE;
        END IF;

        IF v_aplicar THEN
            v_desc_monto := 0;
            IF v_promo.tipo = 'regla_tiempo' THEN
                v_monto_base_items := 0;
                FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                    IF (v_item->>'horas')::INTEGER >= (v_promo.condicion->>'minHoras')::INTEGER THEN
                         v_monto_base_items := v_monto_base_items + ((v_item->>'precioPorHora')::NUMERIC * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                    END IF;
                END LOOP;
                IF v_monto_base_items > 0 THEN
                    v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                END IF;
            ELSIF v_promo.tipo = 'regla_cantidad' THEN
                v_cantidad_total := 0;
                v_monto_base_items := 0;
                FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                    IF (v_promo.condicion->>'categoria') IS NULL OR (v_promo.condicion->>'categoria') = '' OR (v_promo.condicion->>'categoria') = (v_item->>'categoria') THEN
                        v_cantidad_total := v_cantidad_total + (v_item->>'cantidad')::INTEGER;
                        v_monto_base_items := v_monto_base_items + ((v_item->>'precioPorHora')::NUMERIC * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                    END IF;
                END LOOP;
                IF v_cantidad_total >= (v_promo.condicion->>'minCantidad')::INTEGER THEN
                    v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                END IF;
            END IF;

            IF v_desc_monto > 0 THEN
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;
        END IF;
    END LOOP;

    v_total_servicio := v_total_bruto - v_descuento_total;
    IF v_total_servicio < 0 THEN v_total_servicio := 0; END IF;

    SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
    v_garantia := v_total_servicio * COALESCE(v_config_garantia, 0.20);
    v_total_a_pagar := v_total_servicio + v_garantia;

    RETURN jsonb_build_object(
        'total_bruto', v_total_bruto,
        'total_servicio', v_total_servicio,
        'descuento', v_descuento_total,
        'garantia', v_garantia,
        'total_a_pagar', v_total_a_pagar,
        'alertas', v_alertas, 
        'promocionesAplicadas', v_promos_aplicadas
    );
END;
$$ LANGUAGE plpgsql;

GRANT
EXECUTE ON FUNCTION calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text,
        text,
        text
) TO anon;

GRANT
EXECUTE ON FUNCTION calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text,
        text,
        text
) TO authenticated;

GRANT
EXECUTE ON FUNCTION calcular_descuento_simulado (
    jsonb,
    timestamp
    with
        time zone,
        text,
        text,
        text
) TO service_role;