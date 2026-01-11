
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspect() {
    console.log("🕵️‍♂️ Inspector de Enum de Postgres");

    // Intentamos insertar una fila con un cargo basura para que Postgres nos GRITE los valores aceptados.
    // Necesitamos IDs válidos de persona y sede.

    // Leemos una sede
    const { data: sedes } = await supabase.from('sedes').select('id').limit(1);
    const sedeId = sedes[0].id;

    // Leemos una persona cualquiera (que creamos hace un momento)
    const { data: personas } = await supabase.from('personas').select('id').limit(1);
    const personaId = personas[0].id;

    console.log(`   Usando SedeID: ${sedeId}, PersonaID: ${personaId}`);

    const { error } = await supabase.from('empleados').insert({
        persona_id: personaId,
        sede_id: sedeId,
        cargo: 'SUPER_INVALIDO_XYZ_123' // Valor basura
    });

    if (error) {
        console.log("\n❌ MENSAJE DE ERROR RECIBIDO:");
        console.log("---------------------------------------------------");
        console.log(error.message);
        console.log("---------------------------------------------------");
        console.log("Details:", error.details);
        console.log("Hint:", error.hint);
    } else {
        console.log("😱 ¡Increible! Aceptó el valor basura. Entonces no es un Enum estricto.");
    }
}

inspect();
