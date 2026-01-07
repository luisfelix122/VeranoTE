-- UPDATE USERS FULL DETAILS (Completing all profile fields)

-- Helper macro-like updates for clarity

-- 1. DUENO
UPDATE usuarios
SET
    fecha_nacimiento = '1980-05-15',
    direccion = 'Av. Principal 123, Lima',
    telefono = '999000111',
    tipo_documento = 'DNI',
    numero_documento = '10000001',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Esposa Dueño: 999111000',
    pregunta_secreta = '¿Nombre de tu primera mascota?',
    respuesta_secreta = 'fido'
WHERE
    email = 'dueno@verano.com';

-- 2. ADMIN COSTA
UPDATE usuarios
SET
    fecha_nacimiento = '1985-08-20',
    direccion = 'Calle Costa 456, Playa Sur',
    telefono = '999000222',
    tipo_documento = 'DNI',
    numero_documento = '20000002',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Madre AdminC: 999222000',
    pregunta_secreta = '¿Ciudad de nacimiento?',
    respuesta_secreta = 'lima'
WHERE
    email = 'admin.costa@verano.com';

-- 3. ADMIN RURAL
UPDATE usuarios
SET
    fecha_nacimiento = '1988-12-10',
    direccion = 'Jirón Rural 789, Campo Verde',
    telefono = '999000333',
    tipo_documento = 'DNI',
    numero_documento = '30000003',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Padre AdminR: 999333000',
    pregunta_secreta = '¿Ciudad de nacimiento?',
    respuesta_secreta = 'cusco'
WHERE
    email = 'admin.rural@verano.com';

-- 4. VENDEDOR COSTA
UPDATE usuarios
SET
    fecha_nacimiento = '1995-03-25',
    direccion = 'Av. del Mar 101, Costa',
    telefono = '999000444',
    tipo_documento = 'DNI',
    numero_documento = '40000004',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Hermano VendC: 999444000',
    pregunta_secreta = '¿Comida favorita?',
    respuesta_secreta = 'ceviche'
WHERE
    email = 'vendedor.costa@verano.com';

-- 5. VENDEDOR RURAL
UPDATE usuarios
SET
    fecha_nacimiento = '1996-07-14',
    direccion = 'Camino Real 202, Rural',
    telefono = '999000555',
    tipo_documento = 'DNI',
    numero_documento = '50000005',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Pareja VendR: 999555000',
    pregunta_secreta = '¿Comida favorita?',
    respuesta_secreta = 'pachamanca'
WHERE
    email = 'vendedor.rural@verano.com';

-- 6. MECANICO COSTA
UPDATE usuarios
SET
    fecha_nacimiento = '1990-01-30',
    direccion = 'Taller Central 1, Costa',
    telefono = '999000666',
    tipo_documento = 'DNI',
    numero_documento = '60000006',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Tío MecC: 999666000',
    pregunta_secreta = '¿Marca de primer auto?',
    respuesta_secreta = 'toyota'
WHERE
    email = 'mecanico.costa@verano.com';

-- 7. MECANICO RURAL
UPDATE usuarios
SET
    fecha_nacimiento = '1992-11-11',
    direccion = 'Taller Campo 2, Rural',
    telefono = '999000777',
    tipo_documento = 'DNI',
    numero_documento = '70000007',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Esposa MecR: 999777000',
    pregunta_secreta = '¿Marca de primer auto?',
    respuesta_secreta = 'nissan'
WHERE
    email = 'mecanico.rural@verano.com';

-- 8. JUAN PEREZ (Cliente)
UPDATE usuarios
SET
    fecha_nacimiento = '1998-02-14',
    direccion = 'Av. Larco 1234, Miraflores',
    telefono = '999111222',
    tipo_documento = 'DNI',
    numero_documento = '44455566',
    nacionalidad = 'Peruano',
    contacto_emergencia = 'Padre Juan: 999888111',
    pregunta_secreta = '¿Nombre de tu abuela?',
    respuesta_secreta = 'rosa'
WHERE
    email = 'juan@gmail.com';

-- 9. MARIA GARCIA (Cliente)
UPDATE usuarios
SET
    fecha_nacimiento = '1999-05-05',
    direccion = 'Calle Berlin 555, Miraflores',
    telefono = '999333444',
    tipo_documento = 'Pasaporte',
    numero_documento = 'AA123456',
    nacionalidad = 'Mexicana',
    contacto_emergencia = 'Amiga Maria: 999333555',
    pregunta_secreta = '¿Nombre de tu abuela?',
    respuesta_secreta = 'lupe'
WHERE
    email = 'maria@gmail.com';

-- 10. CARLOS LOPEZ (Cliente)
UPDATE usuarios
SET
    fecha_nacimiento = '1982-09-21',
    direccion = 'Av. Arequipa 500, Lince',
    telefono = '999555666',
    tipo_documento = 'DNI',
    numero_documento = '88877766',
    nacionalidad = 'Argentino', -- As requested in seed
    contacto_emergencia = 'Hermano Carlos: 999555777',
    pregunta_secreta = '¿Equipo de futbol?',
    respuesta_secreta = 'boca'
WHERE
    email = 'carlos@hotmail.com';

-- 11. ANA SMITH (Cliente)
UPDATE usuarios
SET
    fecha_nacimiento = '1993-04-01',
    direccion = 'Calle Alcanfores 200, Miraflores',
    telefono = '999777888',
    tipo_documento = 'Pasaporte',
    numero_documento = 'USA-999',
    nacionalidad = 'USA',
    contacto_emergencia = 'Husband Ana: 999777999',
    pregunta_secreta = '¿Ciudad favorita?',
    respuesta_secreta = 'nyc'
WHERE
    email = 'ana.smith@yahoo.com';

-- 12. LUISA LANE (Cliente)
UPDATE usuarios
SET
    fecha_nacimiento = '1997-06-30',
    direccion = 'Av. Pardo 900, Cusco',
    telefono = '999888999',
    tipo_documento = 'RUT',
    numero_documento = 'CH-111222',
    nacionalidad = 'Chilena',
    contacto_emergencia = 'Friend Luisa: 999888000',
    pregunta_secreta = '¿Superheroe favorito?',
    respuesta_secreta = 'superman'
WHERE
    email = 'luisa@daily.com';

NOTIFY pgrst, 'reload config';