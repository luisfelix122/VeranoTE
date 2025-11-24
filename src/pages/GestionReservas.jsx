import React, { useContext, useState } from 'react';
import { CreditCard, Calendar, Search, Clock, CheckCircle, AlertCircle, DollarSign, Filter, Play, RotateCcw, XCircle, MoreVertical } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';
import Modal from '../components/ui/Modal';

const GestionReservas = () => {
    const {
        alquileres,
        inventario,
        registrarPagoSaldo,
        entregarAlquiler,
        devolverAlquiler,
        marcarNoShow,
        reprogramarAlquiler,
        sedeActual
    } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);

    const [pestanaActiva, setPestanaActiva] = useState('operaciones'); // 'operaciones' | 'cobros' | 'calendario'
    const [busquedaCliente, setBusquedaCliente] = useState('');

    // Estados para Calendario
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [productoFiltro, setProductoFiltro] = useState('');

    // Estado para Reprogramación
    const [alquilerAReprogramar, setAlquilerAReprogramar] = useState(null);
    const [horasReprogramacion, setHorasReprogramacion] = useState(1);

    // Filtrar alquileres por sede actual (si aplica)
    const alquileresSede = alquileres.filter(a =>
        (usuario.rol === 'admin' || usuario.rol === 'vendedor') ? a.sedeId === sedeActual : true
    );

    // --- Lógica Operaciones (Entrega, Devolución, etc) ---
    const alquileresActivos = alquileresSede.filter(a =>
        ['confirmado', 'listo_para_entrega', 'en_uso', 'pendiente'].includes(a.estado) &&
        a.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())
    );

    // --- Lógica Cobros ---
    const alquileresConDeuda = alquileresSede.filter(a =>
        a.saldoPendiente > 0 &&
        a.estado !== 'cancelado' &&
        a.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())
    );

    // --- Acciones ---
    const manejarCobro = async (id, monto) => {
        if (confirm(`¿Confirmar pago del saldo restante de S/ ${monto.toFixed(2)}?`)) {
            await registrarPagoSaldo(id);
        }
    };

    const manejarEntrega = async (id) => {
        if (confirm("¿Confirmar entrega de equipos al cliente?")) {
            await entregarAlquiler(id);
        }
    };

    const manejarDevolucion = async (id) => {
        if (confirm("¿Registrar devolución de equipos? Esto calculará penalidades si las hay.")) {
            await devolverAlquiler(id);
        }
    };

    const manejarNoShow = async (id) => {
        if (confirm("¿Marcar como No Show? Esto cancelará la reserva sin reembolso automático.")) {
            await marcarNoShow(id);
        }
    };

    const confirmarReprogramacion = async () => {
        if (alquilerAReprogramar) {
            await reprogramarAlquiler(alquilerAReprogramar.id, Number(horasReprogramacion));
            setAlquilerAReprogramar(null);
            setHorasReprogramacion(1);
        }
    };

    // --- Lógica Calendario ---
    const alquileresDelDia = alquileresSede.filter(a => {
        const fechaAlquiler = new Date(a.fechaInicio).toISOString().split('T')[0];
        const coincideFecha = fechaAlquiler === fechaFiltro;
        const coincideProducto = productoFiltro ? a.items.some(i => i.id === Number(productoFiltro)) : true;
        return coincideFecha && coincideProducto && a.estado !== 'cancelado';
    });

    alquileresDelDia.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="text-blue-600" />
                    Gestión de Reservas
                </h2>

                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    <button
                        onClick={() => setPestanaActiva('operaciones')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${pestanaActiva === 'operaciones' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Play size={16} /> Operaciones
                    </button>
                    <button
                        onClick={() => setPestanaActiva('cobros')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${pestanaActiva === 'cobros' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <CreditCard size={16} /> Cobros
                    </button>
                    <button
                        onClick={() => setPestanaActiva('calendario')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${pestanaActiva === 'calendario' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Clock size={16} /> Calendario
                    </button>
                </div>
            </div>

            {pestanaActiva === 'operaciones' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <Search className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="flex-1 outline-none text-sm"
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {alquileresActivos.map(a => (
                            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900">{a.cliente}</p>
                                        <p className="text-xs text-gray-500">{formatearFecha(a.fechaInicio)}</p>
                                    </div>
                                    <BadgeEstado estado={a.estado} />
                                </div>

                                <div className="text-sm text-gray-600 mb-4 space-y-1">
                                    {a.items.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span>{i.cantidad}x {i.nombre}</span>
                                            <span>{i.horas}h</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                    {/* Botones de Acción según Estado */}
                                    {(a.estado === 'listo_para_entrega' || a.estado === 'confirmado') && (
                                        <Boton variante="primario" className="flex-1 text-xs" onClick={() => manejarEntrega(a.id)}>
                                            <Play size={14} className="mr-1" /> Entregar
                                        </Boton>
                                    )}

                                    {a.estado === 'en_uso' && (
                                        <>
                                            <Boton variante="exito" className="flex-1 text-xs" onClick={() => manejarDevolucion(a.id)}>
                                                <RotateCcw size={14} className="mr-1" /> Devolver
                                            </Boton>
                                            <Boton variante="secundario" className="flex-1 text-xs" onClick={() => setAlquilerAReprogramar(a)}>
                                                <Clock size={14} className="mr-1" /> Extender
                                            </Boton>
                                        </>
                                    )}

                                    {(a.estado === 'confirmado' || a.estado === 'pendiente') && (
                                        <Boton variante="peligro" className="flex-1 text-xs" onClick={() => manejarNoShow(a.id)}>
                                            <XCircle size={14} className="mr-1" /> No Show
                                        </Boton>
                                    )}
                                </div>
                            </div>
                        ))}
                        {alquileresActivos.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No hay operaciones activas pendientes.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {pestanaActiva === 'cobros' && (
                <div className="space-y-4">
                    {/* ... (Lógica de cobros existente, simplificada aquí para brevedad si no cambió) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alquileresConDeuda.map(a => (
                            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-red-600 flex items-center gap-1"><AlertCircle size={14} /> Deuda</span>
                                    <span className="text-xs font-mono">{a.id.slice(0, 8)}</span>
                                </div>
                                <p className="font-bold">{a.cliente}</p>
                                <p className="text-sm text-gray-500 mb-3">Debe: S/ {a.saldoPendiente.toFixed(2)}</p>
                                <Boton variante="primario" className="w-full" onClick={() => manejarCobro(a.id, a.saldoPendiente)}>
                                    <DollarSign size={16} className="mr-1" /> Cobrar
                                </Boton>
                            </div>
                        ))}
                        {alquileresConDeuda.length === 0 && <p className="text-center text-gray-500 col-span-full">Sin deudas pendientes.</p>}
                    </div>
                </div>
            )}

            {pestanaActiva === 'calendario' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} />
                        </div>
                        <div className="w-full md:w-auto flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Filtrar por Producto</label>
                            <select className="w-full p-2 border rounded-lg text-sm" value={productoFiltro} onChange={(e) => setProductoFiltro(e.target.value)}>
                                <option value="">-- Todos los Productos --</option>
                                {inventario.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="p-3">Hora</th>
                                        <th className="p-3">Producto(s)</th>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {alquileresDelDia.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="p-3">{new Date(a.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-3">{a.items.map(i => i.nombre).join(', ')}</td>
                                            <td className="p-3">{a.cliente}</td>
                                            <td className="p-3"><BadgeEstado estado={a.estado} /></td>
                                        </tr>
                                    ))}
                                    {alquileresDelDia.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No hay reservas.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reprogramación */}
            <Modal titulo="Extender Alquiler" abierto={!!alquilerAReprogramar} alCerrar={() => setAlquilerAReprogramar(null)}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Añadir horas adicionales al alquiler de <b>{alquilerAReprogramar?.cliente}</b>.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Horas Adicionales</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full p-2 border rounded-lg"
                            value={horasReprogramacion}
                            onChange={(e) => setHorasReprogramacion(e.target.value)}
                        />
                    </div>
                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
                        Nota: Se calculará el costo extra automáticamente y se sumará al saldo pendiente.
                    </div>
                    <Boton onClick={confirmarReprogramacion} className="w-full">Confirmar Extensión</Boton>
                </div>
            </Modal>
        </div>
    );
};

export default GestionReservas;
