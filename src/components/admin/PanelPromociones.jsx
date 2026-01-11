import React, { useState, useContext } from 'react';
import { Plus, Trash2, Tag, Clock, Package, ToggleLeft, ToggleRight, Pencil, Filter, X, Zap, Ticket } from 'lucide-react';
import { ContextoPromociones } from '../../contexts/ContextoPromociones';
import { ContextoInventario } from '../../contexts/ContextoInventario';
import Boton from '../ui/Boton';
import Modal from '../ui/Modal';

const PanelPromociones = () => {
    const { promociones, agregarPromocion, togglePromocion, eliminarPromocion, editarPromocion } = useContext(ContextoPromociones);
    const { categorias, inventarioCompleto } = useContext(ContextoInventario);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [idEdicion, setIdEdicion] = useState(null);

    const [nuevaPromo, setNuevaPromo] = useState({
        nombre: '',
        descripcion: '',
        tipo: 'regla_tiempo', // regla_tiempo, regla_cantidad
        condicion: { minHoras: 3, minCantidad: 3, categoria_id: '', recurso_id: '' },
        beneficio: { tipo: 'porcentaje', valor: 10 },
        activo: true,
        es_automatico: true,
        codigo_cupon: ''
    });

    const manejarSubmit = (e) => {
        e.preventDefault();
        if (modoEdicion) {
            editarPromocion(idEdicion, nuevaPromo);
        } else {
            agregarPromocion(nuevaPromo);
        }
        cerrarModal();
    };

    const cerrarModal = () => {
        setMostrarForm(false);
        setModoEdicion(false);
        setIdEdicion(null);
        setNuevaPromo({
            nombre: '',
            descripcion: '',
            tipo: 'regla_tiempo',
            condicion: { minHoras: 3, minCantidad: 3, categoria_id: '', recurso_id: '' },
            beneficio: { tipo: 'porcentaje', valor: 10 },
            activo: true,
            es_automatico: true,
            codigo_cupon: ''
        });
    };

    const cargarDatosEdicion = (promo) => {
        setNuevaPromo(promo);
        setModoEdicion(true);
        setIdEdicion(promo.id);
        setMostrarForm(true);
    };

    const promocionesFiltradas = promociones.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header de Gestión */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Tag size={24} /></div>
                        Centro de Ofertas y Cupones
                    </h2>
                    <p className="text-sm text-gray-500 font-medium ml-12">Configura reglas dinámicas de precios y fidelización</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 min-w-[240px]">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar promociones..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <Boton onClick={() => setMostrarForm(true)} className="flex items-center gap-2 px-6 shadow-lg shadow-purple-100 bg-purple-600 hover:bg-purple-700">
                        <Plus size={18} /> Crear Nueva Regla
                    </Boton>
                </div>
            </div>

            {/* Listado de Promociones */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {promocionesFiltradas.length > 0 ? (
                    promocionesFiltradas.map(promo => (
                        <div key={promo.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group relative overflow-hidden">
                            {!promo.activo && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center font-bold text-gray-400 uppercase tracking-widest text-xs">Pausada</div>}

                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${promo.es_automatico ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {promo.es_automatico ? <Zap size={20} /> : <Ticket size={20} />}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => cargarDatosEdicion(promo)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={16} /></button>
                                    <button onClick={() => eliminarPromocion(promo.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{promo.nombre}</h3>
                            <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2 h-8">{promo.descripcion}</p>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Beneficio</span>
                                    <span className="text-xl font-black text-green-600">{promo.beneficio.valor}% OFF</span>
                                </div>
                                <button onClick={() => togglePromocion(promo.id)} className={`p-1.5 rounded-full transition-all ${promo.activo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {promo.activo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <Clock size={12} /> {promo.tipo === 'regla_tiempo' ? `Min. ${promo.condicion.minHoras} Horas` : `Min. ${promo.condicion.minCantidad} Unidades`}
                            </div>

                            {!promo.es_automatico && (
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Cupón Requerido:</span>
                                    <span className="font-mono bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-black">{promo.codigo_cupon}</span>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                        <Tag size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-400 font-medium">No se encontraron campañas activas para este criterio.</p>
                    </div>
                )}
            </div>

            {/* Modal de Creación/Edición Estilo Premium de la Foto */}
            {mostrarForm && (
                <Modal
                    titulo={modoEdicion ? "📝 Editar Promoción" : "✨ Crear Nueva Promoción"}
                    abierto={mostrarForm}
                    alCerrar={cerrarModal}
                    ancho="max-w-lg"
                >
                    <form onSubmit={manejarSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <input
                                required
                                placeholder="Nombre de la Promoción"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 font-medium"
                                value={nuevaPromo.nombre}
                                onChange={e => setNuevaPromo({ ...nuevaPromo, nombre: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setNuevaPromo({ ...nuevaPromo, es_automatico: true, codigo_cupon: '' })}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold
                                ${nuevaPromo.es_automatico ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${nuevaPromo.es_automatico ? 'border-purple-600' : 'border-gray-300'}`}>
                                    {nuevaPromo.es_automatico && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
                                </div>
                                Automática
                            </button>
                            <button
                                type="button"
                                onClick={() => setNuevaPromo({ ...nuevaPromo, es_automatico: false })}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-xs font-bold
                                ${!nuevaPromo.es_automatico ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!nuevaPromo.es_automatico ? 'border-purple-600' : 'border-gray-300'}`}>
                                    {!nuevaPromo.es_automatico && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
                                </div>
                                Requiere Cupón
                            </button>
                        </div>

                        {!nuevaPromo.es_automatico && (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <label className="text-[10px] font-black text-amber-600 uppercase mb-1 ml-1 tracking-widest">Código de Activación</label>
                                <input
                                    required
                                    placeholder="EJ: VERANO2026"
                                    className="w-full px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono uppercase text-amber-800 placeholder:text-amber-200"
                                    value={nuevaPromo.codigo_cupon}
                                    onChange={e => setNuevaPromo({ ...nuevaPromo, codigo_cupon: e.target.value.toUpperCase() })}
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <input
                                required
                                placeholder="Descripción (Visible al cliente)"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 text-sm"
                                value={nuevaPromo.descripcion}
                                onChange={e => setNuevaPromo({ ...nuevaPromo, descripcion: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de Regla</label>
                                <select
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-sm font-medium"
                                    value={nuevaPromo.tipo}
                                    onChange={e => setNuevaPromo({ ...nuevaPromo, tipo: e.target.value })}
                                >
                                    <option value="regla_tiempo">Por Tiempo (Horas)</option>
                                    <option value="regla_cantidad">Por Cantidad (Items)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Descuento Global (%)</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-600"
                                    value={nuevaPromo.beneficio.valor}
                                    onChange={e => setNuevaPromo({ ...nuevaPromo, beneficio: { ...nuevaPromo.beneficio, valor: Number(e.target.value) } })}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 space-y-4">
                            <div className="flex items-center gap-2 text-blue-800 font-black text-[11px] uppercase tracking-wider">
                                <Filter size={14} /> Aplicar a:
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Por Categoría</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-gray-600 cursor-pointer"
                                        value={nuevaPromo.condicion.categoria_id || ''}
                                        onChange={e => setNuevaPromo({
                                            ...nuevaPromo,
                                            condicion: { ...nuevaPromo.condicion, categoria_id: e.target.value, recurso_id: '' }
                                        })}
                                    >
                                        <option value="">Todas las Categorías</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Recurso Específico</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-gray-600 cursor-pointer"
                                        value={nuevaPromo.condicion.recurso_id || ''}
                                        onChange={e => setNuevaPromo({
                                            ...nuevaPromo,
                                            condicion: { ...nuevaPromo.condicion, recurso_id: e.target.value, categoria_id: '' }
                                        })}
                                    >
                                        <option value="">Cualquier Recurso</option>
                                        {inventarioCompleto.map(prod => (
                                            <option key={prod.id} value={prod.id}>{prod.nombre.substring(0, 20)}...</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <p className="text-[10px] text-blue-500 font-medium italic text-center">Si selecciona un recurso, la categoría se ignorará automáticamente.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                                    {nuevaPromo.tipo === 'regla_tiempo' ? 'Mínimo de Horas' : 'Cantidad Mínima'}
                                </label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                                    value={nuevaPromo.tipo === 'regla_tiempo' ? nuevaPromo.condicion.minHoras : nuevaPromo.condicion.minCantidad}
                                    onChange={e => setNuevaPromo({
                                        ...nuevaPromo,
                                        condicion: {
                                            ...nuevaPromo.condicion,
                                            [nuevaPromo.tipo === 'regla_tiempo' ? 'minHoras' : 'minCantidad']: Number(e.target.value)
                                        }
                                    })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Valor Descuento (%)</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-600"
                                    value={nuevaPromo.beneficio.valor}
                                    onChange={e => setNuevaPromo({ ...nuevaPromo, beneficio: { ...nuevaPromo.beneficio, valor: Number(e.target.value) } })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase tracking-widest text-sm"
                        >
                            {modoEdicion ? "Guardar Cambios" : "Crear Promoción"}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const SearchIcon = ({ className, size }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

export default PanelPromociones;
