import React, { useContext, useState } from 'react';
import { Plus, Trash2, Edit, RefreshCw, XCircle, Search } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const PanelAdmin = () => {
    const { inventario, agregarProducto, editarProducto, eliminarProducto, reactivarProducto } = useContext(ContextoInventario);
    const [mostarFormulario, setMostrarFormulario] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEdicion, setIdEdicion] = useState(null);
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', categoria: '', precioPorHora: '', stock: '', imagen: '' });
    const [busqueda, setBusqueda] = useState('');

    const inventarioFiltrado = inventario.filter(prod =>
        prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

    const manejarSubmit = (e) => {
        e.preventDefault();
        const productoProcesado = {
            ...nuevoProducto,
            precioPorHora: Number(nuevoProducto.precioPorHora),
            stock: Number(nuevoProducto.stock)
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
        setNuevoProducto({ nombre: '', categoria: '', precioPorHora: '', stock: '', imagen: '' });
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
                    <Boton onClick={() => setMostrarFormulario(true)} variante="primario" className="w-full sm:w-auto shadow-lg shadow-blue-500/20"><Plus size={18} /> Nuevo Producto</Boton>
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
            <Modal titulo={modoEdicion ? "Editar Producto" : "Agregar Nuevo Producto"} abierto={mostarFormulario} alCerrar={cerrarModal}>
                <form onSubmit={manejarSubmit} className="space-y-4">
                    <input required placeholder="Nombre" className="w-full p-2 border rounded" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} />
                    <input required placeholder="Categoría" className="w-full p-2 border rounded" value={nuevoProducto.categoria} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <input required type="number" placeholder="Precio/Hora" className="w-full p-2 border rounded" value={nuevoProducto.precioPorHora} onChange={e => setNuevoProducto({ ...nuevoProducto, precioPorHora: e.target.value })} />
                        <input required type="number" placeholder="Stock Inicial" className="w-full p-2 border rounded" value={nuevoProducto.stock} onChange={e => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })} />
                    </div>
                    <input required placeholder="URL Imagen" className="w-full p-2 border rounded" value={nuevoProducto.imagen} onChange={e => setNuevoProducto({ ...nuevoProducto, imagen: e.target.value })} />
                    <Boton type="submit" className="w-full">{modoEdicion ? "Actualizar Producto" : "Guardar Producto"}</Boton>
                </form>
            </Modal>
        </div>
    );
};

export default PanelAdmin;
