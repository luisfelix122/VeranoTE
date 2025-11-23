import React, { useState, useContext } from 'react';
import { CreditCard, UserPlus, Search, X, Clock, Calendar } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const PuntoVenta = () => {
    const { inventario, registrarAlquiler } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const [carritoVenta, setCarritoVenta] = useState([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Estado para modal de configuración de alquiler
    const [productoAAnadir, setProductoAAnadir] = useState(null);
    const [configuracionAlquiler, setConfiguracionAlquiler] = useState({
        horas: 1,
        fechaInicio: new Date().toISOString().slice(0, 16) // Formato datetime-local
    });

    // Nuevos estados para pagos
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [tipoComprobante, setTipoComprobante] = useState('boleta');
    const [datosFactura, setDatosFactura] = useState({ ruc: '', razonSocial: '', direccion: '' });

    const abrirModalProducto = (producto) => {
        setProductoAAnadir(producto);
        setConfiguracionAlquiler({
            horas: 1,
            fechaInicio: new Date().toISOString().slice(0, 16)
        });
    };

    const confirmarAgregarProducto = () => {
        if (!productoAAnadir) return;

        const nuevoItem = {
            ...productoAAnadir,
            cantidad: 1,
            horas: Number(configuracionAlquiler.horas),
            fechaInicio: new Date(configuracionAlquiler.fechaInicio)
        };

        setCarritoVenta(prev => {
            // En POS permitimos agregar el mismo producto como líneas separadas si tienen diferentes configuraciones
            // O simplificamos sumando si es idéntico (aquí asumimos líneas separadas para flexibilidad de horas)
            return [...prev, { ...nuevoItem, idTemp: Date.now() }];
        });

        setProductoAAnadir(null);
    };

    const totalVenta = carritoVenta.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);
    const garantiaVenta = totalVenta * 0.20;
    const totalFinalVenta = totalVenta + garantiaVenta;

    const procesarVenta = () => {
        if (carritoVenta.length === 0) return alert('Carrito vacío');
        if (!clienteNombre.trim()) return alert('Ingrese nombre del cliente');

        if (tipoComprobante === 'factura' && (!datosFactura.ruc || !datosFactura.razonSocial)) {
            return alert("Por favor complete los datos de facturación (RUC y Razón Social)");
        }

        const nuevoAlquiler = {
            id: crypto.randomUUID(),
            cliente: clienteNombre,
            clienteId: 'GUEST-' + Date.now(),
            vendedorId: usuario ? usuario.nombre : 'POS-LOCAL', // Usar nombre real del vendedor
            items: carritoVenta,
            total: totalVenta,
            garantia: garantiaVenta,
            totalFinal: totalFinalVenta,
            montoPagado: totalFinalVenta,
            saldoPendiente: 0,
            fechaInicio: new Date(), // Fecha de registro de la venta
            tipoReserva: 'inmediata',
            metodoPago,
            tipoComprobante,
            datosFactura: tipoComprobante === 'factura' ? datosFactura : null,
            estado: 'pendiente',
            penalizacion: 0
        };

        registrarAlquiler(nuevoAlquiler);
        setCarritoVenta([]);
        setClienteNombre('');
        setDatosFactura({ ruc: '', razonSocial: '', direccion: '' });
        alert(`Venta registrada correctamente.\n\nAtendido por: ${usuario?.nombre}\nTotal Servicio: S/ ${totalVenta.toFixed(2)}\nGarantía: S/ ${garantiaVenta.toFixed(2)}\nTotal Cobrado: S/ ${totalFinalVenta.toFixed(2)}`);
    };

    const productosFiltrados = inventario.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="grid md:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 h-[calc(100vh-100px)]">
            <div className="md:col-span-2 flex flex-col gap-4 h-full">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Catálogo</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2">
                    {productosFiltrados.map(prod => (
                        <div key={prod.id} onClick={() => prod.stock > 0 && abrirModalProducto(prod)} className={`bg-white p-3 rounded-lg border cursor-pointer hover:border-blue-500 transition-all ${prod.stock === 0 ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>
                            <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                <img src={prod.imagen} alt={prod.nombre} className="object-cover w-full h-full" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                            </div>
                            <p className="font-bold text-sm truncate">{prod.nombre}</p>
                            <p className="text-xs text-gray-500">{prod.categoria}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="font-bold text-blue-600">S/ {prod.precioPorHora}/h</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${prod.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {prod.stock} unid.
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard size={20} /> Ticket de Venta</h2>

                <div className="space-y-3 mb-4 flex-shrink-0">
                    <div className="flex gap-2">
                        <input placeholder="Nombre del Cliente" className="w-full p-2 border rounded text-sm" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
                        <Boton variante="secundario" className="!px-2" onClick={() => { const n = prompt("Nombre:"); if (n) setClienteNombre(n); }}><UserPlus size={18} /></Boton>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="w-full p-2 border rounded text-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="yape">Yape/Plin</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                        <div className="flex gap-2 items-center justify-center border rounded bg-gray-50 px-2">
                            <label className="flex items-center gap-1 text-xs cursor-pointer mr-2">
                                <input type="radio" name="posComprobante" value="boleta" checked={tipoComprobante === 'boleta'} onChange={() => setTipoComprobante('boleta')} /> Boleta
                            </label>
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input type="radio" name="posComprobante" value="factura" checked={tipoComprobante === 'factura'} onChange={() => setTipoComprobante('factura')} /> Factura
                            </label>
                        </div>
                    </div>

                    {tipoComprobante === 'factura' && (
                        <div className="space-y-2 bg-gray-50 p-2 rounded animate-fadeIn">
                            <input placeholder="RUC" className="w-full p-1 border rounded text-xs" value={datosFactura.ruc} onChange={e => setDatosFactura({ ...datosFactura, ruc: e.target.value })} />
                            <input placeholder="Razón Social" className="w-full p-1 border rounded text-xs" value={datosFactura.razonSocial} onChange={e => setDatosFactura({ ...datosFactura, razonSocial: e.target.value })} />
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto border-t border-b py-2 space-y-2">
                    {carritoVenta.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-4">Carrito vacío</p>
                    ) : (
                        carritoVenta.map(item => (
                            <div key={item.idTemp} className="flex justify-between text-sm pb-2 border-b border-dashed last:border-0">
                                <div>
                                    <p className="font-medium">{item.nombre}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={10} /> {item.horas}h x S/ {item.precioPorHora}
                                    </p>
                                    <p className="text-xs text-gray-400">Inicio: {new Date(item.fechaInicio).toLocaleString()}</p>
                                </div>
                                <div className="text-right flex flex-col items-end justify-between">
                                    <p className="font-bold">S/ {(item.precioPorHora * item.horas * item.cantidad).toFixed(2)}</p>
                                    <button onClick={() => setCarritoVenta(prev => prev.filter(p => p.idTemp !== item.idTemp))} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                                        <X size={12} /> Quitar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex-shrink-0 pt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm text-gray-600"><span className="">Subtotal</span><span>S/ {totalVenta.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-sm text-green-600"><span className="">Garantía (20%)</span><span>S/ {garantiaVenta.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center border-t pt-2 mt-2"><span className="font-bold text-lg">Total a Cobrar</span><span className="text-2xl font-bold text-blue-600">S/ {totalFinalVenta.toFixed(2)}</span></div>
                    <Boton className="w-full mt-4 py-3 text-lg" onClick={procesarVenta} disabled={carritoVenta.length === 0}>
                        Cobrar S/ {totalFinalVenta.toFixed(2)}
                    </Boton>
                </div>
            </div>

            {/* Modal para configurar producto */}
            <Modal titulo={`Agregar ${productoAAnadir?.nombre || ''}`} abierto={!!productoAAnadir} alCerrar={() => setProductoAAnadir(null)}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Inicio</label>
                        <input
                            type="datetime-local"
                            className="w-full p-2 border rounded-lg"
                            value={configuracionAlquiler.fechaInicio}
                            onChange={e => setConfiguracionAlquiler({ ...configuracionAlquiler, fechaInicio: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Horas)</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full p-2 border rounded-lg"
                            value={configuracionAlquiler.horas}
                            onChange={e => setConfiguracionAlquiler({ ...configuracionAlquiler, horas: e.target.value })}
                        />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 flex justify-between">
                            <span>Precio por hora:</span>
                            <span className="font-bold">S/ {productoAAnadir?.precioPorHora}</span>
                        </p>
                        <p className="text-sm text-blue-800 flex justify-between mt-1">
                            <span>Total Estimado:</span>
                            <span className="font-bold">S/ {(productoAAnadir?.precioPorHora * configuracionAlquiler.horas).toFixed(2)}</span>
                        </p>
                    </div>
                    <Boton className="w-full" onClick={confirmarAgregarProducto}>
                        Agregar al Ticket
                    </Boton>
                </div>
            </Modal>
        </div>
    );
};

export default PuntoVenta;
