import React, { createContext, useState, useContext } from 'react';

export const ContextoPromociones = createContext();

export const ProveedorPromociones = ({ children }) => {
    const [promociones, setPromociones] = useState([
        {
            id: 'promo-tiempo-1',
            nombre: 'Descuento Larga Duración',
            descripcion: '10% de descuento en alquileres mayores a 3 horas',
            tipo: 'regla_tiempo',
            condicion: { minHoras: 3 },
            beneficio: { tipo: 'porcentaje', valor: 10 },
            activo: true
        },
        {
            id: 'promo-paquete-1',
            nombre: 'Paquete Cuatrimotos 3x5',
            descripcion: 'Alquila 3 Cuatrimotos por el precio de 5 horas (Ejemplo)', // Ajustado a lógica real: 3 items = precio especial? El usuario dijo "3 por 5" que suele ser "Lleva 3 paga 2" o similar. Asumiremos "Lleva 3 y obtén descuento".
            // Interpretación: "3 por 5" en cuatrimotos podría ser "3 Cuatrimotos por 500 soles" o "3 horas por 50 soles".
            // El usuario dijo: "como promociones de “3 por 5” en cuatrimotos".
            // Asumiré una lógica de "Descuento por cantidad": Si llevas 3, tienes un 15% de descuento total.
            tipo: 'regla_cantidad',
            condicion: { minCantidad: 3, categoria: 'Motor' },
            beneficio: { tipo: 'porcentaje', valor: 15 },
            activo: false
        }
    ]);

    const agregarPromocion = (promo) => {
        setPromociones(prev => [...prev, { ...promo, id: Date.now().toString() }]);
    };

    const togglePromocion = (id) => {
        setPromociones(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p));
    };

    const eliminarPromocion = (id) => {
        setPromociones(prev => prev.filter(p => p.id !== id));
    };

    const editarPromocion = (id, datosNuevos) => {
        setPromociones(prev => prev.map(p => p.id === id ? { ...p, ...datosNuevos } : p));
    };

    const calcularDescuentos = (carrito) => {
        let descuentoTotal = 0;
        let alertas = [];
        let promocionesAplicadas = [];

        // Filtrar promos activas
        const activas = promociones.filter(p => p.activo);

        activas.forEach(promo => {
            if (promo.tipo === 'regla_tiempo') {
                // Verificar si algún item cumple
                const itemsCumplen = carrito.filter(item => item.horas > promo.condicion.minHoras);
                if (itemsCumplen.length > 0) {
                    const montoBaseItems = itemsCumplen.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);
                    const desc = montoBaseItems * (promo.beneficio.valor / 100);
                    descuentoTotal += desc;
                    promocionesAplicadas.push({ nombre: promo.nombre, monto: desc });
                }
            } else if (promo.tipo === 'regla_cantidad') {
                // Verificar cantidad total de items de la categoría (o todos si no hay categoría)
                const itemsCategoria = promo.condicion.categoria
                    ? carrito.filter(item => item.categoria === promo.condicion.categoria)
                    : carrito;

                const cantidadTotal = itemsCategoria.reduce((acc, item) => acc + item.cantidad, 0);

                if (cantidadTotal >= promo.condicion.minCantidad) {
                    const montoBaseItems = itemsCategoria.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);
                    const desc = montoBaseItems * (promo.beneficio.valor / 100);
                    descuentoTotal += desc;
                    promocionesAplicadas.push({ nombre: promo.nombre, monto: desc });
                } else if (cantidadTotal > 0 && cantidadTotal < promo.condicion.minCantidad) {
                    // Alerta de oportunidad
                    alertas.push(`¡Agrega ${promo.condicion.minCantidad - cantidadTotal} más de ${promo.condicion.categoria || 'productos'} para obtener ${promo.beneficio.valor}% de descuento!`);
                }
            }
        });

        return { descuentoTotal, alertas, promocionesAplicadas };
    };

    return (
        <ContextoPromociones.Provider value={{
            promociones,
            agregarPromocion,
            togglePromocion,
            eliminarPromocion,
            editarPromocion,
            calcularDescuentos
        }}>
            {children}
        </ContextoPromociones.Provider>
    );
};
