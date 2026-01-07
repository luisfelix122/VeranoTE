-- SEED DATA SCRIPT (Usuarios & Recursos) - CORRECTED V4
-- - Removed 'id' from profiles (Auto-generated UUID).
-- - Removed 'id' from recursos (Auto-generated Serial).
-- - Fixed 'categoria_id' for resources.
-- - Used standard conflict resolution where possible, or WHERE NOT EXISTS checks.

-- 1. USERS
-- Dueño
INSERT INTO
    perfiles_admins (
        usuario_id,
        nombre,
        email,
        sede_id,
        rol
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Dueño General',
        'dueno@verano.com',
        NULL,
        'dueno'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Admin Costa
INSERT INTO
    perfiles_admins (
        usuario_id,
        nombre,
        email,
        sede_id,
        rol
    )
VALUES (
        '00000000-0000-0000-0000-000000000002',
        'Admin Costa',
        'admin.costa@verano.com',
        'costa',
        'admin'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Admin Rural
INSERT INTO
    perfiles_admins (
        usuario_id,
        nombre,
        email,
        sede_id,
        rol
    )
VALUES (
        '00000000-0000-0000-0000-000000000003',
        'Admin Rural',
        'admin.rural@verano.com',
        'rural',
        'admin'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Vendedor Costa
INSERT INTO
    perfiles_vendedores (
        usuario_id,
        nombre,
        email,
        sede_id,
        codigo_empleado,
        turno
    )
VALUES (
        '00000000-0000-0000-0000-000000000004',
        'Vendedor Costa 1',
        'vendedor.costa@verano.com',
        'costa',
        'V-C01',
        'Mañana'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Vendedor Rural
INSERT INTO
    perfiles_vendedores (
        usuario_id,
        nombre,
        email,
        sede_id,
        codigo_empleado,
        turno
    )
VALUES (
        '00000000-0000-0000-0000-000000000005',
        'Vendedor Rural 1',
        'vendedor.rural@verano.com',
        'rural',
        'V-R01',
        'Tarde'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Mecanico Costa
INSERT INTO
    perfiles_mecanicos (
        usuario_id,
        nombre,
        email,
        sede_id,
        especialidad
    )
VALUES (
        '00000000-0000-0000-0000-000000000006',
        'Mestizo Costa',
        'mecanico.costa@verano.com',
        'costa',
        'Motores Marinos'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Mecanico Rural
INSERT INTO
    perfiles_mecanicos (
        usuario_id,
        nombre,
        email,
        sede_id,
        especialidad
    )
VALUES (
        '00000000-0000-0000-0000-000000000007',
        'Mestizo Rural',
        'mecanico.rural@verano.com',
        'rural',
        '4x4'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- Turistas (5 Clientes)
INSERT INTO
    perfiles_turistas (
        usuario_id,
        nombre,
        email,
        nacionalidad,
        numero_documento
    )
VALUES (
        '00000000-0000-0000-0000-000000000010',
        'Juan Perez',
        'juan@gmail.com',
        'Peruano',
        '44556677'
    ),
    (
        '00000000-0000-0000-0000-000000000011',
        'Maria Garcia',
        'maria@gmail.com',
        'Mexicana',
        'AA123456'
    ),
    (
        '00000000-0000-0000-0000-000000000012',
        'Carlos Lopez',
        'carlos@hotmail.com',
        'Argentino',
        'ARG-999'
    ),
    (
        '00000000-0000-0000-0000-000000000013',
        'Ana Smith',
        'ana.smith@yahoo.com',
        'USA',
        'PASS-555'
    ),
    (
        '00000000-0000-0000-0000-000000000014',
        'Luisa Lane',
        'luisa@daily.com',
        'Chilena',
        'RUT-777'
    ) ON CONFLICT (usuario_id) DO NOTHING;

-- 3. RECURSOS
-- Costa (Acuaticos & Playa)
-- Acuatico = 1, Playa = 4
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
SELECT 'Moto Acuática Yamaha', 'Velocidad y adrenalina en el mar.', 150.00, 5, 1, 'costa', 'https://images.unsplash.com/photo-1570519391036-6e4266396e6d?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
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
SELECT 'Tabla de Surf Pro', 'Para olas grandes y profesionales.', 30.00, 10, 1, 'costa', 'https://images.unsplash.com/photo-1531722569936-825d3fa9bc43?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
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
SELECT 'Sombrilla Familiar', 'Protección UV para toda la familia.', 15.00, 20, 4, 'costa', 'https://images.unsplash.com/photo-1596547608223-96cb3440cc0f?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
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
SELECT 'Silla de Playa', 'Comodidad frente al mar.', 10.00, 30, 4, 'costa', 'https://images.unsplash.com/photo-1533230408806-3883e20067ea?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Silla de Playa'
            AND sede_id = 'costa'
    );

-- Rural (Motor & Bicicletas)
-- Motor = 3, Bicicleta (Terrestre) = 2
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
SELECT 'Cuatrimoto 4x4', 'Explora dunas y terrenos difíciles.', 120.00, 8, 3, 'rural', 'https://images.unsplash.com/photo-1552309322-c20e2a229a58?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
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
SELECT 'Bicicleta Montañera', 'Para rutas de senderismo.', 25.00, 15, 2, 'rural', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
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
SELECT 'Casco de Seguridad', 'Obligatorio para rutas.', 5.00, 50, 2, 'rural', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=600&auto=format&fit=crop'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM recursos
        WHERE
            nombre = 'Casco de Seguridad'
            AND sede_id = 'rural'
    );

NOTIFY pgrst, 'reload config';