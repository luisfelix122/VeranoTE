import React, { useContext, useState, useEffect } from 'react';
import { Settings, User, CreditCard, Calendar, Briefcase, MapPin, Phone, Shield, Trash2, Plus, Lock } from 'lucide-react';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { obtenerTarjetas, agregarTarjeta, eliminarTarjeta, obtenerPerfilAlquileres, obtenerPerfilSoporte, registrarPagoSaldoDB } from '../services/db';
import Boton from '../components/ui/Boton';

const Perfil = () => {
    const [modalPassword, setModalPassword] = useState(false);
    const [passActual, setPassActual] = useState('');
    const [passNueva, setPassNueva] = useState('');
    const [passConfirm, setPassConfirm] = useState('');
    const { usuario, actualizarPerfil, actualizarPassword } = useContext(ContextoAutenticacion);
    const [datos, setDatos] = useState({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        tipoDocumento: usuario.tipoDocumento || 'DNI',
        numeroDocumento: usuario.numeroDocumento || '',
        fechaNacimiento: usuario.fechaNacimiento || '',
        nacionalidad: usuario.nacionalidad || 'Nacional',
        licenciaConducir: usuario.licenciaConducir || false,
        direccion: usuario.direccion || '',
        contactoEmergencia: usuario.contactoEmergencia || '',
        codigoEmpleado: usuario.codigoEmpleado || '',
        turno: usuario.turno || 'Mañana',
        especialidad: usuario.especialidad || '',
        experiencia: usuario.experiencia || '',
        anexo: usuario.anexo || '',
        oficina: usuario.oficina || ''
    });

    const [tarjetas, setTarjetas] = useState([]);
    const [cargandoTarjetas, setCargandoTarjetas] = useState(false);
    const [mostrarModalTarjeta, setMostrarModalTarjeta] = useState(false);
    const [nuevaTarjeta, setNuevaTarjeta] = useState({ numero: '', exp: '', cvv: '', nombre: '' });
    const [historialAlquileres, setHistorialAlquileres] = useState([]);
    const [historialSoporte, setHistorialSoporte] = useState([]);

    useEffect(() => {
        if (usuario?.id && usuario.rol === 'cliente') {
            cargarTarjetas();
            cargarHistorial();
        }
        // Sincronizar formulario si el usuario cambia (ej. al guardar)
        if (usuario) {
            setDatos({
                nombre: usuario.nombre || '',
                email: usuario.email || '',
                telefono: usuario.telefono || '',
                tipoDocumento: usuario.tipoDocumento || 'DNI',
                numeroDocumento: usuario.numero_documento || usuario.numeroDocumento || '', // Handle snake_case or camelCase fallback
                fechaNacimiento: usuario.fecha_nacimiento || usuario.fechaNacimiento || '',
                nacionalidad: usuario.nacionalidad || 'Nacional',
                licenciaConducir: usuario.licencia_conducir || usuario.licenciaConducir || false,
                direccion: usuario.direccion || '',
                contactoEmergencia: usuario.contacto_emergencia || usuario.contactoEmergencia || '',
                codigoEmpleado: usuario.codigo_empleado || usuario.codigoEmpleado || '',
                turno: usuario.turno || 'Mañana',
                especialidad: usuario.especialidad || '',
                experiencia: usuario.experiencia || '',
                anexo: usuario.anexo || '',
                oficina: usuario.oficina || ''
            });
        }
    }, [usuario]);

    const cargarTarjetas = async () => {
        setCargandoTarjetas(true);
        const data = await obtenerTarjetas(usuario.id);
        setTarjetas(data);
        setCargandoTarjetas(false);
    };

    const cargarHistorial = async () => {
        const alq = await obtenerPerfilAlquileres(usuario.id);
        setHistorialAlquileres(alq);
        const sop = await obtenerPerfilSoporte(usuario.id);
        setHistorialSoporte(sop);
    };

    const manejarCambioTarjeta = (e) => {
        setNuevaTarjeta({ ...nuevaTarjeta, [e.target.name]: e.target.value });
    };

    const guardarTarjetaHandler = async (e) => {
        e.preventDefault();
        if (!nuevaTarjeta.numero || !nuevaTarjeta.exp || !nuevaTarjeta.cvv || !nuevaTarjeta.nombre) {
            alert('Por favor complete todos los campos de la tarjeta.');
            return;
        }

        const tarjetaParaGuardar = {
            nombre: nuevaTarjeta.nombre,
            numero: nuevaTarjeta.numero.slice(-4), // Solo guardamos los últimos 4 para mostrar (en DB se guarda lo que mandemos, pero simulado)
            exp: nuevaTarjeta.exp,
            principal: tarjetas.length === 0
        };

        const resultado = await agregarTarjeta(usuario.id, tarjetaParaGuardar);

        if (resultado.success) {
            alert('Tarjeta agregada correctamente.');
            setMostrarModalTarjeta(false);
            setNuevaTarjeta({ numero: '', exp: '', cvv: '', nombre: '' });
            cargarTarjetas();
        } else {
            alert('Error al agregar tarjeta.');
        }
    };

    const eliminarTarjetaHandler = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta tarjeta?')) {
            const resultado = await eliminarTarjeta(id);
            if (resultado.success) {
                cargarTarjetas();
            } else {
                alert('Error al eliminar tarjeta.');
            }
        }
    };

    const guardarCambios = (e) => {
        e.preventDefault();
        actualizarPerfil(usuario.id, datos);
        alert('Perfil actualizado correctamente.');
    };

    const renderCamposPorRol = () => {
        switch (usuario.rol) {
            case 'cliente':
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3">
                            <MapPin className="text-blue-500" size={20} /> Dirección y Contacto
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección de Domicilio</label>
                                <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={datos.direccion} onChange={e => setDatos({ ...datos, direccion: e.target.value })} placeholder="Av. Principal 123, Dpto 401" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Contacto de Emergencia</label>
                                <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={datos.contactoEmergencia} onChange={e => setDatos({ ...datos, contactoEmergencia: e.target.value })} placeholder="Nombre - Teléfono" />
                            </div>
                        </div>
                    </div>
                );
            // ... (otros roles simplificados para brevedad, mantener lógica similar si se requiere)
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header del Perfil */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg mb-8 flex items-center gap-6">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                    {usuario.nombre.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{usuario.nombre}</h1>
                    <p className="text-blue-100 capitalize text-lg flex items-center gap-2">
                        <Shield size={18} /> {usuario.rol}
                    </p>
                    <p className="text-blue-200 text-sm mt-1">{usuario.email}</p>
                </div>
            </div>

            <form onSubmit={guardarCambios} className="space-y-8">

                {/* Datos Personales */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3">
                        <User className="text-blue-500" size={20} /> Información Personal
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
                            <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                            <input className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Condición</label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={['Perú', 'Nacional', 'Peruana'].includes(datos.nacionalidad) ? 'Peruana' : 'Extranjera'}
                                onChange={e => {
                                    const esNacional = e.target.value === 'Peruana';
                                    setDatos({
                                        ...datos,
                                        nacionalidad: esNacional ? 'Perú' : 'Argentina',
                                        tipoDocumento: esNacional ? 'DNI' : 'Pasaporte'
                                    });
                                }}
                            >
                                <option value="Peruana">Peruana</option>
                                <option value="Extranjera">Extranjera</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">País</label>
                            {['Perú', 'Nacional', 'Peruana'].includes(datos.nacionalidad) ? (
                                <input disabled className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 font-medium" value="Perú" />
                            ) : (
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={datos.nacionalidad}
                                    onChange={e => setDatos({ ...datos, nacionalidad: e.target.value })}
                                >
                                    <option value="Argentina">Argentina</option>
                                    <option value="Bolivia">Bolivia</option>
                                    <option value="Brasil">Brasil</option>
                                    <option value="Canadá">Canadá</option>
                                    <option value="Chile">Chile</option>
                                    <option value="China">China</option>
                                    <option value="Colombia">Colombia</option>
                                    <option value="Ecuador">Ecuador</option>
                                    <option value="España">España</option>
                                    <option value="Estados Unidos">Estados Unidos</option>
                                    <option value="Francia">Francia</option>
                                    <option value="Italia">Italia</option>
                                    <option value="Japón">Japón</option>
                                    <option value="México">México</option>
                                    <option value="Paraguay">Paraguay</option>
                                    <option value="Reino Unido">Reino Unido</option>
                                    <option value="Uruguay">Uruguay</option>
                                    <option value="Venezuela">Venezuela</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Identificación */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3">
                        <CreditCard className="text-blue-500" size={20} /> Documentación
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo Documento</label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 bg-opacity-50"
                                value={datos.tipoDocumento}
                                onChange={e => setDatos({ ...datos, tipoDocumento: e.target.value })}
                                disabled={datos.nacionalidad === 'Nacional'} // Nacional -> Bloqueado en DNI
                            >
                                <option value="DNI">DNI</option>
                                <option value="Pasaporte">Pasaporte</option>
                                <option value="CE">Carné Extranjería</option>
                                <option value="PTP">PTP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                {datos.tipoDocumento === 'DNI' ? 'Número de DNI' : 'N° de Documento / Pasaporte'}
                            </label>
                            <input
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={datos.numeroDocumento}
                                onChange={e => {
                                    // Validación simple: Si es DNI solo números
                                    const val = e.target.value;
                                    if (datos.tipoDocumento === 'DNI' && !/^\d*$/.test(val)) return;
                                    setDatos({ ...datos, numeroDocumento: val });
                                }}
                                maxLength={datos.tipoDocumento === 'DNI' ? 8 : 20}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Nacimiento</label>
                            <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={datos.fechaNacimiento} onChange={e => setDatos({ ...datos, fechaNacimiento: e.target.value })} />
                        </div>
                    </div>
                </div>

                {renderCamposPorRol()}

                {/* Tarjetas (Solo Clientes) */}
                {usuario.rol === 'cliente' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <CreditCard className="text-blue-500" size={20} /> Métodos de Pago
                            </h3>
                            <button type="button" onClick={() => setMostrarModalTarjeta(true)} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1">
                                <Plus size={16} /> Nueva Tarjeta
                            </button>
                        </div>

                        {cargandoTarjetas ? (
                            <p className="text-gray-500 text-sm">Cargando tarjetas...</p>
                        ) : (
                            <div className="grid gap-4">
                                {tarjetas.length === 0 && <p className="text-gray-500 text-sm italic">No tienes tarjetas guardadas.</p>}
                                {tarjetas.map(tarjeta => (
                                    <div key={tarjeta.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600"><CreditCard size={24} /></div>
                                            <div>
                                                <p className="font-bold text-gray-800">•••• •••• •••• {tarjeta.numero_oculto?.slice(-4) || '****'}</p>
                                                <p className="text-xs text-gray-500">Expira: {tarjeta.expiracion} | {tarjeta.titular}</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => eliminarTarjetaHandler(tarjeta.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Seguridad */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3">
                        <Lock className="text-blue-500" size={20} /> Seguridad
                    </h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Contraseña</p>
                            <p className="text-sm text-gray-500">Se recomienda cambiarla periódicamente.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setPassActual('');
                                setPassNueva('');
                                setPassConfirm('');
                                setModalPassword(true);
                            }}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cambiar Contraseña
                        </button>
                    </div>
                </div>

                {/* Historial de Actividad (Solo Clientes) */}
                {usuario.rol === 'cliente' && (
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Historial de Alquileres */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3 mb-4">
                                <Briefcase className="text-blue-500" size={20} /> Historial de Alquileres
                            </h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {historialAlquileres.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">No hay alquileres registrados.</p>
                                ) : (
                                    historialAlquileres.map(h => (
                                        <div key={h.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                                            <img src={h.producto_imagen || '/assets/placeholder.png'} alt="Prod" className="w-12 h-12 rounded-md object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 truncate">{h.producto_nombre || 'Varios'}</p>
                                                <div className="flex items-center text-xs text-gray-500 gap-1">
                                                    <span>{new Date(h.fecha_inicio).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${h.estado === 'Confirmado' ? 'bg-green-100 text-green-700' :
                                                        h.estado === 'Pendiente' || h.estado === 'Pendiente de Pago' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>{h.estado}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div>
                                                    <p className="font-bold text-sm text-blue-600">Total: S/ {h.total_final}</p>
                                                    {Number(h.saldo_pendiente) > 0 ? (
                                                        <p className="text-[10px] text-red-500 font-bold">Pendiente: S/ {h.saldo_pendiente}</p>
                                                    ) : (
                                                        <p className="text-[10px] text-green-500 font-bold">Totalmente Pagado</p>
                                                    )}
                                                </div>

                                                {/* Botón de Acción para Pagar Deuda */}
                                                {Number(h.saldo_pendiente) > 0 && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`¿Deseas pagar la deuda de S/ ${h.saldo_pendiente} usando tu tarjeta predeterminada?`)) {
                                                                const res = await registrarPagoSaldoDB(h.id);
                                                                if (res) {
                                                                    alert("¡Pago registrado con éxito! Tu deuda ha quedado saldada.");
                                                                    cargarHistorial();
                                                                } else {
                                                                    alert("Error al procesar el pago. Inténtalo nuevamente.");
                                                                }
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1 animate-pulse"
                                                    >
                                                        <CreditCard size={12} /> Pagar S/ {h.saldo_pendiente}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Historial de Consultas */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3 mb-4">
                                <Phone className="text-blue-500" size={20} /> Historial de Consultas
                            </h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {historialSoporte.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">No hay consultas registradas.</p>
                                ) : (
                                    historialSoporte.map(t => (
                                        <div key={t.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-bold text-gray-800 text-sm">{t.asunto}</p>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.estado === 'abierto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>{t.estado}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{t.mensaje}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 text-right">{new Date(t.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Permisos */}
                {(usuario.rol === 'cliente' || usuario.rol === 'mecanico') && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-3">
                            <Calendar className="text-blue-500" size={20} /> Permisos
                        </h3>
                        <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <input
                                type="checkbox"
                                id="licencia"
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                checked={datos.licenciaConducir}
                                onChange={e => setDatos({ ...datos, licenciaConducir: e.target.checked })}
                            />
                            <label htmlFor="licencia" className="text-sm font-medium text-gray-800 cursor-pointer">
                                Declaro tener Licencia de Conducir Vigente (Requerido para vehículos motorizados)
                            </label>
                        </div>
                    </div>
                )}

                <div className="pt-6">
                    <Boton type="submit" variante="primario" className="w-full py-4 text-lg font-bold shadow-lg shadow-blue-500/30">
                        Guardar Todos los Cambios
                    </Boton>
                </div>
            </form>

            {/* Modal Agregar Tarjeta */}
            {mostrarModalTarjeta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900">Agregar Nueva Tarjeta</h3>
                        <form onSubmit={guardarTarjetaHandler} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre en la Tarjeta</label>
                                <input type="text" name="nombre" value={nuevaTarjeta.nombre} onChange={manejarCambioTarjeta} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Juan Perez" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Número de Tarjeta</label>
                                <input type="text" name="numero" value={nuevaTarjeta.numero} onChange={manejarCambioTarjeta} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0000 0000 0000 0000" maxLength="19" />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Expiración</label>
                                    <input type="text" name="exp" value={nuevaTarjeta.exp} onChange={manejarCambioTarjeta} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="MM/YY" maxLength="5" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">CVV</label>
                                    <input type="text" name="cvv" value={nuevaTarjeta.cvv} onChange={manejarCambioTarjeta} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123" maxLength="4" />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setMostrarModalTarjeta(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Cambiar Contraseña */}
            {modalPassword && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                            <Shield size={24} className="text-blue-600" />
                            Cambiar Contraseña
                        </h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (passNueva !== passConfirm) {
                                alert("Las contraseñas nuevas no coinciden.");
                                return;
                            }
                            if (passNueva.length < 6) {
                                alert("La contraseña debe tener al menos 6 caracteres.");
                                return;
                            }

                            const res = await actualizarPassword(usuario.id, passActual, passNueva);
                            if (res.exito) {
                                alert(res.mensaje);
                                setModalPassword(false);
                            } else {
                                alert(res.mensaje);
                            }
                        }} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña Actual</label>
                                <input required type="password" value={passActual} onChange={e => setPassActual(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nueva Contraseña</label>
                                <input required type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Confirmar Nueva Contraseña</label>
                                <input required type="password" value={passConfirm} onChange={e => setPassConfirm(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setModalPassword(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfil;
