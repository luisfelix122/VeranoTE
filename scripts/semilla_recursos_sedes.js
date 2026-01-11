
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwNzIyOCwiZXhwIjoyMDc5NDgzMjI4fQ.U1zNNbTm6oLDhU16t5hEv2S7WiYXLp-xcuq4Qd-aSk4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Banco de Imágenes (Approximate thematic URLs - usando placeholders temáticos visuales para evitar roturas)
// Nota: Para producción usaríamos Cloudinary/Supabase Storage. Aquí usamos placeholders bonitos.
const IMAGENES = {
    'Motor': [
        'https://images.unsplash.com/photo-1570744155333-e7cb2818557a?auto=format&fit=crop&w=600&q=80', // Quad
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80', // Moto
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80', // Car
        'https://images.unsplash.com/photo-1517512006864-7edc30c4ddaa?auto=format&fit=crop&w=600&q=80'  // Jeep
    ],
    'Acuático': [
        'https://images.unsplash.com/photo-1563630441238-d67b2cb6dfa9?auto=format&fit=crop&w=600&q=80', // Jet Ski (simulado)
        'https://images.unsplash.com/photo-1543857310-4c8d5d9962f3?auto=format&fit=crop&w=600&q=80', // Kayak
        'https://images.unsplash.com/photo-1544551763-46a8723ba3f9?auto=format&fit=crop&w=600&q=80', // Paddle
        'https://images.unsplash.com/photo-1520645521318-40367f840900?auto=format&fit=crop&w=600&q=80'  // Boat
    ],
    'Playa': [
        'https://images.unsplash.com/photo-1596564639908-1669e4ce7c10?auto=format&fit=crop&w=600&q=80', // Sombrilla
        'https://images.unsplash.com/photo-1519046904884-53103b34b271?auto=format&fit=crop&w=600&q=80', // Chairs
        'https://images.unsplash.com/photo-1557002665-c3228965f7c3?auto=format&fit=crop&w=600&q=80', // Beach Set
        'https://images.unsplash.com/photo-1623944889288-cd147dbb517c?auto=format&fit=crop&w=600&q=80'  // Ball/Game
    ],
    'Aventura': [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80', // Camping
        'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=600&q=80', // Bike
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80', // Trekking
        'https://images.unsplash.com/photo-1533230485908-8e62d4957e80?auto=format&fit=crop&w=600&q=80'  // Gear
    ]
};

// Generador de Variantes
const NOMBRES_UNICOS = {
    'Motor': ['Cuatrimoto Raptor 700', 'Moto Cross Honda CRF', 'Buggy Arenero V8', 'Jeep Wrangler Safari', 'Can-Am Maverick', 'Polaris RZR Turbo', 'Moto Lineal 250cc', 'Cuatrimoto Grizzly'],
    'Acuático': ['Moto Acuática Yamaha', 'Kayak Doble Travesía', 'Tabla Paddle Surf Pro', 'Bote Zodiac 6pax', 'Catamarán Hobie Cat', 'Equipo de Snorkel Pro', 'Kayak Simple', 'Banana Boat'],
    'Playa': ['Set Sombrilla Familiar', 'Sillas Playeras Premium', 'Cooler Igloo con Ruedas', 'Juego Paletas Pro', 'Carpa Playera UV', 'Hamaca Portátil', 'Toallas XL Premium', 'Mesa Plegable Camping'],
    'Aventura': ['Carpa 4 Estaciones', 'Bicicleta Trek Marlin', 'Binoculares Nikon', 'Mochila Osprey 60L', 'Bastones Trekking Carbon', 'Linterna Frontal LED', 'Colchoneta Inflable', 'Kit Cocina Camping']
};

