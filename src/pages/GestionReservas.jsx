import React, { useContext, useState } from 'react';
import { CreditCard, Calendar, Search, Clock, CheckCircle, AlertCircle, DollarSign, Filter } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';

const GestionReservas = () => {
    const { alquileres, inventario, registrarPagoSaldo, sedeActual } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const [pestanaActiva, setPestanaActiva] = useState('cobros'); // 'cobros' | 'calendario'
    const [busquedaCliente, setBusquedaCliente] = useState('');

    // Estados para Calendario
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [productoFiltro, setProductoFiltro] = useState('');

    // Filtrar alquileres por sede actual (si aplica)
    const alquileresSede = alquileres.filter(a =>
        (usuario.rol === 'admin' || usuario.rol === 'vendedor') ? a.sedeId === sedeActual : true
    );

    // --- Lógica Cobros ---
    const alquileresConDeuda = alquileresSede.filter(a =>
        a.saldoPendiente > 0 &&
        a.estado !== 'cancelado' &&
        a.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())
    );

    const manejarCobro = (id, monto) => {
        if (confirm(`¿Confirmar pago del saldo restante de S/ ${monto.toFixed(2)}?`)) {
            registrarPagoSaldo(id);
        }
    };

    // --- Lógica Calendario ---
    const alquileresDelDia = alquileresSede.filter(a => {
        const fechaAlquiler = new Date(a.fechaInicio).toISOString().split('T')[0];
        const coincideFecha = fechaAlquiler === fechaFiltro;
        const coincideProducto = productoFiltro ? a.items.some(i => i.id === Number(productoFiltro)) : true;
        return coincideFecha && coincideProducto && a.estado !== 'cancelado';
    });

    // Ordenar por hora
    alquileresDelDia.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="text-blue-600" />
                    Gestión de Reservas
                </h2>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setPestanaActiva('cobros')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'cobros' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <CreditCard size={16} /> Cobros Pendientes
                    </button>
                    <button
                        onClick={() => setPestanaActiva('calendario')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'calendario' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Clock size={16} /> Disponibilidad
                    </button>
                </div>
            </div>

            {pestanaActiva === 'cobros' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <Search className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente con deuda..."
                            className="flex-1 outline-none text-sm"
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alquileresConDeuda.map(a => (
                            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 border-b border-gray-100 bg-red-50 flex justify-between items-center">
                                    <span className="font-bold text-red-700 flex items-center gap-2">
                                        <AlertCircle size={16} /> Deuda Pendiente
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">{a.id.slice(0, 8)}</span>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">{a.cliente}</p>
                                            <p className="text-sm text-gray-500">{formatearFecha(a.fechaInicio)}</p>
                                        </div>
                                        <BadgeEstado estado={a.estado} />
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Servicio:</span>
                                            <span className="font-medium">S/ {a.totalFinal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Pagado (Adelanto):</span>
                                            <span>- S/ {a.montoPagado.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600 font-bold border-t border-gray-200 pt-1 mt-1">
                                            <span>Saldo a Pagar:</span>
                                            <span>S/ {a.saldoPendiente.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <Boton
                                        variante="primario"
                                        className="w-full flex justify-center items-center gap-2"
                                        onClick={() => manejarCobro(a.id, a.saldoPendiente)}
                                    >
                                        <DollarSign size={16} /> Cobrar S/ {a.saldoPendiente.toFixed(2)}
                                    </Boton>
                                </div>
                            </div>
                        ))}
                        {alquileresConDeuda.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
                                <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                                No hay deudas pendientes con los filtros actuales.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {pestanaActiva === 'calendario' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg text-sm"
                                value={fechaFiltro}
                                onChange={(e) => setFechaFiltro(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Filtrar por Producto</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm"
                                value={productoFiltro}
                                onChange={(e) => setProductoFiltro(e.target.value)}
                            >
                                <option value="">-- Todos los Productos --</option>
                                {inventario.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
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
                                        <th className="p-3">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {alquileresDelDia.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium whitespace-nowrap">
                                                {new Date(a.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1">
                                                    {a.items.map(i => (
                                                        <span key={i.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded w-fit">
                                                            <span className="font-bold">{i.cantidad}x</span> {i.nombre}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium">{a.cliente}</div>
                                                <div className="text-xs text-gray-500">ID: {a.clienteId}</div>
                                            </td>
                                            <td className="p-3"><BadgeEstado estado={a.estado} /></td>
                                            <td className="p-3">
                                                {a.saldoPendiente > 0 && (
                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                        Debe S/ {a.saldoPendiente}
                                                    </span>
                                                )}
                                                {a.saldoPendiente === 0 && (
                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                                        <CheckCircle size={10} /> Pagado
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {alquileresDelDia.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay reservas para esta fecha/filtro.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionReservas;
