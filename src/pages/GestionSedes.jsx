import React, { useState, useContext } from 'react';
import { MapPin, Plus, Edit2, Trash2, Clock, Phone, Mail, Globe, Navigation, Image as ImageIcon, X, Save } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const GestionSedes = () => {
    const { sedes, agregarSede, editarSede, eliminarSede } = useContext(ContextoInventario);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [sedeEditando, setSedeEditando] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        nombre: '',
        direccion: '',
        descripcion: '',
        telefono: '',
        correo_contacto: '',
        hora_apertura: '08:00',
        hora_cierre: '18:00',
        mapa_url: '',
        imagen: ''
    });

    const abrirModal = (sede = null) => {
        if (sede) {
            setSedeEditando(sede);
            setFormData({
                id: sede.id,
                nombre: sede.nombre,
                direccion: sede.direccion || '',
                descripcion: sede.descripcion || '',
                telefono: sede.telefono || '',
                correo_contacto: sede.correo_contacto || '',
                hora_apertura: sede.hora_apertura || '08:00',
                hora_cierre: sede.hora_cierre || '18:00',
                mapa_url: sede.mapa_url || '',
                imagen: sede.imagen || ''
            });
        } else {
            setSedeEditando(null);
            setFormData({
                id: '',
                nombre: '',
                direccion: '',
                descripcion: '',
                telefono: '',
                correo_contacto: '',
                hora_apertura: '08:00',
                hora_cierre: '18:00',
                mapa_url: '',
                imagen: ''
            });
        }
        setModalAbierto(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.nombre) {
            alert("El ID y el nombre son obligatorios");
            return;
        }

        let exito;
        if (sedeEditando) {
            exito = await editarSede(sedeEditando.id, formData);
        } else {
            exito = await agregarSede(formData);
        }

        if (exito) {
            setModalAbierto(false);
            alert(`Sede ${sedeEditando ? 'actualizada' : 'creada'} con éxito`);
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <MapPin className="text-blue-600" /> Gestión de Ubicaciones
                    </h2>
                    <p className="text-gray-500 mt-1 text-lg">Administra las sedes y puntos de alquiler del sistema.</p>
                </div>
                <Boton onClick={() => abrirModal()} className="flex items-center gap-2 px-6 py-3 text-lg">
                    <Plus size={20} /> Nueva Sede
                </Boton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sedes.map((sede) => (
                    <div key={sede.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                        <div className="h-48 bg-gray-200 relative overflow-hidden">
                            {sede.imagen ? (
                                <img src={sede.imagen} alt={sede.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => abrirModal(sede)}
                                    className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm transition-all"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => eliminarSede(sede.id)}
                                    className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-red-600 hover:bg-red-600 hover:text-white shadow-sm transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <div className="absolute bottom-4 left-4">
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                    ID: {sede.id}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{sede.nombre}</h3>
                                <p className="text-gray-500 text-sm line-clamp-2">{sede.descripcion || 'Sin descripción disponible.'}</p>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Navigation size={14} className="text-blue-500" />
                                    <span className="truncate">{sede.direccion || 'No especificada'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-blue-500" />
                                    <span>{sede.hora_apertura} - {sede.hora_cierre}</span>
                                </div>
                                {sede.telefono && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-blue-500" />
                                        <span>{sede.telefono}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                titulo={sedeEditando ? "Editar Sede" : "Nueva Sede"}
                abierto={modalAbierto}
                alCerrar={() => setModalAbierto(false)}
                ancho="max-w-2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Identificador Único (ID)</label>
                            <input
                                disabled={!!sedeEditando}
                                className="w-full p-3 border rounded-2xl bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                                placeholder="ej: central"
                                value={formData.id}
                                onChange={e => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Nombre de la Sede</label>
                            <input
                                className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="ej: SummerRent Central"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Dirección Física</label>
                        <input
                            className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Av. Principal 123, Miraflores"
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Descripción / Info. Adicional</label>
                        <textarea
                            className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
                            placeholder="Breve descripción de la sede..."
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Teléfono</label>
                            <input
                                className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Email Contacto</label>
                            <input
                                className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                type="email"
                                value={formData.correo_contacto}
                                onChange={e => setFormData({ ...formData, correo_contacto: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Hora Apertura</label>
                            <input
                                type="time"
                                className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.hora_apertura}
                                onChange={e => setFormData({ ...formData, hora_apertura: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Hora Cierre</label>
                            <input
                                type="time"
                                className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                value={formData.hora_cierre}
                                onChange={e => setFormData({ ...formData, hora_cierre: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Imagen URL (Opcional)</label>
                        <input
                            className="w-full p-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                            value={formData.imagen}
                            onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Boton type="button" variante="secundario" className="flex-1 py-4" onClick={() => setModalAbierto(false)}>
                            Cancelar
                        </Boton>
                        <Boton type="submit" className="flex-1 py-4 flex items-center justify-center gap-2">
                            <Save size={20} /> {sedeEditando ? 'Guardar Cambios' : 'Crear Sede'}
                        </Boton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default GestionSedes;
