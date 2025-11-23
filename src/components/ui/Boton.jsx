import React from 'react';

const Boton = ({ children, onClick, variante = 'primario', className = '', ...props }) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantes = {
        primario: "bg-blue-600 text-white hover:bg-blue-700",
        secundario: "bg-gray-200 text-gray-800 hover:bg-gray-300",
        peligro: "bg-red-500 text-white hover:bg-red-600",
        exito: "bg-green-600 text-white hover:bg-green-700",
        fantasma: "bg-transparent text-gray-600 hover:bg-gray-100"
    };

    return (
        <button
            className={`${base} ${variantes[variante]} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default Boton;
