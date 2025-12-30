
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhimcixubyylezjvpzpc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDcyMjgsImV4cCI6MjA3OTQ4MzIyOH0.DRPrgd6XAHk5HU53PtuFUMWItvjpx78dF1tycNTEfps';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Fetching one user from 'usuarios' table...");
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else if (data && data.length > 0) {
        console.log("User record keys:", Object.keys(data[0]));
        console.log("Sample User:", data[0]);
    } else {
        console.log("No users found or table empty.");
    }
}

inspect();
