const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env manualmente
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);

async function checkAlquileres() {
    console.log("Fetching all alquileres...");

    const { data: alquileres, error } = await supabase
        .from('alquileres')
        .select(`
            *,
            alquiler_detalles(*)
        `);

    if (error) {
        console.error("Error fetching alquileres:", error);
        return;
    }

    console.log(`Found ${alquileres.length} records.`);
    alquileres.forEach(a => {
        console.log(`ID: ${a.id} | Estado: ${a.estado_id} | Total: ${a.total} | Sede: ${a.sede_id} | Vendedor: ${a.vendedor_id}`);
    });
}

checkAlquileres();
