import React, { useContext, useState } from 'react';
import { Users, Search, Filter, Trash2, AlertTriangle, Plus, Pencil, Eye, UserCheck, ShieldAlert } from 'lucide-react';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { useNavigate } from 'react-router-dom';

const GestionUsuarios = () => {
    const { usuarios, cambiarRolUsuario, usuario, eliminarUsuario, actualizarPerfil, registrarUsuario } = useContext(ContextoAutenticacion);
    const { alquileres } = useContext(ContextoInventario);
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');
    const [filtroSede, setFiltroSede] = useState('todos');
    const esDueno = usuario.rol === 'dueno';
    const navigate = useNavigate();

    // Estados de Modales
    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    // Estados para Eliminación
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
    const [advertenciaEliminar, setAdvertenciaEliminar] = useState(null);

    // Estados para Cambio de Rol (Sede)
    const [mostrarModalRol, setMostrarModalRol] = useState(false);
    const [usuarioARol, setUsuarioARol] = useState(null);
    const [nuevoRol, setNuevoRol] = useState('');
    const [sedeRol, setSedeRol] = useState('costa');
    const [verificacionRol, setVerificacionRol] = useState(null);

    const [datosFormUsuario, setDatosFormUsuario] = useState({
        nombres: '',
        apellidos: '',
        email: '',
        password: '',
        rol: 'cliente',
        sede: 'costa',
        telefono: '',
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nacionalidad: 'Perú',
        direccion: '',
        fechaNacimiento: '',
        licenciaConducir: false
    });

    const usuariosFiltrados = usuarios.filter(u => {
        const nombreYApellidos = `${u.nombres || ''} ${u.apellidos || ''} ${u.nombre || ''}`.toLowerCase();
        const coincideBusqueda = nombreYApellidos.includes(busqueda.toLowerCase()) || (u.email || '').toLowerCase().includes(busqueda.toLowerCase());
        const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

        let coincideSede = true;
        if (filtroSede !== 'todos') {
            if (u.rol === 'admin' || u.rol === 'vendedor' || u.rol === 'mecanico') {
                coincideSede = u.sede === filtroSede;
            } else {
                coincideSede = false;
            }
        }

        if (!coincideBusqueda || !coincideRol || !coincideSede) return false;

        if (usuario.rol === 'admin') {
            // Un admin no debe ver a otros admins ni al dueño por seguridad y jerarquía
            return u.rol !== 'admin' && u.rol !== 'dueno';
        }

        if (usuario.rol === 'dueno') {
            return true; // El dueño ve todo
        }

        return true;
    });

    const abrirModalNuevo = () => {
        setModoEdicion(false);
        setDatosFormUsuario({
            nombres: '',
            apellidos: '',
            email: '',
            password: '',
            rol: 'cliente',
            sede: usuario.rol === 'admin' ? usuario.sede : 'costa',
            telefono: '',
            tipoDocumento: 'DNI',
            numeroDocumento: '',
            nacionalidad: 'Perú',
            direccion: '',
            fechaNacimiento: '',
            licenciaConducir: false
        });
        setMostrarModalFormulario(true);
    };

    const abrirModalEdicion = (u, e) => {
        if (e) e.stopPropagation();
        setModoEdicion(true);
        setUsuarioSeleccionado(u);
        setDatosFormUsuario({
            ...u,
            nombres: u.nombres || u.nombre?.split(' ')[0] || '',
            apellidos: u.apellidos || u.nombre?.split(' ').slice(1).join(' ') || '',
            password: '',
            licenciaConducir: !!u.licencia_conducir || !!u.licenciaConducir || false
        });
        setMostrarModalFormulario(true);
    };

    const handleGuardarUsuario = async (e) => {
        e.preventDefault();
        try {
            // Validación de un solo administrador por sede
            if (datosFormUsuario.rol === 'admin') {
                const adminExistente = usuarios.find(u =>
                    u.rol === 'admin' &&
                    u.sede === datosFormUsuario.sede &&
                    u.id !== usuarioSeleccionado?.id
                );
                if (adminExistente) {
                    alert(`⚠️ Operación Cancelada: Ya existe un Administrador Central asignado a la sede ${datosFormUsuario.sede.toUpperCase()}. Cada sede solo permite una jefatura administrativa.`);
                    return;
                }
            }

            const datosAEnviar = {
                ...datosFormUsuario,
                nombre: `${datosFormUsuario.nombres} ${datosFormUsuario.apellidos}`.trim()
            };

            if (modoEdicion) {
                await actualizarPerfil(usuarioSeleccionado.id, datosAEnviar);
                alert("✅ Registro actualizado con éxito.");
            } else {
                const resultado = await registrarUsuario(datosAEnviar);
                if (resultado === true) {
                    alert("✅ Usuario registrado en el sistema correctamente.");
                } else {
                    alert("❌ Error en el registro: " + resultado);
                }
            }
            setMostrarModalFormulario(false);
        } catch (error) {
            console.error("Error al guardar usuario:", error);
            alert("❌ Ocurrió un error crítico al procesar la solicitud.");
        }
    };

    const iniciarEliminacion = (u, e) => {
        e.stopPropagation();
        setUsuarioAEliminar(u);
        const alquileresActivos = alquileres.filter(a => (a.clienteId === u.id || a.vendedorId === u.id) && !['finalizado', 'cancelado', 'no_show'].includes(a.estado_id || a.estado));
        const historialCompleto = alquileres.filter(a => a.clienteId === u.id || a.vendedorId === u.id);

        if (alquileresActivos.length > 0) {
            setAdvertenciaEliminar({
                tipo: 'critico',
                mensaje: `¡CUIDADO! Este usuario tiene ${alquileresActivos.length} operaciones ACTIVAS.`
            });
        } else if (historialCompleto.length > 0) {
            setAdvertenciaEliminar({
                tipo: 'advertencia',
                mensaje: `Este usuario tiene un historial de ${historialCompleto.length} operaciones.`
            });
        } else {
            setAdvertenciaEliminar(null);
        }
        setMostrarModalEliminar(true);
    };

    const confirmarEliminacion = async () => {
        const exito = await eliminarUsuario(usuarioAEliminar.id);
        if (exito) setMostrarModalEliminar(false);
    };

    const abrirModalDetalle = (u) => {
        setUsuarioSeleccionado(u);
        setMostrarModalDetalle(true);
    };

    const procederCambioRol = () => {
        const { u, rol } = verificacionRol;
        setVerificacionRol(null);
        if (usuario.rol === 'admin' && (rol === 'vendedor' || rol === 'mecanico')) {
            cambiarRolUsuario(u.id, rol, usuario.sede);
        } else if (['admin', 'vendedor', 'mecanico'].includes(rol)) {
            setUsuarioARol(u);
            setNuevoRol(rol);
            setSedeRol('costa');
            setMostrarModalRol(true);
        } else {
            cambiarRolUsuario(u.id, rol);
        }
    };

    return (
        <div className="px-4 py-6 space-y-6">
            {/* Header / Filtros */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Users size={24} /></div>
                        Gestión de Usuarios
                    </h2>
                    <p className="text-sm text-gray-500 font-medium ml-12">Administra el personal y clientes de la plataforma</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
                        value={filtroRol}
                        onChange={(e) => setFiltroRol(e.target.value)}
                    >
                        <option value="todos">Todos los Roles</option>
                        {esDueno && <option value="dueno">Dueños</option>}
                        {esDueno && <option value="admin">Administradores</option>}
                        <option value="vendedor">Vendedores</option>
                        <option value="mecanico">Mecánicos</option>
                        <option value="cliente">Clientes</option>
                    </select>

                    {esDueno && (
                        <select
                            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
                            value={filtroSede}
                            onChange={(e) => setFiltroSede(e.target.value)}
                        >
                            <option value="todos">Todas las Sedes</option>
                            <option value="costa">🌊 Costa</option>
                            <option value="rural">🏔️ Rural</option>
                        </select>
                    )}

                    <Boton onClick={abrirModalNuevo} className="flex items-center gap-2 px-6 py-2 shadow-lg shadow-blue-200">
                        <Plus size={18} /> Nuevo
                    </Boton>
                </div>
            </div>

            {/* Tabla de Usuarios */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Usuario / Identidad</th>
                                <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Rol</th>
                                {esDueno && <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Ubicación</th>}
                                <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {usuariosFiltrados.length > 0 ? (
                                usuariosFiltrados.map(u => (
                                    <tr key={u.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                                                    ${u.rol === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                        u.rol === 'vendedor' ? 'bg-blue-100 text-blue-600' :
                                                            u.rol === 'mecanico' ? 'bg-orange-100 text-orange-600' :
                                                                u.rol === 'dueno' ? 'bg-amber-100 text-amber-600' :
                                                                    'bg-gray-100 text-gray-500'}`}>
                                                    {(u.nombres || u.nombre || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm leading-tight">{u.nombres} {u.apellidos || u.nombre}</p>
                                                    <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                                                ${u.rol === 'admin' ? 'bg-purple-100 text-purple-600 border border-purple-200' :
                                                    u.rol === 'vendedor' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                                                        u.rol === 'mecanico' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                                                            u.rol === 'dueno' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                                                'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {u.rol === 'dueno' ? 'Owner' : u.rol}
                                            </span>
                                        </td>
                                        {esDueno && (
                                            <td className="p-4 text-center font-bold text-xs text-gray-500">
                                                {u.sede ? (u.sede === 'costa' ? '🌊 Costa' : '🏔️ Rural') : '-'}
                                            </td>
                                        )}
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => abrirModalDetalle(u)} className="p-2 hover:bg-white rounded-lg text-blue-500 shadow-sm border border-transparent hover:border-blue-100" title="Ver Detalle"><Eye size={16} /></button>
                                                <button onClick={(e) => abrirModalEdicion(u, e)} className="p-2 hover:bg-white rounded-lg text-amber-500 shadow-sm border border-transparent hover:border-amber-100" title="Editar"><Pencil size={16} /></button>
                                                {u.rol !== 'dueno' && (
                                                    <button onClick={(e) => iniciarEliminacion(u, e)} className="p-2 hover:bg-white rounded-lg text-red-500 shadow-sm border border-transparent hover:border-red-100" title="Eliminar"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={esDueno ? 4 : 3} className="p-12 text-center text-gray-400 font-medium italic">
                                        No se encontraron usuarios con los filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Premium de Usuario (Insertado desde el anterior step) */}
            {mostrarModalFormulario && (
                <Modal
                    titulo={modoEdicion ? '📝 Editar Perfil de Usuario' : '✨ Registro de Nuevo Usuario'}
                    abierto={mostrarModalFormulario}
                    alCerrar={() => setMostrarModalFormulario(false)}
                    ancho="max-w-3xl"
                >
                    <form onSubmit={handleGuardarUsuario} className="space-y-6">
                        <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 mb-2">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                Información Personal (Identidad 3FN)
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nombres</label>
                                    <input
                                        required
                                        placeholder="Ej: Juan Antonio"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.nombres}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, nombres: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Apellidos</label>
                                    <input
                                        required
                                        placeholder="Ej: Pérez García"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.apellidos}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, apellidos: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tipo de Documento</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                                        value={datosFormUsuario.tipoDocumento}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, tipoDocumento: e.target.value })}
                                    >
                                        <option value="DNI">DNI (Documento Nacional)</option>
                                        <option value="PASAPORTE">Pasaporte Internacional</option>
                                        <option value="CE">Carnet de Extranjería</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Número de Documento</label>
                                    <input
                                        required
                                        placeholder="8 dígitos..."
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.numeroDocumento}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, numeroDocumento: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.fechaNacimiento}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, fechaNacimiento: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nacionalidad</label>
                                    <input
                                        placeholder="Ej: Peruana"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.nacionalidad}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, nacionalidad: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200/50">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Credenciales y Ubicación</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="usuario@ejemplo.com"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.email}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, email: e.target.value })}
                                    />
                                </div>

                                {!modoEdicion && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Contraseña de Seguridad</label>
                                        <input
                                            type="password"
                                            required={!modoEdicion}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                            value={datosFormUsuario.password}
                                            onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, password: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Teléfono Móvil</label>
                                    <input
                                        type="tel"
                                        placeholder="+51 999..."
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={datosFormUsuario.telefono}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, telefono: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Rol del Usuario</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                        value={datosFormUsuario.rol}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, rol: e.target.value })}
                                    >
                                        <option value="cliente">Cliente (Usuario Final)</option>
                                        <option value="vendedor">Vendedor (Sede)</option>
                                        <option value="mecanico">Mecánicos (Técnicos)</option>
                                        {esDueno && (
                                            <option value="admin">Administrador Central</option>
                                        )}
                                    </select>
                                </div>

                                {(datosFormUsuario.rol === 'admin' || datosFormUsuario.rol === 'vendedor' || datosFormUsuario.rol === 'mecanico') && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Sede Asignada</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            value={datosFormUsuario.sede}
                                            onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, sede: e.target.value })}
                                            disabled={usuario.rol === 'admin' && modoEdicion}
                                        >
                                            <option value="costa">🌊 Sede Costa</option>
                                            <option value="rural">🏔️ Sede Rural</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Dirección de Residencia</label>
                                <textarea
                                    rows="2"
                                    placeholder="Ej: Av. Brasil 1234, Lima..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                                    value={datosFormUsuario.direccion}
                                    onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, direccion: e.target.value })}
                                />
                            </div>

                            {(datosFormUsuario.rol === 'cliente' || datosFormUsuario.rol === 'mecanico') && (
                                <label className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-100 rounded-2xl cursor-pointer hover:bg-green-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 rounded-lg"
                                        checked={datosFormUsuario.licenciaConducir}
                                        onChange={(e) => setDatosFormUsuario({ ...datosFormUsuario, licenciaConducir: e.target.checked })}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-green-800">Cuenta con Licencia de Conducir</span>
                                        <span className="text-[10px] text-green-600 font-medium">Habilita el alquiler de vehículos motorizados</span>
                                    </div>
                                </label>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setMostrarModalFormulario(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
                            >
                                Cancelar
                            </button>
                            <Boton type="submit" className="flex-1 shadow-lg shadow-blue-500/20 py-3">
                                {modoEdicion ? 'Actualizar Perfil' : '✨ Crear Usuario Completo'}
                            </Boton>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal de Detalle */}
            {mostrarModalDetalle && usuarioSeleccionado && (
                <Modal
                    titulo="Detalles del Perfil"
                    abierto={mostrarModalDetalle}
                    alCerrar={() => setMostrarModalDetalle(false)}
                    ancho="max-w-xl"
                >
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center text-3xl font-black">
                                {(usuarioSeleccionado.nombres || usuarioSeleccionado.nombre || 'U').charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">{usuarioSeleccionado.nombres} {usuarioSeleccionado.apellidos || usuarioSeleccionado.nombre}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-3 py-1 bg-gray-100 text-[10px] font-black uppercase text-gray-500 rounded-lg border border-gray-200">{usuarioSeleccionado.rol}</span>
                                    {usuarioSeleccionado.sede && <span className="text-xs text-blue-500 font-bold">📍 Sede {usuarioSeleccionado.sede}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase">Identificación</p>
                                <p className="text-sm font-bold text-gray-700">{usuarioSeleccionado.tipoDocumento} - {usuarioSeleccionado.numeroDocumento}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase">Contacto</p>
                                <p className="text-sm font-bold text-gray-700">{usuarioSeleccionado.email}</p>
                                <p className="text-xs text-gray-500">{usuarioSeleccionado.telefono || 'Sin teléfono'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase">Nacionalidad</p>
                                <p className="text-sm font-bold text-gray-700">{usuarioSeleccionado.nacionalidad || 'Perú'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase">Nacimiento</p>
                                <p className="text-sm font-bold text-gray-700">{usuarioSeleccionado.fechaNacimiento || 'No registrada'}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                            <p className="text-xs font-medium text-gray-600 leading-relaxed">{usuarioSeleccionado.direccion || 'Dirección no especificada'}</p>
                        </div>

                        <div className={`p-4 rounded-2xl border flex items-center gap-4 ${usuarioSeleccionado.licenciaConducir ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`p-2 rounded-xl ${usuarioSeleccionado.licenciaConducir ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <p className={`font-black text-sm ${usuarioSeleccionado.licenciaConducir ? 'text-green-700' : 'text-red-700'}`}>
                                    {usuarioSeleccionado.licenciaConducir ? 'Licencia Habilitada' : 'Sin Licencia Válida'}
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium">Estado obligatorio para conductores de vehículos motorizados</p>
                            </div>
                        </div>

                        <Boton onClick={() => setMostrarModalDetalle(false)} variante="secundario" className="w-full py-3">Cerrar Detalle</Boton>
                    </div>
                </Modal>
            )}

            {/* Modal de Eliminación */}
            {mostrarModalEliminar && usuarioAEliminar && (
                <Modal
                    titulo="⚠️ Confirmar Eliminación"
                    abierto={mostrarModalEliminar}
                    alCerrar={() => setMostrarModalEliminar(false)}
                    ancho="max-w-md"
                >
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="p-4 bg-red-100 text-red-600 rounded-full animate-bounce"><Trash2 size={32} /></div>
                            <h4 className="text-xl font-black text-gray-800">¿Estás seguro?</h4>
                            <p className="text-sm text-gray-500">
                                Vas a eliminar permanentemente a <span className="font-bold text-gray-800">{usuarioAEliminar.nombres} {usuarioAEliminar.apellidos}</span>.
                            </p>
                        </div>

                        {advertenciaEliminar && (
                            <div className={`p-4 rounded-xl border flex gap-3 ${advertenciaEliminar.tipo === 'critico' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                <ShieldAlert className="shrink-0" size={20} />
                                <p className="text-xs font-bold leading-relaxed">{advertenciaEliminar.mensaje}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setMostrarModalEliminar(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button
                                onClick={confirmarEliminacion}
                                disabled={advertenciaEliminar?.tipo === 'critico'}
                                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-lg
                                    ${advertenciaEliminar?.tipo === 'critico' ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Sede */}
            {mostrarModalRol && usuarioARol && (
                <Modal
                    titulo="📍 Asignar Sede de Operaciones"
                    abierto={mostrarModalRol}
                    alCerrar={() => setMostrarModalRol(false)}
                    ancho="max-w-md"
                >
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500 font-medium text-center">
                            Selecciona la sede principal donde <span className="font-bold text-gray-800">{usuarioARol.nombres}</span> desempeñará su labor como <span className="uppercase text-blue-600 font-black">{nuevoRol}</span>.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSedeRol('costa')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                                    ${sedeRol === 'costa' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                                <span className={`text-2xl transition-transform group-hover:scale-110 ${sedeRol === 'costa' ? 'grayscale-0' : 'grayscale text-gray-300'}`}>🌊</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${sedeRol === 'costa' ? 'text-blue-600' : 'text-gray-400'}`}>Sede Costa</span>
                            </button>
                            <button
                                onClick={() => setSedeRol('rural')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
                                    ${sedeRol === 'rural' ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                                <span className={`text-2xl transition-transform group-hover:scale-110 ${sedeRol === 'rural' ? 'grayscale-0' : 'grayscale text-gray-300'}`}>🏔️</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${sedeRol === 'rural' ? 'text-amber-600' : 'text-gray-400'}`}>Sede Rural</span>
                            </button>
                        </div>

                        <Boton onClick={() => {
                            cambiarRolUsuario(usuarioARol.id, nuevoRol, sedeRol);
                            setMostrarModalRol(false);
                        }} className="w-full py-4 shadow-xl shadow-blue-100">Confirmar Asignación</Boton>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default GestionUsuarios;
