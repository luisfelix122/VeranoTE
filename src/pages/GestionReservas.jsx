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

    const [busqueda, setBusqueda] = useState('');
    const [fechaFiltro, setFechaFiltro] = useState('');

    // Estados para Reprogramación (HEAD)
    const [alquilerAReprogramar, setAlquilerAReprogramar] = useState(null);
    const [horasReprogramacion, setHorasReprogramacion] = useState(1);

    // --- Lógica Albert (Cobros - Unificada) ---
    // Filtramos TODAS las reservas (web o presencial) que tengan saldo pendiente
    const cobrosPendientes = alquileres.filter(a => {
        // Lógica Multisede: Admin/Vendedor solo ven su sede. Dueño ve todo.
        const normalize = (s) => String(s || '').toLowerCase();

        const esSedeCorrecta = (usuario.rol === 'admin' || usuario.rol === 'vendedor')
            ? normalize(a.sedeId) === normalize(usuario.sede)
            : (usuario.rol === 'dueno' ? true : normalize(a.sedeId) === normalize(sedeActual));

        const tieneDeuda = (Number(a.saldoPendiente?.toFixed(2)) || 0) > 0;
        const estaActivo = a.estado !== 'cancelado';

        const textoBusqueda = busqueda.toLowerCase();
        const nombreCliente = a.cliente || '';
        const dniCliente = a.clienteDni || '';

        const coincideTexto =
            nombreCliente.toLowerCase().includes(textoBusqueda) ||
            dniCliente.toLowerCase().includes(textoBusqueda);

        const fechaAlquiler = new Date(a.fechaInicio).toISOString().split('T')[0];
        const coincideFecha = fechaFiltro ? fechaAlquiler === fechaFiltro : true;

        return esSedeCorrecta && tieneDeuda && estaActivo && coincideTexto && coincideFecha;
    });

    const manejarCobro = async (id, monto) => {
        if (confirm(`¿Confirmar pago del saldo restante de S/ ${monto.toFixed(2)}?`)) {
            // Asumimos efectivo/tarjeta genérico para cobro rápido, pero atribuimos al vendedor
            await registrarPagoSaldo(id, 'efectivo', null, usuario.id);
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
                    Cobros
                </h2>

                {/* Filtros Globales (Sin Tabs) */}
            </div>

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
