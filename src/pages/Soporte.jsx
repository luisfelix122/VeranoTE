import React, { useState, useContext, useEffect } from 'react';
import { Phone, Shield, FileText, AlertTriangle, LifeBuoy, ChevronDown, ChevronUp, Mail, Info, Search } from 'lucide-react';
import Boton from '../components/ui/Boton';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { obtenerGuiasSeguridad } from '../services/db';

const Soporte = () => {
    const [seccionActiva, setSeccionActiva] = useState('contacto'); // 'contacto', 'seguridad', 'emergencia'
    const { crearTicket } = useContext(ContextoSoporte);
    const { usuario } = useContext(ContextoAutenticacion);
    const { sedes } = useContext(ContextoInventario);

    const [formulario, setFormulario] = useState({
        asunto: 'Reporte de Incidente',
        mensaje: '',
        sede: ''
    });

    const [guiasSeguridad, setGuiasSeguridad] = useState([]);
    const [cargandoGuias, setCargandoGuias] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const cargarGuias = async () => {
            const guias = await obtenerGuiasSeguridad();
            setGuiasSeguridad(guias);
            setCargandoGuias(false);
        };
        cargarGuias();
    }, []);

    // Pre-seleccionar primera sede
    useEffect(() => {
        if (sedes && sedes.length > 0 && !formulario.sede) {
            setFormulario(prev => ({ ...prev, sede: sedes[0].nombre }));
        }
    }, [sedes]);

    const manejarEnvio = (e) => {
        e.preventDefault();

        // Etiquetar asunto con la Sede
        const asuntoConSede = `[Sede: ${formulario.sede || 'General'}] ${formulario.asunto}`;

        crearTicket({
            asunto: asuntoConSede,
            mensaje: formulario.mensaje,
            remitente: {
                id: usuario?.id,
                nombre: usuario?.nombre || 'Usuario',
                rol: usuario?.rol || 'cliente'
            },
            destinatario: { rol: 'admin' }
        });
        alert('Mensaje enviado. Nos contactaremos contigo a la brevedad.');
        setFormulario(prev => ({ ...prev, asunto: 'Reporte de Incidente', mensaje: '' }));
    };

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
                    <Mail size={18} />
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
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                            <Phone className="text-blue-600" />
                            Envíanos un Mensaje
                        </h2>
                        <form className="space-y-5" onSubmit={manejarEnvio}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sede / Zona</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formulario.sede}
                                        onChange={(e) => setFormulario({ ...formulario, sede: e.target.value })}
                                    >
                                        {sedes.map(s => (
                                            <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                        ))}
                                        <option value="General">Otra / General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formulario.asunto}
                                        onChange={(e) => setFormulario({ ...formulario, asunto: e.target.value })}
                                    >
                                        <option>Reporte de Incidente</option>
                                        <option>Problema con Reserva</option>
                                        <option>Consulta General</option>
                                        <option>Sugerencia</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Describe detalladamente tu consulta o situación..."
                                    required
                                    value={formulario.mensaje}
                                    onChange={(e) => setFormulario({ ...formulario, mensaje: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex justify-end">
                                <Boton type="submit" className="w-full sm:w-auto">Enviar Mensaje</Boton>
                            </div>
                        </form>
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
                        <div className="bg-red-50 border border-red-100 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-red-100 p-4 rounded-full mb-4 text-red-600 shadow-sm">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="font-bold text-red-900 text-lg mb-1">Bomberos</h3>
                            <p className="text-4xl font-black text-red-600 mb-3 tracking-tight">116</p>
                            <p className="text-sm text-red-700 font-medium">Emergencias médicas y rescate</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-blue-100 p-4 rounded-full mb-4 text-blue-600 shadow-sm">
                                <Shield size={40} />
                            </div>
                            <h3 className="font-bold text-blue-900 text-lg mb-1">Policía Nacional</h3>
                            <p className="text-4xl font-black text-blue-600 mb-3 tracking-tight">105</p>
                            <p className="text-sm text-blue-700 font-medium">Seguridad y denuncias</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-orange-100 p-4 rounded-full mb-4 text-orange-600 shadow-sm">
                                <LifeBuoy size={40} />
                            </div>
                            <h3 className="font-bold text-orange-900 text-lg mb-1">Salvavidas</h3>
                            <p className="text-4xl font-black text-orange-600 mb-3 tracking-tight">106</p>
                            <p className="text-sm text-orange-700 font-medium">Rescate en mar y playa</p>
                        </div>
                        <div className="bg-white border border-red-200 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-red-50 p-4 rounded-full mb-4 text-red-500 shadow-sm">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Cruz Roja</h3>
                            <p className="text-4xl font-black text-red-500 mb-3 tracking-tight">115</p>
                            <p className="text-sm text-gray-600 font-medium">Ayuda humanitaria y socorro</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-indigo-100 p-4 rounded-full mb-4 text-indigo-600 shadow-sm">
                                <Shield size={40} />
                            </div>
                            <h3 className="font-bold text-indigo-900 text-lg mb-1">Serenazgo</h3>
                            <p className="text-4xl font-black text-indigo-600 mb-3 tracking-tight">(01) 555-1234</p>
                            <p className="text-sm text-indigo-700 font-medium">Seguridad ciudadana local</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-8 rounded-xl flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="bg-green-100 p-4 rounded-full mb-4 text-green-600 shadow-sm">
                                <Phone size={40} />
                            </div>
                            <h3 className="font-bold text-green-900 text-lg mb-1">Soporte SummerRent</h3>
                            <p className="text-3xl font-black text-green-600 mb-3 tracking-tight">(01) 555-0123</p>
                            <p className="text-sm text-green-700 font-medium">Asistencia técnica y reservas</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Soporte;
