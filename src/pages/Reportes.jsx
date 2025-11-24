import React, { useContext, useState } from 'react';
import { BarChart3, AlertCircle, Search, Wrench, DollarSign, MessageSquare, FileText, CheckCircle, XCircle, Activity, PieChart } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';
import DashboardVisual from '../components/ui/DashboardVisual';

import { useLocation } from 'react-router-dom';

const Reportes = ({ rol: rolProp }) => {
    const { alquileres, inventario, reprogramarAlquiler, marcarNoShow, aplicarDescuentoMantenimiento } = useContext(ContextoInventario);
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const { tickets } = useContext(ContextoSoporte);
    const location = useLocation();

    const rol = rolProp || usuario?.rol;

    const [filtro, setFiltro] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState(rol === 'mecanico' ? 'trabajos_activos' : 'ventas');
    const [mostrarDashboard, setMostrarDashboard] = useState(false);

    // Filtro por Usuario (Individual)
    const [usuarioFiltroId, setUsuarioFiltroId] = useState(location.state?.usuarioId || '');

    // Estados para Reportes Avanzados (Admin/Dueño)
    const [modoReporte, setModoReporte] = useState(location.state?.usuarioId ? 'individual' : 'general'); // 'general' | 'individual'
    const [rolFiltro, setRolFiltro] = useState('todos'); // 'todos' | 'cliente' | 'vendedor' | 'admin' | 'mecanico'

    // Actualizar usuarioFiltroId cuando cambia el modo a general
    if (modoReporte === 'general' && usuarioFiltroId !== '') {
        setUsuarioFiltroId('');
    }

    // --- Lógica de Filtrado de Datos ---

    // Alquileres
    let misAlquileres = alquileres;

    // 1. Filtrado Base por Rol del Usuario Logueado
    if (rol === 'cliente') {
        misAlquileres = alquileres.filter(a => a.clienteId === usuario?.id);
    } else if (rol === 'vendedor') {
        misAlquileres = alquileres.filter(a => a.vendedorId === usuario?.id);
    } else if (rol === 'admin' && usuario?.sede) {
        // Admin ve todo lo de su sede asignada
        misAlquileres = alquileres.filter(a => a.sedeId === usuario.sede);
    }
    // Dueño/Mecánico ven todo inicialmente (Mecánico filtra después por estado)

    // 2. Filtrado Avanzado (Solo Admin/Dueño)
    if (rol === 'admin' || rol === 'dueno') {
        if (modoReporte === 'individual' && usuarioFiltroId) {
            // Reporte de un usuario específico
            misAlquileres = misAlquileres.filter(a =>
                a.clienteId === Number(usuarioFiltroId) ||
                a.vendedorId === Number(usuarioFiltroId)
            );
        } else if (modoReporte === 'general' && rolFiltro !== 'todos') {
            // Reporte General por Rol (ej. "Ver ventas de todos los vendedores")
            if (rolFiltro === 'vendedor') {
                misAlquileres = misAlquileres.filter(a => a.vendedorId !== null); // Solo ventas con vendedor
            } else if (rolFiltro === 'cliente') {
                // No filtramos nada específico porque todos los alquileres tienen cliente, 
                // pero conceptualmente son "todos los alquileres de clientes"
            }
        }
    }

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
        (a.vendedorId && a.vendedorId.toString().includes(filtro)) ||
        (a.id && a.id.toLowerCase().includes(filtro.toLowerCase()))
    );

    // Tickets (Soporte)
    const [filtroMensajes, setFiltroMensajes] = useState('enviados'); // 'recibidos' | 'enviados' (Default 'enviados' for clients usually, but let's make it dynamic)

    let misTickets = tickets;

    // Lógica de filtrado de tickets (Soporte/Mensajería)
    if (rol === 'cliente') {
        if (filtroMensajes === 'enviados') {
            // Lo que el cliente envió
            misTickets = tickets.filter(t => t.clienteId === usuario?.id || t.email === usuario?.email || t.remitente?.id === usuario?.id);
        } else {
            // Lo que el cliente recibió (de Admin/Dueño)
            misTickets = tickets.filter(t => t.destinatario?.id === usuario?.id);
        }
    } else if (rol === 'admin' || rol === 'dueno') {
        // Admin/Dueño en Reportes (Vista simplificada, la completa está en BandejaEntrada)
        if (modoReporte === 'individual' && usuarioFiltroId) {
            // Ver tickets de un usuario específico
            // Si filtro es 'enviados' -> Lo que ese usuario envió (Recibidos por el sistema)
            // Si filtro es 'recibidos' -> Lo que ese usuario recibió (Enviados por el sistema)
            // NOTA: Aquí la perspectiva puede ser confusa. Vamos a mostrar TODO lo relacionado a ese usuario por ahora para simplificar en reporte individual
            misTickets = tickets.filter(t =>
                t.remitente?.id === Number(usuarioFiltroId) ||
                t.destinatario?.id === Number(usuarioFiltroId)
            );
        } else {
            // Vista general en Reportes
            if (filtroMensajes === 'recibidos') {
                misTickets = tickets.filter(t => t.destinatario?.rol === rol || t.destinatario?.id === usuario?.id || (!t.destinatario && t.remitente?.rol !== rol));
            } else {
                misTickets = tickets.filter(t => t.remitente?.id === usuario?.id);
            }
        }
    }

    // --- Estadísticas ---

    const totalIngresos = misAlquileres.reduce((acc, curr) => acc + (curr.totalFinal || curr.total), 0);
    const totalOperaciones = misAlquileres.length;
    const totalPenalizaciones = misAlquileres.reduce((acc, curr) => acc + (curr.penalizacion || 0), 0);
    const costosMantenimiento = misAlquileres.reduce((acc, curr) => acc + (curr.descuentoMantenimiento || 0), 0);

    // Inventario Stats (Admin/Dueño)
    const totalProductos = inventario.length;
    const productosEnUso = inventario.reduce((acc, curr) => acc + (curr.stockTotal - curr.stock), 0);

    // Soporte Stats
    const ticketsPendientes = misTickets.filter(t => t.estado === 'pendiente').length;

    // Mecánico Stats
    const trabajosActivos = trabajosMecanico.filter(a => ['en_mantenimiento', 'limpieza', 'reparacion'].includes(a.estado)).length;
    const trabajosCompletados = trabajosMecanico.filter(a => a.estado === 'finalizado').length;

    // --- Handlers ---

    const manejarReprogramacion = (id) => {
        const horas = prompt("¿Cuántas horas adicionales desea agregar?");
        if (horas && !isNaN(horas) && parseInt(horas) > 0) {
            reprogramarAlquiler(id, parseInt(horas));
            alert("Alquiler reprogramado con éxito.");
        }
    };

    // --- Renderizado por Rol ---

    const renderKPIs = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {rol !== 'mecanico' && (
                <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><DollarSign size={16} /> {rol === 'cliente' ? 'Total Gastado' : 'Ingresos Totales'}</h3>
                        <p className="text-2xl font-bold text-green-600">S/ {totalIngresos.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><FileText size={16} /> Operaciones</h3>
                        <p className="text-2xl font-bold text-blue-600">{totalOperaciones}</p>
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
                        <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><MessageSquare size={16} /> Tickets Pendientes</h3>
                        <p className="text-2xl font-bold text-red-600">{ticketsPendientes}</p>
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><MessageSquare size={16} /> Mis Reclamos</h3>
                    <p className="text-2xl font-bold text-gray-700">{misTickets.length}</p>
                </div>
            )}
        </div>
    );

    const renderTablaVentas = () => (
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
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Cliente</th>
                            {(rol === 'admin' || rol === 'dueno') && <th className="p-3">Vendedor</th>}
                            <th className="p-3">Monto</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {alquileresFiltrados.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 whitespace-nowrap">
                                    {formatearFecha(a.fechaInicio)}
                                    <div className="text-xs text-gray-400">{a.id.slice(0, 8)}...</div>
                                </td>
                                <td className="p-3 font-medium">{a.cliente}</td>
                                {(rol === 'admin' || rol === 'dueno') && <td className="p-3 text-gray-500">{a.vendedorId || 'WEB'}</td>}
                                <td className="p-3">
                                    <div className="font-medium">S/ {(a.totalFinal || a.total).toFixed(2)}</div>
                                    {a.descuentoMantenimiento > 0 && (
                                        <div className="text-xs text-orange-600 flex items-center gap-1">
                                            <Wrench size={10} /> -S/ {a.descuentoMantenimiento.toFixed(2)}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3"><BadgeEstado estado={a.estado} /></td>
                                <td className="p-3">
                                    {rol === 'cliente' && (a.estado === 'pendiente' || a.estado === 'listo_para_entrega' || a.estado === 'en_uso') && (
                                        <Boton variante="secundario" className="text-xs py-1 px-2" onClick={() => manejarReprogramacion(a.id)}>
                                            Reprogramar
                                        </Boton>
                                    )}
                                    {(rol === 'admin' || rol === 'vendedor' || rol === 'dueno') && (
                                        <div className="flex flex-col gap-1">
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

    const renderTablaSoporte = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Tickets de Soporte / Mensajes</h3>
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
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Asunto</th>
                            <th className="p-3">Mensaje</th>
                            <th className="p-3">{filtroMensajes === 'recibidos' ? 'De' : 'Para'}</th>
                            <th className="p-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {misTickets.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-3 whitespace-nowrap">{new Date(t.fecha).toLocaleDateString()}</td>
                                <td className="p-3 font-medium">{t.asunto}</td>
                                <td className="p-3 text-gray-600 max-w-xs truncate">{t.mensaje}</td>
                                <td className="p-3 text-gray-600">
                                    {filtroMensajes === 'recibidos'
                                        ? (t.remitente?.nombre || 'Sistema')
                                        : (t.destinatario?.nombre || 'Soporte')
                                    }
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.estado === 'resuelto' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {t.estado.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {misTickets.length === 0 && (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay mensajes en esta bandeja.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- Vista Principal ---

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <BarChart3 className="text-blue-600" />
                    Reportes: {rol === 'dueno' ? 'Dueño' : rol.charAt(0).toUpperCase() + rol.slice(1)}
                </h2>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setMostrarDashboard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <PieChart size={18} />
                        Ver Dashboard Visual
                    </button>

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
                                    {(rol === 'admin' || rol === 'dueno') && (
                                        <button
                                            onClick={() => setPestanaActiva('inventario')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'inventario' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Inventario
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setPestanaActiva('soporte')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaActiva === 'soporte' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        {rol === 'cliente' ? 'Mis Reclamos' : 'Soporte'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Controles de Reporte Avanzado (Admin/Dueño) */}
            {(rol === 'admin' || rol === 'dueno') && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-auto">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
                            <select
                                className="w-full md:w-48 p-2 border rounded-lg text-sm bg-gray-50"
                                value={modoReporte}
                                onChange={(e) => setModoReporte(e.target.value)}
                            >
                                <option value="general">General</option>
                                <option value="individual">Individual</option>
                            </select>
                        </div>

                        <div className="w-full md:w-auto">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Rol</label>
                            <select
                                className="w-full md:w-48 p-2 border rounded-lg text-sm bg-gray-50"
                                value={rolFiltro}
                                onChange={(e) => {
                                    setRolFiltro(e.target.value);
                                    setUsuarioFiltroId(''); // Reset user selection when role changes
                                }}
                            >
                                <option value="todos">Todos</option>
                                <option value="cliente">Clientes</option>
                                <option value="vendedor">Vendedores</option>
                                <option value="mecanico">Mecánicos</option>
                                {rol === 'dueno' && <option value="admin">Administradores</option>}
                            </select>
                        </div>

                        {modoReporte === 'individual' && (
                            <div className="w-full md:w-auto flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Usuario</label>
                                <select
                                    className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                                    value={usuarioFiltroId}
                                    onChange={(e) => setUsuarioFiltroId(e.target.value)}
                                >
                                    <option value="">-- Seleccione un usuario --</option>
                                    {usuarios
                                        .filter(u => rolFiltro === 'todos' ? true : u.rol === rolFiltro)
                                        .map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre} ({u.rol}) - {u.email}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {renderKPIs()}

            {/* Renderizado Condicional de Pestañas */}
            {pestanaActiva === 'ventas' && renderTablaVentas()}
            {pestanaActiva === 'inventario' && (rol === 'admin' || rol === 'dueno') && renderTablaInventario()}
            {pestanaActiva === 'soporte' && renderTablaSoporte()}

            {/* Vistas de Mecánico */}
            {(pestanaActiva === 'trabajos_activos' || pestanaActiva === 'historial_mantenimiento') && renderTablaVentas()}

            {/* Vendedor ve vista simplificada por defecto */}
            {rol === 'vendedor' && pestanaActiva !== 'ventas' && renderTablaVentas()}

            {/* Modal Dashboard Visual */}
            {mostrarDashboard && (
                <DashboardVisual
                    rol={
                        modoReporte === 'individual' && usuarioFiltroId
                            ? usuarios.find(u => u.id === Number(usuarioFiltroId))?.rol || 'cliente'
                            : (modoReporte === 'general' && rolFiltro !== 'todos' ? rolFiltro : rol)
                    }
                    nombreUsuario={
                        modoReporte === 'individual' && usuarioFiltroId
                            ? usuarios.find(u => u.id === Number(usuarioFiltroId))?.nombre
                            : (modoReporte === 'general' && rolFiltro !== 'todos' ? `Todos los ${rolFiltro}s` : 'Global')
                    }
                    alquileres={misAlquileres} // Pasamos los alquileres filtrados por rol y filtros avanzados
                    inventario={inventario}
                    tickets={misTickets} // Pasamos los tickets filtrados
                    onClose={() => setMostrarDashboard(false)}
                />
            )}
        </div>
    );
};

export default Reportes;
