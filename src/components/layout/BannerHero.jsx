import React from 'react';
import { MapPin, CheckCircle } from 'lucide-react';

const BannerHero = () => (
    <div className="relative bg-blue-900 text-white py-20 overflow-hidden mb-8 rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-6">
        <div className="absolute inset-0 opacity-30">
            <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1600" alt="Playa" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                Tu Aventura de Verano Comienza Aquí
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
                Alquila los mejores equipos para disfrutar del sol, la playa y la naturaleza.
            </p>
            <div className="flex justify-center gap-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                    <MapPin size={18} />
                    <span>2 Sedes Exclusivas</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                    <CheckCircle size={18} />
                    <span>Equipos Garantizados</span>
                </div>
            </div>
        </div>
    </div>
);

export default BannerHero;
