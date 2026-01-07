-- COMPREHENSIVE FIX SCRIPT v2
-- 1. Fix Missing Profile Columns (Restoring legacy data structure)
ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS nacionalidad TEXT DEFAULT 'Nacional';

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS direccion TEXT;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre TEXT;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono TEXT;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS licencia_conducir BOOLEAN DEFAULT FALSE;

ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

ALTER TABLE perfiles_vendedores ADD COLUMN IF NOT EXISTS anexo TEXT;

ALTER TABLE perfiles_vendedores ADD COLUMN IF NOT EXISTS turno TEXT;

ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS codigo_empleado TEXT;

ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE perfiles_mecanicos
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

ALTER TABLE perfiles_mecanicos
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

ALTER TABLE perfiles_mecanicos
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

ALTER TABLE perfiles_mecanicos
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE perfiles_admins
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

ALTER TABLE perfiles_admins
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

ALTER TABLE perfiles_admins
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

ALTER TABLE perfiles_admins ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Fix Permissions (Address 404 errors)
GRANT USAGE,
SELECT
    ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

GRANT ALL ON TABLE soporte_tickets TO authenticated;

GRANT ALL ON TABLE mensajes TO authenticated;

GRANT ALL ON TABLE contactos_usuario TO authenticated;

GRANT ALL ON TABLE perfiles_turistas TO authenticated;

GRANT ALL ON TABLE perfiles_vendedores TO authenticated;

GRANT ALL ON TABLE perfiles_mecanicos TO authenticated;

GRANT ALL ON TABLE perfiles_admins TO authenticated;

-- 3. Force Cache Reload
NOTIFY pgrst, 'reload config';

-- 4. Verify
SELECT * FROM perfiles_turistas LIMIT 1;