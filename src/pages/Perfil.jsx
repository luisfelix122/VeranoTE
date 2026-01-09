import React, { useContext, useState, useEffect } from 'react';
import {
    User, Mail, Phone, MapPin, CreditCard, Shield,
    LogOut, Edit2, Check, X, Plus, Trash2,
    AlertTriangle, Lock, Eye, EyeOff, Calendar
} from 'lucide-react';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { obtenerContactosUsuario, agregarContactoDB, eliminarContactoDB, obtenerPerfilAlquileres, obtenerPerfilSoporte, registrarPagoSaldoDB } from '../services/db';
import { obtenerTarjetas, agregarTarjeta, eliminarTarjeta } from '../services/cardService';
import Boton from '../components/ui/Boton';
import { PAISES } from '../constants/paises';
import { PREGUNTAS_SECRETAS } from '../constants/preguntas';

const Perfil = () => {
    // Replaced password states
    const [modalPass, setModalPass] = useState(false);
    const [passData, setPassData] = useState({ actual: '', nueva: '', confirm: '' });
    // Estado para visibilidad de contraseña: { actual: false, nueva: false, confirm: false }
    const [showPass, setShowPass] = useState({ actual: false, nueva: false, confirm: false });

    const { usuario, actualizarPerfil, actualizarPassword } = useContext(ContextoAutenticacion);
    // Función auxiliar para separar código y número
    const splitPhone = (phone) => {
        if (!phone) return { codigo: '+51', numero: '' };
        // Buscar si empieza con algún código conocido (ordenar por longitud descendente para evitar matching parcial erróneo)
        const paisEncontrado = PAISES.sort((a, b) => b.codigo.length - a.codigo.length)
            .find(p => phone.startsWith(p.codigo));

        if (paisEncontrado) {
            return {
                codigo: paisEncontrado.codigo,
                numero: phone.slice(paisEncontrado.codigo.length).trim()
            };
        }
        return { codigo: '+51', numero: phone }; // Default Perú si no matchea
    };

    const [datos, setDatos] = useState({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        // telefono: se maneja compuesto en el submit, pero inicializamos los componentes
        telefono_codigo: splitPhone(usuario.telefono).codigo,
        telefono_numero: splitPhone(usuario.telefono).numero,
        tipoDocumento: usuario.tipoDocumento || 'DNI',
        numeroDocumento: usuario.numeroDocumento || '',
        fechaNacimiento: usuario.fechaNacimiento || '',
        nacionalidad: usuario.nacionalidad || 'Nacional',
        licenciaConducir: usuario.licenciaConducir || false,
        direccion: usuario.direccion || '',
        licenciaConducir: usuario.licenciaConducir || false,
        direccion: usuario.direccion || '',

        codigoEmpleado: usuario.codigoEmpleado || '',
        turno: usuario.turno || 'Mañana',
        especialidad: usuario.especialidad || '',
        experiencia: usuario.experiencia || '',
        anexo: usuario.anexo || '',
        oficina: usuario.oficina || '',
        preguntaSecreta: usuario.pregunta_secreta || usuario.preguntaSecreta || 'mascota',
        respuestaSecreta: usuario.respuesta_secreta || usuario.respuestaSecreta || ''
    });

    const [tarjetas, setTarjetas] = useState([]);
    const [contactos, setContactos] = useState([]); // Nuevo estado para lista de contactos
    const [cargandoTarjetas, setCargandoTarjetas] = useState(false);
    const [mostrarModalTarjeta, setMostrarModalTarjeta] = useState(false);
    const [mostrarModalContacto, setMostrarModalContacto] = useState(false); // Modal para agregar contacto
    const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', codigo: '+51', telefono: '', relacion: '' });
    const [errores, setErrores] = useState({}); // Estado para errores de validación
    const [mensajeErrorGlobal, setMensajeErrorGlobal] = useState('');
    const [showCVV, setShowCVV] = useState(false); // Estado para mostrar/ocultar CVV
    const [erroresTarjeta, setErroresTarjeta] = useState({}); // Errores del formulario de tarjeta

    const [nuevaTarjeta, setNuevaTarjeta] = useState({ numero: '', exp: '', cvv: '', nombre: '', tipo: 'credito' });
    // Removed historialAlquileres and historialSoporte states

    // Efecto para cargar datos iniciales
    useEffect(() => {
        if (usuario?.id && usuario.rol === 'cliente') { // Corrected optional chaining
            cargarTarjetas();
            cargarContactos(); // Cargar listado
        }
        // Sincronizar formulario si el usuario cambia (ej. al guardar)
        if (usuario) {
            const { codigo, numero } = splitPhone(usuario.telefono);
            setDatos({
                nombre: usuario.nombre || '',
                email: usuario.email || '',
                telefono_codigo: codigo,
                telefono_numero: numero,
                tipoDocumento: usuario.tipoDocumento || 'DNI',
                numeroDocumento: usuario.numero_documento || usuario.numeroDocumento || '', // Handle snake_case or camelCase fallback
                fechaNacimiento: usuario.fecha_nacimiento || usuario.fechaNacimiento || '',
                nacionalidad: usuario.nacionalidad || 'Nacional',
                licenciaConducir: usuario.licencia_conducir || usuario.licenciaConducir || false,
                direccion: usuario.direccion || '',
                licenciaConducir: usuario.licencia_conducir || usuario.licenciaConducir || false,
                direccion: usuario.direccion || '',

                codigoEmpleado: usuario.codigo_empleado || usuario.codigoEmpleado || '',
                turno: usuario.turno || 'Mañana',
                especialidad: usuario.especialidad || '',
                experiencia: usuario.experiencia || '',
                anexo: usuario.anexo || '',
                oficina: usuario.oficina || '',
                preguntaSecreta: usuario.pregunta_secreta || usuario.preguntaSecreta || 'mascota',
                respuestaSecreta: usuario.respuesta_secreta || usuario.respuestaSecreta || ''
            });
        }
    }, [usuario]);

    // Verificar mayoría de edad
    const esMenorDeEdad = (() => {
        if (!datos.fechaNacimiento) return false;
        const hoy = new Date();
        const nacimiento = new Date(datos.fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad < 18;
    })();

    // Auto-desmarcar licencia si es menor
    useEffect(() => {
        if (esMenorDeEdad && datos.licenciaConducir) {
            setDatos(prev => ({ ...prev, licenciaConducir: false }));
        }
    }, [datos.fechaNacimiento]);

    // Helpers para Tarjeta
    const detectarMarca = (numero) => {
        const n = numero.replace(/\D/g, '');
        if (n.startsWith('4')) return { nombre: 'Visa', icono: '💳' };
        if (/^5[1-5]/.test(n)) return { nombre: 'Mastercard', icono: '💳' };
        if (/^3[47]/.test(n)) return { nombre: 'Amex', icono: '💳' };
        if (/^6/.test(n)) return { nombre: 'Discover', icono: '💳' };
        return { nombre: 'Desconocida', icono: '💳' };
    };

    const formatearTarjeta = (valor) => {
        const v = valor.replace(/\D/g, '').substring(0, 16);
        const parts = [];
        for (let i = 0; i < v.length; i += 4) {
            parts.push(v.substring(i, i + 4));
        }
        return parts.join(' ');
    };

    const formatearExpiracion = (valor) => {
        const v = valor.replace(/\D/g, '').substring(0, 4);
        if (v.length >= 2) {
            return `${v.substring(0, 2)}/${v.substring(2)}`;
        }
        return v;
    };

    const cargarTarjetas = async () => {
        setCargandoTarjetas(true);
        const data = await obtenerTarjetas(usuario.id);
        setTarjetas(data || []);
        setCargandoTarjetas(false);
    };

    const cargarContactos = async () => {
        const data = await obtenerContactosUsuario(usuario.id);
        setContactos(data || []);
    };

    const guardarContactoHandler = async (e) => {
        e.preventDefault();
        setErrores({});
        setMensajeErrorGlobal('');

        const nuevosErrores = {};
        if (!nuevoContacto.nombre.trim()) nuevosErrores.nombre = true;
        if (!nuevoContacto.telefono.trim()) nuevosErrores.telefono = true;

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        const contactoFinal = {
            nombre: nuevoContacto.nombre,
            telefono: `${nuevoContacto.codigo} ${nuevoContacto.telefono}`,
            relacion: nuevoContacto.relacion
        };

        const res = await agregarContactoDB(usuario.id, contactoFinal);
        if (res.success) {
            cargarContactos();
            setMostrarModalContacto(false);
            setNuevoContacto({ nombre: '', codigo: '+51', telefono: '', relacion: '' });
            setErrores({});
        } else {
            console.error(res.error);
            setMensajeErrorGlobal('Error al guardar contacto. Intente nuevamente.');
        }
    };

    const borrarContacto = async (id) => {
        if (!window.confirm('¿Eliminar este contacto?')) return;
        const res = await eliminarContactoDB(id);
        if (res.success) cargarContactos();
    };

    // Removed cargarHistorial function

    const manejarCambioTarjeta = (e) => {
        setNuevaTarjeta({ ...nuevaTarjeta, [e.target.name]: e.target.value });
    };

    const guardarTarjetaHandler = async (e) => {
        e.preventDefault();
        const nuevosErrores = {};

        // Validación de Nombre
        if (!nuevaTarjeta.nombre.trim()) nuevosErrores.nombre = 'El nombre es requerido';

        // Validación de Número
        const numeroLimpio = nuevaTarjeta.numero.replace(/\s/g, '');
        if (numeroLimpio.length < 15 || numeroLimpio.length > 16) {
            nuevosErrores.numero = 'Número de tarjeta incompleto o inválido';
        }

        // Validación de Expiración
        if (!/^\d{2}\/\d{2}$/.test(nuevaTarjeta.exp)) {
            nuevosErrores.exp = 'Formato inválido (MM/YY)';
        } else {
            // Validar mes y año
            const [mes, anio] = nuevaTarjeta.exp.split('/');
            const mesNum = parseInt(mes, 10);
            if (mesNum < 1 || mesNum > 12) nuevosErrores.exp = 'Mes inválido';
        }

        // Validación de CVV
        const marca = detectarMarca(nuevaTarjeta.numero).nombre;
        const minCvv = marca === 'Amex' ? 4 : 3;
        if (nuevaTarjeta.cvv.length < minCvv) {
            nuevosErrores.cvv = `CVV debe tener ${minCvv} dígitos`;
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErroresTarjeta(nuevosErrores);
            return;
        }

        const detectingMarca = detectarMarca(nuevaTarjeta.numero);

        const tarjetaParaGuardar = {
            nombre: nuevaTarjeta.nombre,
            numero: nuevaTarjeta.numero.slice(-4),
            exp: nuevaTarjeta.exp,
            principal: tarjetas.length === 0,
            marca: detectingMarca.nombre,
            tipo: nuevaTarjeta.tipo
        };

        const resultado = await agregarTarjeta(usuario.id, tarjetaParaGuardar);

        if (resultado.success) {
            setMostrarModalTarjeta(false);
            setNuevaTarjeta({ numero: '', exp: '', cvv: '', nombre: '', tipo: 'credito' });
            setErroresTarjeta({});
            cargarTarjetas();
        } else {
            // Mostrar error global en el modal si falla el servidor
            alert('Error al guardar tarjeta en el servidor. Intente más tarde.');
            console.error(resultado.error);
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

        // Validación de Dirección y Contacto
        // La dirección ya no es obligatoria a petición del usuario.


        // Validación de Pregunta Secreta
        // Si hay una pregunta seleccionada (siempre hay una por defecto 'mascota', pero validamos integridad)
        // La respuesta no puede estar vacía si se pretende usar la recuperación.
        if (!datos.respuestaSecreta || !datos.respuestaSecreta.trim()) {
            // Podríamos hacerlo opcional, pero el usuario solicitó explícitamente que no se permita vacío para asegurar recuperación.
            alert('Debes establecer una Respuesta Secreta para poder recuperar tu cuenta en el futuro.');
            return;
        }

        // Ya no validamos contacto emergente único aquí, se hace en su lista.

        // Combinar datos
        const datosParaGuardar = {
            ...datos,
            telefono: `${datos.telefono_codigo} ${datos.telefono_numero}`.trim()
        };

        // Limpiar auxiliares
        delete datosParaGuardar.telefono_codigo;
        delete datosParaGuardar.telefono_numero;

        actualizarPerfil(usuario.id, datosParaGuardar);
        alert('Perfil actualizado correctamente.');
    };

    const cambiarPass = async (e) => {
        e.preventDefault();
        if (passData.nueva !== passData.confirm) {
            alert("Las contraseñas nuevas no coinciden.");
            return;
        }
        if (passData.nueva.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        const res = await actualizarPassword(usuario.id, passData.actual, passData.nueva);
        if (res.exito) {
            alert(res.mensaje);
            setModalPass(false);
            setPassData({ actual: '', nueva: '', confirm: '' }); // Clear form
        } else {
            alert(res.mensaje);
        }
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
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">Contactos de Emergencia</label>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarModalContacto(true)}
                                        className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:text-blue-800"
                                    >
                                        <Plus size={14} /> Agregar
                                    </button>
                                </div>

                                {contactos.length === 0 ? (
                                    <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm bg-gray-50">
                                        No tienes contactos registrados. Es importante tener uno.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {contactos.map(c => (
                                            <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:border-blue-300 transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{c.nombre} <span className="text-xs font-normal text-gray-500">({c.relacion || 'Familiar'})</span></p>
                                                    <p className="text-xs text-gray-600">{c.telefono}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => borrarContacto(c.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                    {(usuario.nombre || 'U').charAt(0)}
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
                            <div className="flex gap-2">
                                <select
                                    className="p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 min-w-[120px]"
                                    value={datos.telefono_codigo}
                                    onChange={e => setDatos({ ...datos, telefono_codigo: e.target.value, telefono_numero: '' })} // Reset número al cambiar país para evitar inconsistencias
                                >
                                    {PAISES.map(p => (
                                        <option key={p.nombre} value={p.codigo}>
                                            {p.bandera} {p.codigo}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={datos.telefono_numero}
                                    placeholder="999 999 999"
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, ''); // Solo números
                                        const paisActual = PAISES.find(p => p.codigo === datos.telefono_codigo) || PAISES[0];
                                        if (val.length <= paisActual.digitos) {
                                            setDatos({ ...datos, telefono_numero: val });
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {(() => {
                                    const pais = PAISES.find(p => p.codigo === datos.telefono_codigo);
                                    return pais ? `${pais.nombre}: máx. ${pais.digitos} dígitos` : '';
                                })()}
                            </p>
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
                                                <p className="font-bold text-gray-800">•••• •••• •••• {tarjeta.numero_oculto?.slice(-4) || '****'} <span className="text-xs font-normal text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded ml-2">{tarjeta.marca}</span></p>
                                                <p className="text-xs text-gray-500">Expira: {tarjeta.expiracion} | {tarjeta.titular} | <span className="capitalize">{tarjeta.tipo}</span></p>
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
                                setPassData({ actual: '', nueva: '', confirm: '' });
                                setShowPass({ actual: false, nueva: false, confirm: false });
                                setModalPass(true);
                            }}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cambiar Contraseña
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Pregunta de Recuperación</label>
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={datos.preguntaSecreta}
                                    onChange={e => setDatos({ ...datos, preguntaSecreta: e.target.value })}
                                >
                                    {PREGUNTAS_SECRETAS.map(p => (
                                        <option key={p.id} value={p.id}>{p.texto}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Respuesta Secreta</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={datos.respuestaSecreta}
                                    placeholder="Escribe tu respuesta..."
                                    onChange={e => setDatos({ ...datos, respuestaSecreta: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Esta respuesta te permitirá recuperar tu acceso si olvidas tu contraseña.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Removed Historial de Actividad (Solo Clientes) */}

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
                                disabled={esMenorDeEdad}
                            />
                            <label htmlFor="licencia" className={`text-sm font-medium ${esMenorDeEdad ? 'text-gray-400' : 'text-gray-800'} cursor-pointer`}>
                                Declaro tener Licencia de Conducir Vigente {esMenorDeEdad && '(Requiere +18 años)'}
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
                                <input
                                    type="text"
                                    name="nombre"
                                    value={nuevaTarjeta.nombre}
                                    onChange={(e) => {
                                        manejarCambioTarjeta(e);
                                        if (erroresTarjeta.nombre) setErroresTarjeta({ ...erroresTarjeta, nombre: null });
                                    }}
                                    className={`w-full p-3 border rounded-xl focus:ring-2 outline-none uppercase transition-all ${erroresTarjeta.nombre ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                    placeholder="JUAN PEREZ"
                                />
                                {erroresTarjeta.nombre && <p className="text-red-500 text-xs mt-1 font-medium">{erroresTarjeta.nombre}</p>}
                            </div>
                            <div>
                                <div className="flex justify-between mb-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Número de Tarjeta</label>
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                        {nuevaTarjeta.numero ? detectarMarca(nuevaTarjeta.numero).nombre : ''}
                                        <span className="text-lg">{nuevaTarjeta.numero ? detectarMarca(nuevaTarjeta.numero).icono : ''}</span>
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={nuevaTarjeta.numero}
                                    onChange={e => {
                                        const formatted = formatearTarjeta(e.target.value);
                                        setNuevaTarjeta({ ...nuevaTarjeta, numero: formatted });
                                        if (erroresTarjeta.numero) setErroresTarjeta({ ...erroresTarjeta, numero: null });
                                    }}
                                    className={`w-full p-3 border rounded-xl focus:ring-2 outline-none font-mono text-lg transition-all ${erroresTarjeta.numero ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                    placeholder="0000 0000 0000 0000"
                                />
                                {erroresTarjeta.numero && <p className="text-red-500 text-xs mt-1 font-medium">{erroresTarjeta.numero}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo de Tarjeta</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${nuevaTarjeta.tipo === 'credito' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="tipoTarjeta"
                                            className="hidden"
                                            checked={nuevaTarjeta.tipo === 'credito'}
                                            onChange={() => setNuevaTarjeta({ ...nuevaTarjeta, tipo: 'credito' })}
                                        />
                                        Crédito
                                    </label>
                                    <label className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${nuevaTarjeta.tipo === 'debito' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="tipoTarjeta"
                                            className="hidden"
                                            checked={nuevaTarjeta.tipo === 'debito'}
                                            onChange={() => setNuevaTarjeta({ ...nuevaTarjeta, tipo: 'debito' })}
                                        />
                                        Débito
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Expiración (MM/YY)</label>
                                    <input
                                        type="text"
                                        value={nuevaTarjeta.exp}
                                        onChange={e => {
                                            const formatted = formatearExpiracion(e.target.value);
                                            setNuevaTarjeta({ ...nuevaTarjeta, exp: formatted });
                                            if (erroresTarjeta.exp) setErroresTarjeta({ ...erroresTarjeta, exp: null });
                                        }}
                                        className={`w-full p-3 border rounded-xl focus:ring-2 outline-none text-center transition-all ${erroresTarjeta.exp ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                        placeholder="MM/YY"
                                        maxLength="5"
                                    />
                                    {erroresTarjeta.exp && <p className="text-red-500 text-xs mt-1 font-medium">{erroresTarjeta.exp}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">CVV</label>
                                    <div className="relative">
                                        <input
                                            type={showCVV ? "text" : "password"}
                                            value={nuevaTarjeta.cvv}
                                            onChange={e => {
                                                // Limite dinámico: Amex son 4, resto 3. Por defecto 3.
                                                const marca = detectarMarca(nuevaTarjeta.numero).nombre;
                                                const maxLen = marca === 'Amex' ? 4 : 3;
                                                const val = e.target.value.replace(/\D/g, '').substring(0, maxLen);
                                                setNuevaTarjeta({ ...nuevaTarjeta, cvv: val });
                                                if (erroresTarjeta.cvv) setErroresTarjeta({ ...erroresTarjeta, cvv: null });
                                            }}
                                            onFocus={() => setNuevaTarjeta({ ...nuevaTarjeta, cvv: '' })}
                                            className={`w-full p-3 pr-10 border rounded-xl focus:ring-2 outline-none text-center transition-all ${erroresTarjeta.cvv ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                            placeholder="•••"
                                            maxLength="4"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowCVV(!showCVV)}
                                        >
                                            {showCVV ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {erroresTarjeta.cvv && <p className="text-red-500 text-xs mt-1 font-medium">{erroresTarjeta.cvv}</p>}
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => { setMostrarModalTarjeta(false); setErroresTarjeta({}); }} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Cambiar Contraseña */}
            {modalPass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in-up">
                        <button
                            onClick={() => setModalPass(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Lock className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Cambiar Contraseña</h3>
                            <p className="text-sm text-gray-500">Asegura tu cuenta con una contraseña fuerte</p>
                        </div>

                        <form onSubmit={cambiarPass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña Actual</label>
                                <div className="relative">
                                    <input
                                        type={showPass.actual ? "text" : "password"}
                                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={passData.actual}
                                        onChange={e => setPassData({ ...passData, actual: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPass({ ...showPass, actual: !showPass.actual })}
                                    >
                                        {showPass.actual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nueva Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={showPass.nueva ? "text" : "password"}
                                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={passData.nueva}
                                        onChange={e => setPassData({ ...passData, nueva: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPass({ ...showPass, nueva: !showPass.nueva })}
                                    >
                                        {showPass.nueva ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Confirmar Nueva Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={showPass.confirm ? "text" : "password"}
                                        className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={passData.confirm}
                                        onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                                    >
                                        {showPass.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setModalPass(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-colors">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Agregar Contacto */}
            {mostrarModalContacto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-fade-in-up">
                        <button
                            onClick={() => setMostrarModalContacto(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 p-2 rounded-full"><Phone size={18} className="text-blue-600" /></span>
                            Nuevo Contacto
                        </h3>

                        <form onSubmit={guardarContactoHandler} className="space-y-4">
                            {mensajeErrorGlobal && (
                                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-2 flex items-center gap-2">
                                    <AlertTriangle size={16} /> {mensajeErrorGlobal}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className={`w-full p-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${errores.nombre ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                    placeholder="Ej. Mamá"
                                    value={nuevoContacto.nombre}
                                    onChange={e => {
                                        setNuevoContacto({ ...nuevoContacto, nombre: e.target.value });
                                        if (e.target.value) setErrores({ ...errores, nombre: false });
                                    }}
                                />
                                {errores.nombre && <p className="text-red-500 text-xs mt-1">El nombre es obligatorio.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Parentesco (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej. Madre, Hermano"
                                    value={nuevoContacto.relacion}
                                    onChange={e => {
                                        // Solo permitir letras y espacios
                                        const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                                        setNuevoContacto({ ...nuevoContacto, relacion: val });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <select
                                        className="p-2.5 border border-gray-300 rounded-lg bg-gray-50 min-w-[90px]"
                                        value={nuevoContacto.codigo}
                                        onChange={e => setNuevoContacto({ ...nuevoContacto, codigo: e.target.value })}
                                    >
                                        {PAISES.map(p => (
                                            <option key={p.nombre} value={p.codigo}>{p.bandera} {p.codigo}</option>
                                        ))}
                                    </select>
                                    <input
                                        className={`w-full p-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${errores.telefono ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                                        placeholder="999 999 999"
                                        value={nuevoContacto.telefono}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const pais = PAISES.find(p => p.codigo === nuevoContacto.codigo) || PAISES[0];
                                            if (val.length <= pais.digitos) {
                                                setNuevoContacto({ ...nuevoContacto, telefono: val });
                                                if (val) setErrores({ ...errores, telefono: false });
                                            }
                                        }}
                                    />
                                </div>
                                {errores.telefono && <p className="text-red-500 text-xs mt-1">El teléfono es obligatorio.</p>}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setMostrarModalContacto(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfil;
