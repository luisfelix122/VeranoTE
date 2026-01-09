-- =============================================
-- SCRIPT DE NORMALIZACIÓN DE BASE DE DATOS (3NF)
-- Autor: Antigravity
-- Fecha: 2026-01-08
-- Descripción: Reestructuración completa para cumplir con la 3era Forma Normal.
--              Incluye Tablas, Constraints, Triggers, Vistas y Funciones.
-- =============================================

-- 1. LIMPIEZA INICIAL (DROP CASCADE)
DROP VIEW IF EXISTS public.v_usuarios_completos;

DROP VIEW IF EXISTS public.v_alquileres_detallados;

DROP TABLE IF EXISTS public.pagos CASCADE;

DROP TABLE IF EXISTS public.alquiler_detalles CASCADE;

DROP TABLE IF EXISTS public.alquileres CASCADE;

DROP TABLE IF EXISTS public.recursos CASCADE;

DROP TABLE IF EXISTS public.clientes_detalles CASCADE;

DROP TABLE IF EXISTS public.empleados CASCADE;

DROP TABLE IF EXISTS public.personas CASCADE;
-- Datos personales desacoplados
DROP TABLE IF EXISTS public.contactos_emergencia CASCADE;

DROP TABLE IF EXISTS public.usuarios CASCADE;
-- Tabla base de auth
DROP TABLE IF EXISTS public.sedes CASCADE;

DROP TABLE IF EXISTS public.roles CASCADE;

DROP TABLE IF EXISTS public.categorias CASCADE;

DROP TABLE IF EXISTS public.estados_alquiler CASCADE;

DROP TABLE IF EXISTS public.metodos_pago CASCADE;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. TABLAS MAESTRAS (CATÁLOGOS)
-- =============================================

CREATE TABLE public.roles (
    id text PRIMARY KEY, -- 'admin', 'vendedor', 'mecanico', 'cliente', 'dueno'
    nombre text NOT NULL UNIQUE,
    descripcion text
);

INSERT INTO
    public.roles (id, nombre, descripcion)
VALUES (
        'cliente',
        'Cliente',
        'Usuario final que alquila recursos'
    ),
    (
        'vendedor',
        'Vendedor',
        'Personal de ventas en sede'
    ),
    (
        'mecanico',
        'Mecánico',
        'Encargado de mantenimiento'
    ),
    (
        'admin',
        'Administrador',
        'Administrador de sede'
    ),
    (
        'dueno',
        'Dueño',
        'Super administrador global'
    ) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.sedes (
    id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]+$'), -- e.g., 'costa', 'rural'
    nombre text NOT NULL,
    direccion text NOT NULL,
    telefono_contacto text,
    hora_apertura time DEFAULT '08:00',
    hora_cierre time DEFAULT '18:00',
    activo boolean DEFAULT true
);

INSERT INTO
    public.sedes (id, nombre, direccion)
VALUES (
        'costa',
        'Sede Costa',
        'Playa Principal S/N'
    ),
    (
        'rural',
        'Sede Rural',
        'Campo Base Km 10'
    ) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.categorias (
    id SERIAL PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text
);

CREATE TABLE public.estados_alquiler (
    id text PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    es_final boolean DEFAULT false
);

INSERT INTO
    public.estados_alquiler (id, nombre, es_final)
VALUES (
        'pendiente',
        'Pendiente de Pago',
        false
    ),
    (
        'confirmado',
        'Confirmado',
        false
    ),
    ('en_curso', 'En Curso', false),
    (
        'finalizado',
        'Finalizado',
        true
    ),
    (
        'cancelado',
        'Cancelado',
        true
    ),
    (
        'retrasado',
        'Retrasado',
        false
    ) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.metodos_pago (
    id text PRIMARY KEY,
    nombre text NOT NULL
);

INSERT INTO
    public.metodos_pago (id, nombre)
VALUES ('efectivo', 'Efectivo'),
    (
        'tarjeta',
        'Tarjeta de Crédito/Débito'
    ),
    ('yape', 'Yape / Plin'),
    (
        'transferencia',
        'Transferencia Bancaria'
    ) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. NÚCLEO DE USUARIOS (NORMALIZADO)
-- =============================================

