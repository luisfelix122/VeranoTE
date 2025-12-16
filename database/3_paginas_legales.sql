-- Tabla para gestionar contenido estático de páginas (Términos, Privacidad, Ayuda)
CREATE TABLE IF NOT EXISTS PAGINAS (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL, -- Soporta HTML básico
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE PAGINAS ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de páginas" ON PAGINAS FOR
SELECT USING (true);

-- Insertar datos por defecto (Upsert para no duplicar si ya existen)
INSERT INTO
    PAGINAS (slug, titulo, contenido)
VALUES (
        'terminos',
        'Términos y Condiciones',
        '<p><strong>1. Aceptación</strong><br>Al usar nuestros servicios, aceptas estos términos.</p><p><strong>2. Reservas</strong><br>Las reservas deben pagarse por adelantado o dar una garantía.</p><p><strong>3. Responsabilidad</strong><br>El usuario es responsable del equipo alquilado.</p>'
    ),
    (
        'privacidad',
        'Política de Privacidad',
        '<p><strong>1. Datos Recopilados</strong><br>Recopilamos nombre, DNI y contacto para fines de servicio.</p><p><strong>2. Uso de Datos</strong><br>No compartimos tus datos con terceros salvo obligación legal.</p>'
    ),
    (
        'cookies',
        'Política de Cookies',
        '<p>Usamos cookies esenciales para mantener tu sesión activa y preferencias de navegación. No usamos cookies de rastreo publicitario invasivas.</p>'
    ),
    (
        'ayuda',
        'Centro de Ayuda',
        '<p><strong>¿Cómo reservo?</strong><br>Selecciona tus productos, elige fecha y hora, y procede al pago.</p><p><strong>¿Tienen garantía?</strong><br>Sí, todos los alquileres requieren una garantía reembolsable al devolver el equipo.</p><p><strong>¿Horario de atención?</strong><br>Sede Costa: 8am - 6pm<br>Sede Campo: 7am - 5pm</p>'
    ) ON CONFLICT (slug) DO
UPDATE
SET
    contenido = EXCLUDED.contenido,
    titulo = EXCLUDED.titulo;