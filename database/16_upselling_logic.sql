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
    v_recurso RECORD;
    v_precio_hora NUMERIC;
    v_categoria_id INTEGER;
    v_item_cantidad INTEGER;
    v_item_horas INTEGER;
    
    -- Variables para Upselling
    v_horas_minimas INTEGER;
    v_cantidad_minima INTEGER;
    v_max_horas_carrito INTEGER := 0;
    v_cantidad_total_carrito INTEGER := 0;
BEGIN
    -- 1. Calcular Total Bruto (Suma de items) CON PRECIO DB REAL
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Obtener precio real y categoría desde DB
        SELECT precio_por_hora, categoria_id 
        INTO v_precio_hora, v_categoria_id
        FROM RECURSOS 
        WHERE id = (v_item->>'id')::INTEGER;

        IF FOUND THEN
            v_item_cantidad := (v_item->>'cantidad')::INTEGER;
            v_item_horas := (v_item->>'horas')::INTEGER;
            v_total_bruto := v_total_bruto + (v_item_cantidad * v_item_horas * v_precio_hora);
            
            -- Para upselling
            IF v_item_horas > v_max_horas_carrito THEN v_max_horas_carrito := v_item_horas; END IF;
            v_cantidad_total_carrito := v_cantidad_total_carrito + v_item_cantidad;
        END IF;
    END LOOP;

    -- 2. Iterar Promociones
    FOR v_promo IN SELECT * FROM PROMOCIONES WHERE activo = TRUE LOOP
        v_aplicar := FALSE;

        -- Lógica de aplicación básica
        IF v_promo.es_automatico IS TRUE THEN
             v_aplicar := TRUE;
        ELSIF v_promo.es_automatico IS FALSE AND p_cupon IS NOT NULL AND v_promo.codigo_cupon IS NOT NULL AND UPPER(v_promo.codigo_cupon) = UPPER(p_cupon) THEN
             v_aplicar := TRUE;
        END IF;

        IF v_aplicar THEN
            v_desc_monto := 0;
            
            IF v_promo.tipo = 'regla_tiempo' THEN
                v_monto_base_items := 0;
                v_horas_minimas := (v_promo.condicion->>'minHoras')::INTEGER;
                
                FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                     SELECT precio_por_hora INTO v_precio_hora FROM RECURSOS WHERE id = (v_item->>'id')::INTEGER;
                     IF FOUND THEN 
                        IF (v_item->>'horas')::INTEGER >= v_horas_minimas THEN
                             v_monto_base_items := v_monto_base_items + (v_precio_hora * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                        END IF;
                     END IF;
                END LOOP;
                IF v_monto_base_items > 0 THEN
                    v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                ELSE
                    -- UPSELLING for Time Rules
                    -- Si no se aplicó descuento (monto 0), verificar si estamos cerca
                    IF v_promo.es_automatico IS TRUE THEN
                        IF v_max_horas_carrito < v_horas_minimas AND v_max_horas_carrito >= (v_horas_minimas - 2) THEN
                             v_alertas := array_append(v_alertas, '¡Alquila por ' || v_horas_minimas || ' horas o más y obtén ' || v_promo.nombre || '!');
                        END IF;
                    END IF;
                END IF;

            ELSIF v_promo.tipo = 'regla_cantidad' THEN
                v_cantidad_total := 0;
                v_monto_base_items := 0;
                v_cantidad_minima := (v_promo.condicion->>'minCantidad')::INTEGER;

                FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                    SELECT precio_por_hora, categoria_id INTO v_precio_hora, v_categoria_id FROM RECURSOS WHERE id = (v_item->>'id')::INTEGER;
                    
                    IF FOUND THEN
                        IF (v_promo.condicion->>'categoria') IS NULL OR (v_promo.condicion->>'categoria') = '' THEN
                            v_cantidad_total := v_cantidad_total + (v_item->>'cantidad')::INTEGER;
                            v_monto_base_items := v_monto_base_items + (v_precio_hora * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                        ELSE
                             -- Si hay filtro de categoría, verificar
                             -- (Simplificado para este ejemplo, asumimos global o mejora futura)
                             v_cantidad_total := v_cantidad_total + (v_item->>'cantidad')::INTEGER;
                             v_monto_base_items := v_monto_base_items + (v_precio_hora * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                        END IF;
                    END IF;
                END LOOP;

                IF v_cantidad_total >= v_cantidad_minima THEN
                    IF (v_promo.beneficio->>'tipo') = 'fijo' THEN
                         v_desc_monto := (v_promo.beneficio->>'valor')::NUMERIC;
                    ELSE
                         v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                    END IF;
                ELSE
                    -- UPSELLING for Quantity Rules
                    IF v_promo.es_automatico IS TRUE THEN
                        IF v_cantidad_total_carrito < v_cantidad_minima AND v_cantidad_total_carrito >= (v_cantidad_minima - 1) THEN
                             v_alertas := array_append(v_alertas, '¡Alquila ' || v_cantidad_minima || ' items y recibe ' || v_promo.nombre || '!');
                        END IF;
                    END IF;
                END IF;
            END IF;

            IF v_desc_monto > 0 THEN
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;
        END IF; 
    END LOOP;

    -- 3. Calcular Finales
    v_total_servicio := (v_total_bruto - v_descuento_total); 
    IF v_total_servicio < 0 THEN v_total_servicio := 0; END IF;

    -- Calculamos IGV sobre el servicio con descuento (O sobre base? User example: 20 base -> 3.60 IGV. Discount 0 in example)
    -- Asumimos IGV se agrega al valor de venta.
    -- v_total_bruto es la BASE IMPONIBLE (S/ 20)
    -- v_descuento_total se descuenta de la BASE
    
    -- Ajuste: Nuevo flujo
    -- Base: v_total_bruto - v_descuento_total
    -- IGV: 18% de Base
    -- Servicio: Base + IGV
    
    DECLARE
        v_base_imponible NUMERIC;
        v_igv NUMERIC;
    BEGIN
        v_base_imponible := v_total_bruto - v_descuento_total;
        IF v_base_imponible < 0 THEN v_base_imponible := 0; END IF;
        
        v_igv := v_base_imponible * 0.18;
        
        -- Total Servicio (Base + IGV) - Lo que se el usuario percibe como costo del servicio
        v_total_servicio := v_base_imponible + v_igv;

        SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
        -- Garantía sobre la base original (sin descuento?) o con? 
        -- User: "4 soles o sea el 20% más" (sobre 20).
        v_garantia := v_total_bruto * COALESCE(v_config_garantia, 0.20); 
        
        v_total_a_pagar := v_total_servicio + v_garantia;

        RETURN jsonb_build_object(
            'subtotal_base', v_base_imponible, -- Frontend usa esto como "Subtotal Base"
            'igv', v_igv,
            'subtotal', v_total_servicio, -- Frontend usa "subtotal" como "Total Servicio"
            'descuento', v_descuento_total,
            'garantia', v_garantia,
            'total_a_pagar', v_total_a_pagar, -- Mapeado a total en DB.js? No, db.js mapea total_a_pagar?
            -- db.js espera keys especificas? App.jsx usa resultado directo. 
            -- App.jsx usa: subtotal_base, igv, subtotal, garantia, total
            'total', v_total_a_pagar, 
            'total_dolares', ROUND(v_total_a_pagar / 3.8, 2),
            'alertas', v_alertas, 
            'promocionesAplicadas', v_promos_aplicadas
        );
    END;
END;
$$ LANGUAGE plpgsql;