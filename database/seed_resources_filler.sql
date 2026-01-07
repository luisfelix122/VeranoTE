-- SEED RESOURCES FILLER (Target: 24 per Sede)

DO $$
DECLARE
    v_costa_count INT;
    v_rural_count INT;
    v_i INT;
    v_cat_id INT;
BEGIN
    -- =============================================
    -- 1. COSTA FILLER
    -- =============================================
    SELECT count(*) INTO v_costa_count FROM recursos WHERE sede_id = 'costa';
    
    -- Loop only if we have less than 24
    IF v_costa_count < 24 THEN
        FOR v_i IN (v_costa_count + 1)..24 LOOP
            -- Alternate categories: Acuático (1) vs Playa (4)
            IF v_i % 2 = 0 THEN 
                -- Acuático logic (by name to be safe)
                SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Acuático' LIMIT 1;
                INSERT INTO recursos (nombre, descripcion, precio_por_hora, stock_total, categoria_id, sede_id, imagen, activo)
                VALUES (
                    'Equipo Acuático Pro ' || v_i, 
                    'Equipo profesional adicional para deportes acuáticos. Calidad garantizada.', 
                    45.00, 5, v_cat_id, 'costa', 
                    'https://images.unsplash.com/photo-1531722569936-825d3fa9bc43?q=80&w=600&auto=format&fit=crop', 
                    true
                );
            ELSE
                -- Playa logic
                SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Playa' LIMIT 1;
                INSERT INTO recursos (nombre, descripcion, precio_por_hora, stock_total, categoria_id, sede_id, imagen, activo)
                VALUES (
                    'Set de Playa Confort ' || v_i, 
                    'Comodidad para disfrutar del sol y la arena. Incluye accesorios.', 
                    12.00, 15, v_cat_id, 'costa', 
                    'https://images.unsplash.com/photo-1596547608223-96cb3440cc0f?q=80&w=600&auto=format&fit=crop', 
                    true
                );
            END IF;
        END LOOP;
    END IF;

    -- =============================================
    -- 2. RURAL FILLER
    -- =============================================
    SELECT count(*) INTO v_rural_count FROM recursos WHERE sede_id = 'rural';
    
    IF v_rural_count < 24 THEN
        FOR v_i IN (v_rural_count + 1)..24 LOOP
            -- Alternate: Motor (3), Terrestre (2), Camping (5)
            IF v_i % 3 = 0 THEN 
                -- Motor
                SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Motor' LIMIT 1;
                INSERT INTO recursos (nombre, descripcion, precio_por_hora, stock_total, categoria_id, sede_id, imagen, activo)
                VALUES (
                    'Vehículo 4x4 Explorer ' || v_i, 
                    'Potencia y seguridad para terrenos difíciles. Mantenimiento al día.', 
                    110.00, 3, v_cat_id, 'rural', 
                    'https://images.unsplash.com/photo-1552309322-c20e2a229a58?q=80&w=600&auto=format&fit=crop', 
                    true
                );
            ELSIF v_i % 3 = 1 THEN
                -- Terrestre
                SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Terrestre' LIMIT 1;
                INSERT INTO recursos (nombre, descripcion, precio_por_hora, stock_total, categoria_id, sede_id, imagen, activo)
                VALUES (
                    'Equipo Tracking Avanzado ' || v_i, 
                    'Ideal para rutas largas. Ligero y resistente.', 
                    22.00, 10, v_cat_id, 'rural', 
                    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600&auto=format&fit=crop', 
                    true
                );
            ELSE
                -- Camping
                 SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Camping' LIMIT 1;
                 -- Fallback if Camping category missing
                 IF v_cat_id IS NULL THEN SELECT id INTO v_cat_id FROM categorias WHERE nombre = 'Terrestre' LIMIT 1; END IF;
                 
                 INSERT INTO recursos (nombre, descripcion, precio_por_hora, stock_total, categoria_id, sede_id, imagen, activo)
                 VALUES (
                    'Kit Camping Familiar ' || v_i, 
                    'Tienda, sacos y accesorios básicos para acampar.', 
                    55.00, 4, v_cat_id, 'rural', 
                    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600&auto=format&fit=crop', 
                    true
                );
            END IF;
        END LOOP;
    END IF;

END $$;

NOTIFY pgrst, 'reload config';