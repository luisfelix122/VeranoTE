import React from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';

const TarjetaSede = ({ sede }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 bg-gray-200 relative">
                <img
                    src={sede.imagen}
                    alt={sede.nombre}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Clock size={12} /> Abierto
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{sede.nombre}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-blue-500 mt-0.5" />
                        <span>{sede.direccion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone size={16} className="text-blue-500" />
                        <span>{sede.telefono}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TarjetaSede;
