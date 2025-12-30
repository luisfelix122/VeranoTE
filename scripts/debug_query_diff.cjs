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

async function checkQueryDifference() {
    console.log("Checking query differences...");

    // 1. Raw Count
    const { count: totalRaw, error: errRaw } = await supabase
        .from('alquileres')
        .select('*', { count: 'exact', head: true });

    // 2. App Query Fetch
    const { data: dataApp, error: errApp } = await supabase
        .from('alquileres')
        .select(`
            *,
            alquiler_detalles ( * ),
            cliente:usuarios!cliente_id ( nombre ),
            vendedor:usuarios!vendedor_id ( nombre )
        `); // Simplified but retaining the relations

    if (errRaw || errApp) {
        console.error("Errors:", errRaw, errApp);
        return;
    }

    const totalApp = dataApp.length;
    console.log(`Total Raw Records: ${totalRaw}`);
    console.log(`Total App-Query Records: ${totalApp}`);

    if (totalRaw !== totalApp) {
        console.log("Warning: Counts mismatch! Some records are being excluded by the JOINs.");

        // Find missing IDs
        const appIds = new Set(dataApp.map(a => a.id));
        const { data: allRaw } = await supabase.from('alquileres').select('id');

        const missing = allRaw.filter(r => !appIds.has(r.id));
        console.log("Missing IDs:", missing.map(m => m.id));
    } else {
        console.log("Counts match. The issue is likely in Frontend Filtering (Reportes.jsx).");
    }
}

checkQueryDifference();
