
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhimcixubyylezjvpzpc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDcyMjgsImV4cCI6MjA3OTQ4MzIyOH0.DRPrgd6XAHk5HU53PtuFUMWItvjpx78dF1tycNTEfps';
const supabase = createClient(supabaseUrl, supabaseKey);

async function probar() {
    console.log("Probando conexión a USUARIOS...");
    const { data: usuarios, error: errorUsuarios } = await supabase
        .from('usuarios')
        .select(`*, roles ( nombre )`)
        .limit(1);

    if (errorUsuarios) {
        console.error("ERROR USUARIOS:", errorUsuarios);
    } else {
        console.log("Estructura Usuario:", JSON.stringify(usuarios[0], null, 2));
    }

    console.log("\nProbando conexión a ALQUILERES...");
    const { data: alquileres, error: errorAlquileres } = await supabase
        .from('alquileres')
        .select(`*, cliente:usuarios!cliente_id ( nombre, email, numero_documento )`)
        .limit(1);

    if (errorAlquileres) {
        console.error("ERROR ALQUILERES:", errorAlquileres);
    } else {
        console.log("Estructura Alquiler:", JSON.stringify(alquileres[0], null, 2));
    }
}

probar();
