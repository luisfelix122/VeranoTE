-- Agregar columna para la marca de la tarjeta (Visa, Mastercard, etc.)
ALTER TABLE tarjetas_credito
ADD COLUMN IF NOT EXISTS marca VARCHAR(20) DEFAULT 'Desconocida';

-- Restricción para formato de fecha de expiración (MM/YY)
-- Asegura que tenga 5 caracteres
ALTER TABLE tarjetas_credito
ADD CONSTRAINT check_expiracion_length CHECK (length(expiracion) = 5);

-- Asegura el formato MM/YY usando expresión regular
-- \d{2} = dos dígitos, \/ = slash literal, \d{2} = dos dígitos
ALTER TABLE tarjetas_credito
ADD CONSTRAINT check_expiracion_format CHECK (expiracion ~ '^\d{2}/\d{2}$');

-- Opcional: Validar que el mes sea entre 01 y 12 (requiere castear parte del string)
-- Esta es más compleja en SQL puro sin funciones, pero el regex ayuda bastante.