-- ====================================================================================
-- PROJECT: VeranoTE - Summer Rental System
-- ARCHITECT: Solutions Architect & Data Modeler (Senior)
-- VERSION: 3.1 (Golden Schema - Definitive)
-- DESCRIPTION: Unified high-performance schema with deep normalization, professional reporting views, and full business logic (RPCs).
-- ====================================================================================

-- 1. CLEANUP & INITIAL SETUP
DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

-- Grant permissions for Supabase standard usage
GRANT ALL ON SCHEMA public TO postgres;

GRANT ALL ON SCHEMA public TO anon;

GRANT ALL ON SCHEMA public TO authenticated;

GRANT ALL ON SCHEMA public TO service_role;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================
-- 2. ENUMS & LOOKUP TABLES (Normalization Layer)
-- ====================================================================================

CREATE TABLE ROLES (
    id TEXT PRIMARY KEY, -- 'admin', 'vendedor', 'mecanico', 'cliente', 'dueno'
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ESTADOS_ALQUILER (
    id TEXT PRIMARY KEY, -- 'pendiente', 'confirmado', 'en_uso', 'retornado', 'limpieza', 'finalizado', 'cancelado', 'no_show'
    nombre TEXT NOT NULL,
    color_hex TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE METODOS_PAGO (
    id TEXT PRIMARY KEY, -- 'efectivo', 'tarjeta', 'yape', 'transferencia'
    nombre TEXT NOT NULL,
    requiere_token BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE TIPOS_COMPROBANTE (
    id TEXT PRIMARY KEY, -- 'BOLETA', 'FACTURA', 'NOTA_CREDITO'
    nombre TEXT NOT NULL,
    prefijo CHAR(1) NOT NULL, -- 'B' for Boleta, 'F' for Factura
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE TIPOS_DOCUMENTO (
    id TEXT PRIMARY KEY, -- 'DNI', 'RUC', 'CE', 'PASAPORTE'
    nombre TEXT NOT NULL,
    longitud_esperada INTEGER
);

CREATE TABLE ESTADOS_MANTENIMIENTO (
    id TEXT PRIMARY KEY, -- 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'
    nombre TEXT NOT NULL
);

CREATE TABLE TIPOS_MOVIMIENTO_INVENTARIO (
    id TEXT PRIMARY KEY, -- 'INGRESO', 'SALIDA', 'AJUSTE', 'RESERVA', 'RETORNO'
    nombre TEXT NOT NULL
);

CREATE TABLE TIPOS_MOVIMIENTO_CAJA (
    id TEXT PRIMARY KEY, -- 'VENTA', 'EGRESO', 'REEMBOLSO'
    nombre TEXT NOT NULL
);

CREATE TABLE CATEGORIAS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT UNIQUE NOT NULL,
    icono TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 3. INFRASTRUCTURE & LOCATIONS
-- ====================================================================================

CREATE TABLE SEDES (
    id TEXT PRIMARY KEY, -- 'costa', 'rural', etc.
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    descripcion TEXT,
    telefono TEXT,
    correo_contacto TEXT,
    mapa_url TEXT,
    imagen TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE HORARIOS_SEDE (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    sede_id TEXT REFERENCES SEDES (id) ON UPDATE CASCADE ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    cerrado BOOLEAN DEFAULT FALSE,
    UNIQUE (sede_id, dia_semana)
);

CREATE TABLE SERVICIOS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE SEDE_SERVICIOS (
    sede_id TEXT REFERENCES SEDES (id) ON UPDATE CASCADE ON DELETE CASCADE,
    servicio_id UUID REFERENCES SERVICIOS (id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (sede_id, servicio_id)
);

-- ====================================================================================
-- 4. USERS & PROFILES (Business Layer)
-- ====================================================================================

CREATE TABLE USUARIOS (
    id TEXT PRIMARY KEY, -- Matches Supabase Auth UID
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    tipo_documento_id TEXT REFERENCES TIPOS_DOCUMENTO (id) DEFAULT 'DNI',
    numero_documento TEXT UNIQUE,
    nacionalidad TEXT,
    fecha_nacimiento DATE,
    licencia_conducir BOOLEAN DEFAULT FALSE,
    rol_id TEXT REFERENCES ROLES (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    sede_id TEXT REFERENCES SEDES (id) ON UPDATE CASCADE ON DELETE SET NULL,
    codigo_empleado TEXT UNIQUE,
    contacto_emergencia TEXT,
    pregunta_secreta TEXT,
    respuesta_secreta TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_dni_length CHECK (
        tipo_documento_id != 'DNI'
        OR length(numero_documento) = 8
    ),
    CONSTRAINT check_ruc_length CHECK (
        tipo_documento_id != 'RUC'
        OR length(numero_documento) = 11
    )
);

CREATE TABLE TARJETAS_CREDITO (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_id TEXT REFERENCES USUARIOS (id) ON UPDATE CASCADE ON DELETE CASCADE,
    numero_oculto CHAR(4) NOT NULL,
    token TEXT NOT NULL,
    expiracion TEXT NOT NULL, -- MM/YY
    titular TEXT NOT NULL,
    marca TEXT,
    es_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 5. INVENTORY & KARDEX (Renamed back to RECURSOS for Frontend compatibility)
-- ====================================================================================

CREATE TABLE RECURSOS (
    id SERIAL PRIMARY KEY, -- Using Serial for legacy compatibility in some RPCs, but migration to UUID recommended for future.
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id UUID REFERENCES CATEGORIAS (id) ON UPDATE CASCADE ON DELETE SET NULL,
    imagen TEXT,
    base_precio_por_hora NUMERIC(10, 2) DEFAULT 0.00,
    guia_seguridad TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE INVENTARIO_SEDE (
    sede_id TEXT REFERENCES SEDES (id) ON UPDATE CASCADE ON DELETE CASCADE,
    recurso_id INTEGER REFERENCES RECURSOS (id) ON UPDATE CASCADE ON DELETE CASCADE,
    stock_total INTEGER DEFAULT 0 CHECK (stock_total >= 0),
    stock_disponible INTEGER DEFAULT 0 CHECK (stock_disponible >= 0),
    precio_por_hora_sede NUMERIC(10, 2), -- Override global price if needed
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (sede_id, recurso_id)
);

CREATE TABLE MOVIMIENTOS_INVENTARIO (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    recurso_id INTEGER REFERENCES RECURSOS (id) ON DELETE CASCADE,
    sede_id TEXT REFERENCES SEDES (id) ON DELETE CASCADE,
    tipo_movimiento_id TEXT REFERENCES TIPOS_MOVIMIENTO_INVENTARIO (id),
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    usuario_id TEXT REFERENCES USUARIOS (id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE MANTENIMIENTOS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    recurso_id INTEGER REFERENCES RECURSOS (id) ON DELETE CASCADE,
    sede_id TEXT REFERENCES SEDES (id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    costo_estimado NUMERIC(10, 2) DEFAULT 0.00,
    usuario_id TEXT REFERENCES USUARIOS (id), -- Mecánico
    estado_id TEXT REFERENCES ESTADOS_MANTENIMIENTO (id) DEFAULT 'EN_PROCESO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 6. POS & CASH MANAGEMENT
-- ====================================================================================

CREATE TABLE CAJAS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    sede_id TEXT REFERENCES SEDES (id),
    nombre TEXT NOT NULL, -- 'Caja Principal', 'Caja Playa 1'
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE APERTURAS_CIERRE_CAJA (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    caja_id UUID REFERENCES CAJAS (id),
    vendedor_id TEXT REFERENCES USUARIOS (id),
    monto_apertura NUMERIC(10, 2) NOT NULL,
    monto_cierre NUMERIC(10, 2),
    fecha_apertura TIMESTAMPTZ DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,
    estado TEXT DEFAULT 'ABIERTA', -- 'ABIERTA', 'CERRADA'
    observaciones TEXT
);

CREATE TABLE MOVIMIENTOS_CAJA (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    apertura_id UUID REFERENCES APERTURAS_CIERRE_CAJA (id),
    tipo_movimiento_id TEXT REFERENCES TIPOS_MOVIMIENTO_CAJA (id),
    monto NUMERIC(10, 2) NOT NULL,
    motivo TEXT,
    referencia_id UUID, -- Link to Venta/Alquiler if applicable
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 7. TRANSACTIONS: RENTALS & SALES
-- ====================================================================================

CREATE TABLE SERIES_COMPROBANTE (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    sede_id TEXT REFERENCES SEDES (id),
    tipo_comprobante_id TEXT REFERENCES TIPOS_COMPROBANTE (id),
    serie TEXT NOT NULL, -- 'F001', 'B001'
    ultimo_numero INTEGER DEFAULT 0,
    UNIQUE (
        sede_id,
        tipo_comprobante_id,
        serie
    )
);

CREATE TABLE ALQUILERES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text from 1 for 8),
    cliente_id TEXT REFERENCES USUARIOS(id) ON DELETE RESTRICT,
    vendedor_id TEXT REFERENCES USUARIOS(id) ON DELETE SET NULL,
    sede_id TEXT REFERENCES SEDES(id) ON DELETE RESTRICT,

-- Status & Control
estado_id TEXT REFERENCES ESTADOS_ALQUILER (id) DEFAULT 'pendiente',
tipo_reserva TEXT DEFAULT 'inmediata', -- 'inmediata', 'anticipada'

-- Dates (Logical)
fecha_inicio TIMESTAMPTZ NOT NULL,
fecha_fin_estimada TIMESTAMPTZ NOT NULL,
fecha_devolucion_real TIMESTAMPTZ,

-- Financials (SNAPSHOTS)
subtotal_base NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
igv NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
total_servicio NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- subtotal_base + igv
garantia NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
descuento_aplicado NUMERIC(10, 2) DEFAULT 0.00,
penalizacion NUMERIC(10, 2) DEFAULT 0.00,
total_final NUMERIC(10, 2) NOT NULL DEFAULT 0.01, -- total_servicio + garantia - descuento + penalizacion
monto_pagado NUMERIC(10, 2) DEFAULT 0.00,
saldo_pendiente NUMERIC(10, 2) DEFAULT 0.01,

-- Payment & Billing
metodo_pago_id TEXT REFERENCES METODOS_PAGO (id),
tipo_comprobante_id TEXT REFERENCES TIPOS_COMPROBANTE (id),
comprobante_serie TEXT,
comprobante_numero INTEGER,

-- Snapshots
datos_factura_snapshot JSONB,

-- Other
codigo_cupon TEXT,
    contrato_firmado BOOLEAN DEFAULT FALSE,
    entregado_por TEXT REFERENCES USUARIOS(id),
    recibido_por TEXT REFERENCES USUARIOS(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ALQUILER_DETALLES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    recurso_id INTEGER REFERENCES RECURSOS (id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    horas INTEGER NOT NULL DEFAULT 1,
    precio_unitario_bh NUMERIC(10, 2) NOT NULL, -- Price per hour at time of sale
    subtotal_item NUMERIC(10, 2) NOT NULL
);

CREATE TABLE COMPROBANTES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    tipo_comprobante_id TEXT REFERENCES TIPOS_COMPROBANTE (id),
    serie TEXT NOT NULL,
    numero INTEGER NOT NULL,
    monto_total NUMERIC(10, 2) NOT NULL,
    xml_generado TEXT,
    pdf_url TEXT,
    anulado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (serie, numero)
);

CREATE TABLE PENALIZACIONES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    motivo TEXT NOT NULL, -- 'DEMORA', 'DAÑO', 'EXTRA'
    monto NUMERIC(10, 2) NOT NULL,
    pagado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE EXTENSIONES_ALQUILER (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    horas_adicionales INTEGER NOT NULL,
    monto_adicional NUMERIC(10, 2) NOT NULL,
    usuario_id TEXT REFERENCES USUARIOS (id), -- Who approved it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 8. MARKETING, CONTENT & CONFIG
-- ====================================================================================

CREATE TABLE PROMOCIONES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL, -- 'regla_tiempo', 'regla_cantidad'
    es_automatico BOOLEAN DEFAULT TRUE,
    codigo_cupon TEXT UNIQUE,
    condicion JSONB DEFAULT '{}', -- {categoria_id, recurso_id, minHoras, minCantidad}
    beneficio JSONB DEFAULT '{}', -- {tipo: 'porcentaje'|'fijo', valor: 10}
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE CONFIGURACION (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE PAGINAS (
    slug TEXT PRIMARY KEY, -- 'terminos-y-condiciones', 'politica-privacidad'
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    actualizado_por TEXT REFERENCES USUARIOS (id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 9. AUDIT LOG (Generic)
-- ====================================================================================

CREATE TABLE AUDITORIA_LOG (
    id BIGSERIAL PRIMARY KEY,
    tabla_nombre TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    accion TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 10. INDEXES
-- ====================================================================================

CREATE INDEX idx_usuarios_email ON USUARIOS (email);

CREATE INDEX idx_usuarios_dni ON USUARIOS (numero_documento);

CREATE INDEX idx_alquileres_cliente ON ALQUILERES (cliente_id);

CREATE INDEX idx_alquileres_estado ON ALQUILERES (estado_id);

CREATE INDEX idx_alquileres_sede ON ALQUILERES (sede_id);

CREATE INDEX idx_inventario_recurso ON INVENTARIO_SEDE (recurso_id);

-- ====================================================================================
-- 11. PROFESSIONAL VIEWS (Reporting Layer)
-- ====================================================================================

CREATE OR REPLACE VIEW v_reporte_alquileres AS
SELECT
    a.id,
    a.codigo_reserva,
    u.nombre AS cliente_nombre,
    u.email AS cliente_email,
    s.nombre AS sede_nombre,
    ea.nombre AS estado_nombre,
    a.fecha_inicio,
    a.fecha_fin_estimada,
    a.total_final,
    a.monto_pagado,
    a.saldo_pendiente,
    mp.nombre AS metodo_pago
FROM
    ALQUILERES a
    JOIN USUARIOS u ON a.cliente_id = u.id
    JOIN SEDES s ON a.sede_id = s.id
    JOIN ESTADOS_ALQUILER ea ON a.estado_id = ea.id
    LEFT JOIN METODOS_PAGO mp ON a.metodo_pago_id = mp.id;

CREATE OR REPLACE VIEW v_stock_disponible_total AS
SELECT
    r.id AS recurso_id,
    r.nombre,
    s.nombre AS sede,
    i.stock_total,
    i.stock_disponible,
    (
        SELECT COUNT(*)
        FROM MANTENIMIENTOS m
        WHERE
            m.recurso_id = r.id
            AND m.sede_id = s.id
            AND m.estado_id = 'EN_PROCESO'
    ) AS en_mantenimiento
FROM
    RECURSOS r
    JOIN INVENTARIO_SEDE i ON r.id = i.recurso_id
    JOIN SEDES s ON i.sede_id = s.id;

-- ====================================================================================
-- 12. BUSINESS LOGIC (RPCs)
-- ====================================================================================

-- A. Verificar Disponibilidad
CREATE OR REPLACE FUNCTION verificar_disponibilidad_items(
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_recurso_id INTEGER;
    v_cantidad_solicitada INTEGER;
    v_horas INTEGER;
    v_fecha_fin_solicitada TIMESTAMP WITH TIME ZONE;
    v_stock_total INTEGER;
    v_cantidad_reservada INTEGER;
    v_recurso_nombre TEXT;
    v_activo BOOLEAN;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_recurso_id := (v_item->>'id')::INTEGER;
        v_cantidad_solicitada := (v_item->>'cantidad')::INTEGER;
        v_horas := (v_item->>'horas')::INTEGER;
        v_fecha_fin_solicitada := p_fecha_inicio + (v_horas || ' hours')::INTERVAL;
        
        SELECT stock_total, nombre, activo INTO v_stock_total, v_recurso_nombre, v_activo
        FROM RECURSOS WHERE id = v_recurso_id;
        
        IF NOT FOUND THEN RETURN jsonb_build_object('valido', false, 'mensaje', 'Recurso no encontrado ID: ' || v_recurso_id); END IF;
        IF v_activo IS FALSE THEN RETURN jsonb_build_object('valido', false, 'mensaje', 'El recurso ' || v_recurso_nombre || ' está fuera de servicio.'); END IF;

        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_cantidad_reservada
        FROM ALQUILER_DETALLES d JOIN ALQUILERES a ON a.id = d.alquiler_id
        WHERE d.recurso_id = v_recurso_id AND a.estado_id NOT IN ('finalizado', 'cancelado', 'no_show')
          AND ((a.fecha_inicio < v_fecha_fin_solicitada) AND (a.fecha_fin_estimada > p_fecha_inicio));
          
        IF (v_cantidad_reservada + v_cantidad_solicitada) > v_stock_total THEN
            RETURN jsonb_build_object('valido', false, 'mensaje', 'Sin disponibilidad para ' || v_recurso_nombre);
        END IF;
    END LOOP;
    RETURN jsonb_build_object('valido', true);
END;
$$ LANGUAGE plpgsql;

-- B. Calcular Cotización (Promociones & Upselling)
CREATE OR REPLACE FUNCTION calcular_descuento_simulado(
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT DEFAULT 'inmediata',
    p_cliente_id TEXT DEFAULT NULL,
    p_cupon TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_promo RECORD;
    v_item JSONB;
    v_descuento_total NUMERIC := 0;
    v_alertas TEXT[] := ARRAY[]::TEXT[];
    v_promos_aplicadas JSONB[] := ARRAY[]::JSONB[];
    v_monto_base_items NUMERIC;
    v_cantidad_total INTEGER;
    v_desc_monto NUMERIC;
    v_total_bruto NUMERIC := 0;
    v_total_servicio NUMERIC := 0;
    v_total_a_pagar NUMERIC := 0;
    v_garantia NUMERIC := 0;
    v_precio_hora NUMERIC;
    v_categoria_id UUID;
    v_item_cantidad INTEGER;
    v_item_horas INTEGER;
    v_recurso_id_item INTEGER;
    v_max_horas_carrito INTEGER := 0;
    v_cantidad_total_carrito INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_recurso_id_item := (v_item->>'id')::INTEGER;
        SELECT base_precio_por_hora, categoria_id INTO v_precio_hora, v_categoria_id FROM RECURSOS WHERE id = v_recurso_id_item;
        v_item_cantidad := (v_item->>'cantidad')::INTEGER;
        v_item_horas := (v_item->>'horas')::INTEGER;
        v_total_bruto := v_total_bruto + (v_item_cantidad * v_item_horas * v_precio_hora);
        IF v_item_horas > v_max_horas_carrito THEN v_max_horas_carrito := v_item_horas; END IF;
        v_cantidad_total_carrito := v_cantidad_total_carrito + v_item_cantidad;
    END LOOP;

    FOR v_promo IN SELECT * FROM PROMOCIONES WHERE activo = TRUE LOOP
        IF (v_promo.es_automatico) OR (p_cupon IS NOT NULL AND v_promo.codigo_cupon = p_cupon) THEN
            v_desc_monto := 0;
            IF v_promo.tipo = 'regla_tiempo' THEN
                IF v_max_horas_carrito >= (v_promo.condicion->>'minHoras')::INTEGER THEN
                    v_desc_monto := v_total_bruto * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                END IF;
            ELSIF v_promo.tipo = 'regla_cantidad' THEN
                IF v_cantidad_total_carrito >= (v_promo.condicion->>'minCantidad')::INTEGER THEN
                    v_desc_monto := v_total_bruto * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                END IF;
            END IF;
            IF v_desc_monto > 0 THEN
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;
        END IF;
    END LOOP;

    v_total_servicio := GREATEST(0, v_total_bruto - v_descuento_total) * 1.18; -- IGV 18%
    v_garantia := v_total_bruto * 0.20;
    v_total_a_pagar := v_total_servicio + v_garantia;

    RETURN jsonb_build_object(
        'total_bruto', v_total_bruto,
        'descuento', v_descuento_total,
        'total_servicio', v_total_servicio,
        'garantia', v_garantia,
        'total_a_pagar', v_total_a_pagar,
        'promocionesAplicadas', v_promos_aplicadas
    );
END;
$$ LANGUAGE plpgsql;

-- C. Crear Reserva Robusta
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT,
    p_metodo_pago_id TEXT,
    p_tipo_comprobante TEXT,
    p_datos_factura JSONB,
    p_cupon TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_calculo JSONB;
    v_alquiler_id UUID;
    v_item JSONB;
    v_max_horas INTEGER := 0;
BEGIN
    v_calculo := calcular_descuento_simulado(p_items, p_fecha_inicio, p_tipo_reserva, p_cliente_id, p_cupon);
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'horas')::INTEGER > v_max_horas THEN v_max_horas := (v_item->>'horas')::INTEGER; END IF;
    END LOOP;

    INSERT INTO ALQUILERES (
        cliente_id, vendedor_id, sede_id, fecha_inicio, fecha_fin_estimada,
        subtotal_base, igv, total_servicio, garantia, descuento_aplicado, total_final,
        monto_pagado, saldo_pendiente, tipo_reserva, metodo_pago_id, tipo_comprobante_id,
        datos_factura_snapshot, codigo_cupon, estado_id
    ) VALUES (
        p_cliente_id, p_vendedor_id, p_sede_id, p_fecha_inicio, p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL,
        (v_calculo->>'total_bruto')::NUMERIC - (v_calculo->>'descuento')::NUMERIC,
        ((v_calculo->>'total_bruto')::NUMERIC - (v_calculo->>'descuento')::NUMERIC) * 0.18,
        (v_calculo->>'total_servicio')::NUMERIC, (v_calculo->>'garantia')::NUMERIC, (v_calculo->>'descuento')::NUMERIC,
        (v_calculo->>'total_a_pagar')::NUMERIC,
        CASE WHEN p_tipo_reserva = 'anticipada' THEN (v_calculo->>'total_a_pagar')::NUMERIC * 0.6 ELSE (v_calculo->>'total_a_pagar')::NUMERIC END,
        (v_calculo->>'total_a_pagar')::NUMERIC - (CASE WHEN p_tipo_reserva = 'anticipada' THEN (v_calculo->>'total_a_pagar')::NUMERIC * 0.6 ELSE (v_calculo->>'total_a_pagar')::NUMERIC END),
        p_tipo_reserva, p_metodo_pago_id, p_tipo_comprobante, p_datos_factura, p_cupon,
        'confirmado'
    ) RETURNING id INTO v_alquiler_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO ALQUILER_DETALLES (alquiler_id, recurso_id, cantidad, horas, precio_unitario_bh, subtotal_item)
        VALUES (v_alquiler_id, (v_item->>'id')::INTEGER, (v_item->>'cantidad')::INTEGER, (v_item->>'horas')::INTEGER, (v_item->>'precioPorHora')::NUMERIC, (v_item->>'subtotal')::NUMERIC);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_alquiler_id);
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 13. SEED DATA (v3.1)
-- ====================================================================================

-- Tipos Documento
INSERT INTO
    TIPOS_DOCUMENTO (id, nombre, longitud_esperada)
VALUES (
        'DNI',
        'Documento Nacional de Identidad',
        8
    ),
    (
        'RUC',
        'Registro Único de Contribuyentes',
        11
    ),
    (
        'PASAPORTE',
        'Pasaporte Internacional',
        NULL
    );

-- Roles
INSERT INTO
    ROLES (id, nombre)
VALUES ('admin', 'Administrador'),
    ('vendedor', 'Vendedor'),
    ('mecanico', 'Mecánico'),
    ('cliente', 'Cliente'),
    ('dueno', 'Dueño');

-- Estados Alquiler
INSERT INTO
    ESTADOS_ALQUILER (id, nombre, color_hex)
VALUES (
        'pendiente',
        'Pendiente de Pago',
        '#FBBF24'
    ),
    (
        'confirmado',
        'Confirmado',
        '#3B82F6'
    ),
    ('en_uso', 'En Uso', '#10B981'),
    (
        'retornado',
        'Retornado',
        '#6B7280'
    ),
    (
        'limpieza',
        'En Limpieza',
        '#6366F1'
    ),
    (
        'mantenimiento',
        'Mantenimiento',
        '#EF4444'
    ),
    (
        'finalizado',
        'Finalizado',
        '#000000'
    );

-- Métodos Pago
INSERT INTO
    METODOS_PAGO (id, nombre)
VALUES ('efectivo', 'Efectivo'),
    ('tarjeta', 'Tarjeta'),
    ('yape', 'Yape / Plin'),
    (
        'transferencia',
        'Transferencia'
    );

-- Tipos Comprobante
INSERT INTO
    TIPOS_COMPROBANTE (id, nombre, prefijo)
VALUES (
        'BOLETA',
        'Boleta de Venta',
        'B'
    ),
    (
        'FACTURA',
        'Factura Electrónica',
        'F'
    );

-- Sedes
INSERT INTO
    SEDES (
        id,
        nombre,
        direccion,
        descripcion
    )
VALUES (
        'costa',
        'Sede Playa (Costa)',
        'Av. Malecón 123',
        'Frente al mar.'
    ),
    (
        'rural',
        'Sede Montaña (Rural)',
        'Camino Real Km 5',
        'Deportes de montaña.'
    );

-- Config
INSERT INTO
    CONFIGURACION (clave, valor)
VALUES ('IGV_PORCENTAJE', '18'),
    ('GARANTIA_PORCENTAJE', '20'),
    (
        'ADELANTO_RESERVA_ANTICIPADA',
        '0.60'
    );

-- ====================================================================================
-- 14. TRIGGERS
-- ====================================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_usuarios BEFORE UPDATE ON USUARIOS FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_recursos BEFORE UPDATE ON RECURSOS FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_alquileres BEFORE UPDATE ON ALQUILERES FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- FIN SCHEMA MASTER V3.1