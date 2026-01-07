-- ====================================================================================
-- PROJECT: VeranoTE - Summer Rental System
-- ARCHITECT: Antigravity Expert Modeler
-- VERSION: 3.1 Pro Ultra (Hyper-3NF)
-- ====================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DOMAINS (Experts Layer)
DO $$ BEGIN
    CREATE DOMAIN EMAIL_ADDR AS TEXT CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
    CREATE DOMAIN PHONE_NUM AS TEXT CHECK (VALUE ~* '^\\+?[0-9\\s\\-]{7,15}$');
    CREATE DOMAIN MONEY_AMT AS NUMERIC(12, 2) CHECK (VALUE >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. MASTER TABLES (3NF)
CREATE TABLE IF NOT EXISTS PAISES (
    id CHAR(2) PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    prefijo_telefono TEXT,
    moneda_simbolo TEXT DEFAULT 'S/'
);

CREATE TABLE IF NOT EXISTS TIPOS_DOCUMENTO (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    mascara_validacion TEXT
);

CREATE TABLE IF NOT EXISTS ROLES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    nivel_acceso INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ESTADOS_ALQUILER (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color_hex TEXT
);

CREATE TABLE IF NOT EXISTS CATEGORIAS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT UNIQUE NOT NULL,
    icono TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS SEDES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    pais_id CHAR(2) REFERENCES PAISES (id),
    activo BOOLEAN DEFAULT TRUE
);

