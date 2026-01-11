
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log("🎁 Creando Alquileres Demo para visualización...");

    // 1. Obtener un usuario cliente
    let { data: cliente } = await supabase.from('usuarios').select('id, email').eq('rol_id', 'cliente').limit(1).single();

    if (!cliente) {
        console.log("No hay clientes, usando el primer usuario disponible...");
        const { data: anyUser } = await supabase.from('usuarios').select('id, email').limit(1).single();
        cliente = anyUser;
    }

    if (!cliente) {
        console.error("❌ No hay usuarios en la BD.");
        return;
    }

    console.log(`👤 Asignando rentas a: ${cliente.email} (${cliente.id})`);

    // 2. Obtener Recursos
    const { data: kayak } = await supabase.from('recursos').select('id, precio_lista_hora, sede_id').ilike('nombre', '%Kayak%').limit(1).single();
    const { data: buggy } = await supabase.from('recursos').select('id, precio_lista_hora, sede_id').ilike('nombre', '%Buggy%').limit(1).single();

    if (!kayak || !buggy) {
        console.error("❌ Faltan recursos. Corre el seed V6.");
        return;
    }

    // 3. Insertar Alquiler 1: EN CURSO (Kayak)
    const { data: a1, error: e1 } = await supabase.from('alquileres').insert({
        cliente_id: cliente.id,
        sede_id: kayak.sede_id,
        fecha_inicio: new Date().toISOString(),
        fecha_fin_estimada: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        total_servicio: kayak.precio_lista_hora * 2,
        total_final: kayak.precio_lista_hora * 2,
        saldo_pendiente: 0,
        estado_id: 'en_uso',
        monto_pagado: kayak.precio_lista_hora * 2
    }).select().single();

    if (e1) console.error("Error A1:", e1);
    else {
        await supabase.from('alquiler_detalles').insert({
            alquiler_id: a1.id,
            recurso_id: kayak.id,
            cantidad: 1,
            horas: 2,
            precio_unitario: kayak.precio_lista_hora,
            subtotal: kayak.precio_lista_hora * 2
        });
        console.log("✅ Alquiler Activo creado (Kayak)");
    }

    // 4. Insertar Alquiler 2: DEUDA (Buggy)
    const { data: a2, error: e2 } = await supabase.from('alquileres').insert({
        cliente_id: cliente.id,
        sede_id: buggy.sede_id,
        fecha_inicio: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        fecha_fin_estimada: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        total_servicio: buggy.precio_lista_hora * 4,
        total_final: buggy.precio_lista_hora * 4,
        saldo_pendiente: buggy.precio_lista_hora * 4,
        estado_id: 'finalizado',
        monto_pagado: 0
    }).select().single();

    if (e2) console.error("Error A2:", e2);
    else {
        await supabase.from('alquiler_detalles').insert({
            alquiler_id: a2.id,
            recurso_id: buggy.id,
            cantidad: 1,
            horas: 4,
            precio_unitario: buggy.precio_lista_hora,
            subtotal: buggy.precio_lista_hora * 4
        });
        console.log("✅ Alquiler con Deuda creado (Buggy)");
    }
}

main();
