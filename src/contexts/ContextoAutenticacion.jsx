import React, { createContext, useState } from 'react';
import { usuariosIniciales } from '../utils/constants';

export const ContextoAutenticacion = createContext();

export const ProveedorAutenticacion = ({ children }) => {
    const [usuarios, setUsuarios] = useState(usuariosIniciales);
    const [usuario, setUsuario] = useState(null);

    const iniciarSesion = (email, password) => {
        const usuarioEncontrado = usuarios.find(u => u.email === email && u.password === password);
        if (usuarioEncontrado) {
            setUsuario(usuarioEncontrado);
            return true;
        }
        return false;
    };

    const registrarUsuario = (datos) => {
        const nuevoUsuario = { id: crypto.randomUUID(), ...datos, rol: 'cliente' };
        setUsuarios(prev => [...prev, nuevoUsuario]);
        setUsuario(nuevoUsuario);
        return true;
    };

    const cerrarSesion = () => setUsuario(null);

    const actualizarPerfil = (id, nuevosDatos) => {
        setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...nuevosDatos } : u));
        if (usuario && usuario.id === id) setUsuario(prev => ({ ...prev, ...nuevosDatos }));
    };

    const cambiarRolUsuario = (id, nuevoRol, sede = null) => {
        setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol: nuevoRol, sede: sede } : u));
    };

    const eliminarUsuario = (id) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
    };

    return (
        <ContextoAutenticacion.Provider value={{ usuario, usuarios, iniciarSesion, registrarUsuario, cerrarSesion, actualizarPerfil, cambiarRolUsuario, eliminarUsuario }}>
            {children}
        </ContextoAutenticacion.Provider>
    );
};
