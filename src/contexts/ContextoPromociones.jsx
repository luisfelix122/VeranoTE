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

    const agregarPromocion = async (promo) => {
        const { crearPromocionDB } = await import('../services/db');
        const resultado = await crearPromocionDB(promo);
        if (resultado.success) {
            setPromociones(prev => [...prev, resultado.data]);
            return true;
        }
        return false;
    };

    const togglePromocion = async (id) => {
        const { editarPromocionDB } = await import('../services/db');
        const promo = promociones.find(p => p.id === id);
        if (!promo) return;

        const resultado = await editarPromocionDB(id, { activo: !promo.activo });
        if (resultado.success) {
            setPromociones(prev => prev.map(p => p.id === id ? { ...p, activo: !promo.activo } : p));
        }
    };

    const eliminarPromocion = async (id) => {
        const { eliminarPromocionDB } = await import('../services/db');
        const resultado = await eliminarPromocionDB(id);
        if (resultado.success) {
            setPromociones(prev => prev.filter(p => p.id !== id));
        }
    };

    const editarPromocion = async (id, datosNuevos) => {
        const { editarPromocionDB } = await import('../services/db');
        const resultado = await editarPromocionDB(id, datosNuevos);
        if (resultado.success) {
            setPromociones(prev => prev.map(p => p.id === id ? { ...p, ...datosNuevos } : p));
            return true;
        }
        return false;
    };

    const calcularDescuentos = async (carrito, cupon = null) => {
        const { calcularDescuentosDB } = await import('../services/db');
        return await calcularDescuentosDB(carrito, null, cupon);
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
