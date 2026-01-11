import { supabase } from '../supabase/client';

// Función de Auto-Reparación de Base de Datos

// Helper para normalizar roles (DB Enum -> Frontend String)
// Helper para normalizar nombres compuestos de forma robusta (3FN compliant en la lógica de entrada)
const mapearNombreRobusto = (datos) => {
    if (datos.nombres && datos.apellidos) return { nombres: datos.nombres, apellidos: datos.apellidos };
    const nombreCompleto = (datos.nombre || '').trim();
    if (!nombreCompleto) return { nombres: 'Usuario', apellidos: '.' };
    const partes = nombreCompleto.split(/\s+/);
    if (partes.length === 1) return { nombres: partes[0], apellidos: '.' };
    return {
        nombres: partes.slice(0, -1).join(' '),
        apellidos: partes.slice(-1).join(' ')
    };
};

export const normalizarRol = (rolDB) => {
    if (!rolDB) return 'cliente';

    // Si es un string con comas (resultado de v_usuarios_completos o similar)
    const rolesStr = typeof rolDB === 'string' ? rolDB.toUpperCase() : String(rolDB).toUpperCase();

    if (rolesStr.includes('OWNER')) return 'dueno';
    if (rolesStr.includes('ADMIN_SEDE') || rolesStr.includes('ADMIN')) return 'admin';
    if (rolesStr.includes('VENDEDOR')) return 'vendedor';
    if (rolesStr.includes('MECANICO')) return 'mecanico';

    // Fallback estricto
    if (rolesStr === 'OWNER') return 'dueno';
    if (rolesStr === 'ADMIN_SEDE' || rolesStr === 'ADMIN') return 'admin';
    if (rolesStr === 'VENDEDOR') return 'vendedor';
    if (rolesStr === 'MECANICO') return 'mecanico';

    return 'cliente';
};

