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

async function forceDeleteAdmins() {
    const emailsToDelete = ['admin2@demo.com', 'admin@demo.com'];

    for (const email of emailsToDelete) {
        // 1. Find User
        const { data: user } = await supabase.from('usuarios').select('id').eq('email', email).single();
        if (!user) {
            console.log(`User ${email} already gone.`);
            continue;
        }
        console.log(`Deleting details for ${email}...`);

        // 2. Delete/Unlink Relations (Brute force cleanup for "Eliminar por completo")
        // Alquileres as Client
        await supabase.from('alquileres').delete().eq('cliente_id', user.id);
        // Alquileres as Vendedor
        await supabase.from('alquileres').delete().eq('vendedor_id', user.id); // Or update to null if you wanted to keep history, but user said "eliminar por completo"

        // Tickets (Remitente/Destinatario)
        await supabase.from('tickets').delete().eq('remitente_id', user.id);
        await supabase.from('tickets').delete().eq('destinatario_id', user.id);

        // 3. Delete User
        const { error } = await supabase.from('usuarios').delete().eq('id', user.id);
        if (error) console.error(`Error final delete ${email}:`, error.message);
        else console.log(`Deleted ${email} success.`);
    }
}

forceDeleteAdmins();
