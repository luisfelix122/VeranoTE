
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const IMAGENES = {
    'Náutica': ['https://images.unsplash.com/photo-1544551763-46a8723ba3f9?q=80&w=600', 'https://images.unsplash.com/photo-1564998705-591dc8f70094?q=80&w=600', 'https://images.unsplash.com/photo-1520645521318-40367f840900?q=80&w=600'],
    'Playa Relax': ['https://images.unsplash.com/photo-1596564639908-1669e4ce7c10?q=80&w=600', 'https://images.unsplash.com/photo-1519046904884-53103b34b271?q=80&w=600', 'https://images.unsplash.com/photo-1533577116850-9c2b7c01fe48?q=80&w=600'],
    'Ruedas Marinas': ['https://images.unsplash.com/photo-1570744155333-e7cb2818557a?q=80&w=600', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600', 'https://images.unsplash.com/photo-1517512006864-7edc30c4ddaa?q=80&w=600'],
    'Aventura Costa': ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600'],
    'Exploración Andina': ['https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=600', 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?q=80&w=600'],
    'Camping Valle': ['https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=600', 'https://images.unsplash.com/photo-1496545672479-7ac372c7a618?q=80&w=600'],
    'Ruedas Offroad': ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600', 'https://images.unsplash.com/photo-1517512006864-7edc30c4ddaa?q=80&w=600', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600']
};

const DATA_SEDES = {
    'costa': {
        nombreSede: 'Sede Costa',
        categorias: ['Náutica', 'Playa Relax', 'Ruedas Marinas', 'Aventura Costa'],
        nombres: {
            'Náutica': ['Kayak Travesía', 'Moto Acuática Jet', 'Tabla Paddle', 'Bote Zodiac', 'Velero Ligero', 'Equipo Windsurf'],
            'Playa Relax': ['Sombrilla Premium', 'Silla Reclinable', 'Cooler XL', 'Carpa UV', 'Hamaca Portatil', 'Juego Paletas'],
            'Ruedas Marinas': ['Cuatrimoto Arenera', 'Buggy V8', 'Jeep Safari', 'Fat Bike Playa', 'Moto Enduro Lite'],
            'Aventura Costa': ['Kit Snorkel', 'Tienda Playa 4P', 'Detector Metales', 'Frisbee Pro']
        }
    },
    'rural': {
        nombreSede: 'Sede Rural',
        categorias: ['Exploración Andina', 'Camping Valle', 'Ruedas Offroad'],
        nombres: {
            'Exploración Andina': ['Bastones Trekking', 'Binoculares Pro', 'Mochila Técnica', 'Botas Alquiler', 'GPS Garmin'],
            'Camping Valle': ['Carpa 4 Estaciones', 'Sleeping Bag -10C', 'Kit Cocina', 'Lampara Gas', 'Colchoneta Inflable', 'Silla Camping'],
            'Ruedas Offroad': ['Moto Cross 250cc', 'Cuatrimoto Montaña', 'Polaris RZR', 'Bicicleta Downhill', 'Moto Trial']
        }
    }
}

async function main() {
    console.log("🌱 V6 Populate con 5+ items/cat...");

    // Limpiar Recursos (IDs nuevos)
    await supabase.from('recursos').delete().neq('id', 0);
    console.log("Recursos limpiados.");

    // 1. Obtener IDs de Sedes (Deben existir)
    const mapaSedes = {};
    for (const key in DATA_SEDES) {
        const nombre = DATA_SEDES[key].nombreSede;
        // Búsqueda robusta ILIKE
        const { data } = await supabase.from('sedes').select('id').ilike('nombre', `%${key}%`).limit(1).single();
        if (data) mapaSedes[key] = data.id;
        else console.error("Falta sede:", nombre);
    }

    // 2. Obtener IDs de Categorías (Deben existir)
    const todasCats = new Set([...DATA_SEDES.costa.categorias, ...DATA_SEDES.rural.categorias]);
    const mapaCategorias = {};
    for (const cat of todasCats) {
        const { data } = await supabase.from('categorias').select('id').eq('nombre', cat).maybeSingle();
        if (data) mapaCategorias[cat] = data.id;
        else {
            // Fallback insert si falta
            const { data: inserted } = await supabase.from('categorias').insert({ nombre: cat, activo: true }).select().single();
            if (inserted) mapaCategorias[cat] = inserted.id;
        }
    }

    // 3. Insertar
    const inserts = [];
    for (const sedeKey of ['costa', 'rural']) {
        const sedeId = mapaSedes[sedeKey];
        if (!sedeId) continue;

        const config = DATA_SEDES[sedeKey];

        for (const cat of config.categorias) {
            const catId = mapaCategorias[cat];
            if (!catId) continue;

            const items = config.nombres[cat] || ['Generico'];
            const imgs = IMAGENES[cat] || [];

            // Generar 5 items mínimo
            for (let i = 0; i < items.length; i++) {
                inserts.push({
                    nombre: items[i], // Nombre limpio
                    codigo_patrimonial: `${sedeKey[0].toUpperCase()}-${cat.substring(0, 3).toUpperCase()}-${100 + i}`,
                    sede_id: sedeId,
                    categoria_id: catId,
                    precio_lista_hora: 30 + (i * 5),
                    stock_fisico_inicial: Math.floor(Math.random() * 8) + 4, // 4 a 12
                    estado_operativo: 'DISPONIBLE',
                    imagen_url: imgs[i % imgs.length] || 'https://via.placeholder.com/600',
                    activo: true,
                    descripcion: `Item premium de ${cat}.`
                });
            }
        }
    }

    const { error, data } = await supabase.from('recursos').insert(inserts).select();
    if (error) console.error("Error inserting:", error);
    else console.log(`✨ V6 Éxito: ${data.length} items creados.`);
}

main();
