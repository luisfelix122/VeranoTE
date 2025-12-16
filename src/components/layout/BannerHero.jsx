import React, { useContext } from 'react';
import { MapPin, CheckCircle, Star } from 'lucide-react';
import { ContextoInventario } from '../../contexts/ContextoInventario';

const BannerHero = () => {
    const { contenido } = useContext(ContextoInventario);

    const titulo = contenido?.BANNER_TITULO || 'Tu Aventura de Verano Comienza Aquí';
    const subtitulo = contenido?.BANNER_SUBTITULO || 'Alquila los mejores equipos para disfrutar del sol, la playa y la naturaleza.';
    const imagenUrl = contenido?.BANNER_IMAGEN_URL || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1600';

    const badge1 = contenido?.BANNER_BADGE_1 || '2 Sedes Exclusivas';
    const badge2 = contenido?.BANNER_BADGE_2 || 'Equipos Garantizados';
    const etiqueta = contenido?.BANNER_ETIQUETA || 'La experiencia definitiva de verano';

    return (
        <div className="relative bg-blue-900 text-white py-20 overflow-hidden mb-8 rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-6">
            <div className="absolute inset-0 opacity-30">
                <img src={imagenUrl} alt="Playa" className="w-full h-full object-cover" />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 text-center">
                {etiqueta && (
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6 border border-white/30 shadow-sm">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-semibold tracking-wide uppercase text-white/90">{etiqueta}</span>
                    </div>
                )}
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                    {titulo}
                </h1>
                <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
                    {subtitulo}
                </p>
                <div className="flex justify-center gap-4">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                        <MapPin size={18} />
                        <span>{badge1}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                        <CheckCircle size={18} />
                        <span>{badge2}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BannerHero;
