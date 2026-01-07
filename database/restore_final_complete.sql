-- RESTORE FINAL COMPLETE (All Resources, Fix Auth, Views)

-- 1. SETUP & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RESTORE VIEWS
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

CREATE OR REPLACE VIEW v_kpi_diario AS
SELECT 
    CURRENT_DATE as fecha,
    COUNT(id) as total_alquileres,
    SUM(total_final) as ingresos_proyectados,
    SUM(monto_pagado) as ingresos_reales,
    SUM(total_final - monto_pagado) as deuda_pendiente
FROM ALQUILERES
WHERE created_at::DATE = CURRENT_DATE;

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

-- 3. INSERT EXTRA USERS (If not exist)
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
VALUES (
        uuid_generate_v4 (),
        'admin3@verano.com',
        '123',
        'admin',
        'Admin Suplente',
        'Peruano',
        '11122233',
        'costa'
    ),
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

-- 4. INSERT ALL RESOURCES (From Backup)
-- Using subqueries for IDs safely

-- COSTA (Acuatico=1, Playa=4)
INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Moto Acuática Yamaha', 'Velocidad y adrenalina en el mar.', 150.00, 5, id, 'costa', 'https://images.unsplash.com/photo-1570519391036-6e4266396e6d?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Acuático'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Moto Acuática Yamaha'
            AND sede_id = 'costa'
    );

INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Tabla de Surf Pro', 'Para olas grandes y profesionales.', 30.00, 10, id, 'costa', 'https://images.unsplash.com/photo-1531722569936-825d3fa9bc43?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Acuático'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Tabla de Surf Pro'
            AND sede_id = 'costa'
    );

INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Sombrilla Familiar', 'Protección UV para toda la familia.', 15.00, 20, id, 'costa', 'https://images.unsplash.com/photo-1596547608223-96cb3440cc0f?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Playa'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Sombrilla Familiar'
            AND sede_id = 'costa'
    );

INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Silla de Playa', 'Comodidad frente al mar.', 10.00, 30, id, 'costa', 'https://images.unsplash.com/photo-1533230408806-3883e20067ea?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Playa'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Silla de Playa'
            AND sede_id = 'costa'
    );

-- RURAL (Motor=3, Terrestre=2)
INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Cuatrimoto 4x4', 'Explora dunas y terrenos difíciles.', 120.00, 8, id, 'rural', 'https://images.unsplash.com/photo-1552309322-c20e2a229a58?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Motor'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Cuatrimoto 4x4'
            AND sede_id = 'rural'
    );

INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Bicicleta Montañera', 'Para rutas de senderismo.', 25.00, 15, id, 'rural', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Terrestre'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Bicicleta Montañera'
            AND sede_id = 'rural'
    );

INSERT INTO
    recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen
    )
SELECT 'Casco de Seguridad', 'Obligatorio para rutas.', 5.00, 50, id, 'rural', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=600&auto=format&fit=crop'
FROM categorias
WHERE
    nombre = 'Terrestre'
    AND NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Casco de Seguridad'
            AND sede_id = 'rural'
    );

-- 5. SYNC AUTH USERS (Password '123')
DO $$
DECLARE
    v_user_id TEXT;
    v_email TEXT;
    v_nombre TEXT;
    v_rol TEXT;
BEGIN
    FOR v_user_id, v_email, v_nombre, v_rol IN 
        SELECT id, email, nombre, rol_id FROM public.usuarios
    LOOP
        -- Check if exists in auth.users by EMAIL
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
                crypt('123', gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('nombre', v_nombre, 'rol', v_rol),
                now(), now(), '', '', '', ''
            );
        END IF;

        -- Check Identity independently to avoid ON CONFLICT errors
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id::uuid AND provider = 'email') THEN
             INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
             VALUES (gen_random_uuid(), v_user_id::uuid, jsonb_build_object('sub', v_user_id, 'email', v_email), 'email', v_user_id, now(), now(), now());
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload config';