-- FIX PERMISSIONS for Legacy Schema
-- When tables are dropped and recreated, permissions are lost.
-- This script grants access to PostgREST roles.

-- 1. Grant Schema Usage
GRANT USAGE ON SCHEMA public TO postgres,
anon,
authenticated,
service_role;

-- 2. Grant Table Permissions (ALL tables in public)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres,
anon,
authenticated,
service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres,
anon,
authenticated,
service_role;

GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres,
anon,
authenticated,
service_role;

-- 3. Ensure RLS is Disabled (For Open Access as requested)
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.recursos DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.alquileres DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.contactos_usuario DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.sedes DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.categorias DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.servicios DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.metodos_pago DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.estados_alquiler DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.soporte_tickets DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.mensajes DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.alquiler_detalles DISABLE ROW LEVEL SECURITY;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';