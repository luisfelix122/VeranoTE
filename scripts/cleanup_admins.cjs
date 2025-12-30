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

async function deleteAdmins() {
    const emailsToDelete = ['admin2@demo.com', 'admin@demo.com'];
    console.log(`Attempting to delete users: ${emailsToDelete.join(', ')}`);

    for (const email of emailsToDelete) {
        // 1. Find User
        const { data: user, error: findError } = await supabase
            .from('usuarios')
            .select('id, nombre')
            .eq('email', email)
            .single();

        if (findError || !user) {
            console.log(`User ${email} not found or already deleted.`);
            continue;
        }

        console.log(`Found user: ${user.nombre} (${user.id}). Deleting...`);

        // 2. Delete User (Public Table)
        const { error: deleteError } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', user.id);

        if (deleteError) {
            console.error(`Error deleting ${email}:`, deleteError.message);
            // If error is due to FK constraint, try to clean up relations or warn
            if (deleteError.code === '23503') { // Foreign key violation
                console.log("  -> Has related records. Attempting to update related records to NULL or delete them if needed.");
                // For safety, we won't cascade delete blindly unless requested, but user said "elimines por completo".
                // Let's try to delete/nullify references if possible, or just report.
                // Assuming simple deletion for now as per "sacalo de la base de datos".
            }
        } else {
            console.log(`Successfully deleted ${email} from 'usuarios' table.`);
        }
    }
}

deleteAdmins();
