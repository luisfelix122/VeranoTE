import React, { useContext, useState } from 'react';
import { Settings, User, CreditCard, Calendar, Briefcase, MapPin, Phone, Shield } from 'lucide-react';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';

const Perfil = () => {
    const { usuario, actualizarPerfil } = useContext(ContextoAutenticacion);
    const [datos, setDatos] = useState({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        tipoDocumento: usuario.tipoDocumento || 'DNI',
        numeroDocumento: usuario.numeroDocumento || '',
        fechaNacimiento: usuario.fechaNacimiento || '',
        nacionalidad: usuario.nacionalidad || 'Nacional',
        licenciaConducir: usuario.licenciaConducir || false,
        // Campos adicionales
        direccion: usuario.direccion || '',
        contactoEmergencia: usuario.contactoEmergencia || '',
        codigoEmpleado: usuario.codigoEmpleado || '',
        turno: usuario.turno || 'Mañana',
        especialidad: usuario.especialidad || '',
        experiencia: usuario.experiencia || '',
        anexo: usuario.anexo || '',
        oficina: usuario.oficina || ''
    });

    const [tarjetas, setTarjetas] = useState([
        { id: 1, numero: '4242', exp: '12/28', principal: true }
    ]);

    const [mostrarModalTarjeta, setMostrarModalTarjeta] = useState(false);
    const [nuevaTarjeta, setNuevaTarjeta] = useState({ numero: '', exp: '', cvv: '', nombre: '' });

    const manejarCambioTarjeta = (e) => {
        setNuevaTarjeta({ ...nuevaTarjeta, [e.target.name]: e.target.value });
    };

    const guardarTarjeta = (e) => {
        e.preventDefault();
        if (!nuevaTarjeta.numero || !nuevaTarjeta.exp || !nuevaTarjeta.cvv || !nuevaTarjeta.nombre) {
            alert('Por favor complete todos los campos de la tarjeta.');
            return;
        }
        const tarjeta = {
            id: Date.now(),
            numero: nuevaTarjeta.numero.slice(-4),
            exp: nuevaTarjeta.exp,
            principal: tarjetas.length === 0
        };
        setTarjetas([...tarjetas, tarjeta]);
        setMostrarModalTarjeta(false);
        setNuevaTarjeta({ numero: '', exp: '', cvv: '', nombre: '' });
        alert('Tarjeta agregada correctamente.');
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
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><MapPin size={18} /> Dirección y Contacto</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Domicilio</label><input className="w-full p-2 border rounded" value={datos.direccion} onChange={e => setDatos({ ...datos, direccion: e.target.value })} placeholder="Av. Principal 123, Dpto 401" /></div>
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Contacto de Emergencia (Nombre y Teléfono)</label><input className="w-full p-2 border rounded" value={datos.contactoEmergencia} onChange={e => setDatos({ ...datos, contactoEmergencia: e.target.value })} placeholder="Maria Perez - 999111222" /></div>
                        </div>
                    </div>
                );
            case 'vendedor':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><Briefcase size={18} /> Información Laboral</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Código de Empleado</label><input className="w-full p-2 border rounded bg-gray-50" value={datos.codigoEmpleado} disabled /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Turno Asignado</label>
                                <select className="w-full p-2 border rounded" value={datos.turno} onChange={e => setDatos({ ...datos, turno: e.target.value })}>
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Completo">Completo</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sede Asignada</label><input className="w-full p-2 border rounded bg-gray-50 capitalize" value={usuario.sede || 'No asignada'} disabled /></div>
                        </div>
                    </div>
                );
            case 'mecanico':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><WrenchIcon size={18} /> Perfil Técnico</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label><input className="w-full p-2 border rounded" value={datos.especialidad} onChange={e => setDatos({ ...datos, especialidad: e.target.value })} placeholder="Ej. Motores, Eléctrico" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Años de Experiencia</label><input className="w-full p-2 border rounded" value={datos.experiencia} onChange={e => setDatos({ ...datos, experiencia: e.target.value })} placeholder="Ej. 5 años" /></div>
                        </div>
                    </div>
                );
            case 'admin':
            case 'dueno':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><Shield size={18} /> Datos Corporativos</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Anexo Interno</label><input className="w-full p-2 border rounded" value={datos.anexo} onChange={e => setDatos({ ...datos, anexo: e.target.value })} placeholder="Ej. 101" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Oficina / Ubicación</label><input className="w-full p-2 border rounded" value={datos.oficina} onChange={e => setDatos({ ...datos, oficina: e.target.value })} placeholder="Ej. Administración Central" /></div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Helper icon for mechanic
    const WrenchIcon = ({ size }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-8 border-b pb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {usuario.nombre.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
                        <p className="text-gray-500 capitalize">{usuario.rol}</p>
                    </div>
                </div>

                <form onSubmit={guardarCambios} className="space-y-8">

                    {/* Datos Personales Comunes */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><User size={18} /> Datos Personales</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input className="w-full p-2 border rounded" value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input className="w-full p-2 border rounded bg-gray-50" value={datos.email} disabled /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input className="w-full p-2 border rounded" value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
                                <select className="w-full p-2 border rounded" value={datos.nacionalidad} onChange={e => setDatos({ ...datos, nacionalidad: e.target.value })}>
                                    <option value="Nacional">Nacional</option>
                                    <option value="Extranjero">Extranjero</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Identificación Legal Común */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><CreditCard size={18} /> Identificación Legal</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                                <select className="w-full p-2 border rounded" value={datos.tipoDocumento} onChange={e => setDatos({ ...datos, tipoDocumento: e.target.value })}>
                                    <option value="DNI">DNI</option>
                                    <option value="Pasaporte">Pasaporte</option>
                                    <option value="CE">Carné Extranjería</option>
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Número Documento</label><input className="w-full p-2 border rounded" value={datos.numeroDocumento} onChange={e => setDatos({ ...datos, numeroDocumento: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label><input type="date" className="w-full p-2 border rounded" value={datos.fechaNacimiento} onChange={e => setDatos({ ...datos, fechaNacimiento: e.target.value })} /></div>
                        </div>
                    </div>

                    {/* Campos Específicos por Rol */}
                    {renderCamposPorRol()}

                    {/* Sección de Tarjetas (Solo Clientes) */}
                    {usuario.rol === 'cliente' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><CreditCard size={18} /> Métodos de Pago</h3>
                            <div className="space-y-3">
                                {tarjetas.map(tarjeta => (
                                    <div key={tarjeta.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded text-blue-600"><CreditCard size={20} /></div>
                                            <div>
                                                <p className="font-medium text-sm">Visa terminada en {tarjeta.numero}</p>
                                                <p className="text-xs text-gray-500">Expira {tarjeta.exp}</p>
                                            </div>
                                        </div>
                                        {tarjeta.principal && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Principal</span>}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalTarjeta(true)}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    + Agregar Nueva Tarjeta
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Permisos (Clientes y Mecánicos) */}
                    {(usuario.rol === 'cliente' || usuario.rol === 'mecanico') && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700 border-b pb-2"><Calendar size={18} /> Permisos y Licencias</h3>
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="licencia"
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    checked={datos.licenciaConducir}
                                    onChange={e => setDatos({ ...datos, licenciaConducir: e.target.checked })}
                                />
                                <label htmlFor="licencia" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Tengo Licencia de Conducir Vigente (Requerido para vehículos motorizados)
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <Boton type="submit" variante="primario" className="w-full py-3 text-lg">Guardar Cambios</Boton>
                    </div>
                </form>
            </div>

            {/* Modal Agregar Tarjeta */}
            {mostrarModalTarjeta && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Agregar Nueva Tarjeta</h3>
                        <form onSubmit={guardarTarjeta} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en la Tarjeta</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={nuevaTarjeta.nombre}
                                    onChange={manejarCambioTarjeta}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="Juan Perez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Tarjeta</label>
                                <input
                                    type="text"
                                    name="numero"
                                    value={nuevaTarjeta.numero}
                                    onChange={manejarCambioTarjeta}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="0000 0000 0000 0000"
                                    maxLength="16"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiración (MM/YY)</label>
                                    <input
                                        type="text"
                                        name="exp"
                                        value={nuevaTarjeta.exp}
                                        onChange={manejarCambioTarjeta}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="12/25"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                                    <input
                                        type="text"
                                        name="cvv"
                                        value={nuevaTarjeta.cvv}
                                        onChange={manejarCambioTarjeta}
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="123"
                                        maxLength="3"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Boton type="button" variante="secundario" onClick={() => setMostrarModalTarjeta(false)} className="flex-1">Cancelar</Boton>
                                <Boton type="submit" variante="primario" className="flex-1">Guardar Tarjeta</Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfil;
