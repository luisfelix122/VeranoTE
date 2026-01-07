-- ====================================================================================
-- PROJECT: VeranoTE - Summer Rental System
-- ARCHITECT: Solutions Architect & Data Modeler (Expert Edition)
-- VERSION: 3.1 PRO (The Golden Standard)
-- DESCRIPTION: High-performance, highly normalized schema with advanced UDTs,
--              automated triggers, unified payments, and business intelligence views.
-- ====================================================================================

-- 1. CLEANUP & INITIAL SETUP
DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

-- Standard Supabase Permissions
GRANT ALL ON SCHEMA public TO postgres,
anon,
authenticated,
service_role;

-- Necessary Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================
-- 2. DOMAINS & UDTs (Data Integrity Layer)
-- ====================================================================================

DO $$ BEGIN
    CREATE DOMAIN EMAIL_ADDR AS TEXT CHECK (VALUE ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$');
    CREATE DOMAIN PHONE_NUM AS TEXT CHECK (VALUE ~* '^\+?[0-9\s\-]{7,15}$');
    CREATE DOMAIN MONEY_AMT AS NUMERIC(12, 2) CHECK (VALUE >= 0);
    CREATE DOMAIN DNI_PERU AS TEXT CHECK (VALUE ~* '^[0-9]{8}$');
    CREATE DOMAIN RUC_PERU AS TEXT CHECK (VALUE ~* '^[0-9]{11}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================================
-- 3. LOOKUP & REFERENCE TABLES (Normalization 3NF)
-- ====================================================================================

CREATE TABLE PAISES (
    id CHAR(2) PRIMARY KEY, -- ISO 3166-1 alpha-2 (PE, US, ES)
    nombre TEXT NOT NULL UNIQUE,
    prefijo_telefono TEXT,
    moneda_simbolo TEXT DEFAULT 'S/'
);

CREATE TABLE ROLES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    nivel_acceso INTEGER DEFAULT 0
);

CREATE TABLE TIPOS_DOCUMENTO (
    id TEXT PRIMARY KEY, -- 'DNI', 'RUC', 'PASAPORTE', 'CE'
    nombre TEXT NOT NULL,
    mascara_validacion TEXT
);

CREATE TABLE ESTADOS_ALQUILER (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    color_hex CHAR(7) DEFAULT '#808080',
    permite_entrega BOOLEAN DEFAULT FALSE,
    permite_devolucion BOOLEAN DEFAULT FALSE
);

CREATE TABLE TIPOS_METODO_PAGO (
    id TEXT PRIMARY KEY, -- 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'TRANSFER'
    nombre TEXT NOT NULL,
    requiere_verificacion BOOLEAN DEFAULT FALSE
);

CREATE TABLE BILLETERAS_DIGITALES (
    id TEXT PRIMARY KEY, -- 'YAPE', 'PLIN'
    nombre TEXT NOT NULL,
    logo_url TEXT
);

CREATE TABLE EMISORES_TARJETA (
    id TEXT PRIMARY KEY, -- 'VISA', 'MASTERCARD', 'AMEX'
    nombre TEXT NOT NULL
);

CREATE TABLE BANCOS (
    id TEXT PRIMARY KEY, -- 'BCP', 'BBVA', 'INTERBANK'
    nombre TEXT NOT NULL,
    pais_id CHAR(2) REFERENCES PAISES (id)
);

-- ====================================================================================
-- 4. INFRASTRUCTURE & ORGANIZATION
-- ====================================================================================

CREATE TABLE SEDES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    pais_id CHAR(2) REFERENCES PAISES (id) DEFAULT 'PE',
    telefono PHONE_NUM,
    correo_contacto EMAIL_ADDR,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 5. USERS & PAYMENT INSTRUMENTS
-- ====================================================================================

CREATE TABLE USUARIOS (
    id TEXT PRIMARY KEY, -- Firebase/Supabase UID
    email EMAIL_ADDR UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    password TEXT, -- Para login bypass o legacy
    tipo_documento_id TEXT REFERENCES TIPOS_DOCUMENTO (id),
    numero_documento TEXT UNIQUE,
    pais_id CHAR(2) REFERENCES PAISES (id) DEFAULT 'PE',
    nacionalidad TEXT DEFAULT 'Nacional',
    fecha_nacimiento DATE,
    licencia_conducir BOOLEAN DEFAULT FALSE,
    rol_id TEXT REFERENCES ROLES (id),
    sede_id TEXT REFERENCES SEDES (id),
    pregunta_secreta TEXT,
    respuesta_secreta TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE CONTACTOS_USUARIO (
    id BIGSERIAL PRIMARY KEY,
    usuario_id TEXT REFERENCES USUARIOS (id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono PHONE_NUM NOT NULL,
    relacion TEXT DEFAULT 'Familiar',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Header table for Payment Methods
CREATE TABLE MEDIOS_PAGO_USUARIO (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_id TEXT REFERENCES USUARIOS (id) ON DELETE CASCADE,
    tipo_metodo_id TEXT REFERENCES TIPOS_METODO_PAGO (id),
    es_principal BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detail: Cards (Credit/Debit)
CREATE TABLE TARJETAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    emisor_id TEXT REFERENCES EMISORES_TARJETA (id),
    tipo_tarjeta TEXT CHECK (
        tipo_tarjeta IN ('CREDITO', 'DEBITO')
    ),
    ultimos_4 CHAR(4) NOT NULL,
    expiracion CHAR(5) NOT NULL, -- MM/YY
    token_seguridad TEXT,
    nombre_titular TEXT
);

-- Detail: Digital Wallets
CREATE TABLE BILLETERAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    billetera_id TEXT REFERENCES BILLETERAS_DIGITALES (id),
    numero_celular PHONE_NUM NOT NULL
);

-- Detail: Bank Transfers
CREATE TABLE TRANSFERENCIAS_DETALLE (
    medio_pago_id UUID PRIMARY KEY REFERENCES MEDIOS_PAGO_USUARIO (id) ON DELETE CASCADE,
    banco_id TEXT REFERENCES BANCOS (id),
    numero_cuenta TEXT NOT NULL,
    cci TEXT, -- Código de Cuenta Interbancaria
    titular_cuenta TEXT
);

-- ====================================================================================
-- 6. INVENTORY & RESOURCES
-- ====================================================================================

CREATE TABLE CATEGORIAS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nombre TEXT UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE PROMOCIONES (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo_cupon TEXT UNIQUE,
    tipo_descuento TEXT DEFAULT 'porcentaje', -- 'porcentaje', 'fijo'
    valor_descuento MONEY_AMT NOT NULL,
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE RECURSOS (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id UUID REFERENCES CATEGORIAS (id),
    precio_base_hora MONEY_AMT DEFAULT 0,
    stock_total INTEGER DEFAULT 1,
    imagen TEXT, -- URL de la imagen
    guia_seguridad TEXT, -- Texto o URL MD
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE INVENTARIO_SEDE (
    sede_id TEXT REFERENCES SEDES (id),
    recurso_id INTEGER REFERENCES RECURSOS (id),
    stock_fisico INTEGER NOT NULL DEFAULT 0,
    precio_overrided MONEY_AMT,
    activo BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (sede_id, recurso_id)
);

CREATE TABLE SERVICIOS (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    icono TEXT
);

CREATE TABLE SEDE_SERVICIOS (
    sede_id TEXT REFERENCES SEDES (id),
    servicio_id INTEGER REFERENCES SERVICIOS (id),
    PRIMARY KEY (sede_id, servicio_id)
);

CREATE TABLE HORARIOS_SEDE (
    id SERIAL PRIMARY KEY,
    sede_id TEXT REFERENCES SEDES (id),
    dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6),
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    cerrado BOOLEAN DEFAULT FALSE
);

-- ====================================================================================
-- 7. TRANSACTIONS (CABECERA & DETALLE)
-- ====================================================================================


CREATE TABLE ALQUILERES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_ticket TEXT UNIQUE NOT NULL,
    cliente_id TEXT REFERENCES USUARIOS(id),
    vendedor_id TEXT REFERENCES USUARIOS(id),
    sede_id TEXT REFERENCES SEDES(id),
    estado_id TEXT REFERENCES ESTADOS_ALQUILER(id) DEFAULT 'PENDIENTE',
    
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_entrega_real TIMESTAMPTZ,
    fecha_devolucion_estimada TIMESTAMPTZ NOT NULL,
    fecha_devolucion_real TIMESTAMPTZ,

-- Money Snapshots


monto_subtotal MONEY_AMT NOT NULL DEFAULT 0,
    monto_igv MONEY_AMT NOT NULL DEFAULT 0,
    monto_garantia MONEY_AMT NOT NULL DEFAULT 0,
    monto_descuento MONEY_AMT DEFAULT 0,
    monto_total_final MONEY_AMT NOT NULL DEFAULT 0,
    monto_pagado MONEY_AMT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_fechas CHECK (fecha_devolucion_estimada > fecha_inicio)
);

CREATE TABLE ALQUILER_DETALLES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id) ON DELETE CASCADE,
    recurso_id INTEGER REFERENCES RECURSOS (id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    horas INTEGER NOT NULL DEFAULT 1,
    precio_unitario_snapshot MONEY_AMT NOT NULL,
    total_item MONEY_AMT GENERATED ALWAYS AS (
        cantidad * horas * precio_unitario_snapshot
    ) STORED
);

CREATE TABLE PAGOS_TRANSACCION (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    alquiler_id UUID REFERENCES ALQUILERES (id),
    medio_pago_id UUID REFERENCES MEDIOS_PAGO_USUARIO (id), -- Opcional si es efectivo
    tipo_metodo_id TEXT REFERENCES TIPOS_METODO_PAGO (id),
    monto MONEY_AMT NOT NULL,
    referencia_operacion TEXT,
    fecha_pago TIMESTAMPTZ DEFAULT NOW()
);

-- Infraestructura de Contenido y Configuración
CREATE TABLE CONFIGURACION (
    clave TEXT PRIMARY KEY,
    valor TEXT,
    descripcion TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE CONTENIDO_WEB (
    clave TEXT PRIMARY KEY,
    valor TEXT,
    tipo TEXT DEFAULT 'text',
    seccion TEXT
);

CREATE TABLE PAGINAS (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    contenido TEXT,
    meta_descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE FAQS (
    id SERIAL PRIMARY KEY,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

-- Soporte y Mensajes
CREATE TABLE SOPORTE_TICKETS (
    id SERIAL PRIMARY KEY,
    usuario_id TEXT REFERENCES USUARIOS (id),
    asunto TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_espera', 'resuelto'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE MENSAJES (
    id BIGSERIAL PRIMARY KEY,
    remitente_id TEXT REFERENCES USUARIOS (id),
    destinatario_id TEXT REFERENCES USUARIOS (id),
    asunto TEXT,
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================================
-- 8. AUDIT SYSTEM (The "Expert" Trace)
-- ====================================================================================

CREATE TABLE AUDITORIA_LOG (
    id BIGSERIAL PRIMARY KEY,
    tabla_nombre TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    accion TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    usuario_id TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha_evento TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

CREATE OR REPLACE FUNCTION audit_trigger() 
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO AUDITORIA_LOG (tabla_nombre, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, 
            COALESCE(NEW.id::text, OLD.id::text), 
            TG_OP, 
            auth.uid()::text, 
            v_old_data, 
            v_new_data);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit to critical tables
CREATE TRIGGER trg_audit_alquileres AFTER INSERT OR UPDATE OR DELETE ON ALQUILERES FOR EACH ROW EXECUTE PROCEDURE audit_trigger();

CREATE TRIGGER trg_audit_usuarios AFTER INSERT OR UPDATE OR DELETE ON USUARIOS FOR EACH ROW EXECUTE PROCEDURE audit_trigger();

-- ====================================================================================
-- 9. PERFORMANCE INDEXES
-- ====================================================================================

-- GIN Index for JSONB data
CREATE INDEX idx_alquiler_factura_json ON ALQUILERES USING GIN (datos_factura_snapshot);

-- Partial Index for active resources
CREATE INDEX idx_recursos_activos ON RECURSOS (categoria_id)
WHERE
    activo = TRUE;

-- Compound Index for availability queries
CREATE INDEX idx_disponibilidad_lookup ON ALQUILERES (
    sede_id,
    estado_id,
    fecha_inicio,
    fecha_devolucion_estimada
);

-- Index for payment methods
CREATE INDEX idx_medios_pago_usuario ON MEDIOS_PAGO_USUARIO (usuario_id, tipo_metodo_id);

-- ====================================================================================
-- 10. AUTOMATION (Triggers & Functions)
-- ====================================================================================

-- A. Generic Timestamp Updater
CREATE OR REPLACE FUNCTION update_timestamp() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B. Apply Timestamps to all tables with updated_at
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public') 
    LOOP
        EXECUTE format('CREATE TRIGGER trg_update_timestamp_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_timestamp()', t, t);
    END LOOP;
END $$;

-- C. Auto-calculate Alquiler Balance
CREATE OR REPLACE FUNCTION sync_alquiler_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ALQUILERES 
    SET monto_pagado = (SELECT COALESCE(SUM(monto), 0) FROM PAGOS_TRANSACCION WHERE alquiler_id = NEW.alquiler_id)
    WHERE id = NEW.alquiler_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_payments AFTER INSERT OR UPDATE ON PAGOS_TRANSACCION
FOR EACH ROW EXECUTE PROCEDURE sync_alquiler_payment();

-- ====================================================================================
-- 11. CUSTOM TYPES & VIEW REFINEMENT
-- ====================================================================================

CREATE TYPE RENTAL_SUMMARY AS (
    ticket_code TEXT,
    cliente_nombre TEXT,
    total_final MONEY_AMT,
    saldo MONEY_AMT
);

CREATE OR REPLACE VIEW v_deudores AS
SELECT
    a.codigo_ticket,
    u.nombre as cliente,
    a.monto_total_final,
    a.monto_pagado,
    (
        a.monto_total_final - a.monto_pagado
    ) as saldo_pendiente
FROM ALQUILERES a
    JOIN USUARIOS u ON a.cliente_id = u.id
WHERE (
        a.monto_total_final - a.monto_pagado
    ) > 0;

-- ====================================================================================
-- 12. BUSINESS LOGIC (Expert RPCs)
-- ====================================================================================

CREATE VIEW v_kpi_diario AS
SELECT 
    CURRENT_DATE as fecha,
    COUNT(id) as total_alquileres,
    SUM(monto_total_final) as ingresos_proyectados,
    SUM(monto_pagado) as ingresos_reales,
    SUM(monto_total_final - monto_pagado) as deuda_pendiente
FROM ALQUILERES
WHERE created_at::DATE = CURRENT_DATE;

CREATE VIEW v_ranking_clientes AS
SELECT
    u.id,
    u.nombre,
    COUNT(a.id) as frecuencia,
    SUM(a.monto_total_final) as valor_monetario,
    MAX(a.fecha_inicio) as ultima_visita
FROM USUARIOS u
    JOIN ALQUILERES a ON u.id = a.cliente_id
GROUP BY
    u.id,
    u.nombre
ORDER BY valor_monetario DESC;

-- ====================================================================================
-- 10. POLICIES & SECURITY (RLS)
-- ====================================================================================

ALTER TABLE USUARIOS ENABLE ROW LEVEL SECURITY;

ALTER TABLE ALQUILERES ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON USUARIOS FOR SELECT 
USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can view their own rentals" ON ALQUILERES FOR SELECT 
USING (auth.uid()::TEXT = cliente_id);

-- ====================================================================================
-- 11. INITIAL SEED (Expert Foundation)
-- ====================================================================================

INSERT INTO
    PAISES (id, nombre, prefijo_telefono)
VALUES ('PE', 'Perú', '+51'),
    ('US', 'Estados Unidos', '+1');

INSERT INTO
    TIPOS_DOCUMENTO (id, nombre)
VALUES ('DNI', 'DNI (Perú)'),
    ('RUC', 'RUC (Perú)'),
    ('PAS', 'Pasaporte');

INSERT INTO
    ROLES (id, nombre, nivel_acceso)
VALUES (
        'admin',
        'Administrador Global',
        100
    ),
    (
        'vendedor',
        'Vendedor de Sede',
        50
    ),
    (
        'cliente',
        'Cliente Estándar',
        1
    );

INSERT INTO
    TIPOS_METODO_PAGO (id, nombre)
VALUES ('CASH', 'Efectivo'),
    (
        'CREDIT_CARD',
        'Tarjeta de Crédito'
    ),
    (
        'DEBIT_CARD',
        'Tarjeta de Débito'
    ),
    (
        'WALLET',
        'Billetera Digital (Yape/Plin)'
    );

INSERT INTO
    BILLETERAS_DIGITALES (id, nombre)
VALUES ('YAPE', 'Yape'),
    ('PLIN', 'Plin');

INSERT INTO
    EMISORES_TARJETA (id, nombre)
VALUES ('VISA', 'Visa'),
    ('MASTERCARD', 'Mastercard'),
    ('AMEX', 'American Express');

INSERT INTO
    BANCOS (id, nombre, pais_id)
VALUES (
        'BCP',
        'Banco de Crédito del Perú',
        'PE'
    ),
    (
        'BBVA',
        'BBVA Continental',
        'PE'
    ),
    (
        'INTERBANK',
        'Interbank',
        'PE'
    );

INSERT INTO
    ESTADOS_ALQUILER (
        id,
        nombre,
        color_hex,
        permite_entrega,
        permite_devolucion
    )
VALUES (
        'PENDIENTE',
        'Pendiente de Pago',
        '#FFA500',
        FALSE,
        FALSE
    ),
    (
        'CONFIRMADO',
        'Pago Realizado',
        '#0000FF',
        TRUE,
        FALSE
    ),
    (
        'EN_USO',
        'Equipo Entregado',
        '#00FF00',
        FALSE,
        TRUE
    ),
    (
        'RETORNADO',
        'Finalizado',
        '#808080',
        FALSE,
        FALSE
    );

INSERT INTO
    SEDES (id, nombre, direccion)
VALUES (
        'costa',
        'Sede Paracas (Costa)',
        'Malecón El Chaco S/N'
    );

-- ====================================================================================
-- 12. BUSINESS LOGIC (Expert RPCs)
-- ====================================================================================

-- A. Availability Engine
CREATE OR REPLACE FUNCTION obtener_disponibilidad_recurso(
    p_recurso_id INTEGER,
    p_fecha TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_total_fisico INTEGER;
    v_reservados INTEGER;
    v_fecha_evaluar TIMESTAMP WITH TIME ZONE := COALESCE(p_fecha, NOW());
BEGIN
    SELECT stock_total INTO v_total_fisico FROM RECURSOS WHERE id = p_recurso_id;
    
    SELECT COALESCE(SUM(d.cantidad), 0) INTO v_reservados
    FROM ALQUILER_DETALLES d JOIN ALQUILERES a ON a.id = d.alquiler_id
    WHERE d.recurso_id = p_recurso_id 
      AND a.estado_id NOT IN ('RETORNADO', 'CANCELADO')
      AND (a.fecha_inicio < (v_fecha_evaluar + interval '1 hour') AND a.fecha_devolucion_estimada > v_fecha_evaluar);

    RETURN jsonb_build_object(
        'disponibles', GREATEST(0, v_total_fisico - v_reservados),
        'total', v_total_fisico
    );
END;
$$ LANGUAGE plpgsql;

-- Legacy Bridge View for Unified Payment Methods
CREATE OR REPLACE VIEW tarjetas_credito AS
SELECT m.id, m.usuario_id, m.tipo_metodo_id, t.emisor_id as marca, t.ultimos_4, t.expiracion, m.es_principal, m.activo
FROM
    MEDIOS_PAGO_USUARIO m
    LEFT JOIN TARJETAS_DETALLE t ON m.id = t.medio_pago_id
WHERE
    m.tipo_metodo_id IN ('CREDIT_CARD', 'DEBIT_CARD');

-- B. Unified Pricing & Promotions
CREATE OR REPLACE FUNCTION calcular_cotizacion_pro(
    p_items JSONB,
    p_cupon TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_subtotal MONEY_AMT := 0;
    v_garantia MONEY_AMT := 0;
    v_descuento MONEY_AMT := 0;
    v_igv_rate NUMERIC := 0.18;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_subtotal := v_subtotal + ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC);
    END LOOP;
    
    -- Simplificado para esta versión PRO inicial: 20% Garantía
    v_garantia := v_subtotal * 0.20;
    
    RETURN jsonb_build_object(
        'subtotal', v_subtotal,
        'igv', v_subtotal * v_igv_rate,
        'garantia', v_garantia,
        'total', (v_subtotal * (1 + v_igv_rate)) + v_garantia - v_descuento
    );
END;
$$ LANGUAGE plpgsql;

-- C. Robust Transactional Rental Creation
CREATE OR REPLACE FUNCTION crear_reserva_pro(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB,
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_fecha_fin TIMESTAMP WITH TIME ZONE,
    p_medio_pago_id UUID DEFAULT NULL, -- ID del medio de pago del usuario
    p_tipo_metodo_id TEXT DEFAULT 'CASH',
    p_cupon TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_cotizacion JSONB;
    v_alquiler_id UUID;
    v_item JSONB;
    v_ticket_code TEXT := upper(substring(gen_random_uuid()::text from 1 for 8));
BEGIN
    v_cotizacion := calcular_cotizacion_pro(p_items, p_cupon);
    
    INSERT INTO ALQUILERES (
        codigo_ticket, cliente_id, vendedor_id, sede_id, 
        fecha_inicio, fecha_devolucion_estimada,
        monto_subtotal, monto_igv, monto_garantia, monto_total_final,
        estado_id
    ) VALUES (
        v_ticket_code, p_cliente_id, p_vendedor_id, p_sede_id,
        p_fecha_inicio, p_fecha_fin,
        (v_cotizacion->>'subtotal')::NUMERIC, (v_cotizacion->>'igv')::NUMERIC, 
        (v_cotizacion->>'garantia')::NUMERIC, (v_cotizacion->>'total')::NUMERIC,
        'PENDIENTE'
    ) RETURNING id INTO v_alquiler_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO ALQUILER_DETALLES (alquiler_id, recurso_id, cantidad, horas, precio_unitario_snapshot)
        VALUES (v_alquiler_id, (v_item->>'id')::INTEGER, (v_item->>'cantidad')::INTEGER, (v_item->>'horas')::INTEGER, (v_item->>'precioPorHora')::NUMERIC);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'alquiler_id', v_alquiler_id, 'codigo_ticket', v_ticket_code);
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 14. STORED PROCEDURES (Explicit Control Flow)
-- ====================================================================================

-- Procedimiento para Cierre de Día (Batch processing)
CREATE OR REPLACE PROCEDURE cerrar_caja_diaria(p_sede_id TEXT, p_vendedor_id TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Lógica de negocio experta: Mover pagos pendientes a estados de auditoría
    -- Esto es un ejemplo de Procedimiento (no retorna valores, solo ejecuta acciones)
    UPDATE ALQUILERES 
    SET estado_id = 'RETORNADO' 
    WHERE sede_id = p_sede_id 
      AND estado_id = 'EN_USO' 
      AND fecha_devolucion_estimada < NOW();
      
    COMMIT;
END;
$$;

-- ====================================================================================
-- 15. ADVANCED CURSORS (Heavy Reporting Logic)
-- ====================================================================================

CREATE OR REPLACE FUNCTION reporte_mensual_eficiente()
RETURNS TABLE(mes TEXT, total_ventas MONEY_AMT) AS $$
DECLARE
    v_cursor CURSOR FOR SELECT TO_CHAR(created_at, 'YYYY-MM'), monto_total_final FROM ALQUILERES;
    v_mes TEXT;
    v_monto MONEY_AMT;
BEGIN
    -- Uso de cursores para procesamiento fila a fila si el dataset fuera masivo
    OPEN v_cursor;
    LOOP
        FETCH v_cursor INTO v_mes, v_monto;
        EXIT WHEN NOT FOUND;
        mes := v_mes;
        total_ventas := v_monto;
        RETURN NEXT;
    END LOOP;
    CLOSE v_cursor;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 16. DATA INTEGRITY (Complex Checks)
-- ====================================================================================

ALTER TABLE USUARIOS
ADD CONSTRAINT check_tipo_documento_coherencia CHECK (
    (
        tipo_documento_id = 'DNI'
        AND numero_documento ~ '^[0-9]{8}$'
    )
    OR (
        tipo_documento_id = 'RUC'
        AND numero_documento ~ '^[0-9]{11}$'
    )
    OR (
        tipo_documento_id NOT IN('DNI', 'RUC')
    )
);

-- FIN SCHEMA EXPERT v3.1 PRO (Ultra Edition)