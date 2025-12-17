import { supabase } from '../supabase/client';

export const obtenerRecursos = async () => {
    // Usamos la VISTA v_recursos_disponibles que ya incluye el stock dinámico y el nombre de categoría
    const { data, error } = await supabase
        .from('v_recursos_disponibles')
        .select('*'); // Ya no necesitamos join porque la vista lo trae

    if (error) {
        console.error('Error al obtener recursos:', error);
        return [];
    }
    // Aplanar la estructura para que el frontend reciba 'categoria' como string
    return data.map(item => ({
        ...item,
        categoria: item.categoria_nombre || 'Sin Categoría', // Mapear desde la columna de la vista
        stock: item.stock_disponible,
        stockTotal: item.stock_total // STOCK FÍSICO REAL (Sin descontar reservas)
    }));
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
export const calcularCotizacion = async (items) => {
    const { data, error } = await supabase.rpc('calcular_cotizacion', { items });
    if (error) {
        console.error('Error calculando cotización:', error);
        return null;
    }
    return data;
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
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            *,
            roles ( nombre )
        `);

    if (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }

    return data.map(u => {
        // Normalizar el nombre del rol para que coincida con los keys del frontend
        let rolNormalizado = 'cliente';
        const nombreRolDB = u.roles?.nombre?.toLowerCase() || '';

        if (nombreRolDB.includes('admin')) rolNormalizado = 'admin';
        else if (nombreRolDB.includes('vend')) rolNormalizado = 'vendedor';
        else if (nombreRolDB.includes('mecanic') || nombreRolDB.includes('mecánic')) rolNormalizado = 'mecanico';
        else if (nombreRolDB.includes('dueñ') || nombreRolDB.includes('duen')) rolNormalizado = 'dueno';

        return {
            ...u,
            rol: rolNormalizado,
            sede: u.sede_id // Mapear sede_id a sede
        };
    });
};

export const obtenerUsuarioPorId = async (id) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            *,
            roles ( nombre )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener usuario por ID:', error);
        return null;
    }

    // Normalizar rol
    let rolNormalizado = 'cliente';
    const nombreRolDB = data.roles?.nombre?.toLowerCase() || '';

    if (nombreRolDB.includes('admin')) rolNormalizado = 'admin';
    else if (nombreRolDB.includes('vend')) rolNormalizado = 'vendedor';
    else if (nombreRolDB.includes('mecanic') || nombreRolDB.includes('mecánic')) rolNormalizado = 'mecanico';
    else if (nombreRolDB.includes('dueñ') || nombreRolDB.includes('duen')) rolNormalizado = 'dueno';

    return {
        ...data,
        rol: rolNormalizado,
        sede: data.sede_id // Mapear sede_id a sede
    };
};

export const crearReserva = async (datosReserva) => {
    // Preparar items para el RPC robusto
    const itemsRPC = datosReserva.items.map(item => ({
        id: item.id,
        cantidad: item.cantidad,
        horas: item.horas,
        precioPorHora: item.precioPorHora,
        categoria: item.categoria // Necesario para promociones
    }));

    const { data, error } = await supabase
        .rpc('crear_reserva_robusta', {
            p_cliente_id: datosReserva.clienteId,
            p_vendedor_id: datosReserva.vendedorId,
            p_sede_id: datosReserva.sedeId || 'costa',
            p_items: itemsRPC,
            p_fecha_inicio: datosReserva.fechaInicio,
            p_tipo_reserva: datosReserva.tipoReserva,
            p_metodo_pago_id: datosReserva.metodoPago,
            p_tipo_comprobante: datosReserva.tipoComprobante,
            p_datos_factura: datosReserva.datosFactura
        });

    if (error) {
        console.error('Error al crear reserva:', error);
        return { success: false, error: error.message };
    }
    return data;
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

export const calcularDescuentosDB = async (items, fechaInicio) => {
    const itemsRPC = items.map(item => ({
        id: item.id,
        cantidad: item.cantidad,
        horas: item.horas,
        precioPorHora: item.precioPorHora,
        categoria: item.categoria
    }));

    const { data, error } = await supabase
        .rpc('calcular_descuento_simulado', {
            p_items: itemsRPC,
            p_fecha_inicio: fechaInicio || new Date()
        });

    if (error) {
        console.error('Error al calcular descuentos:', error);
        return { descuentoTotal: 0, alertas: [], promocionesAplicadas: [] };
    }
    return data;
};

export const registrarDevolucionDB = async (alquilerId) => {
    const { data, error } = await supabase
        .rpc('registrar_devolucion_robusta', {
            p_alquiler_id: alquilerId
        });

    if (error) {
        console.error('Error al registrar devolución:', error);
        return { success: false, error };
    }
    return data;
};

export const obtenerAlquileres = async () => {
    const { data, error } = await supabase
        .from('alquileres')
        .select(`
            *,
            alquiler_detalles (
                *,
                recursos ( nombre, imagen )
            ),
            usuarios!cliente_id ( nombre, email ),
            estados_alquiler ( nombre )
        `);

    if (error) {
        console.error('Error al obtener alquileres:', error);
        return [];
    }

    // Transformar para que el frontend lo entienda fácil
    return data.map(a => ({
        ...a,
        estado: a.estados_alquiler?.nombre || a.estado_id, // Usar nombre legible
        items: a.alquiler_detalles.map(d => ({
            id: d.recurso_id,
            nombre: d.recursos?.nombre,
            imagen: d.recursos?.imagen,
            cantidad: d.cantidad,
            horas: d.horas,
            precioPorHora: d.precio_unitario
        }))
    }));
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

export const registrarUsuarioDB = async (datosUsuario) => {
    // Mapear camelCase (Frontend) a snake_case (Base de Datos)
    const usuarioParaInsertar = {
        nombre: datosUsuario.nombre,
        email: datosUsuario.email,
        password: datosUsuario.password,
        numero_documento: datosUsuario.numeroDocumento,
        fecha_nacimiento: datosUsuario.fechaNacimiento,
        licencia_conducir: datosUsuario.licenciaConducir,
        tipo_documento: datosUsuario.tipoDocumento || 'DNI',
        nacionalidad: datosUsuario.nacionalidad || 'Nacional',
        rol_id: 'cliente'
    };

    const { data, error } = await supabase
        .from('usuarios')
        .insert([usuarioParaInsertar])
        .select();

    if (error) {
        console.error('Error al registrar usuario:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const actualizarUsuarioDB = async (id, datos) => {
    // Mapear rol a rol_id si viene en los datos
    const datosParaActualizar = { ...datos };

    // Mapeo manual de campos camelCase a snake_case
    if (datosParaActualizar.rol) {
        datosParaActualizar.rol_id = datosParaActualizar.rol;
        delete datosParaActualizar.rol;
    }
    if (datosParaActualizar.licenciaConducir !== undefined) {
        datosParaActualizar.licencia_conducir = datosParaActualizar.licenciaConducir;
        delete datosParaActualizar.licenciaConducir;
    }
    if (datosParaActualizar.numeroDocumento) {
        datosParaActualizar.numero_documento = datosParaActualizar.numeroDocumento;
        delete datosParaActualizar.numeroDocumento;
    }
    if (datosParaActualizar.fechaNacimiento) {
        datosParaActualizar.fecha_nacimiento = datosParaActualizar.fechaNacimiento;
        delete datosParaActualizar.fechaNacimiento;
    }
    if (datosParaActualizar.tipoDocumento) {
        datosParaActualizar.tipo_documento = datosParaActualizar.tipoDocumento;
        delete datosParaActualizar.tipoDocumento;
    }
    if (datosParaActualizar.contactoEmergencia) {
        datosParaActualizar.contacto_emergencia = datosParaActualizar.contactoEmergencia;
        delete datosParaActualizar.contactoEmergencia;
    }
    if (datosParaActualizar.codigoEmpleado) {
        datosParaActualizar.codigo_empleado = datosParaActualizar.codigoEmpleado;
        delete datosParaActualizar.codigoEmpleado;
    }

    const { data, error } = await supabase
        .from('usuarios')
        .update(datosParaActualizar)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error al actualizar usuario:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
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

export const registrarPagoSaldoDB = async (alquilerId) => {
    const { data, error } = await supabase.rpc('registrar_pago_saldo', { p_alquiler_id: alquilerId });
    if (error) {
        console.error('Error al registrar pago:', error);
        return { success: false, error };
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

export const entregarAlquilerDB = async (alquilerId) => {
    const { data, error } = await supabase.rpc('entregar_alquiler_robusto', { p_alquiler_id: alquilerId });
    if (error) {
        console.error('Error al entregar alquiler:', error);
        return { success: false, error };
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



export const obtenerTarjetas = async (usuarioId) => {
    const { data, error } = await supabase
        .from('tarjetas_credito')
        .select('*')
        .eq('usuario_id', usuarioId);

    if (error) {
        console.error('Error al obtener tarjetas:', error);
        return [];
    }
    return data;
};

export const agregarTarjeta = async (usuarioId, tarjeta) => {
    const { data, error } = await supabase
        .from('tarjetas_credito')
        .insert([{
            usuario_id: usuarioId,
            numero_oculto: tarjeta.numero, // Ya debe venir enmascarado o solo últimos 4
            token: 'tok_simulado_' + Date.now(),
            expiracion: tarjeta.exp,
            titular: tarjeta.nombre,
            es_principal: tarjeta.principal
        }])
        .select();

    if (error) {
        console.error('Error al agregar tarjeta:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const eliminarTarjeta = async (id) => {
    const { error } = await supabase
        .from('tarjetas_credito')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar tarjeta:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const obtenerTickets = async (usuarioId) => {
    const { data, error } = await supabase
        .from('soporte_tickets')
        .select(`
            *,
            usuario:usuario_id ( nombre, rol_id, roles ( nombre ) )
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
            remitente:remitente_id ( nombre, rol_id, roles ( nombre ) ),
            destinatario:destinatario_id ( nombre, rol_id, roles ( nombre ) )
        `)
        .or(`remitente_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener mensajes:', error);
        return [];
    }
    return data;
};

export const obtenerMisGastos = async (usuarioId) => {
    const { data, error } = await supabase
        .from('v_mis_gastos')
        .select('*')
        .eq('cliente_id', usuarioId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener mis gastos:', error);
        return [];
    }
    return data;
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
