-- Migration: Add 'activo' column to usuarios table for Soft Delete
-- Date: 2026-01-04
-- Author: Verano AI

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.usuarios.activo IS 'Indica si el usuario está activo (TRUE) o ha sido eliminado lógicamente (FALSE)';