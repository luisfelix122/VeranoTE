import React, { createContext, useContext, useState } from 'react';

const ContextoUI = createContext();

export const ProveedorUI = ({ children }) => {
    const [mostrarLogin, setMostrarLogin] = useState(false);
    const [modoRegistro, setModoRegistro] = useState(false);

    // Estado para el modal de información global (Términos, Privacidad, Ayuda)
    const [modalInfo, setModalInfo] = useState({
        abierto: false,
        slug: '',
        titulo: ''
    });

    const abrirModalInfo = (slug, titulo) => {
        setModalInfo({ abierto: true, slug, titulo });
    };

    const cerrarModalInfo = () => {
        setModalInfo({ ...modalInfo, abierto: false });
    };

    return (
        <ContextoUI.Provider value={{
            mostrarLogin,
            setMostrarLogin,
            modoRegistro,
            setModoRegistro,
            modalInfo,
            abrirModalInfo,
            cerrarModalInfo
        }}>
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
