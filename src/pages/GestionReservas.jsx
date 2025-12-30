import React, { useContext, useState } from 'react';
import { CreditCard, Calendar, Search, Clock, CheckCircle, AlertCircle, DollarSign, Filter, Play, RotateCcw, XCircle, MoreVertical, UserPlus, User, Briefcase } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal'; // Import Modal
import { formatearFecha } from '../utils/formatters';

const GestionCobros = () => {
    const {
        alquileres,
        registrarPagoSaldo,
        entregarAlquiler,
        devolverAlquiler,
        marcarNoShow,
        reprogramarAlquiler,
        sedeActual,
        buscarClientes,
        registrarCliente
    } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);

    const [pestanaActiva, setPestanaActiva] = useState('cobros'); // 'cobros' | 'reservas'
    const [busqueda, setBusqueda] = useState('');
    const [fechaFiltro, setFechaFiltro] = useState('');

    // Estados para Reprogramación (HEAD)
    const [alquilerAReprogramar, setAlquilerAReprogramar] = useState(null);
    const [horasReprogramacion, setHorasReprogramacion] = useState(1);

    // --- Lógica Albert (Cobros) ---
    const cobrosPendientes = alquileres.filter(a => {
        const esSedeCorrecta = (usuario.rol === 'admin' || usuario.rol === 'vendedor') ? a.sedeId === sedeActual : true;
        const tieneDeuda = (Number(a.saldoPendiente?.toFixed(2)) || 0) > 0; // Robust check
        const estaActivo = a.estado !== 'cancelado';

        const textoBusqueda = busqueda.toLowerCase();
        const coincideTexto =
            a.cliente.toLowerCase().includes(textoBusqueda) ||
            (a.clienteDni && a.clienteDni.toLowerCase().includes(textoBusqueda));

        const fechaAlquiler = new Date(a.fechaInicio).toISOString().split('T')[0];
        const coincideFecha = fechaFiltro ? fechaAlquiler === fechaFiltro : true;

        return esSedeCorrecta && tieneDeuda && estaActivo && coincideTexto && coincideFecha;
    });

    const manejarCobro = async (id, monto) => {
        if (confirm(`¿Confirmar pago del saldo restante de S/ ${monto.toFixed(2)}?`)) {
            await registrarPagoSaldo(id);
        }
    };

    // --- Lógica HEAD (Reservas Confirmadas) ---
    // Reservas Web (Confirmadas)
    const alquileresConfirmados = alquileres.filter(a => {
        const esSedeCorrecta = (usuario.rol === 'admin' || usuario.rol === 'vendedor') ? a.sedeId === sedeActual : true;
        return esSedeCorrecta && a.estado === 'confirmado' && a.cliente.toLowerCase().includes(busqueda.toLowerCase());
    });

    const finalizarReserva = async (alquiler) => {
        if (!confirm(`¿El cliente ha pagado el saldo restante de S/ ${Number(alquiler.saldoPendiente || 0).toFixed(2)}? \n\nAl confirmar, se registrará el pago y se cambiará el estado a 'En Uso'.`)) return;

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

    const confirmarReprogramacion = async () => {
        if (alquilerAReprogramar) {
            const res = await reprogramarAlquiler(alquilerAReprogramar.id, horasReprogramacion);
            if (res.success) {
                alert("Alquiler reprogramado exitosamente");
                setAlquilerAReprogramar(null);
            } else {
                alert("Error al reprogramar: " + res.error);
            }
        }
    };


    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="text-blue-600" />
                    Gestión de Operaciones
                </h2>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setPestanaActiva('cobros')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'cobros' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Cobros Pendientes
                    </button>
                    <button
                        onClick={() => setPestanaActiva('reservas')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'reservas' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Reservas Web ({alquileresConfirmados.length})
                    </button>
                </div>
            </div>

            {/* HEADER FILTERS (Shared logic or specific?) -> Specific per tab might be better, but let's keep Albert's filters for Cobros */}

            {pestanaActiva === 'cobros' && (
                <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
                            <Search className="text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por Cliente o DNI..."
                                className="bg-transparent outline-none w-full text-sm"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
                            <Filter className="text-gray-400" size={20} />
                            <input
                                type="date"
                                className="bg-transparent outline-none text-sm"
                                value={fechaFiltro}
                                onChange={(e) => setFechaFiltro(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center">
                            <Boton variante="secundario" onClick={() => { setBusqueda(''); setFechaFiltro(''); }} disabled={!busqueda && !fechaFiltro}>
                                Ver Todos
                            </Boton>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cobrosPendientes.map(a => (
                            <div key={a.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-red-600 font-bold">
                                        <AlertCircle size={16} />
                                        Deuda
                                    </div>
                                    <span className="font-mono text-xs text-gray-500">#{a.id.toString().slice(0, 8)}</span>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{a.cliente}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <User size={14} /> DNI: {a.clienteDni || 'N/A'}
                                        </p>
                                    </div>

                                    <div className="text-xs bg-blue-50 text-blue-800 p-2 rounded-lg flex items-center gap-2">
                                        <Briefcase size={14} />
                                        {a.vendedor ? (
                                            <span>Vendido por: <b>{a.vendedor}</b></span>
                                        ) : (
                                            <span>Venta Web / Autoservicio</span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-end pt-2">
                                        <div>
                                            <p className="text-xs text-gray-400">Fecha</p>
                                            <p className="text-sm font-medium">{formatearFecha(a.fechaInicio)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Saldo Pendiente</p>
                                            <p className="text-xl font-bold text-red-600">S/ {Number(a.saldoPendiente || 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 pt-0">
                                    <Boton variante="primario" className="w-full" onClick={() => manejarCobro(a.id, a.saldoPendiente)}>
                                        <DollarSign size={18} className="mr-1" /> Registrar Cobro
                                    </Boton>
                                </div>
                            </div>
                        ))}
                        {cobrosPendientes.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                <div className="flex justify-center mb-4">
                                    <DollarSign size={48} className="text-gray-200" />
                                </div>
                                <p>No se encontraron cobros pendientes con los filtros actuales.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {pestanaActiva === 'reservas' && (
                <>
                    {/* Search for Reservas - Reusing busqueda state */}
                    <div className="flex gap-2 w-full sm:w-auto mb-4">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

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
                                                <div className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800">
                                                    {alquiler.estado}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p className="flex items-center gap-2"><Calendar size={14} /> Inicio: {formatearFecha(alquiler.fechaInicio)}</p>
                                                <p className="flex items-center gap-2"><DollarSign size={14} /> Total: S/ {Number(alquiler.totalFinal || 0).toFixed(2)} | Pagado: S/ {Number(alquiler.montoPagado || 0).toFixed(2)}</p>
                                                <p className="text-red-600 font-medium ml-6">Saldo: S/ {Number(alquiler.saldoPendiente || 0).toFixed(2)}</p>
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

            {/* Modal Reprogramación (HEAD Logic preservation) */}
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

export default GestionCobros;
