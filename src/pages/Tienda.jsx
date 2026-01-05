import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Clock, CheckCircle, Phone, Mail, ExternalLink, Star, Filter, ArrowRight, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import TarjetaProducto from '../components/ui/TarjetaProducto';
import Tutorial from '../components/ui/Tutorial';
import { useTranslation } from 'react-i18next';

const Tienda = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { inventario, sedeActual, setSedeActual, sedes, estaAbierto, contenido, fechaSeleccionada, setFechaSeleccionada, calcularStockDisponible, calcularDisponibilidadDetallada } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const [busqueda, setBusqueda] = useState('');
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
    const [categoria, setCategoria] = useState('Todas');
    const [paginaActual, setPaginaActual] = useState(1);
    const [mostrarTutorial, setMostrarTutorial] = useState(false);
    const itemsPorPagina = 12; // Mostrar 12 productos por página

    useEffect(() => {
        const seen = localStorage.getItem('tutorial_seen');
        if (!seen) {
            // Small delay to ensure everything renders
            setTimeout(() => setMostrarTutorial(true), 1000);
        }
    }, []);

    useEffect(() => {
        if (usuario) {
            if (usuario.rol === 'admin') navigate('/admin/inventario');
            else if (usuario.rol === 'dueno') navigate('/admin/reportes');
            else if (usuario.rol === 'vendedor') navigate('/vendedor/operaciones');
            else if (usuario.rol === 'mecanico') navigate('/mecanico');
        }
    }, [usuario, navigate]);

    const categorias = ['Todas', ...new Set(inventario.map(p => p.categoria))];

    // Map inventory - Ya viene con stock real del backend
    const inventarioConStock = inventario;

    const filtrados = inventarioConStock.filter(p => {
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const esActivo = p.activo !== false;

        if (!esActivo) return false;

        if (categoria === 'Todas') {
            return coincideBusqueda;
        } else {
            return coincideBusqueda && p.categoria === categoria;
        }
    }).sort((a, b) => {
        // Ordenar: Disponibles primero, Agotados al final
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;
        return 0;
    });

    // Reiniciar página al filtrar
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, categoria, sedeActual]);

    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
    const productosVisibles = filtrados.slice(
        (paginaActual - 1) * itemsPorPagina,
        paginaActual * itemsPorPagina
    );

    const infoSedeActual = sedes.find(s => s.id === sedeActual) || sedes[0];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* Hero Section Immersivo */}
            <div className="relative h-[85vh] w-full overflow-hidden flex items-center justify-center">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={contenido?.hero_imagen_url || "/assets/hero-bg.png"}
                        alt="Paisaje de Verano"
                        className="w-full h-full object-cover transform scale-105 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-black/60" />
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

                    <div className="animate-fade-in-up flex flex-col items-center text-center">
                        <span id="welcome-modal" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold mb-6 shadow-lg">
                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                            <span>{t('home.badge')}</span>
                        </span>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-xl tracking-tight max-w-4xl">
                            {t('home.hero_title_1')}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-teal-200 drop-shadow-lg">{t('home.hero_title_2')}</span>
                            {/* Ajuste de colores: Invertí a un tono más sólido para contraste */}
                        </h1>

                        <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl font-light leading-relaxed drop-shadow-md">
                            {t('home.hero_subtitle')}
                        </p>
                    </div>

                    {/* Search Bar Premium */}
                    <div className="w-full max-w-3xl animate-fade-in-up delay-100">
                        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/50 flex flex-col md:flex-row gap-2">
                            {/* Selector de Sede */}
                            <div id="sede-selector" className="relative flex-[1.4] group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                                    <MapPin size={18} />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:pointer-events-auto z-20">
                                    <button onClick={(e) => { e.stopPropagation(); setSedeSeleccionada(infoSedeActual); }} className="text-[10px] md:text-xs font-semibold text-blue-600 hover:underline bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm transition-all shadow-sm">
                                        {t('home.ver_info')}
                                    </button>
                                </div>
                                <select
                                    value={sedeActual}
                                    onChange={(e) => setSedeActual(e.target.value)}
                                    className="w-full pl-14 pr-24 py-4 rounded-xl bg-transparent border-none outline-none text-gray-900 font-bold text-sm md:text-base cursor-pointer hover:bg-white/50 transition-colors appearance-none relative z-10"
                                >
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-px md:y-auto md:w-px bg-gray-200/50 mx-2" />

                            {/* Input Busqueda - Ahora en el Centro */}
                            <div id="search-bar" className="relative flex-[1.6] group min-w-[200px]">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-500 transition-colors group-focus-within:bg-blue-50 group-focus-within:text-blue-600">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('home.search_placeholder')}
                                    className="w-full h-full pl-14 pr-4 py-4 rounded-xl bg-transparent border-none outline-none text-gray-900 font-medium placeholder-gray-400 hover:bg-white/50 focus:bg-white/80 transition-all"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>

                            <div className="h-px md:y-auto md:w-px bg-gray-200/50 mx-2" />

                            {/* Selector de Fecha Custom - Ahora al Final */}
                            <div
                                id="date-selector"
                                className="relative flex-1 group min-w-[160px] cursor-pointer hover:bg-white/50 transition-colors rounded-xl h-14 w-full block"
                                style={{ minHeight: '56px' }}
                                onClick={() => document.getElementById('date-input-trigger').showPicker()}
                            >
                                {/* UI Personalizada */}
                                <div className="absolute inset-0 flex items-center pl-12 pointer-events-none">
                                    <span className={`text-sm md:text-base font-bold ${fechaSeleccionada ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {fechaSeleccionada ? new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Seleccionar fecha'}
                                    </span>
                                </div>

                                {/* Icono */}
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 pointer-events-none">
                                    <Calendar size={18} />
                                </div>

                                {/* Input Real (Oculto pero funcional via API) */}
                                <input
                                    id="date-input-trigger"
                                    type="date"
                                    value={fechaSeleccionada}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                                    className="opacity-0 absolute inset-0 w-full h-full pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-20">
                {/* Categories Scroll */}
                <div className="flex flex-col items-center -mt-10 mb-12">
                    <div className="flex overflow-x-auto gap-3 max-w-full no-scrollbar p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-lg">
                        {categorias.map(cat => {
                            const seleccionado = categoria === cat;

                            let clase = "whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 " +
                                (seleccionado
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'bg-transparent text-gray-600 hover:bg-white hover:shadow-sm');

                            return (
                                <button
                                    key={cat}
                                    onClick={() => setCategoria(cat)}
                                    className={clase}
                                >
                                    {t(`categories.${cat}`, cat)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Results Header */}
                <div className="flex justify-between items-end mb-8 px-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Catálogo</h2>
                        <p className="text-gray-500 mt-1">{t('home.showing_items', { count: filtrados.length })} <span className="font-semibold text-blue-600">{infoSedeActual?.nombre}</span></p>
                    </div>
                    {/* Add visual filters/sorting controls here if needed */}
                </div>

                {/* Grid de Productos */}
                {filtrados.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
                            {productosVisibles.map(p => (
                                <div key={p.id} className="group h-full bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                                    <TarjetaProducto producto={p} alSeleccionar={(producto) => navigate(`/producto/${producto.id}`)} />
                                </div>
                            ))}
                        </div>

                        {/* Controles de Paginación */}
                        {totalPaginas > 1 && (
                            <div className="flex justify-center items-center gap-6 pb-8 animate-fade-in-up">
                                <button
                                    onClick={() => {
                                        setPaginaActual(prev => Math.max(prev - 1, 1));
                                        window.scrollTo({ top: 500, behavior: 'smooth' });
                                    }}
                                    disabled={paginaActual === 1}
                                    className="p-4 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all shadow-md flex items-center justify-center group"
                                >
                                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                                </button>

                                <div className="flex flex-col items-center">
                                    <span className="text-gray-500 font-medium text-sm uppercase tracking-wider">Página</span>
                                    <span className="text-2xl font-black text-gray-900 leading-none">{paginaActual} <span className="text-lg text-gray-400 font-normal">/ {totalPaginas}</span></span>
                                </div>

                                <button
                                    onClick={() => {
                                        setPaginaActual(prev => Math.min(prev + 1, totalPaginas));
                                        window.scrollTo({ top: 500, behavior: 'smooth' });
                                    }}
                                    disabled={paginaActual === totalPaginas}
                                    className="p-4 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all shadow-md flex items-center justify-center group"
                                >
                                    <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                            <Filter size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('home.no_results_title')}</h3>
                        <p className="text-gray-500 max-w-md">
                            {t('home.no_results_desc')}
                        </p>
                        <button
                            onClick={() => { setBusqueda(''); setCategoria('Todas'); }}
                            className="mt-6 px-6 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            {t('home.clear_filters')}
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Detalle Sede */}
            {sedeSeleccionada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="relative h-64">
                            <img
                                src={sedeSeleccionada.imagen}
                                alt={sedeSeleccionada.nombre}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                                <h2 className="text-4xl font-bold text-white mb-2">{sedeSeleccionada.nombre}</h2>
                                <p className="text-white/90 flex items-center gap-2">
                                    <MapPin size={18} className="text-blue-400" /> {sedeSeleccionada.direccion}
                                </p>
                            </div>
                            <button
                                onClick={() => setSedeSeleccionada(null)}
                                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-2 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Clock size={20} className="text-blue-500" /> {t('home.state_schedule')}
                                </h3>
                                <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border ${estaAbierto(sedeSeleccionada.id).abierto ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                    <div className={`w-3 h-3 rounded-full ${estaAbierto(sedeSeleccionada.id).abierto ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="font-bold text-sm tracking-wide">{estaAbierto(sedeSeleccionada.id).abierto ? t('home.open_now') : t('home.closed')}</p>
                                        <p className="text-xs opacity-80">{estaAbierto(sedeSeleccionada.id).mensaje}</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-gray-600 leading-relaxed text-lg">
                                    {sedeSeleccionada.descripcion}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('home.contact')}</h3>
                                    <ul className="space-y-4">
                                        {sedeSeleccionada.telefono && (
                                            <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                                                <Phone size={20} className="text-blue-500" />
                                                <span className="font-medium">{sedeSeleccionada.telefono}</span>
                                            </li>
                                        )}
                                        {sedeSeleccionada.correo_contacto && (
                                            <li className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-xl">
                                                <Mail size={20} className="text-blue-500" />
                                                <span className="font-medium">{sedeSeleccionada.correo_contacto}</span>
                                            </li>
                                        )}
                                        {sedeSeleccionada.mapa_url && (
                                            <li>
                                                <a href={sedeSeleccionada.mapa_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-xl transition-colors font-medium">
                                                    <ExternalLink size={20} />
                                                    Ver ubicación en mapa
                                                </a>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('home.services')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {sedeSeleccionada.servicios?.map((servicio, index) => (
                                            <span key={index} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                                                <CheckCircle size={16} className="text-teal-500" />
                                                {servicio}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button
                                onClick={() => setSedeSeleccionada(null)}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-bold shadow-lg shadow-gray-200"
                            >
                                {t('home.understood_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Botón Flotante de Ayuda Animation */}
            <button
                onClick={() => setMostrarTutorial(true)}
                className="fixed bottom-24 md:bottom-6 right-6 z-40 bg-white p-3 rounded-full shadow-2xl border border-blue-100 group hover:scale-110 transition-transform duration-300 animate-bounce-slow"
                title="Necesitas ayuda?"
            >
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                <div className="bg-blue-600 text-white p-2 rounded-full">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 8V4H8" />
                        <rect width="16" height="12" x="4" y="8" rx="2" />
                        <path d="M2 14h2" />
                        <path d="M20 14h2" />
                        <path d="M15 13v2" />
                        <path d="M9 13v2" />
                    </svg>
                </div>
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-lg text-xs font-bold text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    ¿Te ayudo?
                </span>
            </button>
            <Tutorial isOpen={mostrarTutorial} onClose={() => setMostrarTutorial(false)} />
        </div>
    );
};

export default Tienda;
