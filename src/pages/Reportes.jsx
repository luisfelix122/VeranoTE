import React, { useContext, useState, useEffect } from 'react';
import { BarChart3, AlertCircle, Search, Wrench, DollarSign, MessageSquare, FileText, CheckCircle, XCircle, Activity, PieChart, Calendar, Image as ImageIcon, CreditCard, Info, Clock, Smartphone } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { obtenerMisGastos, obtenerMisReclamos, registrarPagoSaldoDB } from '../services/db';
import { obtenerTarjetas, agregarTarjeta } from '../services/cardService';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';


import { useLocation, useNavigate } from 'react-router-dom';


const Reportes = ({ rol: rolProp }) => {
    const { alquileres, inventario, reprogramarAlquiler, marcarNoShow, aplicarDescuentoMantenimiento, registrarPagoSaldo, estaAbierto } = useContext(ContextoInventario);
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const { tickets } = useContext(ContextoSoporte);
    const location = useLocation();
    const navigate = useNavigate();

    const rol = rolProp || usuario?.rol;

    const [filtro, setFiltro] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState(rol === 'mecanico' ? 'trabajos_activos' : 'ventas');


    // Filtro por Usuario (Individual)
    const [usuarioFiltroId, setUsuarioFiltroId] = useState(location.state?.usuarioId || '');

    // Estados para Cliente (Premium View)
    const [misGastos, setMisGastos] = useState([]);
    const [misReclamos, setMisReclamos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [modalTicketAbierto, setModalTicketAbierto] = useState(false);
    const { crearTicket } = useContext(ContextoSoporte);
    const [alquilerSeleccionado, setAlquilerSeleccionado] = useState(null);
    const [modalReprogramacion, setModalReprogramacion] = useState({ abierto: false, alquiler: null }); // Store full object
    const [nuevaFecha, setNuevaFecha] = useState('');
    const [nuevaHora, setNuevaHora] = useState('');
    const [cargandoReprogramacion, setCargandoReprogramacion] = useState(false);
    const [exitoReprogramacion, setExitoReprogramacion] = useState(false);
    const [errorHorario, setErrorHorario] = useState(null); // Nuevo estado para validación de horario

    useEffect(() => {
        if (nuevaFecha && nuevaHora && modalReprogramacion.alquiler) {
            const sedeId = modalReprogramacion.alquiler.sedeId || modalReprogramacion.alquiler.sede_id;
            const res = estaAbierto(sedeId, `${nuevaFecha}T${nuevaHora}`);
            if (!res.abierto) {
                setErrorHorario(res.mensaje);
            } else {
                setErrorHorario(null);
            }
        } else {
            setErrorHorario(null);
        }
    }, [nuevaFecha, nuevaHora, modalReprogramacion.alquiler, estaAbierto]);

    // Estados para Pago de Saldo
    const [modalPago, setModalPago] = useState({ abierto: false, alquiler: null });
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('tarjeta');
    const [cargandoPago, setCargandoPago] = useState(false);
    const [pagoExitoso, setPagoExitoso] = useState(false);

    // --- Estado para Gestión de Tarjetas ---
    const [tarjetasGuardadas, setTarjetasGuardadas] = useState([]);
    const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(null);
    const [usarNuevaTarjeta, setUsarNuevaTarjeta] = useState(false);
    const [nuevaTarjeta, setNuevaTarjeta] = useState({ numero: '', exp: '', cvv: '', nombre: '' });
    const [guardarNuevaTarjeta, setGuardarNuevaTarjeta] = useState(true);

    // Filtros internos (simplificados)
    const [sedeFiltro, setSedeFiltro] = useState('todas'); // Aunque no haya UI, mantenemos el estado por compatibilidad de lógica si se requiere

    // Eliminados filtros visuales complejos a petición del usuario
    // const [rolFiltro, setRolFiltro] = useState('todos'); 
    // const [modoReporte, setModoReporte] = useState('general');
    const [erroresTarjeta, setErroresTarjeta] = useState({});

    useEffect(() => {
        if (modalPago.abierto && usuario?.id && metodoPagoSeleccionado === 'tarjeta') {
            obtenerTarjetas(usuario.id).then(cards => {
                setTarjetasGuardadas(cards);
                if (cards.length > 0) {
                    const principal = cards.find(c => c.es_principal) || cards[0];
                    setTarjetaSeleccionada(principal.id);
                    setUsarNuevaTarjeta(false);
                } else {
                    setUsarNuevaTarjeta(true);
                }
            });
        }
    }, [modalPago.abierto, usuario, metodoPagoSeleccionado]);

    useEffect(() => {
        if (rol === 'cliente' && usuario?.id) {
            const cargarDatosCliente = async () => {
                setCargando(true);
                const [gastos, reclamos] = await Promise.all([
                    obtenerMisGastos(usuario.id),
                    obtenerMisReclamos(usuario.id)
                ]);
                setMisGastos(gastos || []);
                setMisReclamos(reclamos || []);
                setCargando(false);
            };
            cargarDatosCliente();
        }
    }, [rol, usuario]);

    // 1. Filtrado Base por Rol del Usuario Logueado
    let misAlquileres = rol === 'cliente' ? misGastos : alquileres;

    if (rol === 'cliente') {
        // Ya asignado arriba desde misGastos (Vista SQL)
    } else if (rol === 'vendedor') {
        // Vendedor ve SOLO sus ventas, independientemente de la sede (aunque por lógica es su sede)
        misAlquileres = alquileres.filter(a => a.vendedorId === usuario?.id);
    } else if (rol === 'admin') {
        // Admin ve TODO de su sede (sus vendedores, sus clientes, sus ventas)
        if (usuario?.sede) {
            misAlquileres = alquileres.filter(a => a.sedeId === usuario.sede);
        }
    } else if (rol === 'dueno') {
        // Dueño ve todo, con filtro opcional de sede (ahora eliminado por defecto ve todo)
        misAlquileres = alquileres;
    }

    // 2. Filtrado Avanzado (Eliminado/Simplificado)
    // Se eliminó la lógica de 'modoReporte' y 'individual' a petición del usuario.
    // Ahora solo se usa el buscador de texto.

    // Filtro específico para Mecánico
    const trabajosMecanico = alquileres.filter(a =>
        a.estado === 'en_mantenimiento' ||
        a.estado === 'limpieza' ||
        a.estado === 'reparacion' ||
        (a.estado === 'finalizado' && a.descuentoMantenimiento > 0)
    );

    const datosParaTabla = rol === 'mecanico'
        ? (pestanaActiva === 'trabajos_activos'
            ? trabajosMecanico.filter(a => ['en_mantenimiento', 'limpieza', 'reparacion'].includes(a.estado))
            : trabajosMecanico.filter(a => a.estado === 'finalizado'))
        : misAlquileres;

    const alquileresFiltrados = datosParaTabla.filter(a =>
        (a.cliente && a.cliente.toLowerCase().includes(filtro.toLowerCase())) ||
        (a.clienteDni && a.clienteDni.includes(filtro)) || // Búsqueda por DNI
        (a.vendedorId && a.vendedorId.toString().includes(filtro)) ||
        (a.id && String(a.id).toLowerCase().includes(filtro.toLowerCase())) ||
        (a.producto_principal && a.producto_principal.toLowerCase().includes(filtro.toLowerCase()))
    );

    console.log('DEBUG REPORTES:', {
        rol,
        cargando,
        totalAlquileresContext: alquileres.length,
        misAlquileresLength: misAlquileres.length,
        alquileresFiltradosLength: alquileresFiltrados.length,
        datosParaTablaLength: datosParaTabla.length,
        sample: alquileres[0], // Ver estructura del primer item
        allStates: alquileres.map(a => a.estado) // Ver estados disponibles
    });

    // Tickets (Soporte)
    const [filtroMensajes, setFiltroMensajes] = useState('enviados'); // 'recibidos' | 'enviados' (Default 'enviados' for clients usually, but let's make it dynamic)

    let misTickets = rol === 'cliente' ? misReclamos : tickets;

    // Lógica de filtrado de tickets (Soporte/Mensajería)
    if (rol === 'cliente') {
        // Ya viene filtrado por DB
    } else if (rol === 'admin' || rol === 'dueno') {
        // Admin/Dueño en Reportes (Vista simplificada)
        // Ya no usamos modoReporte, si hay un usuario seleccionado lo filtramos, sino usamos la vista general de mensajes
        if (usuarioFiltroId) {
            misTickets = tickets.filter(t =>
                t.remitente?.id === Number(usuarioFiltroId) ||
                t.destinatario?.id === Number(usuarioFiltroId)
            );
        } else {
            if (filtroMensajes === 'recibidos') {
                misTickets = tickets.filter(t => t.destinatario?.rol === rol || t.destinatario?.id === usuario?.id || (!t.destinatario && t.remitente?.rol !== rol));
            } else {
                misTickets = tickets.filter(t => t.remitente?.id === usuario?.id);
            }
        }
    }

    // --- Estadísticas ---

    // --- Estadísticas ---

    // 1. Ingreso Base del Negocio (Solo servicio, sin contar garantías)
    const totalServicio = misAlquileres.reduce((acc, curr) => acc + Number(curr.total_servicio || curr.totalServicio || 0), 0);

    // 2. Ingreso Real Net (Lo que queda en caja FINALMENTE, después de devoluciones)
    const totalIngresosReales = misAlquileres.reduce((acc, curr) => acc + Number(curr.total_final || curr.totalFinal || 0), 0);

    // 3. Garantía "Extra" (Lo que nos quedamos por no devolver)
    // Es la diferencia: TotalFinal - TotalServicio. Si es positivo, es ganancia extra.
    const garantiaRetenidaTotal = Math.max(0, totalIngresosReales - totalServicio);

    const totalOperaciones = misAlquileres.length;
    const costosMantenimiento = misAlquileres.reduce((acc, curr) => acc + (curr.descuentoMantenimiento || 0), 0);

    // Estadísticas de Inventario (Filtrado por sede para Admin/Vendedor)
    const misProductos = (rol === 'admin' || rol === 'vendedor') && usuario?.sede
        ? inventario.filter(i => i.sedeId === usuario.sede)
        : inventario;

    const totalProductos = misProductos.length;
    const productosEnUso = misProductos.reduce((acc, curr) => acc + (curr.stockTotal - curr.stock), 0);

    // Soporte Stats
    const ticketsPendientes = misTickets.filter(t => t.estado === 'pendiente').length;

    // Mecánico Stats
    const misTrabajosMecanico = (rol === 'admin' || rol === 'vendedor') && usuario?.sede
        ? trabajosMecanico.filter(a => a.sedeId === usuario.sede)
        : trabajosMecanico;

    const trabajosActivos = misTrabajosMecanico.filter(a => ['en_mantenimiento', 'limpieza', 'reparacion'].includes(a.estado)).length;
    const trabajosCompletados = misTrabajosMecanico.filter(a => a.estado === 'finalizado').length;

    // --- Handlers ---

    const confirmarReprogramacion = async () => {
        if (!nuevaFecha || !nuevaHora) return alert('Seleccione fecha y hora');
        if (errorHorario) return alert('⚠️ ' + errorHorario);

        setCargandoReprogramacion(true);
        try {
            const fechaString = `${nuevaFecha}T${nuevaHora}:00`;
            // Pasamos el objeto con nuevaFecha y nuevaHora al contexto
            const exito = await reprogramarAlquiler(modalReprogramacion.alquiler.id, { nuevaFecha, nuevaHora });

            if (exito) {
                setExitoReprogramacion(true);
                setTimeout(() => {
                    setModalReprogramacion({ abierto: false, alquiler: null });
                    setExitoReprogramacion(false);
                }, 3000);
            }
        } catch (error) {
            alert('Error al reprogramar: ' + error.message);
        } finally {
            setCargandoReprogramacion(false);
        }
    };

    const manejarReprogramacion = (alquiler) => {
        setModalReprogramacion({ abierto: true, alquiler });
        setNuevaFecha('');
        setNuevaHora('');
        setExitoReprogramacion(false);
    };

    const confirmarPagoSaldo = async () => {
        if (!modalPago.alquiler) return;
        const totalAPagar = Number(modalPago.alquiler.saldo_pendiente);

        if (metodoPagoSeleccionado === 'tarjeta') {
            if (usarNuevaTarjeta) {
                // Validar tarjeta básica
                if (nuevaTarjeta.numero.length < 16) return alert('Número de tarjeta inválido');
                if (!nuevaTarjeta.exp.includes('/')) return alert('Fecha expiración inválida (MM/YY)');
                if (nuevaTarjeta.cvv.length < 3) return alert('CVV inválido');
                if (!nuevaTarjeta.nombre) return alert('Ingrese el titular');

                setCargandoPago(true);
                try {
                    // Si se marca guardar, la registramos
                    let finalTarjetaId = null;
                    if (guardarNuevaTarjeta) {
                        const res = await agregarTarjeta(usuario.id, {
                            ...nuevaTarjeta,
                            principal: true
                        });
                        if (res.success) finalTarjetaId = res.data.id;
                    }

                    const exito = await registrarPagoSaldo(modalPago.alquiler.id, 'tarjeta', finalTarjetaId, null);
                    if (exito) setPagoExitoso(true);
                } catch (err) {
                    alert('Error en el pago: ' + err.message);
                } finally {
                    setCargandoPago(false);
                }
            } else {
                if (!tarjetaSeleccionada) return alert('Seleccione una tarjeta');
                setCargandoPago(true);
                const exito = await registrarPagoSaldo(modalPago.alquiler.id, 'tarjeta', tarjetaSeleccionada, null);
                if (exito) setPagoExitoso(true);
                setCargandoPago(false);
            }
        } else {
            // Efectivo, Yape, Transferencia
            setCargandoPago(true);
            const exito = await registrarPagoSaldo(modalPago.alquiler.id, metodoPagoSeleccionado, null, null);
            if (exito) setPagoExitoso(true);
            setCargandoPago(false);
        }
    };

    const renderKPIs = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {rol !== 'mecanico' && (
                <>
                    {/* KPI 1: Ingreso por Servicio (Negocio Puro) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2" title="Dinero generado solo por el alquiler">
                            <DollarSign size={16} /> Ventas (Servicio)
                        </h3>
                        <p className="text-2xl font-bold text-gray-700">S/ {totalServicio.toFixed(2)}</p>
                    </div>

                    {/* KPI 2: Ingreso Real (Caja Final) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 bg-green-50 border-green-200">
                        <h3 className="text-green-800 text-sm font-medium mb-1 flex items-center gap-2" title="Dinero final en caja (Incluye garantías retenidas)">
                            <DollarSign size={16} /> Ingreso Real (Neto)
                        </h3>
                        <p className="text-3xl font-bold text-green-700">S/ {totalIngresosReales.toFixed(2)}</p>
                        {garantiaRetenidaTotal > 0 && (
                            <p className="text-xs text-green-600 font-medium mt-1">+ S/ {garantiaRetenidaTotal.toFixed(2)} por garantías</p>
                        )}
                    </div>
                </>
            )}

            {(rol === 'admin' || rol === 'dueno') && (
                <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><Wrench size={16} /> Costos Mantenimiento</h3>
                        <p className="text-2xl font-bold text-orange-600">S/ {costosMantenimiento.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><FileText size={16} /> Operaciones</h3>
                        <p className="text-2xl font-bold text-blue-600">{totalOperaciones}</p>
                    </div>
                </>
            )}

            {rol === 'mecanico' && (
                <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><Activity size={16} /> Trabajos Activos</h3>
                        <p className="text-2xl font-bold text-orange-600">{trabajosActivos}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><CheckCircle size={16} /> Completados</h3>
                        <p className="text-2xl font-bold text-green-600">{trabajosCompletados}</p>
                    </div>
                </>
            )}

            {rol === 'cliente' && (
                <div
                    onClick={() => setPestanaActiva('soporte')}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-all"
                >
                    <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><MessageSquare size={16} /> Mis Reclamos</h3>
                    <p className="text-2xl font-bold text-gray-700">{misTickets.length}</p>
                </div>
            )}
        </div>
    );

    const renderModalReprogramacion = () => {
        if (!modalReprogramacion.abierto) return null;

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden relative">
                    {/* Decoración abstracta de fondo */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>

                    <div className="flex justify-between items-center mb-6 relative">
                        <h3 className="text-xl font-bold text-gray-900">Reprogramar Reserva</h3>
                        <button
                            onClick={() => setModalReprogramacion({ abierto: false, alquiler: null })}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XCircle className="text-gray-400 hover:text-gray-600" />
                        </button>
                    </div>
                    {exitoReprogramacion ? (
                        <div className="py-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">¡Reprogramación Exitosa!</h4>
                            <p className="text-gray-600 max-w-xs mx-auto">
                                Tu reserva ha sido actualizada. Se ha aplicado el cargo administrativo de S/ 10.00 a tu saldo pendiente.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 flex gap-4 mb-6 shadow-sm">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                    <Info className="text-blue-600" size={20} />
                                </div>
                                <p className="text-sm text-blue-900 leading-relaxed">
                                    Esta operación tiene un costo administrativo de <strong className="text-blue-700">S/ 10.00</strong>, el cual se sumará para ser pagado junto a su saldo pendiente.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Fecha</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={nuevaFecha}
                                    onChange={(e) => setNuevaFecha(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Hora Inicio</label>
                                <input
                                    type="time"
                                    className={`w-full p-2.5 border rounded-xl focus:ring-2 outline-none transition-all ${errorHorario ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500'}`}
                                    value={nuevaHora}
                                    onChange={(e) => setNuevaHora(e.target.value)}
                                />
                                {errorHorario && (
                                    <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1 animate-pulse">
                                        <AlertCircle size={14} /> {errorHorario}
                                    </p>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setModalReprogramacion({ abierto: false, alquiler: null })}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmarReprogramacion}
                                    disabled={cargandoReprogramacion || errorHorario}
                                    className="flex-[1.5] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-100 transition-all transform active:scale-95"
                                >
                                    {cargandoReprogramacion ? 'Procesando...' : 'Confirmar Reprogramación'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderModalPago = () => {
        if (!modalPago.abierto || !modalPago.alquiler) return null;
        const a = modalPago.alquiler;

        const metodos = [
            { id: 'tarjeta', nombre: 'Tarjeta', icon: <CreditCard size={20} />, desc: 'Pago seguro con débito/crédito' },
            { id: 'efectivo', nombre: 'Efectivo', icon: <DollarSign size={20} />, desc: 'Pago en caja al momento' },
            { id: 'transferencia', nombre: 'Transferencia', icon: <Activity size={20} />, desc: 'BCP, BBVA o Interbank' },
            { id: 'yape', nombre: 'Yape / Plin', icon: <Smartphone size={20} />, desc: 'Escanea el QR en caja' }
        ];

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-y-auto max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Pagar Saldo Pendiente</h3>
                            <p className="text-sm text-gray-500">Monto: S/ {Number(a.saldo_pendiente).toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => {
                                setModalPago({ abierto: false, alquiler: null });
                                setPagoExitoso(false);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XCircle className="text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        {pagoExitoso ? (
                            <div className="py-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h4>
                                <p className="text-gray-600 max-w-xs mx-auto">
                                    Tu deuda ha sido saldada correctamente. Ya puedes disfrutar de tus recursos.
                                </p>
                                <button
                                    onClick={() => {
                                        setModalPago({ abierto: false, alquiler: null });
                                        setPagoExitoso(false);
                                    }}
                                    className="mt-6 w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-gray-700 mb-4">Selecciona tu método de pago:</p>
                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    {metodos.map(m => (
                                        <div key={m.id}>
                                            <button
                                                onClick={() => setMetodoPagoSeleccionado(m.id)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${metodoPagoSeleccionado === m.id
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-gray-100 hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metodoPagoSeleccionado === m.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {m.icon}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-900">{m.nombre}</div>
                                                    <div className="text-xs text-gray-500">{m.desc}</div>
                                                </div>
                                                {metodoPagoSeleccionado === m.id && (
                                                    <div className="ml-auto">
                                                        <CheckCircle size={20} className="text-blue-600" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Sub-UI para Tarjeta */}
                                            {m.id === 'tarjeta' && metodoPagoSeleccionado === 'tarjeta' && (
                                                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {tarjetasGuardadas.length > 0 && !usarNuevaTarjeta ? (
                                                        <>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {tarjetasGuardadas.map(t => (
                                                                    <button
                                                                        key={t.id}
                                                                        onClick={() => setTarjetaSeleccionada(t.id)}
                                                                        className={`flex items-center justify-between p-3 rounded-xl border ${tarjetaSeleccionada === t.id ? 'border-blue-600 bg-white' : 'border-gray-100 bg-gray-50'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <CreditCard size={16} className="text-gray-400" />
                                                                            <span className="text-sm font-medium">**** **** **** {t.numero_oculto}</span>
                                                                        </div>
                                                                        {tarjetaSeleccionada === t.id && <CheckCircle size={16} className="text-blue-600" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => setUsarNuevaTarjeta(true)}
                                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 py-1"
                                                            >
                                                                + Usar otra tarjeta
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nueva Tarjeta</span>
                                                                {tarjetasGuardadas.length > 0 && (
                                                                    <button onClick={() => setUsarNuevaTarjeta(false)} className="text-xs font-bold text-blue-600">Volver</button>
                                                                )}
                                                            </div>

                                                            <input
                                                                type="text"
                                                                placeholder="Número de Tarjeta"
                                                                className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${erroresTarjeta.numero ? 'border-red-500' : 'border-gray-200'}`}
                                                                value={nuevaTarjeta.numero}
                                                                onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, numero: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                                                            />

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="MM/YY"
                                                                    className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${erroresTarjeta.exp ? 'border-red-500' : 'border-gray-200'}`}
                                                                    value={nuevaTarjeta.exp}
                                                                    onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, exp: e.target.value })}
                                                                />
                                                                <input
                                                                    type="password"
                                                                    placeholder="CVV"
                                                                    className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${erroresTarjeta.cvv ? 'border-red-500' : 'border-gray-200'}`}
                                                                    value={nuevaTarjeta.cvv}
                                                                    onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                                                />
                                                            </div>

                                                            <input
                                                                type="text"
                                                                placeholder="Nombre en la Tarjeta"
                                                                className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${erroresTarjeta.nombre ? 'border-red-500' : 'border-gray-200'}`}
                                                                value={nuevaTarjeta.nombre}
                                                                onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, nombre: e.target.value })}
                                                            />

                                                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={guardarNuevaTarjeta}
                                                                    onChange={(e) => setGuardarNuevaTarjeta(e.target.checked)}
                                                                    className="w-4 h-4 text-blue-600"
                                                                />
                                                                <span className="text-xs text-gray-600">Guardar tarjeta para futuras compras</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={confirmarPagoSaldo}
                                    disabled={cargandoPago}
                                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {cargandoPago ? 'Procesando...' : `Confirmar Pago S/ ${Number(a.saldo_pendiente).toFixed(2)}`}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    const renderModalDetalle = () => {
        if (!alquilerSeleccionado) return null;
        const a = alquilerSeleccionado;
        const igv = a.datos_factura?.igv_calculado || (a.total_servicio - (a.total_bruto - (a.descuento_promociones || 0)));

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setAlquilerSeleccionado(null); }}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Detalle de Reserva</h3>
                            <p className="text-sm text-gray-500">ID: {a.id}</p>
                            <div className="flex gap-4 mt-2 mb-1">
                                <div className="bg-blue-50 px-3 py-1 rounded-lg text-xs font-semibold text-blue-700 border border-blue-100 flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(a.fecha_inicio || a.fechaInicio).toLocaleDateString()} {new Date(a.fecha_inicio || a.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 flex items-center gap-1">
                                    <Clock size={12} />
                                    Hasta: {new Date(a.fecha_fin_estimada || a.fecha_fin || a.fechaFin).toLocaleDateString()} {new Date(a.fecha_fin_estimada || a.fecha_fin || a.fechaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setAlquilerSeleccionado(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XCircle className="text-gray-400 hover:text-gray-600" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Activity size={16} className="text-blue-600" /> Recursos Alquilados
                            </h4>
                            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 font-medium">
                                        <tr>
                                            <th className="p-3">Recurso</th>
                                            <th className="p-3 text-center">Cant.</th>
                                            <th className="p-3 text-center">Horas</th>
                                            <th className="p-3 text-right">Precio/h</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {a.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium text-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        {item.imagen && <img src={item.imagen} className="w-8 h-8 rounded bg-white object-cover border" alt="" />}
                                                        <div className="flex flex-col">
                                                            <span>{item.nombre}</span>
                                                            <span className="text-[10px] text-gray-400 font-normal">ID: {item.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">{item.cantidad}</td>
                                                <td className="p-3 text-center">{item.horas}h</td>
                                                <td className="p-3 text-right">S/ {Number(item.precioPorHora).toFixed(2)}</td>
                                                <td className="p-3 text-right font-medium">S/ {(item.cantidad * item.horas * item.precioPorHora).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Información del Cliente y Vendedor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Cliente</h4>
                                <p className="font-bold text-gray-800 leading-tight">{a.cliente}</p>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <CreditCard size={10} /> {a.clienteDni || 'Sin Documento'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Atendido por</h4>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                        {(a.vendedor || 'W').charAt(0)}
                                    </div>
                                    <p className="font-semibold text-gray-800 text-sm">{a.vendedor || 'Venta Web / Autoservicio'}</p>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Sede: {a.sedeId || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal Base:</span>
                                    <span>S/ {Number(a.total_bruto).toFixed(2)}</span>
                                </div>
                                {Number(a.descuento_promociones) > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Descuento:</span>
                                        <span>- S/ {Number(a.descuento_promociones).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>IGV (18%):</span>
                                    <span>S/ {Number(igv).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 border-t border-dashed">
                                    <span>Total Servicio:</span>
                                    <span>S/ {Number(a.total_servicio).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span>Garantía (Reembolsable):</span>
                                    <span>S/ {Number(a.garantia).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                    <span>Total Final:</span>
                                    <span>S/ {Number(a.total_final).toFixed(2)}</span>
                                </div>
                                {/* Lógica robusta para detectar Recargos/Descuentos ocultos o explícitos */}
                                {(() => {
                                    const totalServicio = Number(a.total_servicio || 0);
                                    const garantia = Number(a.garantia || 0);
                                    const totalFinal = Number(a.total_final || 0);

                                    // Calculamos la diferencia matemática
                                    // Si TotalFinal > (Servicio + Garantia), hay un Recargo extra.
                                    // Si TotalFinal < (Servicio + Garantia), hay un Descuento extra.
                                    const diferencia = totalFinal - (totalServicio + garantia);

                                    // Tolerancia para errores de punto flotante
                                    const esDiferenciaSignificativa = Math.abs(diferencia) > 0.05;

                                    if (!esDiferenciaSignificativa) return null;

                                    const esRecargo = diferencia > 0;
                                    const esReprogramacion = esRecargo && (a.notas?.toLowerCase().includes('reprogramación') || a.motivo_descuento?.toLowerCase().includes('reprogramación'));

                                    return (
                                        <div className={`mt-3 p-2 rounded text-xs font-semibold ${esRecargo ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-green-50 text-green-700'}`}>
                                            <div className="flex justify-between items-center">
                                                <span>{esReprogramacion ? '🔄 Cargo por Reprogramación' : (esRecargo ? '⚠️ Recargos / Penalidades' : 'Descuento Manual')}:</span>
                                                <span>{esRecargo ? '' : '- '}S/ {Math.abs(diferencia).toFixed(2)}</span>
                                            </div>
                                            {(a.notas || a.motivo_descuento) && (
                                                <p className="mt-1 font-normal opacity-75 italic">"{a.motivo_descuento || a.notas || (esRecargo ? 'Ajuste administrativo' : '')}"</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <DollarSign className="text-blue-600" size={18} />
                                <span className="font-medium text-blue-800">Estado del Pago:</span>
                            </div>
                            <div className="font-bold">
                                {Number(a.saldo_pendiente) > 0 ? (
                                    <span className="text-red-600">Pendiente (Debe S/ {Number(a.saldo_pendiente).toFixed(2)})</span>
                                ) : (
                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Pagado Completo</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTablaVentas = () => {
        if (rol === 'cliente') {
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Detalle de Movimientos</h3>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por producto o ID..."
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                        </div>
                    </div>

                    {cargando ? (
                        <div className="text-center py-10 text-gray-500">Cargando historial...</div>
                    ) : alquileresFiltrados.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                            No tienes alquileres registrados con ese criterio.
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                                        <tr>
                                            <th className="p-4">Producto / ID</th>
                                            <th className="p-4">Fechas</th>
                                            <th className="p-4 text-center">Items</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-right">Pagado / Saldo</th>
                                            <th className="p-4 text-right">Total</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {alquileresFiltrados.map(a => (
                                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                            {a.imagen_principal ? (
                                                                <img src={a.imagen_principal} alt={a.producto_principal} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                    <ImageIcon size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 line-clamp-2 leading-tight" title={a.producto_principal}>
                                                                {a.producto_principal || 'Alquiler General'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                ID: {String(a.id || '').slice(0, 8)}...
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold w-12">Inicio:</span>
                                                            <Calendar size={12} className="text-gray-400" />
                                                            <span>{a.fechaInicio ? new Date(a.fechaInicio).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold w-12">Fin Est:</span>
                                                            <Calendar size={12} className="text-gray-400" />
                                                            <span>{a.fechaFin ? new Date(a.fechaFin).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                                                        {a.cantidad_items || 1}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const est = (a.estado_nombre || a.estado || 'pendiente').toLowerCase();
                                                        let label = 'Pendiente';
                                                        let colorClass = 'bg-yellow-100 text-yellow-800';

                                                        if (est === 'listo_para_entrega' || est === 'confirmado' || est === 'en_preparacion') {
                                                            label = 'Confirmado';
                                                            colorClass = 'bg-green-100 text-green-800';
                                                        } else if (est === 'en_uso') {
                                                            label = 'En Curso';
                                                            colorClass = 'bg-blue-100 text-blue-800 animate-pulse';
                                                        } else if (est === 'limpieza' || est === 'finalizado' || est === 'en_mantenimiento' || est === 'devuelto') {
                                                            label = 'Finalizado';
                                                            colorClass = 'bg-gray-100 text-gray-800';
                                                        } else if (est === 'cancelado') {
                                                            label = 'Cancelado';
                                                            colorClass = 'bg-red-100 text-red-800';
                                                        }

                                                        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorClass}`}>{label}</span>;
                                                    })()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs text-green-600 font-medium">Pagado: S/ {Number(a.monto_pagado || 0).toFixed(2)}</span>
                                                        {Number(a.saldo_pendiente || 0) > 0 && (
                                                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">Debes: S/ {Number(a.saldo_pendiente || 0).toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-900">
                                                    S/ {Number(a.total_final || 0).toFixed(2)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col gap-2 w-full">
                                                        {/* Botón Ver Detalle - SIEMPRE VISIBLE */}
                                                        <button
                                                            onClick={() => setAlquilerSeleccionado(a)}
                                                            className="text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs font-medium flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all w-full"
                                                        >
                                                            <Info size={14} /> Ver Detalle
                                                        </button>

                                                        {/* Botón Reprogramar - Pendientes y Confirmados y NO Pasados */}
                                                        {((a.estado_nombre || a.estado || '').toLowerCase().includes('pendiente') || (a.estado_nombre || a.estado || '').toLowerCase() === 'confirmado') &&
                                                            (new Date(a.fecha_inicio || a.fechaInicio) > new Date()) && (
                                                                <button
                                                                    onClick={() => manejarReprogramacion(a)}
                                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline text-center w-full"
                                                                >
                                                                    Reprogramar
                                                                </button>
                                                            )}

                                                        {/* Botón Pagar - Solo con deuda */}
                                                        {Number(a.saldo_pendiente || 0) > 0 && (
                                                            <button
                                                                onClick={() => setModalPago({ abierto: true, alquiler: a })}
                                                                className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all animate-pulse w-full"
                                                            >
                                                                <CreditCard size={14} /> Pagar S/ {Number(a.saldo_pendiente || 0).toFixed(2)}
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
                    )
                    }
                    {renderModalReprogramacion()}
                    {renderModalDetalle()}
                </div >
            );
        }

        // Vista Standard (Tabla) para otros roles
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-800">
                        {rol === 'mecanico'
                            ? (pestanaActiva === 'trabajos_activos' ? 'Trabajos en Curso' : 'Historial de Reparaciones')
                            : 'Historial de Alquileres'}
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="p-3 w-40">Fecha</th>
                                <th className="p-3 w-48">Cliente</th>
                                {(rol === 'admin' || rol === 'dueno') && <th className="p-3 w-40">Atendido por</th>}
                                {rol === 'dueno' && <th className="p-3 w-32 text-center">Sede</th>}
                                <th className="p-3 w-32 text-right">Monto</th>
                                <th className="p-3 w-32 text-center">Estado</th>
                                <th className="p-3 w-auto text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {alquileresFiltrados.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 whitespace-nowrap">
                                        {formatearFecha(a.fechaInicio)}
                                        <div className="text-xs text-gray-400">{a.id.toString().slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-3 font-medium truncate max-w-xs" title={a.cliente}>{a.cliente}</td>
                                    {(rol === 'admin' || rol === 'dueno') && <td className="p-3 text-gray-500">{a.vendedor || 'WEB'}</td>}
                                    {rol === 'dueno' && (
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${a.sedeId === 'costa' ? 'bg-cyan-50 text-cyan-700' : 'bg-green-50 text-green-700'}`}>
                                                {a.sedeId || 'N/A'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-3 text-right">
                                        <div className="font-medium">S/ {(a.totalFinal || a.total).toFixed(2)}</div>
                                        {a.descuentoMantenimiento > 0 && (
                                            <div className="text-xs text-orange-600 flex items-center gap-1 justify-end">
                                                <Wrench size={10} /> -S/ {a.descuentoMantenimiento.toFixed(2)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center"><BadgeEstado estado={a.estado} /></td>
                                    <td className="p-3 text-center">
                                        {(rol === 'admin' || rol === 'vendedor' || rol === 'dueno') && (
                                            <div className="flex flex-col gap-1 items-center">
                                                {/* Botón Cobrar Deuda */}
                                                {(Number(a.saldoPendiente || a.saldo_pendiente || 0) > 0) && (
                                                    <button
                                                        className="text-green-600 hover:text-green-800 text-xs font-bold flex items-center gap-1 border border-green-200 bg-green-50 px-2 py-1 rounded mb-1 animate-pulse"
                                                        onClick={async () => {
                                                            if (confirm(`¿Confirmar recepción de pago de S/ ${Number(a.saldoPendiente || a.saldo_pendiente).toFixed(2)}?`)) {
                                                                // Pasamos usuario.id como vendedor que cobra
                                                                await registrarPagoSaldo(a.id, 'efectivo', null, usuario?.id);
                                                            }
                                                        }}
                                                    >
                                                        <DollarSign size={12} /> Cobrar S/ {Number(a.saldoPendiente || a.saldo_pendiente).toFixed(2)}
                                                    </button>
                                                )}
                                                {a.estado === 'pendiente' && new Date() > new Date(new Date(a.fechaInicio).getTime() + 10 * 60000) && (
                                                    <button
                                                        className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-1"
                                                        onClick={() => { if (confirm('¿Marcar No Show?')) marcarNoShow(a.id); }}
                                                    >
                                                        <AlertCircle size={12} /> No Show
                                                    </button>
                                                )}
                                                {(a.estado === 'en_mantenimiento' || a.estado === 'retrasado') && (
                                                    <button
                                                        className="text-orange-600 hover:text-orange-800 text-xs font-medium flex items-center gap-1"
                                                        onClick={() => {
                                                            const porcentaje = prompt('Ingrese % descuento:');
                                                            if (porcentaje) aplicarDescuentoMantenimiento(a.id, Number(porcentaje));
                                                        }}
                                                    >
                                                        <Wrench size={12} /> Compensar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setAlquilerSeleccionado(a)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 mt-1 underline"
                                                >
                                                    <Info size={12} /> Ver Detalle
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {alquileresFiltrados.length === 0 && (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay registros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderTablaInventario = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Estado del Inventario</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3 text-center">Stock Total</th>
                            <th className="p-3 text-center">Disponible</th>
                            <th className="p-3 text-center">En Uso</th>
                            <th className="p-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {inventario.map(prod => {
                            const enUso = prod.stockTotal - prod.stock;
                            return (
                                <tr key={prod.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium flex items-center gap-2">
                                        <img src={prod.imagen} alt="" className="w-8 h-8 rounded object-cover" />
                                        {prod.nombre}
                                    </td>
                                    <td className="p-3 text-gray-500">{prod.categoria}</td>
                                    <td className="p-3 text-center font-bold">{prod.stockTotal}</td>
                                    <td className="p-3 text-center text-green-600 font-bold">{prod.stock}</td>
                                    <td className="p-3 text-center text-blue-600 font-bold">{enUso}</td>
                                    <td className="p-3">
                                        {prod.stock === 0 ? (
                                            <span className="text-red-600 text-xs font-bold flex items-center gap-1"><XCircle size={12} /> Agotado</span>
                                        ) : (
                                            <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Disponible</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTablaSoporte = () => {
        const totalTickets = misTickets.length;
        const pendientes = misTickets.filter(t => t.estado === 'pendiente').length;
        const resueltos = misTickets.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Tickets</p>
                            <p className="text-2xl font-bold text-gray-800">{totalTickets}</p>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={20} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Pendientes</p>
                            <p className="text-2xl font-bold text-orange-600">{pendientes}</p>
                        </div>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Resueltos</p>
                            <p className="text-2xl font-bold text-green-600">{resueltos}</p>
                        </div>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <MessageSquare size={18} className="text-blue-600" />
                            {rol === 'cliente' ? 'Historial de Consultas' : 'Bandeja de Soporte'}
                        </h3>

                        <div className="flex items-center gap-2">


                            {rol !== 'cliente' && (
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setFiltroMensajes('enviados')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filtroMensajes === 'enviados' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Enviados
                                    </button>
                                    <button
                                        onClick={() => setFiltroMensajes('recibidos')}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filtroMensajes === 'recibidos' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Recibidos
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                            <tr>
                                <th className="p-4">ID / Fecha</th>
                                <th className="p-4">Asunto</th>
                                <th className="p-4">Mensaje</th>
                                {rol !== 'cliente' && <th className="p-4">{filtroMensajes === 'recibidos' ? 'De' : 'Para'}</th>}
                                <th className="p-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {misTickets.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">#{t.id.toString().slice(0, 8)}</div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Calendar size={10} />
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-gray-900">{t.asunto}</td>
                                    <td className="p-4 text-gray-600 max-w-md truncate" title={t.mensaje}>{t.mensaje}</td>
                                    {rol !== 'cliente' && (
                                        <td className="p-4 text-gray-600">
                                            {t.usuario?.nombre || t.nombre_usuario || 'Usuario'}
                                        </td>
                                    )}
                                    <td className="p-4 text-center">
                                        <BadgeEstado estado={t.estado || 'pendiente'} />
                                    </td>
                                </tr>
                            ))}
                            {misTickets.length === 0 && (
                                <tr>
                                    <td colSpan={rol === 'cliente' ? 4 : 5} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                <MessageSquare size={24} />
                                            </div>
                                            <p>No hay tickets registrados en esta sección.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        );
    };

    // --- Vista Principal ---

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <BarChart3 className="text-blue-600" />
                    Reportes: {rol === 'dueno' ? 'Dueño' : rol.charAt(0).toUpperCase() + rol.slice(1)}
                </h2>

                <div className="flex gap-2 items-center">
                    {/* Tabs para Admin/Dueño/Cliente/Mecánico */}
                    {(rol === 'admin' || rol === 'dueno' || rol === 'cliente' || rol === 'mecanico') && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {rol === 'mecanico' ? (
                                <>
                                    <button
                                        onClick={() => setPestanaActiva('trabajos_activos')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'trabajos_activos' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Trabajos Activos
                                    </button>
                                    <button
                                        onClick={() => setPestanaActiva('historial_mantenimiento')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'historial_mantenimiento' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Historial
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setPestanaActiva('ventas')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'ventas' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        {rol === 'cliente' ? 'Mis Alquileres' : 'Ventas'}
                                    </button>
                                    <button
                                        onClick={() => setPestanaActiva('soporte')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'soporte' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        {rol === 'cliente' ? 'Mis Reclamos' : 'Soporte'}
                                    </button>
                                    {(rol === 'admin' || rol === 'dueno') && (
                                        <button
                                            onClick={() => setPestanaActiva('inventario')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'inventario' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Inventario
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Controles de Reporte Avanzado (Admin/Dueño) */}
            {
                (rol === 'admin' || rol === 'dueno') && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        {/* Búsqueda por Texto (DNI/Nombre) */}
                        <div className="w-full flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buscar (DNI / Nombre / ID) <span className="text-xs font-normal text-gray-500 ml-1">
                                    ({rol === 'dueno' ? 'Todas las Sedes' : (usuario?.sede ? usuario.sede.charAt(0).toUpperCase() + usuario.sede.slice(1) : 'Sede Actual')}: Clientes, Vendedores y Mecánicos)
                                </span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {renderKPIs()}

            {/* Renderizado Condicional de Pestañas */}
            {pestanaActiva === 'ventas' && renderTablaVentas()}
            {pestanaActiva === 'soporte' && renderTablaSoporte()}
            {pestanaActiva === 'inventario' && (rol === 'admin' || rol === 'dueno') && renderTablaInventario()}

            {/* Vistas de Mecánico */}
            {(pestanaActiva === 'trabajos_activos' || pestanaActiva === 'historial_mantenimiento') && renderTablaVentas()}

            {/* Vendedor ve vista simplificada por defecto */}
            {rol === 'vendedor' && pestanaActiva !== 'ventas' && renderTablaVentas()}

            {/* Modal Detalle */}
            {alquilerSeleccionado && renderModalDetalle()}

            {/* Modal Selección de Pago */}
            {modalPago.abierto && renderModalPago()}

        </div >
    );
};

export default Reportes;
