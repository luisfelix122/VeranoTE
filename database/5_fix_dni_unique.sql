-- Migration to add UNIQUE constraint to numero_documento
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_numero_documento_key'
    ) THEN
        ALTER TABLE USUARIOS ADD CONSTRAINT usuarios_numero_documento_key UNIQUE (numero_documento);
    END IF;
END $$;