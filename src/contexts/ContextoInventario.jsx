import React, { createContext, useState } from 'react';
import { inventarioInicial, sedes } from '../utils/constants';
import { calcularPenalizacion } from '../utils/formatters';

export const ContextoInventario = createContext();

export const ProveedorInventario = ({ children }) => {
    // Inicializar inventario agregando stockTotal para manejar disponibilidad real
    const [inventario, setInventario] = useState(() =>
        inventarioInicial.map(item => ({ ...item, stockTotal: item.stock }))
    );
    const [alquileres, setAlquileres] = useState([]);
    const [sedeActual, setSedeActual] = useState(sedes[0].id); // Por defecto Costa

    // Filtrar inventario por sede
    const inventarioVisible = inventario.filter(item => item.sedeId === sedeActual);

    const agregarProducto = (producto) => setInventario(prev => [...prev, {
        ...producto,
        id: Date.now(),
        sedeId: sedeActual,
        stockTotal: producto.stock
    }]);

    const editarProducto = (id, datos) => setInventario(prev => prev.map(p => p.id === id ? { ...p, ...datos, stockTotal: datos.stock || p.stockTotal } : p));
    const eliminarProducto = (id) => setInventario(prev => prev.filter(p => p.id !== id));

    const actualizarStock = (idProducto, cantidad) => {
        setInventario(prev => prev.map(item => item.id === idProducto ? { ...item, stock: item.stock - cantidad } : item));
    };

    // Verificar disponibilidad para una fecha específica
    const verificarDisponibilidad = (itemsCarrito, fechaInicio) => {
        for (const itemCarrito of itemsCarrito) {
            const producto = inventario.find(p => p.id === itemCarrito.id);
            if (!producto) continue;

            const fechaFinSolicitado = new Date(fechaInicio.getTime() + (itemCarrito.horas * 60 * 60 * 1000));

            // Filtrar alquileres que se solapen con el rango solicitado y sean del mismo producto
            const alquileresSolapados = alquileres.filter(a => {
                const inicioAlquiler = new Date(a.fechaInicio);
                // Calcular fin del alquiler existente
                const itemEnAlquiler = a.items.find(i => i.id === itemCarrito.id);
                if (!itemEnAlquiler) return false;

                const finAlquiler = new Date(inicioAlquiler.getTime() + (itemEnAlquiler.horas * 60 * 60 * 1000));

                // Verificar solapamiento de fechas
                return (inicioAlquiler < fechaFinSolicitado) && (finAlquiler > fechaInicio) &&
                    (a.estado !== 'finalizado' && a.estado !== 'cancelado');
            });

            // Contar cantidad reservada en ese periodo
            const cantidadReservada = alquileresSolapados.reduce((acc, a) => {
                const itemEnAlquiler = a.items.find(i => i.id === itemCarrito.id);
                return acc + (itemEnAlquiler ? itemEnAlquiler.cantidad : 0);
            }, 0);

            if (cantidadReservada + itemCarrito.cantidad > producto.stockTotal) {
                return { valido: false, mensaje: `No hay disponibilidad suficiente para ${producto.nombre} el ${fechaInicio.toLocaleString()} (Stock: ${producto.stockTotal}, Reservados: ${cantidadReservada}).` };
            }
        }
        return { valido: true };
    };

    const registrarAlquiler = (nuevoAlquiler) => {
        // Asegurar que el alquiler tenga la sede actual
        const alquilerConSede = { ...nuevoAlquiler, sedeId: sedeActual };
        setAlquileres(prev => [...prev, alquilerConSede]);

        // Solo descontar stock visual si es reserva inmediata (empieza ya)
        if (nuevoAlquiler.tipoReserva === 'inmediata') {
            nuevoAlquiler.items.forEach(item => actualizarStock(item.id, item.cantidad));
        }
    };

    const aprobarParaEntrega = (idAlquiler) => {
        setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'listo_para_entrega' } : a));
    };

    const entregarAlquiler = (idAlquiler) => {
        setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'en_uso', fechaEntrega: new Date() } : a));
    };

    const devolverAlquiler = (idAlquiler) => {
        const alquiler = alquileres.find(a => a.id === idAlquiler);
        if (alquiler) {
            const fechaDevolucion = new Date();
            let totalPenalizacion = 0;
            alquiler.items.forEach(item => {
                const fechaFinEstimada = new Date(alquiler.fechaInicio.getTime() + (item.horas * 60 * 60 * 1000));
                totalPenalizacion += calcularPenalizacion(fechaFinEstimada, fechaDevolucion, item.precioPorHora, item.cantidad);
            });

            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? {
                ...a, estado: 'limpieza', fechaDevolucionReal: fechaDevolucion, penalizacion: totalPenalizacion, totalFinal: a.total + totalPenalizacion
            } : a));
        }
    };

    const enviarAMantenimiento = (idAlquiler) => {
        setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'en_mantenimiento' } : a));
    };

    const finalizarMantenimiento = (idAlquiler) => {
        const alquiler = alquileres.find(a => a.id === idAlquiler);
        if (alquiler) {
            // Solo reponer stock si fue descontado (reserva inmediata o ya entregada)
            if (alquiler.tipoReserva === 'inmediata' || alquiler.estado === 'finalizado') {
                alquiler.items.forEach(item => actualizarStock(item.id, -item.cantidad));
            }
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'finalizado' } : a));
        }
    };

    const marcarFueraDeServicio = (idAlquiler) => {
        setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'fuera_de_servicio' } : a));
    };

    const reprogramarAlquiler = (idAlquiler, horasAdicionales) => {
        setAlquileres(prev => prev.map(a => {
            if (a.id === idAlquiler) {
                const costoExtra = a.items.reduce((acc, item) => acc + (item.precioPorHora * horasAdicionales * item.cantidad), 0);
                const cargoServicio = costoExtra * 0.10;
                return {
                    ...a,
                    total: a.total + costoExtra + cargoServicio,
                    items: a.items.map(i => ({ ...i, horas: i.horas + horasAdicionales }))
                };
            }
            return a;
        }));
    };

    const marcarNoShow = (idAlquiler) => {
        const alquiler = alquileres.find(a => a.id === idAlquiler);
        if (alquiler) {
            // Si fue reserva inmediata, liberar stock
            if (alquiler.tipoReserva === 'inmediata') {
                alquiler.items.forEach(item => actualizarStock(item.id, -item.cantidad));
            }
            setAlquileres(prev => prev.map(a => a.id === idAlquiler ? { ...a, estado: 'no_show' } : a));
        }
    };

    const aplicarDescuentoMantenimiento = (idAlquiler, porcentaje) => {
        setAlquileres(prev => prev.map(a => {
            if (a.id === idAlquiler) {
                const descuento = a.totalServicio * (porcentaje / 100);
                return {
                    ...a,
                    descuentoMantenimiento: descuento,
                    totalFinal: a.totalFinal - descuento,
                    nota: `Descuento por mantenimiento (${porcentaje}%) aplicado.`
                };
            }
            return a;
        }));
    };

    const registrarPagoSaldo = (idAlquiler) => {
        setAlquileres(prev => prev.map(a => {
            if (a.id === idAlquiler) {
                return {
                    ...a,
                    montoPagado: a.totalFinal,
                    saldoPendiente: 0,
                    estado: a.estado === 'pendiente' ? 'confirmado' : a.estado, // Si estaba pendiente (anticipo), pasa a confirmado
                    historialPagos: [...(a.historialPagos || []), { fecha: new Date(), monto: a.saldoPendiente, tipo: 'saldo_final' }]
                };
            }
            return a;
        }));
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
