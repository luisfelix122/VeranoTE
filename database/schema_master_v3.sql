-- ====================================================================================
-- PROJECT: VeranoTE - Summer Rental System
-- ARCHITECT: Solutions Architect & Data Modeler (Senior)
-- VERSION: 3.0 (Master Schema - Definitive)
-- DESCRIPTION: High-performance PostgreSQL/Supabase schema reverse-engineered from frontend.
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
-- 2. ENUMS & LOOKUP TABLES
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
    tipo_documento TEXT DEFAULT 'DNI',
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
-- 5. INVENTORY & KARDEX
-- ====================================================================================

CREATE TABLE PRODUCTOS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id UUID REFERENCES CATEGORIAS (id) ON UPDATE CASCADE ON DELETE SET NULL,
    imagen TEXT,
    base_precio_por_hora NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE INVENTARIO_SEDE (
    sede_id TEXT REFERENCES SEDES (id) ON UPDATE CASCADE ON DELETE CASCADE,
    producto_id UUID REFERENCES PRODUCTOS (id) ON UPDATE CASCADE ON DELETE CASCADE,
    stock_total INTEGER DEFAULT 0 CHECK (stock_total >= 0),
    stock_disponible INTEGER DEFAULT 0 CHECK (stock_disponible >= 0),
    precio_por_hora_sede NUMERIC(10, 2), -- Override global price if needed
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (sede_id, producto_id)
);

