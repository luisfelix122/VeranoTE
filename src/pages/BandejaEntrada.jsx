import React, { useContext, useState } from 'react';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { Mail, CheckCircle, Clock, Trash2, Search, Filter } from 'lucide-react';

const BandejaEntrada = ({ modoCompacto = false }) => {
    const { mensajes, marcarComoLeido, eliminarTicket, crearTicket } = useContext(ContextoSoporte);
    const { usuario } = useContext(ContextoAutenticacion);
    const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, pendiente, resuelto
    const [busqueda, setBusqueda] = useState('');
    const [pestanaMensajes, setPestanaMensajes] = useState('recibidos'); // 'recibidos' | 'enviados'

    const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
    const [nuevoMensaje, setNuevoMensaje] = useState('');

    const mensajesFiltrados = mensajes.filter(mensaje => {
        // Filtro por Estado (leido/no leido en lugar de estado 'pendiente' para mensajes, aunque DB tiene 'leido')
        // Si filtroEstado es 'pendiente', mostramos no leidos. Si 'resuelto', leidos. (Adaptación simple)
        const coincideEstado = filtroEstado === 'todos' ||
            (filtroEstado === 'pendiente' && !mensaje.leido) ||
            (filtroEstado === 'resuelto' && mensaje.leido);

        // Filtro por Búsqueda
        const coincideBusqueda = (mensaje.asunto?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
            (mensaje.contenido?.toLowerCase() || '').includes(busqueda.toLowerCase());

        if (!coincideEstado || !coincideBusqueda) return false;

        // Filtro por Pestaña
        if (pestanaMensajes === 'recibidos') {
            return mensaje.destinatario_id === usuario.id;
        } else {
            return mensaje.remitente_id === usuario.id;
        }
    });

    return (
        <div className={modoCompacto ? "p-2 space-y-3" : "p-6 space-y-6"}>
            <div className={`flex ${modoCompacto ? 'flex-col gap-2' : 'flex-col sm:flex-row justify-between items-start sm:items-center gap-4'}`}>
                {!modoCompacto && (
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Mail className="text-blue-600" />
                        Bandeja de Entrada
                    </h1>
                )}

                {/* Tabs Recibidos / Enviados */}
                <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                    <button
                        onClick={() => setPestanaMensajes('recibidos')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaMensajes === 'recibidos' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Recibidos
                    </button>
                    <button
                        onClick={() => setPestanaMensajes('enviados')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${pestanaMensajes === 'enviados' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Enviados
                    </button>
                </div>

                <div className={`flex gap-2 ${modoCompacto ? 'w-full' : 'w-full sm:w-auto'}`}>
                    {usuario.rol === 'cliente' && (
                        <button
                            onClick={() => setMostrarModalNuevo(true)}
                            className={`bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 ${modoCompacto ? 'p-2 flex-1 text-xs' : 'px-4 py-2 text-sm'}`}
                        >
                            <Mail size={modoCompacto ? 14 : 18} />
                            {modoCompacto ? 'Nuevo' : 'Nuevo Mensaje'}
                        </button>
                    )}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={modoCompacto ? 14 : 18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={`w-full pl-9 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${modoCompacto ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    {!modoCompacto && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                <option value="todos">Todos</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="resuelto">Resueltos</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Nuevo Mensaje */}
            {mostrarModalNuevo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-xl font-bold mb-4">Nuevo Mensaje a Soporte</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!nuevoMensaje.trim()) return;
                            crearTicket({
                                asunto: `Consulta de ${usuario.nombre}`,
                                mensaje: nuevoMensaje,
                                telefono: usuario.telefono || 'N/A',
                                remitente: {
                                    id: usuario.id,
                                    nombre: usuario.nombre,
                                    rol: usuario.rol
                                },
                                destinatario: { rol: 'admin' }
                            });
                            alert('Mensaje enviado correctamente.');
                            setMostrarModalNuevo(false);
                            setNuevoMensaje('');
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg h-32 resize-none"
                                    placeholder="Describe tu consulta..."
                                    value={nuevoMensaje}
                                    onChange={(e) => setNuevoMensaje(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setMostrarModalNuevo(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enviar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modoCompacto ? (
                // VISTA DE LISTA (Compacta para Dropdown)
                <div className="space-y-2">
                    {mensajesFiltrados.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No hay mensajes.
                        </div>
                    ) : (
                        mensajesFiltrados.map((mensaje) => (
                            <div key={mensaje.id} className={`p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors ${!mensaje.leido && pestanaMensajes === 'recibidos' ? 'bg-blue-50/50' : 'bg-white'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm font-medium ${!mensaje.leido ? 'text-blue-700' : 'text-gray-900'}`}>
                                        {mensaje.asunto}
                                    </h4>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                        {new Date(mensaje.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                    {mensaje.contenido}
                                </p>
                                <div className="flex justify-between items-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${mensaje.leido ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'}`}>
                                        {mensaje.leido ? <CheckCircle size={10} /> : <Clock size={10} />}
                                        {mensaje.leido ? 'Leído' : 'No leído'}
                                    </span>

                                    <div className="flex gap-2">
                                        {!mensaje.leido && pestanaMensajes === 'recibidos' && (
                                            <button onClick={() => marcarComoLeido(mensaje.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                Marcar Leído
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // VISTA DE TABLA (Original)
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Asunto</th>
                                    <th className="px-6 py-4">Mensaje</th>
                                    <th className="px-6 py-4">{pestanaMensajes === 'recibidos' ? 'De' : 'Para'}</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mensajesFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            No se encontraron mensajes en esta bandeja.
                                        </td>
                                    </tr>
                                ) : (
                                    mensajesFiltrados.map((mensaje) => (
                                        <tr key={mensaje.id} className={`hover:bg-gray-50 transition-colors ${!mensaje.leido && pestanaMensajes === 'recibidos' ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${mensaje.leido ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {mensaje.leido ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                    {mensaje.leido ? 'Leído' : 'No leído'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {mensaje.asunto}
                                                {!mensaje.leido && pestanaMensajes === 'recibidos' && <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={mensaje.contenido}>
                                                {mensaje.contenido}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {pestanaMensajes === 'recibidos' ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{mensaje.remitente?.nombre || 'Sistema'}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{mensaje.destinatario?.nombre || 'Admin'}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                {new Date(mensaje.created_at).toLocaleDateString()} <span className="text-xs">{new Date(mensaje.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => eliminarTicket(mensaje.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                {!mensaje.leido && pestanaMensajes === 'recibidos' && (
                                                    <button
                                                        onClick={() => marcarComoLeido(mensaje.id)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs hover:underline ml-2"
                                                    >
                                                        Marcar Leído
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BandejaEntrada;