/* === MAPPER DE BASE DE DATOS (CAPA DE TRADUCCIÓN 3FN) === */
/* === MAPPER DE BASE DE DATOS (CAPA DE TRADUCCIÓN 3FN) === */
const DB_MAPPER = {
    recurso: {
        toFrontend: (item) => ({
            ...item,
            categoriaId: item.categoria_id,
            sedeId: item.sede_id,
            categoria: item.categorias?.nombre || item.categoria || 'Sin Categoría',
            stock: item.stock_fisico_inicial,
            stockTotal: item.stock_fisico_inicial,
            precioPorHora: item.precio_lista_hora,
            imagen: item.imagen_url,
            // Limpieza de campos internos para el frontend
            precio_lista_hora: undefined,
            stock_fisico_inicial: undefined,
            imagen_url: undefined
        }),
        toDB: (item) => ({
            nombre: item.nombre,
            categoria_id: item.categoriaId || item.categoria_id,
            sede_id: item.sedeId || item.sede_id,
            precio_lista_hora: Number(item.precioPorHora) || 0,
            stock_fisico_inicial: Number(item.stockTotal || item.stock) || 0,
            imagen_url: item.imagen,
            activo: item.activo,
            descripcion: item.descripcion,
            estado_operativo: item.estado_operativo || 'Disponible'
        })
    },
    alquiler: {
        toFrontend: (item) => ({
            ...item,
            montoPagado: Number(item.monto_pagado || 0),
            saldoPendiente: Number(item.saldo_pendiente || 0),
            totalFinal: Number(item.total_final || 0),
            totalServicio: Number(item.total_servicio || 0),
            garantia: Number(item.garantia || 0),
            fechaInicio: item.fecha_inicio,
            fechaFinEstimada: item.fecha_fin_estimada,
            tipoReserva: item.tipo_reserva
        })
    },
    promocion: {
        toFrontend: (item) => ({
            ...item,
            nombre: item.codigo || 'Promoción S/N',
            es_automatico: !item.codigo?.startsWith('CUPON_') && !item.codigo,
            beneficio: { tipo: item.tipo, valor: Number(item.valor) },
            condicion: {
                minHoras: Number(item.minimo_dias || 0) * 24,
                minCantidad: Number(item.minimo_total || 0),
                categoria_id: item.categoria_id,
                recurso_id: item.recurso_id
            },
            codigo_cupon: item.codigo
        }),
        toDB: (item) => ({
            codigo: item.codigo_cupon || item.nombre,
            descripcion: item.descripcion,
            tipo: item.beneficio?.tipo || 'porcentaje',
            valor: Number(item.beneficio?.valor) || 0,
            activo: item.activo,
            sede_id: item.sede_id || 1,
            categoria_id: item.condicion?.categoria_id || null,
            recurso_id: item.condicion?.recurso_id || null,
            minimo_total: Number(item.condicion?.minCantidad) || 0,
            minimo_dias: Math.ceil(Number(item.condicion?.minHoras || 0) / 24),
            fecha_inicio: item.fecha_inicio || new Date().toISOString(),
            fecha_fin: item.fecha_fin || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
    }
};
export const repararEstadosFaltantes = async () => {
    const estadosRequeridos = [
        { id: 'en_preparacion', nombre: 'En Preparación' },
        { id: 'listo_para_entrega', nombre: 'Listo para Entrega' },
        { id: 'limpieza', 'nombre': 'En Limpieza' },
        { id: 'no_show', 'nombre': 'No Show' },
        { id: 'mantenimiento', 'nombre': 'En Mantenimiento' }
    ];

    try {
        // 1. Verificar cuáles faltan (si la tabla es legible públicamente o por el usuario)
        const { data: existentes, error } = await supabase.from('estados_alquiler').select('id');

        if (error) {
            console.warn("No se pudieron verificar los estados (RLS o error conexión):", error.message);
            // Intentamos insertar a ciegas con ON CONFLICT (id) DO NOTHING implícito?
            // Supabase client 'insert' falla por duplicado si no usamos upsert.
            // Usaremos UPSERT para asegurar que existan.
            const { error: errorUpsert } = await supabase.from('estados_alquiler').upsert(estadosRequeridos, { onConflict: 'id', ignoreDuplicates: true });
            if (errorUpsert) console.error("Fallo intento blind-upsert estados:", errorUpsert);
            return;
        }

        const idsExistentes = new Set(existentes.map(e => e.id));
        const faltantes = estadosRequeridos.filter(e => !idsExistentes.has(e.id));

        if (faltantes.length > 0) {
            console.log("Detectados estados faltantes, intentando reparar:", faltantes);
            const { error: errorInsert } = await supabase.from('estados_alquiler').insert(faltantes);

            if (errorInsert) {
                console.error("No se pudieron insertar los estados faltantes (Posible error de permisos RLS):", errorInsert);
            } else {
                console.log("✅ Estados faltantes insertados correctamente.");
            }
        }
    } catch (err) {
        console.error("Excepción en autoreparación DB:", err);
    }
};

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
    // Usar el Mapper para transformar los datos de la DB al formato del Frontend (Capa de abstracción 3FN)
    return data.map(item => DB_MAPPER.recurso.toFrontend(item));
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

export const crearCategoriaDB = async (nombre, descripcion = '') => {
    const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre, descripcion }])
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
            distritos (
                nombre,
                provincias (
                    nombre,
                    departamentos ( nombre )
                )
            ),
            sede_servicios (
                servicio_id,
                servicios ( nombre )
            )
        `);

    if (error) {
        console.error('Error al obtener sedes:', error);
        return [];
    }

    // Formatear servicios como array de IDs y nombres para facilitar edición
    return data.map(sede => {
        const d = sede.distritos;
        const p = d?.provincias;
        const dep = p?.departamentos;
        const ubicacionCompleta = d ? `${sede.direccion}, ${d.nombre}, ${p.nombre}, ${dep.nombre}` : sede.direccion;

        return {
            ...sede,
            ubicacionCompleta,
            serviciosIds: sede.sede_servicios.map(ss => ss.servicio_id),
            serviciosNombres: sede.sede_servicios.map(ss => ss.servicios.nombre)
        };
    });
};

export const obtenerServicios = async () => {
    const { data, error } = await supabase.from('servicios').select('*');
    if (error) {
        console.error('Error al obtener servicios maestros:', error);
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
        .from('parametros_negocio')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error al obtener parámetros de negocio:', error);
        return {
            TIPO_CAMBIO: 3.85,
            GARANTIA_PORCENTAJE: 0.20,
            IGV_PORCENTAJE: 0.18,
            CONTACTO_TELEFONO: '(01) 555-0123',
            CONTACTO_EMAIL: 'contacto@alquileresperuanos.pe',
            SEDE_ID_DEFECTO: 1
        };
    }

    return {
        tipoCambio: data.tipo_cambio_usd,
        porcentajeGarantia: data.porcentaje_garantia,
        porcentajeIgv: data.porcentaje_igv,
        contactoTelefono: data.contacto_telefono,
        contactoEmail: data.contacto_email,
        sedeIdDefecto: data.sede_id_defecto || 1,
        appNombre: data.app_nombre,
        appDescripcion: data.app_descripcion,
        linkFacebook: data.link_facebook,
        linkInstagram: data.link_instagram,
        linkTwitter: data.link_twitter
    };
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

    if (!data || !Array.isArray(data)) return [];

    // Mapeo ligero para asegurar compatibilidad con la UI existente
    return data.map(u => ({
        ...u,
        rol: normalizarRol(u.rol),      // Normalizar el rol para consistencia con el resto de la app
        sede: u.sede_id || u.sede       // Compatibilidad con ambos nombres de columna
    }));
};

export const obtenerUsuarioPorId = async (id) => {
    try {
        console.log('DEBUG: Consultando v_usuarios_completos para ID:', id);
        const { data, error } = await supabase
            .from('v_usuarios_completos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.warn('DEBUG: No se pudo obtener perfil extendido (vista), intentando fallback de Auth:', error.message);

            // Fallback: Si la vista falla, obtener al menos el rol de la metadata de Auth
            const { data: authUser, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser?.user) return null;

            return {
                id: authUser.user.id,
                email: authUser.user.email,
                rol: normalizarRol(authUser.user.user_metadata?.rol || 'cliente'),
                nombre: authUser.user.user_metadata?.nombre || 'Usuario (Modo Seguro)',
                nombres: authUser.user.user_metadata?.nombre || 'Usuario',
                apellidos: '',
                sede: authUser.user.user_metadata?.sede || null
            };
        }

        console.log('DEBUG: Usuario obtenido exitosamente:', data.email, data.rol);

        // Mapeo ligero
        return {
            ...data,
            rol: normalizarRol(data.rol),
            sede: data.sede_id ? Number(data.sede_id) : (data.sede || null)
        };
    } catch (err) {
        console.error("DEBUG: Excepción en obtenerUsuarioPorId:", err);
        return null;
    }
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
        console.log("🚀 Iniciando creación de reserva con payload:", payload);
        const { data: rpcData, error } = await supabase.rpc('crear_reserva_robusta', payload);

        if (error) {
            console.error('❌ Error RPC crear_reserva_robusta:', error);
            return { success: false, error: error.message };
        }

        const alquilerId = rpcData.id;
        console.log("✅ Reserva creada (RPC). ID:", alquilerId);

        // --- POST-PROCESAMIENTO: COMPLETAR TABLAS SATÉLITES ---
        // El usuario necesita que se rellenen: Pagos, Comprobantes, Perfiles.
        // Lo hacemos aquí para asegurar que ocurra aunque el RPC no lo haga internamente.

        // 1. Obtener datos frescos del alquiler creado (para montos exactos)
        const { data: alq, error: errFetch } = await supabase
            .from('alquileres')
            .select('*')
            .eq('id', alquilerId)
            .single();

        if (alq) {
            // CALCULO DE PAGO MANUAL (La columna monto_pagado ya no existe en la tabla física)
            let montoPagado = 0;
            if (datosReserva.tipoReserva === 'web') {
                montoPagado = Number(alq.total_final || 0) * 0.6; // 60% adelanto
            } else {
                montoPagado = Number(alq.total_final || 0); // 100% en tienda
            }

            // 2. Registrar PAGO
            if (montoPagado > 0) {
                const { error: errPago } = await supabase.from('pagos').insert([{
                    alquiler_id: alquilerId,
                    monto: montoPagado,
                    metodo: (datosReserva.metodoPago || 'EFECTIVO').toUpperCase(),
                    fecha: new Date().toISOString()
                }]);
                if (errPago) console.warn("⚠️ Error registrando pago satélite:", errPago);
                else console.log("💰 Pago registrado en tabla 'pagos' por S/", montoPagado);
            }

            // 3. Registrar COMPROBANTE
            const tipoComp = datosReserva.tipoComprobante || 'boleta';
            const serie = tipoComp === 'factura' ? 'F001' : 'B001';
            const correlativo = String(Date.now()).slice(-8); // Autogenerado simple para cumplir requisito

            const datosComp = {
                alquiler_id: alquilerId,
                tipo: tipoComp,
                serie: serie,
                numero: correlativo,
                fecha_emision: new Date().toISOString(),
                total: Number(alq.total_final || 0),
                igv: Number(alq.total_final || 0) * 0.18, // Aproximado
                estado: 'emitido',
                // Datos del cliente para el comprobante
                cliente_nombre: datosReserva.datosFactura?.razonSocial || 'Cliente Final',
                cliente_documento: datosReserva.datosFactura?.ruc || '00000000',
                cliente_direccion: datosReserva.datosFactura?.direccion || ''
            };

            const { error: errComp } = await supabase.from('comprobantes').insert([datosComp]);
            if (errComp) console.warn("⚠️ Error registrando comprobante satélite:", errComp);
            else console.log("📄 Comprobante registrado en tabla 'comprobantes'");

            // 4. Guardar PERFIL DE FACTURACIÓN (Si aplica)
            if (tipoComp === 'factura' && datosReserva.datosFactura && datosReserva.clienteId) {
                const { error: errPerfil } = await supabase.from('perfiles_facturacion').upsert([{
                    usuario_id: datosReserva.clienteId,
                    numero_documento: datosReserva.datosFactura.ruc,
                    nombre_facturacion: datosReserva.datosFactura.razonSocial,
                    direccion_fiscal: datosReserva.datosFactura.direccion,
                    es_predeterminado: true
                }], { onConflict: 'numero_documento' });

                if (errPerfil) console.warn("⚠️ Error guardando perfil facturación:", errPerfil);
                else console.log("💾 Perfil de facturación guardado");
            }
        }

        return { success: true, ...rpcData }; // Mantener contrato de retorno
    } catch (err) {
        console.error('❌ Error inesperado al crear reserva (Cliente):', err);
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
        const nombre = a.vendedor.personas?.nombre_completo || a.vendedor.nombre || 'Vendedor';
        vendedorInfo = `${nombre}`;
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
        sedeNombre: a.sedes?.nombre || `Sede ${a.sede_id}`, // Mapeo de nombre de sede
        sede: a.sedes?.nombre || `Sede ${a.sede_id}`, // Propiedad compatible
        vendedorId: a.vendedor_id,
        clienteId: a.cliente_id,

        // --- Totales y Costos ---
        // total_servicio en DB es el base. Asignamos a total_bruto para la UI.
        total_bruto: Number(a.total_servicio || 0),
        totalServicio: Number(a.total_servicio || 0),

        descuento_manual: Number(a.descuento_manual || 0),
        descuento_promociones: Number(a.descuento_promociones || 0),

        garantia: Number(a.garantia || a.monto_garantia || 0),

        totalFinal: Number(a.total_final || 0),
        total_final: Number(a.total_final || 0),

        montoPagado: Number(a.monto_pagado || 0),

        motivo_descuento: a.motivo_reprogramacion || a.motivo_descuento,
        saldo_pendiente: Number(a.saldo_pendiente || 0),
        saldoPendiente: Number(a.saldo_pendiente || 0)
    };
};

export const obtenerAlquileres = async () => {
    // Usamos la VISTA de integridad v_alquileres_resumen para garantizar 3FN y cálculos atómicos en el servidor
    const { data, error } = await supabase
        .from('v_alquileres_resumen')
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
                personas ( nombre_completo )
            ),
            sedes ( nombre )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener alquileres resumen:', error);
        return [];
    }

    return data.map(a => transformarAlquiler(a));
};

// ... (other functions)



export const obtenerPromociones = async () => {
    const { data, error } = await supabase
        .from('promociones')
        .select('*');

    if (error) {
        console.error('Error al obtener promociones:', error);
        return [];
    }
    return (data || []).map(item => DB_MAPPER.promocion.toFrontend(item));
};

export const crearPromocionDB = async (promo) => {
    const { data, error } = await supabase
        .from('promociones')
        .insert([DB_MAPPER.promocion.toDB(promo)])
        .select()
        .single();

    if (error) return { success: false, error };
    return { success: true, data: DB_MAPPER.promocion.toFrontend(data) };
};

export const editarPromocionDB = async (id, datos) => {
    const { data, error } = await supabase
        .from('promociones')
        .update(DB_MAPPER.promocion.toDB(datos))
        .eq('id', id)
        .select()
        .single();

    if (error) return { success: false, error };
    return { success: true, data: DB_MAPPER.promocion.toFrontend(data) };
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
        console.log("Iniciando registro robusto para:", datosUsuario.email);

        const { nombres, apellidos } = mapearNombreRobusto(datosUsuario);

        // 1. Crear la Persona primero (Eslabón base)
        const { data: persona, error: personaError } = await supabase
            .from('personas')
            .insert([{
                nombres,
                apellidos,
                nombre_completo: `${nombres} ${apellidos}`.trim(),
                numero_documento: datosUsuario.numeroDocumento,
                tipo_documento: (datosUsuario.tipoDocumento === 'Pasaporte' ? 'PASAPORTE' : datosUsuario.tipoDocumento) || 'DNI',
                telefono: datosUsuario.telefono || null,
                fecha_nacimiento: datosUsuario.fechaNacimiento || null,
                direccion: datosUsuario.direccion || null,
                nacionalidad: datosUsuario.nacionalidad || datosUsuario.pais || 'Perú',
                tipo_persona_id: datosUsuario.tipoPersonaId || ((['admin', 'vendedor', 'mecanico', 'dueno'].includes(datosUsuario.rol)) ? 'STAFF' : 'CLIENTE')
            }])
            .select()
            .single();

        if (personaError) throw personaError;

        // 2. Crear cuenta en Supabase Auth (Opcional pero recomendado si queremos login)
        // Para no cerrar la sesión del admin/vendedor actual, creamos un cliente Auth temporal
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
        const authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        const { data: authData, error: authError } = await authClient.auth.signUp({
            email: datosUsuario.email,
            password: datosUsuario.password || datosUsuario.numeroDocumento,
            options: {
                data: {
                    nombre: datosUsuario.nombres,
                    rol: datosUsuario.rol || 'cliente'
                }
            }
        });

        if (authError) {
            // Si el auth falla (ej. email duplicado), borramos la persona (rollback)
            await supabase.from('personas').delete().eq('id', persona.id);
            throw authError;
        }

        const usuarioUUID = authData.user.id;

        // 3. Crear el vínculo en la tabla pública de 'usuarios'
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .insert([{
                id: usuarioUUID,
                persona_id: persona.id,
                email: datosUsuario.email,
                estado: true
            }])
            .select()
            .single();

        if (userError) throw userError;

        // 4. Asignar Rol específico (Basado en la nueva arquitectura 3FN de Cargos)
        const staffMapeo = {
            'admin': 'ADMIN_SEDE',
            'vendedor': 'VENDEDOR',
            'mecanico': 'MECANICO',
            'dueno': 'OWNER'
        };

        const cargoCodigo = staffMapeo[datosUsuario.rol];

        if (cargoCodigo) {
            // A. Registrar en Empleados
            const { data: emp, error: errEmp } = await supabase.from('empleados').insert([{
                persona_id: persona.id,
                sede_id: datosUsuario.sede || null
            }]).select().single();

            if (errEmp) throw errEmp;

            // B. Vincular con el Cargo Maestro (Normalización 3FN)
            const { data: cargo } = await supabase.from('cargos').select('id').eq('codigo', cargoCodigo).single();
            if (cargo) {
                await supabase.from('empleado_roles').insert([{
                    empleado_id: emp.id,
                    cargo_id: cargo.id
                }]);
            }
        } else {
            // Es un Cliente
            await supabase.from('clientes').insert([{
                persona_id: persona.id,
                tiene_licencia_conducir: !!datosUsuario.licenciaConducir
            }]);
        }

        return { success: true, data: user };

    } catch (error) {
        console.error('Error al registrar usuario completo:', error);
        return { success: false, error: error.message || error };
    }
};



export const actualizarUsuarioDB = async (id, datos) => {
    const errors = [];

    // 1. Usuarios (Auth Table is managed via supabase.auth.updateUser usually, public table here)
    if (datos.email || datos.estado !== undefined) {
        const { error } = await supabase
            .from('usuarios')
            .update({
                email: datos.email,
                estado: datos.estado !== undefined ? (datos.estado ? 'activo' : 'inactivo') : undefined,
                pregunta_secreta: datos.preguntaSecreta, // Guardar pregunta
                respuesta_secreta: datos.respuestaSecreta // Guardar respuesta
            })
            .eq('id', id);
        if (error) errors.push("Usuarios: " + error.message);
    }

    // 2. Obtener persona_id para actualizar tablas vinculadas
    const { data: userRecord } = await supabase.from('usuarios').select('persona_id').eq('id', id).single();
    const pId = userRecord?.persona_id;

    if (pId) {
        // 3. Personas
        const datosPersonas = {};

        // Manejo de Nombres y Apellidos
        // Prioridad: Si vienen separados (nombres/apellidos), usarlos.
        // También actualizamos 'nombre_completo' para mantener consistencia.
        if (datos.nombres || datos.apellidos) {
            if (datos.nombres) datosPersonas.nombres = datos.nombres.trim();
            if (datos.apellidos) datosPersonas.apellidos = datos.apellidos.trim();

            // Reconstruir nombre completo si es posible (necesitamos los valores actuales si alguno falta)
            // Para simplificar, si estamos actualizando, asumimos que el frontend envía lo que tiene.
            // Si falta alguno, podríamos consultar la DB, pero por performance, intentamos actualizar con lo que hay.
            // Mejor estrategia: si mandan nombre/apellido, concatenarlos en nombre_completo

            const nuevoNombre = datos.nombres || ''; // Si es undefined, cuidado.
            const nuevoApellido = datos.apellidos || '';

            // NOTA: Esto asume que el frontend envía AMBOS si edita el perfil. 
            // Si Perfil.jsx envía patch parcial, esto podría borrar parte del nombre si no lo manejamos.
            // Pero Perfil.jsx envía todo el objeto 'datos' al guardar.

            if (datos.nombres && datos.apellidos) {
                datosPersonas.nombre_completo = `${datos.nombres.trim()} ${datos.apellidos.trim()}`;
            }
        }

        if (datos.numeroDocumento) datosPersonas.numero_documento = datos.numeroDocumento;
        if (datos.tipoDocumento) datosPersonas.tipo_documento = datos.tipoDocumento; // Mapeo faltante
        if (datos.nacionalidad) datosPersonas.nacionalidad = datos.nacionalidad;     // Mapeo faltante
        if (datos.telefono) datosPersonas.telefono = datos.telefono;
        if (datos.direccion) datosPersonas.direccion = datos.direccion;
        if (datos.fechaNacimiento) datosPersonas.fecha_nacimiento = datos.fechaNacimiento;

        if (Object.keys(datosPersonas).length > 0) {
            const { error } = await supabase.from('personas').update(datosPersonas).eq('id', pId);
            if (error) errors.push("Personas: " + error.message);
        }

        // 4. Clientes (Licencia)
        if (datos.licenciaConducir !== undefined) {
            await supabase.from('clientes').update({ tiene_licencia_conducir: datos.licenciaConducir }).eq('persona_id', pId);
        }

        // 5. Empleados (Sede/Cargo)
        if (datos.sede_id || datos.rol) {
            await supabase.from('empleados').update({
                sede_id: datos.sede_id,
                cargo: datos.rol // Si viene el rol interno
            }).eq('persona_id', pId);
        }
    }

    if (errors.length > 0) {
        console.error("Errores al actualizar usuario:", errors);
        return { success: false, errors };
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

export const aplicarAjusteFijoManualDB = async (alquilerId, monto, motivo) => {
    // monto positivo = descuento, negativo = recargo
    const { data, error } = await supabase.rpc('aplicar_ajuste_fijo_manual', {
        p_alquiler_id: alquilerId,
        p_monto: monto,
        p_motivo: motivo
    });
    if (error) {
        console.error('Error al aplicar ajuste fijo:', error);
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
    // 1. Manejar Categoría si viene el nombre (Mapear nombre a ID para integridad 3FN)
    let categoriaId = datos.categoria_id || datos.categoriaId;

    if (datos.categoria && !categoriaId) {
        const { data: catExistente } = await supabase
            .from('categorias')
            .select('id')
            .ilike('nombre', datos.categoria.trim())
            .maybeSingle();

        if (catExistente) {
            categoriaId = catExistente.id;
        } else {
            // Si no existe, la creamos (Lógica de autogestión de catálogos)
            const { data: nuevaCat, error: errorCat } = await supabase
                .from('categorias')
                .insert({ nombre: datos.categoria.trim() })
                .select()
                .single();
            if (!errorCat && nuevaCat) categoriaId = nuevaCat.id;
        }
    }

    // 2. Traducir datos con el Mapper Robusto
    const datosParaDB = DB_MAPPER.recurso.toDB({ ...datos, categoria_id: categoriaId });

    // Limpiar campos que no deben actualizarse si vienen vacíos
    Object.keys(datosParaDB).forEach(key => {
        if (datosParaDB[key] === undefined) delete datosParaDB[key];
    });

    const { data, error } = await supabase
        .from('recursos')
        .update(datosParaDB)
        .eq('id', id)
        .select(`
            *,
            categorias ( nombre )
        `)
        .single();

    if (error) {
        console.error('Error al actualizar recurso en DB:', error);
        return { success: false, error };
    }
    return { success: true, data: DB_MAPPER.recurso.toFrontend(data) };
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

    // 2. Insertar Recurso usando el Mapper Robusto (Garantía de Integridad)
    const datosParaDB = DB_MAPPER.recurso.toDB({ ...datos, categoria_id: categoriaId });

    const { data, error } = await supabase
        .from('recursos')
        .insert([datosParaDB])
        .select(`
            *,
            categorias ( nombre )
        `)
        .single();

    if (error) {
        console.error('Error al crear recurso:', error);
        return { success: false, error };
    }
    return { success: true, data: DB_MAPPER.recurso.toFrontend(data) };
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

export const obtenerContactosUsuario = async (usuarioId) => {
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

export const agregarContactoDB = async (usuarioId, contacto) => {
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

export const eliminarContactoDB = async (id) => {
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

export const obtenerPerfilAlquileres = async (usuarioId) => {
    // Usamos la VISTA de integridad v_alquileres_resumen para garantizar consistencia 3FN
    const { data, error } = await supabase
        .from('v_alquileres_resumen')
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
                personas ( nombre_completo )
            ),
            estados_alquiler:estados_alquiler ( nombre )
        `)
        .eq('cliente_id', usuarioId)
        .order('fecha_inicio', { ascending: false });

    if (error) {
        console.error('Error al obtener historial alquileres resumen:', error);
        return [];
    }

    return data.map(a => transformarAlquiler(a));
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
        .from('guias_seguridad')
        .select('id, nombre:titulo, guia_seguridad:contenido, imagen:imagen_url');

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

