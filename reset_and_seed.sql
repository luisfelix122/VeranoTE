-- SCRIPT DE REINICIO TOTAL Y CARGA DE DATOS
-- Ejecuta esto para limpiar la base de datos y cargar datos frescos con los permisos correctos.

-- 1. LIMPIEZA (Cuidado: Borra todos los datos actuales)
TRUNCATE TABLE ALQUILER_DETALLES, ALQUILERES, RECURSOS, USUARIOS, SEDES, CATEGORIAS, ROLES, ESTADOS_ALQUILER, METODOS_PAGO, SERVICIOS, SEDE_SERVICIOS, PROMOCIONES, MANTENIMIENTOS RESTART IDENTITY CASCADE;

-- 2. DATOS MAESTROS
INSERT INTO ROLES (id, nombre) VALUES ('admin', 'Administrador'), ('cliente', 'Cliente'), ('vendedor', 'Vendedor'), ('dueno', 'Dueño'), ('mecanico', 'Mecánico');

INSERT INTO CATEGORIAS (nombre) VALUES ('Acuático'), ('Terrestre'), ('Motor'), ('Playa'), ('Camping');

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

INSERT INTO METODOS_PAGO (id, nombre) VALUES ('transferencia', 'Transferencia Bancaria'), ('yape', 'Yape / Plin'), ('tarjeta', 'Tarjeta de Crédito/Débito'), ('efectivo', 'Efectivo');

INSERT INTO SERVICIOS (nombre) VALUES ('Wifi Gratuito'), ('Vestidores y Duchas'), ('Estacionamiento'), ('Guardarropa'), ('Escuela de Surf'), ('Zona de Camping'), ('Alquiler de Parrillas'), ('Rutas Guiadas'), ('Taller de Bicicletas'), ('Cafetería');