async function main() {
    console.log("🌱 Regenerando Recursos y Sedes (V2 Mejorada)...");

    // Limpiar Recursos Existentes (Para evitar duplicados y "limpiar" la vista)
    // Nota: Esto borrará el historial de IDs, cuidado si hay alquileres linkeados (en dev ok).
    const { error: errDel } = await supabase.from('recursos').delete().neq('id', 0);
    if (errDel) console.warn("Aviso al borrar recursos:", errDel.message);
    else console.log("🧹 Recursos anteriores limpiados.");

    // 1. Sedes (Upsert)
    const sedes = [
        { nombre: 'Sede Costa', direccion: 'Av. Costanera 123, Paracas', hora_apertura: '08:00', hora_cierre: '18:00', identificador: 'costa', imagen_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
        { nombre: 'Sede Rural', direccion: 'Valle Sagrado Km 40, Cusco', hora_apertura: '07:00', hora_cierre: '17:00', identificador: 'rural', imagen_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' }
    ];

    const mapaSedes = {};

    for (const s of sedes) {
        let { data, error } = await supabase.from('sedes').select('id').eq('nombre', s.nombre).single();
        if (!data) {
            const { data: inserted } = await supabase.from('sedes').insert({
                nombre: s.nombre, direccion: s.direccion, hora_apertura: s.hora_apertura, hora_cierre: s.hora_cierre
            }).select().single();
            data = inserted;
        }
        mapaSedes[s.identificador] = data.id;
        console.log(`✅ Sede ${s.nombre} ID: ${data.id}`);
    }

    // 2. Categorías (Upsert)
    const categorias = ['Motor', 'Acuático', 'Playa', 'Aventura'];
    const mapaCategorias = {};

    for (const cat of categorias) {
        let { data } = await supabase.from('categorias').select('id').eq('nombre', cat).single();
        if (!data) {
            const { data: inserted } = await supabase.from('categorias').insert({ nombre: cat, activo: true }).select().single();
            data = inserted;
        }
        mapaCategorias[cat] = data.id;
    }

    // 3. Recursos (Generación Variada)
    const nuevosRecursos = [];

    for (const sedeKey of ['costa', 'rural']) {
        const sedeId = mapaSedes[sedeKey];
        if (!sedeId) continue;

        for (const catKey of categorias) {
            const catId = mapaCategorias[catKey];
            const nombresPosibles = NOMBRES_UNICOS[catKey];
            const imagenesPosibles = IMAGENES[catKey];

            // Insertar unos 5-6 items únicos por categoría por sede
            for (let i = 0; i < 6; i++) {
                // Selección circular de nombres e imágenes
                const nombreBase = nombresPosibles[i % nombresPosibles.length];
                const imagen = imagenesPosibles[i % imagenesPosibles.length];

                // Variación de precio ligera
                let precioBase = 0;
                if (catKey === 'Motor') precioBase = 80;
                else if (catKey === 'Acuático') precioBase = 45;
                else if (catKey === 'Playa') precioBase = 15;
                else precioBase = 25;

                nuevosRecursos.push({
                    nombre: `${nombreBase} (${sedeKey === 'costa' ? 'Mar' : 'Campo'})`, // Diferenciar nombre visualmente
                    codigo_patrimonial: `${sedeKey.toUpperCase().slice(0, 1)}-${catKey.toUpperCase().slice(0, 3)}-${1000 + i}`,
                    sede_id: sedeId,
                    categoria_id: catId,
                    precio_lista_hora: precioBase + (i * 2),
                    stock_fisico_inicial: Math.floor(Math.random() * 5) + 5, // Asegurar stock (5 a 10)
                    estado_operativo: 'DISPONIBLE',
                    imagen_url: imagen,
                    activo: true,
                    descripcion: `Equipo profesional de categoría ${catKey}, ideal para disfrutar en ${sedeKey}. Incluye mantenimiento preventivo.`
                });
            }
        }
    }

    const { error: errInsert } = await supabase.from('recursos').insert(nuevosRecursos);
    if (errInsert) console.error("❌ Error insertando:", errInsert);
    else console.log(`✨ Insertados ${nuevosRecursos.length} recursos con imágenes reales y stock.`);

}

main();
