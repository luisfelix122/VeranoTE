-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: CONFIGURACIÓN DEL PIE DE PÁGINA
-- ==============================================================================

-- 1. Insertar configuración de contacto si no existe
INSERT INTO CONFIGURACION (clave, valor, descripcion) VALUES
('CONTACTO_TELEFONO', '(01) 555-0123', 'Teléfono de contacto general'),
('CONTACTO_EMAIL', 'contacto@alquileresperuanos.pe', 'Correo de contacto general')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- 2. Confirmación
SELECT 'Configuración de Pie de Página actualizada correctamente' as mensaje;
