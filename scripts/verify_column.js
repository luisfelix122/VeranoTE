
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhimcixubyylezjvpzpc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDcyMjgsImV4cCI6MjA3OTQ4MzIyOH0.DRPrgd6XAHk5HU53PtuFUMWItvjpx78dF1tycNTEfps';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    console.log("Verifying 'sede_id' column in 'usuarios'...");

    // Attempt to select the specific column
    const { data, error } = await supabase
        .from('usuarios')
        .select('sede_id')
        .limit(1);

    if (error) {
        console.error("Error/Column missing:", error.message);
        // Supabase often returns error "Could not find the 'sede_id' column of 'usuarios' in the schema cache" or similar
    } else {
        console.log("Success! Column 'sede_id' exists.");
    }
}

checkColumn();
