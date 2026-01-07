-- UPDATE SECURITY GUIDES (Populate missing info in Centro de Ayuda)

DO $$
DECLARE
    v_rec RECORD;
BEGIN
    FOR v_rec IN SELECT * FROM recursos LOOP
        
        -- 1. ACUATICOS (Motos, Kayaks, Tablas)
        IF v_rec.nombre ILIKE '%Moto Acuática%' OR v_rec.nombre ILIKE '%Kayak%' OR v_rec.nombre ILIKE '%Surf%' OR v_rec.nombre ILIKE '%Acuático%' THEN
            UPDATE recursos SET guia_seguridad = 
                '### 🌊 Seguridad en el Agua
                1. **Uso Obligatorio de Chaleco:** Siempre usa el chaleco salvavidas proporcionado.
                2. **Zona Designada:** Mantente dentro de las boyas de seguridad.
                3. **Velocidad:** Reduce la velocidad al acercarte a la orilla o a otros bañistas.
                4. **Prohibido Alcohol:** No operar bajo influencia de alcohol.
                5. **Emergencia:** En caso de caída, levanta la mano para alertar al salvavidas.'
            WHERE id = v_rec.id;
        
        -- 2. MOTOR TERRESTRE (Cuatrimotos, 4x4)
        ELSIF v_rec.nombre ILIKE '%Cuatrimoto%' OR v_rec.nombre ILIKE '%4x4%' OR v_rec.nombre ILIKE '%Motor%' THEN
            UPDATE recursos SET guia_seguridad = 
                '### 🏎️ Conducción Segura
                1. **Uso de Casco:** Casco obligatorio en todo momento.
                2. **Licencia:** Debes portar tu licencia de conducir vigente.
                3. **Rutas Autorizadas:** No salgas de los senderos marcados. Dañas el ecosistema.
                4. **Copiloto:** Solo permitido si el vehículo es biplaza.
                5. **Velocidad Máxima:** 30 km/h en zonas compartidas.'
            WHERE id = v_rec.id;

        -- 3. PLAYA Y RELAX (Sombrillas, Sillas, Camping)
        ELSIF v_rec.nombre ILIKE '%Sombrilla%' OR v_rec.nombre ILIKE '%Silla%' OR v_rec.nombre ILIKE '%Camping%' OR v_rec.nombre ILIKE '%Playa%' THEN
            UPDATE recursos SET guia_seguridad = 
                '### 🏖️ Estadía y Cuidado
                1. **Protección Solar:** Usa bloqueador solar constantemente.
                2. **Hidratación:** Mantente hidratado, el sol puede causar insolación.
                3. **Viento:** Asegura bien las sombrillas para evitar accidentes por viento fuerte.
                4. **Limpieza:** Recoge toda tu basura al retirarte.
                5. **Respeto:** Mantén el volumen de la música moderado.'
            WHERE id = v_rec.id;

        -- 4. BICICLETAS Y TREKKING
        ELSIF v_rec.nombre ILIKE '%Bicicleta%' OR v_rec.nombre ILIKE '%Trekking%' OR v_rec.nombre ILIKE '%Terrestre%' THEN
             UPDATE recursos SET guia_seguridad = 
                '### 🚴‍♂️ Rutas y Senderos
                1. **Casco y Protección:** Usa casco y rodilleras si aplica.
                2. **Derecha:** Mantente a la derecha en los senderos compartidos.
                3. **Peatones:** El peatón siempre tiene la preferencia.
                4. **Agua:** Lleva suficiente agua para la ruta.'
            WHERE id = v_rec.id;
            
        -- 5. DEFAULT (Cualquier otro)
        ELSE
             UPDATE recursos SET guia_seguridad = 
                '### 🛡️ Uso General
                1. **Cuidado del Equipo:** Reporta cualquier daño inmediatamente.
                2. **Horario:** Respeta los tiempos de alquiler para evitar penalidades.
                3. **Emergencias:** Ten a la mano el número de la central (999-000-111).'
            WHERE id = v_rec.id;
        END IF;

    END LOOP;
END $$;

NOTIFY pgrst, 'reload config';