-- 4. USERS LAYER
CREATE TABLE IF NOT EXISTS USUARIOS (
    id TEXT PRIMARY KEY, -- auth.uid()
    email EMAIL_ADDR UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol_id TEXT REFERENCES ROLES (id),
    tipo_documento_id TEXT REFERENCES TIPOS_DOCUMENTO (id),
    numero_documento TEXT UNIQUE,
    pais_id CHAR(2) REFERENCES PAISES (id),
    password TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HYPER-3NF PAYMENT ARCHITECTURE
CREATE TABLE IF NOT EXISTS EMISORES_TARJETA (
    id TEXT PRIMARY KEY, -- 'VISA', 'MASTERCARD', 'AMEX'
    nombre TEXT NOT NULL,
    logo_url TEXT
);

CREATE TABLE IF NOT EXISTS BANCOS (
    id TEXT PRIMARY KEY, -- 'BCP', 'BBVA'
    nombre TEXT NOT NULL,
    pais_id CHAR(2) REFERENCES PAISES (id)
);

CREATE TABLE IF NOT EXISTS BILLETERAS_DIGITALES (
    id TEXT PRIMARY KEY, -- 'YAPE', 'PLIN'
    nombre TEXT NOT NULL,
    logo_url TEXT
);

CREATE TABLE IF NOT EXISTS TIPOS_METODO_PAGO (
    id TEXT PRIMARY KEY, -- 'CREDIT_CARD', 'WALLET', 'TRANSFER', 'CASH'
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS MEDIOS_PAGO_USUARIO (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_id TEXT REFERENCES USUARIOS (id),
    tipo_metodo_id TEXT REFERENCES TIPOS_METODO_PAGO (id),
    es_principal BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS TARJETAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    emisor_id TEXT REFERENCES EMISORES_TARJETA (id),
    tipo_tarjeta TEXT CHECK (
        tipo_tarjeta IN ('CREDITO', 'DEBITO')
    ),
    ultimos_4 CHAR(4) NOT NULL,
    expiracion TEXT NOT NULL,
    token_seguridad TEXT,
    nombre_titular TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS BILLETERAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    billetera_id TEXT REFERENCES BILLETERAS_DIGITALES (id),
    numero_celular PHONE_NUM NOT NULL
);

CREATE TABLE IF NOT EXISTS TRANSFERENCIAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    banco_id TEXT REFERENCES BANCOS (id),
    numero_cuenta TEXT NOT NULL,
    cci TEXT,
    titular_cuenta TEXT NOT NULL
);

-- 6. RESOURCES & INVENTORY
CREATE TABLE IF NOT EXISTS RECURSOS (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id UUID REFERENCES CATEGORIAS (id),
    precio_por_hora MONEY_AMT DEFAULT 0,
    stock_total INTEGER DEFAULT 0,
    imagen TEXT,
    guia_seguridad TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS INVENTARIO_SEDE (
    sede_id TEXT REFERENCES SEDES (id),
    recurso_id INTEGER REFERENCES RECURSOS (id),
    stock_fisico INTEGER DEFAULT 0,
    precio_overide MONEY_AMT,
    PRIMARY KEY (sede_id, recurso_id)
);

-- 7. RENTALS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS ALQUILERES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    cliente_id TEXT REFERENCES USUARIOS (id),
    vendedor_id TEXT REFERENCES USUARIOS (id),
    sede_id TEXT REFERENCES SEDES (id),
    estado_id TEXT REFERENCES ESTADOS_ALQUILER (id),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin_estimada TIMESTAMPTZ NOT NULL,
    total_servicio MONEY_AMT DEFAULT 0,
    garantia MONEY_AMT DEFAULT 0,
    total_final MONEY_AMT DEFAULT 0,
    total_servicio_calculado MONEY_AMT GENERATED ALWAYS AS (total_servicio) STORED, -- Legacy bridge
    total_final_calculado MONEY_AMT GENERATED ALWAYS AS (total_final) STORED -- Legacy bridge
);

CREATE TABLE IF NOT EXISTS ALQUILER_DETALLES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    recurso_id INTEGER REFERENCES RECURSOS (id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    horas INTEGER NOT NULL DEFAULT 1,
    precio_unitario MONEY_AMT NOT NULL,
    total_item MONEY_AMT GENERATED ALWAYS AS (
        cantidad * horas * precio_unitario
    ) STORED
);

-- 8. COMPATIBILITY VIEWS (Legacy Bridge)
CREATE OR REPLACE VIEW tarjetas_credito AS
SELECT m.id, m.usuario_id, m.tipo_metodo_id, t.emisor_id as marca, t.ultimos_4, t.expiracion, m.es_principal, m.activo
FROM
    MEDIOS_PAGO_USUARIO m
    JOIN TARJETAS_DETALLE t ON m.id = t.medio_pago_id;

-- 9. BUSINESS LOGIC (RPCs)
CREATE OR REPLACE FUNCTION obtener_disponibilidad_recurso(p_recurso_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_ocupados INTEGER;
BEGIN
    SELECT stock_total INTO v_total FROM RECURSOS WHERE id = p_recurso_id;
    
    SELECT COALESCE(SUM(d.cantidad), 0) INTO v_ocupados
    FROM ALQUILER_DETALLES d
    JOIN ALQUILERES a ON a.id = d.alquiler_id
    WHERE d.recurso_id = p_recurso_id 
    AND a.estado_id IN ('en_uso', 'confirmado');

    RETURN jsonb_build_object(
        'disponibles_ahora', GREATEST(0, v_total - v_ocupados),
        'total', v_total
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_cotizacion_pro(p_items JSONB)
RETURNS JSONB AS $$
DECLARE
    v_total MONEY_AMT := 0;
    v_item RECORD;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id int, cantidad int, horas int) LOOP
        v_total := v_total + (SELECT precio_por_hora * v_item.cantidad * v_item.horas FROM RECURSOS WHERE id = v_item.id);
    END LOOP;
    RETURN jsonb_build_object('total', v_total);
END;
$$ LANGUAGE plpgsql;

-- 10. SEED DATA (Infrastructure)
INSERT INTO
    PAISES (id, nombre, prefijo_telefono)
VALUES ('PE', 'Perú', '+51') ON CONFLICT DO NOTHING;

INSERT INTO
    TIPOS_DOCUMENTO (id, nombre)
VALUES ('DNI', 'DNI'),
    ('RUC', 'RUC') ON CONFLICT DO NOTHING;

INSERT INTO
    ROLES (id, nombre)
VALUES ('admin', 'Administrador'),
    ('cliente', 'Cliente'),
    ('vendedor', 'Vendedor') ON CONFLICT DO NOTHING;

INSERT INTO
    ESTADOS_ALQUILER (id, nombre)
VALUES ('confirmado', 'Confirmado'),
    ('en_uso', 'En Uso') ON CONFLICT DO NOTHING;

INSERT INTO
    SEDES (
        id,
        nombre,
        direccion,
        pais_id
    )
VALUES (
        'costa',
        'Sede Costa',
        'Playa 1',
        'PE'
    ) ON CONFLICT DO NOTHING;

INSERT INTO
    EMISORES_TARJETA (id, nombre)
VALUES ('VISA', 'Visa'),
    ('MASTERCARD', 'Mastercard') ON CONFLICT DO NOTHING;

INSERT INTO
    TIPOS_METODO_PAGO (id, nombre)
VALUES ('CREDIT_CARD', 'Tarjeta'),
    ('WALLET', 'Billetera') ON CONFLICT DO NOTHING;

INSERT INTO
    BILLETERAS_DIGITALES (id, nombre)
VALUES ('YAPE', 'Yape'),
    ('PLIN', 'Plin') ON CONFLICT DO NOTHING;