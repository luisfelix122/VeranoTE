-- Migration: Add sede_id to USUARIOS if it does not exist
-- Description: Ensures the 'sede_id' column exists for branch assignment.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
        AND column_name = 'sede_id'
    ) THEN
        ALTER TABLE "usuarios" ADD COLUMN "sede_id" TEXT REFERENCES "sedes"("id");
        RAISE NOTICE 'Columna sede_id agregada a la tabla USUARIOS.';
    ELSE
        RAISE NOTICE 'La columna sede_id ya existe en la tabla USUARIOS.';
    END IF;
END $$;
