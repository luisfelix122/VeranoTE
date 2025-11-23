import React from 'react';
import { X, TrendingUp, Users, Star, Activity, DollarSign, PieChart, BarChart, Calendar, MapPin } from 'lucide-react';

const DashboardVisual = ({ rol, nombreUsuario, alquileres, inventario, tickets, onClose }) => {

    // --- Cálculos Dinámicos basados en props (datos filtrados) ---

    // 1. Ingresos Totales (o Gasto Total para cliente)
    const totalDinero = alquileres.reduce((acc, curr) => acc + (curr.totalFinal || curr.total), 0);

    // 2. Total Operaciones
    const totalOperaciones = alquileres.length;

    // 3. Estado de Alquileres (Pie Chart Data simulado)
    const estados = alquileres.reduce((acc, curr) => {
        acc[curr.estado] = (acc[curr.estado] || 0) + 1;
        return acc;
    }, {});

    // 4. Categorías Populares (basado en alquileres filtrados)
    // Si no hay alquileres, usamos inventario para mostrar stock
    const categoriasData = alquileres.length > 0
        ? alquileres.reduce((acc, curr) => {
            // Intentamos sacar categoría del item si está disponible, sino 'General'
            const cat = curr.item?.categoria || 'General';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {})
        : inventario.reduce((acc, curr) => {
            acc[curr.categoria] = (acc[curr.categoria] || 0) + 1;
            return acc;
        }, {});

    const dataCategorias = Object.entries(categoriasData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const maxValorCat = Math.max(...dataCategorias.map(d => d.value)) || 1;

    // 5. Ticket Stats
    const ticketsPendientes = tickets.filter(t => t.estado === 'pendiente').length;
    const ticketsResueltos = tickets.filter(t => t.estado === 'resuelto').length;

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gray-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-white px-8 py-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="text-blue-600" />
                            Dashboard Ejecutivo
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Visualizando: <span className="font-medium text-blue-600 capitalize">{nombreUsuario || rol}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Card 1: Dinero */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className={`p-4 rounded-xl ${rol === 'cliente' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                <DollarSign size={28} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{rol === 'cliente' ? 'Total Gastado' : 'Ingresos Generados'}</p>
                                <h3 className="text-2xl font-bold text-gray-900">S/ {totalDinero.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
                            </div>
                        </div>

                        {/* Card 2: Operaciones */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{rol === 'cliente' ? 'Alquileres Realizados' : 'Operaciones Totales'}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{totalOperaciones}</h3>
                            </div>
                        </div>

                        {/* Card 3: Tickets */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="bg-purple-100 p-4 rounded-xl text-purple-600">
                                <Users size={28} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Soporte / Tickets</p>
                                <div className="flex gap-3 text-sm">
                                    <span className="text-orange-600 font-bold">{ticketsPendientes} Pend.</span>
                                    <span className="text-green-600 font-bold">{ticketsResueltos} Res.</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 4: Eficiencia / Rating (Simulado) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="bg-yellow-100 p-4 rounded-xl text-yellow-600">
                                <Star size={28} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Satisfacción</p>
                                <h3 className="text-2xl font-bold text-gray-900">4.8/5.0</h3>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                        {/* Bar Chart: Categorías */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <BarChart size={20} className="text-gray-400" />
                                {rol === 'cliente' ? 'Mis Preferencias' : 'Top Categorías'}
                            </h3>
                            <div className="space-y-4">
                                {dataCategorias.map((cat, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                                            <span>{cat.name}</span>
                                            <span>{cat.value}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(cat.value / maxValorCat) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {dataCategorias.length === 0 && <p className="text-gray-400 text-center py-4">No hay datos suficientes.</p>}
                            </div>
                        </div>

                        {/* Estado de Operaciones */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <PieChart size={20} className="text-gray-400" />
                                Estado de Operaciones
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(estados).map(([estado, count]) => (
                                    <div key={estado} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">{estado.replace(/_/g, ' ')}</p>
                                        <p className="text-2xl font-bold text-gray-800">{count}</p>
                                    </div>
                                ))}
                                {Object.keys(estados).length === 0 && <p className="text-gray-400 text-center col-span-2 py-4">No hay operaciones registradas.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Table (Simplified) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente (Últimos 5)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="p-4">ID / Fecha</th>
                                        <th className="p-4">Detalle</th>
                                        <th className="p-4">Monto</th>
                                        <th className="p-4">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {alquileres.slice(0, 5).map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{a.id.slice(0, 8)}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Calendar size={10} /> {new Date(a.fechaInicio).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-gray-900">{a.cliente}</div>
                                                <div className="text-xs text-gray-500">{a.item?.nombre || 'Item'}</div>
                                            </td>
                                            <td className="p-4 font-medium">S/ {(a.totalFinal || a.total).toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase">
                                                    {a.estado.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {alquileres.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500">No hay actividad reciente.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DashboardVisual;
