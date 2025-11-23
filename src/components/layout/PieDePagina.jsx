import React from 'react';
import { Package, Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';
import { sedes } from '../../utils/constants';

const PieDePagina = () => (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-600 p-1.5 rounded text-white">
                        <Package size={20} />
                    </div>
                    <span className="text-xl font-bold text-white">Alquileres de Verano Peruanos</span>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                    La plataforma líder en alquiler de recursos recreativos.
                </p>
                <div className="flex gap-4">
                    <Facebook size={20} />
                    <Instagram size={20} />
                </div>
            </div>

            <div>
                <h3 className="text-white font-bold mb-4">Nuestras Sedes</h3>
                <ul className="space-y-2 text-sm">
                    {sedes.map(sede => (
                        <li key={sede.id} className="flex items-start gap-2">
                            <MapPin size={16} className="mt-0.5 text-blue-500" />
                            <span>{sede.nombre} - {sede.direccion}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h3 className="text-white font-bold mb-4">Contacto</h3>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <Phone size={16} className="text-blue-500" />
                        <span>(01) 555-0123</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Mail size={16} className="text-blue-500" />
                        <span>contacto@alquileresperuanos.pe</span>
                    </li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
            <p className="mb-2">
                De conformidad con la Ley N° 29733, Ley de Protección de Datos Personales, el usuario da su consentimiento para el tratamiento de sus datos personales.
            </p>
            © 2025 Alquileres de Verano Peruanos S.A.C.
        </div>
    </footer>
);

export default PieDePagina;
