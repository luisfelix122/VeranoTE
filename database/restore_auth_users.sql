-- RESTORE AUTH USERS (Sync with seeded Public Users)
-- This allows login with the seeded email and password '123456'.

-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper to insert into auth.users if possible
-- Note: 'auth' schema is usually protected, but the postgres role often has access.
-- We use ON CONFLICT DO NOTHING to avoid errors if they already exist.

INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
VALUES
    -- Dueño
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'dueno@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Dueño General"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Admin Costa
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000002',
        'authenticated',
        'authenticated',
        'admin.costa@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Admin Costa"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Admin Rural
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000003',
        'authenticated',
        'authenticated',
        'admin.rural@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Admin Rural"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Vendedor Costa
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000004',
        'authenticated',
        'authenticated',
        'vendedor.costa@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Vendedor Costa"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Vendedor Rural
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000005',
        'authenticated',
        'authenticated',
        'vendedor.rural@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Vendedor Rural"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Mecanico Costa
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000006',
        'authenticated',
        'authenticated',
        'mecanico.costa@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Mecanico Costa"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Mecanico Rural
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000007',
        'authenticated',
        'authenticated',
        'mecanico.rural@verano.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Mecanico Rural"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Client Juan
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000010',
        'authenticated',
        'authenticated',
        'juan@gmail.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Juan Perez"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    -- Client Maria
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000011',
        'authenticated',
        'authenticated',
        'maria@gmail.com',
        crypt ('123456', gen_salt ('bf')),
        now(),
        NULL,
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre":"Maria Garcia"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (id) DO
UPDATE
SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Grant access to auth users if needed (Usually not needed for login, but good for linking)
INSERT INTO
    auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
VALUES (
        gen_random_uuid (),
        '00000000-0000-0000-0000-000000000011',
        '{"sub":"00000000-0000-0000-0000-000000000011","email":"maria@gmail.com"}',
        'email',
        now(),
        now(),
        now()
    ) ON CONFLICT (user_id, provider) DO NOTHING;

NOTIFY pgrst, 'reload config';