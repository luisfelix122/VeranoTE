-- FIX RURAL CATEGORIES (Drop Unique Name, Duplicate and Link)

-- 1. Alter Table Constraints
DO $$
BEGIN
    -- Drop the strict name constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorias_nombre_key') THEN
        ALTER TABLE categorias DROP CONSTRAINT categorias_nombre_key;
    END IF;
    
    -- Add composite constraint (Optional, good practice)
    -- ALTER TABLE categorias ADD CONSTRAINT categorias_nombre_sede_key UNIQUE (nombre, sede_id);
END $$;

-- 2. Duplicate Categories for Rural
DO $$
DECLARE
    v_cat RECORD;
    v_new_cat_id INT;
BEGIN
    -- Loop through existing distinct category names currently linked to Costa
    FOR v_cat IN SELECT DISTINCT id, nombre FROM categorias WHERE sede_id = 'costa' LOOP
        
        -- Check if it already exists for Rural to avoid duplicates on re-run
        IF NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = v_cat.nombre AND sede_id = 'rural') THEN
            
            INSERT INTO categorias (nombre, sede_id, activo)
            VALUES (v_cat.nombre, 'rural', true)
            RETURNING id INTO v_new_cat_id;

            -- 3. Update Rural resources to use this new category ID
            -- Update resources in 'rural' that currently use the COSTA ID of this category
            -- (This assumes the resources currently point to v_cat.id)
            UPDATE recursos 
            SET categoria_id = v_new_cat_id 
            WHERE sede_id = 'rural' 
              AND categoria_id = v_cat.id;
              
        END IF;

    END LOOP;
END $$;

NOTIFY pgrst, 'reload config';