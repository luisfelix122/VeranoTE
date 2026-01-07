-- Fix missing columns in profile tables
-- This script adds fecha_nacimiento, numero_documento, and tipo_documento to perfiles_* tables
-- to ensure profile updates work correctly.

-- 1. Perfiles Turistas
ALTER TABLE perfiles_turistas
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS numero_documento TEXT,
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI',
ADD COLUMN IF NOT EXISTS nacionalidad TEXT DEFAULT 'Nacional',
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;

-- 2. Perfiles Vendedores
ALTER TABLE perfiles_vendedores
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS numero_documento TEXT,
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI',
ADD COLUMN IF NOT EXISTS anexo TEXT,
ADD COLUMN IF NOT EXISTS turno TEXT,
ADD COLUMN IF NOT EXISTS codigo_empleado TEXT;

-- 3. Perfiles Mecanicos
ALTER TABLE perfiles_mecanicos
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS numero_documento TEXT,
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

-- 4. Perfiles Admins
ALTER TABLE perfiles_admins
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS numero_documento TEXT,
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'DNI';

-- 5. Refresh schema cache (optional but recommended for Supabase)
NOTIFY pgrst, 'reload config';