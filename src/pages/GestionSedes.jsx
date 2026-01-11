import React, { useState, useContext } from 'react';
import { MapPin, Plus, Edit2, Trash2, Clock, Phone, Mail, Globe, Navigation, Image as ImageIcon, X, Save, Shield, Info, ExternalLink } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const GestionSedes = () => {
    const { sedes, agregarSede, editarSede, eliminarSede, servicios } = useContext(ContextoInventario);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [sedeEditando, setSedeEditando] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        slug: '',
        direccion: '',
        descripcion: '',
        telefono: '',
        email_contacto: '',
        hora_apertura: '08:00',
        hora_cierre: '18:00',
        mapa_url: '',
        imagen: '',
        serviciosIds: []
    });

    const abrirModal = (sede = null) => {
        if (sede) {
            setSedeEditando(sede);
            setFormData({
                nombre: sede.nombre || '',
                slug: sede.slug || '',
                direccion: sede.direccion || '',
                descripcion: sede.descripcion || '',
                telefono: sede.telefono || '',
                email_contacto: sede.email_contacto || '',
                hora_apertura: sede.hora_apertura ? sede.hora_apertura.substring(0, 5) : '08:00',
                hora_cierre: sede.hora_cierre ? sede.hora_cierre.substring(0, 5) : '18:00',
                mapa_url: sede.mapa_url || '',
                imagen: sede.imagen || '',
                serviciosIds: sede.serviciosIds || []
            });
        } else {
            setSedeEditando(null);
            setFormData({
                nombre: '',
                slug: '',
                direccion: '',
                descripcion: '',
                telefono: '',
                email_contacto: '',
                hora_apertura: '08:00',
                hora_cierre: '18:00',
                mapa_url: '',
                imagen: '',
                serviciosIds: []
            });
        }
        setModalAbierto(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre || !formData.slug) {
            alert("⚠️ El Nombre y el Identificador Único son obligatorios.");
            return;
        }

        try {
            let exito;
            if (sedeEditando) {
                exito = await editarSede(sedeEditando.id, formData);
            } else {
                exito = await agregarSede(formData);
            }

            if (exito) {
                setModalAbierto(false);
                alert(`✅ Sede ${sedeEditando ? 'actualizada' : 'registrada'} correctamente.`);
            }
        } catch (error) {
            console.error("Error al procesar sede:", error);
            alert("❌ Ocurrió un error al guardar los datos.");
        }
    };

    const toggleServicio = (id) => {
        setFormData(prev => ({
            ...prev,
            serviciosIds: prev.serviciosIds.includes(id)
                ? prev.serviciosIds.filter(sid => sid !== id)
                : [...prev.serviciosIds, id]
        }));
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-10 space-y-10 bg-[#f8fafc] min-h-screen">
            {/* Header Moderno con Gradiente Sutil */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl shadow-inner">
                        <MapPin size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Red de Sucursales</h2>
                        <p className="text-gray-500 font-medium">Gestiona las locaciones estratégicas de Verano Rental</p>
                    </div>
                </div>
                <Boton onClick={() => abrirModal()} className="flex items-center gap-3 px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 group">
                    <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" /> Nueva Sede
                </Boton>
            </div>

            {/* Grid de Sedes con Estilo Premium */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {sedes.map((sede) => (
                    <div key={sede.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                        <div className="h-64 bg-gray-100 relative overflow-hidden">
                            {sede.imagen ? (
                                <img src={sede.imagen} alt={sede.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                                    <ImageIcon size={64} strokeWidth={1} />
                                    <span className="text-xs font-bold uppercase tracking-widest mt-2">Sin Imagen</span>
                                </div>
                            )}

                            {/* Overlay de Acciones */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="absolute top-6 right-6 flex gap-3 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                <button
                                    onClick={() => abrirModal(sede)}
                                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white shadow-lg transition-all"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => eliminarSede(sede.id)}
                                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-red-500 hover:bg-red-500 hover:text-white shadow-lg transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="absolute bottom-6 left-6">
                                <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                                    {sede.slug || 'Sede'}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{sede.nombre}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 italic">
                                    "{sede.descripcion || 'Estratégicamente ubicada para brindarte la mejor experiencia de verano.'}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Navigation size={16} /></div>
                                    <span className="font-medium truncate">{sede.direccion || 'Ubicación Premium'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Clock size={16} /></div>
                                    <span className="font-bold">{sede.hora_apertura} - {sede.hora_cierre}</span>
                                </div>

                                {sede.serviciosNombres && sede.serviciosNombres.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {sede.serviciosNombres.map((serv, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md border border-blue-100/50">
                                                {serv}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {(sede.telefono || sede.email_contacto) && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                                        {sede.telefono && (
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                <Phone size={12} /> {sede.telefono}
                                            </div>
                                        )}
                                        {sede.email_contacto && (
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                <Mail size={12} /> Email
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Sede Estilo Premium (Match con la Foto) */}
            <Modal
                titulo={sedeEditando ? "📝 Editar Sede Existente" : "🏢 Nueva Sede Estratégica"}
                abierto={modalAbierto}
                alCerrar={() => setModalAbierto(false)}
                ancho="max-w-2xl px-2"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-2">
                    {/* Sección Identificadores */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Identificador Único (SLUG)</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm lowercase"
                                    placeholder="ej: central"
                                    value={formData.slug}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                            <input
                                required
                                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-800"
                                placeholder="ej: SummerRent Central"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Física Completa</label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input
                                required
                                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Av. Principal 123, Miraflores"
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción / Info. Adicional</label>
                        <div className="relative">
                            <textarea
                                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-28 resize-none text-sm leading-relaxed"
                                placeholder="Escribe una breve reseña sobre la ubicación y sus servicios..."
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                            <div className="absolute right-4 bottom-4 p-2 bg-gray-50 rounded-xl">
                                <Info size={14} className="text-gray-300" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            🛠️ Servicios Disponibles (3NF)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100/50">
                            {servicios.map(serv => (
                                <button
                                    key={serv.id}
                                    type="button"
                                    onClick={() => toggleServicio(serv.id)}
                                    className={`flex items-center gap-2 p-2.5 rounded-2xl transition-all border ${formData.serviciosIds.includes(serv.id)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                                        }`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData.serviciosIds.includes(serv.id) ? 'border-white' : 'border-gray-200'
                                        }`}>
                                        {formData.serviciosIds.includes(serv.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[10px] font-bold truncate">{serv.nombre}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contacto */}
                    <div className="grid grid-cols-2 gap-5 p-5 bg-blue-50/30 rounded-3xl border border-blue-50">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest ml-1">Teléfono Directo</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                <input
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                    placeholder="+51 987..."
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest ml-1">Email de Operaciones</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                <input
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                    type="email"
                                    placeholder="sede@ejemplo.com"
                                    value={formData.email_contacto}
                                    onChange={e => setFormData({ ...formData, email_contacto: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Horarios */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Clock size={12} /> Hora de Apertura
                            </label>
                            <input
                                type="time"
                                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                                value={formData.hora_apertura}
                                onChange={e => setFormData({ ...formData, hora_apertura: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Clock size={12} /> Hora de Cierre
                            </label>
                            <input
                                type="time"
                                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                                value={formData.hora_cierre}
                                onChange={e => setFormData({ ...formData, hora_cierre: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ImageIcon size={12} /> URL de Imagen de Portada (Opcional)
                        </label>
                        <div className="relative">
                            <input
                                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-blue-600 truncate underline decoration-blue-200"
                                placeholder="https://ejemplo.com/imagen.jpg"
                                value={formData.imagen}
                                onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                            />
                            {formData.imagen && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <ExternalLink size={16} className="text-gray-300" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botonera con Estilo de la Foto */}
                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-3xl transition-all uppercase tracking-[0.15em] text-xs shadow-inner"
                            onClick={() => setModalAbierto(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs group"
                        >
                            <Save size={18} className="group-hover:scale-110 transition-transform" />
                            {sedeEditando ? 'Actualizar Sede' : 'Crear Sede'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default GestionSedes;
