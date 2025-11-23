import React, { createContext, useState } from 'react';

export const ContextoCarrito = createContext();

export const ProveedorCarrito = ({ children }) => {
    const [carrito, setCarrito] = useState([]);
    const [esVisible, setEsVisible] = useState(false);

    const agregarAlCarrito = (producto, horas) => {
        setCarrito(prev => {
            const existente = prev.find(item => item.id === producto.id);
            if (existente) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1, horas } : item);
            return [...prev, { ...producto, cantidad: 1, horas }];
        });
        setEsVisible(true);
    };

    const removerDelCarrito = (id) => setCarrito(prev => prev.filter(item => item.id !== id));
    const limpiarCarrito = () => setCarrito([]);
    const total = carrito.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);

    return (
        <ContextoCarrito.Provider value={{ carrito, agregarAlCarrito, removerDelCarrito, limpiarCarrito, esVisible, setEsVisible, total }}>
            {children}
        </ContextoCarrito.Provider>
    );
};
