const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);

async function checkAlquileres() {
    console.log("Fetching last 5 alquileres...");

    const { data: alquileres, error } = await supabase
        .from('alquileres')
        .select(`
            id,
            fecha_inicio,
            total_final,
            monto_pagado,
            saldo_pendiente,
            estado_id,
            sede_id,
            vendedor_id,
            cliente_id,
            alquiler_detalles(*)
        `)
        .order('fecha_inicio', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching alquileres:", error);
        return;
    }

    console.log(`Found ${alquileres.length} records.`);
    alquileres.forEach(a => {
        console.log(`--------------------------------------------------`);
        console.log(`ID: ${a.id}`);
        console.log(`Fecha: ${a.fecha_inicio}`);
        console.log(`Total: ${a.total_final} | Pagado: ${a.monto_pagado} | Saldo: ${a.saldo_pendiente}`);
        console.log(`Estado: ${a.estado_id}`);
        console.log(`Sede: ${a.sede_id}`);
        console.log(`Vendedor: ${a.vendedor_id}`);
        console.log(`Cliente: ${a.cliente_id}`);
    });
}

checkAlquileres();
