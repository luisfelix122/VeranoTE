
import { createClient } from '@supabase/supabase-js';

// TU CONFIGURACIÓN
const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspect(table) {
    console.log(`\n🔍 INSPECCIONANDO TABLA: ${table}`);
    // Truco: pedir 1 fila para ver las llaves del objeto
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
        console.log(`❌ Error accediendo a ${table}:`, error.message);
    } else {
        // Si la tabla está vacía, no veremos columnas.
        // Pero si tiene datos, veremos las keys.
        // Si está vacía, intentaremos un insert dummy fallido para ver errores de columnas, o confiamos en el error previo.
        if (data.length > 0) {
            console.log("✅ Columnas detectadas:", Object.keys(data[0]));
            console.log("   Ejemplo:", data[0]);
        } else {
            console.log("⚠️  La tabla existe pero ESTÁ VACÍA. No puedo ver las columnas automáticamente sin metadata API.");
            console.log("   Intentando INSERT dummy para provocar error y ver columnas...");

            const { error: insertErr } = await supabase.from(table).insert({ 'columna_falsa_999': 'test' });
            if (insertErr) {
                console.log("   Info del error al insertar:", insertErr.message);
                // A veces Postgres te dice "column X does not exist" pero puede listar hints.
            }
        }
    }
}

async function main() {
    await inspect('personas');
    await inspect('usuarios');
    await inspect('sedes');
}

main();
