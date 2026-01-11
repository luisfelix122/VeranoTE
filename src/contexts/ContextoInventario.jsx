import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import {
    obtenerRecursos, obtenerCategorias, obtenerSedes, obtenerConfiguracion,
    crearReserva, obtenerAlquileres, registrarDevolucionDB, entregarAlquilerDB,
    gestionarMantenimientoDB, registrarNoShowDB, reprogramarAlquilerDB,
    aplicarDescuentoManualDB, registrarPagoSaldoDB, registrarUsuarioDB, aprobarReservaDB,
    obtenerDisponibilidadRecursoDB, buscarClientesDB, actualizarTipoCambioReal,
    calcularDescuentosDB, verificarDisponibilidadDB, calcularCotizacion, crearCategoriaDB,
    eliminarCategoriaDB, reactivarCategoriaDB, crearSedeDB, actualizarSedeDB, eliminarSedeDB,
    registrarAuditoriaDB, obtenerServicios
} from '../services/db';
import { verificarClimaAdverso } from '../services/weatherService';
import { calcularPenalizacion } from '../utils/formatters';
import { ContextoAutenticacion } from './ContextoAutenticacion';

export const ContextoInventario = createContext();

export const ProveedorInventario = ({ children }) => {
    const { usuario } = React.useContext(ContextoAutenticacion);
    const [inventario, setInventario] = useState([]);
    const [alquileres, setAlquileres] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [configuracion, setConfiguracion] = useState({});
    const [sedeActual, setSedeActual] = useState(null); // Fix: Start null to auto-select from DB
    const estaCargandoRef = React.useRef(false); // Lock para evitar bucles de Realtime
    // Fix: Usar fecha LOCAL, no UTC (para evitar salto de día en la noche)
    const fechaLocal = new Date();
    fechaLocal.setMinutes(fechaLocal.getMinutes() - fechaLocal.getTimezoneOffset());
    const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal.toISOString().split('T')[0]);

    // Helper: Validar rango de fechas
    const hayCruce = (inicio1, fin1, inicio2, fin2) => {
        return inicio1 < fin2 && inicio2 < fin1;
    };

    // Helper: Parsear fecha como local (Evitar problemas de UTC)
    const obtenerInicioFinDia = (fechaStr) => {
        // Asegurar que fechaStr sea YYYY-MM-DD
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        const inicio = new Date(anio, mes - 1, dia, 0, 0, 0, 0); // Mes es 0-index
        const fin = new Date(anio, mes - 1, dia, 23, 59, 59, 999);
        return { inicio, fin };
    };

    // Calcular disponibilidad (simplificado, ahora lee del estado ya procesado por backend)
    const calcularStockDisponible = (recursoId) => {
        const recurso = inventario.find(r => r.id === recursoId);
        return recurso?.stock || 0;
    };

    // Función legacy para compatibilidad si algo la llama, ahora lee directo del recurso
    const calcularDisponibilidadDetallada = (recursoId) => {
        const recurso = inventario.find(r => r.id === recursoId);
        if (!recurso) return { disponiblesAhora: 0, proximosLiberados: [], totalFisico: 0 };
        return recurso.detalleDisponibilidad || { disponiblesAhora: 0, proximosLiberados: [], totalFisico: 0 };
    };

    // Cargar datos iniciales
    const recargarDatos = async (fechaTarget = null) => {
        if (estaCargandoRef.current) return;
        estaCargandoRef.current = true;
        try {
            // Determinar si la fecha seleccionada es hoy (en horario local)
            const hoyStr = new Date().toISOString().split('T')[0];
            const esHoy = (fechaTarget === hoyStr) || (!fechaTarget && fechaSeleccionada === hoyStr);

            // Si es hoy, usar NOW() para ver disponibilidad real en este instante.
            // Si es otro día, usar el mediodía de ese día para una estimación general.
            let targetDate;
            if (esHoy) {
                targetDate = new Date().toISOString();
            } else {
                const datePart = fechaTarget || fechaSeleccionada || hoyStr;
                targetDate = new Date(datePart + 'T12:00:00').toISOString();
            }

            const [recursosData, categoriasData, sedesData, alquileresData, configData, serviciosData] = await Promise.all([
                obtenerRecursos(),
                obtenerCategorias(),
                obtenerSedes(),
                obtenerAlquileres(),
                obtenerConfiguracion(),
                obtenerServicios(), // Cargar servicios maestros
                actualizarTipoCambioReal() // Actualizamos tipo de cambio al iniciar
            ]);

            // Enriquecer inventario con disponibilidad real del backend y cálculo local
            const inventarioConDisponibilidad = await Promise.all(recursosData.map(async (item) => {
                let disponibilidad = null;
                try {
                    // Solo intentar RPC para info de tiempo real si es "Hoy/Ahora"
                    if (esHoy) {
                        disponibilidad = await obtenerDisponibilidadRecursoDB(item.id);
                    }
                } catch (e) {
                    console.error("Error disponibilidad RPC", e);
                }

                // CÁLCULO LOCAL DE STOCK (Fallback / Date-Aware) basado en alquileresData
                const ocupadosEnFecha = alquileresData.reduce((total, a) => {
                    // Estados que bloquean stock
                    const esActivo = ['pendiente', 'confirmado', 'en_uso', 'listo_para_entrega'].includes(a.estado_id);
                    if (!esActivo) return total;

                    const detalle = a.alquiler_detalles?.find(d => d.recurso_id === item.id);
                    if (!detalle) return total;

                    // Solapamiento: (Inicio1 < Fin2) AND (Inicio2 < Fin1)
                    // Ventana de evaluación: targetDate a targetDate + 1h
                    const tStart = new Date(targetDate);
                    const tEnd = new Date(targetDate);
                    tEnd.setHours(tEnd.getHours() + 1);

                    const rStart = new Date(a.fecha_inicio);
                    const rEnd = new Date(a.fecha_fin_estimada || a.fecha_fin);

                    if (rStart < tEnd && rEnd > tStart) {
                        return total + (detalle.cantidad || 0);
                    }
                    return total;
                }, 0);

                const stockCalculado = Math.max(0, (item.stockTotal || 0) - ocupadosEnFecha);

                // Si el RPC funcionó y es hoy, priorizar su valor para disponibles_ahora
                // pero si no, usar el cálculo local.
                const dispAhora = (esHoy && disponibilidad) ? disponibilidad.disponibles_ahora : stockCalculado;

                const detalleFormat = {
                    disponiblesAhora: dispAhora,
                    proximosLiberados: disponibilidad?.proximos_liberados || [],
                    totalFisico: item.stockTotal || 0
                };

                return {
                    ...item,
                    stock: detalleFormat.disponiblesAhora,
                    stockTotal: item.stockTotal || item.stock || 0,
                    sedeId: item.sede_id,
                    precioPorHora: item.precioPorHora || 0,
                    detalleDisponibilidad: detalleFormat
                };
            }));

            setInventario(inventarioConDisponibilidad);
            setCategorias(categoriasData);
            setSedes(sedesData || []);
            setAlquileres((alquileresData || []).map(a => ({
                ...a,
                fechaInicio: a.fecha_inicio,
                fechaFin: a.fecha_fin_estimada || a.fecha_fin,
                fechaFinEstimada: a.fecha_fin_estimada,
                totalFinal: Number(a.total_final || 0),
                montoPagado: Number(a.monto_pagado || 0),
                saldoPendiente: Number(a.saldo_pendiente || 0),
                sedeId: a.sede_id,
                clienteId: a.cliente_id,
                vendedorId: a.vendedor_id
            })));
            setConfiguracion(configData || {});
            setServicios(serviciosData || []);

            // AUTO-FIX: Sincronizar Sede Actual con IDs reales y Configurables
            if (sedesData.length > 0) {
                // Si la sede actual es inválida o es un legacy string ('costa', 'rural')
                const esLegacy = typeof sedeActual === 'string' && isNaN(Number(sedeActual));

                if (!sedeActual || esLegacy) {
                    const idDefecto = configData?.sedeIdDefecto || sedesData[0].id;
                    const sedeEncontrada = sedesData.find(s => s.id === idDefecto) || sedesData[0];
                    setSedeActual(sedeEncontrada.id);
                }
            }
        } catch (error) {
            console.error("Error al recargar datos:", error);
        } finally {
            estaCargandoRef.current = false;
        }
    };

    // Cargar datos iniciales
    useEffect(() => {
        // Ejecutar auto-reparación de DB (Estados faltantes)
        import('../services/db').then(({ repararEstadosFaltantes }) => {
            repararEstadosFaltantes();
        });

        recargarDatos();

        // 🟢 SUSCRIPCIÓN REALTIME GLOBAL (El "Noticiero")
        const canal = supabase
            .channel('cambios-globales')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    console.log('Cambio detectado en:', payload.table, payload.eventType);
                    // Pequeño delay para dejar que la DB asiente el cambio
                    setTimeout(() => recargarDatos(), 400);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canal);
        };
    }, [fechaSeleccionada]); // Recargar cada vez que cambie la fecha seleccionada



    const estaAbierto = (sedeId, fechaEspecifica = null) => {
        // Por ahora devolvemos abierto siempre, ya que los horarios se han removido 
        // para dar paso a una gestión de horarios más flexible o externa.
        return { abierto: true };
    };




    // Filtrar inventario por sede
    const inventarioVisible = inventario.filter(item => item.sedeId === sedeActual);

    const agregarProducto = async (producto) => {
        const { crearRecursoDB } = await import('../services/db');
        const resultado = await crearRecursoDB({ ...producto, sedeId: sedeActual });

        if (resultado.success) {
            await recargarDatos();
            alert("✅ Producto agregado correctamente.");
            return true;
        } else {
            alert("❌ Error al agregar producto: " + (resultado.error?.message || "Error desconocido"));
            return false;
        }
    };

    const editarProducto = async (id, datos) => {
        const { actualizarRecursoDB } = await import('../services/db');
        const resultado = await actualizarRecursoDB(id, datos);

        if (resultado.success) {
            setInventario(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, ...resultado.data };
                }
                return item;
            }));
            return true;
        } else {
            alert("Error al actualizar el producto en la base de datos.");
            return false;
        }
    };

    const eliminarProducto = async (id) => {
        const { eliminarRecursoDB } = await import('../services/db');
        const resultado = await eliminarRecursoDB(id);

        if (resultado.success) {
            // Ya NO filtramos, ahora solo actualizamos el estado local para que se vea opaco
            setInventario(prev => prev.map(item => item.id === id ? { ...item, activo: false } : item));
            await recargarDatos(); // Aseguramos sincronía total
            alert("🗑️ Recurso desactivado correctamente (Borrado Lógico). Se mantiene en el historial.");
            return true;
        } else {
            alert("⚠️ " + (resultado.error || "Error al eliminar producto"));
            return false;
        }
    };

    const reactivarProducto = async (id) => {
        const { reactivarRecursoDB } = await import('../services/db');
        const resultado = await reactivarRecursoDB(id);

        if (resultado.success) {
            await recargarDatos();
            alert("✅ Producto reactivado correctamente.");
            return true;
        } else {
            alert("❌ Error al reactivar: " + (resultado.error?.message || "Error desconocido"));
            return false;
        }
    };

    const crearCategoria = async (nombre, descripcion = '') => {
        try {
            const nombreNormalizado = nombre.trim();

            // Verificar si ya existe localmente (evitar error de DB)
            const existe = categorias.find(c => c.nombre.toLowerCase() === nombreNormalizado.toLowerCase());
            if (existe) {
                console.log("La categoría ya existe, usando la existente.");
                return true;
            }

            await crearCategoriaDB(nombreNormalizado, descripcion);
            await recargarDatos();
            return true;
        } catch (error) {
            console.error("Error al crear categoría context:", error);
            return false;
        }
    };

    const eliminarCategoria = async (id) => {
        const categoria = categorias.find(c => c.id === id);
        if (!categoria) return false;

        // Comprobar si hay productos vinculados en el inventario actual
        const productosVinculados = inventario.filter(p => p.categoria === categoria.nombre);
        const cantidad = productosVinculados.length;

        let mensaje = `¿Estás seguro de desactivar la categoría "${categoria.nombre}"?`;

        if (cantidad > 0) {
            mensaje = `⚠️ Esta categoría tiene ${cantidad} productos asociados.\n\n` +
                `Para mantener la integridad de la base de datos (Regla 3FN), no se puede eliminar físicamente.\n\n` +
                `¿Deseas deshabilitarla? Se mantendrá en el historial pero no podrá usarse para nuevos productos.`;
        } else {
            mensaje = `¿Estás seguro de desactivar la categoría "${categoria.nombre}"? No se mostrará más en los formularios.`;
        }

        if (!window.confirm(mensaje)) return false;

        const resultado = await eliminarCategoriaDB(id);
        if (resultado.success) {
            await recargarDatos();
            alert("🗑️ Categoría deshabilitada con éxito.");
            return true;
        } else {
            alert("Error al desactivar categoría: " + (resultado.error?.message || "Error desconocido"));
            return false;
        }
    };

    const reactivarCategoria = async (id) => {
        const resultado = await reactivarCategoriaDB(id);
        if (resultado.success) {
            await recargarDatos();
            alert("✅ Categoría reactivada con éxito.");
            return true;
        } else {
            alert("Error al reactivar categoría.");
            return false;
        }
    };

    const actualizarStock = (idProducto, cantidad) => {
        // Esto ahora se maneja en el backend al crear reserva, pero actualizamos localmente para feedback inmediato
        setInventario(prev => prev.map(item => item.id === idProducto ? { ...item, stock: item.stock - cantidad } : item));
    };

    // Verificar disponibilidad (Lógica Backend RPC)
    const verificarDisponibilidad = async (itemsCarrito, fechaInicio) => {
        const { verificarDisponibilidadDB } = await import('../services/db');
        return await verificarDisponibilidadDB(itemsCarrito, fechaInicio);
    };

    const registrarAlquiler = async (nuevoAlquiler) => {
        // Llamar a Supabase RPC
        const respuesta = await crearReserva(nuevoAlquiler);

        if (respuesta && respuesta.success) {
            // Actualización optimista para feedback inmediato en UI
            setAlquileres(prev => [...prev, {
                ...nuevoAlquiler,
                id: respuesta.id || ('temp-' + Date.now()), // Usar ID real de DB si disponible
                monto_pagado: nuevoAlquiler.montoPagado || 0,
                saldo_pendiente: nuevoAlquiler.saldoPendiente || 0,
                estado_id: (nuevoAlquiler.saldo_pendiente === 0 || nuevoAlquiler.saldoPendiente === 0) ? 'confirmado' : 'pendiente',
                tipo_comprobante: nuevoAlquiler.tipoComprobante,
                datos_factura: nuevoAlquiler.datosFactura,
                cliente: usuario?.nombre || 'Mi Reserva'
            }]);

            // Recargar todos los datos para asegurar consistencia (stock, alquileres, etc)
            await recargarDatos();
            return respuesta;
        } else {
            const mensajeError = respuesta?.error || "Error al registrar la reserva.";
            alert(mensajeError);
            return respuesta;
        }
    };

    // Funciones de gestión de estado (Simuladas localmente por ahora, idealmente deberían ser llamadas a DB)
    const aprobarParaEntrega = async (idAlquiler) => {
        try {
            const resultado = await aprobarReservaDB(idAlquiler);
            if (resultado.success) {
                // Nueva lógica: El tiempo de alquiler comienza 2 minutos después de la aprobación
                const nuevaFechaInicio = new Date();
                nuevaFechaInicio.setMinutes(nuevaFechaInicio.getMinutes() + 2);

                const { error: errorUpdate } = await supabase
                    .from('alquileres')
                    .update({
                        fecha_inicio: nuevaFechaInicio.toISOString(),
                        estado_id: 'listo_para_entrega'
                    })
                    .eq('id', idAlquiler);

                if (errorUpdate) throw errorUpdate;

                setAlquileres(prev => prev.map(a => a.id === idAlquiler ? {
                    ...a,
                    estado: 'listo_para_entrega',
                    estado_id: 'listo_para_entrega',
                    fechaInicio: nuevaFechaInicio.toISOString()
                } : a));

                await recargarDatos();
                return true;
            } else {
                alert(resultado.error);
                return false;
            }
        } catch (err) {
            console.error("Error en aprobarParaEntrega:", err);
            alert("Error al procesar aprobación: " + (err.message || "Desconocido"));
            return false;
        }
    };

    const reprogramarAlquiler = async (alquilerId, param, contextualData = {}) => {
        try {
            const { motivo = "General", usuarioId = null } = contextualData;

            // Caso 1: Reprogramación de Fecha/Hora (Nuevo flujo)
            if (typeof param === 'object' && param.nuevaFecha && param.nuevaHora) {
                const { nuevaFecha, nuevaHora } = param;
                const nuevoInicio = new Date(`${nuevaFecha}T${nuevaHora}:00`);

                // 1. Obtener alquiler actual para calcular duración y items
                const { data: alquilerActual, error: errorFetch } = await supabase
                    .from('alquileres')
                    .select('*, alquiler_detalles(*)')
                    .eq('id', alquilerId)
                    .single();

                if (errorFetch) throw errorFetch;

                // 2. Calcular Nueva Fecha Fin manteniendo la duración original
                const inicioOriginal = new Date(alquilerActual.fecha_inicio);
                const finOriginal = new Date(alquilerActual.fecha_fin_estimada);
                const duracionMs = finOriginal.getTime() - inicioOriginal.getTime();
                const nuevoFin = new Date(nuevoInicio.getTime() + duracionMs);

                // 3. Verificar Disponibilidad
                const itemsParaVerificar = alquilerActual.alquiler_detalles?.map(d => ({
                    id: d.recurso_id,
                    cantidad: d.cantidad,
                    horas: d.horas
                })) || [];

                if (itemsParaVerificar.length > 0) {
                    const disponible = await verificarDisponibilidadDB(itemsParaVerificar, nuevoInicio);
                    if (!disponible) {
                        alert("No hay disponibilidad suficiente para los recursos en la nueva fecha/hora seleccionada.");
                        return false;
                    }
                }

                // 4. Actualizar Fechas en DB
                const { error: errorUpdate } = await supabase
                    .from('alquileres')
                    .update({
                        fecha_inicio: nuevoInicio.toISOString(),
                        fecha_fin_estimada: nuevoFin.toISOString()
                    })
                    .eq('id', alquilerId);

                if (errorUpdate) throw errorUpdate;

                // 5. Aplicar Penalidad (S/ 10) - Solo si NO es por Clima o Fuerza Mayor
                let penalidadAplicada = 0;
                let mensajeAuditoria = `Penalidad por Reprogramación: ${motivo}`;

                if (motivo.toLowerCase() === 'clima') {
                    const sedeId = alquilerActual.sede_id_string || (alquilerActual.sede_id === 1 ? 'costa' : 'rural');
                    const infoClima = await verificarClimaAdverso(sedeId);

                    if (infoClima.adverso) {
                        penalidadAplicada = 0;
                        mensajeAuditoria = `Exento por Clima Adverso (${infoClima.detalle})`;
                    } else {
                        penalidadAplicada = 10;
                        mensajeAuditoria = `Penalidad aplicada: Clima no validado (${infoClima.detalle})`;
                        alert(`🌤️ Validación de Clima: El servicio meteorológico indica que el clima está estable (${infoClima.detalle}). Se aplicará el cargo de S/ 10.`);
                    }
                } else if (['fuerza_mayor', 'error_sistema'].includes(motivo.toLowerCase().replace(/\s/g, '_'))) {
                    penalidadAplicada = 0;
                    mensajeAuditoria = `Exento por ${motivo}`;
                } else {
                    penalidadAplicada = 10;
                }

                if (alquilerActual.total_servicio > 0 && penalidadAplicada > 0) {
                    // Usar ajuste fijo: enviamos -10 para penalidad de 10
                    await aplicarAjusteFijoManualDB(alquilerId, -penalidadAplicada, mensajeAuditoria);
                }

                // 6. Registro en Auditoría
                if (usuarioId) {
                    await registrarAuditoriaDB(usuarioId, 'alquileres', 'reprogramacion', {
                        alquiler_id: alquilerId,
                        motivo: motivo,
                        fecha_inicio_anterior: alquilerActual.fecha_inicio,
                        fecha_inicio_nueva: nuevoInicio.toISOString(),
                        penalidad_aplicada: penalidadAplicada,
                        motivo_detalle: mensajeAuditoria
                    });
                }

                await recargarDatos(nuevoInicio.toISOString().split('T')[0]); // Recargar para ver cambios
                return true;

            }

            // Caso 2: Legacy (Mantenido por compatibilidad)
            else if (typeof param === 'number') {
                const horasAdicionales = param;
                const { success, data: alquilerActualizado, error } = await reprogramarAlquilerDB(alquilerId, horasAdicionales);

                if (success) {
                    const penalidad = 10;
                    const porcentajeNegativo = -((penalidad / alquilerActualizado.total_servicio) * 100);
                    await aplicarDescuentoManualDB(alquilerId, porcentajeNegativo, "Penalidad por Reprogramación (Horas Extra)");

                    if (contextualData.usuarioId) {
                        await registrarAuditoriaDB(contextualData.usuarioId, 'alquileres', 'extension_horas', {
                            alquiler_id: alquilerId,
                            horas_adicionales: horasAdicionales
                        });
                    }

                    await recargarDatos();
                    return true;
                } else {
                    throw error;
                }
            }
        } catch (err) {
            console.error("Error en reprogramarAlquiler:", err);
            alert("Error al reprogramar: " + (err.message || "Error desconocido"));
            return false;
        }
    };

    const aplicarDescuentoMantenimiento = async (idAlquiler, porcentaje) => {
        const resultado = await aplicarDescuentoManualDB(idAlquiler, porcentaje, "Descuento por Mantenimiento/Retraso");
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => {
                if (a.id === idAlquiler) {
                    const descuento = resultado.descuento_aplicado; // Asumiendo que el RPC devuelve esto
                    return {
                        ...a,
                        totalFinal: a.totalFinal - descuento,
                        // Nota: El saldo pendiente ya se actualizó en DB, aquí solo actualizamos UI optimista o recargamos
                    };
                }
                return a;
            }));
            // Recargar para consistencia total
            const alquileresData = await obtenerAlquileres();
            setAlquileres(alquileresData.map(a => ({
                ...a,
                fechaInicio: a.fecha_inicio,
                clienteId: a.cliente_id,
                vendedorId: a.vendedor_id,
                totalServicio: a.total_servicio,
                totalFinal: a.total_final,
                montoPagado: a.monto_pagado,
                saldoPendiente: a.saldo_pendiente,
                tipoReserva: a.tipo_reserva,
                sedeId: a.sede_id
            })));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const registrarPagoSaldo = async (idAlquiler, metodoPago, tarjetaId, vendedorId) => {
        const resultado = await registrarPagoSaldoDB(idAlquiler, metodoPago, tarjetaId, vendedorId);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => {
                if (a.id === idAlquiler) {
                    return {
                        ...a,
                        montoPagado: a.totalFinal,
                        saldoPendiente: 0,
                        estado: a.estado === 'pendiente' ? 'confirmado' : a.estado,
                        estado_id: a.estado_id === 'pendiente' ? 'confirmado' : a.estado_id,
                        vendedorId: vendedorId || a.vendedorId, // Actualizar localmente también
                    };
                }
                return a;
            }));
            await recargarDatos(); // Asegurar consistencia total
            return true;
        } else {
            console.error("Error al registrar pago (Contexto):", resultado.error);
            const msg = resultado.error?.message || (typeof resultado.error === 'object' ? JSON.stringify(resultado.error) : resultado.error) || "Error desconocido";
            alert("Error al registrar pago: " + msg);
            return false;
        }
    };

    const entregarAlquiler = async (idAlquiler, vendedorId) => {
        const resultado = await entregarAlquilerDB(idAlquiler, vendedorId);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'en_uso', estado_id: 'en_uso', fechaEntrega: new Date() } : a));
            return true;
        } else {
            alert(resultado.error || "Error al entregar alquiler");
            return false;
        }
    };

    const enviarAMantenimiento = async (idRecurso, motivo = "Mantenimiento preventivo") => {
        const resultado = await gestionarMantenimientoDB(idRecurso, 'iniciar', motivo);
        if (resultado.success) {
            // Actualizar UI localmente
            setInventario(prev => prev.map(i => i.id === idRecurso ? { ...i, activo: false } : i));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const finalizarMantenimiento = async (idRecurso) => {
        const resultado = await gestionarMantenimientoDB(idRecurso, 'finalizar');
        if (resultado.success) {
            setInventario(prev => prev.map(i => i.id === idRecurso ? { ...i, activo: true, estado: 'operativo' } : i));
            await recargarDatos();
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const finalizarLimpiezaAlquiler = async (idAlquiler) => {
        try {
            // 1. Obtener el alquiler de la fuente de verdad (estado local o buscar en DB si no está)
            const alquiler = alquileres.find(a => a.id === idAlquiler);
            if (!alquiler) {
                console.error("Alquiler no encontrado localmente:", idAlquiler);
                throw new Error("Alquiler no encontrado");
            }

            // 2. Cambiar estado del alquiler a 'finalizado' en la DB primero
            const { error: errorAlquiler } = await supabase
                .from('alquileres')
                .update({
                    estado_id: 'finalizado',
                    updated_at: new Date().toISOString()
                })
                .eq('id', idAlquiler);

            if (errorAlquiler) throw errorAlquiler;

            // 3. Liberar cada recurso del alquiler. 
            // IMPORTANTE: Incluso si falla un mantenimiento, el alquiler ya está finalizado en DB, liberando stock.
            if (alquiler.items && Array.isArray(alquiler.items)) {
                for (const item of alquiler.items) {
                    try {
                        // Intentamos finalizar cualquier mantenimiento pendiente por si acaso
                        await gestionarMantenimientoDB(item.id, 'finalizar');
                    } catch (e) {
                        console.warn(`No se pudo finalizar mantenimiento para item ${item.id}:`, e);
                    }
                }
            }

            // 4. Actualizar estado local e invocar recarga manual por seguridad
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'finalizado', estado_id: 'finalizado' } : a));

            // Un pequeño delay para que el Realtime de Supabase no colisione con la recarga manual
            setTimeout(() => recargarDatos(), 200);

            return true;
        } catch (err) {
            console.error("Error crítico en finalizarLimpiezaAlquiler:", err);
            alert("Error al liberar equipos: " + (err.message || "Desconocido"));
            return false;
        }
    };

    const marcarNoShow = async (idAlquiler) => {
        const resultado = await registrarNoShowDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'no_show', estado_id: 'no_show' } : a));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const devolverAlquiler = async (idAlquiler, vendedorId, devolverGarantia) => {
        const { registrarDevolucionDB } = await import('../services/db');
        const resultado = await registrarDevolucionDB(idAlquiler, vendedorId, devolverGarantia);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => {
                if (a.id === idAlquiler) {
                    return {
                        ...a,
                        estado: 'limpieza',
                        estado_id: 'limpieza',
                        fechaDevolucionReal: new Date(),
                        penalizacion: resultado.penalizacion,
                        nuevo_total: resultado.nuevo_total
                    };
                }
                return a;
            }));
            await recargarDatos(); // Asegurar consistencia
            return true;
        } else {
            alert(resultado.error || "Error al registrar devolución");
            return false;
        }
    };

    const anularAlquiler = async (idAlquiler) => {
        if (!window.confirm("¿Estás seguro de anular esta reserva? El stock se liberará inmediatamente.")) return false;

        try {
            const { error } = await supabase
                .from('alquileres')
                .update({ estado_id: 'cancelado' })
                .eq('id', idAlquiler);

            if (error) throw error;

            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado_id: 'cancelado', estado: 'Cancelado' } : a));
            await recargarDatos();
            return true;
        } catch (err) {
            console.error("Error al anular:", err);
            alert("Error: " + err.message);
            return false;
        }
    };

    const solicitarPreparacion = async (idAlquiler) => {
        try {
            const { error } = await supabase
                .from('alquileres')
                .update({ estado_id: 'en_preparacion' }) // Corregido: estado -> estado_id
                .eq('id', idAlquiler);

            if (error) throw error;

            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'en_preparacion', estado_id: 'en_preparacion' } : a));
            return true;
        } catch (err) {
            console.error("Error en solicitarPreparacion:", err);
            alert("Error al solicitar preparación: " + err.message);
            return false;

        }
    };

    const buscarClientes = async (busqueda) => {
        return await buscarClientesDB(busqueda);
    };

    const registrarCliente = async (datos) => {
        return await registrarUsuarioDB(datos);
    };

    const marcarFueraDeServicio = async (idRecurso) => {
        return await enviarAMantenimiento(idRecurso, "Fuera de Servicio");
    };



    // Sincronizar sedeActual con el perfil del usuario, pero permitir cambio manual si es dueño
    useEffect(() => {
        // Si ya hay una sede seleccionada manualmente (por el dueño), no la sobrescribimos con el perfil
        // a menos que sea el primer render o si el usuario no tiene permiso para ver otra.
        if (usuario?.sede && (usuario.rol === 'admin' || usuario.rol === 'vendedor')) {
            setSedeActual(usuario.sede);
        } else if (usuario?.rol === 'dueno' && !sedeActual) {
            // Default para dueño si no hay nada seleccionado aún
            setSedeActual('costa');
        }
    }, [usuario]);

    const agregarSede = async (nuevaSede) => {
        try {
            const sedeCreada = await crearSedeDB(nuevaSede);
            if (sedeCreada) {
                // Recargar sedes
                const sedesActualizadas = await obtenerSedes();
                setSedes(sedesActualizadas);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al agregar sede context:", error);
            return false;
        }
    };

    const editarSede = async (id, datos) => {
        try {
            const sedeEditada = await actualizarSedeDB(id, datos);
            if (sedeEditada) {
                const sedesActualizadas = await obtenerSedes();
                setSedes(sedesActualizadas);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al editar sede context:", error);
            return false;
        }
    };

    const eliminarSede = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar esta sede?")) return false;
        try {
            const resultado = await eliminarSedeDB(id);
            if (resultado.success) {
                const sedesActualizadas = await obtenerSedes();
                setSedes(sedesActualizadas);
                return true;
            } else {
                alert("Error: " + (resultado.error?.message || "No se pudo eliminar"));
                return false;
            }
        } catch (error) {
            console.error("Error al eliminar sede context:", error);
            return false;
        }
    };

    return (
        <ContextoInventario.Provider value={{
            inventario: inventarioVisible,
            inventarioCompleto: inventario,
            alquileres,
            sedes,
            categorias,
            sedeActual,
            setSedeActual,
            fechaSeleccionada,
            setFechaSeleccionada,
            calcularStockDisponible,
            calcularDisponibilidadDetallada,
            agregarProducto,
            editarProducto,
            crearCategoria,
            eliminarCategoria,
            reactivarCategoria,
            eliminarProducto,
            reactivarProducto,
            registrarAlquiler,
            aprobarParaEntrega,
            entregarAlquiler,
            devolverAlquiler,
            enviarAMantenimiento,
            finalizarMantenimiento,
            finalizarLimpiezaAlquiler,
            marcarFueraDeServicio,
            reprogramarAlquiler,
            verificarDisponibilidad,
            marcarNoShow,
            anularAlquiler,
            aplicarDescuentoMantenimiento,
            registrarPagoSaldo,
            estaAbierto,
            solicitarPreparacion, // Nuevo
            configuracion,
            buscarClientes,
            registrarCliente,
            cotizarReserva: calcularDescuentosDB,
            calcularCotizacion,
            agregarSede,
            editarSede,
            eliminarSede,
            marcarFueraDeServicio,
            servicios, // Exponer servicios maestros
            obtenerDisponibilidadRecursoDB
        }}>
            {children}
        </ContextoInventario.Provider>
    );
};
