import React, { useContext, useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const PanelAdmin = () => {
    const { inventario, agregarProducto, editarProducto, eliminarProducto } = useContext(ContextoInventario);
    const [mostarFormulario, setMostrarFormulario] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEdicion, setIdEdicion] = useState(null);
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', categoria: '', precioPorHora: '', stock: '', imagen: '' });

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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Inventario</h2>
                    <Boton onClick={() => setMostrarFormulario(true)} variante="primario"><Plus size={18} /> Nuevo Producto</Boton>
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
                            {inventario.map(prod => (
                                <tr key={prod.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium">{prod.nombre}</td>
                                    <td className="p-4 text-sm text-gray-600">{prod.categoria}</td>
                                    <td className="p-4">S/ {prod.precioPorHora}</td>
                                    <td className="p-4">{prod.stock}</td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => cargarDatosEdicion(prod)} className="text-blue-500 hover:text-blue-700">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => eliminarProducto(prod.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={18} />
                                        </button>
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
