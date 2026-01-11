
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ROLES CONFIRMADOS VÍA MCP INSPECTION
// Enum 'cargo_empleado': OWNER, ADMIN_SEDE, VENDEDOR, MECANICO

const USUARIOS = [
    // EMPLEADOS
    { email: "dueno@general.com", password: "123456", nombre: "Dueño General", rol: "OWNER", tabla: "empleados", sede: "costa" },
    { email: "admin@costa.com", password: "123456", nombre: "Admin Costa", rol: "ADMIN_SEDE", tabla: "empleados", sede: "costa" },
    { email: "admin@rural.com", password: "123456", nombre: "Admin Rural", rol: "ADMIN_SEDE", tabla: "empleados", sede: "rural" },
    { email: "vendedor@costa.com", password: "123456", nombre: "Vendedor Costa", rol: "VENDEDOR", tabla: "empleados", sede: "costa" },
    { email: "vendedor@rural.com", password: "123456", nombre: "Vendedor Rural", rol: "VENDEDOR", tabla: "empleados", sede: "rural" },
    { email: "mecanico@costa.com", password: "123456", nombre: "Mecánico Costa", rol: "MECANICO", tabla: "empleados", sede: "costa" },

    // CLIENTES (Sin cargo enum)
    { email: "cliente1@gmail.com", password: "123456", nombre: "Cliente Uno", tabla: "clientes", licencia: true },
    { email: "cliente2@hotmail.com", password: "123456", nombre: "Cliente Dos", tabla: "clientes", licencia: false }
];

async function main() {
    console.log("🚀 SCRIPT SEED V5 - SECURITY UPDATE (Pass 123456)");
    console.log("   Roles confirmados: OWNER, ADMIN_SEDE, VENDEDOR, MECANICO");

    // 1. LIMPIEZA TOTAL
    console.log("\n🧹 Limpiando usuarios...");
    const emails = USUARIOS.map(u => u.email);

    // A. Auth
    const { data: listAuth } = await supabase.auth.admin.listUsers();
    if (listAuth?.users) {
        for (const u of listAuth.users) {
            if (emails.includes(u.email)) {
                await supabase.auth.admin.deleteUser(u.id);
            }
        }
    }

    // B. Personas (Cascade a Usuarios/Empleados)
    const { data: usersToDelete } = await supabase.from('usuarios').select('persona_id').in('email', emails);
    if (usersToDelete && usersToDelete.length > 0) {
        const ids = usersToDelete.map(u => u.persona_id);
        await supabase.from('personas').delete().in('id', ids);
    }

    // 2. SEDES
    console.log("🏢 Verificando Sedes...");
    let { data: sedes } = await supabase.from('sedes').select('*');
    if (!sedes || sedes.length === 0) {
        const { data: inserts } = await supabase.from('sedes').insert([
            { nombre: 'Sede Costa', direccion: 'Playa' },
            { nombre: 'Sede Rural', direccion: 'Campo' }
        ]).select();
        sedes = inserts;
    }

    const mapSede = {};
    sedes.forEach(s => {
        const n = s.nombre.toLowerCase();
        if (n.includes('costa')) mapSede['costa'] = s.id;
        if (n.includes('rural')) mapSede['rural'] = s.id;
    });

    // 3. CREACION
    for (const u of USUARIOS) {
        console.log(`\n👤 Creando: ${u.email}...`);

        // A. AUTH
        const { data: created, error: authErr } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { nombre: u.nombre } // Metadata basica
        });

        if (authErr) { console.error("   ❌ Auth Error:", authErr.message); continue; }
        const authId = created.user.id;

        // B. PERSONA
        const [nom, ...ape] = u.nombre.split(' ');
        const dni = Math.floor(10000000 + Math.random() * 90000000).toString();

        const { data: persona, error: perErr } = await supabase.from('personas').insert({
            nombres: nom,
            apellidos: ape.join(' ') || 'General',
            tipo_documento: 'DNI',
            numero_documento: dni,
            fecha_nacimiento: '1990-01-01'
        }).select().single();

        if (perErr) { console.error("   ❌ Persona Error:", perErr.message); continue; }
        const personaId = persona.id;

        // C. USUARIO
        const { error: userErr } = await supabase.from('usuarios').insert({
            id: authId,
            persona_id: personaId,
            email: u.email,
            estado: true
        });
        if (userErr) { console.error("   ❌ Usuario Error:", userErr.message); continue; }
        console.log("   ✅ Usuario creado");

        // D. LINK ESPECIFICO
        if (u.tabla === 'empleados') {
            const sedeId = mapSede[u.sede];
            if (!sedeId) { console.error("   ⚠️ Sede no encontrada"); continue; }

            const { error: empErr } = await supabase.from('empleados').insert({
                persona_id: personaId,
                sede_id: sedeId,
                cargo: u.rol, // VALOR EXACTO DEL ENUM
                activo: true
            });

            if (empErr) console.error(`   ❌ Error Empleado (${u.rol}):`, empErr.message);
            else console.log(`   🎉 Empleado vinculado como ${u.rol}`);

        } else if (u.tabla === 'clientes') {
            const { error: cliErr } = await supabase.from('clientes').insert({
                persona_id: personaId,
                tiene_licencia_conducir: u.licencia
            });

            if (cliErr) console.error("   ❌ Error Cliente:", cliErr.message);
            else console.log("   🎉 Cliente vinculado");
        }
    }
}

main();
