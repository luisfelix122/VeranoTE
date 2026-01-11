import React, { useContext, useState, useEffect } from 'react';
import { BarChart3, AlertCircle, Search, Wrench, DollarSign, MessageSquare, FileText, CheckCircle, XCircle, Activity, PieChart, Calendar, Image as ImageIcon, CreditCard, Info, Clock, Smartphone } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { obtenerMisGastos, registrarPagoSaldoDB } from '../services/db';
import { obtenerTarjetas, agregarTarjeta } from '../services/cardService';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';
import { generarComprobante } from '../utils/pdfGenerator';


import { useLocation, useNavigate } from 'react-router-dom';


const Reportes = ({ rol: rolProp }) => {
    const { alquileres, inventario, reprogramarAlquiler, marcarNoShow, aplicarDescuentoMantenimiento, registrarPagoSaldo, estaAbierto, configuracion } = useContext(ContextoInventario);
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const location = useLocation();
    const navigate = useNavigate();

    const rol = rolProp || usuario?.rol;

    const [filtro, setFiltro] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState(rol === 'mecanico' ? 'trabajos_activos' : 'ventas');

    // --- NUEVOS ESTADOS DE REPORTES AVANZADOS (Admin/Dueño) ---
    const [tipoReporte, setTipoReporte] = useState('periodico'); // 'alquileres', 'usuarios', 'periodico'
    const [filtroEstadoAlquiler, setFiltroEstadoAlquiler] = useState('todos'); // 'reservados', 'en_curso', 'pagados'
    const [filtroRolUsuario, setFiltroRolUsuario] = useState('todos'); // 'administrador', 'vendedor', 'cliente'
    const [filtroRangoTemporal, setFiltroRangoTemporal] = useState('mes'); // 'hoy', 'semana', 'mes', 'personalizado'
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');


    // Filtro por Usuario (Individual)
    const [usuarioFiltroId, setUsuarioFiltroId] = useState(location.state?.usuarioId || '');

    // Estados para Cliente (Premium View)
    const [misGastos, setMisGastos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [alquilerSeleccionado, setAlquilerSeleccionado] = useState(null);
    const [modalReprogramacion, setModalReprogramacion] = useState({ abierto: false, alquiler: null });
    const [nuevaFecha, setNuevaFecha] = useState('');
    const [nuevaHora, setNuevaHora] = useState('');
    const [cargandoReprogramacion, setCargandoReprogramacion] = useState(false);
    const [exitoReprogramacion, setExitoReprogramacion] = useState(false);
    const [motivoReprogramacion, setMotivoReprogramacion] = useState('Personal');
    const [cargandoClima, setCargandoClima] = useState(false);
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
                try {
                    const gastos = await obtenerMisGastos(usuario.id);
                    setMisGastos(gastos || []);
                } catch (e) {
                    console.error('Error cargando gastos:', e);
                } finally {
                    setCargando(false);
                }
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

    // 2. Filtrado de Reporte Avanzado (Admin/Dueño/Vendedor)
    let datosParaTabla = [];

    // Filtro base para trabajos de mantenimiento/limpieza (usado por mecánicos y en stats de admin)
    const trabajosMecanico = alquileres.filter(a =>
        (a.estado_id === 'en_mantenimiento' ||
            a.estado_id === 'limpieza' ||
            a.estado_id === 'reparacion' ||
            a.estado_id === 'finalizado') &&
        (!usuario?.sede || a.sedeId === usuario.sede)
    );

    if (rol === 'mecanico') {
        datosParaTabla = pestanaActiva === 'trabajos_activos'
            ? trabajosMecanico.filter(a => ['en_mantenimiento', 'limpieza', 'reparacion'].includes(a.estado_id))
            : trabajosMecanico.filter(a => a.estado_id === 'finalizado');
    } else if (rol === 'cliente') {
        datosParaTabla = misGastos;
    } else {
        // Lógica para Admin, Dueño y Vendedor (según tipoReporte)
        if (tipoReporte === 'usuarios') {
            // Reporte de Usuarios
            datosParaTabla = (usuarios || []).filter(u => {
                const matchRol = filtroRolUsuario === 'todos' || u.rol_id === filtroRolUsuario || u.rol === filtroRolUsuario;
                return matchRol;
            });
        } else if (tipoReporte === 'alquileres') {
            // Reporte de Alquileres filtered by Estado
            datosParaTabla = misAlquileres.filter(a => {
                if (filtroEstadoAlquiler === 'todos') return true;
                const est = (a.estado_id || '').toLowerCase();
                if (filtroEstadoAlquiler === 'reservados') {
                    return ['pendiente', 'confirmado', 'listo_para_entrega'].includes(est);
                }
                if (filtroEstadoAlquiler === 'en_curso') {
                    return ['en_uso', 'en_preparacion'].includes(est);
                }
                if (filtroEstadoAlquiler === 'pagados') {
                    // Se considera pagado si el saldo es 0 y está finalizado o devuelto
                    return (est === 'finalizado' || est === 'devuelto') && (Number(a.saldo_pendiente) === 0);
                }
                return true;
            });
        } else {
            // Reporte Periódico (Default)
            datosParaTabla = misAlquileres.filter(a => {
                const fechaA = new Date(a.fechaInicio || a.fecha_inicio);
                const ahora = new Date();

                if (filtroRangoTemporal === 'hoy') {
                    return fechaA.toDateString() === ahora.toDateString();
                }
                if (filtroRangoTemporal === 'semana') {
                    const haceUnaSemana = new Date();
                    haceUnaSemana.setDate(ahora.getDate() - 7);
                    return fechaA >= haceUnaSemana;
                }
                if (filtroRangoTemporal === 'mes') {
                    const haceUnMes = new Date();
                    haceUnMes.setMonth(ahora.getMonth() - 1);
                    return fechaA >= haceUnMes;
                }
                if (filtroRangoTemporal === 'personalizado' && fechaDesde && fechaHasta) {
                    const d = new Date(fechaDesde);
                    const h = new Date(fechaHasta);
                    h.setHours(23, 59, 59);
                    return fechaA >= d && fechaA <= h;
                }
                return true;
            });
        }
    }

    const alquileresFiltrados = datosParaTabla.filter(a => {
        // Si es reporte de usuarios, el buscador usa otros campos
        if (tipoReporte === 'usuarios' && rol !== 'mecanico' && rol !== 'cliente') {
            return (a.nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
                (a.email || '').toLowerCase().includes(filtro.toLowerCase()) ||
                (a.numero_documento || '').includes(filtro);
        }

        // Buscador normal para alquileres
        return (a.cliente && a.cliente.toLowerCase().includes(filtro.toLowerCase())) ||
            (a.clienteDni && a.clienteDni.includes(filtro)) ||
            (a.vendedorId && a.vendedorId.toString().includes(filtro)) ||
            (a.id && String(a.id).toLowerCase().includes(filtro.toLowerCase())) ||
            (a.producto_principal && a.producto_principal.toLowerCase().includes(filtro.toLowerCase()));
    });

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


    // --- Estadísticas ---

    // --- Estadísticas ---
    // Usamos datosParaTabla para que las estadísticas reflejen los filtros aplicados (rango temporal, estado, etc.)
    // Excepto si es reporte de usuarios, donde los KPIs de dinero no aplican igual
    const esReporteAlquiler = tipoReporte !== 'usuarios';
    const baseParaKpis = esReporteAlquiler ? datosParaTabla : misAlquileres;

    // 1. Ingreso Base del Negocio (Solo servicio, sin contar garantías)
    const totalServicio = baseParaKpis.reduce((acc, curr) => acc + Number(curr.total_servicio || curr.totalServicio || 0), 0);

    // 2. Ingreso Real Net (Lo que queda en caja FINALMENTE, después de devoluciones)
    const totalIngresosReales = baseParaKpis.reduce((acc, curr) => acc + Number(curr.total_final || curr.totalFinal || 0), 0);

    // 3. Garantía "Extra" (Lo que nos quedamos por no devolver)
    const garantiaRetenidaTotal = Math.max(0, totalIngresosReales - totalServicio);

    const totalOperaciones = baseParaKpis.length;
    const costosMantenimiento = baseParaKpis.reduce((acc, curr) => acc + (curr.descuentoMantenimiento || 0), 0);

    // Estadísticas de Inventario (Filtrado por sede para Admin/Vendedor)
    const misProductos = (rol === 'admin' || rol === 'vendedor') && usuario?.sede
        ? inventario.filter(i => i.sedeId === usuario.sede)
        : inventario;

    const totalProductos = misProductos.length;
    const productosEnUso = misProductos.reduce((acc, curr) => acc + (curr.stockTotal - curr.stock), 0);


    // Mecánico Stats
    const misTrabajosMecanico = (rol === 'admin' || rol === 'vendedor' || rol === 'mecanico') && usuario?.sede
        ? trabajosMecanico.filter(a => a.sedeId === usuario.sede)
        : trabajosMecanico;

    const trabajosActivos = misTrabajosMecanico.filter(a => ['en_mantenimiento', 'limpieza', 'reparacion'].includes(a.estado_id)).length;
    const trabajosCompletados = misTrabajosMecanico.filter(a => a.estado_id === 'finalizado').length;

    // --- Handlers ---

    const confirmarReprogramacion = async () => {
        if (!nuevaFecha || !nuevaHora) return alert('Seleccione fecha y hora');
        if (errorHorario) return alert('⚠️ ' + errorHorario);

        if (motivoReprogramacion === 'Clima') setCargandoClima(true);
        setCargandoReprogramacion(true);
        try {
            // Pasamos el objeto con nuevaFecha y nuevaHora al contexto, más el contexto del motivo
            const exito = await reprogramarAlquiler(
                modalReprogramacion.alquiler.id,
                { nuevaFecha, nuevaHora },
                { motivo: motivoReprogramacion, usuarioId: usuario?.id }
            );

            if (exito) {
                setExitoReprogramacion(true);
                setTimeout(() => {
                    setModalReprogramacion({ abierto: false, alquiler: null });
                    setExitoReprogramacion(false);
                    setMotivoReprogramacion('Personal');
                }, 3000);
            }
        } catch (error) {
            alert('Error al reprogramar: ' + error.message);
        } finally {
            setCargandoReprogramacion(false);
            setCargandoClima(false);
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

    const renderKPIs = () => {
        // Cálculos Exclusivos Cliente
        const totalInvertido = misAlquileres.reduce((acc, curr) => acc + Number(curr.total_final || 0), 0);
        const deudaTotal = misAlquileres.reduce((acc, curr) => acc + Number(curr.saldo_pendiente || 0), 0);
        const alquileresActivosCount = misAlquileres.filter(a => ['pendiente', 'confirmado', 'en_uso', 'listo_para_entrega'].includes(a.estado_id)).length;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                {/* --- KPIs CLIENTE --- */}
                {rol === 'cliente' && (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                <DollarSign size={16} /> Total Invertido
                            </h3>
                            <p className="text-2xl font-bold text-gray-700">S/ {totalInvertido.toFixed(2)}</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                                <Activity size={16} /> Alquileres Activos
                            </h3>
                            <p className="text-2xl font-bold text-blue-600">{alquileresActivosCount}</p>
                        </div>

                        {deudaTotal > 0 && (
                            <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100 animate-pulse">
                                <h3 className="text-red-800 text-sm font-medium mb-1 flex items-center gap-2">
                                    <AlertCircle size={16} /> Deuda Pendiente
                                </h3>
                                <p className="text-2xl font-bold text-red-600">S/ {deudaTotal.toFixed(2)}</p>
                                <p className="text-xs text-red-700 mt-1">Requiere pago inmediato</p>
                            </div>
                        )}
                    </>
                )}

                {/* --- KPIs NEGOCIO (Admin, Dueño, Vendedor) --- */}
                {(rol === 'admin' || rol === 'dueno' || rol === 'vendedor') && (
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

            </div>
        );
    };

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

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Motivo de Cambio</label>
                                    <select
                                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={motivoReprogramacion}
                                        onChange={(e) => setMotivoReprogramacion(e.target.value)}
                                    >
                                        <option value="Personal">Motivos Personales</option>
                                        <option value="Retraso">Retraso en transporte</option>
                                        <option value="Clima">Clima / Mal tiempo (Sin costo)</option>
                                        <option value="Fuerza Mayor">Fuerza Mayor (Sin costo)</option>
                                        <option value="Error Sistema">Error en el sistema (Sin costo)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
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
                                            className={`w-full p-2 border rounded-lg focus:ring-2 outline-none transition-all ${errorHorario ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500'}`}
                                            value={nuevaHora}
                                            onChange={(e) => setNuevaHora(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {errorHorario && (
                                    <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1 animate-pulse">
                                        <AlertCircle size={14} /> {errorHorario}
                                    </p>
                                )}

                                {/* Resumen del Impacto */}
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">Costo de Operación:</span>
                                            {motivoReprogramacion === 'Clima' && (
                                                <span className="text-[10px] text-blue-500 font-bold italic animate-pulse">
                                                    * Sujeto a validación climática
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-black ${['Clima', 'Fuerza Mayor', 'Error Sistema'].includes(motivoReprogramacion) ? 'text-green-600' : 'text-blue-600'}`}>
                                            {['Clima', 'Fuerza Mayor', 'Error Sistema'].includes(motivoReprogramacion) ? 'S/ 0.00' : 'S/ 10.00'}
                                        </span>
                                    </div>
                                    {nuevaFecha && nuevaHora && modalReprogramacion.alquiler && (
                                        <div className="flex justify-between text-xs border-t pt-2 mt-2">
                                            <span className="text-gray-500">Nuevo retorno estimado:</span>
                                            <span className="font-medium text-gray-700">
                                                {(() => {
                                                    const ini = new Date(`${nuevaFecha}T${nuevaHora}`);
                                                    const origIni = new Date(modalReprogramacion.alquiler.fecha_inicio);
                                                    const origFin = new Date(modalReprogramacion.alquiler.fecha_fin_estimada);
                                                    const dur = origFin.getTime() - origIni.getTime();
                                                    const fin = new Date(ini.getTime() + dur);
                                                    return fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
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
                                    {cargandoClima ? 'Validando Clima...' : cargandoReprogramacion ? 'Procesando...' : 'Confirmar Reprogramación'}
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
                                        <span>Descuento Promo:</span>
                                        <span>- S/ {Number(a.descuento_promociones).toFixed(2)}</span>
                                    </div>
                                )}
                                {Number(a.descuento_manual) !== 0 && (
                                    <div className={`flex justify-between text-sm ${a.descuento_manual > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        <span>{a.descuento_manual > 0 ? 'Descuento Manual:' : 'Recargo / Penalidad:'}</span>
                                        <span>{a.descuento_manual > 0 ? '-' : '+'} S/ {Math.abs(a.descuento_manual).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>IGV ({Number(configuracion?.IGV_PORCENTAJE || 0.18) * 100}%):</span>
                                    {/* IGV está incluido en el Total Servicio. Desglosamos aprox. */}
                                    <span>S/ {(Number(a.total_bruto) * (Number(configuracion?.IGV_PORCENTAJE || 0.18) / (1 + Number(configuracion?.IGV_PORCENTAJE || 0.18)))).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 border-t border-dashed">
                                    <span>Total Servicio:</span>
                                    <span>S/ {Number(a.total_final - (a.garantia || 0)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span>Garantía (Reembolsable):</span>
                                    <span>S/ {Number(a.garantia).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                    <span>Total Final:</span>
                                    <span>S/ {Number(a.total_final).toFixed(2)}</span>
                                </div>

                                {/* Botón de Comprobante */}
                                <div className="pt-4">
                                    <Boton
                                        onClick={() => generarComprobante(a, a.tipo_comprobante || 'boleta')}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg transition-all"
                                    >
                                        <FileText size={18} />
                                        <span>Descargar {a.tipo_comprobante === 'factura' ? 'Factura' : 'Boleta'} Electrónica</span>
                                    </Boton>

                                    {/* Botón Reprogramar desde Detalle - Solo si aplica */}
                                    {((a.estado_id || '').toLowerCase().includes('pendiente') ||
                                        (a.estado_id || '').toLowerCase() === 'confirmado' ||
                                        (a.estado_id || '').toLowerCase() === 'en_uso' ||
                                        (a.estado_id || '').toLowerCase() === 'finalizado') && (
                                            <button
                                                onClick={() => {
                                                    setAlquilerSeleccionado(null);
                                                    manejarReprogramacion(a);
                                                }}
                                                className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl font-bold transition-all"
                                            >
                                                <Clock size={18} />
                                                <span>Reprogramar / Extender Tiempo</span>
                                            </button>
                                        )}

                                    <p className="text-[10px] text-gray-400 text-center mt-2">
                                        Acción rápida para cambios de horario o avisos de retraso.
                                    </p>
                                </div>

                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-3 text-sm">
                            <div className="flex justify-between items-center">
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

                            {/* Botón Pagar Deuda - Visible si hay saldo pendiente */}
                            {Number(a.saldo_pendiente) > 0 && (
                                <button
                                    onClick={() => {
                                        setAlquilerSeleccionado(null);
                                        setModalPago({ abierto: true, alquiler: a });
                                    }}
                                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 animate-pulse"
                                >
                                    <CreditCard size={16} />
                                    Pagar Deuda S/ {Number(a.saldo_pendiente).toFixed(2)}
                                </button>
                            )}
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
                                                        const est = (a.estado_id || 'pendiente').toLowerCase();
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

                                                        {/* Botón Reprogramar - Pendientes, Confirmados, En Curso o Finalizados */}
                                                        {((a.estado_id || '').toLowerCase().includes('pendiente') ||
                                                            (a.estado_id || '').toLowerCase() === 'confirmado' ||
                                                            (a.estado_id || '').toLowerCase() === 'en_uso' ||
                                                            (a.estado_id || '').toLowerCase() === 'finalizado') && (
                                                                <button
                                                                    onClick={() => manejarReprogramacion(a)}
                                                                    className="flex items-center justify-center gap-2 py-2 px-3 bg-white text-blue-600 border border-blue-200 text-xs font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-all w-full"
                                                                >
                                                                    <Clock size={14} /> Reprogramar
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
                                    <td className="p-4 whitespace-nowrap"><BadgeEstado estado={a.estado_id} /></td>
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

                                                <button
                                                    onClick={() => manejarReprogramacion(a)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 border border-blue-100 bg-blue-50 px-2 py-1 rounded w-full justify-center"
                                                >
                                                    <Clock size={12} /> Reprogramar
                                                </button>
                                                {a.estado_id === 'pendiente' && new Date() > new Date(new Date(a.fechaInicio).getTime() + 10 * 60000) && (
                                                    <button
                                                        className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-1"
                                                        onClick={() => { if (confirm('¿Marcar No Show?')) marcarNoShow(a.id); }}
                                                    >
                                                        <AlertCircle size={12} /> No Show
                                                    </button>
                                                )}
                                                {(a.estado_id === 'en_mantenimiento' || a.estado_id === 'retrasado') && (
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

    const renderTablaUsuarios = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Listado de Usuarios / Personal</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Documento</th>
                            <th className="p-3">Rol</th>
                            <th className="p-3">Sede</th>
                            <th className="p-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {alquileresFiltrados.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-medium text-gray-900">{u.nombre}</td>
                                <td className="p-3 text-gray-500">{u.email}</td>
                                <td className="p-3 text-gray-600 font-mono">{u.numero_documento || 'N/A'}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${(u.rol_id || u.rol) === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        (u.rol_id || u.rol) === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {u.rol_id || u.rol}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className="text-xs text-gray-500 font-semibold">{u.sede || 'Global'}</span>
                                </td>
                                <td className="p-3">
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                        <CheckCircle size={10} /> Activo
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

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


    // --- Vista Principal ---

    // --- Gestión de Sedes (Nuevo) ---
    const [modalSede, setModalSede] = useState(false);
    const [nuevaSede, setNuevaSede] = useState({ nombre: '', direccion: '', telefono: '', hora_apertura: '08:00', hora_cierre: '18:00' });
    const { sedes, crearSede } = useContext(ContextoInventario);

    const handleCrearSede = async () => {
        if (!nuevaSede.nombre || !nuevaSede.direccion) return alert('Nombre y Dirección son obligatorios');

        if (confirm('¿Crear nueva sede?')) {
            const exito = await crearSede(nuevaSede);
            if (exito) {
                alert('Sede creada exitosamente');
                setModalSede(false);
                setNuevaSede({ nombre: '', direccion: '', telefono: '', hora_apertura: '08:00', hora_cierre: '18:00' });
            } else {
                alert('Error al crear sede');
            }
        }
    };

    const renderTablaSedes = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Gestión de Sedes</h3>
                <Boton onClick={() => setModalSede(true)} className="bg-blue-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-blue-700">
                    + Nueva Sede
                </Boton>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="p-3">ID</th>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Dirección</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3 text-center">Horario</th>
                            <th className="p-3 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sedes.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-3 font-mono text-xs text-gray-500">{s.id}</td>
                                <td className="p-3 font-bold text-gray-900">{s.nombre}</td>
                                <td className="p-3 text-gray-600">{s.direccion}</td>
                                <td className="p-3 text-gray-600">{s.telefono || '-'}</td>
                                <td className="p-3 text-center text-xs bg-gray-50 rounded-lg border border-gray-100 m-1">
                                    {s.hora_apertura?.slice(0, 5)} - {s.hora_cierre?.slice(0, 5)}
                                </td>
                                <td className="p-3 text-center">
                                    <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1">
                                        <CheckCircle size={12} /> Activo
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Nueva Sede */}
            {modalSede && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Nueva Sede</h3>
                        <div className="space-y-3">
                            <input
                                type="text" placeholder="Nombre (ej. Playa Norte)"
                                className="w-full p-2 border rounded-lg"
                                value={nuevaSede.nombre}
                                onChange={e => setNuevaSede({ ...nuevaSede, nombre: e.target.value })}
                            />
                            <input
                                type="text" placeholder="Dirección"
                                className="w-full p-2 border rounded-lg"
                                value={nuevaSede.direccion}
                                onChange={e => setNuevaSede({ ...nuevaSede, direccion: e.target.value })}
                            />
                            <input
                                type="text" placeholder="Teléfono"
                                className="w-full p-2 border rounded-lg"
                                value={nuevaSede.telefono}
                                onChange={e => setNuevaSede({ ...nuevaSede, telefono: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">Apertura</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border rounded-lg"
                                        value={nuevaSede.hora_apertura}
                                        onChange={e => setNuevaSede({ ...nuevaSede, hora_apertura: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">Cierre</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border rounded-lg"
                                        value={nuevaSede.hora_cierre}
                                        onChange={e => setNuevaSede({ ...nuevaSede, hora_cierre: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setModalSede(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={handleCrearSede} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <BarChart3 className="text-blue-600" />
                    Reportes: {rol === 'dueno' ? 'Dueño' : (rol || '').charAt(0).toUpperCase() + (rol || '').slice(1)}
                </h2>

                <div className="flex gap-2 items-center">
                    {/* Tabs para Admin/Dueño/Cliente/Mecánico */}
                    {(rol === 'admin' || rol === 'dueno' || rol === 'cliente' || rol === 'mecanico') && (
                        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
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
                                    {(rol === 'admin' || rol === 'dueno') && (
                                        <>
                                            <button
                                                onClick={() => setPestanaActiva('inventario')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'inventario' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                Inventario
                                            </button>
                                            <button
                                                onClick={() => setPestanaActiva('sedes')}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'sedes' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                Sedes
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Controles de Reporte Avanzado (Admin/Dueño/Vendedor) - Solo si NO estamos en Sedes */}
            {(rol === 'admin' || rol === 'dueno' || rol === 'vendedor') && pestanaActiva !== 'sedes' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Selector de Tipo de Reporte (Admin, Dueño, Vendedor) */}
                        {(rol === 'admin' || rol === 'dueno' || rol === 'vendedor') && (
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Reporte</label>
                                <select
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={tipoReporte}
                                    onChange={(e) => setTipoReporte(e.target.value)}
                                >
                                    <option value="periodico">Reporte Periódico</option>
                                    <option value="alquileres">Reporte de Alquileres</option>
                                    {(rol === 'admin' || rol === 'dueno') && (
                                        <option value="usuarios">Reporte de Usuarios</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Filtros Contextuales */}
                        <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tipoReporte === 'alquileres' && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estado del Alquiler</label>
                                    <div className="flex gap-2">
                                        {['todos', 'reservados', 'en_curso', 'pagados'].map(est => (
                                            <button
                                                key={est}
                                                onClick={() => setFiltroEstadoAlquiler(est)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filtroEstadoAlquiler === est
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {est === 'todos' ? 'Todos' : est.replace('_', ' ').toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tipoReporte === 'usuarios' && (rol === 'admin' || rol === 'dueno') && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Rol de Usuario</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'todos', label: 'Todos' },
                                            { id: 'admin', label: 'Admin' },
                                            { id: 'vendedor', label: 'Vend.' },
                                            { id: 'cliente', label: 'Clie.' }
                                        ].map(r => (
                                            <button
                                                key={r.id}
                                                onClick={() => setFiltroRolUsuario(r.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filtroRolUsuario === r.id
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tipoReporte === 'periodico' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Periodo</label>
                                        <select
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={filtroRangoTemporal}
                                            onChange={(e) => setFiltroRangoTemporal(e.target.value)}
                                        >
                                            <option value="hoy">Hoy</option>
                                            <option value="semana">Última Semana</option>
                                            <option value="mes">Último Mes</option>
                                            <option value="personalizado">Rango Personalizado</option>
                                        </select>
                                    </div>
                                    {filtroRangoTemporal === 'personalizado' && (
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                                    value={fechaDesde}
                                                    onChange={e => setFechaDesde(e.target.value)}
                                                />
                                            </div>
                                            <span className="text-gray-400 mb-2">al</span>
                                            <div className="flex-1">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                                    value={fechaHasta}
                                                    onChange={e => setFechaHasta(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Búsqueda por Texto */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={tipoReporte === 'usuarios' ? "Buscar por nombre, email o documento..." : "Buscar por DNI, cliente, ID o producto..."}
                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {pestanaActiva !== 'sedes' && renderKPIs()}

            {/* Renderizado Condicional de Pestañas */}
            {tipoReporte === 'usuarios' && pestanaActiva === 'ventas'
                ? renderTablaUsuarios()
                : (
                    <>
                        {pestanaActiva === 'ventas' && renderTablaVentas()}
                        {pestanaActiva === 'inventario' && (rol === 'admin' || rol === 'dueno') && renderTablaInventario()}
                        {pestanaActiva === 'sedes' && (rol === 'admin' || rol === 'dueno') && renderTablaSedes()}
                    </>
                )
            }

            {/* Modal Detalle */}
            {alquilerSeleccionado && renderModalDetalle()}

            {/* Modal Selección de Pago */}
            {modalPago.abierto && renderModalPago()}

        </div >
    );
};

export default Reportes;
