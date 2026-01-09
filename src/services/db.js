import { supabase } from '../supabase/client';

export const obtenerRecursos = async () => {
    // Consultamos la tabla base 'recursos' para incluir los desactivados (activo=false) para el administrador
    const { data, error } = await supabase
        .from('recursos')
        .select(`
            *,
            categorias (
                nombre
            )
        `)
        .order('id', { ascending: true });

    if (error) {
        console.error('Error al obtener recursos:', error);
        return [];
    }
    // Aplanar la estructura para que el frontend reciba 'categoria' como string
    return data.map(item => ({
        ...item,
        categoria: item.categorias?.nombre || 'Sin Categoría',
        stock: item.stock_total, // Nota: El stock dinámico se enriquece en el Contexto posteriormente
        stockTotal: item.stock_total
    }));
};

export const obtenerCategorias = async () => {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
    return data;
};

export const crearCategoriaDB = async (nombre, sedeId = null) => {
    const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre, sede_id: sedeId }])
        .select()
        .single();

    if (error) {
        console.error('Error al crear categoría:', error);
        throw error;
    }
    return data;
};

export const eliminarCategoriaDB = async (id) => {
    const { error } = await supabase
        .from('categorias')
        .update({ activo: false })
        .eq('id', id);

    if (error) {
        console.error('Error al desactivar categoría:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const reactivarCategoriaDB = async (id) => {
    const { error } = await supabase
        .from('categorias')
        .update({ activo: true })
        .eq('id', id);

    if (error) {
        console.error('Error al reactivar categoría:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const obtenerSedes = async () => {
    // Join con SEDE_SERVICIOS y SERVICIOS
    const { data, error } = await supabase
        .from('sedes')
        .select(`
            *,
            sede_servicios (
                servicios ( nombre )
            )
        `);

    if (error) {
        console.error('Error al obtener sedes:', error);
        return [];
    }

    // Formatear servicios como array de strings
    return data.map(sede => ({
        ...sede,
        servicios: sede.sede_servicios.map(ss => ss.servicios.nombre)
    }));
};

export const obtenerHorarios = async () => {
    const { data, error } = await supabase
        .from('horarios_sede')
        .select('*');

    if (error) {
        console.error('Error al obtener horarios:', error);
        return [];
    }
    return data;
};

// Función para calcular cotización en el servidor
export const calcularCotizacion = async (items, fechaInicio, tipoReserva, clienteId, cupon = null) => {
    // Usamos el mismo RPC robusto que para descuentos
    // Proporcionar defaults seguros para evitar 404 por firma incompleta
    const { data, error } = await supabase.rpc('calcular_descuento_simulado', {
        p_items: items,
        p_fecha_inicio: fechaInicio || new Date().toISOString(),
        p_tipo_reserva: tipoReserva || 'inmediata',
        p_cliente_id: clienteId || null,
        p_cupon: cupon
    });

    if (error) {
        console.error('Error calculando cotización:', error);
        return null;
    }
    return {
        subtotal_base: Number(data.subtotal_base) || 0,
        igv: Number(data.igv) || 0,
        subtotal: Number(data.subtotal) || 0,
        garantia: Number(data.garantia) || 0,
        total: Number(data.total_a_pagar) || 0,
        descuento: Number(data.descuento) || 0,
        alertas: data.alertas || [],
        promocionesAplicadas: data.promocionesAplicadas || [],
        total_dolares: data.total_dolares
    };
};

export const obtenerConfiguracion = async () => {
    const { data, error } = await supabase
        .from('configuracion')
        .select('*');

    if (error) {
        console.error('Error al obtener configuración:', error);
        return [];
    }
    // Convertir array a objeto clave-valor para fácil acceso
    const config = {};
    data.forEach(item => {
        config[item.clave] = item.valor;
    });
    return config;
};

export const obtenerContenidoWeb = async () => {
    const { data, error } = await supabase
        .from('contenido_web')
        .select('*');

    if (error) {
        console.error('Error al obtener contenido web:', error);
        return {};
    }
    const contenido = {};
    data.forEach(item => {
        contenido[item.clave] = item.valor;
    });
    return contenido;
};

export const obtenerUsuarios = async () => {
    // Leemos de la VISTA normalizada que ya hace los Joins
    // Nota: La vista se llama 'v_usuarios_completos' (plural) en el esquema
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }

    // Mapeo ligero para asegurar compatibilidad con la UI existente
    return data.map(u => ({
        ...u,
        rol: u.rol,      // La vista ya devuelve el ID del rol como 'rol'
        sede: u.sede_id  // La vista devuelve 'sede_id'
    }));
};

export const obtenerUsuarioPorId = async (id) => {
    // Usamos la vista para obtener todos los datos aplanados
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener usuario por ID:', error);
        return null;
    }

    // Mapeo ligero
    return {
        ...data,
        rol: data.rol,
        sede: data.sede_id
    };
};

export const crearReserva = async (datosReserva) => {
    // Preparar items para el RPC robusto
    const itemsRPC = datosReserva.items.map(item => ({
        id: item.id,
        cantidad: item.cantidad,
        horas: item.horas,
        precioPorHora: item.precioPorHora, // DB function uses camelCase
        categoria: item.categoria // Necesario para promociones
    }));

    const payload = {
        p_cliente_id: datosReserva.clienteId ? String(datosReserva.clienteId) : null,
        p_vendedor_id: datosReserva.vendedorId ? String(datosReserva.vendedorId) : null,
        p_sede_id: String(datosReserva.sedeId || 'costa'),
        p_items: itemsRPC,
        p_fecha_inicio: datosReserva.fechaInicio,
        p_tipo_reserva: datosReserva.tipoReserva,
        p_metodo_pago_id: datosReserva.metodoPago ? String(datosReserva.metodoPago) : null,
        p_tipo_comprobante: datosReserva.tipoComprobante,
        p_datos_factura: datosReserva.datosFactura,
        p_cupon: datosReserva.cupon || null
    };

    try {
        const { data, error } = await supabase.rpc('crear_reserva_robusta', payload);

        if (error) {
            console.error('Error al crear reserva (RPC Error):', error);
            console.error('Payload enviado:', payload);
            return { success: false, error: error.message };
        }
        return data;
    } catch (err) {
        console.error('Error inesperado al crear reserva (Network/Client):', err);
        console.error('Payload fallido:', payload);
        return { success: false, error: "Error de conexión o datos inválidos." };
    }
};

export const verificarDisponibilidadDB = async (items, fechaInicio) => {
    const itemsRPC = items.map(item => ({
        id: item.id,
        cantidad: item.cantidad,
        horas: item.horas
    }));

    const { data, error } = await supabase
        .rpc('verificar_disponibilidad_items', {
            p_fecha_inicio: fechaInicio,
            p_items: itemsRPC
        });

    if (error) {
        console.error('Error al verificar disponibilidad:', error);
        return { valido: false, mensaje: 'Error de conexión al verificar disponibilidad' };
    }
    return data;
};

export const calcularDescuentosDB = async (items, fechaInicio, cupon = null) => {
    // 1. Calcular totales base localmente (Matemática estándar)
    const totalBase = items.reduce((acc, item) => acc + (Number(item.precioPorHora || 0) * Number(item.horas || 0) * Number(item.cantidad || 0)), 0);
    const garantia = totalBase * 0.20;

    // 2. Obtener descuentos avanzados desde DB
    const itemsRPC = items.map(item => ({
        id: item.id,
        cantidad: Number(item.cantidad) || 0,
        horas: Number(item.horas) || 0,
        precioPorHora: Number(item.precioPorHora) || 0,
        categoria: item.categoria
    }));

    const { data, error } = await supabase
        .rpc('calcular_descuento_simulado', {
            p_items: itemsRPC,
            p_fecha_inicio: fechaInicio || new Date().toISOString(),
            p_tipo_reserva: 'inmediata', // Default en DB pero explicito para evitar ambiguacion
            p_cliente_id: null,
            p_cupon: cupon
        });

    if (error || !data) {
        if (error) console.error('Error al calcular descuentos:', error);
        // Fallback: retornar base sin descuento si hay error o no hay datos
        return {
            total_servicio: totalBase,
            garantia: garantia,
            total_a_pagar: totalBase + garantia,
            descuento_total: 0,
            alertas: [],
            promocionesAplicadas: []
        };
    }

    // 3. Retornar datos directamente del RPC (ahora es la fuente de verdad)
    return {
        subtotal_base: Number(data.subtotal_base) || 0,
        igv: Number(data.igv) || 0,
        subtotal: Number(data.subtotal) || 0, // Total Servicio (Base + IGV)
        garantia: Number(data.garantia) || 0,
        total: Number(data.total_a_pagar) || 0, // Total Final
        descuento: Number(data.descuento) || 0,
        alertas: data.alertas || [],
        promocionesAplicadas: data.promocionesAplicadas || [],
        total_dolares: data.total_dolares
    };
};

export const registrarDevolucionDB = async (alquilerId, vendedorId, devolverGarantia = false) => {
    // 1. Ejecutar la lógica base de devolución (RPC)
    const { data, error } = await supabase
        .rpc('registrar_devolucion_robusta', {
            p_alquiler_id: alquilerId,
            p_vendedor_id: vendedorId
        });

    if (error) {
        console.error('Error al registrar devolución:', error);
        return { success: false, error: error.message || error };
    }

    // 2. Si se solicitó devolver garantía, ajustamos el total final
    if (devolverGarantia) {
        // Necesitamos saber cuánto era la garantía. Consultamos el alquiler.
        const { data: alq, error: errAlq } = await supabase
            .from('alquileres')
            .select('garantia, total_final')
            .eq('id', alquilerId)
            .single();

        if (alq && alq.garantia > 0) {
            const nuevoTotal = Math.max(0, alq.total_final - alq.garantia);

            // Actualizamos el total_final restando la garantía (efectivamente "devolviéndola")
            const { error: errUpdate } = await supabase
                .from('alquileres')
                .update({ total_final: nuevoTotal })
                .eq('id', alquilerId);

            if (errUpdate) console.error("Error ajustando total por devolución de garantía:", errUpdate);
            else data.nuevo_total = nuevoTotal; // Actualizar dato devuelto para el frontend
        }
    }

    return data;
};

// Helper para transformar alquiler crudo a formato frontend
// Helper para transformar alquiler crudo a formato frontend
const transformarAlquiler = (a) => {
    let vendedorInfo = 'Web / Auto-servicio';
    if (a.vendedor) {
        const nombre = a.vendedor.personas?.nombre_completo || a.vendedor.nombre || 'Vendedor'; // Fallback
        let rolNombre = a.vendedor.roles?.nombre || 'Vendedor';
        rolNombre = rolNombre ? rolNombre.charAt(0).toUpperCase() + rolNombre.slice(1) : 'Vendedor';
        vendedorInfo = `${nombre} (${rolNombre})`;
    }

    const clienteData = a.cliente || {};
    const clientePersona = clienteData.personas || {}; // Relación anidada

    return {
        ...a,
        estado: a.estados_alquiler?.nombre || a.estado_id,
        vendedor: vendedorInfo,
        clienteObj: { ...clienteData, ...clientePersona },
        cliente: clientePersona.nombre_completo || clienteData.nombre || (a.cliente_id ? `Cliente (${a.cliente_id.slice(0, 8)})` : 'Cliente No Identificado'),
        clienteDni: clientePersona.numero_documento || clienteData.numero_documento || 'Sin Documento',
        items: a.alquiler_detalles.map(d => ({
            id: d.recurso_id,
            nombre: d.recursos?.nombre,
            imagen: d.recursos?.imagen_url || d.recursos?.imagen,
            cantidad: d.cantidad,
            horas: d.horas,
            precioPorHora: d.precio_unitario
        })),
        cantidad_items: a.alquiler_detalles.reduce((acc, d) => acc + d.cantidad, 0),
        producto_principal: a.alquiler_detalles.map(d => `${d.cantidad}x ${d.recursos?.nombre}`).join(', '),
        imagen_principal: a.alquiler_detalles[0]?.recursos?.imagen_url || a.alquiler_detalles[0]?.recursos?.imagen,
        fechaInicio: a.fecha_inicio,
        fechaFin: a.fecha_fin_estimada || a.fecha_fin,
        sedeId: a.sede_id,
        vendedorId: a.vendedor_id,
        clienteId: a.cliente_id,
        // Correction: Map DB columns to frontend keys
        totalFinal: a.total_calculado || a.total_final,
        saldo_pendiente: a.saldo_pendiente,
        montoPagado: a.monto_pagado,
        totalServicio: a.total_calculado - (a.monto_garantia || 0), // Aproximate if not stored
        garantia: a.monto_garantia
    };
};

export const obtenerAlquileres = async () => {
    // Consulta adaptada a 3NF:
    // usuarios -> personas (1:1)
    const { data, error } = await supabase
        .from('alquileres')
        .select(`
            *,
            alquiler_detalles (
                *,
                recursos ( nombre, imagen_url )
            ),
            cliente:usuarios!cliente_id ( 
                email, 
                personas ( nombre_completo, numero_documento )
            ),
            vendedor:usuarios!vendedor_id ( 
                email, 
                personas ( nombre_completo ), 
                roles ( nombre ) 
            ),
            estados_alquiler ( nombre )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener alquileres:', error);
        return [];
    }

    return data.map(transformarAlquiler);
};

export const obtenerPromociones = async () => {
    const { data, error } = await supabase
        .from('promociones')
        .select('*');

    if (error) {
        console.error('Error al obtener promociones:', error);
        return [];
    }
    return data;
};

export const crearPromocionDB = async (promocion) => {
    const { data, error } = await supabase
        .from('promociones')
        .insert([promocion])
        .select();

    if (error) {
        console.error('Error al crear promoción:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const editarPromocionDB = async (id, datos) => {
    const { data, error } = await supabase
        .from('promociones')
        .update(datos)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error al editar promoción:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const eliminarPromocionDB = async (id) => {
    const { error } = await supabase
        .from('promociones')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar promoción:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const registrarUsuarioDB = async (datosUsuario) => {
    try {
        console.log("Iniciando registro normalizado para:", datosUsuario.email);

        // 1. Insertar en USUARIOS (Credenciales y Rol)
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .insert([{
                email: datosUsuario.email,
                password_hash: datosUsuario.password, // Mapeo a columna correcta (password_hash)
                rol_id: datosUsuario.rol || 'cliente',
                activo: true
            }])
            .select()
            .single();

        if (userError) throw userError;

        const nuevoId = user.id;

        // 2. Insertar en PERSONAS (Datos Biográficos)
        const { error: personaError } = await supabase
            .from('personas')
            .insert([{
                usuario_id: nuevoId,
                nombre_completo: datosUsuario.nombre,
                numero_documento: datosUsuario.numeroDocumento,
                tipo_documento: datosUsuario.tipoDocumento || 'DNI',
                telefono: datosUsuario.telefono,
                fecha_nacimiento: datosUsuario.fechaNacimiento || null,
                nacionalidad: datosUsuario.nacionalidad || 'Perú',
                direccion: datosUsuario.direccion || null
            }]);

        if (personaError) {
            // Rollback manual: Borrar el usuario si falla la persona
            console.error("Error al crear persona, haciendo rollback de usuario...", personaError);
            await supabase.from('usuarios').delete().eq('id', nuevoId);
            throw personaError;
        }

        // 3. Insertar Contacto de Emergencia Inicial (si existe)
        if (datosUsuario.contactoEmergencia) {
            const { error: contError } = await supabase
                .from('contactos_usuario')
                .insert([{
                    usuario_id: nuevoId,
                    nombre_completo: datosUsuario.contactoEmergencia, // Asumimos que viene el nombre
                    telefono: datosUsuario.telefonoEmergencia || '', // Si venía, si no string vacío
                    relacion: 'Contacto Inicial',
                    es_principal: true
                }]);
            if (contError) console.warn("Error al guardar contacto de emergencia inicial:", contError);
        }

        // 4. Insertar en EMPLEADOS (Solo si tiene sede o es staff)
        // Verificamos si es un rol de staff para crear entrada en empleados OR si tiene sede explícita
        const rolesStaff = ['admin', 'vendedor', 'mecanico'];
        if (rolesStaff.includes(datosUsuario.rol) || datosUsuario.sede || datosUsuario.codigoEmpleado) {
            if (datosUsuario.sede) {
                const { error: empError } = await supabase
                    .from('empleados')
                    .insert([{
                        usuario_id: nuevoId,
                        sede_id: datosUsuario.sede,
                        codigo_empleado: datosUsuario.codigoEmpleado,
                        turno: datosUsuario.turno,
                        especialidad: datosUsuario.especialidad
                    }]);

                if (empError) console.error("Error al crear datos de empleado", empError);
            }
        }

        // 5. Insertar en CLIENTES_DETALLES (Si es cliente o tiene licencia)
        if (datosUsuario.rol === 'cliente' || datosUsuario.licenciaConducir !== undefined) {
            const { error: cliError } = await supabase
                .from('clientes_detalles')
                .insert([{
                    usuario_id: nuevoId,
                    licencia_conducir: !!datosUsuario.licenciaConducir, // Forzar booleano
                    preferencias: {} // JSONB default
                }]);

            if (cliError) console.error("Error al crear detalles de cliente", cliError);
        }

        return { success: true, data: user };

    } catch (error) {
        console.error('Error al registrar usuario completo:', error);
        return { success: false, error };
    }
};

export const obtenerContactosUsuario = async (usuarioId) => {
    const { data, error } = await supabase
        .from('contactos_usuario')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('es_principal', { ascending: false }); // Principal primero

    if (error) {
        console.error('Error al obtener contactos:', error);
        return [];
    }
    return data;
};

export const agregarContactoDB = async (contacto) => {
    const { data, error } = await supabase
        .from('contactos_usuario')
        .insert([contacto])
        .select();

    if (error) {
        console.error('Error al agregar contacto:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const eliminarContactoDB = async (id) => {
    const { error } = await supabase
        .from('contactos_usuario')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error };
    return { success: true };
};

export const actualizarUsuarioDB = async (id, datos) => {
    const errors = [];

    // 1. Usuarios (Auth & System info)
    const datosUsuarios = {};
    if (datos.email) datosUsuarios.email = datos.email;
    if (datos.password) datosUsuarios.password = datos.password;
    if (datos.rol) datosUsuarios.rol_id = datos.rol;
    if (datos.activo !== undefined) datosUsuarios.activo = datos.activo;
    if (datos.preguntaSecreta) datosUsuarios.pregunta_secreta = datos.preguntaSecreta;
    if (datos.respuestaSecreta) datosUsuarios.respuesta_secreta = datos.respuestaSecreta;

    if (Object.keys(datosUsuarios).length > 0) {
        const { error } = await supabase.from('usuarios').update(datosUsuarios).eq('id', id);
        if (error) errors.push("Usuarios: " + error.message);
    }

    // 2. Personas (Personal info)
    const datosPersonas = {};
    if (datos.nombre) datosPersonas.nombre_completo = datos.nombre;
    if (datos.numeroDocumento) datosPersonas.numero_documento = datos.numeroDocumento;
    if (datos.tipoDocumento) datosPersonas.tipo_documento = datos.tipoDocumento;
    if (datos.telefono) datosPersonas.telefono = datos.telefono;
    if (datos.direccion) datosPersonas.direccion = datos.direccion;
    if (datos.nacionalidad) datosPersonas.nacionalidad = datos.nacionalidad;
    if (datos.fechaNacimiento) datosPersonas.fecha_nacimiento = datos.fechaNacimiento;
    if (datos.licenciaConducir !== undefined) datosPersonas.licencia_conducir = datos.licenciaConducir;

    if (Object.keys(datosPersonas).length > 0) {
        // Try update first
        const { error } = await supabase.from('personas').update(datosPersonas).eq('usuario_id', id);
        if (error) {
            // Check if it's because row doesn't exist? (unlikely for created user, but possible)
            errors.push("Personas: " + error.message);
        }
    }

    // 3. Empleados (Sede assignment)
    // Only if sede/sede_id is explicitly passed (e.g. by Admin or Logic)
    const sedeId = datos.sede || datos.sede_id;
    if (sedeId) {
        // Upsert logic: Try update, if 0 rows modified (no error but no data), then insert?
        // Supabase update returns data/count?
        // Let's safe-bet upsert if constraints allow, or just check existence.
        // Simplest: Try Update. If success matches 0 rows, Insert.
        const { count, error } = await supabase
            .from('empleados')
            .update({ sede_id: sedeId })
            .eq('usuario_id', id)
            .select('usuario_id', { count: 'exact' });

        if (error) {
            errors.push("Empleados Update: " + error.message);
        } else if (count === 0) {
            // Need to insert
            const { error: errorIns } = await supabase
                .from('empleados')
                .insert({ usuario_id: id, sede_id: sedeId });
            if (errorIns) {
                // Ignore 23505 (dup) just in case race condition
                if (errorIns.code !== '23505') errors.push("Empleados Insert: " + errorIns.message);
            }
        }
    }

    if (errors.length > 0) {
        console.error("Errores al actualizar usuario:", errors);
        return { success: false, error: errors.join('. ') };
    }

    return { success: true };
};

export const eliminarUsuarioDB = async (id) => {
    // 1. Verificar si tiene historial de alquileres
    const { count, error: errorCount } = await supabase
        .from('alquileres')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', id);

    if (errorCount) return { success: false, error: "Error al verificar historial del cliente" };

    if (count > 0) {
        // Tiene historial -> Soft Delete
        // Intentamos actualizar 'activo' a false. Si la columna no existe, esto fallará, 
        // pero asumimos que el usuario la creará o ya existe.
        const { data, error } = await supabase
            .from('usuarios')
            .update({ activo: false })
            .eq('id', id)
            .select();

        if (error) {
            console.error("Error al desactivar usuario:", error);
            return { success: false, error: "No se pudo desactivar. ¿Existe la columna 'activo'?" };
        }
        return { success: true, tipo: 'soft', data: data[0] };

    } else {
        // No tiene historial -> Hard Delete (Opcional, pero limpio)
        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (error) return { success: false, error: error.message };
        return { success: true, tipo: 'hard' };
    }
};

export const obtenerPreguntaRecuperacion = async (email) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('pregunta_secreta')
        .eq('email', email)
        .single();

    if (error || !data) return { success: false, error: 'Usuario no encontrado' };
    if (!data.pregunta_secreta) return { success: false, error: 'El usuario no ha configurado una pregunta de seguridad.' };

    return { success: true, pregunta: data.pregunta_secreta };
};

export const verificarRespuestaRecuperacion = async (email, respuesta) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, respuesta_secreta')
        .eq('email', email)
        .single();

    if (error || !data) return { success: false, error: 'Error al verificar respuesta' };

    // Comparación simple para demo (case-insensitive)
    if (data.respuesta_secreta && data.respuesta_secreta.toLowerCase().trim() === respuesta.toLowerCase().trim()) {
        return { success: true, userId: data.id };
    }
    return { success: false, error: 'Respuesta incorrecta' };
};

export const reprogramarAlquilerDB = async (alquilerId, horasAdicionales) => {
    const { data, error } = await supabase.rpc('reprogramar_alquiler_robusto', {
        p_alquiler_id: alquilerId,
        p_horas_adicionales: horasAdicionales
    });
    if (error) {
        console.error('Error al reprogramar:', error);
        return { success: false, error };
    }
    return data;
};

export const aplicarDescuentoManualDB = async (alquilerId, porcentaje, motivo) => {
    const { data, error } = await supabase.rpc('aplicar_descuento_manual', {
        p_alquiler_id: alquilerId,
        p_porcentaje: porcentaje,
        p_motivo: motivo
    });
    if (error) {
        console.error('Error al aplicar descuento:', error);
        return { success: false, error };
    }
    return data;
};

export const registrarPagoSaldoDB = async (alquilerId, metodoPagoId = 'tarjeta', tarjetaId = null, vendedorId = null) => {
    // 1. Si hay vendedor asignado (cobro presencial), actualizar el alquiler primero
    if (vendedorId) {
        const { error: errorUpdate } = await supabase
            .from('alquileres')
            .update({ vendedor_id: vendedorId })
            .eq('id', alquilerId);

        if (errorUpdate) console.warn("No se pudo asignar vendedor al cobro:", errorUpdate);
    }

    // 2. Registrar el pago usando RPC
    const { data, error } = await supabase.rpc('registrar_pago_saldo', {
        p_alquiler_id: alquilerId,
        p_metodo_pago_id: metodoPagoId,
        p_token_tarjeta: tarjetaId
    });
    if (error) {
        console.error('Error al registrar pago (DB):', error);
        return { success: false, error: error }; // Returning full error object
    }
    return data;
};

export const aprobarReservaDB = async (alquilerId) => {
    const { data, error } = await supabase.rpc('aprobar_reserva', { p_alquiler_id: alquilerId });
    if (error) {
        console.error('Error al aprobar reserva:', error);
        return { success: false, error };
    }
    return data;
};

export const entregarAlquilerDB = async (alquilerId, vendedorId) => {
    const { data, error } = await supabase.rpc('entregar_alquiler_robusto', {
        p_alquiler_id: alquilerId,
        p_vendedor_id: vendedorId // Nuevo argumento 
    });
    if (error) {
        console.error('Error al entregar alquiler:', error);
        return { success: false, error: error.message || error };
    }
    return data;
};

export const gestionarMantenimientoDB = async (recursoId, accion, motivo) => {
    const { data, error } = await supabase.rpc('gestionar_mantenimiento', {
        p_recurso_id: recursoId,
        p_accion: accion,
        p_motivo: motivo
    });
    if (error) {
        console.error('Error al gestionar mantenimiento:', error);
        return { success: false, error };
    }
    return data;
};

export const registrarNoShowDB = async (alquilerId) => {
    const { data, error } = await supabase.rpc('registrar_no_show_robusto', { p_alquiler_id: alquilerId });
    if (error) {
        console.error('Error al registrar No Show:', error);
        return { success: false, error };
    }
    return data;
};

export const actualizarRecursoDB = async (id, datos) => {
    // Mapear camelCase a snake_case
    const datosDB = {};
    if (datos.nombre) datosDB.nombre = datos.nombre;
    if (datos.precioPorHora) datosDB.precio_por_hora = datos.precioPorHora;
    if (datos.stock !== undefined) datosDB.stock_total = datos.stock;
    if (datos.imagen) datosDB.imagen = datos.imagen;
    if (datos.descripcion) datosDB.descripcion = datos.descripcion;
    if (datos.activo !== undefined) datosDB.activo = datos.activo;

    const { data, error } = await supabase
        .from('recursos')
        .update(datosDB)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error al actualizar recurso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const crearRecursoDB = async (datos) => {
    // 1. Manejar Categoría (Mapear nombre a ID)
    let categoriaId = null;
    if (datos.categoria) {
        const { data: catExistente } = await supabase
            .from('categorias')
            .select('id')
            .ilike('nombre', datos.categoria.trim())
            .maybeSingle();

        if (catExistente) {
            categoriaId = catExistente.id;
        } else {
            const { data: nuevaCat, error: errorCat } = await supabase
                .from('categorias')
                .insert({ nombre: datos.categoria.trim() })
                .select();
            if (!errorCat && nuevaCat) categoriaId = nuevaCat[0].id;
        }
    }

    // 2. Mapear frontend -> backend
    const datosDB = {
        nombre: datos.nombre,
        precio_por_hora: Number(datos.precioPorHora),
        stock_total: Number(datos.stock),
        imagen: datos.imagen,
        categoria_id: categoriaId,
        sede_id: datos.sedeId || 'costa',
        activo: true
    };

    const { data, error } = await supabase
        .from('recursos')
        .insert(datosDB)
        .select();

    if (error) {
        console.error('Error al crear recurso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const reactivarRecursoDB = async (id) => {
    const { data, error } = await supabase
        .from('recursos')
        .update({ activo: true })
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error al reactivar recurso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const eliminarRecursoDB = async (id) => {
    // 1. Verificar integridad (Alquileres Futuros o En Curso)
    const hoy = new Date().toISOString();

    // Buscar si existen alquileres NO finalizados que incluyan este recurso y cuya fecha fin sea > hoy (o sean activos ahora)
    // Nota: Esto es complejo de filtrar perfecto con supabase-js simple, así que haremos una query un poco más amplia y filtraremos en JS

    const { data: usos, error: errorUsos } = await supabase
        .from('alquiler_detalles')
        .select(`
            alquiler_id,
            alquileres!inner ( 
                fecha_fin_estimada, 
                estado_id 
            )
        `)
        .eq('recurso_id', id);

    if (errorUsos) return { success: false, error: "Error verificando historial del recurso" };

    // Filtrar coincidencias peligrosas
    const conflictos = usos.filter(u => {
        const estado = u.alquileres.estado_id;
        const fechaFin = new Date(u.alquileres.fecha_fin_estimada);
        const esFuturoOActivo = fechaFin > new Date();
        const esEstadoActivo = !['finalizado', 'cancelado', 'no_show'].includes(estado);

        return esEstadoActivo && esFuturoOActivo;
    });

    if (conflictos.length > 0) {
        return { success: false, error: "No se puede eliminar: El recurso tiene reservas activas o futuras." };
    }

    // 2. Si no hay conflicto critico, procedemos al Soft Delete (activo = false)
    // Ni siquiera intentamos Hard Delete para recursos, mejor mantener historial siempre disponible
    const { data, error } = await supabase
        .from('recursos')
        .update({ activo: false })
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error al desactivar recurso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};





// --- GESTIÓN DE CONTACTOS (NORMALIZADA) ---



// --- AGREGAR AL FINAL DE src/services/db.js ---(NORMALIZADA) ---

export const obtenerContactos = async (usuarioId) => {
    const { data, error } = await supabase
        .from('contactos_usuario')
        .select('*')
        .eq('usuario_id', usuarioId);

    if (error) {
        console.error('Error al obtener contactos:', error);
        return [];
    }
    return data;
};

export const agregarContacto = async (usuarioId, contacto) => {
    const { data, error } = await supabase
        .from('contactos_usuario')
        .insert([{
            usuario_id: usuarioId,
            nombre: contacto.nombre,
            telefono: contacto.telefono,
            relacion: contacto.relacion || 'Familiar'
        }])
        .select();

    if (error) {
        console.error('Error al agregar contacto:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const eliminarContacto = async (id) => {
    const { error } = await supabase
        .from('contactos_usuario')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar contacto:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const obtenerTickets = async (usuarioId) => {
    const { data, error } = await supabase
        .from('soporte_tickets')
        .select(`
            *,
            usuario:usuarios!usuario_id ( 
                email,
                personas ( nombre_completo ),
                roles ( nombre ) 
            )
        `)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener tickets:', error);
        return [];
    }

    return data.map(t => ({
        ...t,
        usuario: {
            ...t.usuario,
            nombre: t.usuario?.personas?.nombre_completo || 'Usuario',
            rol: t.usuario?.roles?.nombre || 'usuario'
        }
    }));
};

export const crearTicket = async (usuarioId, datos) => {
    // 1. Crear el Ticket
    const { data: ticket, error: errorTicket } = await supabase
        .from('soporte_tickets')
        .insert([{
            usuario_id: usuarioId,
            asunto: datos.asunto,
            mensaje: datos.mensaje,
            estado: 'pendiente'
        }])
        .select()
        .single();

    if (errorTicket) return { success: false, error: errorTicket };

    // 2. Obtener Admins y Dueños para la notificación
    const { data: destinatarios } = await supabase
        .from('usuarios')
        .select('id')
        .in('rol_id', ['admin', 'dueno']);

    const usuariosANotificar = destinatarios || [{ id: 'u2' }]; // Fallback a admin default si falla

    // 3. Crear Mensaje Automático para CADA destinatario
    const mensajesParaInsertar = usuariosANotificar.map(dest => ({
        remitente_id: usuarioId,
        destinatario_id: dest.id,
        asunto: `[Ticket #${ticket.id}] ${datos.asunto}`,
        contenido: datos.mensaje,
        leido: false
    }));

    const { error: errorMensaje } = await supabase
        .from('mensajes')
        .insert(mensajesParaInsertar);

    if (errorMensaje) console.warn("No se pudo crear copia en mensajes:", errorMensaje);

    return { success: true, data: ticket };
};

export const obtenerMensajes = async (usuarioId) => {
    const { data, error } = await supabase
        .from('mensajes')
        .select(`
            *,
            remitente:usuarios!remitente_id ( 
                email,
                personas ( nombre_completo ), 
                roles ( nombre ) 
            ),
            destinatario:usuarios!destinatario_id ( 
                email,
                personas ( nombre_completo ), 
                roles ( nombre ) 
            )
        `)
        .or(`remitente_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener mensajes:', error);
        return [];
    }

    // Flatten result for UI
    return data.map(m => ({
        ...m,
        remitente: {
            ...m.remitente,
            nombre: m.remitente?.personas?.nombre_completo || 'Desconocido',
            rol: m.remitente?.roles?.nombre
        },
        destinatario: {
            ...m.destinatario,
            nombre: m.destinatario?.personas?.nombre_completo || 'Desconocido',
            rol: m.destinatario?.roles?.nombre
        }
    }));
};


export const obtenerMisGastos = async (usuarioId) => {
    const { data, error } = await supabase
        .from('alquileres')
        .select(`
            *,
            alquiler_detalles (
                *,
                recursos ( nombre, imagen_url )
            ),
            cliente:usuarios!cliente_id ( 
                email,
                personas ( nombre_completo, numero_documento )
            ),
            vendedor:usuarios!vendedor_id ( 
                email,
                personas ( nombre_completo ),
                roles ( nombre ) 
            ),
            estados_alquiler ( nombre )
        `)
        .eq('cliente_id', usuarioId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener mis gastos:', error);
        return [];
    }
    return data.map(transformarAlquiler);
};



export const obtenerPerfilAlquileres = async (usuarioId) => {
    const { data, error } = await supabase
        .from('v_perfil_alquileres')
        .select('*')
        .eq('cliente_id', usuarioId)
        .order('fecha_inicio', { ascending: false });

    if (error) {
        console.error('Error al obtener historial alquileres:', error);
        return [];
    }
    return data;
};

export const obtenerPerfilSoporte = async (usuarioId) => {
    const { data, error } = await supabase
        .from('v_perfil_soporte')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener historial soporte:', error);
        return [];
    }
    return data;
};

export const obtenerMisReclamos = async (usuarioId) => {
    const { data, error } = await supabase
        .from('v_mis_reclamos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener mis reclamos:', error);
        return [];
    }
    return data;
};

export const obtenerEmergencias = async () => {
    const { data, error } = await supabase
        .from('emergencias')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error al obtener emergencias:', error);
        return [];
    }
    return data;
};

export const obtenerGuiasSeguridad = async () => {
    const { data, error } = await supabase
        .from('recursos')
        .select('id, nombre, guia_seguridad, imagen')
        .not('guia_seguridad', 'is', null);

    if (error) {
        console.error('Error al obtener guías:', error);
        return [];
    }
    return data;
};

export const obtenerPagina = async (slug) => {
    const { data, error } = await supabase
        .from('paginas')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error al obtener página:', error);
        return null;
    }
    return data;
};

// Función para cambiar contraseña de forma segura
export async function cambiarPassword(usuarioId, passwordActual, nuevoPassword) {
    const { data, error } = await supabase
        .rpc('cambiar_password', {
            p_usuario_id: usuarioId,
            p_password_actual: passwordActual,
            p_nuevo_password: nuevoPassword
        });

    if (error) {
        console.error("Error al cambiar password:", error);
        return { exito: false, mensaje: error.message };
    }

    return { exito: data, mensaje: data ? 'Contraseña actualizada correctamente' : 'La contraseña actual es incorrecta' };
}

// Función para actualizar el tipo de cambio con API Externa (USD -> PEN)
export const actualizarTipoCambioReal = async () => {
    try {
        // Usamos una API pública y gratuita de tasas de cambio
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Error en API de tipo de cambio');

        const data = await response.json();
        const tipoCambioActual = data.rates.PEN; // Ejemplo: 3.85

        if (tipoCambioActual) {
            // Actualizamos la base de datos para que todos los cálculos usen el valor real
            const { error } = await supabase
                .from('configuracion')
                .update({ valor: tipoCambioActual.toString() })
                .eq('clave', 'TIPO_CAMBIO');

            if (error) {
                console.error('Error actualizando tipo de cambio en BD:', error);
            } else {
                console.log('Tipo de cambio actualizado a:', tipoCambioActual);
            }
            return tipoCambioActual;
        }
    } catch (error) {
        console.error('No se pudo obtener el tipo de cambio:', error);
        return null; // Fallback silencioso, se usará el valor anterior de la BD
    }
};




export const crearSedeDB = async (sede) => {
    // sede: { nombre, direccion, telefono, hora_apertura, hora_cierre }
    const { data, error } = await supabase
        .from('sedes')
        .insert([sede])
        .select()
        .single();

    if (error) {
        console.error("Error creating sede:", error);
        throw error;
    }
    return data;
};

export const actualizarSedeDB = async (id, datos) => {
    const { data, error } = await supabase
        .from('sedes')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error("Error updating sede:", error);
        throw error;
    }
    return data;
};

export const eliminarSedeDB = async (id) => {
    const { error } = await supabase
        .from('sedes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting sede:", error);
        return { success: false, error };
    }
    return { success: true };
};

export const obtenerFaqs = async () => {
    const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('orden', { ascending: true });

    if (error) {
        console.error('Error al obtener faqs:', error);
        return [];
    }
    return data;
};

export const estimarDisponibilidad = async (recursoId) => {
    const { data, error } = await supabase
        .rpc('estimar_disponibilidad_recurso', { p_recurso_id: recursoId });

    if (error) {
        console.error('Error al estimar disponibilidad:', error);
        return null; // O manejar error
    }
    return data; // Retorna timestamp o null
};

export const obtenerDisponibilidadRecursoDB = async (recursoId) => {
    const { data, error } = await supabase
        .rpc('obtener_disponibilidad_recurso', {
            p_recurso_id: recursoId
        });

    if (error) {
        console.error('Error al obtener disponibilidad backend:', error);
        return null; // Retornar null para usar fallback local
    }
    return data;
};

export const buscarClientesDB = async (busqueda) => {
    // Usamos la v_usuarios_completos para tener nombre y numero_documento aplanados
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .or(`nombre.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
        .eq('rol', 'cliente') // La vista usa 'rol' como alias de 'rol_id'
        .limit(10);

    if (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }
    return data;
};

// --- NUEVAS FUNCIONES PARA POS (NORMALIZADA) ---

export const buscarClientes = async (termino) => {
    if (!termino || termino.length < 3) return [];

    // Buscamos en la vista completa normalizada
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .or(`nombre.ilike.%${termino}%,numero_documento.ilike.%${termino}%`)
        .limit(10);

    if (error) {
        console.error('Error al buscar clientes (Vista):', error);
        return [];
    }

    // Mapeo simple para UI
    return data.map(u => ({
        id: u.id,
        nombre: u.nombre,
        numero_documento: u.numero_documento,
        email: u.email,
        sede: u.sede_id
    }));
};

/**
 * Registra un cliente rápido desde el POS.
 */
export const crearClienteRapidoDB = async (datos) => {
    try {
        // 1. Validar datos mínimos
        if (!datos.nombre || !datos.numeroDocumento) {
            return { success: false, error: "Nombre y DNI son obligatorios." };
        }

        // 2. Generar credenciales automáticas
        const emailGenerado = datos.email || `${datos.numeroDocumento}@cliente.sinemail.com`;
        const passwordGenerado = datos.numeroDocumento;

        // 3. Insertar en USUARIOS
        const { data: usuario, error: errorUsuario } = await supabase
            .from('usuarios')
            .insert([{
                email: emailGenerado,
                password_hash: passwordGenerado,
                rol_id: 'cliente',
                activo: true
            }])
            .select()
            .single();

        if (errorUsuario) {
            if (errorUsuario.code === '23505') {
                return { success: false, error: "Este cliente (DNI/Email) ya está registrado." };
            }
            throw errorUsuario;
        }

        // 4. Insertar en PERSONAS
        const { error: errorPersona } = await supabase
            .from('personas')
            .insert([{
                usuario_id: usuario.id,
                nombre_completo: datos.nombre,
                tipo_documento: datos.tipoDocumento || 'DNI',
                numero_documento: datos.numeroDocumento,
                telefono: datos.telefono || null,
                direccion: datos.direccion || null,
                nacionalidad: datos.nacionalidad || 'Perú'
            }]);

        if (errorPersona) {
            await supabase.from('usuarios').delete().eq('id', usuario.id);
            throw errorPersona;
        }

        // 5. Insertar en CLIENTES_DETALLES
        await supabase
            .from('clientes_detalles')
            .insert([{
                usuario_id: usuario.id,
                licencia_conducir: !!datos.licenciaConducir,
                preferencias: {}
            }]);

        return { success: true, data: usuario };

    } catch (error) {
        console.error("Error al crear cliente rápido:", error);
        return { success: false, error: error.message || "Error desconocido" };
    }
};




/**
 * Inicia sesión verificando credenciales contra la base de datos.
 */
export const loginDB = async (email, password) => {
    try {
        // 1. Buscar usuario por email
        const { data: usuarioAuth, error: errorAuth } = await supabase
            .from('usuarios')
            .select('id, password, rol_id, activo')
            .eq('email', email)
            .single();

        if (errorAuth || !usuarioAuth) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        if (!usuarioAuth.activo) {
            return { success: false, error: 'Usuario desactivado' };
        }

        // 2. Verificar contraseña (comparación directa por ahora, según lógica actual)
        // Nota: En producción esto debería usar bcrypt.compare()
        if (usuarioAuth.password !== password) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        // 3. Obtener perfil completo para la sesión
        // Usamos la vista que ya trae todo formateado
        const { data: perfilCompleto, error: errorPerfil } = await supabase
            .from('v_usuarios_completos')
            .select('*')
            .eq('id', usuarioAuth.id)
            .single();

        if (errorPerfil) {
            console.error("Error cargando perfil:", errorPerfil);
            // Fallback: usar datos básicos si falla la vista (ej: falta de permisos)
            return {
                success: true,
                data: {
                    id: usuarioAuth.id,
                    email: email,
                    rol: 'cliente',
                    nombre: 'Usuario'
                }
            };
        }

        // Mapeo final para consistencia con frontend
        const usuarioFormat = {
            ...perfilCompleto,
            rol: perfilCompleto.rol, // View already returns string 'rol'
            sede: perfilCompleto.sede_id
        };

        return { success: true, data: usuarioFormat };

    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: error.message };
    }
};
