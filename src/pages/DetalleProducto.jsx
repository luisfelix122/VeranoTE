import React, { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { ContextoCarrito } from '../contexts/ContextoCarrito';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { usarUI } from '../contexts/ContextoUI';
import Boton from '../components/ui/Boton';

const DetalleProducto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { agregarAlCarrito } = useContext(ContextoCarrito);
    const { inventario, calcularStockDisponible } = useContext(ContextoInventario);
    const { setMostrarLogin } = usarUI();
    const [horas, setHoras] = useState(1);
    const [cantidad, setCantidad] = useState(1);
    const { fechaSeleccionada, setFechaSeleccionada } = useContext(ContextoInventario); // Usar fecha global del contexto

    const { usuario } = useContext(ContextoAutenticacion);

    const producto = inventario.find(p => String(p.id) === id);
    const stockDisponible = producto ? calcularStockDisponible(producto.id) : 0;

    if (!producto) {
        return (
            <div className="px-4 sm:px-6 lg:px-8 py-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Producto no encontrado</h2>
                <Boton onClick={() => navigate('/')}>Volver a la tienda</Boton>
            </div>
        );
    }

    const manejarAgregarAlCarrito = () => {
        if (!usuario) {
            setMostrarLogin(true);
            return;
        }

        // Validación de Licencia
        if (producto.requiereLicencia && !usuario.licenciaConducir) {
            alert('Este vehículo requiere una Licencia de Conducir vigente. Por favor, actualice su perfil.');
            navigate('/perfil');
            return;
        }

        agregarAlCarrito(producto, horas, cantidad);
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
                    <div className="rounded-xl overflow-hidden h-64 md:h-96"><img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" /></div>
                    <div className="flex flex-col justify-between">
                        <div>
                            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1">← Volver</button>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{producto.nombre}</h1>
                            <div className="bg-gray-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                                <span className="text-gray-600">Precio por hora</span><span className="text-2xl font-bold text-blue-600">S/ {producto.precioPorHora}</span>
                            </div>
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Descripción</h3>
                                <p className="text-gray-600 leading-relaxed">{producto.descripcion || 'Sin descripción disponible.'}</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Reserva</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                                    value={fechaSeleccionada}
                                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="flex gap-8 mb-6">
                                <div className="flex flex-col gap-2">
                                    <span className="text-gray-700 font-medium">Horas:</span>
                                    <div className="flex items-center border border-gray-300 rounded-lg">
                                        <button onClick={() => setHoras(Math.max(1, horas - 1))} className="px-3 py-2 hover:bg-gray-100"><Minus size={16} /></button>
                                        <span className="px-3 font-medium w-12 text-center">{horas}h</span>
                                        <button onClick={() => setHoras(horas + 1)} className="px-3 py-2 hover:bg-gray-100"><Plus size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-gray-700 font-medium">Cantidad:</span>
                                    <div className="flex items-center border border-gray-300 rounded-lg">
                                        <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="px-3 py-2 hover:bg-gray-100"><Minus size={16} /></button>
                                        <span className="px-3 font-medium w-12 text-center">{cantidad}</span>
                                        <button onClick={() => setCantidad(Math.min(stockDisponible, cantidad + 1))} className={`px-3 py-2 hover:bg-gray-100 ${cantidad >= stockDisponible ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={cantidad >= stockDisponible}><Plus size={16} /></button>
                                    </div>
                                    <span className="text-xs text-gray-500">Max: {stockDisponible}</span>
                                </div>
                            </div>

                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1"><p className="text-sm text-gray-500">Total estimado</p><p className="text-2xl font-bold text-gray-900">S/ {producto.precioPorHora * horas * cantidad}</p></div>
                            <Boton className="flex-1" onClick={manejarAgregarAlCarrito}>Agregar al Carrito</Boton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetalleProducto;
