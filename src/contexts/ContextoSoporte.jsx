import React, { createContext, useState } from 'react';

export const ContextoSoporte = createContext();

export const ProveedorSoporte = ({ children }) => {
    const [tickets, setTickets] = useState([
        {
            id: 1,
            asunto: "Problema con Reserva",
            mensaje: "No puedo ver mi reserva en el historial.",
            telefono: "+51 999 888 777",
            fecha: new Date().toISOString(),
            estado: "pendiente", // pendiente, resuelto
            leido: false
        }
    ]);

    const crearTicket = (datos) => {
        const nuevoTicket = {
            id: Date.now(),
            ...datos,
            fecha: new Date().toISOString(),
            estado: "pendiente",
            leido: false,
            remitente: datos.remitente || { nombre: 'Cliente', rol: 'cliente' }, // Default for external support
            destinatario: datos.destinatario || { rol: 'admin' } // Default to admin if not specified
        };
        setTickets(prev => [nuevoTicket, ...prev]);
    };

    const marcarComoLeido = (id) => {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, leido: true } : t));
    };

    const resolverTicket = (id) => {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: "resuelto" } : t));
    };

    const eliminarTicket = (id) => {
        setTickets(prev => prev.filter(t => t.id !== id));
    };

    const ticketsNoLeidos = tickets.filter(t => !t.leido).length;

    return (
        <ContextoSoporte.Provider value={{
            tickets,
            crearTicket,
            marcarComoLeido,
            resolverTicket,
            eliminarTicket,
            ticketsNoLeidos
        }}>
            {children}
        </ContextoSoporte.Provider>
    );
};
