-- ==============================================================================
-- SCRIPT DE BASE DE DATOS COMPLETA - VERANO RENTAL SYSTEM
-- ==============================================================================
-- Este script incluye:
-- 1. Esquema base (Tablas, Funciones, Triggers)
-- 2. Tablas de Soporte y Mensajería (Corregidas)
-- 3. Datos Semilla (Incluyendo 40+ recursos y guías de seguridad)

-- 1. LIMPIEZA INICIAL
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLAS DE CONFIGURACIÓN Y AUDITORÍA
-- ==============================================================================

CREATE TABLE CONFIGURACION (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT
);

ALTER TABLE CONFIGURACION ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de configuración" ON CONFIGURACION FOR SELECT USING (true);

INSERT INTO CONFIGURACION (clave, valor, descripcion) VALUES
('IGV', '0.18', 'Impuesto General a las Ventas'),
('GARANTIA_PORCENTAJE', '0.20', 'Porcentaje de garantía sobre el total del servicio'),
('TIEMPO_GRACIA_MINUTOS', '15', 'Minutos de tolerancia para devoluciones'),
('ADELANTO_RESERVA_ANTICIPADA', '0.60', 'Porcentaje requerido para reservas anticipadas'),
('BANNER_TITULO', 'Tu Aventura de Verano Comienza Aquí', 'Título principal del banner'),
('BANNER_SUBTITULO', 'Alquila los mejores equipos para disfrutar del sol, la playa y la naturaleza.', 'Subtítulo del banner'),
('BANNER_IMAGEN_URL', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1600', 'URL de la imagen de fondo del banner'),
('CONTACTO_TELEFONO', '(01) 555-0123', 'Teléfono de contacto general'),
('CONTACTO_EMAIL', 'contacto@alquileresperuanos.pe', 'Correo de contacto general');

CREATE TABLE AUDITORIA (
    id SERIAL PRIMARY KEY,
    tabla TEXT NOT NULL,
    operacion TEXT NOT NULL,
    usuario TEXT DEFAULT 'sistema',
    datos_antiguos JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION registrar_auditoria() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO AUDITORIA (tabla, operacion, usuario, datos_antiguos)
        VALUES (TG_TABLE_NAME, 'DELETE', current_user, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO AUDITORIA (tabla, operacion, usuario, datos_antiguos, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'UPDATE', current_user, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO AUDITORIA (tabla, operacion, usuario, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'INSERT', current_user, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABLAS MAESTRAS (LOOKUPS)
-- ==============================================================================

CREATE TABLE ROLES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE CATEGORIAS (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE ESTADOS_ALQUILER (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    es_final TEXT DEFAULT 'false'
);

CREATE TABLE METODOS_PAGO (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE SERVICIOS (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- ==============================================================================
-- 4. TABLAS PRINCIPALES
-- ==============================================================================

CREATE TABLE SEDES (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    descripcion TEXT,
    imagen TEXT,
    telefono TEXT,
    correo_contacto TEXT,
    mapa_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE HORARIOS_SEDE (
    id SERIAL PRIMARY KEY,
    sede_id TEXT REFERENCES SEDES(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_apertura TIME,
    hora_cierre TIME,
    cerrado BOOLEAN DEFAULT FALSE,
    UNIQUE(sede_id, dia_semana)
);

ALTER TABLE HORARIOS_SEDE ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de horarios" ON HORARIOS_SEDE FOR SELECT USING (true);

CREATE TABLE SEDE_SERVICIOS (
    sede_id TEXT REFERENCES SEDES(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES SERVICIOS(id) ON DELETE CASCADE,
    PRIMARY KEY (sede_id, servicio_id)
);

CREATE TABLE USUARIOS (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol_id TEXT NOT NULL REFERENCES ROLES(id),
    nombre TEXT NOT NULL,
    telefono TEXT,
    tipo_documento TEXT,
    numero_documento TEXT,
    fecha_nacimiento DATE,
    licencia_conducir BOOLEAN DEFAULT FALSE,
    nacionalidad TEXT,
    direccion TEXT,
    contacto_emergencia TEXT,
    anexo TEXT,
    oficina TEXT,
    codigo_empleado TEXT,
    turno TEXT,
    especialidad TEXT,
    experiencia TEXT,
    sede_id TEXT REFERENCES SEDES(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE RECURSOS (
    id SERIAL PRIMARY KEY,
    sede_id TEXT NOT NULL REFERENCES SEDES(id),
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES CATEGORIAS(id),
    precio_por_hora NUMERIC(10, 2) NOT NULL CHECK (precio_por_hora >= 0),
    stock_total INTEGER NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
    imagen TEXT,
    descripcion TEXT,
    guia_seguridad TEXT, -- Nueva columna agregada
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE PROMOCIONES (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('regla_tiempo', 'regla_cantidad')),
    condicion JSONB NOT NULL, 
    beneficio JSONB NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ALQUILERES (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    codigo_reserva TEXT UNIQUE DEFAULT substring(uuid_generate_v4()::text from 1 for 8),
    cliente_id TEXT NOT NULL REFERENCES USUARIOS(id),
    vendedor_id TEXT REFERENCES USUARIOS(id),
    sede_id TEXT NOT NULL REFERENCES SEDES(id),
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin_estimada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_devolucion_real TIMESTAMP WITH TIME ZONE,
    total_bruto NUMERIC(10, 2) NOT NULL DEFAULT 0,
    descuento_promociones NUMERIC(10, 2) DEFAULT 0,
    total_servicio NUMERIC(10, 2) NOT NULL,
    garantia NUMERIC(10, 2) NOT NULL,
    total_final NUMERIC(10, 2) NOT NULL,
    monto_pagado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tipo_reserva TEXT NOT NULL CHECK (tipo_reserva IN ('inmediata', 'anticipada')),
    metodo_pago_id TEXT NOT NULL REFERENCES METODOS_PAGO(id),
    tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('boleta', 'factura')),
    datos_factura JSONB,
    estado_id TEXT NOT NULL REFERENCES ESTADOS_ALQUILER(id) DEFAULT 'pendiente',
    penalizacion NUMERIC(10, 2) DEFAULT 0,
    notas TEXT,
    contrato_firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ALQUILER_DETALLES (
    id SERIAL PRIMARY KEY,
    alquiler_id TEXT NOT NULL REFERENCES ALQUILERES(id) ON DELETE CASCADE,
    recurso_id INTEGER NOT NULL REFERENCES RECURSOS(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    horas INTEGER NOT NULL CHECK (horas > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

CREATE TABLE MANTENIMIENTOS (
    id SERIAL PRIMARY KEY,
    recurso_id INTEGER NOT NULL REFERENCES RECURSOS(id),
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    descripcion TEXT,
    costo NUMERIC(10, 2) DEFAULT 0,
    estado TEXT NOT NULL CHECK (estado IN ('en_proceso', 'finalizado')) DEFAULT 'en_proceso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLAS DE SOPORTE Y MENSAJERÍA (CORREGIDAS)
-- ==============================================================================

-- Tabla de Tarjetas (Simulación)
CREATE TABLE TARJETAS_CREDITO (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    usuario_id TEXT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    numero_oculto TEXT NOT NULL,
    token TEXT NOT NULL,
    expiracion TEXT NOT NULL,
    titular TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE TARJETAS_CREDITO ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acceso total a tarjetas" ON TARJETAS_CREDITO FOR ALL USING (true);

-- Tabla de Tickets de Soporte (Corregida con FK a public.usuarios)
CREATE TABLE SOPORTE_TICKETS (
    id SERIAL PRIMARY KEY,
    usuario_id TEXT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    asunto TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    respuesta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE SOPORTE_TICKETS ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso Total Soporte" ON SOPORTE_TICKETS FOR ALL USING (true) WITH CHECK (true);

-- Tabla de Mensajes (Corregida)
CREATE TABLE MENSAJES (
    id SERIAL PRIMARY KEY,
    remitente_id TEXT REFERENCES USUARIOS(id),
    destinatario_id TEXT REFERENCES USUARIOS(id),
    asunto TEXT,
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    tipo TEXT DEFAULT 'mensaje',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE MENSAJES ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso Total Mensajes" ON MENSAJES FOR ALL USING (true) WITH CHECK (true);

-- Vista de Reclamos
CREATE OR REPLACE VIEW v_mis_reclamos AS
SELECT
    t.id,
    t.created_at,
    t.asunto,
    t.mensaje,
    t.estado,
    t.usuario_id,
    u.nombre as nombre_usuario,
    u.email as email_usuario,
    t.updated_at as ultima_actualizacion
FROM
    soporte_tickets t
JOIN
    usuarios u ON t.usuario_id = u.id;

GRANT SELECT ON v_mis_reclamos TO anon;
GRANT SELECT ON v_mis_reclamos TO authenticated;

-- ==============================================================================
-- 6. TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON USUARIOS FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sedes_updated BEFORE UPDATE ON SEDES FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_recursos_updated BEFORE UPDATE ON RECURSOS FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_alquileres_updated BEFORE UPDATE ON ALQUILERES FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_audit_alquileres AFTER INSERT OR UPDATE OR DELETE ON ALQUILERES FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_recursos AFTER INSERT OR UPDATE OR DELETE ON RECURSOS FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_usuarios AFTER INSERT OR UPDATE OR DELETE ON USUARIOS FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- ==============================================================================
-- 7. FUNCIONES DE NEGOCIO (RPCs)
-- ==============================================================================
-- (Incluiremos las funciones robustas aquí, resumidas para brevedad del paso, pero completas en el archivo)

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

-- B. Calcular Descuento
CREATE OR REPLACE FUNCTION calcular_descuento_simulado(p_items JSONB, p_fecha_inicio TIMESTAMP WITH TIME ZONE) RETURNS JSONB AS $$
DECLARE
    v_promo RECORD; v_item JSONB; v_descuento_total NUMERIC := 0; v_alertas TEXT[] := ARRAY[]::TEXT[]; v_promos_aplicadas JSONB[] := ARRAY[]::JSONB[]; v_monto_base_items NUMERIC; v_cantidad_total INTEGER; v_desc_monto NUMERIC;
BEGIN
    FOR v_promo IN SELECT * FROM PROMOCIONES WHERE activo = TRUE LOOP
        IF v_promo.tipo = 'regla_tiempo' THEN
            v_monto_base_items := 0;
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                IF (v_item->>'horas')::INTEGER > (v_promo.condicion->>'minHoras')::INTEGER THEN
                    v_monto_base_items := v_monto_base_items + ((v_item->>'precioPorHora')::NUMERIC * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                END IF;
            END LOOP;
            IF v_monto_base_items > 0 THEN
                v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;
        ELSIF v_promo.tipo = 'regla_cantidad' THEN
            v_cantidad_total := 0; v_monto_base_items := 0;
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                IF (v_promo.condicion->>'categoria') IS NULL OR (v_promo.condicion->>'categoria') = (v_item->>'categoria') THEN
                    v_cantidad_total := v_cantidad_total + (v_item->>'cantidad')::INTEGER;
                    v_monto_base_items := v_monto_base_items + ((v_item->>'precioPorHora')::NUMERIC * (v_item->>'horas')::INTEGER * (v_item->>'cantidad')::INTEGER);
                END IF;
            END LOOP;
            IF v_cantidad_total >= (v_promo.condicion->>'minCantidad')::INTEGER THEN
                v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;
        END IF;
    END LOOP;
    RETURN jsonb_build_object('descuentoTotal', v_descuento_total, 'alertas', v_alertas, 'promocionesAplicadas', v_promos_aplicadas);
END;
$$ LANGUAGE plpgsql;

-- C. Crear Reserva Robusta
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT, p_vendedor_id TEXT, p_sede_id TEXT, p_items JSONB, p_fecha_inicio TIMESTAMP WITH TIME ZONE, p_tipo_reserva TEXT, p_metodo_pago_id TEXT, p_tipo_comprobante TEXT, p_datos_factura JSONB
) RETURNS JSONB AS $$
DECLARE
    v_disponibilidad JSONB; v_calculo_descuento JSONB; v_alquiler_id TEXT; v_item JSONB; v_total_bruto NUMERIC := 0; v_descuento NUMERIC := 0; v_total_servicio NUMERIC; v_garantia NUMERIC; v_total_final NUMERIC; v_monto_pagado NUMERIC; v_saldo_pendiente NUMERIC; v_config_garantia NUMERIC; v_config_adelanto NUMERIC; v_fecha_fin_estimada TIMESTAMP WITH TIME ZONE; v_max_horas INTEGER := 0;
BEGIN
    v_disponibilidad := verificar_disponibilidad_items(p_fecha_inicio, p_items);
    IF (v_disponibilidad->>'valido')::BOOLEAN = false THEN RETURN jsonb_build_object('success', false, 'error', v_disponibilidad->>'mensaje'); END IF;

    SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
    SELECT valor::NUMERIC INTO v_config_adelanto FROM CONFIGURACION WHERE clave = 'ADELANTO_RESERVA_ANTICIPADA';

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_total_bruto := v_total_bruto + ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC);
        IF (v_item->>'horas')::INTEGER > v_max_horas THEN v_max_horas := (v_item->>'horas')::INTEGER; END IF;
    END LOOP;

    v_calculo_descuento := calcular_descuento_simulado(p_items, p_fecha_inicio);
    v_descuento := (v_calculo_descuento->>'descuentoTotal')::NUMERIC;
    v_total_servicio := v_total_bruto - v_descuento;
    v_garantia := v_total_servicio * v_config_garantia;
    v_total_final := v_total_servicio + v_garantia;
    v_monto_pagado := CASE WHEN p_tipo_reserva = 'anticipada' THEN v_total_final * v_config_adelanto ELSE v_total_final END;
    v_saldo_pendiente := v_total_final - v_monto_pagado;
    v_fecha_fin_estimada := p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL;

    INSERT INTO ALQUILERES (cliente_id, vendedor_id, sede_id, fecha_inicio, fecha_fin_estimada, total_bruto, descuento_promociones, total_servicio, garantia, total_final, monto_pagado, saldo_pendiente, tipo_reserva, metodo_pago_id, tipo_comprobante, datos_factura, estado_id, contrato_firmado, fecha_firma)
    VALUES (p_cliente_id, p_vendedor_id, p_sede_id, p_fecha_inicio, v_fecha_fin_estimada, v_total_bruto, v_descuento, v_total_servicio, v_garantia, v_total_final, v_monto_pagado, v_saldo_pendiente, p_tipo_reserva, p_metodo_pago_id, p_tipo_comprobante, p_datos_factura, CASE WHEN v_saldo_pendiente = 0 THEN 'confirmado' ELSE 'pendiente' END, TRUE, NOW()) RETURNING id INTO v_alquiler_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO ALQUILER_DETALLES (alquiler_id, recurso_id, cantidad, horas, precio_unitario, subtotal)
        VALUES (v_alquiler_id, (v_item->>'id')::INTEGER, (v_item->>'cantidad')::INTEGER, (v_item->>'horas')::INTEGER, (v_item->>'precioPorHora')::NUMERIC, ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC));
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_alquiler_id, 'total_final', v_total_final);
END;
$$ LANGUAGE plpgsql;

-- D. Registrar Devolución
CREATE OR REPLACE FUNCTION registrar_devolucion_robusta(p_alquiler_id TEXT) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD; v_detalle RECORD; v_fecha_devolucion TIMESTAMP WITH TIME ZONE := NOW(); v_penalizacion_total NUMERIC := 0; v_config_gracia INTEGER;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Alquiler no encontrado'); END IF;
    SELECT valor::INTEGER INTO v_config_gracia FROM CONFIGURACION WHERE clave = 'TIEMPO_GRACIA_MINUTOS';

    FOR v_detalle IN SELECT * FROM ALQUILER_DETALLES WHERE alquiler_id = p_alquiler_id LOOP
        IF v_fecha_devolucion > (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL) THEN
            IF (EXTRACT(EPOCH FROM (v_fecha_devolucion - (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL))) / 60) > v_config_gracia THEN
                v_penalizacion_total := v_penalizacion_total + (CEIL((EXTRACT(EPOCH FROM (v_fecha_devolucion - (v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL))) / 60) / 60.0) * v_detalle.precio_unitario * 2 * v_detalle.cantidad);
            END IF;
        END IF;
    END LOOP;

    UPDATE ALQUILERES SET fecha_devolucion_real = v_fecha_devolucion, penalizacion = v_penalizacion_total, total_final = total_final + v_penalizacion_total, estado_id = 'limpieza', updated_at = NOW() WHERE id = p_alquiler_id;
    RETURN jsonb_build_object('success', true, 'penalizacion', v_penalizacion_total);
END;
$$ LANGUAGE plpgsql;

-- E. Entregar Alquiler
CREATE OR REPLACE FUNCTION entregar_alquiler_robusto(p_alquiler_id TEXT) RETURNS JSONB AS $$
DECLARE v_alquiler RECORD;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    IF v_alquiler.saldo_pendiente > 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Saldo pendiente'); END IF;
    UPDATE ALQUILERES SET estado_id = 'en_uso', updated_at = NOW() WHERE id = p_alquiler_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- F. Gestionar Mantenimiento
CREATE OR REPLACE FUNCTION gestionar_mantenimiento(p_recurso_id INTEGER, p_accion TEXT, p_motivo TEXT DEFAULT NULL) RETURNS JSONB AS $$
BEGIN
    IF p_accion = 'iniciar' THEN
        INSERT INTO MANTENIMIENTOS (recurso_id, descripcion, estado) VALUES (p_recurso_id, p_motivo, 'en_proceso');
        UPDATE RECURSOS SET activo = FALSE WHERE id = p_recurso_id;
        RETURN jsonb_build_object('success', true);
    ELSIF p_accion = 'finalizar' THEN
        UPDATE MANTENIMIENTOS SET fecha_fin = NOW(), estado = 'finalizado' WHERE recurso_id = p_recurso_id AND estado = 'en_proceso';
        UPDATE RECURSOS SET activo = TRUE WHERE id = p_recurso_id;
        RETURN jsonb_build_object('success', true);
    END IF;
    RETURN jsonb_build_object('success', false);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 8. DATOS SEMILLA (SEED DATA)
-- ==============================================================================
-- Roles
INSERT INTO ROLES (id, nombre) VALUES ('admin', 'Administrador'), ('cliente', 'Cliente'), ('vendedor', 'Vendedor'), ('dueno', 'Dueño'), ('mecanico', 'Mecánico');

-- Categorías
INSERT INTO CATEGORIAS (nombre) VALUES ('Acuático'), ('Terrestre'), ('Motor'), ('Playa'), ('Camping');

-- Estados
INSERT INTO ESTADOS_ALQUILER (id, nombre, es_final) VALUES 
('pendiente', 'Pendiente de Pago', 'false'),
('confirmado', 'Confirmado', 'false'),
('en_uso', 'En Uso', 'false'),
('listo_para_entrega', 'Listo para Entrega', 'false'),
('limpieza', 'En Limpieza', 'false'),
('en_mantenimiento', 'En Mantenimiento', 'false'),
('finalizado', 'Finalizado', 'true'),
('cancelado', 'Cancelado', 'true'),
('no_show', 'No Show', 'true'),
('fuera_de_servicio', 'Fuera de Servicio', 'false');

-- Métodos Pago
INSERT INTO METODOS_PAGO (id, nombre) VALUES ('transferencia', 'Transferencia Bancaria'), ('yape', 'Yape / Plin'), ('tarjeta', 'Tarjeta de Crédito/Débito'), ('efectivo', 'Efectivo');

-- Servicios
INSERT INTO SERVICIOS (nombre) VALUES ('Wifi Gratuito'), ('Vestidores y Duchas'), ('Estacionamiento'), ('Guardarropa'), ('Escuela de Surf'), ('Zona de Camping'), ('Alquiler de Parrillas'), ('Rutas Guiadas'), ('Taller de Bicicletas'), ('Cafetería');

-- Sedes
INSERT INTO SEDES (id, nombre, direccion, descripcion, imagen, telefono, correo_contacto, mapa_url) VALUES
('costa', 'Sede Costa', 'Av. Costanera 123', 'Disfruta del sol y las olas.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000', '999-111-222', 'costa@verano.com', 'https://maps.google.com/?q=-12.046374,-77.042793'),
('rural', 'Sede Campo', 'Carretera Central Km 40', 'Conecta con la naturaleza.', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000', '999-333-444', 'campo@verano.com', 'https://maps.google.com/?q=-11.956374,-76.842793');

-- Asignar Servicios a Sedes
INSERT INTO SEDE_SERVICIOS (sede_id, servicio_id) VALUES
('costa', 1), ('costa', 2), ('costa', 5), ('costa', 3),
('rural', 1), ('rural', 6), ('rural', 7), ('rural', 8);

-- Horarios Sede
INSERT INTO HORARIOS_SEDE (sede_id, dia_semana, hora_apertura, hora_cierre, cerrado) VALUES
('costa', 1, '08:00', '18:00', FALSE), ('costa', 2, '08:00', '18:00', FALSE), ('costa', 3, '08:00', '18:00', FALSE), ('costa', 4, '08:00', '18:00', FALSE), ('costa', 5, '08:00', '18:00', FALSE), ('costa', 6, '08:00', '18:00', FALSE), ('costa', 0, '08:00', '18:00', FALSE),
('rural', 1, '07:00', '17:00', FALSE), ('rural', 2, '07:00', '17:00', FALSE), ('rural', 3, '07:00', '17:00', FALSE), ('rural', 4, '07:00', '17:00', FALSE), ('rural', 5, '07:00', '17:00', FALSE), ('rural', 6, '07:00', '17:00', FALSE), ('rural', 0, '07:00', '17:00', FALSE);

-- Usuarios
INSERT INTO USUARIOS (id, nombre, email, telefono, rol_id, password, tipo_documento, numero_documento, fecha_nacimiento, licencia_conducir, nacionalidad, direccion) VALUES
('u1', 'Juan Pérez', 'cliente@demo.com', '999888777', 'cliente', '123', 'DNI', '12345678', '1990-01-01', TRUE, 'Nacional', 'Av. Larco 101, Lima'),
('u2', 'Admin General', 'admin@demo.com', '999000111', 'admin', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u3', 'Vendedor Local', 'vendedor@demo.com', '999222333', 'vendedor', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u4', 'Sr. Dueño', 'dueno@demo.com', '999999999', 'dueno', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u5', 'Mecánico Jefe', 'mecanico@demo.com', '999555666', 'mecanico', '123', NULL, NULL, NULL, FALSE, NULL, NULL);

-- Recursos (Originales + Nuevos)
DO $$
DECLARE
    cat_acuatico INTEGER; cat_terrestre INTEGER; cat_motor INTEGER; cat_playa INTEGER; cat_camping INTEGER;
BEGIN
    SELECT id INTO cat_acuatico FROM CATEGORIAS WHERE nombre = 'Acuático';
    SELECT id INTO cat_terrestre FROM CATEGORIAS WHERE nombre = 'Terrestre';
    SELECT id INTO cat_motor FROM CATEGORIAS WHERE nombre = 'Motor';
    SELECT id INTO cat_playa FROM CATEGORIAS WHERE nombre = 'Playa';
    SELECT id INTO cat_camping FROM CATEGORIAS WHERE nombre = 'Camping';

    INSERT INTO RECURSOS (sede_id, nombre, categoria_id, precio_por_hora, stock_total, imagen, descripcion, guia_seguridad) VALUES
    -- Originales
    ('costa', 'Kayak Doble', cat_acuatico, 45, 5, 'https://images.unsplash.com/photo-1520045864914-6948b3bfbc62?auto=format&fit=crop&q=80&w=500', 'Kayak estable y seguro.', 'Uso obligatorio de chaleco. No alejarse más de 200m de la costa. Evitar zonas de fuerte oleaje.'),
    ('costa', 'Tabla de Surf', cat_acuatico, 30, 8, 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=500', 'Tabla de surf de alto rendimiento.', 'Uso de pita (leash) obligatorio. Respetar prioridades en la ola. Cuidado con bañistas.'),
    ('costa', 'Sombrilla de Playa', cat_playa, 10, 20, 'https://images.unsplash.com/photo-1596122511748-03b14271f67c?auto=format&fit=crop&q=80&w=500', 'Sombrilla amplia con protección UV.', 'Asegurar bien en la arena para evitar voladuras. No usar con vientos fuertes. Cuidado al abrir y cerrar.'),
    ('costa', 'Equipo de Snorkel', cat_acuatico, 15, 15, 'https://images.unsplash.com/photo-1629248456652-8a8e15ad4a3c?auto=format&fit=crop&q=80&w=500', 'Set completo de snorkel.', 'No tocar corales ni fauna marina. Mantenerse visible. No alejarse del grupo.'),
    ('rural', 'Bicicleta de Montaña', cat_terrestre, 35, 10, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500', 'Bicicleta MTB.', 'Uso de casco recomendado. Respetar señales de tránsito. Mantenerse en senderos marcados.'),
    ('rural', 'Tienda de Campaña (4p)', cat_camping, 60, 3, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=500', 'Carpa resistente.', 'Armar en zona plana y permitida. Mantener alejada del fuego. Cerrar bien para evitar insectos.'),
    ('rural', 'Cuatrimoto', cat_motor, 120, 4, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500', 'Potente cuatrimoto 4x4.', 'Uso obligatorio de casco. Circular solo por zonas autorizadas. Velocidad máxima 30km/h en zonas compartidas.'),
    ('rural', 'Equipo de Trekking', cat_terrestre, 25, 12, 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=500', 'Bastones de trekking.', 'Usar calzado adecuado. Llevar agua y protección solar. No salirse de los senderos marcados.'),
    
    -- Nuevos (Costa)
    ('costa', 'Tabla Longboard Clásica', cat_acuatico, 35, 5, 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=500', 'Tabla larga ideal para principiantes y estilo clásico.', 'Uso de pita obligatorio. Cuidado con otros surfistas.'),
    ('costa', 'Tabla Shortboard Pro', cat_acuatico, 40, 3, 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?auto=format&fit=crop&q=80&w=500', 'Tabla corta para maniobras radicales.', 'Solo para expertos. Respetar locales.'),
    ('costa', 'Bodyboard Profesional', cat_acuatico, 20, 8, 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&q=80&w=500', 'Bodyboard con aletas incluidas.', 'Usar aletas y pita. No entrar en zona de bañistas.'),
    ('costa', 'Paddle Board (SUP)', cat_acuatico, 50, 6, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=500', 'Stand Up Paddle para paseo tranquilo.', 'Usar chaleco. Evitar viento fuerte offshore.'),
    ('costa', 'Traje de Neopreno (Wetsuit)', cat_acuatico, 15, 20, 'https://images.unsplash.com/photo-1517176118179-652465d7ad9a?auto=format&fit=crop&q=80&w=500', 'Traje 3/2mm para mantener el calor.', 'Lavar con agua dulce al devolver.'),
    ('costa', 'Kayak Simple Rápido', cat_acuatico, 35, 8, 'https://images.unsplash.com/photo-1541544537156-21c529922819?auto=format&fit=crop&q=80&w=500', 'Kayak individual hidrodinámico.', 'Chaleco obligatorio. No alejarse 200m.'),
    ('costa', 'Kayak Transparente', cat_acuatico, 55, 4, 'https://images.unsplash.com/photo-1472740378865-80a98e5393f3?auto=format&fit=crop&q=80&w=500', 'Observa el fondo marino mientras remas.', 'Cuidado con rocas. Chaleco obligatorio.'),
    ('costa', 'Kayak de Pesca', cat_acuatico, 45, 3, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=500', 'Equipado con cañeros y compartimentos.', 'Llevar equipo de comunicación. Chaleco obligatorio.'),
    ('costa', 'Bote a Pedales (Cisne)', cat_acuatico, 40, 5, 'https://images.unsplash.com/photo-1563299796-b729d0af54a5?auto=format&fit=crop&q=80&w=500', 'Diversión para 4 personas.', 'No salir de la bahía. Todos con chaleco.'),
    ('costa', 'Moto Acuática 1100cc', cat_motor, 150, 2, 'https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?auto=format&fit=crop&q=80&w=500', 'Velocidad y adrenalina en el mar.', 'Licencia requerida. Respetar boyas.'),
    ('costa', 'Silla de Playa Reclinable', cat_playa, 10, 30, 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=500', 'Comodidad total frente al mar.', 'No mojar con agua salada en exceso.'),
    ('costa', 'Cooler con Hielo', cat_playa, 15, 10, 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&q=80&w=500', 'Mantén tus bebidas heladas.', 'No dejar basura en la playa.'),
    ('costa', 'Juego de Paletas', cat_playa, 5, 15, 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=500', 'Clásico juego de playa.', 'Cuidado con golpear a otros bañistas.'),
    ('costa', 'Pelota de Voley Playa', cat_playa, 5, 10, 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=500', 'Balón oficial Mikasa.', 'Jugar en zonas habilitadas.'),
    ('costa', 'Carpa de Playa UV', cat_playa, 20, 8, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=500', 'Refugio contra el sol para niños.', 'Asegurar bien con arena.'),
    ('costa', 'Aletas Profesionales', cat_acuatico, 10, 20, 'https://images.unsplash.com/photo-1584844616648-8a8e15ad4a3c?auto=format&fit=crop&q=80&w=500', 'Mayor propulsión bajo el agua.', 'Caminar hacia atrás al entrar al agua.'),
    ('costa', 'Máscara Full Face', cat_acuatico, 20, 10, 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&q=80&w=500', 'Visión 180 grados y respiración natural.', 'No sumergirse a profundidad.'),
    ('costa', 'Cámara GoPro Hero', cat_acuatico, 30, 5, 'https://images.unsplash.com/photo-1564466021188-1e17010c541c?auto=format&fit=crop&q=80&w=500', 'Graba tus aventuras en 4K.', 'Usar correa de seguridad siempre.'),
    ('costa', 'Chaleco Salvavidas Extra', cat_acuatico, 5, 50, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=500', 'Seguridad ante todo.', 'Ajustar correctamente las correas.'),
    ('costa', 'Bolsa Seca (Dry Bag)', cat_acuatico, 5, 15, 'https://images.unsplash.com/photo-1621255365518-d758f1e5849e?auto=format&fit=crop&q=80&w=500', 'Protege tus pertenencias del agua.', 'Cerrar con 3 vueltas para hermeticidad.'),

    -- Nuevos (Rural)
    ('rural', 'Bicicleta Eléctrica MTB', cat_terrestre, 60, 5, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&q=80&w=500', 'Sube montañas sin esfuerzo.', 'Casco obligatorio. Controlar batería.'),
    ('rural', 'Bicicleta Gravel', cat_terrestre, 45, 4, 'https://images.unsplash.com/photo-1485965120184-e224f72275e2?auto=format&fit=crop&q=80&w=500', 'Para caminos mixtos y velocidad.', 'Casco obligatorio. Frenar con anticipación.'),
    ('rural', 'Bicicleta para Niños', cat_terrestre, 20, 8, 'https://images.unsplash.com/photo-1558981806-ec527fa84c3d?auto=format&fit=crop&q=80&w=500', 'Diversión segura para los peques.', 'Supervisión de adultos requerida.'),
    ('rural', 'Casco Profesional MTB', cat_terrestre, 5, 20, 'https://images.unsplash.com/photo-1559087316-6b2633ccfd92?auto=format&fit=crop&q=80&w=500', 'Protección craneal certificada.', 'Ajustar bien la barbilla.'),
    ('rural', 'Silla Portabebé Bici', cat_terrestre, 10, 5, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500', 'Lleva a tu hijo contigo.', 'Asegurar arnés del niño.'),
    ('rural', 'Tienda Familiar (6p)', cat_camping, 80, 3, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=500', 'Espaciosa carpa para toda la familia.', 'No cocinar dentro. Cerrar mosquiteros.'),
    ('rural', 'Saco de Dormir -5°C', cat_camping, 20, 15, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=500', 'Para noches frías en la montaña.', 'Mantener seco. No usar zapatos dentro.'),
    ('rural', 'Colchoneta Inflable', cat_camping, 15, 10, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=500', 'Mayor confort al dormir.', 'Alejar de objetos punzocortantes.'),
    ('rural', 'Cocinilla a Gas Portátil', cat_camping, 15, 8, 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=500', 'Prepara alimentos calientes.', 'Usar solo al aire libre. Cuidado con fuego.'),
    ('rural', 'Lámpara LED Camping', cat_camping, 5, 20, 'https://images.unsplash.com/photo-1533630654593-b222d5d44449?auto=format&fit=crop&q=80&w=500', 'Iluminación potente y duradera.', 'Recargar batería antes de salir.'),
    ('rural', 'Mochila Trekking 60L', cat_terrestre, 20, 10, 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=500', 'Gran capacidad para expediciones.', 'Ajustar correas lumbares.'),
    ('rural', 'Bastones de Trekking Pro', cat_terrestre, 10, 20, 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=500', 'Reduce impacto en rodillas.', 'Usar dragoneras correctamente.'),
    ('rural', 'Binoculares Larga Vista', cat_terrestre, 15, 5, 'https://images.unsplash.com/photo-1534234828563-02511c756294?auto=format&fit=crop&q=80&w=500', 'Observación de aves y paisajes.', 'No mirar directamente al sol.'),
    ('rural', 'GPS de Montaña Garmin', cat_terrestre, 25, 3, 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=500', 'No te pierdas nunca.', 'Llevar baterías extra.'),
    ('rural', 'Kit de Primeros Auxilios', cat_terrestre, 10, 10, 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=500', 'Esencial para emergencias.', 'Revisar contenido antes de salir.'),
    ('rural', 'Cuatrimoto 500cc 4x4', cat_motor, 150, 3, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500', 'Poder total para terrenos difíciles.', 'Casco y licencia obligatorios. No derrapar.'),
    ('rural', 'Moto Enduro 250cc', cat_motor, 120, 4, 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=500', 'Para senderos técnicos.', 'Equipo completo de protección requerido.'),
    ('rural', 'Buggy Arenero (2p)', cat_motor, 180, 2, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500', 'Diversión en dunas y tierra.', 'Cinturón de seguridad obligatorio.'),
    ('rural', 'Casco Motocross', cat_motor, 10, 15, 'https://images.unsplash.com/photo-1559087316-6b2633ccfd92?auto=format&fit=crop&q=80&w=500', 'Protección integral.', 'Ajustar gafas y barbilla.'),
    ('rural', 'Guantes de Protección', cat_motor, 5, 20, 'https://images.unsplash.com/photo-1589556264800-08ae9e129a8c?auto=format&fit=crop&q=80&w=500', 'Mejor agarre y protección.', 'Usar siempre al conducir.');
END $$;

-- Promociones
INSERT INTO PROMOCIONES (nombre, descripcion, tipo, condicion, beneficio, activo) VALUES
('Descuento Larga Duración', '10% de descuento en alquileres mayores a 3 horas', 'regla_tiempo', '{"minHoras": 3}', '{"tipo": "porcentaje", "valor": 10}', TRUE),
('Paquete Cuatrimotos 3x5', 'Alquila 3 Cuatrimotos por el precio de 5 horas', 'regla_cantidad', '{"minCantidad": 3, "categoria": "Motor"}', '{"tipo": "porcentaje", "valor": 15}', FALSE);

-- Tarjeta para el usuario demo (u1)
INSERT INTO TARJETAS_CREDITO (usuario_id, numero_oculto, token, expiracion, titular, es_principal)
VALUES ('u1', '**** **** **** 4242', 'tok_visa_demo_123', '12/28', 'Juan Pérez', TRUE);

-- Mensajes para el usuario demo
INSERT INTO MENSAJES (destinatario_id, asunto, contenido, tipo)
VALUES 
('u1', 'Bienvenido a Verano', 'Gracias por registrarte en nuestra plataforma. ¡Disfruta tu aventura!', 'notificacion'),
('u1', 'Recordatorio de Reserva', 'Recuerda que tienes una reserva pendiente para el fin de semana.', 'alerta');

SELECT 'Base de datos completa instalada correctamente.' as mensaje;

