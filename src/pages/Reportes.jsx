import React, { useContext, useState, useEffect } from 'react';
import { BarChart3, AlertCircle, Search, Wrench, DollarSign, MessageSquare, FileText, CheckCircle, XCircle, Activity, PieChart, Calendar, Image as ImageIcon } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { obtenerMisGastos, obtenerMisReclamos } from '../services/db';
import Boton from '../components/ui/Boton';
import BadgeEstado from '../components/ui/BadgeEstado';
import { formatearFecha } from '../utils/formatters';


import { useLocation } from 'react-router-dom';

const Reportes = ({ rol: rolProp }) => {
    const { alquileres, inventario, reprogramarAlquiler, marcarNoShow, aplicarDescuentoMantenimiento } = useContext(ContextoInventario);
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const { tickets } = useContext(ContextoSoporte);
    const location = useLocation();

    const rol = rolProp || usuario?.rol;

    const [filtro, setFiltro] = useState('');
    const [pestanaActiva, setPestanaActiva] = useState(rol === 'mecanico' ? 'trabajos_activos' : 'ventas');


    // Filtro por Usuario (Individual)
    const [usuarioFiltroId, setUsuarioFiltroId] = useState(location.state?.usuarioId || '');

    // Estados para Reportes Avanzados (Admin/Dueño)
    const [modoReporte, setModoReporte] = useState(location.state?.usuarioId ? 'individual' : 'general'); // 'general' | 'individual'
    const [rolFiltro, setRolFiltro] = useState('todos'); // 'todos' | 'cliente' | 'vendedor' | 'admin' | 'mecanico'

    // Estados para Cliente (Premium View)
    const [misGastos, setMisGastos] = useState([]);
    const [misReclamos, setMisReclamos] = useState([]);
    const [cargando, setCargando] = useState(false);

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

    // Actualizar usuarioFiltroId cuando cambia el modo a general
    if (modoReporte === 'general' && usuarioFiltroId !== '') {
        setUsuarioFiltroId('');
    }

    // --- Lógica de Filtrado de Datos ---

    // Alquileres
    let misAlquileres = rol === 'cliente' ? misGastos : alquileres;

    // 1. Filtrado Base por Rol del Usuario Logueado
    if (rol === 'cliente') {
        // Ya asignado arriba desde misGastos (Vista SQL)
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
        (a.id && String(a.id).toLowerCase().includes(filtro.toLowerCase())) ||
        (a.producto_principal && a.producto_principal.toLowerCase().includes(filtro.toLowerCase()))
    );

    console.log('DEBUG REPORTES:', {
        rol,
        cargando,
        misGastosLength: misGastos?.length,
        alquileresFiltradosLength: alquileresFiltrados?.length,
        datosParaTablaLength: datosParaTabla?.length
    });

    // Tickets (Soporte)
    const [filtroMensajes, setFiltroMensajes] = useState('enviados'); // 'recibidos' | 'enviados' (Default 'enviados' for clients usually, but let's make it dynamic)

    let misTickets = rol === 'cliente' ? misReclamos : tickets;

    // Lógica de filtrado de tickets (Soporte/Mensajería)
    if (rol === 'cliente') {
        // Ya viene filtrado por DB
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

    const totalIngresos = misAlquileres.reduce((acc, curr) => acc + Number(curr.total_final || curr.totalFinal || curr.total || 0), 0);
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
                                                            <div className="font-medium text-gray-900 line-clamp-1" title={a.producto_principal}>
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
                                                            <span>{a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold w-12">Fin Est:</span>
                                                            <Calendar size={12} className="text-gray-400" />
                                                            <span>{a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                                                        {a.cantidad_items || 1}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <BadgeEstado estado={a.estado_nombre || a.estado || 'pendiente'} />
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
                                                    {(a.estado_nombre === 'pendiente' || a.estado === 'pendiente') && (
                                                        <button
                                                            onClick={() => manejarReprogramacion(a.id)}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                                        >
                                                            Reprogramar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
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
                                        <div className="text-xs text-gray-400">{a.id.toString().slice(0, 8)}...</div>
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
                                        {rol === 'cliente' ? 'Mis Reportes' : 'Ventas'}
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
                                        Soporte
                                    </button>
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
                )
            }

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

        </div >
    );
};

export default Reportes;
