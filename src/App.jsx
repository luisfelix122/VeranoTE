import React, { useState, useContext } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingCart, FileText, CheckCircle, X } from 'lucide-react';

// Contexts
import { ProveedorAutenticacion, ContextoAutenticacion } from './contexts/ContextoAutenticacion';
import { ProveedorInventario, ContextoInventario } from './contexts/ContextoInventario';
import { ProveedorCarrito, ContextoCarrito } from './contexts/ContextoCarrito';


import { ProveedorPromociones, ContextoPromociones } from './contexts/ContextoPromociones';
import { ProveedorUI, usarUI } from './contexts/ContextoUI';
import { ProveedorSoporte } from './contexts/ContextoSoporte';

import Modal from './components/ui/Modal';
import Boton from './components/ui/Boton';
import ModalInfoGlobal from './components/ui/ModalInfoGlobal';

// Router
import { crearRouterApp } from './router';

// Services
import { registrarUsuarioDB, obtenerConfiguracion, calcularCotizacion, actualizarTipoCambioReal } from './services/db';

const router = crearRouterApp();

function App() {
    return (
        <ProveedorAutenticacion>
            <ProveedorInventario>
                <ProveedorCarrito>
                    <ProveedorPromociones>
                        <ProveedorSoporte>
                            <ProveedorUI>
                                <AppContenido />
                            </ProveedorUI>
                        </ProveedorSoporte>
                    </ProveedorPromociones>
                </ProveedorCarrito>
            </ProveedorInventario>
        </ProveedorAutenticacion>
    );
}

