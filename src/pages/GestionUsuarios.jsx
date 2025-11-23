import React, { useContext, useState } from 'react';
import { Users, Search, Filter, Trash2, AlertTriangle } from 'lucide-react';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { useNavigate } from 'react-router-dom';

const GestionUsuarios = () => {
    const { usuarios, cambiarRolUsuario, usuario, eliminarUsuario } = useContext(ContextoAutenticacion);
    const { alquileres } = useContext(ContextoInventario);
    const [busqueda, setBusqueda] = useState('');
    const esDueno = usuario.rol === 'dueno';

    const { crearTicket } = useContext(ContextoSoporte);
    const [mostrarModalContacto, setMostrarModalContacto] = useState(false);
    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const navigate = useNavigate();

    const [filtroRol, setFiltroRol] = useState('todos');

    // Estados para Eliminación
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
    const [advertenciaEliminar, setAdvertenciaEliminar] = useState(null);

    // Estados para Cambio de Rol (Sede)
    const [mostrarModalRol, setMostrarModalRol] = useState(false);
    const [usuarioARol, setUsuarioARol] = useState(null);
    const [nuevoRol, setNuevoRol] = useState('');
    const [sedeRol, setSedeRol] = useState('costa'); // Default

    const usuariosFiltrados = usuarios.filter(u => {
        const coincideBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
        const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

        if (!coincideBusqueda || !coincideRol) return false;

        // Restricción para Admin: No ver otros Admins ni Dueños
        if (usuario.rol === 'admin') {
            return u.rol === 'cliente' || u.rol === 'vendedor' || u.rol === 'mecanico';
        }

        return true; // Dueño ve todo
    });

    const abrirModalContacto = (u, e) => {
        if (e) e.stopPropagation();
        setUsuarioSeleccionado(u);
        setMensaje('');
        setMostrarModalContacto(true);
    };

    const abrirModalDetalle = (u) => {
        setUsuarioSeleccionado(u);
        setMostrarModalDetalle(true);
    };

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        crearTicket({
            asunto: `Mensaje de ${usuario.nombre} (${usuario.rol})`,
            mensaje: mensaje,
            telefono: usuario.telefono || 'N/A',
            remitente: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            },
            destinatario: {
                id: usuarioSeleccionado.id,
                nombre: usuarioSeleccionado.nombre,
                rol: usuarioSeleccionado.rol
            }
        });

        alert(`Mensaje enviado a ${usuarioSeleccionado.nombre} correctamente.`);
        setMostrarModalContacto(false);
    };

    const verReporteIndividual = () => {
        navigate('/admin/reportes', { state: { usuarioId: usuarioSeleccionado.id } });
    };

    // --- Lógica de Eliminación ---
    const iniciarEliminacion = (u, e) => {
        e.stopPropagation();
        setUsuarioAEliminar(u);

        // Verificar dependencias
        const alquileresActivos = alquileres.filter(a =>
            (a.clienteId === u.id || a.vendedorId === u.id) &&
            ['pendiente', 'en_uso', 'retrasado', 'en_mantenimiento'].includes(a.estado)
        );

        const historialCompleto = alquileres.filter(a => a.clienteId === u.id || a.vendedorId === u.id);

        if (alquileresActivos.length > 0) {
            setAdvertenciaEliminar({
                tipo: 'critico',
                mensaje: `¡CUIDADO! Este usuario tiene ${alquileresActivos.length} operaciones ACTIVAS. Si lo eliminas, podrías corromper los datos de estos alquileres.`
            });
        } else if (historialCompleto.length > 0) {
            setAdvertenciaEliminar({
                tipo: 'advertencia',
                mensaje: `Este usuario tiene un historial de ${historialCompleto.length} operaciones finalizadas. Eliminarlo mantendrá los registros pero perderá la asociación con el perfil.`
            });
        } else {
            setAdvertenciaEliminar(null);
        }

        setMostrarModalEliminar(true);
    };

    const confirmarEliminacion = () => {
        eliminarUsuario(usuarioAEliminar.id);
        setMostrarModalEliminar(false);
        setUsuarioAEliminar(null);
    };

    // --- Lógica de Cambio de Rol ---
    const iniciarCambioRol = (u, rol, e) => {
        if (e) e.stopPropagation();

        if (rol === 'admin' || rol === 'vendedor') {
            setUsuarioARol(u);
            setNuevoRol(rol);
            setSedeRol('costa'); // Reset default
            setMostrarModalRol(true);
        } else {
            cambiarRolUsuario(u.id, rol);
        }
    };

    const confirmarCambioRol = () => {
        cambiarRolUsuario(usuarioARol.id, nuevoRol, sedeRol);
        setMostrarModalRol(false);
        setUsuarioARol(null);
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Users /> Gestión de Usuarios</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm appearance-none bg-white"
                            value={filtroRol}
                            onChange={(e) => setFiltroRol(e.target.value)}
                        >
                            <option value="todos">Todos los roles</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="mecanico">Mecánico</option>
                            <option value="cliente">Cliente</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                            <tr><th className="p-4">Nombre</th><th className="p-4">Email</th><th className="p-4">Rol</th><th className="p-4">Acciones</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuariosFiltrados.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirModalDetalle(u)}>
                                    <td className="p-4 font-medium">
                                        {u.nombre}
                                        {u.sede && (u.rol === 'admin' || u.rol === 'vendedor') && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full capitalize">
                                                {u.sede}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{u.email}</td>
                                    <td className="p-4 capitalize">{u.rol}</td>
                                    <td className="p-4 flex gap-2 flex-wrap items-center" onClick={(e) => e.stopPropagation()}>
                                        <Boton variante="fantasma" className="text-xs py-1 mr-2" onClick={(e) => abrirModalContacto(u, e)}>Contactar</Boton>
                                        {esDueno && u.rol !== 'dueno' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'dueno', e)}>Hacer Dueño</Boton>
                                        )}
                                        {esDueno && u.rol !== 'admin' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'admin', e)}>Hacer Admin</Boton>
                                        )}
                                        {u.rol !== 'vendedor' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'vendedor', e)}>Hacer Vendedor</Boton>
                                        )}
                                        {u.rol !== 'mecanico' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'mecanico', e)}>Hacer Mecánico</Boton>
                                        )}
                                        {u.rol !== 'cliente' && u.rol !== 'dueno' && (
                                            <Boton variante="fantasma" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'cliente', e)}>Degradar</Boton>
                                        )}
                                        {/* Botón Eliminar */}
                                        {u.rol !== 'dueno' && (
                                            <button
                                                onClick={(e) => iniciarEliminacion(u, e)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Contacto */}
            {mostrarModalContacto && usuarioSeleccionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Contactar a {usuarioSeleccionado.nombre}</h3>
                        <div className="mb-4 text-sm text-gray-600">
                            <p><strong>Rol:</strong> <span className="capitalize">{usuarioSeleccionado.rol}</span></p>
                            <p><strong>Email:</strong> {usuarioSeleccionado.email}</p>
                        </div>
                        <form onSubmit={enviarMensaje} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg h-32 resize-none"
                                    placeholder="Escribe tu mensaje aquí..."
                                    value={mensaje}
                                    onChange={(e) => setMensaje(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <Boton type="button" variante="secundario" onClick={() => setMostrarModalContacto(false)} className="flex-1">Cancelar</Boton>
                                <Boton type="submit" variante="primario" className="flex-1">Enviar Mensaje</Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Usuario */}
            {mostrarModalDetalle && usuarioSeleccionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">Detalles del Usuario</h3>
                            <button onClick={() => setMostrarModalDetalle(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                                    {usuarioSeleccionado.nombre.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-xl font-semibold">{usuarioSeleccionado.nombre}</h4>
                                    <p className="text-gray-500 capitalize">{usuarioSeleccionado.rol}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Email</p>
                                    <p className="font-medium">{usuarioSeleccionado.email}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Teléfono</p>
                                    <p className="font-medium">{usuarioSeleccionado.telefono || 'No registrado'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Nacionalidad</p>
                                    <p className="font-medium">{usuarioSeleccionado.nacionalidad || 'No registrada'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Documento</p>
                                    <p className="font-medium">{usuarioSeleccionado.tipoDocumento} {usuarioSeleccionado.numeroDocumento}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h5 className="font-semibold mb-2 text-gray-700">Estado de Licencia</h5>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${usuarioSeleccionado.licenciaConducir ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="font-medium">
                                        {usuarioSeleccionado.licenciaConducir ? 'Licencia Vigente' : 'Sin Licencia Registrada'}
                                    </span>
                                </div>
                                {!usuarioSeleccionado.licenciaConducir && (usuarioSeleccionado.rol === 'mecanico' || usuarioSeleccionado.rol === 'cliente') && (
                                    <p className="text-xs text-red-500 mt-1">Este usuario no puede operar vehículos motorizados.</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Boton variante="secundario" onClick={() => setMostrarModalDetalle(false)} className="flex-1">Cerrar</Boton>
                                <Boton variante="primario" onClick={() => {
                                    setMostrarModalDetalle(false);
                                    setMensaje('');
                                    setMostrarModalContacto(true);
                                }} className="flex-1">Contactar</Boton>
                                <Boton variante="fantasma" onClick={verReporteIndividual} className="flex-1 text-sm">Ver Reporte</Boton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {mostrarModalEliminar && usuarioAEliminar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border-l-4 border-red-500">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-red-100 p-3 rounded-full text-red-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">¿Eliminar Usuario?</h3>
                                <p className="text-gray-600 mt-1">Estás a punto de eliminar a <strong>{usuarioAEliminar.nombre}</strong>.</p>
                            </div>
                        </div>

                        {advertenciaEliminar && (
                            <div className={`p-4 rounded-lg mb-6 ${advertenciaEliminar.tipo === 'critico' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                                <p className="text-sm font-medium">{advertenciaEliminar.mensaje}</p>
                            </div>
                        )}

                        <p className="text-sm text-gray-500 mb-6">
                            Esta acción no se puede deshacer. {advertenciaEliminar ? 'Por favor, revisa las advertencias antes de continuar.' : ''}
                        </p>

                        <div className="flex gap-3">
                            <Boton variante="secundario" onClick={() => setMostrarModalEliminar(false)} className="flex-1">Cancelar</Boton>
                            <button
                                onClick={confirmarEliminacion}
                                className="flex-1 bg-red-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Asignación de Sede (Rol) */}
            {mostrarModalRol && usuarioARol && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Asignar Sede</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Para promover a <strong>{usuarioARol.nombre}</strong> a {nuevoRol}, debes asignarle una sede principal.
                        </p>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="sede"
                                    value="costa"
                                    checked={sedeRol === 'costa'}
                                    onChange={(e) => setSedeRol(e.target.value)}
                                    className="text-blue-600"
                                />
                                <div>
                                    <span className="font-bold block text-gray-800">Sede Costa</span>
                                    <span className="text-xs text-gray-500">Operaciones en playa</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="sede"
                                    value="rural"
                                    checked={sedeRol === 'rural'}
                                    onChange={(e) => setSedeRol(e.target.value)}
                                    className="text-blue-600"
                                />
                                <div>
                                    <span className="font-bold block text-gray-800">Sede Rural</span>
                                    <span className="text-xs text-gray-500">Operaciones en campo</span>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <Boton variante="secundario" onClick={() => setMostrarModalRol(false)} className="flex-1">Cancelar</Boton>
                            <Boton variante="primario" onClick={confirmarCambioRol} className="flex-1">Confirmar</Boton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;
