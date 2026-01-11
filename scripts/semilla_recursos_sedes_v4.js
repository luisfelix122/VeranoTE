
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Banco de Imágenes (Unsplash)
const IMAGENES = {
    // COSTA
    'Náutica': [
        'https://images.unsplash.com/photo-1544551763-46a8723ba3f9?q=80&w=600', // Kayak/Paddle
        'https://images.unsplash.com/photo-1564998705-591dc8f70094?q=80&w=600', // Jet Ski
        'https://images.unsplash.com/photo-1520645521318-40367f840900?q=80&w=600'  // Bote
    ],
    'Playa Relax': [
        'https://images.unsplash.com/photo-1596564639908-1669e4ce7c10?q=80&w=600', // Sombrilla
        'https://images.unsplash.com/photo-1519046904884-53103b34b271?q=80&w=600', // Sillas
        'https://images.unsplash.com/photo-1533577116850-9c2b7c01fe48?q=80&w=600'  // Tumbona
    ],
    'Ruedas Marinas': [
        'https://images.unsplash.com/photo-1570744155333-e7cb2818557a?q=80&w=600', // Quad Arena
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600'  // Buggy
    ],
    'Aventura Costa': [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=600', // Camping Playa
        'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600'  // Equipo Outdoor
    ],

    // RURAL
    'Exploración Andina': [
        'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=600', // Trekking
        'https://images.unsplash.com/photo-1516939884455-1445c8652f83?q=80&w=600'  // Mochilas
    ],
    'Camping Valle': [
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=600', // Tent Forest
        'https://images.unsplash.com/photo-1496545672479-7ac372c7a618?q=80&w=600'  // Campfire set
    ],
    'Ruedas Offroad': [
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600', // Moto Cross
        'https://images.unsplash.com/photo-1517512006864-7edc30c4ddaa?q=80&w=600'  // Jeep
    ]
};

const DATA_SEDES = {
    'costa': {
        categorias: ['Náutica', 'Playa Relax', 'Ruedas Marinas', 'Aventura Costa'],
        nombres: {
            'Náutica': ['Kayak Travesía', 'Moto Acuática Jet', 'Tabla Paddle Surf', 'Bote Zodiac'],
            'Playa Relax': ['Sombrilla Premium', 'Silla Reclinable', 'Cooler XL', 'Carpa UV'],
            'Ruedas Marinas': ['Cuatrimoto Arenera', 'Buggy V8', 'Jeep Safari'],
            'Aventura Costa': ['Kit Snorkel', 'Tienda Playa 4P']
        }
    },
    'rural': {
        categorias: ['Exploración Andina', 'Camping Valle', 'Ruedas Offroad'],
        nombres: {
            'Exploración Andina': ['Bastones Trekking', 'Binoculares Pro', 'Mochila Técnica'],
            'Camping Valle': ['Carpa 4 Estaciones', 'Sleeping Bag -10C', 'Kit Cocina'],
            'Ruedas Offroad': ['Moto Cross 250cc', 'Cuatrimoto Montaña', 'Polaris RZR']
        }
    }
}

async function main() {
    console.log("🌱 Regenerando (V4 - Categorías Únicas por Sede)...");

    // 1. Sedes
    let mapaSedes = {};
    const sedesInfo = [
        { nombre: 'Sede Costa', direccion: 'Paracas Beach', key: 'costa' },
        { nombre: 'Sede Rural', direccion: 'Valle Sagrado', key: 'rural' }
    ];

    for (const s of sedesInfo) {
        let { data } = await supabase.from('sedes').select('*').eq('nombre', s.nombre).single();
        if (!data) {
            const res = await supabase.from('sedes').insert({ nombre: s.nombre, direccion: s.direccion }).select().single();
            data = res.data;
        }
        if (data) {
            mapaSedes[s.key] = data.id;
            console.log(`📍 Sede ${s.nombre} ID: ${data.id}`);
        } else {
            console.error("Fallo creando sede", s.nombre);
        }
    }

    // 2. Insertar Categorías y crear mapa
    let mapaCategorias = {};
    const todasLasCats = [...DATA_SEDES.costa.categorias, ...DATA_SEDES.rural.categorias];

    for (const cat of todasLasCats) {
        let { data } = await supabase.from('categorias').select('*').eq('nombre', cat).single();
        if (!data) {
            const res = await supabase.from('categorias').insert({ nombre: cat, activo: true }).select().single();
            data = res.data;
        }
        if (data) mapaCategorias[cat] = data.id;
    }

    // 3. Insertar Recursos
    const nuevosRecursos = [];

    for (const sedeKey of ['costa', 'rural']) {
        const sedeId = mapaSedes[sedeKey];
        const config = DATA_SEDES[sedeKey];

        for (const catNombre of config.categorias) {
            const catId = mapaCategorias[catNombre];
            const nombresItems = config.nombres[catNombre];
            const imagenes = IMAGENES[catNombre] || [];

            // 5 items por categoría
            for (let i = 0; i < 5; i++) {
                const nombreBase = nombresItems[i % nombresItems.length];
                const imagen = imagenes[i % imagenes.length] || 'https://via.placeholder.com/600';

                let precio = 30;
                if (catNombre.includes('Ruedas') || catNombre.includes('Motor')) precio = 90;
                if (catNombre.includes('Náutica')) precio = 50;
                if (catNombre.includes('Playa')) precio = 20;

                nuevosRecursos.push({
                    nombre: `${nombreBase} ${i + 1}`,
                    codigo_patrimonial: `${sedeKey.slice(0, 1).toUpperCase()}-${catNombre.slice(0, 3).toUpperCase()}-${1000 + i}`,
                    sede_id: sedeId,
                    categoria_id: catId,
                    precio_lista_hora: precio + (i * 2),
                    stock_fisico_inicial: 8, // Stock fijo garantizado
                    estado_operativo: 'DISPONIBLE',
                    imagen_url: imagen,
                    activo: true,
                    descripcion: `Item exclusivo de ${catNombre} en ${sedesInfo.find(s => s.key === sedeKey).nombre}`
                });
            }
        }
    }

    const { error } = await supabase.from('recursos').insert(nuevosRecursos);
    if (error) console.error("Error insertando recursos:", error);
    else console.log(`✨ Insertados ${nuevosRecursos.length} recursos.`);
}

main();