function AppContenido() {
    const { usuario, iniciarSesion, registrarUsuario, cargando } = useContext(ContextoAutenticacion);
    const { carrito, removerDelCarrito, esVisible, setEsVisible, total, limpiarCarrito } = useContext(ContextoCarrito);
    const { registrarAlquiler, verificarDisponibilidad, calcularStockDisponible, fechaSeleccionada: fechaReserva, setFechaSeleccionada: setFechaReserva } = useContext(ContextoInventario);
    const { calcularDescuentos } = useContext(ContextoPromociones);
    const { mostrarLogin, setMostrarLogin, modoRegistro, setModoRegistro, abrirModalInfo } = usarUI();
    const { sedeActual, setSedeActual, sedes } = useContext(ContextoInventario);

    // Obtener horarios de la sede actual
    const sedeInfo = sedes.find(s => s.id === sedeActual);
    const horaApertura = sedeInfo?.hora_apertura ? sedeInfo.hora_apertura.slice(0, 5) : '08:00';
    const horaCierre = sedeInfo?.hora_cierre ? sedeInfo.hora_cierre.slice(0, 5) : '18:00';

    // Actualizar tipo de cambio al montar
    React.useEffect(() => {
        actualizarTipoCambioReal();
    }, []);

    // Sincronizar Sede con el Usuario (Admin/Vendedor)
    React.useEffect(() => {
        if (usuario && (usuario.rol === 'admin' || usuario.rol === 'vendedor') && usuario.sede) {
            if (sedeActual !== usuario.sede) {
                setSedeActual(usuario.sede);
            }
        }
    }, [usuario, setSedeActual, sedeActual]);


    // Login State
    const [email, setEmail] = useState('cliente@demo.com');
    const [password, setPassword] = useState('123');
    const [errorLogin, setErrorLogin] = useState('');

    // Registro State
    const [regNombre, setRegNombre] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');

    // Default 'Nacional' -> 'DNI'
    const [regNacionalidad, setRegNacionalidad] = useState('Nacional');
    const [regTipoDocumento, setRegTipoDocumento] = useState('DNI');
    const [regPaisOrigen, setRegPaisOrigen] = useState('Perú');

    const [regDoc, setRegDoc] = useState('');
    const [regNacimiento, setRegNacimiento] = useState('');
    const [regLicencia, setRegLicencia] = useState(false);
    const [errorDni, setErrorDni] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [aceptaTerminosRegistro, setAceptaTerminosRegistro] = useState(false);

    // New UX State
    const [erroresRegistro, setErroresRegistro] = useState({});
    const [registroExitoso, setRegistroExitoso] = useState(false);

    // Calcular si es menor de edad
    const esMenorDeEdad = React.useMemo(() => {
        if (!regNacimiento) return false;
        const hoy = new Date();
        const nacimiento = new Date(regNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad < 18;
    }, [regNacimiento]);

    // Validación automática: Si es menor, quitar licencia
    React.useEffect(() => {
        if (esMenorDeEdad) {
            setRegLicencia(false);
        }
    }, [esMenorDeEdad]);

    // Checkout State
    // const [fechaReserva, setFechaReserva] = useState(new Date().toISOString().split('T')[0]); // Moved to ContextoInventario
    const [horaReserva, setHoraReserva] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
    const [tipoReserva, setTipoReserva] = useState('inmediata'); // inmediata, anticipada
    const [metodoPago, setMetodoPago] = useState('transferencia');
    const [tipoComprobante, setTipoComprobante] = useState('boleta');
    const [datosFactura, setDatosFactura] = useState({ ruc: '', razonSocial: '', direccion: '' });
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [errorHora, setErrorHora] = useState('');
    const [erroresCheckout, setErroresCheckout] = useState({});
    const [compraExitosa, setCompraExitosa] = useState(false);

    // Estados para descuentos y promociones en el carrito
    // const [descuentoTotal, setDescuentoTotal] = useState(0); // REMOVED to avoid conflict with calculated const
    const [promocionesAplicadas, setPromocionesAplicadas] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [totalesServer, setTotalesServer] = useState(null);

    // Calcular descuentos cuando cambie el carrito
    React.useEffect(() => {
        if (carrito.length > 0) {
            calcularDescuentos(carrito).then(({ descuentoTotal, promocionesAplicadas, alertas }) => {
                // setDescuentoTotal(descuentoTotal || 0); // Deprecated state
                setPromocionesAplicadas(promocionesAplicadas || []);
                setAlertas(alertas || []);
            }).catch(err => {
                console.error('Error al calcular descuentos:', err);
                // setDescuentoTotal(0); // Este ya no se usa directamente
                setPromocionesAplicadas([]);
                setAlertas([]);
            });
        } else {
            // setDescuentoTotal(0); // Este ya no se usa directamente
            setPromocionesAplicadas([]);
            setAlertas([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrito]); // Solo depende de carrito, no de calcularDescuentos

    React.useEffect(() => {
        const actualizarCotizacion = async () => {
            if (carrito.length === 0) {
                setTotalesServer({ subtotal: 0, garantia: 0, total: 0 });
                return;
            }

            // Mapear carrito al formato que espera la función SQL
            const itemsParaBD = carrito.map(item => ({
                id: item.id,
                horas: item.horas,
                cantidad: item.cantidad
            }));

            const resultado = await calcularCotizacion(itemsParaBD);
            if (resultado) {
                setTotalesServer(resultado);
            }
        };

        const timeout = setTimeout(actualizarCotizacion, 300); // Debounce pequeño
        return () => clearTimeout(timeout);
    }, [carrito]);

    // Totales calculados (Fallback al cliente mientras carga el servidor)
    const totalCliente = carrito.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);
    const subtotalUI = totalesServer ? totalesServer.subtotal : totalCliente;
    const garantiaUI = totalesServer ? totalesServer.garantia : (subtotalUI * 0.20); // 20% de garantía (configuracion.GARANTIA_PORCENTAJE || 0.20)

    // Descuentos se aplican sobre el subtotal del servidor
    const descuentoTotal = promocionesAplicadas.reduce((acc, promo) => {
        if (promo.tipo === 'porcentaje') return acc + (subtotalUI * (promo.valor / 100));
        if (promo.tipo === 'fijo') return acc + promo.valor;
        return acc;
    }, 0);

    const totalConDescuento = Math.max(0, subtotalUI - descuentoTotal);
    const totalFinalUI = totalesServer ? (totalConDescuento + garantiaUI) : (totalConDescuento + garantiaUI);

    // Auto-switch tipoReserva based on date
    React.useEffect(() => {
        const hoy = new Date().toISOString().split('T')[0];
        if (fechaReserva !== hoy) {
            setTipoReserva('anticipada');
        } else {
            setTipoReserva('inmediata');
        }
    }, [fechaReserva]);

    // Create router
    const router = crearRouterApp();

    const manejarLogin = (e) => {
        e.preventDefault();
        if (iniciarSesion(email, password)) {
            setMostrarLogin(false);
            setErrorLogin('');
        } else {
            setErrorLogin('Credenciales inválidas');
        }
    };

    const validarRequisitos = () => {
        if (!usuario) return { valido: false, mensaje: "Debes iniciar sesión." };

        // Validar datos perfil
        // Soportar ambas notaciones (snake_case de DB o camelCase de Contexto)
        const doc = usuario.numeroDocumento || usuario.numero_documento;
        const nac = usuario.fechaNacimiento || usuario.fecha_nacimiento;

        if (!doc || !nac) {
            return { valido: false, mensaje: "Por favor completa tu perfil (DNI y Fecha Nacimiento) antes de alquilar." };
        }

        // Calcular edad
        const hoy = new Date();
        const nacimiento = new Date(nac);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        // Validar productos Motor
        const tieneMotor = carrito.some(item => item.categoria === 'Motor');
        if (tieneMotor) {
            if (edad < 18) return { valido: false, mensaje: "Debes ser mayor de 18 años para alquilar vehículos motorizados." };

            // Verificación robusta de licencia
            const tieneLicencia = usuario.licenciaConducir === true || usuario.licencia_conducir === true;
            if (!tieneLicencia) return { valido: false, mensaje: "Se requiere licencia de conducir vigente para vehículos motorizados. Actualízalo en tu perfil." };
        }

        return { valido: true };
    };

    const procesarCompra = () => {
        if (!usuario) {
            setMostrarLogin(true);
            setEsVisible(false);
            return;
        }

        const validacion = validarRequisitos();
        if (!validacion.valido) {
            alert(validacion.mensaje);
            setEsVisible(false);
            return;
        }

        if (!aceptaTerminos) {
            setErroresCheckout(prev => ({ ...prev, terminos: "Debes aceptar los términos y condiciones del contrato." }));
            return;
        } else {
            setErroresCheckout(prev => ({ ...prev, terminos: null }));
        }

        // Validar Horario de Atención
        if (horaReserva < horaApertura || horaReserva > horaCierre) {
            setErrorHora(`El horario de atención es de ${horaApertura} a ${horaCierre}.`);
            return;
        }

        if (tipoComprobante === 'factura' && (!datosFactura.ruc || !datosFactura.razonSocial)) {
            setErroresCheckout(prev => ({ ...prev, factura: "Por favor completa los datos de facturación." }));
            return;
        } else {
            setErroresCheckout(prev => ({ ...prev, factura: null }));
        }

        // Validar disponibilidad (Cliente - Enforce UI Logic)
        for (const item of carrito) {
            const stockMax = calcularStockDisponible(item.id, fechaReserva);
            if (item.cantidad > stockMax) {
                setErroresCheckout(prev => ({ ...prev, general: `Stock insuficiente para ${item.nombre}. Máximo disponible: ${stockMax}` }));
                return;
            }
        }

        const fechaInicio = new Date(`${fechaReserva}T${horaReserva}`);

        // Preparar datos para la reserva con saneamiento
        const datosReserva = {
            clienteId: usuario.id,
            vendedorId: null, // Si es online, va null
            sedeId: sedeActual || 'costa',
            items: carrito.map(i => ({
                id: Number(i.id),
                cantidad: Number(i.cantidad),
                horas: Number(i.horas),
                precioPorHora: Number(i.precioPorHora),
                categoria: i.categoria
            })),
            fechaInicio: fechaInicio.toISOString(), // Asegurar formato ISO
            tipoReserva: tipoReserva || 'inmediata',
            metodoPago: metodoPago || 'transferencia',
            tipoComprobante: tipoComprobante || 'boleta',
            datosFactura: tipoComprobante === 'factura' ? datosFactura : null
        };

        // Loading UI simulación (opcional)
        setAceptaTerminos(false); // Deshabilitar doble click

        registrarAlquiler(datosReserva).then(exito => {
            if (exito) {
                setCompraExitosa(true);
            } else {
                setAceptaTerminos(true); // Permitir reintentar
            }
        });
    };

    // Helper para calcular edad en registro
    const calcularEdadRegistro = (fecha) => {
        if (!fecha) return 0;
        const hoy = new Date();
        const nacimiento = new Date(fecha);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    };

    const esMenorRegistro = calcularEdadRegistro(regNacimiento) < 18;

    // Pantalla de Carga Global
    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Cargando Verano...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <RouterProvider router={router} />
            <ModalInfoGlobal />

            {/* Modal Carrito */}
            <Modal titulo={compraExitosa ? "¡Reserva Exitosa!" : "Tu Carrito de Compras"} abierto={esVisible} alCerrar={() => {
                setEsVisible(false);
                if (compraExitosa) {
                    setCompraExitosa(false);
                    limpiarCarrito();
                }
            }} zIndex={60}>
                {compraExitosa ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¡Reserva Registrada!</h3>
                        <p className="text-gray-600 mb-6 px-8">
                            Hemos enviado los detalles de tu reserva a tu correo electrónico.
                            Puedes ver el contrato y el estado en tu perfil.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Boton variante="secundario" onClick={() => {
                                setEsVisible(false);
                                setCompraExitosa(false);
                                limpiarCarrito();
                            }}>Cerrar</Boton>
                            <Boton onClick={() => {
                                setEsVisible(false);
                                setCompraExitosa(false);
                                limpiarCarrito();
                                window.location.href = '/mis-gastos'; // O usar navigate si router disponible
                            }}>Ver Mis Reportes</Boton>
                        </div>
                    </div>
                ) : carrito.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Tu carrito está vacío.</p>
                        <Boton variante="fantasma" onClick={() => setEsVisible(false)} className="mt-4">Seguir Navegando</Boton>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                            {carrito.map(item => (
                                <div key={item.cartId} className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg">
                                    <img src={item.imagen} alt={item.nombre} className="w-16 h-16 object-cover rounded-md" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{item.nombre}</h4>
                                        <p className="text-sm text-gray-500">{item.horas}h x S/ {item.precioPorHora} ({item.cantidad} uni.)</p>
                                        {item.categoria === 'Motor' && (
                                            (usuario?.licenciaConducir || usuario?.licencia_conducir) ? (
                                                <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10} /> Licencia Verificada</span>
                                            ) : (
                                                <span className="text-xs text-orange-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Requiere Licencia</span>
                                            )
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">S/ {item.precioPorHora * item.horas * item.cantidad}</p>
                                        <button onClick={() => removerDelCarrito(item.cartId)} className="text-red-500 text-xs hover:underline mt-1">Eliminar</button>
                                    </div>
                                </div>
                            ))}

                            {/* Sección de Reserva y Pago */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                                <h4 className="font-bold text-gray-800 border-b pb-2">Detalles de Reserva</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                        <input type="date" className="w-full p-2 border rounded text-sm" value={fechaReserva} onChange={e => setFechaReserva(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Hora Inicio</label>
                                        <input
                                            type="time"
                                            className="w-full p-2 border rounded text-sm"
                                            value={horaReserva}
                                            min={horaApertura}
                                            max={horaCierre}
                                            onChange={e => {
                                                setHoraReserva(e.target.value);
                                                setErrorHora('');
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Horario: {horaApertura} - {horaCierre}</p>
                                        {errorHora && <p className="text-xs font-bold text-red-600 mt-1 animate-pulse">{errorHora}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Reserva</label>
                                    <div className="flex gap-4">
                                        <label className={`flex items-center gap-2 text-sm ${fechaReserva !== new Date().toISOString().split('T')[0] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <input
                                                type="radio"
                                                name="tipoReserva"
                                                value="inmediata"
                                                checked={tipoReserva === 'inmediata'}
                                                onChange={() => setTipoReserva('inmediata')}
                                                disabled={fechaReserva !== new Date().toISOString().split('T')[0]}
                                            />
                                            Inmediata (100%)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tipoReserva"
                                                value="anticipada"
                                                checked={tipoReserva === 'anticipada'}
                                                onChange={() => setTipoReserva('anticipada')}
                                            />
                                            Anticipada (60%)
                                        </label>
                                    </div>
                                    {fechaReserva !== new Date().toISOString().split('T')[0] && (
                                        <p className="text-xs text-orange-600 mt-1">Reservas para fechas futuras son automáticamente anticipadas.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select className="w-full p-2 border rounded text-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                                        <option value="transferencia">Transferencia Bancaria</option>
                                        <option value="yape">Yape / Plin</option>
                                        <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                                        <option value="efectivo">Efectivo (En tienda)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Comprobante</label>
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="radio" name="tipoComprobante" value="boleta" checked={tipoComprobante === 'boleta'} onChange={() => setTipoComprobante('boleta')} />
                                            Boleta
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="radio" name="tipoComprobante" value="factura" checked={tipoComprobante === 'factura'} onChange={() => setTipoComprobante('factura')} />
                                            Factura
                                        </label>
                                    </div>
                                    {tipoComprobante === 'factura' && (
                                        <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded">
                                            <input placeholder="RUC" className="w-full p-2 border rounded text-sm" value={datosFactura.ruc} onChange={e => setDatosFactura({ ...datosFactura, ruc: e.target.value })} />
                                            <input placeholder="Razón Social" className="w-full p-2 border rounded text-sm" value={datosFactura.razonSocial} onChange={e => setDatosFactura({ ...datosFactura, razonSocial: e.target.value })} />
                                            <input placeholder="Dirección Fiscal" className="w-full p-2 border rounded text-sm" value={datosFactura.direccion} onChange={e => setDatosFactura({ ...datosFactura, direccion: e.target.value })} />

                                        </div>
                                    )}
                                    {erroresCheckout.factura && <p className="text-xs font-bold text-red-600 mt-1 animate-pulse">{erroresCheckout.factura}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2"><FileText size={18} /> Contrato Digital</h4>
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terminos"
                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={aceptaTerminos}
                                    onChange={(e) => {
                                        setAceptaTerminos(e.target.checked);
                                        setErroresCheckout(prev => ({ ...prev, terminos: null }));
                                    }}
                                />
                                <label htmlFor="terminos" className="text-sm text-gray-700 cursor-pointer">
                                    He leído y acepto los <button type="button" onClick={() => abrirModalInfo('terminos', 'Términos y Condiciones')} className="text-blue-600 underline font-bold hover:text-blue-800">Términos y Condiciones</button>, incluyendo la responsabilidad por daños y el depósito de garantía reembolsable.
                                </label>
                            </div>
                            {erroresCheckout.terminos && <p className="text-xs font-bold text-red-600 ml-8 mt-1 animate-pulse">{erroresCheckout.terminos}</p>}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            {/* Alertas de Promoción */}
                            {alertas.length > 0 && (
                                <div className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-2">
                                    {alertas.map((alerta, idx) => (
                                        <p key={idx} className="text-xs text-yellow-800 flex items-center gap-1"><Package size={12} /> {alerta}</p>
                                    ))}
                                </div>
                            )}

                            <div class="flex justify-between items-center text-gray-500 text-sm">
                                <span>Subtotal Base</span>
                                <span>S/ {totalesServer?.subtotal_base?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div class="flex justify-between items-center text-gray-500 text-sm">
                                <span>IGV (18%)</span>
                                <span>S/ {totalesServer?.igv?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-800 font-medium border-t border-gray-100 pt-1 mt-1">
                                <span className="text-sm">Total Servicio</span>
                                <span>S/ {totalesServer?.subtotal?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="flex justify-between items-center text-green-700">
                                <span className="text-sm">Garantía (Reembolsable)</span>
                                <span className="font-medium">S/ {totalesServer?.garantia?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="flex justify-between items-center border-t border-dashed pt-2 mt-2">
                                <span className="font-bold text-gray-900">Total a Pagar</span>
                                <div className="text-right">
                                    <span className="block text-xl font-bold text-blue-600">S/ {totalesServer?.total?.toFixed(2) || '0.00'}</span>
                                    <span className="block text-xs text-gray-500">approx. $ {totalesServer?.total_dolares?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>

                            {tipoReserva === 'anticipada' && (
                                <div className="bg-orange-50 p-2 rounded text-sm space-y-1 mt-2">
                                    <div className="flex justify-between items-center text-blue-800">
                                        <span className="font-medium">Adelanto a Pagar (60%)</span>
                                        <span className="font-bold">S/ {(totalesServer?.total * 0.60)?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-orange-800">
                                        <span className="font-medium">Saldo Pendiente (40%)</span>
                                        <span className="font-bold">S/ {(totalesServer?.total * 0.40)?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <Boton variante="secundario" onClick={() => setEsVisible(false)}>Seguir Comprando</Boton>
                                <Boton variante="primario" onClick={procesarCompra} disabled={!aceptaTerminos}>
                                    {tipoReserva === 'anticipada' ? 'Pagar Adelanto' : 'Pagar Total'}
                                </Boton>
                            </div>
                        </div>
                    </>
                )}
            </Modal>



            {/* Modal Login/Registro */}
            <Modal titulo={modoRegistro ? "Crear Cuenta" : "Bienvenido"} abierto={mostrarLogin} alCerrar={() => { setMostrarLogin(false); setRegistroExitoso(false); setErroresRegistro({}); }} zIndex={60}>
                {modoRegistro ? (
                    registroExitoso ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in-up">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h3>
                            <p className="text-gray-600 mb-6 max-w-xs">Tu cuenta ha sido registrada y ya has iniciado sesión.</p>
                            <Boton variante="primario" onClick={() => { setModoRegistro(false); setRegistroExitoso(false); setMostrarLogin(false); }} className="w-full">
                                Continuar
                            </Boton>
                        </div>
                    ) : (
                        <form onSubmit={async (e) => {
                            e.preventDefault();

                            // 1. Limpiar errores previos
                            const nuevosErrores = {};
                            setErroresRegistro({});

                            // 2. Validaciones Manuales
                            if (!regNombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio.";
                            if (!regEmail.trim()) nuevosErrores.email = "El email es obligatorio.";
                            if (!regPass.trim()) nuevosErrores.password = "La contraseña es obligatoria.";
                            if (!regDoc.trim()) {
                                nuevosErrores.doc = "El documento es obligatorio.";
                            } else if (regTipoDocumento === 'DNI' && !/^\d{8}$/.test(regDoc)) {
                                nuevosErrores.doc = "El DNI debe tener 8 dígitos.";
                            }
                            if (!regNacimiento) nuevosErrores.nacimiento = "La fecha de nacimiento es obligatoria.";

                            if (!aceptaTerminosRegistro) {
                                nuevosErrores.terminos = "Debes aceptar los términos y condiciones.";
                            }

                            // Si hay errores, detener y mostrar
                            if (Object.keys(nuevosErrores).length > 0) {
                                setErroresRegistro(nuevosErrores);
                                return;
                            }

                            setIsRegistering(true);

                            const resultado = await registrarUsuario({
                                nombre: regNombre,
                                email: regEmail,
                                password: regPass,
                                numeroDocumento: regDoc,
                                fechaNacimiento: regNacimiento,
                                licenciaConducir: regLicencia,
                                tipoDocumento: regTipoDocumento,
                                nacionalidad: regNacionalidad
                            });

                            setIsRegistering(false);

                            if (resultado === true) {
                                setRegistroExitoso(true);
                                setAceptaTerminosRegistro(false);
                            } else {
                                // Mapeo de errores de backend a campos
                                const errorStr = resultado?.toString() || '';
                                if (errorStr.includes('usuarios_email_unique') || errorStr.includes('usuarios_email_key')) {
                                    setErroresRegistro({ email: "Este correo ya está registrado." });
                                } else if (errorStr.includes('usuarios_dni_unique_idx')) {
                                    setErroresRegistro({ doc: "Este documento ya está registrado." });
                                } else if (errorStr.includes('usuarios_dni_check')) {
                                    setErroresRegistro({ doc: "Formato de documento inválido." });
                                } else {
                                    setErroresRegistro({ general: "Error al crear cuenta. Inténtalo de nuevo." });
                                }
                            }
                        }} className="space-y-4">
                            {erroresRegistro.general && (
                                <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} /> {erroresRegistro.general}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    className={`w-full p-2 border rounded ${erroresRegistro.nombre ? 'border-red-500 bg-red-50' : ''}`}
                                    value={regNombre}
                                    onChange={e => setRegNombre(e.target.value)}
                                    placeholder="Ej. Juan Pérez"
                                />
                                {erroresRegistro.nombre && <p className="text-xs text-red-500 mt-1">{erroresRegistro.nombre}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className={`w-full p-2 border rounded ${erroresRegistro.email ? 'border-red-500 bg-red-50' : ''}`}
                                    value={regEmail}
                                    onChange={e => setRegEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                />
                                {erroresRegistro.email && <p className="text-xs text-red-500 mt-1">{erroresRegistro.email}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1"> Condición</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white"
                                        value={regNacionalidad}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setRegNacionalidad(val);
                                            // Auto-switch Logic
                                            if (val === 'Nacional') {
                                                setRegPaisOrigen('Perú');
                                                setRegTipoDocumento('DNI');
                                            } else {
                                                setRegPaisOrigen('Argentina');
                                                setRegTipoDocumento('Pasaporte');
                                            }
                                            setErroresRegistro(prev => ({ ...prev, doc: '' }));
                                        }}
                                    >
                                        <option value="Nacional">Peruana</option>
                                        <option value="Extranjero">Extranjera</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">País Origen</label>
                                    {regNacionalidad === 'Nacional' ? (
                                        <input disabled className="w-full p-2 border rounded bg-gray-100 text-gray-500 font-medium" value="Perú" />
                                    ) : (
                                        <select
                                            className="w-full p-2 border rounded bg-white"
                                            value={regPaisOrigen}
                                            onChange={e => setRegPaisOrigen(e.target.value)}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Doc.</label>
                                    <select
                                        className="w-full p-2 border rounded bg-gray-50 disabled:bg-gray-100"
                                        value={regTipoDocumento}
                                        onChange={e => setRegTipoDocumento(e.target.value)}
                                        disabled={regNacionalidad === 'Nacional'}
                                    >
                                        <option value="DNI">DNI</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                        <option value="CE">C.E.</option>
                                        <option value="PTP">PTP</option>
                                    </select>
                                </div>


                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {regTipoDocumento === 'DNI' ? 'Número DNI' : 'N° Documento'}
                                    </label>
                                    <input
                                        className={`w-full p-2 border rounded ${erroresRegistro.doc ? 'border-red-500 bg-red-50' : ''}`}
                                        value={regDoc}
                                        maxLength={regTipoDocumento === 'DNI' ? 8 : 20}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (regTipoDocumento === 'DNI' && !/^\d*$/.test(val)) return;
                                            setRegDoc(val);
                                            setErroresRegistro(prev => ({ ...prev, doc: '' }));
                                        }}
                                        placeholder={regTipoDocumento === 'DNI' ? '8 dígitos' : ''}
                                    />
                                    {erroresRegistro.doc && <p className="text-xs text-red-500 mt-1">{erroresRegistro.doc}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                                    <input
                                        type="date"
                                        className={`w-full p-2 border rounded ${erroresRegistro.nacimiento ? 'border-red-500 bg-red-50' : ''}`}
                                        value={regNacimiento}
                                        onChange={e => {
                                            setRegNacimiento(e.target.value);
                                            setErroresRegistro(prev => ({ ...prev, nacimiento: '' }));
                                            if (calcularEdadRegistro(e.target.value) < 18) {
                                                setRegLicencia(false);
                                            }
                                        }}
                                    />
                                    {erroresRegistro.nacimiento && <p className="text-xs text-red-500 mt-1">{erroresRegistro.nacimiento}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    className={`w-full p-2 border rounded ${erroresRegistro.password ? 'border-red-500 bg-red-50' : ''}`}
                                    value={regPass}
                                    onChange={e => setRegPass(e.target.value)}
                                    placeholder="********"
                                />
                                {erroresRegistro.password && <p className="text-xs text-red-500 mt-1">{erroresRegistro.password}</p>}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="regLicencia"
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                        checked={regLicencia}
                                        onChange={(e) => setRegLicencia(e.target.checked)}
                                        disabled={esMenorDeEdad}
                                    />
                                    <label htmlFor="regLicencia" className={`text-sm ${esMenorDeEdad ? 'text-gray-400' : 'text-gray-700'}`}>
                                        Tengo Licencia de Conducir {esMenorDeEdad && '(Requiere ser mayor de edad)'}
                                    </label>
                                </div>

                                <div className={`flex items-start gap-2 p-3 rounded border ${erroresRegistro.terminos ? 'border-red-200 bg-red-50' : 'bg-gray-50'}`}>
                                    <input
                                        type="checkbox"
                                        id="regTerminos"
                                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        checked={aceptaTerminosRegistro}
                                        onChange={e => {
                                            setAceptaTerminosRegistro(e.target.checked);
                                            setErroresRegistro(prev => ({ ...prev, terminos: '' }));
                                        }}
                                    />
                                    <label htmlFor="regTerminos" className="text-sm text-gray-700 cursor-pointer select-none">
                                        He leído y acepto los <button type="button" onClick={() => abrirModalInfo('terminos-registro', 'Términos de Registro')} className="text-blue-600 underline font-bold hover:text-blue-800">Términos y Condiciones</button>
                                    </label>
                                </div>
                                {erroresRegistro.terminos && <p className="text-sm font-medium text-red-600 ml-6 animate-pulse">{erroresRegistro.terminos}</p>}
                            </div>

                            <Boton
                                variante="primario"
                                className={`w-full py-3 ${!aceptaTerminosRegistro ? 'opacity-50' : ''}`}
                                type="submit"
                                disabled={isRegistering}
                            >
                                {isRegistering ? 'Registrando...' : 'Registrarse'}
                            </Boton>
                            <p className="text-center text-sm text-gray-600">¿Ya tienes cuenta? <button type="button" onClick={() => setModoRegistro(false)} className="text-blue-600 font-bold">Inicia Sesión</button></p>
                        </form>
                    )
                ) : (
                    <form onSubmit={manejarLogin} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-4 py-2 rounded-lg border border-gray-300" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label><input type="password" className="w-full px-4 py-2 rounded-lg border border-gray-300" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                        {errorLogin && <div className="text-red-500 text-sm bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle size={16} />{errorLogin}</div>}
                        <Boton type="submit" variante="primario" className="w-full">Iniciar Sesión</Boton>
                        <p className="text-center text-sm text-gray-600">¿No tienes cuenta? <button type="button" onClick={() => setModoRegistro(true)} className="text-blue-600 font-bold">Regístrate</button></p>
                        <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-3 rounded"><p className="font-bold mb-1">Cuentas de prueba:</p><p>Cliente: cliente@demo.com / 123</p><p>Vendedor: vendedor@demo.com / 123</p><p>Admin: admin@demo.com / 123</p><p>Dueño: dueno@demo.com / 123</p><p>Mecánico: mecanico@demo.com / 123</p></div>
                    </form>
                )}
            </Modal >
        </>
    );
};

export default App;
