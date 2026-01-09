-- =============================================
-- SCRIPT DE DATOS SEMILLA NORMALIZADOS (3NF)
-- Autor: Antigravity
-- Fecha: 2026-01-08
-- Descripción: Inserta datos de prueba compatibles con el nuevo esquema normalizado.
-- =============================================

-- 1. CATEGORIAS DE RECURSOS
INSERT INTO
    public.categorias (id, nombre, descripcion)
VALUES (
        1,
        'Acuático',
        'Equipos para deportes y actividades en el agua'
    ),
    (
        2,
        'Terrestre',
        'Bicicletas y equipos de ruta'
    ),
    (
        3,
        'Motor',
        'Vehículos motorizados todo terreno'
    ),
    (
        4,
        'Playa',
        'Comodidad y relajación en arena'
    ) ON CONFLICT (nombre) DO
UPDATE
SET
    descripcion = EXCLUDED.descripcion;

-- 2. USUARIOS Y PERFILES (Personas, Empleados, Clientes)

-- 2.1 DUEÑO (Super Admin)
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Usuario
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'dueno@verano.com', 'hashed_password_generic', 'dueno', true)
    ON CONFLICT (id) DO NOTHING;

    -- Persona (Si no existe, insertar)
    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento, nacionalidad)
    VALUES (v_uid, 'Dueño General', 'DNI', '10000001', 'Perú')
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- 2.2 ADMIN COSTA
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'admin.costa@verano.com', 'hashed_pass', 'admin', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento)
    VALUES (v_uid, 'Admin Costa', 'DNI', '20000001')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.empleados (usuario_id, sede_id, turno, codigo_empleado)
    VALUES (v_uid, 'costa', 'Mañana', 'ADM-C01')
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- 2.3 ADMIN RURAL
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'admin.rural@verano.com', 'hashed_pass', 'admin', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento)
    VALUES (v_uid, 'Admin Rural', 'DNI', '20000002')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.empleados (usuario_id, sede_id, turno, codigo_empleado)
    VALUES (v_uid, 'rural', 'Mañana', 'ADM-R01')
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- 2.4 VENDEDORES
-- Vendedor Costa
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000004';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'vendedor.costa@verano.com', 'hashed_pass', 'vendedor', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento)
    VALUES (v_uid, 'Vendedor Costa 1', 'DNI', '30000001')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.empleados (usuario_id, sede_id, turno, codigo_empleado)
    VALUES (v_uid, 'costa', 'Mañana', 'V-C01')
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- Vendedor Rural
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000005';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'vendedor.rural@verano.com', 'hashed_pass', 'vendedor', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento)
    VALUES (v_uid, 'Vendedor Rural 1', 'DNI', '30000002')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.empleados (usuario_id, sede_id, turno, codigo_empleado)
    VALUES (v_uid, 'rural', 'Tarde', 'V-R01')
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- 2.5 CLIENTES (TURISTAS)
-- Juan Perez
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000010';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'juan@gmail.com', 'hashed_pass', 'cliente', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento, nacionalidad)
    VALUES (v_uid, 'Juan Perez', 'DNI', '44556677', 'Perú')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.clientes_detalles (usuario_id, licencia_conducir)
    VALUES (v_uid, true)
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- Maria Garcia
DO $$
DECLARE
    v_uid uuid := '00000000-0000-0000-0000-000000000011';
BEGIN
    INSERT INTO public.usuarios (id, email, password_hash, rol_id, activo)
    VALUES (v_uid, 'maria@gmail.com', 'hashed_pass', 'cliente', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.personas (usuario_id, nombre_completo, tipo_documento, numero_documento, nacionalidad)
    VALUES (v_uid, 'Maria Garcia', 'PASAPORTE', 'AA123456', 'Mexico')
    ON CONFLICT (usuario_id) DO NOTHING;

    INSERT INTO public.clientes_detalles (usuario_id, licencia_conducir)
    VALUES (v_uid, false)
    ON CONFLICT (usuario_id) DO NOTHING;
END $$;

-- 3. RECURSOS
-- Costa
INSERT INTO
    public.recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen_url
    )
VALUES (
        'Moto Acuática Yamaha',
        'Velocidad en el mar.',
        150.00,
        5,
        1,
        'costa',
        'https://images.unsplash.com/photo-1570519391036-6e4266396e6d?q=80&w=600'
    ),
    (
        'Tabla de Surf Pro',
        'Para olas grandes.',
        30.00,
        10,
        1,
        'costa',
        'https://images.unsplash.com/photo-1531722569936-825d3fa9bc43?q=80&w=600'
    ),
    (
        'Sombrilla Familiar',
        'Protección UV.',
        15.00,
        20,
        4,
        'costa',
        'https://images.unsplash.com/photo-1596547608223-96cb3440cc0f?q=80&w=600'
    ) ON CONFLICT DO NOTHING;
-- Nota: Recursos no tiene constraint unique por defecto en nombre, pero evita errores si se corre 2 veces.

-- Rural
INSERT INTO
    public.recursos (
        nombre,
        descripcion,
        precio_por_hora,
        stock_total,
        categoria_id,
        sede_id,
        imagen_url
    )
VALUES (
        'Cuatrimoto 4x4',
        'Explora dunas.',
        120.00,
        8,
        3,
        'rural',
        'https://images.unsplash.com/photo-1552309322-c20e2a229a58?q=80&w=600'
    ),
    (
        'Bicicleta Montañera',
        'Rutas de senderismo.',
        25.00,
        15,
        2,
        'rural',
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600'
    ) ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload config';