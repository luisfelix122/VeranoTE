-- Tabla Normalizada para Contactos de Usuario (CORREGIDA)
-- Se cambia usuario_id a TEXT para coincidir con la tabla usuarios actual.

CREATE TABLE IF NOT EXISTS contactos_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_id TEXT NOT NULL, -- CAMBIO: UUID -> TEXT
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    relacion VARCHAR(100),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_usuario_contacto FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contactos_usuario_id ON contactos_usuario (usuario_id);