CREATE TABLE MOVIMIENTOS_INVENTARIO (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    producto_id UUID REFERENCES PRODUCTOS (id) ON DELETE CASCADE,
    sede_id TEXT REFERENCES SEDES (id) ON DELETE CASCADE,
    tipo_movimiento TEXT NOT NULL, -- 'INGRESO', 'SALIDA', 'AJUSTE', 'RESERVA', 'RETORNO'
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    usuario_id TEXT REFERENCES USUARIOS (id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE MANTENIMIENTOS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    producto_id UUID REFERENCES PRODUCTOS (id) ON DELETE CASCADE,
    sede_id TEXT REFERENCES SEDES (id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    costo_estimado NUMERIC(10, 2) DEFAULT 0.00,
    usuario_id TEXT REFERENCES USUARIOS (id), -- Mecánico
    estado TEXT DEFAULT 'EN_PROCESO', -- 'EN_PROCESO', 'COMPLETADO'
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
    tipo_movimiento TEXT NOT NULL, -- 'VENTA', 'EGRESO', 'REEMBOLSO'
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
total_final NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- total_servicio + garantia - descuento + penalizacion
monto_pagado NUMERIC(10, 2) DEFAULT 0.00,
saldo_pendiente NUMERIC(10, 2) DEFAULT 0.00,

-- Payment & Billing
metodo_pago_id TEXT REFERENCES METODOS_PAGO (id),
tipo_comprobante_id TEXT REFERENCES TIPOS_COMPROBANTE (id),
comprobante_serie TEXT,
comprobante_numero INTEGER,

-- JSONB Denormalization for Billing Historical
datos_factura_snapshot JSONB, -- {ruc, razon_social, direccion, cliente_nombre, etc}

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
    producto_id UUID REFERENCES PRODUCTOS (id) ON DELETE RESTRICT,
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
    xml_generado TEXT, -- Mock for Sunat integration
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
    tipo TEXT NOT NULL, -- 'CUPON', 'AUTOMATICA'
    codigo_cupon TEXT UNIQUE,
    valor_descuento NUMERIC(10, 2) NOT NULL,
    es_porcentaje BOOLEAN DEFAULT TRUE,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    requisito_minimo_horas INTEGER,
    requisito_minimo_items INTEGER,
    categoria_id UUID REFERENCES CATEGORIAS (id),
    producto_id UUID REFERENCES PRODUCTOS (id),
    es_upselling BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE CONFIGURACION (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE CONTENIDO_WEB (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    tipo TEXT DEFAULT 'texto', -- 'texto', 'imagen', 'color'
    modulo TEXT, -- 'HERO', 'CONTACTO', 'FOOTER'
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
-- 10. INDEXES (Performance Optimization)
-- ====================================================================================

-- Users & Auth
CREATE INDEX idx_usuarios_email ON USUARIOS (email);

CREATE INDEX idx_usuarios_dni ON USUARIOS (numero_documento);

CREATE INDEX idx_usuarios_rol ON USUARIOS (rol_id);

-- Rentals
CREATE INDEX idx_alquileres_cliente ON ALQUILERES (cliente_id);

CREATE INDEX idx_alquileres_estado ON ALQUILERES (estado_id);

CREATE INDEX idx_alquileres_fecha_inicio ON ALQUILERES (fecha_inicio);

CREATE INDEX idx_alquileres_sede ON ALQUILERES (sede_id);

-- Inventory
CREATE INDEX idx_inventario_producto ON INVENTARIO_SEDE (producto_id);

CREATE INDEX idx_inventario_sede ON INVENTARIO_SEDE (sede_id);

CREATE INDEX idx_productos_categoria ON PRODUCTOS (categoria_id);

-- ====================================================================================
-- 11. SECURITY: RLS & POLICIES
-- ====================================================================================

-- Enable RLS for all transactional and catalog tables
ALTER TABLE USUARIOS ENABLE ROW LEVEL SECURITY;

ALTER TABLE SEDES ENABLE ROW LEVEL SECURITY;

ALTER TABLE PRODUCTOS ENABLE ROW LEVEL SECURITY;

ALTER TABLE INVENTARIO_SEDE ENABLE ROW LEVEL SECURITY;

ALTER TABLE ALQUILERES ENABLE ROW LEVEL SECURITY;

ALTER TABLE ALQUILER_DETALLES ENABLE ROW LEVEL SECURITY;

ALTER TABLE COMPROBANTES ENABLE ROW LEVEL SECURITY;

ALTER TABLE PROMOCIONES ENABLE ROW LEVEL SECURITY;

ALTER TABLE CONFIGURACION ENABLE ROW LEVEL SECURITY;

ALTER TABLE PAGINAS ENABLE ROW LEVEL SECURITY;

-- 11.1 Admin Policy: Access everything
-- This assumes a function or claim to identify the user role, for now we use the rol_id column in profile
-- In real Supabase, we'd use (auth.jwt() ->> 'role' = 'service_role') or custom claims.
-- Below is a generic policy skeleton.

CREATE POLICY "Admin full access" ON USUARIOS FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM USUARIOS u
        WHERE
            u.id = auth.uid ()::text
            AND u.rol_id IN ('admin', 'dueno')
    )
);

-- 11.2 Public Catalog Policy (Read only)
CREATE POLICY "Public read catalog" ON PRODUCTOS FOR
SELECT USING (TRUE);

CREATE POLICY "Public read categories" ON CATEGORIAS FOR
SELECT USING (TRUE);

CREATE POLICY "Public read sedes" ON SEDES FOR SELECT USING (TRUE);

CREATE POLICY "Public read inventory" ON INVENTARIO_SEDE FOR
SELECT USING (TRUE);

CREATE POLICY "Public read config" ON CONFIGURACION FOR
SELECT USING (TRUE);

CREATE POLICY "Public read pages" ON PAGINAS FOR SELECT USING (TRUE);

-- 11.3 User Personal Access
CREATE POLICY "Users see own profile" ON USUARIOS FOR
SELECT USING (id = auth.uid ()::text);

CREATE POLICY "Users see own cards" ON TARJETAS_CREDITO FOR ALL USING (usuario_id = auth.uid ()::text);

CREATE POLICY "Users see own rentals" ON ALQUILERES FOR
SELECT USING (cliente_id = auth.uid ()::text);

CREATE POLICY "Venders see their sedes rentals" ON ALQUILERES FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM USUARIOS u
            WHERE
                u.id = auth.uid ()::text
                AND u.rol_id = 'vendedor'
                AND u.sede_id = ALQUILERES.sede_id
        )
    );

-- ====================================================================================
-- 12. SEED DATA (Critical)
-- ====================================================================================

-- Roles
INSERT INTO
    ROLES (id, nombre, descripcion)
VALUES (
        'admin',
        'Administrador',
        'Control total del sistema'
    ),
    (
        'vendedor',
        'Vendedor',
        'Gestión de POS y atención al cliente'
    ),
    (
        'mecanico',
        'Mecánico',
        'Gestión de mantenimiento y stock técnico'
    ),
    (
        'cliente',
        'Cliente',
        'Usuario final del servicio'
    ),
    (
        'dueno',
        'Dueño',
        'Acceso a reportes y métricas globales'
    );

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
        'Confirmado / Por Entregar',
        '#3B82F6'
    ),
    (
        'en_uso',
        'En Uso / Activo',
        '#10B981'
    ),
    (
        'retornado',
        'Retornado / Finalizado',
        '#6B7280'
    ),
    (
        'limpieza',
        'En Limpieza',
        '#6366F1'
    ),
    (
        'mantenimiento',
        'En Mantenimiento',
        '#EF4444'
    ),
    (
        'finalizado',
        'Histórico',
        '#000000'
    ),
    (
        'no_show',
        'No se presentó',
        '#9CA3AF'
    ),
    (
        'cancelado',
        'Cancelado',
        '#000000'
    );

