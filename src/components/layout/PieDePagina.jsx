import React, { useContext } from 'react';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, Sun, Waves, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ContextoInventario } from '../../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';
import { usarUI } from '../../contexts/ContextoUI';
import { useTranslation } from 'react-i18next';

const PieDePagina = () => {
    const { sedes, configuracion } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const { setMostrarLogin, abrirModalInfo } = usarUI();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const telefono = configuracion?.contactoTelefono || '(01) 555-0123';
    const email = configuracion?.contactoEmail || 'contacto@alquileresperuanos.pe';
    const appNombre = configuracion?.appNombre || t('nav.app_name', 'Alquiler de Verano');
    const appDescripcion = configuracion?.appDescripcion || 'La plataforma líder para tus mejores recuerdos de verano...';

    const handleNavegacionProtegida = (ruta) => {
        if (!usuario) {
            setMostrarLogin(true);
        } else {
            navigate(ruta);
        }
    };

    return (
        <footer className="relative bg-[#0f172a] text-gray-300 pt-20 pb-10 overflow-hidden mt-20">
            {/* Gradient Glow Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3"></div>

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-6 group">
                            <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <Sun className="text-yellow-200 absolute top-1.5 right-1.5 opacity-90" size={14} fill="currentColor" />
                                <Waves className="text-white relative z-10 mt-1" size={22} strokeWidth={2.5} />
                            </div>
                            <span className="text-2xl font-bold text-white tracking-tight">
                                {appNombre}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            {appDescripcion}
                        </p>
                        <div className="flex gap-4">
                            <a href={configuracion?.linkFacebook || "https://facebook.com"} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-blue-400">
                                <Facebook size={20} />
                            </a>
                            <a href={configuracion?.linkInstagram || "https://instagram.com"} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-pink-400">
                                <Instagram size={20} />
                            </a>
                            <a href={configuracion?.linkTwitter || "https://twitter.com"} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white hover:text-sky-400">
                                <Twitter size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Links Column */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">Navegación</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <button
                                    onClick={() => {
                                        navigate('/');
                                        setTimeout(() => {
                                            const topElement = document.getElementById('top');
                                            if (topElement) {
                                                topElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            } else {
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }, 100);
                                    }}
                                    className="hover:text-blue-400 transition-colors flex items-center gap-2 text-left w-full"
                                >
                                    <ArrowRight size={14} className="opacity-50" />Inicio
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handleNavegacionProtegida('/perfil')} className="hover:text-blue-400 transition-colors flex items-center gap-2 text-left">
                                    <ArrowRight size={14} className="opacity-50" />Mi Cuenta
                                </button>
                            </li>
                            <li>
                                <button onClick={() => abrirModalInfo('ayuda', 'Centro de Ayuda')} className="hover:text-blue-400 transition-colors flex items-center gap-2 text-left">
                                    <ArrowRight size={14} className="opacity-50" />Centro de Ayuda
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Sedes Column */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">Nuestras Sedes</h3>
                        <ul className="space-y-4 text-sm">
                            {sedes.map(sede => (
                                <li key={sede.id} className="flex items-start gap-3 group">
                                    <span className="mt-1 min-w-[20px] h-5 flex items-center justify-center rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <MapPin size={14} />
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-gray-200 font-medium">{sede.nombre}</span>
                                        {sede.mapa_url ? (
                                            <a
                                                href={sede.mapa_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-gray-500 opacity-70 group-hover:opacity-100 group-hover:text-blue-400 transition-all hover:underline"
                                            >
                                                {sede.ubicacionCompleta}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-500 opacity-70">{sede.ubicacionCompleta}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Column */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">Contáctanos</h3>
                        <div className="space-y-4">
                            <a href={`tel:${telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                <Phone size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Llámanos</p>
                                    <p className="text-white font-bold group-hover:text-blue-200">{telefono}</p>
                                </div>
                            </a>
                            <a href={`mailto:${email}`} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-teal-500/30 transition-colors group">
                                <Mail size={24} className="text-teal-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Escríbenos</p>
                                    <p className="text-white font-bold text-sm truncate max-w-[150px] group-hover:text-teal-200">{email}</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 text-center md:text-left">
                    <p>
                        © 2025 {appNombre}. Todos los derechos reservados.
                    </p>
                    <div className="flex gap-6">
                        <button onClick={() => abrirModalInfo('privacidad', 'Política de Privacidad')} className="hover:text-white transition-colors">Privacidad</button>
                        <button onClick={() => abrirModalInfo('terminos', 'Términos y Condiciones')} className="hover:text-white transition-colors">Términos</button>
                        <button onClick={() => abrirModalInfo('cookies', 'Política de Cookies')} className="hover:text-white transition-colors">Cookies</button>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PieDePagina;
