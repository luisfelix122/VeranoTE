-- SEED EXACT USERS (Clean up extras, strict count)

-- 1. CLEANUP (Remove anyone NOT in the allowed list)
-- This removes the "extra" users like Shakira, Messi, etc.
DELETE FROM public.usuarios
WHERE
    email NOT IN(
        'dueno@verano.com',
        'admin.costa@verano.com',
        'admin.rural@verano.com',
        'vendedor.costa@verano.com',
        'vendedor.rural@verano.com',
        'mecanico.costa@verano.com', -- Keeping 2 mechanics for system health
        'mecanico.rural@verano.com',
        'juan@gmail.com',
        'maria@gmail.com',
        'carlos@hotmail.com',
        'ana.smith@yahoo.com',
        'luisa@daily.com'
    );

-- 2. UPSERT EXACT USERS (With Complete Data)
-- Password '123' will be handled in Auth section.

-- Dueño
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        telefono,
        tipo_documento,
        numero_documento,
        nacionalidad,
        sede_id
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'dueno@verano.com',
        '123',
        'dueno',
        'Dueño General',
        '999000111',
        'DNI',
        '10000001',
        'Peruano',
        NULL
    ) ON CONFLICT (email) DO
UPDATE
SET
    nombre = EXCLUDED.nombre,
    telefono = EXCLUDED.telefono;

-- Admins
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        telefono,
        tipo_documento,
        numero_documento,
        nacionalidad,
        sede_id
    )
VALUES (
        '00000000-0000-0000-0000-000000000002',
        'admin.costa@verano.com',
        '123',
        'admin',
        'Admin Costa',
        '999000222',
        'DNI',
        '20000002',
        'Peruano',
        'costa'
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'admin.rural@verano.com',
        '123',
        'admin',
        'Admin Rural',
        '999000333',
        'DNI',
        '30000003',
        'Peruano',
        'rural'
    ) ON CONFLICT (email) DO
UPDATE
SET
    sede_id = EXCLUDED.sede_id;

-- Vendors
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        telefono,
        tipo_documento,
        numero_documento,
        nacionalidad,
        sede_id,
        turno,
        codigo_empleado
    )
VALUES (
        '00000000-0000-0000-0000-000000000004',
        'vendedor.costa@verano.com',
        '123',
        'vendedor',
        'Vendedor Costa',
        '999000444',
        'DNI',
        '40000004',
        'Peruano',
        'costa',
        'Mañana',
        'VC-01'
    ),
    (
        '00000000-0000-0000-0000-000000000005',
        'vendedor.rural@verano.com',
        '123',
        'vendedor',
        'Vendedor Rural',
        '999000555',
        'DNI',
        '50000005',
        'Peruano',
        'rural',
        'Tarde',
        'VR-01'
    ) ON CONFLICT (email) DO
UPDATE
SET
    sede_id = EXCLUDED.sede_id;

-- Mechanics
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        telefono,
        tipo_documento,
        numero_documento,
        nacionalidad,
        sede_id,
        especialidad
    )
VALUES (
        '00000000-0000-0000-0000-000000000006',
        'mecanico.costa@verano.com',
        '123',
        'mecanico',
        'Mecánico Costa',
        '999000666',
        'DNI',
        '60000006',
        'Peruano',
        'costa',
        'Motores'
    ),
    (
        '00000000-0000-0000-0000-000000000007',
        'mecanico.rural@verano.com',
        '123',
        'mecanico',
        'Mecánico Rural',
        '999000777',
        'DNI',
        '70000007',
        'Peruano',
        'rural',
        'General'
    ) ON CONFLICT (email) DO
UPDATE
SET
    sede_id = EXCLUDED.sede_id;

-- Clients (5)
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        telefono,
        tipo_documento,
        numero_documento,
        nacionalidad,
        licencia_conducir
    )
VALUES (
        '00000000-0000-0000-0000-000000000010',
        'juan@gmail.com',
        '123',
        'cliente',
        'Juan Perez',
        '999111222',
        'DNI',
        '44455566',
        'Peruano',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000011',
        'maria@gmail.com',
        '123',
        'cliente',
        'Maria Garcia',
        '999333444',
        'Pasaporte',
        'AA123456',
        'Mexicana',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000012',
        'carlos@hotmail.com',
        '123',
        'cliente',
        'Carlos Lopez',
        '999555666',
        'DNI',
        '88877766',
        'Argentino',
        FALSE
    ),
    (
        '00000000-0000-0000-0000-000000000013',
        'ana.smith@yahoo.com',
        '123',
        'cliente',
        'Ana Smith',
        '999777888',
        'Pasaporte',
        'USA-999',
        'USA',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000014',
        'luisa@daily.com',
        '123',
        'cliente',
        'Luisa Lane',
        '999888999',
        'RUT',
        'CH-111222',
        'Chilena',
        FALSE
    ) ON CONFLICT (email) DO
UPDATE
SET
    nacionalidad = EXCLUDED.nacionalidad;

-- 3. SYNC AUTH (Force Password '123')
DO $$
DECLARE
    v_user RECORD;
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := crypt('123', gen_salt('bf'));

    FOR v_user IN SELECT * FROM public.usuarios LOOP
        
        -- 1. Insert/Update auth.users
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_user.id::uuid, 
            'authenticated', 
            'authenticated', 
            v_user.email, 
            v_encrypted_pw,
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre', v_user.nombre, 'rol', v_user.rol_id, 'sede', v_user.sede_id),
            now(), now(), '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET 
            encrypted_password = v_encrypted_pw, 
            raw_user_meta_data = EXCLUDED.raw_user_meta_data;

        -- 2. Insert Identity (Correctly handled)
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user.id::uuid AND provider = 'email') THEN
             INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
             VALUES (gen_random_uuid(), v_user.id::uuid, jsonb_build_object('sub', v_user.id, 'email', v_user.email), 'email', v_user.id, now(), now(), now());
        END IF;

    END LOOP;
END $$;

NOTIFY pgrst, 'reload config';