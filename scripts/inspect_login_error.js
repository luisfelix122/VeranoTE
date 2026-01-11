
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
// USAMOS LA ANON KEY DEL USUARIO (La que está en .env.local)
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDcyMjgsImV4cCI6MjA3OTQ4MzIyOH0.DRPrgd6XAHk5HU53PtuFUMWItvjpx78dF1tycNTEfps';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function inspectAnon() {
    console.log("🕵️‍♂️ Simulando Login desde Frontend (ANON KEY)...");

    const email = 'dueno@general.com';

    // Intentamos la misma query exacta que falló en el frontend
    console.log("1. Ejecutando query problemática...");
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, password_hash, rol_id, activo')
        .eq('email', email)
        .single();

    if (error) {
        console.log("❌ ERROR 400/404 REPRODUCIDO:");
        console.log("   Code:", error.code);
        console.log("   Msg:", error.message);
        console.log("   Details:", error.details);
        console.log("   Hint:", error.hint);

        if (error.code === 'PGRST301' || error.message?.includes('cache')) {
            console.log("👉 DIAGNÓSTICO: El caché de esquema de Supabase está obsoleto.");
        } else if (error.code === '42703') { // Undefined column
            console.log("👉 DIAGNÓSTICO: La columna 'password_hash' no es visible para el rol ANON (RLS o Privilegios).");
        } else {
            console.log("👉 DIAGNÓSTICO: Error de permisos o sintaxis.");
        }

    } else {
        console.log("✅ ¡SORPRESA! La query funcionó aquí.");
        console.log("   Data:", data);
        console.log("   Esto indica que el entorno local del usuario (Vite) podría tener caché o config vieja.");
    }
}

inspectAnon();
