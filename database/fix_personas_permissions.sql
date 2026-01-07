-- fix_personas_permissions.sql
-- Allow public read access to personas table to support client-side login validation.

-- 1. Ensure RLS is enabled (or just to be safe)
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Permitir lectura publica de personas" ON public.personas;

DROP POLICY IF EXISTS "Public read access for personas" ON public.personas;

-- 3. Create a policy that allows SELECT for everyone (anon and authenticated)
CREATE POLICY "Public read access for personas" ON public.personas FOR
SELECT USING (true);

-- 4. Grant SELECT permissions to roles
GRANT SELECT ON public.personas TO anon;

GRANT SELECT ON public.personas TO authenticated;

GRANT SELECT ON public.personas TO service_role;

-- 5. Force refresh of schema cache (sometimes needed)
NOTIFY pgrst, 'reload config';