import React, { createContext, useContext, useState } from 'react';

const ContextoUI = createContext();

export const ProveedorUI = ({ children }) => {
    const [mostrarLogin, setMostrarLogin] = useState(false);
    const [modoRegistro, setModoRegistro] = useState(false);

    return (
        <ContextoUI.Provider value={{ mostrarLogin, setMostrarLogin, modoRegistro, setModoRegistro }}>
            {children}
        </ContextoUI.Provider>
    );
};

export { ContextoUI };

export const usarUI = () => {
    const context = useContext(ContextoUI);
    if (!context) {
        throw new Error('usarUI debe ser usado dentro de un ProveedorUI');
    }
    return context;
};