-- 3.1 Tabla Usuarios: Solo credenciales y estado del sistema
CREATE TABLE public.usuarios (
    id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    email text NOT NULL UNIQUE CHECK (
        email ~ * '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    password_hash text NOT NULL, -- Almacenar hash, no texto plano idealmente
    rol_id text NOT NULL REFERENCES public.roles (id),
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3.2 Tabla Personas: Datos demográficos universales (Relación 1:1)
CREATE TABLE public.personas (
    usuario_id uuid PRIMARY KEY REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nombre_completo text NOT NULL CHECK (
        length(trim(nombre_completo)) > 2
    ),
    tipo_documento text CHECK (
        tipo_documento IN (
            'DNI',
            'CE',
            'PASAPORTE',
            'RUC'
        )
    ),
    numero_documento text,
    telefono text,
    nacionalidad text DEFAULT 'Perú',
    fecha_nacimiento date CHECK (
        fecha_nacimiento > '1900-01-01'
        AND fecha_nacimiento <= CURRENT_DATE
    ),
    direccion text,
    genero text CHECK (genero IN ('M', 'F', 'Otro')),
    -- Constraint: Unicidad de documento para evitar duplicados reales
    CONSTRAINT uq_documento UNIQUE (
        tipo_documento,
        numero_documento
    )
);

-- 3.3 Tabla Empleados: Datos exclusivos de staff (Admin, Vendedor, Mecanico)
CREATE TABLE public.empleados (
    usuario_id uuid PRIMARY KEY REFERENCES public.usuarios (id) ON DELETE CASCADE,
    sede_id text NOT NULL REFERENCES public.sedes (id),
    codigo_empleado text UNIQUE,
    turno text CHECK (
        turno IN ('Mañana', 'Tarde', 'Noche')
    ),
    especialidad text, -- Para mecánicos
    fecha_contratacion date DEFAULT CURRENT_DATE
);

-- 3.4 Tabla Clientes Detalles: Datos exclusivos de clientes
CREATE TABLE public.clientes_detalles (
    usuario_id uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    licencia_conducir boolean DEFAULT false,
    preferences jsonb DEFAULT '{}'::jsonb,
    nivel_fidelidad text DEFAULT 'estandar'
);

-- 3.5 Contactos de Emergencia (1:N)
CREATE TABLE public.contactos_emergencia (
    id SERIAL PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nombre text NOT NULL,
    telefono text NOT NULL,
    relacion text
);

-- =============================================
-- 4. INVENTARIO Y RECURSOS
-- =============================================

CREATE TABLE public.recursos (
    id SERIAL PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    categoria_id integer REFERENCES public.categorias (id),
    sede_id text NOT NULL REFERENCES public.sedes (id),
    precio_por_hora numeric(10, 2) NOT NULL CHECK (precio_por_hora >= 0),
    stock_total integer NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
    imagen_url text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índice para búsquedas rápidas por sede y categoría
CREATE INDEX idx_recursos_sede ON public.recursos (sede_id);

CREATE INDEX idx_recursos_categoria ON public.recursos (categoria_id);

-- =============================================
-- 5. OPERACIONES (ALQUILERES Y PAGOS)
-- =============================================


CREATE TABLE public.alquileres (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo_reserva text UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
    sede_id text NOT NULL REFERENCES public.sedes(id),
    cliente_id uuid NOT NULL REFERENCES public.usuarios(id),
    vendedor_id uuid REFERENCES public.usuarios(id), -- Puede ser null si es auto-servicio web
    
    fecha_inicio timestamptz NOT NULL,
    fecha_fin_estimada timestamptz NOT NULL,
    fecha_devolucion_real timestamptz,
    
    estado_id text NOT NULL DEFAULT 'pendiente' REFERENCES public.estados_alquiler(id),
    
    total_calculado numeric(10,2) NOT NULL DEFAULT 0,
    monto_garantia numeric(10,2) DEFAULT 0,
    monto_pagado numeric(10,2) DEFAULT 0,
    saldo_pendiente numeric(10,2) GENERATED ALWAYS AS (total_calculado - monto_pagado) STORED,
    
    notas text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT chk_fechas CHECK (fecha_fin_estimada > fecha_inicio)
);

CREATE TABLE public.alquiler_detalles (
    id SERIAL PRIMARY KEY,
    alquiler_id uuid NOT NULL REFERENCES public.alquileres (id) ON DELETE CASCADE,
    recurso_id integer NOT NULL REFERENCES public.recursos (id),
    cantidad integer NOT NULL CHECK (cantidad > 0),
    precio_unitario numeric(10, 2) NOT NULL,
    subtotal numeric(10, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE TABLE public.pagos (
    id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
    alquiler_id uuid NOT NULL REFERENCES public.alquileres (id) ON DELETE CASCADE,
    monto numeric(10, 2) NOT NULL CHECK (monto > 0),
    metodo_pago_id text NOT NULL REFERENCES public.metodos_pago (id),
    fecha_pago timestamptz DEFAULT now(),
    referencia_operacion text, -- Nro voucher, transacción
    registrado_por uuid REFERENCES public.usuarios (id)
);

-- =============================================
-- 6. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- =============================================

-- 6.1 Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER tr_recursos_updated_at BEFORE UPDATE ON public.recursos
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER tr_alquileres_updated_at BEFORE UPDATE ON public.alquileres
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- 6.2 Trigger para Validar Stock Disponible antes de alquilar
CREATE OR REPLACE FUNCTION public.fn_validar_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual integer;
BEGIN
    SELECT stock_total INTO v_stock_actual FROM public.recursos WHERE id = NEW.recurso_id;
    
    -- Nota: En un sistema real, se debe calcular stock disponible = total - alquilados en ese rango de fechas.
    -- Aquí usamos una validación simple contra stock total como base.
    IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el recurso ID %. Disponible: %, Solicitado: %', 
            NEW.recurso_id, v_stock_actual, NEW.cantidad;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validar_stock_insert BEFORE INSERT ON public.alquiler_detalles
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_stock();

-- 6.3 Trigger para Actualizar Monto Pagado en Alquiler al insertar Pagos
CREATE OR REPLACE FUNCTION public.fn_actualizar_pagos_alquiler()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.alquileres
    SET monto_pagado = (SELECT COALESCE(SUM(monto), 0) FROM public.pagos WHERE alquiler_id = NEW.alquiler_id)
    WHERE id = NEW.alquiler_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_actualizar_pago AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_pagos_alquiler();

-- =============================================
-- 7. VISTAS DE CONVENIENCIA (PARA FRONTEND)
-- =============================================

-- Vista para obtener perfil completo de usuario plano (simulando la tabla antigua monolítica para compatibilidad de lectura)
CREATE VIEW public.v_usuarios_completos AS
SELECT
    u.id,
    u.email,
    u.rol_id as rol,
    u.activo,
    p.nombre_completo as nombre,
    p.telefono,
    p.tipo_documento,
    p.numero_documento,
    p.direccion,
    p.fecha_nacimiento,
    p.nacionalidad,

-- Campos de empleado
e.sede_id,
s.nombre as nombre_sede,
e.codigo_empleado,
e.turno,
e.especialidad,

-- Campos de cliente
c.licencia_conducir
FROM public.usuarios u
    LEFT JOIN public.personas p ON u.id = p.usuario_id
    LEFT JOIN public.empleados e ON u.id = e.usuario_id
    LEFT JOIN public.sedes s ON e.sede_id = s.id
    LEFT JOIN public.clientes_detalles c ON u.id = c.usuario_id;

-- =============================================
-- 8. POLÍTICAS RLS (SEGURIDAD)
-- =============================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.alquileres ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propios datos
CREATE POLICY "Usuarios ven sus propios datos" ON public.usuarios
    FOR SELECT USING (auth.uid()::uuid = id);

-- Política: Admin ve todo (esto requiere que el rol de base de datos sea considerado, simplificado aquí)
CREATE POLICY "Admin ve todo" ON public.usuarios FOR ALL USING (
    current_setting ('app.current_user_role', true) = 'admin'
);

-- (Nota: Para desarrollo local rápido sin autenticación compleja de Supabase, a veces se deshabilitan)
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.personas DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.alquileres DISABLE ROW LEVEL SECURITY;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
-- TABLA DE CONTACTOS DE USUARIO (Normalización 3NF para Contactos de Emergencia)
CREATE TABLE IF NOT EXISTS public.contactos_usuario (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nombre_completo text NOT NULL,
    telefono text NOT NULL,
    relacion text,
    es_principal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- TABLAS DE TRANSACCIONES Y DOCUMENTOS (Normalización 3NF - Fase 2)
CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  alquiler_id uuid NOT NULL REFERENCES public.alquileres(id) ON DELETE CASCADE,
  monto numeric(10, 2) NOT NULL,
  metodo_pago text NOT NULL,
  referencia text,
  vendedor_id uuid REFERENCES public.usuarios(id),
  fecha_pago timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comprobantes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  alquiler_id uuid NOT NULL REFERENCES public.alquileres(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('boleta', 'factura', 'ticket')),
  datos_receptor jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha_emision timestamp with time zone DEFAULT now(),
  url_pdf text
);

-- Permissions for new tables
GRANT ALL ON public.contactos_usuario TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos_usuario TO authenticated;
GRANT SELECT ON public.contactos_usuario TO anon;

GRANT ALL ON public.pagos TO postgres, service_role;
GRANT SELECT, INSERT ON public.pagos TO authenticated;
GRANT SELECT ON public.pagos TO anon;

GRANT ALL ON public.comprobantes TO postgres, service_role;
GRANT SELECT, INSERT ON public.comprobantes TO authenticated;
GRANT SELECT ON public.comprobantes TO anon;