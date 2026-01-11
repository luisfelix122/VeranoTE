
import { createClient } from '@supabase/supabase-js';

// DATOS DE CONEXIÓN RECUPERADOS
const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const USERS = [
    { email: "dueno@general.com", password: "123", nombre: "Dueño General", rol: "admin", sede: "costa" }, // Dueño como admin por ahora o rol propio si existe
    { email: "admin@costa.com", password: "123", nombre: "Admin Costa", rol: "admin", sede: "costa" },
    { email: "admin@rural.com", password: "123", nombre: "Admin Rural", rol: "admin", sede: "rural" },
    { email: "vendedor@costa.com", password: "123", nombre: "Vendedor Costa", rol: "vendedor", sede: "costa" },
    { email: "vendedor@rural.com", password: "123", nombre: "Vendedor Rural", rol: "vendedor", sede: "rural" },
    { email: "mecanico@costa.com", password: "123", nombre: "Mecánico Costa", rol: "mecanico", sede: "costa" },
    { email: "mecanico@rural.com", password: "123", nombre: "Mecánico Rural", rol: "mecanico", sede: "rural" },
    { email: "cliente1@gmail.com", password: "123", nombre: "Cliente Uno", rol: "cliente", sede: null },
    { email: "cliente2@hotmail.com", password: "123", nombre: "Cliente Dos", rol: "cliente", sede: null }
];

async function main() {
    console.log("🚀 Iniciando poblado directo (Service Role)...");

    // 1. Obtener IDs de Sedes (Intento Robustez)
    console.log("📍 Obteniendo Sedes...");
    const { data: sedes, error: errSedes } = await supabase.from('sedes').select('*'); // Traer todo para inspeccionar

    if (errSedes) {
        console.error("❌ Error leyendo SEDES:", errSedes.message);
        // Continuar sin sedes (usuarios quedaran sin sede)
    }

    const sedeMap = {};
    if (sedes) {
        console.log("   Info Sedes encontradas:", sedes);
        sedes.forEach(s => {
            // Prioridad: Codigo -> Nombre detectado
            if (s.codigo) {
                sedeMap[s.codigo] = s.id;
            } else if (s.nombre) {
                const nombreLower = s.nombre.toLowerCase();
                if (nombreLower.includes('costa') || nombreLower.includes('paracas')) sedeMap['costa'] = s.id;
                if (nombreLower.includes('rural') || nombreLower.includes('cieneguilla')) sedeMap['rural'] = s.id;
            }
        });
    }
    console.log("   Mapa de Sedes construido:", sedeMap);

    for (const u of USERS) {
        console.log(`\n👤 Procesando: ${u.email}...`);

        // A. Crear o Recuperar Usuario Auth
        let authUser;
        // Intentar crear
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { nombre: u.nombre }
        });

        if (createError) {
            // Si ya existe, buscarlo para asegurar que tenemos su ID
            if (createError.message.includes("already been registered") || createError.status === 422) {
                console.log("   -> El usuario Auth ya existe. Recuperando ID...");
                console.log("   ⚠️  Ya existe. No podemos recuperar su ID fácilmente sin borrarlo. Saltando paso Auth.");
            } else {
                console.error("   ❌ Error Auth:", createError.message);
                continue;
            }
        } else {
            authUser = created.user;
            console.log("   ✅ Auth creado:", authUser.id);

            // B. Crear Persona
            const { data: persona, error: errPersona } = await supabase.from('personas').insert({
                nombres: u.nombre,
                numero_documento: "DNI-" + Math.floor(Math.random() * 100000000), // Random DNI
                tipo_documento_id: 'DNI',
                email_contacto: u.email
            }).select().single();

            if (errPersona) {
                console.error("   ❌ Error creando Persona:", errPersona.message);
                continue;
            }
            console.log("   ✅ Persona creada:", persona.id);

            // C. Crear Usuario Publico
            const sedeId = u.sede ? sedeMap[u.sede] : null;

            const { error: errUsuario } = await supabase.from('usuarios').insert({
                id: authUser.id, // VINCULO CRITICO
                persona_id: persona.id,
                rol_id: u.rol,
                sede_id: sedeId,
                email: u.email
            });

            if (errUsuario) {
                console.error("   ❌ Error vinculando Usuario Publico:", errUsuario.message);
            } else {
                console.log("   🎉 USUARIO FULL CREADO EXITOSAMENTE");
            }
        }
    }
}

main();
