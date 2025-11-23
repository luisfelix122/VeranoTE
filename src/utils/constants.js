export const sedes = [
    {
        id: 'costa',
        nombre: 'Sede Costa',
        direccion: 'Av. Costanera 123',
        descripcion: 'Disfruta del sol y las olas con nuestra mejor selección de equipos acuáticos. Ubicada frente al mar, esta sede ofrece acceso directo a la playa y vestidores exclusivos.',
        servicios: ['Wifi Gratuito', 'Vestidores y Duchas', 'Estacionamiento', 'Guardarropa', 'Escuela de Surf'],
        imagen: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000',
        horario: '08:00 AM - 06:00 PM'
    },
    {
        id: 'rural',
        nombre: 'Sede Campo',
        direccion: 'Carretera Central Km 40',
        descripcion: 'Conecta con la naturaleza. Nuestra sede de campo es el punto de partida ideal para aventuras de trekking y ciclismo de montaña. Aire puro y paisajes increíbles.',
        servicios: ['Zona de Camping', 'Alquiler de Parrillas', 'Rutas Guiadas', 'Taller de Bicicletas', 'Cafetería'],
        imagen: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000',
        horario: '07:00 AM - 05:00 PM'
    }
];

export const inventarioInicial = [
    // Sede Costa
    {
        id: 1,
        sedeId: 'costa',
        nombre: 'Kayak Doble',
        categoria: 'Acuático',
        precioPorHora: 45,
        stock: 5,
        imagen: 'https://images.unsplash.com/photo-1520045864914-6948b3bfbc62?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Kayak estable y seguro para dos personas. Ideal para explorar la costa con amigos o familia. Incluye remos y chalecos salvavidas.'
    },
    {
        id: 2,
        sedeId: 'costa',
        nombre: 'Tabla de Surf',
        categoria: 'Acuático',
        precioPorHora: 30,
        stock: 8,
        imagen: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Tabla de surf de alto rendimiento, disponible en varios tamaños (Longboard, Shortboard). Perfecta para principiantes y expertos.'
    },
    {
        id: 3,
        sedeId: 'costa',
        nombre: 'Sombrilla de Playa',
        categoria: 'Playa',
        precioPorHora: 10,
        stock: 20,
        imagen: 'https://images.unsplash.com/photo-1596122511748-03b14271f67c?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Sombrilla amplia con protección UV. Incluye instalación y dos sillas de playa cómodas para disfrutar del día sin preocupaciones.'
    },
    {
        id: 4,
        sedeId: 'costa',
        nombre: 'Equipo de Snorkel',
        categoria: 'Acuático',
        precioPorHora: 15,
        stock: 15,
        imagen: 'https://images.unsplash.com/photo-1629248456652-8a8e15ad4a3c?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Set completo de snorkel (máscara, tubo y aletas). Explora la vida marina con claridad y comodidad. Desinfectado tras cada uso.'
    },

    // Sede Rural
    {
        id: 5,
        sedeId: 'rural',
        nombre: 'Bicicleta de Montaña',
        categoria: 'Terrestre',
        precioPorHora: 35,
        stock: 10,
        imagen: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Bicicleta MTB con suspensión delantera y frenos de disco. Perfecta para los senderos de la zona. Incluye casco y kit de reparación básico.'
    },
    {
        id: 6,
        sedeId: 'rural',
        nombre: 'Tienda de Campaña (4p)',
        categoria: 'Camping',
        precioPorHora: 60,
        stock: 3,
        imagen: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Carpa resistente e impermeable para 4 personas. Fácil de armar. Ideal para pasar la noche bajo las estrellas con seguridad.'
    },
    {
        id: 7,
        sedeId: 'rural',
        nombre: 'Cuatrimoto',
        categoria: 'Motor',
        precioPorHora: 120,
        stock: 4,
        imagen: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Potente cuatrimoto 4x4 automática. Adrenalina pura para recorrer terrenos difíciles. Requiere licencia de conducir vigente.'
    },
    {
        id: 8,
        sedeId: 'rural',
        nombre: 'Equipo de Trekking',
        categoria: 'Terrestre',
        precioPorHora: 25,
        stock: 12,
        imagen: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=500',
        descripcion: 'Bastones de trekking ajustables y mochila técnica de 30L. El equipamiento esencial para tus caminatas largas por la montaña.'
    },
];

export const usuariosIniciales = [
    { id: 'u1', nombre: 'Juan Pérez', email: 'cliente@demo.com', telefono: '999888777', rol: 'cliente', password: '123', tipoDocumento: 'DNI', numeroDocumento: '12345678', fechaNacimiento: '1990-01-01', licenciaConducir: true, nacionalidad: 'Nacional', direccion: 'Av. Larco 101, Lima', contactoEmergencia: 'Maria Perez - 999111222' },
    { id: 'u2', nombre: 'Admin General', email: 'admin@demo.com', telefono: '999000111', rol: 'admin', password: '123', anexo: '101', oficina: 'Administración Central' },
    { id: 'u3', nombre: 'Vendedor Local', email: 'vendedor@demo.com', telefono: '999222333', rol: 'vendedor', password: '123', codigoEmpleado: 'V-001', turno: 'Mañana', sede: 'costa' },
    { id: 'u4', nombre: 'Sr. Dueño', email: 'dueno@demo.com', telefono: '999999999', rol: 'dueno', password: '123', anexo: '100', oficina: 'Gerencia' },
    { id: 'u5', nombre: 'Mecánico Jefe', email: 'mecanico@demo.com', telefono: '999555666', rol: 'mecanico', password: '123', especialidad: 'Motores y Eléctrico', experiencia: '10 años' },
];