export async function cambiarPassword(usuarioId, passwordActual, nuevoPassword) {
    try {
        // 1. Verificar contraseña actual (Re-autenticando)
        // Necesitamos el email del usuario actual. Si no lo tenemos a mano, lo buscamos o asumimos que la sesión actual es la correcta.
        // Mejor enfoque: Usar la sesión actual si coincide con usuarioId
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== usuarioId) {
            return { exito: false, mensaje: "Sesión inválida o usuario incorrecto" };
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordActual
        });

        if (signInError) {
            return { exito: false, mensaje: "La contraseña actual es incorrecta" };
        }

        // 2. Actualizar contraseña
        const { error: updateError } = await supabase.auth.updateUser({
            password: nuevoPassword
        });

        if (updateError) throw updateError;

        return { exito: true, mensaje: 'Contraseña actualizada correctamente' };

    } catch (error) {
        console.error("Error al cambiar password:", error);
        return { exito: false, mensaje: error.message || "Error al actualizar contraseña" };
    }
}

export const actualizarTipoCambioReal = async () => {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Error en API de tipo de cambio');

        const data = await response.json();
        const tipoCambioActual = data.rates.PEN;

        if (tipoCambioActual) {
            const { error: errorUpdate } = await supabase
                .from('parametros_negocio')
                .update({ tipo_cambio_usd: tipoCambioActual })
                .eq('id', 1);

            if (errorUpdate) throw errorUpdate;
            console.log("Tipo de cambio actualizado a:", tipoCambioActual);
            return tipoCambioActual;
        }
    } catch (error) {
        console.error('No se pudo actualizar el tipo de cambio:', error);
        return null;
    }
};