-- 3. SEDES (Con IDs explícitos para coincidir con el Frontend)
INSERT INTO SEDES (id, nombre, direccion, descripcion, imagen, horario) VALUES
('costa', 'Sede Costa', 'Av. Costanera 123', 'Disfruta del sol y las olas.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000', '08:00 AM - 06:00 PM'),
('rural', 'Sede Campo', 'Carretera Central Km 40', 'Conecta con la naturaleza.', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000', '07:00 AM - 05:00 PM');

-- Relación Sede-Servicios (Simulada)
INSERT INTO SEDE_SERVICIOS (sede_id, servicio_id) 
SELECT 'costa', id FROM SERVICIOS WHERE nombre IN ('Wifi Gratuito', 'Vestidores y Duchas', 'Escuela de Surf');

INSERT INTO SEDE_SERVICIOS (sede_id, servicio_id) 
SELECT 'rural', id FROM SERVICIOS WHERE nombre IN ('Zona de Camping', 'Rutas Guiadas', 'Alquiler de Parrillas');

-- 4. USUARIOS
INSERT INTO USUARIOS (id, nombre, email, telefono, rol_id, password, tipo_documento, numero_documento, fecha_nacimiento, licencia_conducir, nacionalidad, direccion) VALUES
('u1', 'Juan Pérez', 'cliente@demo.com', '999888777', 'cliente', '123', 'DNI', '12345678', '1990-01-01', TRUE, 'Nacional', 'Av. Larco 101, Lima'),
('u2', 'Admin General', 'admin@demo.com', '999000111', 'admin', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u3', 'Vendedor Local', 'vendedor@demo.com', '999222333', 'vendedor', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u4', 'Sr. Dueño', 'dueno@demo.com', '999999999', 'dueno', '123', NULL, NULL, NULL, FALSE, NULL, NULL),
('u5', 'Mecánico Jefe', 'mecanico@demo.com', '999555666', 'mecanico', '123', NULL, NULL, NULL, FALSE, NULL, NULL);

-- 5. RECURSOS (Inventario)
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

    INSERT INTO RECURSOS (sede_id, nombre, categoria_id, precio_por_hora, stock_total, imagen, descripcion, activo) VALUES
    ('costa', 'Kayak Doble', cat_acuatico, 45, 5, 'https://images.unsplash.com/photo-1520045864914-6948b3bfbc62?auto=format&fit=crop&q=80&w=500', 'Kayak estable y seguro.', TRUE),
    ('costa', 'Tabla de Surf', cat_acuatico, 30, 8, 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=500', 'Tabla de surf de alto rendimiento.', TRUE),
    ('costa', 'Sombrilla de Playa', cat_playa, 10, 20, 'https://images.unsplash.com/photo-1596122511748-03b14271f67c?auto=format&fit=crop&q=80&w=500', 'Sombrilla amplia con protección UV.', TRUE),
    ('costa', 'Equipo de Snorkel', cat_acuatico, 15, 15, 'https://images.unsplash.com/photo-1629248456652-8a8e15ad4a3c?auto=format&fit=crop&q=80&w=500', 'Set completo de snorkel.', TRUE),
    ('rural', 'Bicicleta de Montaña', cat_terrestre, 35, 10, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500', 'Bicicleta MTB.', TRUE),
    ('rural', 'Tienda de Campaña (4p)', cat_camping, 60, 3, 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=500', 'Carpa resistente.', TRUE),
    ('rural', 'Cuatrimoto', cat_motor, 120, 4, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500', 'Potente cuatrimoto 4x4.', TRUE),
    ('rural', 'Equipo de Trekking', cat_terrestre, 25, 12, 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=500', 'Bastones de trekking.', TRUE);
END $$;

-- 6. PERMISOS Y POLÍTICAS (RLS)
-- Habilitar RLS en todas las tablas
ALTER TABLE RECURSOS ENABLE ROW LEVEL SECURITY;
ALTER TABLE CATEGORIAS ENABLE ROW LEVEL SECURITY;
ALTER TABLE SEDES ENABLE ROW LEVEL SECURITY;
ALTER TABLE USUARIOS ENABLE ROW LEVEL SECURITY;
ALTER TABLE ALQUILERES ENABLE ROW LEVEL SECURITY;
ALTER TABLE ALQUILER_DETALLES ENABLE ROW LEVEL SECURITY;
ALTER TABLE CONFIGURACION ENABLE ROW LEVEL SECURITY;
ALTER TABLE PROMOCIONES ENABLE ROW LEVEL SECURITY;
ALTER TABLE MANTENIMIENTOS ENABLE ROW LEVEL SECURITY;
ALTER TABLE ESTADOS_ALQUILER ENABLE ROW LEVEL SECURITY;
ALTER TABLE ROLES ENABLE ROW LEVEL SECURITY;
ALTER TABLE SERVICIOS ENABLE ROW LEVEL SECURITY;
ALTER TABLE METODOS_PAGO ENABLE ROW LEVEL SECURITY;
ALTER TABLE SEDE_SERVICIOS ENABLE ROW LEVEL SECURITY;

-- Crear políticas de lectura pública (Permitir TODO a TODOS para evitar bloqueos en Demo)
DROP POLICY IF EXISTS "Acceso Total Recursos" ON RECURSOS;
CREATE POLICY "Acceso Total Recursos" ON RECURSOS FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Categorias" ON CATEGORIAS;
CREATE POLICY "Acceso Total Categorias" ON CATEGORIAS FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Sedes" ON SEDES;
CREATE POLICY "Acceso Total Sedes" ON SEDES FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Usuarios" ON USUARIOS;
CREATE POLICY "Acceso Total Usuarios" ON USUARIOS FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Alquileres" ON ALQUILERES;
CREATE POLICY "Acceso Total Alquileres" ON ALQUILERES FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Detalles" ON ALQUILER_DETALLES;
CREATE POLICY "Acceso Total Detalles" ON ALQUILER_DETALLES FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Config" ON CONFIGURACION;
CREATE POLICY "Acceso Total Config" ON CONFIGURACION FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Promociones" ON PROMOCIONES;
CREATE POLICY "Acceso Total Promociones" ON PROMOCIONES FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Mantenimientos" ON MANTENIMIENTOS;
CREATE POLICY "Acceso Total Mantenimientos" ON MANTENIMIENTOS FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Estados" ON ESTADOS_ALQUILER;
CREATE POLICY "Acceso Total Estados" ON ESTADOS_ALQUILER FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Roles" ON ROLES;
CREATE POLICY "Acceso Total Roles" ON ROLES FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Servicios" ON SERVICIOS;
CREATE POLICY "Acceso Total Servicios" ON SERVICIOS FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Metodos" ON METODOS_PAGO;
CREATE POLICY "Acceso Total Metodos" ON METODOS_PAGO FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Total Sede Servicios" ON SEDE_SERVICIOS;
CREATE POLICY "Acceso Total Sede Servicios" ON SEDE_SERVICIOS FOR ALL USING (true) WITH CHECK (true);

-- Grant explícito a roles de Supabase (anon y authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

