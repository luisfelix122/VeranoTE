import React, { useState, useContext, useEffect } from 'react';
import { Phone, Shield, FileText, AlertTriangle, LifeBuoy, ChevronDown, ChevronUp, Info, Search, Smartphone } from 'lucide-react';
import Boton from '../components/ui/Boton';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { obtenerGuiasSeguridad, obtenerEmergencias } from '../services/db';

const Soporte = () => {
    const [seccionActiva, setSeccionActiva] = useState('contacto'); // 'contacto', 'seguridad', 'emergencia'
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const { sedes } = useContext(ContextoInventario);

    // Helpers para encontrar contactos dinámicos
    const adminCosta = usuarios.find(u => u.rol === 'admin' && u.sede === 'costa');
    const vendorsCosta = usuarios.filter(u => u.rol === 'vendedor' && u.sede === 'costa');
    const adminRural = usuarios.find(u => u.rol === 'admin' && u.sede === 'rural');
    const vendorsRural = usuarios.filter(u => u.rol === 'vendedor' && u.sede === 'rural');

    const formatPhone = (phone) => {
        if (!phone) return 'N/A';
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 9) {
            return `+51 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        return phone;
    };

    const getWaLink = (phone, text) => {
        if (!phone) return '#';
        const clean = phone.replace(/\D/g, '');
        const full = clean.startsWith('51') ? clean : '51' + clean;
        return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
    };

    const nombreCorto = (nombre) => {
        if (!nombre) return '';
        const partes = nombre.split(' ');
        if (partes.length > 2) return `${partes[0]} ${partes[1]}`;
        return nombre;
    };


    const [guiasSeguridad, setGuiasSeguridad] = useState([]);
    const [emergencias, setEmergencias] = useState([]);
    const [cargandoGuias, setCargandoGuias] = useState(true);
    const [cargandoEmergencias, setCargandoEmergencias] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const cargarDatos = async () => {
            const [guias, ems] = await Promise.all([
                obtenerGuiasSeguridad(),
                obtenerEmergencias()
            ]);
            setGuiasSeguridad(guias);
            setEmergencias(ems);
            setCargandoGuias(false);
            setCargandoEmergencias(false);
        };
        cargarDatos();
    }, []);

    // Limpiar búsqueda al cambiar de pestaña
    useEffect(() => {
        setBusqueda('');
    }, [seccionActiva]);

    // Pre-seleccionar primera sede

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda</h1>
                <p className="text-gray-600">Selecciona una opción para recibir asistencia.</p>
            </div>

            {/* Navegación de Pestañas */}
            <div className="flex justify-center border-b border-gray-200 mb-6">
                <button
                    onClick={() => setSeccionActiva('contacto')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${seccionActiva === 'contacto' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Phone size={18} />
                    Contacto y Soporte
                </button>
                <button
                    onClick={() => setSeccionActiva('seguridad')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${seccionActiva === 'seguridad' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Shield size={18} />
                    Guías de Seguridad
                </button>
                <button
                    onClick={() => setSeccionActiva('emergencia')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${seccionActiva === 'emergencia' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <AlertTriangle size={18} />
                    Emergencias
                </button>
            </div>

            {/* Contenido de Pestañas */}
            <div className="min-h-[400px]">
                {seccionActiva === 'contacto' && (
                    <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                        {/* Nueva Sección de WhatsApp */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-900">
                                <Smartphone className="text-emerald-600" />
                                Contacto Directo por WhatsApp
                            </h2>
                            <p className="text-sm text-emerald-700 mb-6">
                                ¿Necesitas una respuesta inmediata? Comunícate con nuestros coordinadores de zona.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sede Costa */}
                                <div className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-emerald-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 border-b pb-2 border-emerald-100">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Sede Costa
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Administrador ({nombreCorto(adminCosta?.nombre) || 'Costa'})</p>
                                                <p className="text-sm font-medium text-gray-700">{formatPhone(adminCosta?.telefono || '999111222')}</p>
                                            </div>
                                            <a
                                                href={getWaLink(adminCosta?.telefono || '999111222', 'Hola, necesito asistencia en Sede Costa')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                            >
                                                <Smartphone size={18} />
                                            </a>
                                        </div>
                                        {vendorsCosta.map(v => (
                                            <div key={v.id} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Vendedor ({nombreCorto(v.nombre)})</p>
                                                    <p className="text-sm font-medium text-gray-700">{formatPhone(v.telefono || '999222111')}</p>
                                                </div>
                                                <a
                                                    href={getWaLink(v.telefono || '999222111', `Hola ${v.nombre}, tengo una consulta sobre mi alquiler en Costa`)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                                >
                                                    <Smartphone size={18} />
                                                </a>
                                            </div>
                                        ))}

                                        {vendorsCosta.length === 0 && (
                                            <div className="flex items-center justify-between opacity-50">
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Vendedores</p>
                                                    <p className="text-sm font-medium text-gray-700">+51 999 222 111</p>
                                                </div>
                                                <div className="bg-gray-300 text-white p-2 rounded-lg cursor-not-allowed">
                                                    <Smartphone size={18} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sede Sierra / Rural */}
                                <div className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-emerald-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 border-b pb-2 border-emerald-100">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Sede Sierra / Rural
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Administrador ({nombreCorto(adminRural?.nombre) || 'Sierra'})</p>
                                                <p className="text-sm font-medium text-gray-700">{formatPhone(adminRural?.telefono || '999111333')}</p>
                                            </div>
                                            <a
                                                href={getWaLink(adminRural?.telefono || '999111333', 'Hola, necesito asistencia en Sede Sierra')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                            >
                                                <Smartphone size={18} />
                                            </a>
                                        </div>
                                        {vendorsRural.map(v => (
                                            <div key={v.id} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Vendedor ({nombreCorto(v.nombre)})</p>
                                                    <p className="text-sm font-medium text-gray-700">{formatPhone(v.telefono || '999222333')}</p>
                                                </div>
                                                <a
                                                    href={getWaLink(v.telefono || '999222333', `Hola ${v.nombre}, tengo una consulta sobre mi alquiler en Sierra`)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                                >
                                                    <Smartphone size={18} />
                                                </a>
                                            </div>
                                        ))}

                                        {vendorsRural.length === 0 && (
                                            <div className="flex items-center justify-between opacity-50">
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Vendedores</p>
                                                    <p className="text-sm font-medium text-gray-700">+51 999 222 333</p>
                                                </div>
                                                <div className="bg-gray-300 text-white p-2 rounded-lg cursor-not-allowed">
                                                    <Smartphone size={18} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {seccionActiva === 'seguridad' && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        {/* Buscador de Guías */}
                        <div className="relative max-w-md mx-auto">
                            <input
                                type="text"
                                placeholder="Buscar guía de seguridad (ej. Kayak, Casco...)"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-full shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                onChange={(e) => setBusqueda(e.target.value.toLowerCase())}
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cargandoGuias ? (
                                <p className="text-center col-span-full text-gray-500 py-10">Cargando guías de seguridad...</p>
                            ) : guiasSeguridad.filter(g =>
                                !busqueda ||
                                g.nombre.toLowerCase().includes(busqueda) ||
                                g.guia_seguridad.toLowerCase().includes(busqueda)
                            ).length === 0 ? (
                                <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <Info className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="text-gray-500">No se encontraron guías que coincidan con tu búsqueda.</p>
                                </div>
                            ) : (
                                guiasSeguridad.filter(g =>
                                    !busqueda ||
                                    g.nombre.toLowerCase().includes(busqueda) ||
                                    g.guia_seguridad.toLowerCase().includes(busqueda)
                                ).map((guia) => (
                                    <div key={guia.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                                        <div className="h-32 overflow-hidden relative">
                                            <img
                                                src={guia.imagen}
                                                alt={guia.nombre}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                                <h3 className="text-white font-bold text-lg">{guia.nombre}</h3>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-start gap-3">
                                                <Shield className="text-green-600 shrink-0 mt-1" size={20} />
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    {guia.guia_seguridad}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {seccionActiva === 'emergencia' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
                        {cargandoEmergencias ? (
                            <p className="text-center col-span-full text-gray-500 py-10">Cargando teléfonos de emergencia...</p>
                        ) : emergencias.length === 0 ? (
                            <p className="text-center col-span-full text-gray-500 py-10">No hay teléfonos de emergencia registrados.</p>
                        ) : (
                            emergencias.map((em) => {
                                // Mapeo de iconos y clases basado en el tipo o color
                                const Icono = em.tipo === 'bomberos' || em.tipo === 'cruz_roja' ? AlertTriangle :
                                    em.tipo === 'policia' || em.tipo === 'serenazgo' ? Shield :
                                        em.tipo === 'salvavidas' ? LifeBuoy : Phone;

                                const baseColors = {
                                    red: 'bg-red-50 border-red-100 text-red-900 icon-bg-red-100 icon-text-red-600 num-text-red-600 desc-text-red-700',
                                    blue: 'bg-blue-50 border-blue-100 text-blue-900 icon-bg-blue-100 icon-text-blue-600 num-text-blue-600 desc-text-blue-700',
                                    orange: 'bg-orange-50 border-orange-100 text-orange-900 icon-bg-orange-100 icon-text-orange-600 num-text-orange-600 desc-text-orange-700',
                                    white: 'bg-white border-red-200 text-gray-900 icon-bg-red-50 icon-text-red-500 num-text-red-500 desc-text-gray-600',
                                    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-900 icon-bg-indigo-100 icon-text-indigo-600 num-text-indigo-600 desc-text-indigo-700',
                                    green: 'bg-green-50 border-green-100 text-green-900 icon-bg-green-100 icon-text-green-600 num-text-green-600 desc-text-green-700'
                                };

                                const colors = baseColors[em.color_fondo] || baseColors.blue;

                                return (
                                    <div key={em.id} className={`${colors.split(' ')[0]} ${colors.split(' ')[1]} p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1`}>
                                        <div className={`${colors.split(' ').find(c => c.startsWith('icon-bg-')).replace('icon-bg-', 'bg-')} p-4 rounded-full mb-4 ${colors.split(' ').find(c => c.startsWith('icon-text-')).replace('icon-text-', 'text-')} shadow-sm`}>
                                            <Icono size={40} />
                                        </div>
                                        <h3 className={`font-bold ${colors.split(' ')[2]} text-lg mb-1`}>{em.nombre}</h3>
                                        <p className={`text-4xl font-black ${colors.split(' ').find(c => c.startsWith('num-text-')).replace('num-text-', 'text-')} mb-3 tracking-tight`}>{em.numero}</p>
                                        <p className={`text-sm ${colors.split(' ').find(c => c.startsWith('desc-text-')).replace('desc-text-', 'text-')} font-medium`}>{em.descripcion}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Soporte;
