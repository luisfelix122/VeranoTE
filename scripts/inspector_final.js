
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectTable(tableName) {
    console.log(`\n=============================`);
    console.log(`🔎 INSPECCIONANDO: ${tableName}`);
    console.log(`=============================`);

    // 1. Intentar leer datos (si hay, BINGO)
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
        console.error(`❌ Error de lectura: ${error.message}`);
        // Puede ser que la tabla no exista
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ DATOS ENCONTRADOS! Estas son las columnas reales:");
        console.log(Object.keys(data[0]));
        console.log("   Ejemplo:", data[0]);
    } else {
        console.log("⚠️  Tabla vacía. Intentando 'INSERT DE SONDEO' para descubrir columnas...");

        // 2. Insertar basura para ver qué columnas faltan o explotan
        const dummyId = crypto.randomUUID();
        // Probamos insertar solo un ID (si existe columna id)
        const payload = {};
        // Si sabemos alguna columna comun, la ponemos.
        // Pero mejor un objeto casi vacio para que grite "Falta columna X"

        const { error: insertError } = await supabase.from(tableName).insert(payload);

        if (insertError) {
            console.log("   Resultado del sondeo:", insertError.message);
            // Mensajes típicos: 
            // - "null value in column 'X' violates not-null constraint" -> Existe columna X
            // - "column 'Y' of relation 'Z' does not exist" -> No existe
        } else {
            console.log("   ¡Increíble! Insertó un objeto vacío. La tabla es muy permisiva.");
            // Limpiar basura
            // await supabase.from(tableName).delete().eq('id', dummyId); // Difícil si no sabemos la PK
        }
    }
}

async function main() {
    await inspectTable('personas');
    await inspectTable('usuarios');
    await inspectTable('sedes');
    await inspectTable('roles'); // Por si acaso existe
}

main();
