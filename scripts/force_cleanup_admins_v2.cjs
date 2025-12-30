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

async function forceDeleteAdminsV2() {
    const emailsToDelete = ['admin2@demo.com', 'admin@demo.com'];

    for (const email of emailsToDelete) {
        const { data: user } = await supabase.from('usuarios').select('id').eq('email', email).single();
        if (!user) {
            console.log(`User ${email} already gone.`);
            continue;
        }
        console.log(`Deleting relations for ${email}...`);

        // Tables observed from error or context: 'mensajes', 'tickets', 'alquileres'
        // Messages
        try { await supabase.from('mensajes').delete().eq('remitente_id', user.id); } catch (e) { }
        try { await supabase.from('mensajes').delete().eq('destinatario_id', user.id); } catch (e) { } // if exists

        // Tickets
        await supabase.from('tickets').delete().eq('remitente_id', user.id);
        await supabase.from('tickets').delete().eq('destinatario_id', user.id);

        // Alquileres
        await supabase.from('alquileres').delete().eq('cliente_id', user.id);
        await supabase.from('alquileres').delete().eq('vendedor_id', user.id);

        // User
        const { error } = await supabase.from('usuarios').delete().eq('id', user.id);
        if (error) console.error(`Error deleting user ${email}:`, error.message);
        else console.log(`Deleted ${email} fully.`);
    }
}

forceDeleteAdminsV2();
