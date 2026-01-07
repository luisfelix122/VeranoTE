-- fix_all_permissions.sql
-- Grant public read access to all profile tables used during login/user fetching.

-- 1. Enable RLS (just to be safe)
ALTER TABLE public.perfiles_turistas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.perfiles_vendedores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.perfiles_mecanicos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.perfiles_admins ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Public read access for perfiles_turistas" ON public.perfiles_turistas;

DROP POLICY IF EXISTS "Public read access for perfiles_vendedores" ON public.perfiles_vendedores;

DROP POLICY IF EXISTS "Public read access for perfiles_mecanicos" ON public.perfiles_mecanicos;

DROP POLICY IF EXISTS "Public read access for perfiles_admins" ON public.perfiles_admins;

-- 3. Create public read policies
CREATE POLICY "Public read access for perfiles_turistas" ON public.perfiles_turistas FOR
SELECT USING (true);

CREATE POLICY "Public read access for perfiles_vendedores" ON public.perfiles_vendedores FOR
SELECT USING (true);

CREATE POLICY "Public read access for perfiles_mecanicos" ON public.perfiles_mecanicos FOR
SELECT USING (true);

CREATE POLICY "Public read access for perfiles_admins" ON public.perfiles_admins FOR
SELECT USING (true);

-- 4. Grant SELECT permissions
GRANT
SELECT
    ON public.perfiles_turistas TO anon,
    authenticated,
    service_role;

GRANT
SELECT
    ON public.perfiles_vendedores TO anon,
    authenticated,
    service_role;

GRANT
SELECT
    ON public.perfiles_mecanicos TO anon,
    authenticated,
    service_role;

GRANT
SELECT
    ON public.perfiles_admins TO anon,
    authenticated,
    service_role;

-- 5. Reload config
NOTIFY pgrst, 'reload config';