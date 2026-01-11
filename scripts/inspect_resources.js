
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';
// WAIT! I shouldn't use SERVICE_ROLE for testing ANON access.
// I must use the Real ANON key from the user's env.
const REAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDcyMjgsImV4cCI6MjA3OTQ4MzIyOH0.DRPrgd6XAHk5HU53PtuFUMWItvjpx78dF1tycNTEfps';

const supabase = createClient(SUPABASE_URL, REAL_ANON_KEY);

async function checkResources() {
    console.log("🕵️‍♂️ Probando acceso a RECURSOS con ANON KEY...");

    const { data, error } = await supabase
        .from('recursos')
        .select('*, categorias(nombre)')
        .limit(2);

    if (error) {
        console.error("❌ Error accediendo a recursos:", error);
    } else {
        console.log(`✅ Éxito! Se encontraron ${data.length} recursos.`);
        if (data.length > 0) console.log("Muestra:", data[0].nombre, "Categoria:", data[0].categorias?.nombre);
    }
}

checkResources();