export const crearSedeDB = async (datosSede) => {
    const { serviciosIds, ...camposSede } = datosSede;

    // 1. Insertar la Sede
    const { data: sede, error: errorSede } = await supabase
        .from('sedes')
        .insert([camposSede])
        .select()
        .single();

    if (errorSede) throw errorSede;

    // 2. Vincular Servicios (Tabla Relacional 3NF)
    if (serviciosIds && serviciosIds.length > 0) {
        const vínculos = serviciosIds.map(idServicio => ({
            sede_id: sede.id,
            servicio_id: idServicio
        }));
        const { error: errorVinculos } = await supabase
            .from('sede_servicios')
            .insert(vínculos);

        if (errorVinculos) throw errorVinculos;
    }

    return sede;
};

export const actualizarSedeDB = async (id, datosSede) => {
    const { serviciosIds, ...camposSede } = datosSede;

    // 1. Actualizar datos base de la Sede
    const { data: sede, error: errorSede } = await supabase
        .from('sedes')
        .update(camposSede)
        .eq('id', id)
        .select()
        .single();

    if (errorSede) throw errorSede;

    // 2. Sincronizar Servicios (Limpiar y Re-insertar para mantener consistencia)
    if (serviciosIds !== undefined) {
        // Borrar vínculos anteriores
        await supabase.from('sede_servicios').delete().eq('sede_id', id);

        // Insertar nuevos si hay
        if (serviciosIds.length > 0) {
            const vínculos = serviciosIds.map(idServicio => ({
                sede_id: id,
                servicio_id: idServicio
            }));
            const { error: errorVinculos } = await supabase
                .from('sede_servicios')
                .insert(vínculos);

            if (errorVinculos) throw errorVinculos;
        }
    }

    return sede;
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
        return null;
    }
    return data;
};

