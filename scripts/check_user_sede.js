import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserSede() {
    console.log("Checking user data...");

    // Obtener usuarios directamente como en la APP
    const { data: users, error } = await supabase
        .from('usuarios')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    // List all admins
    const admins = users.filter(u => {
        // Safe check for roles
        let roleName = '';
        if (typeof u.roles === 'string') roleName = u.roles;
        else if (u.roles?.nombre) roleName = u.roles.nombre;
        else if (Array.isArray(u.roles) && u.roles[0]?.nombre) roleName = u.roles[0].nombre;

        // Also check derived 'rol' if it existed, but here we access raw DB
        // The DB might have a 'rol' column or a relationship. 
        // Based on previous code: `roles ( nombre )`.
        // Let's just print everyone to be sure or check logic.
        return true;
    });

    console.log("--- ALL USERS DEBUG ---");
    admins.forEach(u => {
        console.log(`User: ${u.nombre} | Email: ${u.email} | SedeID: ${u.sede_id} | Rol Data: ${JSON.stringify(u.roles)}`);
    });
}

checkUserSede();
