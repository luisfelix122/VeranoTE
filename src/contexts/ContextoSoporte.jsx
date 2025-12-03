import React, { createContext, useState, useEffect, useContext } from 'react';
import { obtenerTickets, crearTicket as crearTicketDB, obtenerMensajes } from '../services/db';
import { ContextoAutenticacion } from './ContextoAutenticacion';

export const ContextoSoporte = createContext();

export const ProveedorSoporte = ({ children }) => {
    const { usuario } = useContext(ContextoAutenticacion);
    const [tickets, setTickets] = useState([]);
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (usuario?.id) {
            cargarDatos();
        } else {
            setTickets([]);
            setMensajes([]);
        }
    }, [usuario]);

    const cargarDatos = async () => {
        setCargando(true);
        const [ticketsData, mensajesData] = await Promise.all([
            obtenerTickets(usuario.id),
            obtenerMensajes(usuario.id)
        ]);
        setTickets(ticketsData || []);
        setMensajes(mensajesData || []);
        setCargando(false);
    };

    const crearTicket = async (datos) => {
        // Optimista
        const nuevoTicketTemp = {
            id: Date.now(),
            ...datos,
            fecha: new Date().toISOString(),
            estado: "abierto",
            leido: false
        };
        setTickets(prev => [nuevoTicketTemp, ...prev]);

        // DB
        const resultado = await crearTicketDB(usuario.id, datos);
        if (resultado.success) {
            // Recargar para tener el ID real y datos correctos
            cargarDatos();
        } else {
            console.error("Error DB:", resultado.error);
            alert(`Error al crear ticket: ${resultado.error?.message || JSON.stringify(resultado.error)}`);
        }
    };

    // Funciones simuladas para UI por ahora (DB no tiene endpoint para marcar leido/resolver aun en db.js expuesto, pero se puede agregar luego)
    const marcarComoLeido = (id) => {
        // Solo local por ahora para mensajes
        setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m));
    };

    const resolverTicket = (id) => {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: "cerrado" } : t));
    };

    const eliminarTicket = (id) => {
        setTickets(prev => prev.filter(t => t.id !== id));
        setMensajes(prev => prev.filter(m => m.id !== id));
    };

    const ticketsNoLeidos = mensajes.filter(m => !m.leido).length; // Usamos mensajes para notificaciones

    return (
        <ContextoSoporte.Provider value={{
            tickets,
            mensajes,
            crearTicket,
            marcarComoLeido,
            resolverTicket,
            eliminarTicket,
            ticketsNoLeidos,
            cargando
        }}>
            {children}
        </ContextoSoporte.Provider>
    );
};
