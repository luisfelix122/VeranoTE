import React from 'react';

const BadgeEstado = ({ estado }) => {
    const config = {
        pendiente: { color: "bg-yellow-100 text-yellow-800", texto: "Pendiente Revisión" },
        listo_para_entrega: { color: "bg-purple-100 text-purple-800", texto: "Listo para Entrega" },
        en_uso: { color: "bg-blue-100 text-blue-800", texto: "En Uso" },
        limpieza: { color: "bg-cyan-100 text-cyan-800", texto: "En Limpieza" },
        en_mantenimiento: { color: "bg-orange-100 text-orange-800", texto: "En Mantenimiento" },
        fuera_de_servicio: { color: "bg-red-100 text-red-800", texto: "Fuera de Servicio" },
        finalizado: { color: "bg-green-100 text-green-800", texto: "Finalizado" },
        devuelto: { color: "bg-gray-100 text-gray-800", texto: "Devuelto (Histórico)" }
    };
    const { color, texto } = config[estado] || { color: "bg-gray-100 text-gray-800", texto: estado };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{texto}</span>;
};

export default BadgeEstado;