-- Métodos Pago
INSERT INTO
    METODOS_PAGO (id, nombre, requiere_token)
VALUES ('efectivo', 'Efectivo', false),
    (
        'tarjeta',
        'Tarjeta Crédito/Débito',
        true
    ),
    ('yape', 'Yape / Plin', false),
    (
        'transferencia',
        'Transferencia Bancaria',
        false
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
    ),
    (
        'NOTA_CREDITO',
        'Nota de Crédito',
        'N'
    );

-- Sedes Base
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
        'Av. Malecón 123, Playa Hermosa',
        'Nuestra sede principal frente al mar.'
    ),
    (
        'rural',
        'Sede Montaña (Rural)',
        'Camino al Mirador Km 5, Valle Alto',
        'Ideal para trekking y deportes de campo.'
    );

-- Series Comprobante Iniciales
INSERT INTO
    SERIES_COMPROBANTE (
        sede_id,
        tipo_comprobante_id,
        serie,
        ultimo_numero
    )
VALUES ('costa', 'BOLETA', 'B001', 0),
    ('costa', 'FACTURA', 'F001', 0),
    ('rural', 'BOLETA', 'B002', 0),
    ('rural', 'FACTURA', 'F002', 0);

-- Configuración Base
INSERT INTO
    CONFIGURACION (clave, valor, descripcion)
VALUES (
        'TIEMPO_GRACIA_MINUTOS',
        '15',
        'Minutos antes de aplicar penalización por demora'
    ),
    (
        'IVA_PORCENTAJE',
        '18',
        'Impuesto General a las Ventas (%)'
    ),
    (
        'PORCENTAJE_GARANTIA',
        '20',
        'Porcentaje de garantía sobre el servicio'
    ),
    (
        'MONEDA_SIMBOLO',
        'S/',
        'Símbolo de la moneda local'
    ),
    (
        'TC_DOLAR',
        '3.80',
        'Tipo de cambio referencial'
    );

-- ====================================================================================
-- 13. TRIGGERS (Auto-Update timestamps)
-- ====================================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_usuarios BEFORE UPDATE ON USUARIOS FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sedes BEFORE UPDATE ON SEDES FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_productos BEFORE UPDATE ON PRODUCTOS FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_alquileres BEFORE UPDATE ON ALQUILERES FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- FIN SCHEMA MASTER V3