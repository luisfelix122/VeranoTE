import React, { useContext, useState } from 'react';
import { Plus, Trash2, Edit, RefreshCw, XCircle, Search } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const PanelAdmin = () => {
    const { inventario, agregarProducto, editarProducto, eliminarProducto, reactivarProducto, categorias, crearCategoria, eliminarCategoria, reactivarCategoria, sedeActual } = useContext(ContextoInventario);
    const [mostarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarCategorias, setMostrarCategorias] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEdicion, setIdEdicion] = useState(null);
    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: '',
        categoria: '',
        precioPorHora: '',
        stock: '',
        imagen: '',
        descripcion: ''
    });
    const [busqueda, setBusqueda] = useState('');
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [nuevaCategoriaDesc, setNuevaCategoriaDesc] = useState('');
    const [cargandoCat, setCargandoCat] = useState(false);

    const inventarioFiltrado = inventario.filter(prod =>
        prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

    const manejarSubmit = async (e) => {
        e.preventDefault();

        const productoProcesado = {
            ...nuevoProducto,
            precioPorHora: Number(nuevoProducto.precioPorHora),
            stock: Number(nuevoProducto.stock),
            descripcion: nuevoProducto.descripcion || ''
        };

        if (modoEdicion) {
            editarProducto(idEdicion, productoProcesado);
        } else {
            agregarProducto(productoProcesado);
        }

        cerrarModal();
    };

    const cargarDatosEdicion = (producto) => {
        setNuevoProducto(producto);
        setModoEdicion(true);
        setIdEdicion(producto.id);
        setMostrarFormulario(true);
    };

    const cerrarModal = () => {
        setMostrarFormulario(false);
        setModoEdicion(false);
        setIdEdicion(null);
        setNuevoProducto({
            nombre: '',
            categoria: '',
            precioPorHora: '',
            stock: '',
            imagen: '',
            descripcion: ''
        });
        setNuevaCategoria('');
        setNuevaCategoriaDesc('');
    };

    const manejarCrearCategoriaDirecto = async (e) => {
        e.preventDefault();
        if (!nuevaCategoria.trim()) return;

        setCargandoCat(true);
        const exito = await crearCategoria(nuevaCategoria, nuevaCategoriaDesc);
        if (exito) {
            setNuevaCategoria('');
            setNuevaCategoriaDesc('');
        }
        setCargandoCat(false);
    };

    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <h2 className="text-lg font-bold text-gray-900 border-r pr-4 border-gray-200">Inventario</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar equipo o categoría..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm shadow-black/5"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Boton onClick={() => setMostrarCategorias(true)} variante="secundario" className="shadow-sm">
                            Categorías
                        </Boton>
                        <Boton onClick={() => setMostrarFormulario(true)} variante="primario" className="flex-1 sm:flex-none shadow-lg shadow-blue-500/20">
                            <Plus size={18} /> Nuevo Producto
                        </Boton>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4">Precio/h</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventarioFiltrado.map(prod => (
                                <tr key={prod.id} className={`transition-all ${prod.activo === false ? 'bg-gray-50/50 opacity-60 grayscale-[0.5]' : 'hover:bg-gray-50'}`}>
                                    <td className="p-4 font-medium flex items-center gap-3">
                                        <div className="relative">
                                            <img src={prod.imagen} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                                            {prod.activo === false && (
                                                <div className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-0.5 shadow-sm">
                                                    <XCircle size={10} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{prod.nombre}</span>
                                            {prod.activo === false && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deshabilitado</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold uppercase tracking-tight">
                                            {prod.categoria}
                                        </span>
                                    </td>
                                    <td className="p-4 font-semibold text-gray-700">S/ {prod.precioPorHora}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{prod.stock}</span>
                                            <span className="text-[10px] text-gray-400">unidades</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => cargarDatosEdicion(prod)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>

                                            {prod.activo === false ? (
                                                <button
                                                    onClick={() => reactivarProducto(prod.id)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors group"
                                                    title="Reactivar Producto"
                                                >
                                                    <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => eliminarProducto(prod.id)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Deshabilitar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal titulo="Gestionar Categorías" abierto={mostrarCategorias} alCerrar={() => setMostrarCategorias(false)} zIndex={100}>
                <div className="space-y-6">
                    {/* Formulario de creación rápida */}
                    <form onSubmit={manejarCrearCategoriaDirecto} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nueva Categoría</h3>
                        <div className="space-y-2">
                            <input
                                placeholder="Nombre (ej: Motor, Playa)"
                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={nuevaCategoria}
                                onChange={e => setNuevaCategoria(e.target.value)}
                                required
                            />
                            <textarea
                                placeholder="Descripción opcional..."
                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows="2"
                                value={nuevaCategoriaDesc}
                                onChange={e => setNuevaCategoriaDesc(e.target.value)}
                            />
                            <Boton
                                type="submit"
                                className="w-full text-xs py-2 shadow-md shadow-blue-500/10"
                                disabled={cargandoCat}
                            >
                                {cargandoCat ? 'Guardando...' : 'Crear Categoría'}
                            </Boton>
                        </div>
                    </form>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Listado Global</h3>
                        <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar divide-y divide-gray-50">
                            {categorias.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No hay categorías registradas.</p>}
                            {categorias.map(cat => (
                                <div key={cat.id} className={`py-3 flex justify-between items-center transition-all ${cat.activo === false ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-700 text-sm">{cat.nombre}</span>
                                        <span className="text-[11px] text-gray-500 line-clamp-1">{cat.descripcion || 'Sin descripción'}</span>
                                        {cat.activo === false && <span className="text-[9px] font-black text-red-500 uppercase mt-0.5">Desactivada</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        {cat.activo === false ? (
                                            <button
                                                onClick={() => reactivarCategoria(cat.id)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Reactivar"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => eliminarCategoria(cat.id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Desactivar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                titulo={modoEdicion ? "📝 Editar Producto" : "✨ Agregar Nuevo Producto"}
                abierto={mostarFormulario}
                alCerrar={cerrarModal}
                ancho="max-w-2xl"
            >
                <form onSubmit={manejarSubmit} className="space-y-5 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nombre del Recurso</label>
                            <input
                                required
                                placeholder="Ej: Scooter Eléctrico Pro"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                value={nuevoProducto.nombre}
                                onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                            />
                        </div>

                        {/* Categoría */}
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoría</label>

                            <div className="relative">
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                    value={nuevoProducto.categoria}
                                    onChange={e => {
                                        if (e.target.value === 'ADD_NEW') {
                                            setMostrarCategorias(true);
                                            // Resetear el valor localmente para que no se quede seleccionada la opción de "crear"
                                            setNuevoProducto(prev => ({ ...prev, categoria: '' }));
                                        } else {
                                            setNuevoProducto({ ...nuevoProducto, categoria: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="">Seleccionar Categoría...</option>
                                    {categorias
                                        .filter(c => c.activo !== false || nuevoProducto.categoria === c.nombre)
                                        .map(cat => (
                                            <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                                        ))}
                                    <option value="ADD_NEW" className="font-bold text-blue-600 bg-blue-50">✨ + Gestionar / Crear Categorías...</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <Plus size={16} />
                                </div>
                            </div>
                        </div>

                        {/* URL Imagen */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Imagen (URL)</label>
                            <input
                                required
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                value={nuevoProducto.imagen}
                                onChange={e => setNuevoProducto({ ...nuevoProducto, imagen: e.target.value })}
                            />
                        </div>

                        {/* Precio y Stock */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Precio por Hora</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">S/</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                    value={nuevoProducto.precioPorHora}
                                    onChange={e => setNuevoProducto({ ...nuevoProducto, precioPorHora: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Stock Inicial</label>
                            <input
                                required
                                type="number"
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                value={nuevoProducto.stock}
                                onChange={e => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })}
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Descripción del Equipo</label>
                            <textarea
                                placeholder="Detalles técnicos, estado, recomendaciones..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
                                rows="3"
                                value={nuevoProducto.descripcion || ''}
                                onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Boton type="submit" className="w-full py-4 text-lg font-bold shadow-xl shadow-blue-500/20">
                            {modoEdicion ? "✨ Actualizar Producto" : "🚀 Guardar Producto"}
                        </Boton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PanelAdmin;
