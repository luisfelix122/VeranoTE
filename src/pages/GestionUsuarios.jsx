import React, { useContext, useState } from 'react';
import { Users, Search, Filter, Trash2, AlertTriangle, Plus, Pencil } from 'lucide-react';
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

    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
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

    // Estado para Verificación de Cambio de Rol
    const [verificacionRol, setVerificacionRol] = useState(null); // { u, rol }

    // Estados para Creación/Edición
    const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [datosFormUsuario, setDatosFormUsuario] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'cliente',
        sede: 'costa',
        telefono: '',
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nacionalidad: 'Perú'
    });

    const [filtroSede, setFiltroSede] = useState('todos');

    const usuariosFiltrados = usuarios.filter(u => {
        const coincideBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
        const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

        // Filtro de Sede (Solo para roles que tienen sede: Admin, Vendedor, Mecánico)
        let coincideSede = true;
        if (filtroSede !== 'todos') {
            if (u.rol === 'admin' || u.rol === 'vendedor' || u.rol === 'mecanico') {
                coincideSede = u.sede === filtroSede;
            } else {
                // Si es Cliente o Dueño (sin sede específica asignable para filtro), 
                // decidimos si mostrarlos u ocultarlos. 
                // El usuario dijo "filtrarlos tambien por sede", implicando que quiere ver los de esa sede.
                // Como clientes no tienen sede, los ocultamos si hay filtro activo.
                coincideSede = false;
            }
        }

        if (!coincideBusqueda || !coincideRol || !coincideSede) return false;

        // Restricción para Admin: Ver todos los roles excepto Dueños y a sí mismo
        if (usuario.rol === 'admin') {
            return u.id !== usuario.id && u.rol !== 'dueno';
        }

        // Restricción para Dueño: No verse a sí mismo ni a otros dueños
        if (usuario.rol === 'dueno') {
            return u.rol !== 'dueno';
        }

        return true;
    });

    const abrirModalDetalle = (u) => {
        setUsuarioSeleccionado(u);
        setMostrarModalDetalle(true);
    };



    const verReporteIndividual = () => {
        navigate('/admin/reportes', { state: { usuarioId: usuarioSeleccionado.id } });
    };

    // --- Lógica de Eliminación ---
    const iniciarEliminacion = (u, e) => {
        e.stopPropagation();
        setUsuarioAEliminar(u);

        // Verificar dependencias
        const alquileresActivos = alquileres.filter(a => {
            const esUsuarioRelacionado = a.clienteId === u.id || a.vendedorId === u.id;
            // Bloqueamos si el estado NO es uno de los terminales
            const estadoId = a.estado_id || a.estado;
            const esEstadoActivo = !['finalizado', 'cancelado', 'no_show'].includes(estadoId);
            return esUsuarioRelacionado && esEstadoActivo;
        });

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

    // 1. Iniciar: Pedir confirmación
    const iniciarCambioRol = (u, rol, e) => {
        if (e) e.stopPropagation();
        setVerificacionRol({ u, rol });
    };

    // 2. Confirmado: Proceder con la lógica original
    const procederCambioRol = () => {
        const { u, rol } = verificacionRol;
        setVerificacionRol(null); // Cerrar modal de verificación

        // Si es ADMIN y quiere crear un VENDEDOR o MECÁNICO, asignar SU sede automáticamente
        if (usuario.rol === 'admin' && (rol === 'vendedor' || rol === 'mecanico')) {
            cambiarRolUsuario(u.id, rol, usuario.sede);
            return;
        }

        if (rol === 'admin' || rol === 'vendedor' || rol === 'mecanico') {
            setUsuarioARol(u);
            setNuevoRol(rol);
            setSedeRol('costa'); // Reset default
            setMostrarModalRol(true);
        } else {
            cambiarRolUsuario(u.id, rol);
        }
    };

    // 3. Confirmar cambio con sede (si aplica)
    const confirmarCambioRolConSede = () => {
        // Validación: Solo 1 Admin por Sede
        if (nuevoRol === 'admin') {
            const adminExistente = usuarios.find(u => u.rol === 'admin' && u.sede === sedeRol);
            if (adminExistente) {
                alert(`No se puede designar ya que ya existe un administrador en la sede ${sedeRol}. Si quiere poner a este usuario como admin, debe degradar al administrador actual (${adminExistente.nombre}) para que este tome el cargo.`);
                return;
            }
        }

        cambiarRolUsuario(usuarioARol.id, nuevoRol, sedeRol);
        setMostrarModalRol(false);
        setUsuarioARol(null);
    };

    const abrirModalNuevo = () => {
        setModoEdicion(false);
        setDatosFormUsuario({
            nombre: '',
            email: '',
            password: '',
            rol: 'cliente',
            sede: usuario.rol === 'admin' ? usuario.sede : 'costa',
            telefono: '',
            tipoDocumento: 'DNI',
            numeroDocumento: '',
            nacionalidad: 'Perú'
        });
        setMostrarModalFormulario(true);
    };

    const abrirModalEdicion = (u, e) => {
        if (e) e.stopPropagation();
        setModoEdicion(true);
        setUsuarioSeleccionado(u);
        setDatosFormUsuario({
            ...u,
            password: '' // No cargar password actual por seguridad
        });
        setMostrarModalFormulario(true);
    };

    const handleGuardarUsuario = async (e) => {
        e.preventDefault();
        try {
            if (modoEdicion) {
                await actualizarPerfil(usuarioSeleccionado.id, datosFormUsuario);
                alert("✅ Usuario actualizado correctamente.");
            } else {
                const resultado = await registrarUsuario(datosFormUsuario);
                if (resultado === true) {
                    alert("✅ Usuario creado correctamente.");
                } else {
                    alert("❌ Error: " + resultado);
                }
            }
            setMostrarModalFormulario(false);
        } catch (error) {
            console.error("Error al guardar usuario:", error);
            alert("❌ Ocurrió un error al procesar la solicitud.");
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Users /> Gestión de Usuarios</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Boton onClick={abrirModalNuevo} className="flex items-center gap-2">
                        <Plus size={18} /> Nuevo Usuario
                    </Boton>
                    {/* Filtro de Roles */}
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm appearance-none bg-white"
                            value={filtroRol}
                            onChange={(e) => {
                                setFiltroRol(e.target.value);
                                if (e.target.value === 'cliente') setFiltroSede('todos');
                            }}
                        >
                            <option value="todos">Todos los roles</option>
                            <option value="admin">Administrador</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="mecanico">Mecánico</option>
                            <option value="cliente">Cliente</option>
                        </select>
                    </div>

                    {/* Filtro de Sede (Solo Dueño) */}
                    {esDueno && (
                        <div className="relative w-full sm:w-48">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm appearance-none ${filtroRol === 'cliente' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                value={filtroSede}
                                onChange={(e) => setFiltroSede(e.target.value)}
                                disabled={filtroRol === 'cliente'}
                            >
                                <option value="todos">Todas las sedes</option>
                                <option value="costa">Sede Costa</option>
                                <option value="rural">Sede Rural</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                            <tr>
                                <th className="p-4 w-1/4">Nombre</th>
                                <th className="p-4 w-1/4">Email</th>
                                <th className="p-4 w-1/6">Rol</th>
                                {esDueno && <th className="p-4 w-1/6">Sede</th>}
                                <th className="p-4 w-auto">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuariosFiltrados.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirModalDetalle(u)}>
                                    <td className="p-4 font-medium">
                                        {u.nombre}
                                        {/* Badge de sede eliminado como solicitado */}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{u.email}</td>
                                    <td className="p-4 capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            u.rol === 'dueno' ? 'bg-indigo-100 text-indigo-700' :
                                                u.rol === 'vendedor' ? 'bg-blue-100 text-blue-700' :
                                                    u.rol === 'mecanico' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                                            {u.rol === 'dueno' ? 'Dueño' : u.rol}
                                        </span>
                                    </td>
                                    {esDueno && (
                                        <td className="p-4">
                                            {u.rol === 'dueno' ? (
                                                <span className="font-medium text-gray-500">Global</span>
                                            ) : (u.rol === 'admin' || u.rol === 'vendedor' || u.rol === 'mecanico') ? (
                                                <span className="capitalize font-medium text-gray-700">{u.sede || 'Sin Asignar'}</span>
                                            ) : (
                                                <span className="text-gray-400 font-bold">-</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="p-4 flex gap-2 flex-nowrap items-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        {esDueno && u.rol !== 'dueno' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'dueno', e)}>Dueño</Boton>
                                        )}
                                        {/* Botón Editar (Pencil) */}
                                        <button
                                            onClick={(e) => abrirModalEdicion(u, e)}
                                            className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                            title="Editar Datos"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        {u.rol !== 'vendedor' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'vendedor', e)}>Vendedor</Boton>
                                        )}
                                        {u.rol !== 'mecanico' && (
                                            <Boton variante="secundario" className="text-xs py-1" onClick={(e) => iniciarCambioRol(u, 'mecanico', e)}>Mecánico</Boton>
                                        )}
                                        {u.rol !== 'cliente' && u.rol !== 'dueno' && (u.rol !== 'admin' || esDueno) && (
                                            <Boton variante="fantasma" className="text-xs py-1 text-red-600 hover:bg-red-50" onClick={(e) => iniciarCambioRol(u, 'cliente', e)}>Degradar</Boton>
                                        )}
                                        {/* Botón Eliminar */}
                                        {u.rol !== 'dueno' && (
                                            <button
                                                onClick={(e) => iniciarEliminacion(u, e)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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
                                    {(usuarioSeleccionado.nombre || 'U').charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-xl font-semibold">{usuarioSeleccionado.nombre}</h4>
                                    <p className="text-gray-500 capitalize flex items-center gap-2">
                                        {usuarioSeleccionado.rol}
                                        {(usuarioSeleccionado.rol === 'admin' || usuarioSeleccionado.rol === 'vendedor' || usuarioSeleccionado.rol === 'mecanico' || usuarioSeleccionado.rol === 'dueno') && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200 uppercase font-bold">
                                                {usuarioSeleccionado.sede || (usuarioSeleccionado.rol === 'dueno' ? 'Global' : 'Sin Asignar')}
                                            </span>
                                        )}
                                    </p>
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
                                disabled={advertenciaEliminar?.tipo === 'critico'}
                                className={`flex-1 font-medium py-2 px-4 rounded-lg transition-all ${advertenciaEliminar?.tipo === 'critico'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100'}`}
                            >
                                {advertenciaEliminar?.tipo === 'critico' ? 'Bloqueado' : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nuevo Modal de Verificación de Rol */}
            {verificacionRol && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="mb-6">
                            <h3 className={`text-xl font-bold mb-2 ${verificacionRol.rol === 'cliente' ? 'text-red-600' : 'text-gray-900'}`}>
                                {verificacionRol.rol === 'cliente' ? '¿Degradar Usuario?' : 'Confirmar Cambio de Rol'}
                            </h3>
                            <p className="text-gray-600">
                                {verificacionRol.rol === 'cliente' ? (
                                    <>
                                        ¿Estás seguro que deseas quitarle el rol de <strong>{verificacionRol.u.rol.toUpperCase()}</strong> y dejarlo como <strong>CLIENTE</strong>?
                                    </>
                                ) : (
                                    <>
                                        ¿Estás seguro que deseas cambiar el rol actual del usuario a <strong>{verificacionRol.rol.toUpperCase()}</strong>?
                                    </>
                                )}
                            </p>
                            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p><strong>Nombre:</strong> {verificacionRol.u.nombre}</p>
                                <p><strong>DNI:</strong> {verificacionRol.u.numeroDocumento || verificacionRol.u.numero_documento || 'No Registrado'}</p>
                                <p className="text-sm text-gray-500 mt-1">Rol actual: {verificacionRol.u.rol}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Boton variante="secundario" onClick={() => setVerificacionRol(null)} className="flex-1">
                                Cancelar
                            </Boton>
                            <Boton variante="primario" onClick={procederCambioRol} className="flex-1">
                                Sí, Asignar Rol
                            </Boton>
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
                            <Boton variante="primario" onClick={confirmarCambioRolConSede} className="flex-1">Confirmar</Boton>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulario (Nuevo / Editar) */}
            {mostrarModalFormulario && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">
                                {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button onClick={() => setMostrarModalFormulario(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleGuardarUsuario} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.nombre}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.email}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, email: e.target.value })}
                                    />
                                </div>
                                {!modoEdicion && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                        <input
                                            type="password"
                                            required={!modoEdicion}
                                            placeholder="Mínimo 6 caracteres"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={datosFormUsuario.password}
                                            onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.rol}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, rol: e.target.value })}
                                    >
                                        <option value="cliente">Cliente</option>
                                        <option value="vendedor">Vendedor</option>
                                        <option value="mecanico">Mecánico</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                {(datosFormUsuario.rol === 'admin' || datosFormUsuario.rol === 'vendedor' || datosFormUsuario.rol === 'mecanico') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={datosFormUsuario.sede}
                                            onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, sede: e.target.value })}
                                            disabled={usuario.rol === 'admin' && modoEdicion} // Admin no puede cambiar sede de otros una vez creada? O sí?
                                        >
                                            <option value="costa">Sede Costa</option>
                                            <option value="rural">Sede Rural</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.telefono}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, telefono: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.tipoDocumento}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, tipoDocumento: e.target.value })}
                                    >
                                        <option value="DNI">DNI</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                        <option value="CE">Carnet de Extranjería</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={datosFormUsuario.numeroDocumento}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, numeroDocumento: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <Boton type="button" variante="secundario" onClick={() => setMostrarModalFormulario(false)} className="flex-1">
                                    Cancelar
                                </Boton>
                                <Boton type="submit" className="flex-1">
                                    {modoEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                                </Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;
