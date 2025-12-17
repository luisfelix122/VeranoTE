import React, { createContext, useState, useEffect } from 'react';
import { obtenerRecursos, obtenerSedes, obtenerHorarios, obtenerContenidoWeb, crearReserva, obtenerAlquileres, registrarDevolucionDB, entregarAlquilerDB, gestionarMantenimientoDB, registrarNoShowDB, reprogramarAlquilerDB, aplicarDescuentoManualDB, registrarPagoSaldoDB, aprobarReservaDB } from '../services/db';
import { calcularPenalizacion } from '../utils/formatters';

export const ContextoInventario = createContext();

export const ProveedorInventario = ({ children }) => {
    const [inventario, setInventario] = useState([]);
    const [alquileres, setAlquileres] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [contenido, setContenido] = useState({});
    const [sedeActual, setSedeActual] = useState('costa'); // Default ID
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]); // Global Date

    // Helper: Validar rango de fechas
    const hayCruce = (inicio1, fin1, inicio2, fin2) => {
        return inicio1 < fin2 && inicio2 < fin1;
    };

    // Calcular disponibilidad en tiempo real (Síncrono para UI)
    const calcularStockDisponible = (recursoId, fecha = fechaSeleccionada) => {
        const recurso = inventario.find(r => r.id === recursoId);
        if (!recurso) return 0;

        // Definir rango del día seleccionado (00:00 a 23:59)
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);

        // Filtrar reservas activas (pendientes, confirmadas, en_uso...)
        const reservasActivas = alquileres.filter(a =>
            a.estado !== 'finalizado' &&
            a.estado !== 'cancelado' &&
            a.estado !== 'no_show'
        );

        let cantidadReservada = 0;

        reservasActivas.forEach(alquiler => {
            // Verificar si el alquiler se cruza amb el día seleccionado
            const inicioAlquiler = new Date(alquiler.fechaInicio);

            // Buscar si este alquiler incluye el recurso
            const itemEnAlquiler = alquiler.items?.find(i => i.id === recursoId);

            if (itemEnAlquiler) {
                // Calcular Fin de est item
                const horas = itemEnAlquiler.horas || 1;
                const finAlquiler = new Date(inicioAlquiler.getTime() + (horas * 60 * 60 * 1000));

                if (hayCruce(inicioDia, finDia, inicioAlquiler, finAlquiler)) {
                    cantidadReservada += itemEnAlquiler.cantidad;
                }
            }
        });

        // Asegurar que no sea negativo
        return Math.max(0, recurso.stockTotal - cantidadReservada);
    };
    // Cargar datos iniciales
    const recargarDatos = async () => {
        try {
            const [recursosData, sedesData, alquileresData, horariosData, contenidoData] = await Promise.all([
                obtenerRecursos(),
                obtenerSedes(),
                obtenerAlquileres(),
                obtenerHorarios(),
                obtenerContenidoWeb()
            ]);

            const inventarioFormateado = recursosData.map(item => ({
                ...item,
                stockTotal: item.stock,
                sedeId: item.sede_id,
                precioPorHora: item.precio_por_hora
            }));

            setInventario(inventarioFormateado);
            setSedes(sedesData);
            setHorarios(horariosData);
            setContenido(contenidoData);
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
                sedeId: a.sede_id,
                cliente: a.usuarios?.nombre || 'Cliente Desconocido' // Mapear nombre desde la relación
            })));
        } catch (error) {
            console.error("Error al recargar datos:", error);
        }
    };

    // Cargar datos iniciales
    useEffect(() => {
        recargarDatos();
    }, []);

    const estaAbierto = (sedeId) => {
        if (!horarios || horarios.length === 0) return { abierto: false, mensaje: 'Horario no disponible' };

        const ahora = new Date();
        const diaSemana = ahora.getDay(); // 0 = Domingo
        const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

        const horarioHoy = horarios.find(h => h.sede_id === sedeId && h.dia_semana === diaSemana);

        if (!horarioHoy || horarioHoy.cerrado) {
            return { abierto: false, mensaje: 'Cerrado hoy' };
        }

        const [hApertura, mApertura] = horarioHoy.hora_apertura.split(':').map(Number);
        const [hCierre, mCierre] = horarioHoy.hora_cierre.split(':').map(Number);

        const minApertura = hApertura * 60 + mApertura;
        const minCierre = hCierre * 60 + mCierre;

        if (horaActual >= minApertura && horaActual < minCierre) {
            return { abierto: true, mensaje: `Abierto hasta las ${horarioHoy.hora_cierre.slice(0, 5)}` };
        } else {
            return { abierto: false, mensaje: `Cerrado. Abre a las ${horarioHoy.hora_apertura.slice(0, 5)}` };
        }
    };

    // Filtrar inventario por sede
    const inventarioVisible = inventario.filter(item => item.sedeId === sedeActual);

    const agregarProducto = (producto) => {
        // Implementar si se requiere agregar a DB
        console.warn("Agregar producto no implementado en DB aún");
    };

    const editarProducto = async (id, datos) => {
        const { actualizarRecursoDB } = await import('../services/db');
        const resultado = await actualizarRecursoDB(id, datos);

        if (resultado.success) {
            setInventario(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, ...datos };
                }
                return item;
            }));
            return true;
        } else {
            alert("Error al actualizar el producto en la base de datos.");
            return false;
        }
    };

    const eliminarProducto = (id) => {
        // Implementar si se requiere eliminar en DB
        console.warn("Eliminar producto no implementado en DB aún");
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
                id: 'temp-' + Date.now(), // ID temporal
                estado: 'pendiente'
            }]);

            // Recargar todos los datos para asegurar consistencia (stock, alquileres, etc)
            await recargarDatos();
            return true;
        } else {
            const mensajeError = respuesta?.error || "Error al registrar la reserva.";
            alert(mensajeError);
            return false;
        }
    };

    // Funciones de gestión de estado (Simuladas localmente por ahora, idealmente deberían ser llamadas a DB)
    const aprobarParaEntrega = async (idAlquiler) => {
        const resultado = await aprobarReservaDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'listo_para_entrega' } : a));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const reprogramarAlquiler = async (idAlquiler, horasAdicionales) => {
        const resultado = await reprogramarAlquilerDB(idAlquiler, horasAdicionales);
        if (resultado.success) {
            // Recargar alquileres para obtener los cálculos exactos del backend
            const alquileresActualizados = await obtenerAlquileres();
            // Mapear de nuevo (duplicación de lógica de carga inicial, idealmente refactorizar en una función cargarAlquileres)
            setAlquileres(alquileresActualizados.map(a => ({
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

    const registrarPagoSaldo = async (idAlquiler) => {
        const resultado = await registrarPagoSaldoDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => {
                if (a.id === idAlquiler) {
                    return {
                        ...a,
                        montoPagado: a.totalFinal,
                        saldoPendiente: 0,
                        estado: a.estado === 'pendiente' ? 'confirmado' : a.estado
                    };
                }
                return a;
            }));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const entregarAlquiler = async (idAlquiler) => {
        const resultado = await entregarAlquilerDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'en_uso', fechaEntrega: new Date() } : a));
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
            setInventario(prev => prev.map(i => i.id === idRecurso ? { ...i, activo: true } : i));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const marcarNoShow = async (idAlquiler) => {
        const resultado = await registrarNoShowDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'no_show' } : a));
            return true;
        } else {
            alert(resultado.error);
            return false;
        }
    };

    const devolverAlquiler = async (idAlquiler) => {
        const resultado = await registrarDevolucionDB(idAlquiler);
        if (resultado.success) {
            setAlquileres(prev => prev.map(a => {
                if (a.id === idAlquiler) {
                    return {
                        ...a,
                        estado: 'limpieza',
                        fechaDevolucionReal: new Date(),
                        penalizacion: resultado.penalizacion,
                        totalFinal: resultado.nuevo_total
                    };
                }
                return a;
            }));
            return true;
        } else {
            alert(resultado.error || "Error al registrar devolución");
            return false;
        }
    };

    const marcarFueraDeServicio = async (idRecurso) => {
        return await enviarAMantenimiento(idRecurso, "Fuera de Servicio");
    };



    return (
        <ContextoInventario.Provider value={{
            inventario: inventarioVisible,
            inventarioCompleto: inventario,
            alquileres,
            sedes,
            sedeActual,
            setSedeActual,
            fechaSeleccionada,
            setFechaSeleccionada,
            calcularStockDisponible,
            agregarProducto,
            editarProducto,
            eliminarProducto,
            registrarAlquiler,
            aprobarParaEntrega,
            entregarAlquiler,
            devolverAlquiler,
            enviarAMantenimiento,
            finalizarMantenimiento,
            marcarFueraDeServicio,
            reprogramarAlquiler,
            verificarDisponibilidad,
            marcarNoShow,
            aplicarDescuentoMantenimiento,
            registrarPagoSaldo,
            estaAbierto,
            contenido
        }}>
            {children}
        </ContextoInventario.Provider>
    );
};
