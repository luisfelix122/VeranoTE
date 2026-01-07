-- RESTORE AUTH v2 (Password '123', More Users, Restore Views)

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. RESTORE VIEWS (From backup analysis)

-- View: v_recursos_disponibles
DROP VIEW IF EXISTS v_recursos_disponibles CASCADE;

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
                    'en_curso',
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

-- View: v_kpi_diario
CREATE OR REPLACE VIEW v_kpi_diario AS
SELECT 
    CURRENT_DATE as fecha,
    COUNT(id) as total_alquileres,
    SUM(total_final) as ingresos_proyectados,
    SUM(monto_pagado) as ingresos_reales,
    SUM(total_final - monto_pagado) as deuda_pendiente
FROM ALQUILERES
WHERE created_at::DATE = CURRENT_DATE;

-- View: v_ranking_clientes
CREATE OR REPLACE VIEW v_ranking_clientes AS
SELECT
    u.id,
    u.nombre,
    COUNT(a.id) as frecuencia,
    SUM(a.total_final) as valor_monetario,
    MAX(a.fecha_inicio) as ultima_visita
FROM USUARIOS u
    JOIN ALQUILERES a ON u.id = a.cliente_id
GROUP BY
    u.id,
    u.nombre
ORDER BY valor_monetario DESC;

-- 2.5 ADD EXTRA USERS (To "Fill" the DB)
-- Generates 15 extra users to make the DB look populated.

INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        nacionalidad,
        numero_documento,
        sede_id
    )
VALUES
    -- New Admins
    (
        uuid_generate_v4 (),
        'admin3@verano.com',
        '123',
        'admin',
        'Admin Suplente',
        'Peruano',
        '11122233',
        'costa'
    ),
    -- New Vendors
    (
        uuid_generate_v4 (),
        'vendedor3@verano.com',
        '123',
        'vendedor',
        'Vendedor Apoyo',
        'Peruano',
        '33344455',
        'costa'
    ),
    (
        uuid_generate_v4 (),
        'vendedor4@verano.com',
        '123',
        'vendedor',
        'Vendedor FinDeSemana',
        'Peruano',
        '55566677',
        'rural'
    ),
    -- New Mechanics
    (
        uuid_generate_v4 (),
        'mecanico3@verano.com',
        '123',
        'mecanico',
        'Mecánico Junior',
        'Peruano',
        '77788899',
        'costa'
    ),
    -- New Clients (Turistas)
    (
        uuid_generate_v4 (),
        'turista1@gmail.com',
        '123',
        'cliente',
        'Laura Bozzo',
        'Peruana',
        'T-001',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista2@gmail.com',
        '123',
        'cliente',
        'Brad Pitt',
        'USA',
        'T-002',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista3@gmail.com',
        '123',
        'cliente',
        'Lionel Messi',
        'Argentina',
        'T-003',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista4@gmail.com',
        '123',
        'cliente',
        'Shakira',
        'Colombia',
        'T-004',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista5@gmail.com',
        '123',
        'cliente',
        'Cristiano Ronaldo',
        'Portugal',
        'T-005',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista6@gmail.com',
        '123',
        'cliente',
        'Taylor Swift',
        'USA',
        'T-006',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista7@gmail.com',
        '123',
        'cliente',
        'Bad Bunny',
        'Puerto Rico',
        'T-007',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista8@gmail.com',
        '123',
        'cliente',
        'Karol G',
        'Colombia',
        'T-008',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista9@gmail.com',
        '123',
        'cliente',
        'Daddy Yankee',
        'Puerto Rico',
        'T-009',
        NULL
    ),
    (
        uuid_generate_v4 (),
        'turista10@gmail.com',
        '123',
        'cliente',
        'Rosalia',
        'España',
        'T-010',
        NULL
    ) ON CONFLICT (email) DO NOTHING;

-- 3. POPULATE AUTH USERS (Password '123', Safe Insert)

DO $$
DECLARE
    v_user_id TEXT;
    v_email TEXT;
    v_nombre TEXT;
    v_rol TEXT;
BEGIN
    -- Loop through public.usuarios and insert into auth.users if missing
    FOR v_user_id, v_email, v_nombre, v_rol IN 
        SELECT id, email, nombre, rol_id FROM public.usuarios
    LOOP
        -- Check if exists in auth.users
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
            INSERT INTO auth.users (
                id, aud, role, email, encrypted_password, email_confirmed_at, 
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
                confirmation_token, recovery_token, email_change_token_new, email_change
            ) VALUES (
                v_user_id::uuid, 
                'authenticated', 
                'authenticated', 
                v_email, 
                crypt('123', gen_salt('bf')), -- Password '123'
                now(),
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('nombre', v_nombre, 'rol', v_rol),
                now(), now(), '', '', '', ''
            );
            
            -- Insert Identity
            INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES (gen_random_uuid(), v_user_id::uuid, jsonb_build_object('sub', v_user_id, 'email', v_email), 'email', now(), now(), now());
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload config';