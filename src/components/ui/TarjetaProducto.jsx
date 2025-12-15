import React from 'react';
import Boton from './Boton';

const TarjetaProducto = ({ producto, alSeleccionar }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-gray-700">
                    {producto.categoria}
                </div>
            </div>
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{producto.nombre}</h3>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-blue-600 font-bold">S/ {producto.precioPorHora}/h</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${producto.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {producto.stock > 0 ? `${producto.stock} disp.` : 'Agotado'}
                    </span>
                </div>
                {producto.stock <= 0 && (
                    <p className="text-xs text-orange-600 mb-2 font-medium">
                        Disponible aprox. en 2h (Verificar disponibilidad)
                    </p>
                )}
                <Boton
                    onClick={() => alSeleccionar(producto)}
                    variante="primario"
                    className="w-full"
                    disabled={producto.stock === 0}
                >
                    {producto.stock > 0 ? 'Ver Detalles' : 'No Disponible'}
                </Boton>
            </div>
        </div>
    );
};

export default TarjetaProducto;
