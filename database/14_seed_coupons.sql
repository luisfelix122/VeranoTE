-- Semilla de Cupones de Prueba

-- 1. Cupón General de Verano (20% OFF)
INSERT INTO
    PROMOCIONES (
        nombre,
        descripcion,
        tipo,
        condicion,
        beneficio,
        activo,
        es_automatico,
        codigo_cupon
    )
VALUES (
        'Descuento Verano 2025',
        'Cupón especial de temporada. 20% de descuento en cualquier alquiler mayor a 2 horas.',
        'regla_tiempo',
        '{"minHoras": 2}',
        '{"tipo": "porcentaje", "valor": 20}',
        TRUE,
        FALSE,
        'VERANO2025'
    ) ON CONFLICT (codigo_cupon) DO NOTHING;

-- 2. Cupón VIP (S/ 50 OFF fijo)
INSERT INTO
    PROMOCIONES (
        nombre,
        descripcion,
        tipo,
        condicion,
        beneficio,
        activo,
        es_automatico,
        codigo_cupon
    )
VALUES (
        'Descuento VIP',
        'Descuento exclusivo de S/ 50.00 en pedidos grandes (min 5 items).',
        'regla_cantidad',
        '{"minCantidad": 5}',
        '{"tipo": "fijo", "valor": 50}',
        TRUE,
        FALSE,
        'VIP50'
    ) ON CONFLICT (codigo_cupon) DO NOTHING;