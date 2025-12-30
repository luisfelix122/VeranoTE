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

async function moveAdminToRural() {
    console.log("Updating 'Sistema Web' to Rural...");

    // 1. Get User ID
    const { data: users, error: errUser } = await supabase
        .from('usuarios')
        .select('id, nombre, email')
        .ilike('email', 'web@verano.te')
        .single();

    if (errUser || !users) {
        console.error("User not found or error:", errUser);
        return;
    }

    console.log(`Found user: ${users.nombre} (${users.id})`);

    // 2. Update Sede
    const { error: errUpdate } = await supabase
        .from('usuarios')
        .update({ sede_id: 'rural' })
        .eq('id', users.id);

    if (errUpdate) {
        console.error("Error updating sede:", errUpdate);
    } else {
        console.log("Successfully updated 'Sistema Web' to Sede: Rural");
    }
}

moveAdminToRural();
