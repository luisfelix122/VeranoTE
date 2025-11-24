-- ==============================================================================
-- SCRIPT DE BASE DE DATOS ROBUSTA - VERANO RENTAL SYSTEM
-- ==============================================================================
-- Este script reinicia el esquema 'public' para asegurar una instalación limpia.
-- Incluye: Normalización, Restricciones, Auditoría, Configuración y Lógica de Negocio en BD.

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

-- Tabla para variables globales del negocio (evita hardcoding)
CREATE TABLE CONFIGURACION (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT
);

INSERT INTO CONFIGURACION (clave, valor, descripcion) VALUES
('IGV', '0.18', 'Impuesto General a las Ventas'),
('GARANTIA_PORCENTAJE', '0.20', 'Porcentaje de garantía sobre el total del servicio'),
('TIEMPO_GRACIA_MINUTOS', '15', 'Minutos de tolerancia para devoluciones'),
('ADELANTO_RESERVA_ANTICIPADA', '0.60', 'Porcentaje requerido para reservas anticipadas');

-- Tabla de Auditoría (Log de cambios)
CREATE TABLE AUDITORIA (
    id SERIAL PRIMARY KEY,
    tabla TEXT NOT NULL,
    operacion TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    usuario TEXT DEFAULT 'sistema', -- Podría ser el UUID del user si hay auth real
    datos_antiguos JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función Trigger para Auditoría
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
    es_final TEXT DEFAULT 'false' -- Indica si el estado cierra el ciclo
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
    horario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE SEDE_SERVICIOS (
    sede_id TEXT REFERENCES SEDES(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES SERVICIOS(id) ON DELETE CASCADE,
    PRIMARY KEY (sede_id, servicio_id)
);

CREATE TABLE USUARIOS (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- En producción usar pgcrypto para hash
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
    -- Datos empleado
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
    -- stock_disponible: Se calculará dinámicamente, pero mantenemos un campo cache para consultas rápidas si se desea, 
    -- aunque lo robusto es calcularlo por fecha. Por ahora usaremos stock_total como la capacidad máxima.
    imagen TEXT,
    descripcion TEXT,
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
    codigo_reserva TEXT UNIQUE DEFAULT substring(uuid_generate_v4()::text from 1 for 8), -- Código corto para humanos
    cliente_id TEXT NOT NULL REFERENCES USUARIOS(id),
    vendedor_id TEXT REFERENCES USUARIOS(id),
    sede_id TEXT NOT NULL REFERENCES SEDES(id),
    
    -- Fechas
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin_estimada TIMESTAMP WITH TIME ZONE NOT NULL, -- Calculado: inicio + horas
    fecha_devolucion_real TIMESTAMP WITH TIME ZONE,
    
    -- Montos
    total_bruto NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Suma de items
    descuento_promociones NUMERIC(10, 2) DEFAULT 0,
    total_servicio NUMERIC(10, 2) NOT NULL, -- Bruto - Descuento
    garantia NUMERIC(10, 2) NOT NULL,
    total_final NUMERIC(10, 2) NOT NULL, -- Servicio + Garantia + Penalidades
    monto_pagado NUMERIC(10, 2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(10, 2) NOT NULL DEFAULT 0,
    
    -- Meta
    tipo_reserva TEXT NOT NULL CHECK (tipo_reserva IN ('inmediata', 'anticipada')),
    metodo_pago_id TEXT NOT NULL REFERENCES METODOS_PAGO(id),
    tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('boleta', 'factura')),
    datos_factura JSONB,
    estado_id TEXT NOT NULL REFERENCES ESTADOS_ALQUILER(id) DEFAULT 'pendiente',
    
    -- Penalidades y Extras
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
-- 5. TRIGGERS DE MANTENIMIENTO
-- ==============================================================================

-- Trigger para actualizar 'updated_at'
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

-- Trigger de Auditoría en tablas críticas
CREATE TRIGGER trg_audit_alquileres AFTER INSERT OR UPDATE OR DELETE ON ALQUILERES FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_recursos AFTER INSERT OR UPDATE OR DELETE ON RECURSOS FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_audit_usuarios AFTER INSERT OR UPDATE OR DELETE ON USUARIOS FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- ==============================================================================
-- 6. LÓGICA DE NEGOCIO EN SQL (FUNCIONES ROBUSTAS)
-- ==============================================================================

-- A. Función para Verificar Disponibilidad Real (Considerando rangos de fecha)
CREATE OR REPLACE FUNCTION verificar_disponibilidad_items(
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_items JSONB -- [{id: 1, cantidad: 2, horas: 3}, ...]
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
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_recurso_id := (v_item->>'id')::INTEGER;
        v_cantidad_solicitada := (v_item->>'cantidad')::INTEGER;
        v_horas := (v_item->>'horas')::INTEGER;
        
        v_fecha_fin_solicitada := p_fecha_inicio + (v_horas || ' hours')::INTERVAL;
        
        -- Obtener stock total y estado activo
        SELECT stock_total, nombre, activo INTO v_stock_total, v_recurso_nombre, v_activo
        FROM RECURSOS WHERE id = v_recurso_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('valido', false, 'mensaje', 'Recurso no encontrado ID: ' || v_recurso_id);
        END IF;

        IF v_activo IS FALSE THEN
            RETURN jsonb_build_object('valido', false, 'mensaje', 'El recurso ' || v_recurso_nombre || ' está temporalmente fuera de servicio.');
        END IF;

        -- Calcular cantidad ocupada en ese rango de fechas
        -- Se suman las cantidades de todos los alquileres que se solapan con el rango solicitado
        -- Y que NO estén finalizados ni cancelados
        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_cantidad_reservada
        FROM ALQUILER_DETALLES d
        JOIN ALQUILERES a ON a.id = d.alquiler_id
        WHERE d.recurso_id = v_recurso_id
          AND a.estado_id NOT IN ('finalizado', 'cancelado', 'no_show')
          AND (
              (a.fecha_inicio < v_fecha_fin_solicitada) AND 
              (a.fecha_fin_estimada > p_fecha_inicio)
          );
          
        IF (v_cantidad_reservada + v_cantidad_solicitada) > v_stock_total THEN
            RETURN jsonb_build_object(
                'valido', false, 
                'mensaje', 'Sin disponibilidad para ' || v_recurso_nombre || '. Stock: ' || v_stock_total || ', Reservado: ' || v_cantidad_reservada
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('valido', true);
END;
$$ LANGUAGE plpgsql;

-- C. Función para Calcular Descuentos (Simulación y Uso Interno)
CREATE OR REPLACE FUNCTION calcular_descuento_simulado(
    p_items JSONB, -- [{id, cantidad, horas, precioPorHora, categoria}]
    p_fecha_inicio TIMESTAMP WITH TIME ZONE
) RETURNS JSONB AS $$
DECLARE
    v_promo RECORD;
    v_item JSONB;
    v_descuento_total NUMERIC := 0;
    v_alertas TEXT[] := ARRAY[]::TEXT[];
    v_promos_aplicadas JSONB[] := ARRAY[]::JSONB[];
    v_monto_base_items NUMERIC;
    v_cantidad_total INTEGER;
    v_desc_monto NUMERIC;
BEGIN
    FOR v_promo IN SELECT * FROM PROMOCIONES WHERE activo = TRUE LOOP
        IF v_promo.tipo = 'regla_tiempo' THEN
            -- Verificar items que cumplen horas > minHoras
            v_monto_base_items := 0;
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                IF (v_item->>'horas')::INTEGER > (v_promo.condicion->>'minHoras')::INTEGER THEN
                    v_monto_base_items := v_monto_base_items + (
                        (v_item->>'precioPorHora')::NUMERIC * 
                        (v_item->>'horas')::INTEGER * 
                        (v_item->>'cantidad')::INTEGER
                    );
                END IF;
            END LOOP;

            IF v_monto_base_items > 0 THEN
                v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            END IF;

        ELSIF v_promo.tipo = 'regla_cantidad' THEN
            -- Verificar cantidad total de items de la categoría
            v_cantidad_total := 0;
            v_monto_base_items := 0;
            
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                -- Si la promo pide categoría, filtrar. Si no, contar todo.
                IF (v_promo.condicion->>'categoria') IS NULL OR (v_promo.condicion->>'categoria') = (v_item->>'categoria') THEN
                    v_cantidad_total := v_cantidad_total + (v_item->>'cantidad')::INTEGER;
                    v_monto_base_items := v_monto_base_items + (
                        (v_item->>'precioPorHora')::NUMERIC * 
                        (v_item->>'horas')::INTEGER * 
                        (v_item->>'cantidad')::INTEGER
                    );
                END IF;
            END LOOP;

            IF v_cantidad_total >= (v_promo.condicion->>'minCantidad')::INTEGER THEN
                v_desc_monto := v_monto_base_items * ((v_promo.beneficio->>'valor')::NUMERIC / 100);
                v_descuento_total := v_descuento_total + v_desc_monto;
                v_promos_aplicadas := array_append(v_promos_aplicadas, jsonb_build_object('nombre', v_promo.nombre, 'monto', v_desc_monto));
            ELSIF v_cantidad_total > 0 THEN
                v_alertas := array_append(v_alertas, 
                    '¡Agrega ' || ((v_promo.condicion->>'minCantidad')::INTEGER - v_cantidad_total) || 
                    ' más de ' || COALESCE(v_promo.condicion->>'categoria', 'productos') || 
                    ' para obtener ' || (v_promo.beneficio->>'valor') || '% de descuento!'
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'descuentoTotal', v_descuento_total,
        'alertas', v_alertas,
        'promocionesAplicadas', v_promos_aplicadas
    );
END;
$$ LANGUAGE plpgsql;

-- D. RPC Transaccional para Crear Reserva (Actualizado con lógica interna)
CREATE OR REPLACE FUNCTION crear_reserva_robusta(
    p_cliente_id TEXT,
    p_vendedor_id TEXT,
    p_sede_id TEXT,
    p_items JSONB, -- [{id, cantidad, horas, precioPorHora, categoria}] -- Necesitamos categoria para promos
    p_fecha_inicio TIMESTAMP WITH TIME ZONE,
    p_tipo_reserva TEXT,
    p_metodo_pago_id TEXT,
    p_tipo_comprobante TEXT,
    p_datos_factura JSONB
) RETURNS JSONB AS $$
DECLARE
    v_disponibilidad JSONB;
    v_calculo_descuento JSONB;
    v_alquiler_id TEXT;
    v_item JSONB;
    v_total_bruto NUMERIC := 0;
    v_descuento NUMERIC := 0;
    v_total_servicio NUMERIC;
    v_garantia NUMERIC;
    v_total_final NUMERIC;
    v_monto_pagado NUMERIC;
    v_saldo_pendiente NUMERIC;
    v_config_garantia NUMERIC;
    v_config_adelanto NUMERIC;
    v_subtotal_item NUMERIC;
    v_max_horas INTEGER := 0;
    v_fecha_fin_estimada TIMESTAMP WITH TIME ZONE;
    
    -- Variables para validación de usuario
    v_usuario RECORD;
    v_tiene_motor BOOLEAN := FALSE;
    v_edad INTEGER;
BEGIN
    -- 1. Validaciones de Negocio (Usuario y Licencia)
    SELECT * INTO v_usuario FROM USUARIOS WHERE id = p_cliente_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;

    -- Verificar si hay items de categoría 'Motor'
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'categoria') = 'Motor' THEN
            v_tiene_motor := TRUE;
        END IF;
    END LOOP;

    IF v_tiene_motor THEN
        -- Validar edad (18+)
        IF v_usuario.fecha_nacimiento IS NULL THEN
             RETURN jsonb_build_object('success', false, 'error', 'Fecha de nacimiento requerida para alquilar vehículos motorizados.');
        END IF;
        
        v_edad := EXTRACT(YEAR FROM age(NOW(), v_usuario.fecha_nacimiento));
        
        IF v_edad < 18 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Debes ser mayor de 18 años para alquilar vehículos motorizados.');
        END IF;

        -- Validar Licencia
        IF v_usuario.licencia_conducir IS NOT TRUE THEN
            RETURN jsonb_build_object('success', false, 'error', 'Se requiere licencia de conducir vigente para vehículos motorizados.');
        END IF;
    END IF;

    -- 2. Verificar Disponibilidad
    v_disponibilidad := verificar_disponibilidad_items(p_fecha_inicio, p_items);
    IF (v_disponibilidad->>'valido')::BOOLEAN = false THEN
        RETURN jsonb_build_object('success', false, 'error', v_disponibilidad->>'mensaje');
    END IF;

    -- 3. Obtener Configuración
    SELECT valor::NUMERIC INTO v_config_garantia FROM CONFIGURACION WHERE clave = 'GARANTIA_PORCENTAJE';
    SELECT valor::NUMERIC INTO v_config_adelanto FROM CONFIGURACION WHERE clave = 'ADELANTO_RESERVA_ANTICIPADA';

    -- 4. Calcular Totales Brutos
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_subtotal_item := (v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC;
        v_total_bruto := v_total_bruto + v_subtotal_item;
        
        IF (v_item->>'horas')::INTEGER > v_max_horas THEN
            v_max_horas := (v_item->>'horas')::INTEGER;
        END IF;
    END LOOP;

    -- 5. Calcular Descuentos (Lógica Interna)
    v_calculo_descuento := calcular_descuento_simulado(p_items, p_fecha_inicio);
    v_descuento := (v_calculo_descuento->>'descuentoTotal')::NUMERIC;

    -- 6. Totales Finales
    v_total_servicio := v_total_bruto - v_descuento;
    v_garantia := v_total_servicio * v_config_garantia;
    v_total_final := v_total_servicio + v_garantia;

    IF p_tipo_reserva = 'anticipada' THEN
        v_monto_pagado := v_total_final * v_config_adelanto;
    ELSE
        v_monto_pagado := v_total_final;
    END IF;
    
    v_saldo_pendiente := v_total_final - v_monto_pagado;
    v_fecha_fin_estimada := p_fecha_inicio + (v_max_horas || ' hours')::INTERVAL;

    -- 7. Insertar Alquiler
    INSERT INTO ALQUILERES (
        cliente_id, vendedor_id, sede_id, 
        fecha_inicio, fecha_fin_estimada,
        total_bruto, descuento_promociones, total_servicio, garantia, total_final, monto_pagado, saldo_pendiente,
        tipo_reserva, metodo_pago_id, tipo_comprobante, datos_factura,
        estado_id, contrato_firmado, fecha_firma
    ) VALUES (
        p_cliente_id, p_vendedor_id, p_sede_id,
        p_fecha_inicio, v_fecha_fin_estimada,
        v_total_bruto, v_descuento, v_total_servicio, v_garantia, v_total_final, v_monto_pagado, v_saldo_pendiente,
        p_tipo_reserva, p_metodo_pago_id, p_tipo_comprobante, p_datos_factura,
        CASE WHEN v_saldo_pendiente = 0 THEN 'confirmado' ELSE 'pendiente' END,
        TRUE, NOW()
    ) RETURNING id INTO v_alquiler_id;

    -- 8. Insertar Detalles
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO ALQUILER_DETALLES (
            alquiler_id, recurso_id, cantidad, horas, precio_unitario, subtotal
        ) VALUES (
            v_alquiler_id, 
            (v_item->>'id')::INTEGER, 
            (v_item->>'cantidad')::INTEGER, 
            (v_item->>'horas')::INTEGER, 
            (v_item->>'precioPorHora')::NUMERIC,
            ((v_item->>'cantidad')::INTEGER * (v_item->>'horas')::INTEGER * (v_item->>'precioPorHora')::NUMERIC)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_alquiler_id, 'total_final', v_total_final, 'descuento', v_descuento);
END;
$$ LANGUAGE plpgsql;

-- E. Función para Registrar Devolución y Penalidades
CREATE OR REPLACE FUNCTION registrar_devolucion_robusta(
    p_alquiler_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
    v_detalle RECORD;
    v_fecha_devolucion TIMESTAMP WITH TIME ZONE := NOW();
    v_fecha_fin_estimada TIMESTAMP WITH TIME ZONE;
    v_penalizacion_total NUMERIC := 0;
    v_penalizacion_item NUMERIC;
    v_diff_minutos INTEGER;
    v_diff_horas INTEGER;
    v_config_gracia INTEGER;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alquiler no encontrado');
    END IF;

    IF v_alquiler.estado_id IN ('finalizado', 'cancelado', 'limpieza') THEN
         RETURN jsonb_build_object('success', false, 'error', 'El alquiler ya ha sido procesado');
    END IF;

    SELECT valor::INTEGER INTO v_config_gracia FROM CONFIGURACION WHERE clave = 'TIEMPO_GRACIA_MINUTOS';

    -- Calcular Penalizaciones por Item
    FOR v_detalle IN SELECT * FROM ALQUILER_DETALLES WHERE alquiler_id = p_alquiler_id LOOP
        v_fecha_fin_estimada := v_alquiler.fecha_inicio + (v_detalle.horas || ' hours')::INTERVAL;
        
        IF v_fecha_devolucion > v_fecha_fin_estimada THEN
            v_diff_minutos := EXTRACT(EPOCH FROM (v_fecha_devolucion - v_fecha_fin_estimada)) / 60;
            
            IF v_diff_minutos > v_config_gracia THEN
                v_diff_horas := CEIL(v_diff_minutos / 60.0);
                -- Penalidad: Doble del precio por hora por cada hora de retraso
                v_penalizacion_item := v_diff_horas * v_detalle.precio_unitario * 2 * v_detalle.cantidad;
                v_penalizacion_total := v_penalizacion_total + v_penalizacion_item;
            END IF;
        END IF;
    END LOOP;

    -- Actualizar Alquiler
    UPDATE ALQUILERES SET
        fecha_devolucion_real = v_fecha_devolucion,
        penalizacion = v_penalizacion_total,
        total_final = total_final + v_penalizacion_total,
        estado_id = 'limpieza', -- Pasa a limpieza antes de finalizar y reponer stock
        updated_at = NOW()
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object(
        'success', true, 
        'penalizacion', v_penalizacion_total, 
        'nuevo_total', v_alquiler.total_final + v_penalizacion_total
    );
END;
$$ LANGUAGE plpgsql;

-- F. RPC para Entregar Alquiler (Validación de Deuda)
CREATE OR REPLACE FUNCTION entregar_alquiler_robusto(
    p_alquiler_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alquiler no encontrado');
    END IF;

    -- Validar Estado
    IF v_alquiler.estado_id NOT IN ('confirmado', 'pendiente') THEN
        RETURN jsonb_build_object('success', false, 'error', 'El alquiler no está en estado válido para entrega.');
    END IF;

    -- Validar Deuda Pendiente
    IF v_alquiler.saldo_pendiente > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se puede entregar: El cliente tiene saldo pendiente de S/ ' || v_alquiler.saldo_pendiente);
    END IF;

    -- Actualizar Estado
    UPDATE ALQUILERES SET
        estado_id = 'en_uso',
        updated_at = NOW()
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- G. RPC para Gestionar Mantenimiento
CREATE OR REPLACE FUNCTION gestionar_mantenimiento(
    p_recurso_id INTEGER,
    p_accion TEXT, -- 'iniciar', 'finalizar'
    p_motivo TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_mantenimiento_id INTEGER;
BEGIN
    IF p_accion = 'iniciar' THEN
        -- Verificar si ya está en mantenimiento
        IF EXISTS (SELECT 1 FROM MANTENIMIENTOS WHERE recurso_id = p_recurso_id AND estado = 'en_proceso') THEN
            RETURN jsonb_build_object('success', false, 'error', 'El recurso ya está en mantenimiento.');
        END IF;

        INSERT INTO MANTENIMIENTOS (recurso_id, descripcion, estado)
        VALUES (p_recurso_id, p_motivo, 'en_proceso');

        UPDATE RECURSOS SET activo = FALSE WHERE id = p_recurso_id;
        
        RETURN jsonb_build_object('success', true, 'mensaje', 'Mantenimiento iniciado.');

    ELSIF p_accion = 'finalizar' THEN
        SELECT id INTO v_mantenimiento_id FROM MANTENIMIENTOS 
        WHERE recurso_id = p_recurso_id AND estado = 'en_proceso' 
        ORDER BY fecha_inicio DESC LIMIT 1;

        IF v_mantenimiento_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No hay mantenimiento activo para este recurso.');
        END IF;

        UPDATE MANTENIMIENTOS SET 
            fecha_fin = NOW(), 
            estado = 'finalizado' 
        WHERE id = v_mantenimiento_id;

        UPDATE RECURSOS SET activo = TRUE WHERE id = p_recurso_id;

        RETURN jsonb_build_object('success', true, 'mensaje', 'Mantenimiento finalizado.');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Acción no válida.');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- H. RPC para Registrar No Show
CREATE OR REPLACE FUNCTION registrar_no_show_robusto(
    p_alquiler_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    IF v_alquiler.estado_id IN ('finalizado', 'cancelado', 'no_show') THEN
        RETURN jsonb_build_object('success', false, 'error', 'El alquiler ya está finalizado o cancelado.');
    END IF;

    -- Marcar como No Show
    -- Nota: Al cambiar el estado a 'no_show', la función verificar_disponibilidad automáticamente dejará de contar este alquiler como ocupado.
    UPDATE ALQUILERES SET
        estado_id = 'no_show',
        updated_at = NOW(),
        notas = COALESCE(notas, '') || ' | Marcado como No Show el ' || NOW()
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. DATOS SEMILLA (SEED DATA)
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
INSERT INTO SEDES (id, nombre, direccion, descripcion, imagen, horario) VALUES
('costa', 'Sede Costa', 'Av. Costanera 123', 'Disfruta del sol y las olas.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000', '08:00 AM - 06:00 PM'),
('rural', 'Sede Campo', 'Carretera Central Km 40', 'Conecta con la naturaleza.', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000', '07:00 AM - 05:00 PM');

-- Usuarios
INSERT INTO USUARIOS (id, nombre, email, telefono, rol_id, password, tipo_documento, numero_documento, fecha_nacimiento, licencia_conducir, nacionalidad, direccion) VALUES
('u1', 'Juan Pérez', 'cliente@demo.com', '999888777', 'cliente', '123', 'DNI', '12345678', '1990-01-01', TRUE, 'Nacional', 'Av. Larco 101, Lima'),
('u2', 'Admin General', 'admin@demo.com', '999000111', 'admin', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u3', 'Vendedor Local', 'vendedor@demo.com', '999222333', 'vendedor', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u4', 'Sr. Dueño', 'dueno@demo.com', '999999999', 'dueno', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u5', 'Mecánico Jefe', 'mecanico@demo.com', '999555666', 'mecanico', '123', NULL, NULL, NULL, FALSE, NULL, NULL);

-- Recursos
DO $$
DECLARE
    cat_acuatico INTEGER;
    cat_terrestre INTEGER;
    cat_motor INTEGER;
    cat_playa INTEGER;
    cat_camping INTEGER;
BEGIN
    SELECT id INTO cat_acuatico FROM CATEGORIAS WHERE nombre = 'Acuático';
    SELECT id INTO cat_terrestre FROM CATEGORIAS WHERE nombre = 'Terrestre';
    SELECT id INTO cat_motor FROM CATEGORIAS WHERE nombre = 'Motor';
    SELECT id INTO cat_playa FROM CATEGORIAS WHERE nombre = 'Playa';
    SELECT id INTO cat_camping FROM CATEGORIAS WHERE nombre = 'Camping';

    INSERT INTO RECURSOS (sede_id, nombre, categoria_id, precio_por_hora, stock_total, imagen, descripcion) VALUES
    ('costa', 'Kayak Doble', cat_acuatico, 45, 5, 'https://images.unsplash.com/photo-1520045864914-6948b3bfbc62?auto=format&fit=crop&q=80&w=500', 'Kayak estable y seguro.'),
    ('costa', 'Tabla de Surf', cat_acuatico, 30, 8, 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=500', 'Tabla de surf de alto rendimiento.'),
    ('costa', 'Sombrilla de Playa', cat_playa, 10, 20, 'https://images.unsplash.com/photo-1596122511748-03b14271f67c?auto=format&fit=crop&q=80&w=500', 'Sombrilla amplia con protección UV.'),
    ('costa', 'Equipo de Snorkel', cat_acuatico, 15, 15, 'https://images.unsplash.com/photo-1629248456652-8a8e15ad4a3c?auto=format&fit=crop&q=80&w=500', 'Set completo de snorkel.'),
    ('rural', 'Bicicleta de Montaña', cat_terrestre, 35, 10, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500', 'Bicicleta MTB.'),
    ('rural', 'Tienda de Campaña (4p)', cat_camping, 60, 3, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=500', 'Carpa resistente.'),
    ('rural', 'Cuatrimoto', cat_motor, 120, 4, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500', 'Potente cuatrimoto 4x4.'),
    ('rural', 'Equipo de Trekking', cat_terrestre, 25, 12, 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=500', 'Bastones de trekking.');
END $$;

-- Promociones
INSERT INTO PROMOCIONES (nombre, descripcion, tipo, condicion, beneficio, activo) VALUES
('Descuento Larga Duración', '10% de descuento en alquileres mayores a 3 horas', 'regla_tiempo', '{"minHoras": 3}', '{"tipo": "porcentaje", "valor": 10}', TRUE),
('Paquete Cuatrimotos 3x5', 'Alquila 3 Cuatrimotos por el precio de 5 horas', 'regla_cantidad', '{"minCantidad": 3, "categoria": "Motor"}', '{"tipo": "porcentaje", "valor": 15}', FALSE);

-- ==============================================================================
-- 8. FUNCIONES ADICIONALES (FALTANTES)
-- ==============================================================================

-- I. RPC para Reprogramar Alquiler (Cálculo de Costos Extras)
CREATE OR REPLACE FUNCTION reprogramar_alquiler_robusto(
    p_alquiler_id TEXT,
    p_horas_adicionales INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
    v_detalle RECORD;
    v_costo_extra NUMERIC := 0;
    v_cargo_servicio NUMERIC;
    v_nuevo_total NUMERIC;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    IF v_alquiler.estado_id IN ('finalizado', 'cancelado', 'no_show') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se puede reprogramar un alquiler finalizado.');
    END IF;

    -- Calcular costo extra por items
    FOR v_detalle IN SELECT * FROM ALQUILER_DETALLES WHERE alquiler_id = p_alquiler_id LOOP
        v_costo_extra := v_costo_extra + (v_detalle.precio_unitario * p_horas_adicionales * v_detalle.cantidad);
        
        -- Actualizar horas en detalle
        UPDATE ALQUILER_DETALLES SET
            horas = horas + p_horas_adicionales,
            subtotal = subtotal + (v_detalle.precio_unitario * p_horas_adicionales * v_detalle.cantidad)
        WHERE id = v_detalle.id;
    END LOOP;

    v_cargo_servicio := v_costo_extra * 0.10; -- 10% cargo por servicio extra
    v_nuevo_total := v_alquiler.total_final + v_costo_extra + v_cargo_servicio;

    -- Actualizar Alquiler
    UPDATE ALQUILERES SET
        total_final = v_nuevo_total,
        saldo_pendiente = saldo_pendiente + v_costo_extra + v_cargo_servicio,
        fecha_fin_estimada = fecha_fin_estimada + (p_horas_adicionales || ' hours')::INTERVAL,
        updated_at = NOW(),
        notas = COALESCE(notas, '') || ' | Reprogramado +' || p_horas_adicionales || 'h. Costo extra: ' || (v_costo_extra + v_cargo_servicio)
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object('success', true, 'nuevo_total', v_nuevo_total);
END;
$$ LANGUAGE plpgsql;

-- J. RPC para Aplicar Descuento Manual (Mantenimiento/Cortesía)
CREATE OR REPLACE FUNCTION aplicar_descuento_manual(
    p_alquiler_id TEXT,
    p_porcentaje NUMERIC,
    p_motivo TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
    v_descuento NUMERIC;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    v_descuento := v_alquiler.total_servicio * (p_porcentaje / 100.0);
    
    UPDATE ALQUILERES SET
        total_final = total_final - v_descuento,
        saldo_pendiente = GREATEST(0, saldo_pendiente - v_descuento), -- No permitir saldo negativo
        updated_at = NOW(),
        notas = COALESCE(notas, '') || ' | Descuento Manual (' || p_porcentaje || '%): -' || v_descuento || '. Motivo: ' || p_motivo
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object('success', true, 'descuento_aplicado', v_descuento);
END;
$$ LANGUAGE plpgsql;

-- K. RPC para Registrar Pago de Saldo
CREATE OR REPLACE FUNCTION registrar_pago_saldo(
    p_alquiler_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_alquiler RECORD;
BEGIN
    SELECT * INTO v_alquiler FROM ALQUILERES WHERE id = p_alquiler_id;
    
    IF v_alquiler.saldo_pendiente <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No hay saldo pendiente por pagar.');
    END IF;

    UPDATE ALQUILERES SET
        monto_pagado = monto_pagado + saldo_pendiente,
        saldo_pendiente = 0,
        estado_id = CASE WHEN estado_id = 'pendiente' THEN 'confirmado' ELSE estado_id END,
        updated_at = NOW(),
        notas = COALESCE(notas, '') || ' | Pago de saldo completado el ' || NOW()
    WHERE id = p_alquiler_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- L. RPC para Aprobar Reserva (Admin)
CREATE OR REPLACE FUNCTION aprobar_reserva(
    p_alquiler_id TEXT
) RETURNS JSONB AS $$
BEGIN
    UPDATE ALQUILERES SET
        estado_id = 'listo_para_entrega',
        updated_at = NOW()
    WHERE id = p_alquiler_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 9. VISTAS Y REPORTES
-- ==============================================================================

CREATE OR REPLACE VIEW v_resumen_alquileres AS
SELECT 
    a.id,
    a.codigo_reserva,
    u.nombre as cliente,
    s.nombre as sede,
    a.fecha_inicio,
    a.fecha_fin_estimada,
    e.nombre as estado,
    a.total_final,
    a.saldo_pendiente,
    COUNT(d.id) as total_items
FROM ALQUILERES a
JOIN USUARIOS u ON a.cliente_id = u.id
JOIN SEDES s ON a.sede_id = s.id
JOIN ESTADOS_ALQUILER e ON a.estado_id = e.id
LEFT JOIN ALQUILER_DETALLES d ON a.id = d.alquiler_id
GROUP BY a.id, a.codigo_reserva, u.nombre, s.nombre, a.fecha_inicio, a.fecha_fin_estimada, e.nombre, a.total_final, a.saldo_pendiente;

-- ==============================================================================
-- 10. ÍNDICES DE RENDIMIENTO
-- ==============================================================================

CREATE INDEX idx_alquileres_cliente ON ALQUILERES(cliente_id);
CREATE INDEX idx_alquileres_estado ON ALQUILERES(estado_id);
CREATE INDEX idx_alquileres_fechas ON ALQUILERES(fecha_inicio, fecha_fin_estimada);
CREATE INDEX idx_detalles_alquiler ON ALQUILER_DETALLES(alquiler_id);
CREATE INDEX idx_detalles_recurso ON ALQUILER_DETALLES(recurso_id);
CREATE INDEX idx_recursos_categoria ON RECURSOS(categoria_id);
CREATE INDEX idx_usuarios_email ON USUARIOS(email);
