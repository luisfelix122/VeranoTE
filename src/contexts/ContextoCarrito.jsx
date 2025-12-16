import React, { createContext, useState } from 'react';

export const ContextoCarrito = createContext();

export const ProveedorCarrito = ({ children }) => {
    const [carrito, setCarrito] = useState([]);
    const [esVisible, setEsVisible] = useState(false);

    const agregarAlCarrito = (producto, horas, cantidad = 1) => {
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
