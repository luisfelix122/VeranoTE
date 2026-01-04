-- Tabla Normalizada para Contactos de Usuario
-- Permite múltiples contactos por usuario, manteniendo integridad referencial.

CREATE TABLE IF NOT EXISTS contactos_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL, -- Guardaremos format: "+51 987654321"
    relacion VARCHAR(100), -- Opcional: Padre, Madre, Hermano, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- Foreign Key para integridad de datos: Si el usuario se borra, sus contactos también.
CONSTRAINT fk_usuario_contacto 
        FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) 
        ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_contactos_usuario_id ON contactos_usuario (usuario_id);