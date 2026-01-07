import React, { createContext, useState } from 'react';
import { ContextoAutenticacion } from './ContextoAutenticacion'; // Importar Auth
import { ContextoInventario } from './ContextoInventario'; // Importar Inventario

export const ContextoCarrito = createContext();

export const ProveedorCarrito = ({ children }) => {
    const [carrito, setCarrito] = useState([]);
    const [esVisible, setEsVisible] = useState(false);

    const { usuario } = React.useContext(ContextoAutenticacion);
    const { categorias } = React.useContext(ContextoInventario); // Para mapear ID a nombre si hiciera falta, aunque producto trae categoria nombre usualmente.

    const agregarAlCarrito = (producto, horas, cantidad = 1) => {
        // VALIDACIÓN DE LICENCIA (Motor)
        // Detectamos si es categoría motor (ID o Nombre). Asumimos estandarización.
        // En el seed: 'Motor' es una categoría.
        const esMotor = producto.categoria === 'Motor' || producto.categoria_id === 3; // Hardcoded safety check based on standard seed

        if (esMotor) {
            if (!usuario) {
                alert("Debes iniciar sesión para rentar vehículos motorizados.");
                return;
            }
            if (!usuario.licencia_conducir) {
                alert("⛔ Lo sentimos, este vehículo requiere Licencia de Conducir válida para ser alquilado.");
                return;
            }
        }

        setCarrito(prev => {
            // Buscamos si existe un item con el mismo ID de producto Y la misma cantidad de horas
            const existente = prev.find(item => item.id === producto.id && item.horas === horas);

            if (existente) {
                // Si existe exactamente igual (mismo producto, mismas horas), sumamos la cantidad
                return prev.map(item =>
                    (item.id === producto.id && item.horas === horas)
                        ? { ...item, cantidad: item.cantidad + cantidad }
                        : item
                );
            }

            // Si es un producto diferente o el mismo producto con diferentes horas, agregamos nueva entrada
            return [...prev, {
                ...producto,
                cantidad,
                horas,
                cartId: `${producto.id}-${horas}-${Date.now()}` // Identificador único para el carrito
            }];
        });
        setEsVisible(true);
    };

    const removerDelCarrito = (cartId) => setCarrito(prev => prev.filter(item => item.cartId !== cartId));
    const limpiarCarrito = () => setCarrito([]);
    const total = carrito.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);

    return (
        <ContextoCarrito.Provider value={{ carrito, agregarAlCarrito, removerDelCarrito, limpiarCarrito, esVisible, setEsVisible, total }}>
            {children}
        </ContextoCarrito.Provider>
    );
};
