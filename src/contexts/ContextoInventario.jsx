import React, { createContext, useState, useEffect } from 'react';
import { obtenerRecursos, obtenerSedes, crearReserva, obtenerAlquileres, registrarDevolucionDB, entregarAlquilerDB, gestionarMantenimientoDB, registrarNoShowDB, reprogramarAlquilerDB, aplicarDescuentoManualDB, registrarPagoSaldoDB, aprobarReservaDB } from '../services/db';
import { calcularPenalizacion } from '../utils/formatters';

export const ContextoInventario = createContext();

export const ProveedorInventario = ({ children }) => {
    const [inventario, setInventario] = useState([]);
    const [alquileres, setAlquileres] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [sedeActual, setSedeActual] = useState('costa'); // Default ID

    // Cargar datos iniciales
    useEffect(() => {
        const cargarDatos = async () => {
            const [recursosData, sedesData, alquileresData] = await Promise.all([
                obtenerRecursos(),
                obtenerSedes(),
                obtenerAlquileres()
            ]);

            // Mapear recursos para incluir stockTotal si es necesario o usar el de DB
            // La DB ya tiene 'stock', asumimos que es el stock actual disponible.
            // Pero el frontend usa 'stockTotal' para lógica de disponibilidad.
            // Vamos a usar 'stock' de DB como 'stockTotal' inicial.
            const inventarioFormateado = recursosData.map(item => ({
                ...item,
                stockTotal: item.stock, // En DB 'stock' es el actual, pero mantenemos la prop para compatibilidad
                sedeId: item.sede_id, // Mapear snake_case a camelCase
                precioPorHora: item.precio_por_hora
            }));

            setInventario(inventarioFormateado);
            setSedes(sedesData);
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

            if (sedesData.length > 0) {
                // setSedeActual(sedesData[0].id); // Mantener 'costa' por defecto o usar el primero
            }
        };
        cargarDatos();
    }, []);

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
        const resultado = await crearReserva(nuevoAlquiler);

        if (resultado.success) {
            // Actualizar estado local
            const alquilerConId = { ...nuevoAlquiler, id: resultado.data.id, sedeId: sedeActual };
            setAlquileres(prev => [...prev, alquilerConId]);

            if (nuevoAlquiler.tipoReserva === 'inmediata') {
                nuevoAlquiler.items.forEach(item => actualizarStock(item.id, item.cantidad));
            }
            return true;
        } else {
            alert("Error al registrar la reserva en la base de datos.");
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
            sedeActual,
            setSedeActual,
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
            registrarPagoSaldo
        }}>
            {children}
        </ContextoInventario.Provider>
    );
};
