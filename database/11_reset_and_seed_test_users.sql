-- ==============================================================================
-- SCRIPT DE RESET Y SEMILLA DE USUARIOS TEST - VERANO RENTAL SYSTEM
-- ==============================================================================

-- 1. LIMPIEZA DE DATOS OPERACIONALES
-- Borramos todo lo relacionado a transacciones para empezar de cero
TRUNCATE TABLE ALQUILER_DETALLES,
ALQUILERES,
MANTENIMIENTOS,
AUDITORIA,
TARJETAS_CREDITO,
SOPORTE_TICKETS,
MENSAJES
RESTART IDENTITY CASCADE;

-- 2. LIMPIEZA DE USUARIOS
-- Borramos todos los usuarios para re-crearlos de forma limpia
DELETE FROM USUARIOS;

-- 3. ASEGURAR SEDES Y ROLES (Por si acaso se borraron o no existen)
INSERT INTO
    SEDES (
        id,
        nombre,
        direccion,
        descripcion
    )
VALUES (
        'costa',
        'Sede Costa Verde',
        'Malecón de la Reserva 123, Miraflores',
        'Ubicación ideal para deportes acuáticos y playa.'
    ),
    (
        'rural',
        'Sede Rural Lunahuaná',
        'Av. Malecón Araoz s/n, Lunahuaná',
        'Perfecto para aventuras terrestres y de río.'
    ) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    ROLES (id, nombre)
VALUES ('admin', 'Administrador'),
    ('cliente', 'Cliente'),
    ('vendedor', 'Vendedor'),
    ('dueno', 'Dueño'),
    ('mecanico', 'Mecánico') ON CONFLICT (id) DO NOTHING;

-- 4. INSERTAR USUARIOS DE PRUEBA
-- Contraseña de todos: 123
-- Nota: Usamos uuid_generate_v4() para IDs consistentes

-- A. DUEÑO (Global)
INSERT INTO USUARIOS (id, email, password, rol_id, nombre, telefono, tipo_documento, numero_documento, sede_id, pregunta_secreta, respuesta_secreta)
VALUES (
    uuid_generate_v4()::text, 
    'dueno@verano.pe', 
    '123', 
    'dueno', 
    'Dueño del Sistema', 
    '999888777', 
    'DNI', 
    '00000001', 
    NULL,
    '¿Nombre de tu primera mascota?',
    'Fido'
);

-- B. ADMINISTRADORES
INSERT INTO USUARIOS (id, email, password, rol_id, nombre, telefono, tipo_documento, numero_documento, sede_id, pregunta_secreta, respuesta_secreta)
VALUES 
(uuid_generate_v4()::text, 'admin1@costa.pe', '123', 'admin', 'Admin Costa', '999111222', 'DNI', '10000001', 'costa', '¿Ciudad de nacimiento?', 'Lima'),
(uuid_generate_v4()::text, 'admin2@rural.pe', '123', 'admin', 'Admin Rural', '999111333', 'DNI', '10000002', 'rural', '¿Ciudad de nacimiento?', 'Cañete');

-- C. VENDEDORES
INSERT INTO USUARIOS (id, email, password, rol_id, nombre, telefono, tipo_documento, numero_documento, sede_id, pregunta_secreta, respuesta_secreta)
VALUES 
(uuid_generate_v4()::text, 'vendedor1@costa.pe', '123', 'vendedor', 'Vendedor Costa 1', '999222111', 'DNI', '20000001', 'costa', '¿Marca de tu primer auto?', 'Toyota'),
(uuid_generate_v4()::text, 'vendedor2@rural.pe', '123', 'vendedor', 'Vendedor Rural 1', '999222333', 'DNI', '20000002', 'rural', '¿Marca de tu primer auto?', 'Nissan');

-- D. MECÁNICOS
INSERT INTO USUARIOS (id, email, password, rol_id, nombre, telefono, tipo_documento, numero_documento, sede_id, especialidad, pregunta_secreta, respuesta_secreta)
VALUES 
(uuid_generate_v4()::text, 'mecanico1@costa.pe', '123', 'mecanico', 'Mecánico Costa', '999333111', 'DNI', '30000001', 'costa', 'Motores Acuáticos', '¿Nombre de tu escuela?', 'Miguel Grau'),
(uuid_generate_v4()::text, 'mecanico2@rural.pe', '123', 'mecanico', 'Mecánico Rural', '999333222', 'DNI', '30000002', 'rural', 'Bicicletas y ATV', '¿Nombre de tu escuela?', 'San Jose');

-- E. CLIENTES (Sin sede fija, pueden alquilar en cualquier lugar)
-- Insertamos y guardamos IDs para las tarjetas
DO $$
DECLARE
    u1_id TEXT := uuid_generate_v4()::text;
    u2_id TEXT := uuid_generate_v4()::text;
    u3_id TEXT := uuid_generate_v4()::text;
    u4_id TEXT := uuid_generate_v4()::text;
BEGIN
    INSERT INTO USUARIOS (id, email, password, rol_id, nombre, telefono, tipo_documento, numero_documento, sede_id, pregunta_secreta, respuesta_secreta)
    VALUES 
    (u1_id, 'cliente1@gmail.com', '123', 'cliente', 'Juan Pérez', '987654321', 'DNI', '40000001', NULL, '¿Personaje favorito?', 'Goku'),
    (u2_id, 'cliente2@gmail.com', '123', 'cliente', 'Maria Garcia', '987654322', 'DNI', '40000002', NULL, '¿Personaje favorito?', 'Wonder Woman'),
    (u3_id, 'cliente3@gmail.com', '123', 'cliente', 'Carlos Rodriguez', '987654323', 'DNI', '40000003', NULL, '¿Personaje favorito?', 'Batman'),
    (u4_id, 'cliente4@gmail.com', '123', 'cliente', 'Ana Martinez', '987654324', 'DNI', '40000004', NULL, '¿Personaje favorito?', 'Elsa');

    -- Insertar tarjetas para los clientes
    INSERT INTO TARJETAS_CREDITO (usuario_id, numero_oculto, token, expiracion, titular, es_principal)
    VALUES 
    (u1_id, '**** **** **** 1234', 'tok_sim_1', '12/28', 'JUAN PEREZ', TRUE),
    (u2_id, '**** **** **** 5678', 'tok_sim_2', '10/27', 'MARIA GARCIA', TRUE),
    (u3_id, '**** **** **** 9012', 'tok_sim_3', '05/26', 'CARLOS RODRIGUEZ', TRUE),
    (u4_id, '**** **** **** 3456', 'tok_sim_4', '08/29', 'ANA MARTINEZ', TRUE);
END $$;

-- 5. RE-ACTIVAR RECURSOS (Por si acaso estaban inactivos por mantenimientos previos)
UPDATE RECURSOS SET activo = TRUE;

-- FINALIZADO
SELECT 'Base de datos reseteada y usuarios de prueba cargados correctamente' as resultado;