
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
// Usamos la Public Anon Key para simular el login del Frontend, o la Service Role?
// Para validar login real, usamos la API normal 'signInWithPassword' que no requiere Service Role 
// pero necesita una instancia cliente. Usaremos la Service Role para inicializar pero el login es auth standard.
// O mejor, obtengo la ANON KEY con una llamada SCP... no, puedo usar la Service Role para todo admin, 
// pero para simular login necesito auth.signInWithPassword.

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verificar() {
    console.log("🕵️‍♂️ Verificando Login de Dueño...");
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Email: dueno@general.com`);
    console.log(`   Pass: 123456`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'dueno@general.com',
        password: '123456'
    });

    if (error) {
        console.error("❌ LOGIN FALLÓ en el script:");
        console.error("   Mensaje:", error.message);

        // Diagnóstico Admin
        console.log("\n🔍 Inspeccionando usuario desde Admin API...");
        const { data: list } = await supabase.auth.admin.listUsers();
        const user = list.users.find(u => u.email === 'dueno@general.com');
        if (user) {
            console.log("   ✅ El usuario EXISTE en Auth.");
            console.log("   ID:", user.id);
            console.log("   Confirmed At:", user.confirmed_at);
            console.log("   Last Sign In:", user.last_sign_in_at);
            console.log("   App Metadata:", user.app_metadata);

            if (!user.confirmed_at) console.error("   ⚠️ ¡ALERTA! El usuario NO está confirmado.");
            else console.log("   ✅ El usuario está confirmado.");
        } else {
            console.error("   ❌ EL USUARIO NO EXISTE EN LA LISTA DE ADMIN (¿Se borró?).");
        }

    } else {
        console.log("✅ LOGIN EXITOSO en el script.");
        console.log("   Token recibido. El usuario y contraseña son correctos.");
        console.log("\n👉 CONCLUSIÓN: Si aquí funciona y en el Frontend no, entonces:");
        console.log("   1. El Frontend apunta a OTRO proyecto Supabase (Revisar .env).");
        console.log("   2. El Frontend usa otra contraseña o email (Typo).");
    }
}

verificar();
