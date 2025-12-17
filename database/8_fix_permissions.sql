-- 8_fix_permissions.sql
-- Fix: Grant SELECT permission on the new view to anon and authenticated roles.
-- When the view was dropped and recreated, it lost its permissions.

GRANT SELECT ON v_recursos_disponibles TO anon;

GRANT SELECT ON v_recursos_disponibles TO authenticated;

GRANT SELECT ON v_recursos_disponibles TO service_role;