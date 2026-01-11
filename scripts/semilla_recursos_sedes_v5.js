
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const IMAGENES = {
    'Náutica': ['https://images.unsplash.com/photo-1544551763-46a8723ba3f9?q=80&w=600', 'https://images.unsplash.com/photo-1564998705-591dc8f70094?q=80&w=600'],
    'Playa Relax': ['https://images.unsplash.com/photo-1596564639908-1669e4ce7c10?q=80&w=600', 'https://images.unsplash.com/photo-1519046904884-53103b34b271?q=80&w=600'],
    'Ruedas Marinas': ['https://images.unsplash.com/photo-1570744155333-e7cb2818557a?q=80&w=600', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600'],
    'Aventura Costa': ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600'],
    'Exploración Andina': ['https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=600'],
    'Camping Valle': ['https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=600'],
    'Ruedas Offroad': ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600']
};

const DATA_SEDES = {
    'costa': {
        categorias: ['Náutica', 'Playa Relax', 'Ruedas Marinas', 'Aventura Costa'],
        nombres: {
            'Náutica': ['Kayak Travesía', 'Moto Acuática Jet', 'Tabla Paddle'],
            'Playa Relax': ['Sombrilla Premium', 'Silla Reclinable', 'Cooler XL'],
            'Ruedas Marinas': ['Cuatrimoto Arenera', 'Buggy V8', 'Jeep Safari'],
            'Aventura Costa': ['Kit Snorkel', 'Tienda Playa 4P']
        }
    },
    'rural': {
        categorias: ['Exploración Andina', 'Camping Valle', 'Ruedas Offroad'],
        nombres: {
            'Exploración Andina': ['Bastones Trekking', 'Binoculares Pro'],
            'Camping Valle': ['Carpa 4 Estaciones', 'Sleeping Bag -10C'],
            'Ruedas Offroad': ['Moto Cross 250cc', 'Cuatrimoto Montaña']
        }
    }
}

async function main() {
    console.log("🌱 V5 Debug Start...");

    // 1. Sedes
    let mapaSedes = {};
    const sedesInfo = [
        { nombre: 'Sede Costa', direccion: 'Paracas', key: 'costa' },
        { nombre: 'Sede Rural', direccion: 'Cusco', key: 'rural' }
    ];

    for (const s of sedesInfo) {
        let { data } = await supabase.from('sedes').select('*').eq('nombre', s.nombre).single();
        if (!data) {
            const res = await supabase.from('sedes').insert({ nombre: s.nombre, direccion: s.direccion, identificador: s.key }).select().single();
            data = res.data;
        }
        if (data) mapaSedes[s.key] = data.id;
    }
    console.log("Sedes IDs:", mapaSedes);

    // 2. Categorías
    let mapaCategorias = {};
    const todasLasCats = Array.from(new Set([...DATA_SEDES.costa.categorias, ...DATA_SEDES.rural.categorias]));

    for (const cat of todasLasCats) {
        // Try find
        let { data } = await supabase.from('categorias').select('id').eq('nombre', cat).maybeSingle();

        if (!data) {
            // Try insert
            const res = await supabase.from('categorias').insert({ nombre: cat, activo: true }).select().single();
            data = res.data;
        }

        if (data) {
            mapaCategorias[cat] = data.id;
        } else {
            console.error("❌ ERROR FATAL: No se pudo crear categoría", cat);
        }
    }
    console.log("Categorias Map Check:", Object.keys(mapaCategorias).length, "cargadas.");

    // 3. Recursos
    const nuevosRecursos = [];

    for (const sedeKey of ['costa', 'rural']) {
        const sedeId = mapaSedes[sedeKey];
        const config = DATA_SEDES[sedeKey];

        for (const catNombre of config.categorias) {
            const catId = mapaCategorias[catNombre];

            if (!catId) {
                console.error(`❌ Category ID missing for ${catNombre}! Skipping items.`);
                continue;
            }

            const nombresItems = config.nombres[catNombre];
            const imagenes = IMAGENES[catNombre] || [];

            for (let i = 0; i < 5; i++) {
                const nombreBase = nombresItems[i % nombresItems.length];
                const imagen = imagenes[i % imagenes.length] || 'https://via.placeholder.com/600';

                nuevosRecursos.push({
                    nombre: `${nombreBase} ${i + 1}`,
                    codigo_patrimonial: `${sedeKey.slice(0, 1).toUpperCase()}-${catNombre.slice(0, 3).toUpperCase()}-${1000 + i}`,
                    sede_id: sedeId,
                    categoria_id: catId,
                    precio_lista_hora: 50 + (i * 5),
                    stock_fisico_inicial: 8,
                    estado_operativo: 'DISPONIBLE',
                    imagen_url: imagen,
                    activo: true,
                    descripcion: `Item exclusivo.`
                });
            }
        }
    }

    if (nuevosRecursos.length > 0) {
        const { error } = await supabase.from('recursos').insert(nuevosRecursos);
        if (error) console.error("Error insertando recursos:", error);
        else console.log(`✨ ÉXITO TOTAL: Insertados ${nuevosRecursos.length} recursos.`);
    } else {
        console.warn("⚠️ No resources generated to insert.");
    }
}

main();