export const obtenerDisponibilidadRecursoDB = async (recursoId) => {
    const { data, error } = await supabase
        .rpc('obtener_disponibilidad_recurso', {
            p_recurso_id: recursoId,
            p_fecha: new Date().toISOString().split('T')[0] // Se requiere fecha hoy por defecto
        });

    if (error) {
        console.error('Error al obtener disponibilidad backend:', error);
        return null;
    }
    return data;
};

export const buscarClientesDB = async (busqueda) => {
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .or(`nombre.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
        .eq('rol', 'cliente')
        .limit(10);

    if (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }
    return data;
};

export const buscarClientes = async (termino) => {
    if (!termino || termino.length < 3) return [];
    const { data, error } = await supabase
        .from('v_usuarios_completos')
        .select('*')
        .or(`nombre.ilike.%${termino}%,numero_documento.ilike.%${termino}%`)
        .limit(10);

    if (error) {
        console.error('Error al buscar clientes (Vista):', error);
        return [];
    }

    return data.map(u => ({
        id: u.id,
        nombre: u.nombre,
        numero_documento: u.numero_documento,
        email: u.email,
        sede: u.sede_id
    }));
};

export const crearClienteRapidoDB = async (datos) => {
    const payload = {
        ...datos,
        rol: 'cliente',
        email: datos.email || `${datos.numeroDocumento}@cliente.com`,
        password: datos.password || datos.numeroDocumento
    };
    return await registrarUsuarioDB(payload);
};

export const loginDB = async (email, password) => {
    try {
        console.log('--- DEBUG LOGIN START ---');
        console.log('1. Intentando auth.signInWithPassword para:', email);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            console.log('DEBUG: Error en auth:', authError.message);
            return { success: false, error: "Credenciales Incorrectas" };
        }

        const userId = authData.user.id;
        console.log('2. Auth exitoso. Buscando perfil en vista v_usuarios_completos para UUID:', userId);

        const { data: perfilCompleto, error: errorPerfil } = await supabase
            .from('v_usuarios_completos')
            .select('*')
            .eq('id', userId)
            .single();

        console.log('3. Resultado de la consulta a la vista:', errorPerfil ? 'ERROR' : 'OK');

        let datosUsuario = {};
        if (errorPerfil) {
            console.warn("DEBUG: Error perfil vista (posible 403 o no existe):", errorPerfil.message);
            datosUsuario = {
                id: userId,
                email: email,
                rol: normalizarRol(authData.user.user_metadata?.rol || 'cliente'),
                nombre: authData.user.user_metadata?.nombre || 'Usuario (Sin Perfil)'
            };
        } else {
            console.log('4. Perfil encontrado:', perfilCompleto.nombre, 'Rol:', perfilCompleto.rol);
            datosUsuario = {
                ...perfilCompleto,
                rol: normalizarRol(perfilCompleto.rol),
                sede: perfilCompleto.sede_id ? Number(perfilCompleto.sede_id) : (perfilCompleto.sede || null),
                nombres: perfilCompleto.nombres,
                apellidos: perfilCompleto.apellidos,
                nacionalidad: perfilCompleto.nacionalidad
            };
        }

        console.log('5. Retornando datos finales de loginDB');
        return { success: true, data: datosUsuario };
    } catch (error) {
        console.error("DEBUG CRASH en loginDB:", error);
        return { success: false, error: error.message };
    }
};

// --- GESTIÓN DE AUDITORÍA ---

export const registrarAuditoriaDB = async (usuarioId, tabla, accion, datos) => {
    const { error } = await supabase
        .from('auditoria_log')
        .insert({
            usuario_id: usuarioId,
            tabla: tabla,
            accion: accion,
            datos_json: datos,
            fecha: new Date().toISOString()
        });

    if (error) {
        console.error("Error al registrar auditoría:", error);
        return { success: false, error };
    }
    return { success: true };
};

export const obtenerMisGastos = async (usuarioId) => {
    // Reutilizamos obtenerPerfilAlquileres que ya tiene la lógica correcta y transformada
    return await obtenerPerfilAlquileres(usuarioId);
};
export const obtenerParametrosNegocio = async () => {
    const { data, error } = await supabase
        .from('parametros_negocio')
        .select(`
            *,
            sedes ( nombre )
        `)
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error al obtener parámetros de negocio:', error);
        return null;
    }
    return data;
};

export const obtenerCargosDB = async () => {
    const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .order('nombre', { ascending: true });
    return error ? [] : data;
};
