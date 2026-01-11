
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function extraerDefiniciones() {
    console.log("🕵️‍♂️ EXTRACCIÓN DE DEFINICIONES DE BASE DE DATOS");

    // 1. INSPECCIÓN DE COLUMNAS DE 'USUARIOS'
    console.log("\n1. Definición de tabla 'usuarios':");
    try {
        // Intentamos leer information_schema explícitamente
        const { data, error } = await supabase
            .from('columns')
            .select('column_name, data_type, udt_name, is_nullable')
            .eq('table_name', 'usuarios')
            .eq('table_schema', 'public');
        // Nota: supabase-js por defecto apunta a schema 'public'. 
        // Para cambiar a information_schema necesitaríamos configuración extra en PostgREST 
        // o usar .rpc() si existiera funcion de query.

        if (error) {
            console.log("   ❌ No se pudo leer information_schema vía API estándar.");
            console.log("   Razón:", error.message);
            console.log("   (Esto es normal si 'information_schema' no está expuesto en PostgREST)");
        } else if (data && data.length > 0) {
            console.table(data);
        } else {
            // Fallback: Introspección por RPC si existe, o deducción por error (ya realizada antes)
            console.log("   ⚠️ La lectura retornó vacío (posible restricción de esquema).");
        }
    } catch (e) { console.log("   Error:", e.message); }

    // 2. BUSCAR TABLA 'ROLES'
    console.log("\n2. Contenido de tabla 'roles':");
    const { data: roles, error: errRoles } = await supabase.from('roles').select('*');
    if (errRoles) {
        console.log("   ❌ Error: " + errRoles.message);
    } else {
        console.log("   ✅ Tabla 'roles' encontrada:");
        console.table(roles);
    }

    // 3. INTENTO DE LEER ENUMS
    console.log("\n3. Intento de leer Enums (pg_enum):");
    // Esto casi seguro fallará vía cliente JS, pero lo intentamos por si el usuario expuso pg_catalog
    const { data: enums, error: errEnum } = await supabase.from('pg_enum').select('*').limit(5);
    if (errEnum) {
        console.log("   ❌ Error accediendo pg_enum: " + errEnum.message);
        console.log("   ℹ️ RECOMENDACIÓN: Ejecuta este SQL en tu Dashboard:");
        console.log(`
        SELECT t.typname, e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'cargo_empleado' OR t.typname = 'nombre_de_tu_tipo_enum';
        `);
    } else {
        console.table(enums);
    }

    // 4. DIAGNÓSTICO FINAL DE ERROR 'CARGO'
    console.log("\n4. Diagnóstico final sobre 'cargo_empleado':");
    console.log("   El error previo 'invalid input value' nos confirmó que existe un Enum.");
    console.log("   Si el script de seed falla, es porque los valores ('admin', 'ADMIN', etc) no coinciden.");
    console.log("   👉 POR FAVOR: Ejecuta el SQL anterior en tu Supabase SQL Editor para ver los valores exactos.");
}

extraerDefiniciones();
