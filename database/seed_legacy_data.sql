-- SEED LEGACY DATA SCRIPT (For Monolithic Usuarios Table)

-- 1. BASE TABLES (Foreign Keys)
INSERT INTO
    roles (id, nombre)
VALUES ('dueno', 'Dueño'),
    ('admin', 'Administrador'),
    ('vendedor', 'Vendedor'),
    ('mecanico', 'Mecánico'),
    ('cliente', 'Cliente'),
    ('turista', 'Turista') -- Alias for Cliente/Turista logic
    ON CONFLICT (id) DO NOTHING;

INSERT INTO
    sedes (id, nombre, direccion)
VALUES (
        'costa',
        'Sede Costa',
        'Playa Principal S/N'
    ),
    (
        'rural',
        'Sede Rural',
        'Campo Adentro Km 5'
    ) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    categorias (nombre)
VALUES ('Acuático'),
    ('Terrestre'),
    ('Motor'),
    ('Playa'),
    ('Camping') ON CONFLICT (nombre) DO NOTHING;

INSERT INTO
    estados_alquiler (id, nombre)
VALUES ('pendiente', 'Pendiente'),
    ('aprobado', 'Aprobado'),
    ('en_curso', 'En Curso'),
    ('finalizado', 'Finalizado'),
    ('cancelado', 'Cancelado') ON CONFLICT (id) DO NOTHING;

INSERT INTO
    metodos_pago (id, nombre)
VALUES ('efectivo', 'Efectivo'),
    (
        'tarjeta',
        'Tarjeta de Crédito'
    ),
    ('yape', 'Yape/Plin') ON CONFLICT (id) DO NOTHING;

-- 2. USUARIOS (Monolithic Table)
-- Note: 'password' is just a placeholder here as real auth is via Supabase Auth.
-- IMPORTANT: 'rol_id' must match IDs inserted above.

-- Dueño
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'dueno@verano.com',
        '123456',
        'dueno',
        'Dueño General',
        NULL
    ) ON CONFLICT (id) DO NOTHING;

-- Admin Costa
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id
    )
VALUES (
        '00000000-0000-0000-0000-000000000002',
        'admin.costa@verano.com',
        '123456',
        'admin',
        'Admin Costa',
        'costa'
    ) ON CONFLICT (id) DO NOTHING;

-- Admin Rural
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id
    )
VALUES (
        '00000000-0000-0000-0000-000000000003',
        'admin.rural@verano.com',
        '123456',
        'admin',
        'Admin Rural',
        'rural'
    ) ON CONFLICT (id) DO NOTHING;

-- Vendedor Costa
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id,
        turno,
        codigo_empleado
    )
VALUES (
        '00000000-0000-0000-0000-000000000004',
        'vendedor.costa@verano.com',
        '123456',
        'vendedor',
        'Vendedor Costa 1',
        'costa',
        'Mañana',
        'V-C01'
    ) ON CONFLICT (id) DO NOTHING;

-- Vendedor Rural
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id,
        turno,
        codigo_empleado
    )
VALUES (
        '00000000-0000-0000-0000-000000000005',
        'vendedor.rural@verano.com',
        '123456',
        'vendedor',
        'Vendedor Rural 1',
        'rural',
        'Tarde',
        'V-R01'
    ) ON CONFLICT (id) DO NOTHING;

-- Mecanico Costa
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id,
        especialidad
    )
VALUES (
        '00000000-0000-0000-0000-000000000006',
        'mecanico.costa@verano.com',
        '123456',
        'mecanico',
        'Mestizo Costa',
        'costa',
        'Motores Marinos'
    ) ON CONFLICT (id) DO NOTHING;

-- Mecanico Rural
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        sede_id,
        especialidad
    )
VALUES (
        '00000000-0000-0000-0000-000000000007',
        'mecanico.rural@verano.com',
        '123456',
        'mecanico',
        'Mestizo Rural',
        'rural',
        '4x4'
    ) ON CONFLICT (id) DO NOTHING;

-- 5 Clientes (Turistas)
INSERT INTO
    usuarios (
        id,
        email,
        password,
        rol_id,
        nombre,
        nacionalidad,
        numero_documento
    )
VALUES (
        '00000000-0000-0000-0000-000000000010',
        'juan@gmail.com',
        '123456',
        'cliente',
        'Juan Perez',
        'Peruano',
        '44556677'
    ),
    (
        '00000000-0000-0000-0000-000000000011',
        'maria@gmail.com',
        '123456',
        'cliente',
        'Maria Garcia',
        'Mexicana',
        'AA123456'
    ),
    (
        '00000000-0000-0000-0000-000000000012',
        'carlos@hotmail.com',
        '123456',
        'cliente',
        'Carlos Lopez',
        'Argentino',
        'ARG-999'
    ),
    (
        '00000000-0000-0000-0000-000000000013',
        'ana.smith@yahoo.com',
        '123456',
        'cliente',
        'Ana Smith',
        'USA',
        'PASS-555'
    ),
    (
        '00000000-0000-0000-0000-000000000014',
        'luisa@daily.com',
        '123456',
        'cliente',
        'Luisa Lane',
        'Chilena',
        'RUT-777'
    ) ON CONFLICT (id) DO NOTHING;

-- 3. RECURSOS
-- Note: 'categoria_id' must be looked up or hardcoded carefully.
-- In new schema, 'categorias' has serial ID.
-- Acuatico (1), Terrestre (2), Motor (3), Playa (4), Camping (5) -> Assuming insertion order from above.

-- Costa Resources
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

-- Rural Resources
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

NOTIFY pgrst, 'reload config';