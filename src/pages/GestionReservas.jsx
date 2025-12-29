import React, { useContext, useState } from 'react';
import { CreditCard, Calendar, Search, Clock, CheckCircle, AlertCircle, DollarSign, Filter, Play, RotateCcw, XCircle, MoreVertical, UserPlus } from 'lucide-react';
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

        sedeActual,
        buscarClientes, // New from context
        registrarCliente // New from context
    } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);

    const [pestanaActiva, setPestanaActiva] = useState('operaciones'); // 'operaciones' | 'cobros' | 'calendario'
    const [busquedaCliente, setBusquedaCliente] = useState('');

    // --- Search Logic Reused from SimplePOS ---
    // --- Lógica de Filtrado Local ---

    // Filtrar alquileres por sede actual (si aplica)
    const alquileresSede = alquileres.filter(a =>
        (usuario.rol === 'admin' || usuario.rol === 'vendedor') ? a.sedeId === sedeActual : true
    );

    // Reservas Web (Confirmadas)
    const alquileresConfirmados = alquileresSede.filter(a =>
        a.estado === 'confirmado' &&
        a.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())
    );

    // Operaciones Activas (Para historial o visualización si se permitiera)
    // En este modo refactorizado, solo nos interesa 'confirmado' para finalizar.
    // Pero mantenemos lógica de cobros/calendario si aplica.
    const alquileresConDeuda = alquileresSede.filter(a =>
        a.saldoPendiente > 0 &&
        a.estado !== 'cancelado' &&
        a.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())
    );

    const finalizarReserva = async (alquiler) => {
        if (!confirm(`¿El cliente ha pagado el saldo restante de S/ ${alquiler.saldoPendiente?.toFixed(2)}? \n\nAl confirmar, se registrará el pago y se cambiará el estado a 'En Uso'.`)) return;

        // 1. Registrar pago del saldo
        const resPago = await registrarPagoSaldo(alquiler.id);
        if (!resPago.success && !resPago.error?.message?.includes('ya está pagado')) {
            alert("Error al registrar el pago: " + (resPago.error?.message || 'Desconocido'));
            return;
        }

        // 2. Entregar alquiler
        const resEntrega = await entregarAlquiler(alquiler.id, usuario.id);

        if (resEntrega.success) {
            alert("¡Reserva finalizada con éxito! El equipo ha sido entregado.");
        } else {
            alert("Error al entregar: " + resEntrega.error);
        }
    };

    // --- Acciones de Calendario/Otros (Mantenidos simplificados) ---
    const manejarCobro = async (id, monto) => {
        if (confirm(`¿Confirmar pago del saldo restante de S/ ${monto.toFixed(2)}?`)) {
            await registrarPagoSaldo(id);
        }
    };

    // Estados para Calendario
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [productoFiltro, setProductoFiltro] = useState('');

    // Estado para Reprogramación
    const [alquilerAReprogramar, setAlquilerAReprogramar] = useState(null);
    const [horasReprogramacion, setHorasReprogramacion] = useState(1);

    // --- Acciones ---

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
                <>
                    {/* Header / Buscador */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestión de Reservas</h1>
                            <p className="text-gray-500">Administra las reservas web confirmadas y finaliza su entrega.</p>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={busquedaCliente}
                                    onChange={(e) => setBusquedaCliente(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lista de Reservas Confirmadas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-700">Reservas Confirmadas ({alquileresConfirmados.length})</h2>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {alquileresConfirmados.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No hay reservas web confirmadas pendientes de entrega.
                                </div>
                            ) : (
                                alquileresConfirmados.map(alquiler => (
                                    <div key={alquiler.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">{alquiler.cliente}</span>
                                                <BadgeEstado estado={alquiler.estado} />
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p className="flex items-center gap-2"><Calendar size={14} /> Inicio: {formatearFecha(alquiler.fechaInicio)}</p>
                                                <p className="flex items-center gap-2"><DollarSign size={14} /> Total: S/ {alquiler.totalFinal?.toFixed(2)} | Pagado: S/ {alquiler.montoPagado?.toFixed(2)}</p>
                                                <p className="text-red-600 font-medium ml-6">Saldo: S/ {alquiler.saldoPendiente?.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <Boton onClick={() => finalizarReserva(alquiler)}>
                                            Cobrar Saldo y Entregar
                                        </Boton>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
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
            <Modal
                abierto={!!alquilerAReprogramar}
                alCerrar={() => setAlquilerAReprogramar(null)}
                titulo="Reprogramar / Extender Alquiler"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Extender alquiler de <strong>{alquilerAReprogramar?.cliente}</strong>.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Horas Adicionales</label>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setHorasReprogramacion(Math.max(1, horasReprogramacion - 1))}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            >-</button>
                            <span className="font-bold text-xl w-8 text-center">{horasReprogramacion}</span>
                            <button
                                onClick={() => setHorasReprogramacion(horasReprogramacion + 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            >+</button>
                        </div>
                    </div>
                    <Boton onClick={confirmarReprogramacion} className="w-full">
                        Confirmar Extensión
                    </Boton>
                </div>
            </Modal>
        </div>
    );
};

export default GestionReservas;
