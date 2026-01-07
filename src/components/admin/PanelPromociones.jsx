import React, { useState, useContext } from 'react';
import { Plus, Trash2, Tag, Clock, Package, ToggleLeft, ToggleRight, Pencil, Filter } from 'lucide-react';
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Tag size={20} className="text-blue-600" /> Promociones y Descuentos
                </h2>

                <div className="flex gap-4 w-full sm:w-auto items-center">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar promoción..."
                            className="w-full pl-4 pr-10 py-2 border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Tag size={16} />
                        </div>
                    </div>

                    <Boton onClick={() => setMostrarForm(true)} variante="primario" className="whitespace-nowrap">
                        <Plus size={18} /> Nueva Promoción
                    </Boton>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Descripción</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Beneficio</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {promocionesFiltradas.length > 0 ? (
                            promocionesFiltradas.map(promo => (
                                <tr key={promo.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium">{promo.nombre}</td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {promo.descripcion}
                                        {!promo.es_automatico && (
                                            <div className="mt-1">
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded border border-yellow-200 font-mono">
                                                    CUPÓN: {promo.codigo_cupon}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${promo.tipo === 'regla_tiempo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {promo.tipo === 'regla_tiempo' ? <Clock size={12} /> : <Package size={12} />}
                                            {promo.tipo === 'regla_tiempo' ? 'Por Tiempo' : 'Por Cantidad'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-green-600 font-bold">
                                        {promo.beneficio.tipo === 'porcentaje' ? `${promo.beneficio.valor}% OFF` : `- S/ ${promo.beneficio.valor}`}
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => togglePromocion(promo.id)} className={`text-2xl ${promo.activo ? 'text-green-500' : 'text-gray-300'}`}>
                                            {promo.activo ? <ToggleRight /> : <ToggleLeft />}
                                        </button>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => cargarDatosEdicion(promo)} className="text-blue-500 hover:text-blue-700">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => eliminarPromocion(promo.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">
                                    No se encontraron promociones con ese nombre.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal titulo={modoEdicion ? "Editar Promoción" : "Crear Nueva Promoción"} abierto={mostrarForm} alCerrar={cerrarModal}>
                <form onSubmit={manejarSubmit} className="space-y-4">
                    <input required placeholder="Nombre de la Promoción" className="w-full p-2 border rounded" value={nuevaPromo.nombre} onChange={e => setNuevaPromo({ ...nuevaPromo, nombre: e.target.value })} />


                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded border">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={nuevaPromo.es_automatico}
                                onChange={() => setNuevaPromo({ ...nuevaPromo, es_automatico: true, codigo_cupon: '' })}
                                className="text-blue-600"
                            />
                            <span className="text-sm">Automática</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={!nuevaPromo.es_automatico}
                                onChange={() => setNuevaPromo({ ...nuevaPromo, es_automatico: false })}
                                className="text-blue-600"
                            />
                            <span className="text-sm">Requiere Cupón</span>
                        </label>
                    </div>

                    {!nuevaPromo.es_automatico && (
                        <input
                            required
                            placeholder="Código del Cupón (Ej: VERANO2026)"
                            className="w-full p-2 border rounded font-mono uppercase bg-yellow-50"
                            value={nuevaPromo.codigo_cupon}
                            onChange={e => setNuevaPromo({ ...nuevaPromo, codigo_cupon: e.target.value.toUpperCase() })}
                        />
                    )}

                    <input required placeholder="Descripción (Visible al cliente)" className="w-full p-2 border rounded" value={nuevaPromo.descripcion} onChange={e => setNuevaPromo({ ...nuevaPromo, descripcion: e.target.value })} />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Regla</label>
                            <select className="w-full p-2 border rounded" value={nuevaPromo.tipo} onChange={e => setNuevaPromo({ ...nuevaPromo, tipo: e.target.value })}>
                                <option value="regla_tiempo">Por Tiempo (Horas)</option>
                                <option value="regla_cantidad">Por Cantidad (Items)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Valor del Descuento (%)</label>
                            <input required type="number" className="w-full p-2 border rounded" value={nuevaPromo.beneficio.valor} onChange={e => setNuevaPromo({ ...nuevaPromo, beneficio: { ...nuevaPromo.beneficio, valor: Number(e.target.value) } })} />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
                            <Filter size={14} /> Aplicar a:
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Por Categoría</label>
                                <select
                                    className="w-full p-2 border rounded text-xs bg-white"
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
                            <div>
                                <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Recurso Específico</label>
                                <select
                                    className="w-full p-2 border rounded text-xs bg-white"
                                    value={nuevaPromo.condicion.recurso_id || ''}
                                    onChange={e => setNuevaPromo({
                                        ...nuevaPromo,
                                        condicion: { ...nuevaPromo.condicion, recurso_id: e.target.value, categoria_id: '' }
                                    })}
                                >
                                    <option value="">Cualquier Recurso</option>
                                    {inventarioCompleto.map(prod => (
                                        <option key={prod.id} value={prod.id}>{prod.nombre} ({prod.sede_id})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-[10px] text-blue-600 italic">Si selecciona un recurso, la categoría se ignorará.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {nuevaPromo.tipo === 'regla_tiempo' ? (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Mínimo de Horas</label>
                                <input required type="number" className="w-full p-2 border rounded" value={nuevaPromo.condicion.minHoras} onChange={e => setNuevaPromo({ ...nuevaPromo, condicion: { ...nuevaPromo.condicion, minHoras: Number(e.target.value) } })} />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad Mínima</label>
                                <input required type="number" className="w-full p-2 border rounded" value={nuevaPromo.condicion.minCantidad} onChange={e => setNuevaPromo({ ...nuevaPromo, condicion: { ...nuevaPromo.condicion, minCantidad: Number(e.target.value) } })} />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Valor Descuento (%)</label>
                            <input required type="number" className="w-full p-2 border rounded" value={nuevaPromo.beneficio.valor} onChange={e => setNuevaPromo({ ...nuevaPromo, beneficio: { ...nuevaPromo.beneficio, valor: Number(e.target.value) } })} />
                        </div>
                    </div>

                    <Boton type="submit" className="w-full">
                        {modoEdicion ? "Guardar Cambios" : "Crear Promoción"}
                    </Boton>
                </form>
            </Modal>
        </div>
    );
};

export default PanelPromociones;
