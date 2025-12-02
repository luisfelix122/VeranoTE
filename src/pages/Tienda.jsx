import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Clock, CheckCircle, BarChart3, Phone, Mail, ExternalLink } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import BannerHero from '../components/layout/BannerHero';
import TarjetaProducto from '../components/ui/TarjetaProducto';
import TarjetaSede from '../components/ui/TarjetaSede';

const Tienda = () => {
    const navigate = useNavigate();
    const { inventario, sedeActual, setSedeActual, sedes, estaAbierto } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const [busqueda, setBusqueda] = useState('');
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);

    useEffect(() => {
        if (usuario) {
            if (usuario.rol === 'admin') navigate('/admin/inventario');
            else if (usuario.rol === 'dueno') navigate('/admin/reportes');
            else if (usuario.rol === 'vendedor') navigate('/vendedor/operaciones');
            else if (usuario.rol === 'mecanico') navigate('/mecanico');
        }
    }, [usuario, navigate]);
    const [categoria, setCategoria] = useState('Todas');
    const categorias = ['Todas', ...new Set(inventario.map(p => p.categoria))];
    const filtrados = inventario.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (categoria === 'Todas' || p.categoria === categoria));

    return (
        <div className="space-y-6 relative">
            <BannerHero />

            <div className="px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {sedes.map(sede => {
                        const estadoSede = estaAbierto(sede.id);
                        return (
                            <div key={sede.id} onClick={() => { setSedeSeleccionada(sede); setSedeActual(sede.id); }} className="cursor-pointer transform transition-transform hover:scale-[1.02]">
                                <div className="relative">
                                    <TarjetaSede sede={sede} />
                                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${estadoSede.abierto ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {estadoSede.abierto ? 'ABIERTO' : 'CERRADO'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {/* Selector de Sede */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <select
                                className="pl-10 pr-8 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                                value={sedeActual}
                                onChange={(e) => setSedeActual(e.target.value)}
                            >
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative w-full sm:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="text-gray-400" size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar equipo..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <div className="flex gap-2">
                            {categorias.map(cat => (
                                <button key={cat} onClick={() => setCategoria(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${categoria === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtrados.map(p => <TarjetaProducto key={p.id} producto={p} alSeleccionar={(producto) => navigate(`/producto/${producto.id}`)} />)}
                </div>
            </div>

            {/* Modal Detalle Sede */}
            {sedeSeleccionada && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="relative h-48 sm:h-64">
                            <img
                                src={sedeSeleccionada.imagen}
                                alt={sedeSeleccionada.nombre}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setSedeSeleccionada(null)}
                                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                <h2 className="text-3xl font-bold text-white">{sedeSeleccionada.nombre}</h2>
                                <p className="text-white/90 flex items-center gap-2 mt-1">
                                    <MapPin size={16} /> {sedeSeleccionada.direccion}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Sobre esta sede</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {sedeSeleccionada.descripcion}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Contacto y Ubicación</h3>
                                    <ul className="space-y-3">
                                        {sedeSeleccionada.telefono && (
                                            <li className="flex items-center gap-2 text-gray-700">
                                                <Phone size={18} className="text-blue-500" />
                                                <span>{sedeSeleccionada.telefono}</span>
                                            </li>
                                        )}
                                        {sedeSeleccionada.correo_contacto && (
                                            <li className="flex items-center gap-2 text-gray-700">
                                                <Mail size={18} className="text-blue-500" />
                                                <span>{sedeSeleccionada.correo_contacto}</span>
                                            </li>
                                        )}
                                        {sedeSeleccionada.mapa_url && (
                                            <li className="flex items-center gap-2">
                                                <ExternalLink size={18} className="text-blue-500" />
                                                <a href={sedeSeleccionada.mapa_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    Ver en Mapa
                                                </a>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Estado Actual</h3>
                                    <div className={`flex items-center gap-3 p-4 rounded-xl ${estaAbierto(sedeSeleccionada.id).abierto ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        <Clock size={24} />
                                        <div>
                                            <p className="font-bold">{estaAbierto(sedeSeleccionada.id).abierto ? 'ABIERTO AHORA' : 'CERRADO'}</p>
                                            <p className="text-sm">{estaAbierto(sedeSeleccionada.id).mensaje}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Servicios</h3>
                                <div className="flex flex-wrap gap-2">
                                    {sedeSeleccionada.servicios?.map((servicio, index) => (
                                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                                            <CheckCircle size={14} className="text-green-500" />
                                            {servicio}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSedeSeleccionada(null)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tienda;
