import React, { createContext, useState, useContext, useEffect } from 'react';

export const ContextoPromociones = createContext();

export const ProveedorPromociones = ({ children }) => {
    const [promociones, setPromociones] = useState([]);

    useEffect(() => {
        const cargarPromociones = async () => {
            const { obtenerPromociones } = await import('../services/db');
            const data = await obtenerPromociones();
            setPromociones(data);
        };
        cargarPromociones();
    }, []);

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

    const calcularDescuentos = async (carrito) => {
        const { calcularDescuentosDB } = await import('../services/db');
        return await calcularDescuentosDB(carrito);
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
