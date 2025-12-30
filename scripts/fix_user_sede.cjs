const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env manualmente simple
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);

async function fixUser() {
    console.log("Fixing 'Sistema Web' user...");

    // 1. Buscar usuario
    const { data: users, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', 'web@verano.te');

    if (fetchError || !users.length) {
        console.error("User not found or error:", fetchError);
        return;
    }

    const user = users[0];
    console.log("Current Data:", user);

    if (!user.sede_id) {
        console.log("User has no sede_id. Updating to 'costa'...");
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ sede_id: 'costa' }) // Asumimos 'costa' como default para sistema web
            .eq('id', user.id);

        if (updateError) console.error("Update failed:", updateError);
        else console.log("Update successful!");
    } else {
        console.log(`User already has sede_id: ${user.sede_id}`);
    }
}

fixUser();
