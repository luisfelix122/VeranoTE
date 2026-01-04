import React, { useState, useContext } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingCart, FileText, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

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
// Services - db.js imports removed (moved to Contexts)
import { obtenerTarjetas, agregarTarjeta } from './services/cardService';
import { PREGUNTAS_SECRETAS } from './constants/preguntas';

const router = crearRouterApp();

function App() {
    return (
        /* Preview rama albert-feature */
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
    const { usuario, iniciarSesion, registrarUsuario, recuperarPregunta, verificarRespuesta, restablecerPassword, cargando } = useContext(ContextoAutenticacion);
    const { carrito, removerDelCarrito, esVisible, setEsVisible, total, limpiarCarrito } = useContext(ContextoCarrito);
    const { registrarAlquiler, verificarDisponibilidad, calcularStockDisponible, fechaSeleccionada: fechaReserva, setFechaSeleccionada: setFechaReserva, calcularCotizacion, configuracion } = useContext(ContextoInventario);
    const { calcularDescuentos } = useContext(ContextoPromociones);
    const { mostrarLogin, setMostrarLogin, modoRegistro, setModoRegistro, abrirModalInfo } = usarUI();
    const { sedeActual, setSedeActual, sedes } = useContext(ContextoInventario);

    // Obtener horarios de la sede actual
    const sedeInfo = sedes.find(s => s.id === sedeActual);
    const horaApertura = sedeInfo?.hora_apertura ? sedeInfo.hora_apertura.slice(0, 5) : '08:00';
    const horaCierre = sedeInfo?.hora_cierre ? sedeInfo.hora_cierre.slice(0, 5) : '18:00';

    // Actualizar tipo de cambio al montar


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

    // UI Helpers
    const [showRegPass, setShowRegPass] = useState(false);

    const [errorDni, setErrorDni] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [aceptaTerminosRegistro, setAceptaTerminosRegistro] = useState(false);

    // Checkout State (Moved Up)
    // const [fechaReserva, setFechaReserva] = useState(new Date().toISOString().split('T')[0]); // Moved to ContextoInventario
    const [horaReserva, setHoraReserva] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
    const [tipoReserva, setTipoReserva] = useState('inmediata'); // inmediata, anticipada
    const [metodoPago, setMetodoPago] = useState('transferencia');
    const [tipoComprobante, setTipoComprobante] = useState('boleta');
    const [datosFactura, setDatosFactura] = useState({ ruc: '', razonSocial: '', direccion: '' });
    const [codigoCupon, setCodigoCupon] = useState(''); // Estado para cupón

    // New UX State
    const [erroresRegistro, setErroresRegistro] = useState({});
    const [registroExitoso, setRegistroExitoso] = useState(false);

    // Registro Pregunta Secreta
    const [regPregunta, setRegPregunta] = useState('mascota');
    const [regRespuesta, setRegRespuesta] = useState('');

    // Recovery State
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [recStep, setRecStep] = useState(1); // 1: Email, 2: Pregunta, 3: Nueva Pass
    const [recEmail, setRecEmail] = useState('');
    const [recPregunta, setRecPregunta] = useState('');
    const [recRespuesta, setRecRespuesta] = useState('');
    const [recIdUsuario, setRecIdUsuario] = useState(null);
    const [recPass, setRecPass] = useState('');
    const [recConfirm, setRecConfirm] = useState('');
    const [recError, setRecError] = useState('');
    const [recLoading, setRecLoading] = useState(false);

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

    // Efecto para cargar tarjetas si el usuario está logueado y el modal está abierto
    // Efecto para cargar tarjetas si el usuario está logueado y el modal está abierto
    React.useEffect(() => {
        if (usuario && esVisible && metodoPago === 'tarjeta') {
            obtenerTarjetas(usuario.id).then(tarjetas => {
                setTarjetasGuardadas(tarjetas);
                if (tarjetas.length > 0) {
                    setTarjetaSeleccionada(tarjetas[0].id);
                    setUsarNuevaTarjeta(false);
                } else {
                    setUsarNuevaTarjeta(true);
                }
            });
        }
    }, [usuario, esVisible, metodoPago]);

    // Helpers Tarjeta
    const detectarMarca = (numero) => {
        const n = numero.replace(/\D/g, '');
        if (/^4/.test(n)) return 'Visa';
        if (/^5[1-5]/.test(n)) return 'Mastercard';
        return '';
    };

    const formatearTarjeta = (valor) => {
        const v = valor.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        }
        return v;
    };

    const formatearExpiracion = (valor) => {
        const v = valor.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };



    // Estado para tarjetas en checkout
    const [tarjetasGuardadas, setTarjetasGuardadas] = useState([]);
    const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(''); // ID o 'nueva'
    const [usarNuevaTarjeta, setUsarNuevaTarjeta] = useState(false);
    const [guardarNuevaTarjeta, setGuardarNuevaTarjeta] = useState(false);
    const [showCvv, setShowCvv] = useState(false);
    const [nuevaTarjeta, setNuevaTarjeta] = useState({ numero: '', exp: '', cvv: '', nombre: '', tipo: 'credito', marca: '' });

    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [errorHora, setErrorHora] = useState('');
    const [erroresCheckout, setErroresCheckout] = useState({});
    const [compraExitosa, setCompraExitosa] = useState(false);

    // Refs para scroll en checkout
    const refHorario = React.useRef(null);
    const refTerminos = React.useRef(null);
    const refFactura = React.useRef(null);
    const refTarjeta = React.useRef(null);

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

    // Calcular Totales al cambiar carrito o parametros
    React.useEffect(() => {
        const recalcular = async () => {
            // Si el carrito está vacío, resetear
            if (carrito.length === 0) {
                setTotalesServer(null);
                setAlertas([]);
                return;
            }

            const resultado = await calcularCotizacion(
                carrito.map(item => ({
                    id: item.id,
                    cantidad: item.cantidad,
                    horas: item.horas,
                    categoria: item.categoria
                })),
                fechaReserva,
                tipoReserva,
                usuario?.id,
                codigoCupon // Pasamos el cupón
            );

            console.log("DEBUG: Recalculando con cupón:", codigoCupon);
            console.log("DEBUG: Resultado Cotización:", resultado);

            setTotalesServer({
                subtotal_base: resultado.total_servicio,
                igv: resultado.total_servicio * 0.18,
                subtotal: resultado.total_servicio * 1.18, // Aprox, si backend ya trae IGV ajustar
                descuento: resultado.descuento || 0, // Capturamos el descuento
                garantia: resultado.garantia,
                total: resultado.total_a_pagar,
                total_dolares: resultado.total_a_pagar / (configuracion?.tipo_cambio || 3.8)
            });
            setAlertas(resultado.alertas || []);
        };

        if (esVisible) { // Solo calcular si el modal está abierto para ahorrar recursos
            recalcular();
        }
    }, [carrito, fechaReserva, tipoReserva, usuario, esVisible, configuracion, codigoCupon]);

    const procesarCompra = () => {
        // Helper para scroll suave compensado por el header del modal
        const scrollToRef = (ref) => {
            if (ref && ref.current) {
                ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

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
            scrollToRef(refTerminos);
            return;
        } else {
            setErroresCheckout(prev => ({ ...prev, terminos: null }));
        }

        // Validar Horario de Atención
        if (horaReserva < horaApertura || horaReserva > horaCierre) {
            setErrorHora(`El horario de atención es de ${horaApertura} a ${horaCierre}.`);
            scrollToRef(refHorario);
            return;
        }

        // Validar Hora Pasada (No permitir reservas retroactivas hoy)
        const hoyStr = new Date().toISOString().split('T')[0];
        if (fechaReserva === hoyStr) {
            const ahora = new Date();
            const [hReserva, mReserva] = horaReserva.split(':').map(Number);
            const minutosReserva = hReserva * 60 + mReserva;
            const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

            if (minutosReserva < minutosAhora) {
                setErrorHora("No puedes reservar en una hora que ya pasó.");
                scrollToRef(refHorario);
                return;
            }
        }

        // Validar Cierre (Duración del alquiler debe caber antes del cierre)
        const [hCierre, mCierre] = horaCierre.split(':').map(Number);
        const minutosCierre = hCierre * 60 + mCierre;
        const [hInicio, mInicio] = horaReserva.split(':').map(Number);
        const minutosInicio = hInicio * 60 + mInicio;

        // Buscar la duración máxima en el carrito para asegurar que todo cabe
        const maxDuracion = Math.max(...carrito.map(i => i.horas));


        const minutosDuracion = maxDuracion * 60;

        if (minutosInicio + minutosDuracion > minutosCierre) {
            setErrorHora(`La reserva excede el horario de cierre (${horaCierre}). Reduce las horas o elige un horario más temprano.`);
            scrollToRef(refHorario);
            return;
        }

        // Validar al menos 1 hora antes del cierre (Redundante pero explícito por seguridad)
        if (minutosInicio > minutosCierre - 60) {
            setErrorHora(`Debes reservar al menos 1 hora antes del cierre.`);
            scrollToRef(refHorario);
            return;
        }

        if (tipoComprobante === 'factura') {
            if (!datosFactura.ruc || datosFactura.ruc.length !== 11) {
                setErroresCheckout(prev => ({ ...prev, factura: "El RUC debe tener 11 dígitos.", ruc: "Faltan dígitos" }));
                scrollToRef(refFactura);
                return;
            }
            if (!datosFactura.razonSocial) {
                setErroresCheckout(prev => ({ ...prev, factura: "Por favor completa la Razón Social.", razonSocial: "Requerido" }));
                scrollToRef(refFactura);
                return;
            }
            if (!datosFactura.direccion) {
                setErroresCheckout(prev => ({ ...prev, factura: "Por favor completa la Dirección Fiscal.", direccion: "Requerido" }));
                scrollToRef(refFactura);
                return;
            }
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

        // Lógica de Pago con Tarjeta
        const completarReserva = async (tokenTarjeta = null) => {
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
                datosFactura: tipoComprobante === 'factura' ? datosFactura : null,
                tokenTarjeta: tokenTarjeta // Nuevo: token o ID de tarjeta si aplica
            };

            setAceptaTerminos(false); // UI Loader

            try {
                const exito = await registrarAlquiler(datosReserva);
                if (exito) {
                    setCompraExitosa(true);
                } else {
                    setAceptaTerminos(true);
                }
            } catch (err) {
                console.error("Error crítico en checkout:", err);
                alert("Ocurrió un error al procesar tu reserva.");
                setAceptaTerminos(true);
            }
        };

        if (metodoPago === 'tarjeta') {
            if (usarNuevaTarjeta) {
                // Validar campos de tarjeta nueva
                let erroresTarjeta = {};
                if (!nuevaTarjeta.numero || nuevaTarjeta.numero.length < 15) erroresTarjeta.tarjetaNumero = "Número incompleto o inválido";
                if (!nuevaTarjeta.exp || !/^\d{2}\/\d{2}$/.test(nuevaTarjeta.exp)) erroresTarjeta.tarjetaExp = "Formato MM/YY";
                if (!nuevaTarjeta.cvv || nuevaTarjeta.cvv.length < 3) erroresTarjeta.tarjetaCvv = "Inválido";
                if (!nuevaTarjeta.nombre) erroresTarjeta.tarjetaNombre = "Requerido";

                if (Object.keys(erroresTarjeta).length > 0) {
                    setErroresCheckout(prev => ({ ...prev, ...erroresTarjeta }));
                    scrollToRef(refTarjeta);
                    return;
                }

                // Guardar tarjeta si seleccionó checkbox
                if (guardarNuevaTarjeta) {
                    agregarTarjeta(usuario.id, { ...nuevaTarjeta, principal: tarjetasGuardadas.length === 0 })
                        .then(res => {
                            if (res.success) {
                                completarReserva(res.data.id); // Usar ID de la tarjeta guardada
                            } else {
                                alert("Error al guardar tarjeta, pero intentaremos procesar el pago.");
                                completarReserva('token_temporal_' + Date.now()); // Token simulado
                            }
                        });
                } else {
                    // Pago con tarjeta simulación (sin guardar)
                    completarReserva('token_temporal_' + Date.now());
                }
            } else {
                // Usar tarjeta seleccionada
                if (!tarjetaSeleccionada) {
                    alert("Por favor selecciona una tarjeta o agrega una nueva.");
                    return;
                }
                completarReserva(tarjetaSeleccionada);
            }
        } else {
            // Otros métodos de pago
            completarReserva();
        }
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
                            <div ref={refHorario} className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
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
                                    <p className="text-[10px] text-gray-500 italic mt-1">* Este tipo de reserva aplica a todos los items de la orden actual.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select className="w-full p-2 border rounded text-sm mb-2" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                                        <option value="transferencia">Transferencia Bancaria</option>
                                        <option value="yape">Yape / Plin</option>
                                        <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                                        <option value="efectivo">Efectivo (En tienda)</option>
                                    </select>

                                    {/* Cupón de Descuento */}
                                    <div className="mt-4 border-t border-gray-100 pt-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Cupón de Descuento</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="EJ: VERANO2025"
                                                className="flex-1 p-2 border rounded text-sm uppercase"
                                                value={codigoCupon}
                                                onChange={e => setCodigoCupon(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        {promocionesAplicadas.length > 0 && (
                                            <p className="text-xs text-green-600 mt-1 font-bold">¡Cupón aplicado!</p>
                                        )}
                                    </div>

                                    {/* Selección de Tarjeta */}
                                    {metodoPago === 'tarjeta' && (
                                        <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                                            {tarjetasGuardadas.length > 0 && (
                                                <div className="mb-3">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Seleccionar Tarjeta</label>
                                                    <select
                                                        className="w-full p-2 border rounded text-sm"
                                                        value={usarNuevaTarjeta ? 'nueva' : tarjetaSeleccionada}
                                                        onChange={e => {
                                                            if (e.target.value === 'nueva') {
                                                                setUsarNuevaTarjeta(true);
                                                            } else {
                                                                setUsarNuevaTarjeta(false);
                                                                setTarjetaSeleccionada(e.target.value);
                                                            }
                                                        }}
                                                    >
                                                        {tarjetasGuardadas.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.marca || 'Tarjeta'} terminada en {t.numero_oculto ? t.numero_oculto.slice(-4) : '****'}
                                                            </option>
                                                        ))}
                                                        <option value="nueva">+ Usar una nueva tarjeta</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* Formulario Nueva Tarjeta */}
                                            {(usarNuevaTarjeta || tarjetasGuardadas.length === 0) && (
                                                <div ref={refTarjeta} className="space-y-2 animate-fadeIn">
                                                    <div className="relative">
                                                        <input
                                                            placeholder="Número de Tarjeta"
                                                            className={`w-full p-2 pl-2 border rounded text-sm ${erroresCheckout.tarjetaNumero ? 'border-red-500' : ''}`}
                                                            value={formatearTarjeta(nuevaTarjeta.numero)}
                                                            maxLength={19}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/\s+/g, '').replace(/\D/g, '');
                                                                setNuevaTarjeta({ ...nuevaTarjeta, numero: val, marca: detectarMarca(val) });
                                                                setErroresCheckout(prev => ({ ...prev, tarjetaNumero: null }));
                                                            }}
                                                        />
                                                        {nuevaTarjeta.marca && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                                                {nuevaTarjeta.marca}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {erroresCheckout.tarjetaNumero && <p className="text-xs text-red-500">{erroresCheckout.tarjetaNumero}</p>}


                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            placeholder="MM/YY"
                                                            className={`w-full p-2 border rounded text-sm ${erroresCheckout.tarjetaExp ? 'border-red-500' : ''}`}
                                                            value={nuevaTarjeta.exp}
                                                            maxLength={5}
                                                            onChange={e => {
                                                                setNuevaTarjeta({ ...nuevaTarjeta, exp: formatearExpiracion(e.target.value) });
                                                                setErroresCheckout(prev => ({ ...prev, tarjetaExp: null }));
                                                            }}
                                                        />
                                                        <div className="relative">
                                                            <input
                                                                placeholder="CVV"
                                                                type={showCvv ? "text" : "password"}
                                                                className={`w-full p-2 border rounded text-sm ${erroresCheckout.tarjetaCvv ? 'border-red-500' : ''}`}
                                                                value={nuevaTarjeta.cvv}
                                                                maxLength={nuevaTarjeta.marca === 'Amex' ? 4 : 3}
                                                                onChange={e => {
                                                                    setNuevaTarjeta({ ...nuevaTarjeta, cvv: e.target.value.replace(/\D/g, '') });
                                                                    setErroresCheckout(prev => ({ ...prev, tarjetaCvv: null }));
                                                                }}
                                                                onClick={() => setNuevaTarjeta(prev => ({ ...prev, cvv: '' }))} // Auto-limpiar al click como en Perfil
                                                            />
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                                onClick={() => setShowCvv(!showCvv)}
                                                            >
                                                                {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <input
                                                        placeholder="Nombre del Titular"
                                                        className={`w-full p-2 border rounded text-sm ${erroresCheckout.tarjetaNombre ? 'border-red-500' : ''}`}
                                                        value={nuevaTarjeta.nombre}
                                                        onChange={e => {
                                                            setNuevaTarjeta({ ...nuevaTarjeta, nombre: e.target.value.toUpperCase() });
                                                            setErroresCheckout(prev => ({ ...prev, tarjetaNombre: null }));
                                                        }}
                                                    />

                                                    {/* Opción Guardar Tarjeta */}
                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                                        <input
                                                            type="checkbox"
                                                            id="guardarTarjeta"
                                                            className="w-4 h-4 text-blue-600 rounded"
                                                            checked={guardarNuevaTarjeta}
                                                            onChange={e => setGuardarNuevaTarjeta(e.target.checked)}
                                                        />
                                                        <label htmlFor="guardarTarjeta" className="text-xs text-gray-600 cursor-pointer select-none">
                                                            Guardar esta tarjeta para futuras compras
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                        <div ref={refFactura} className="grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                                            <div>
                                                <input
                                                    placeholder="RUC (11 dígitos)"
                                                    className={`w-full p-2 border rounded text-sm ${erroresCheckout.ruc ? 'border-red-500 bg-red-50' : ''}`}
                                                    value={datosFactura.ruc}
                                                    maxLength={11}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, ''); // Solo números
                                                        setDatosFactura({ ...datosFactura, ruc: val });
                                                        // Limpiar error si ya tiene 11
                                                        if (val.length === 11 && erroresCheckout.ruc) {
                                                            setErroresCheckout(prev => ({ ...prev, ruc: null }));
                                                        }
                                                    }}
                                                />
                                                {erroresCheckout.ruc && <p className="text-xs text-red-500 mt-1">{erroresCheckout.ruc}</p>}
                                            </div>
                                            <input
                                                placeholder="Razón Social"
                                                className={`w-full p-2 border rounded text-sm ${erroresCheckout.razonSocial ? 'border-red-500 bg-red-50' : ''}`}
                                                value={datosFactura.razonSocial}
                                                onChange={e => {
                                                    setDatosFactura({ ...datosFactura, razonSocial: e.target.value });
                                                    setErroresCheckout(prev => ({ ...prev, razonSocial: null }));
                                                }}
                                            />
                                            <input
                                                placeholder="Dirección Fiscal"
                                                className={`w-full p-2 border rounded text-sm ${erroresCheckout.direccion ? 'border-red-500 bg-red-50' : ''}`}
                                                value={datosFactura.direccion}
                                                onChange={e => {
                                                    setDatosFactura({ ...datosFactura, direccion: e.target.value });
                                                    setErroresCheckout(prev => ({ ...prev, direccion: null }));
                                                }}
                                            />
                                        </div>
                                    )}
                                    {erroresCheckout.factura && <p className="text-xs font-bold text-red-600 mt-1 animate-pulse">{erroresCheckout.factura}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2"><FileText size={18} /> Contrato Digital</h4>
                            <div ref={refTerminos} className="flex items-start gap-2">
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

                            <div className="flex justify-between items-center text-gray-500 text-sm">
                                <span>Subtotal Base</span>
                                <span>S/ {totalesServer?.subtotal_base?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-500 text-sm">
                                <span>IGV (18%)</span>
                                <span>S/ {totalesServer?.igv?.toFixed(2) || '0.00'}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-800 font-medium border-t border-gray-100 pt-1 mt-1">
                                <span className="text-sm">Total Servicio</span>
                                <span>S/ {totalesServer?.subtotal?.toFixed(2) || '0.00'}</span>
                            </div>

                            {/* Mostrar Descuento si existe */}
                            {totalesServer?.descuento > 0 && (
                                <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                                    <span className="">Descuento Aplicado</span>
                                    <span>- S/ {totalesServer.descuento.toFixed(2)}</span>
                                </div>
                            )}

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
            </Modal >



            {/* Modal Login/Registro/Recuperación */}
            < Modal titulo={recoveryMode ? "Recuperar Contraseña" : (modoRegistro ? "Crear Cuenta" : "Bienvenido")} abierto={mostrarLogin} alCerrar={() => {
                setMostrarLogin(false);
                setRegistroExitoso(false);
                setErroresRegistro({});
                setRecoveryMode(false);
                setRecStep(1);
                setRecError('');
            }
            } zIndex={60} >
                {
                    recoveryMode ? (
                        <div className="space-y-6 py-2" >
                            {recStep === 1 && (
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setRecLoading(true);
                                    setRecError('');
                                    const res = await recuperarPregunta(recEmail);
                                    setRecLoading(false);
                                    if (res.success) {
                                        // Buscar texto de la pregunta
                                        const pregObj = PREGUNTAS_SECRETAS.find(p => p.id === res.pregunta);
                                        setRecPregunta(pregObj ? pregObj.texto : res.pregunta);
                                        setRecStep(2);
                                    } else {
                                        setRecError(res.error);
                                    }
                                }} className="space-y-4">
                                    <p className="text-sm text-gray-600">Ingresa tu correo electrónico para buscar tu pregunta de seguridad.</p>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Email Registrado</label>
                                        <input type="email" className="w-full p-3 border rounded-xl" value={recEmail} onChange={e => setRecEmail(e.target.value)} required />
                                    </div>
                                    {recError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={16} /> {recError}</div>}
                                    <div className="flex gap-3">
                                        <Boton type="button" variante="secundario" onClick={() => setRecoveryMode(false)} className="flex-1">Cancelar</Boton>
                                        <Boton type="submit" variante="primario" className="flex-1" disabled={recLoading}>{recLoading ? 'Buscando...' : 'Continuar'}</Boton>
                                    </div>
                                </form>
                            )}

                            {
                                recStep === 2 && (
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setRecLoading(true);
                                        setRecError('');
                                        const res = await verificarRespuesta(recEmail, recRespuesta);
                                        setRecLoading(false);
                                        if (res.success) {
                                            setRecIdUsuario(res.userId);
                                            setRecStep(3);
                                        } else {
                                            setRecError(res.error);
                                        }
                                    }} className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Pregunta de Seguridad</p>
                                            <p className="text-lg text-gray-800 font-medium">{recPregunta}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Tu Respuesta</label>
                                            <input type="text" className="w-full p-3 border rounded-xl" value={recRespuesta} onChange={e => setRecRespuesta(e.target.value)} required placeholder="Escribe tu respuesta..." />
                                        </div>
                                        {recError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={16} /> {recError}</div>}
                                        <div className="flex gap-3">
                                            <Boton type="button" variante="secundario" onClick={() => setRecStep(1)} className="flex-1">Atrás</Boton>
                                            <Boton type="submit" variante="primario" className="flex-1" disabled={recLoading}>{recLoading ? 'Verificar' : 'Siguiente'}</Boton>
                                        </div>
                                    </form>
                                )
                            }

                            {
                                recStep === 3 && (
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (recPass !== recConfirm) {
                                            setRecError('Las contraseñas no coinciden');
                                            return;
                                        }
                                        if (recPass.length < 6) {
                                            setRecError('La contraseña debe tener 6 caracteres o más');
                                            return;
                                        }
                                        setRecLoading(true);
                                        const res = await restablecerPassword(recIdUsuario, { password: recPass }); // Usamos wrapper desde context
                                        setRecLoading(false);
                                        if (res.success) {
                                            alert('¡Contraseña actualizada! Inicia sesión con tu nueva clave.');
                                            setRecoveryMode(false);
                                            setRecStep(1);
                                            setRecPass('');
                                            setRecConfirm('');
                                            setRecEmail('');
                                        } else {
                                            setRecError('Error al actualizar contraseña. Intente nuevamente.');
                                        }
                                    }} className="space-y-4">
                                        <div className="bg-green-50 p-3 rounded-lg text-green-700 text-sm flex items-center gap-2 justify-center">
                                            <CheckCircle size={16} /> Respuesta correcta. Establece tu nueva clave.
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                                            <input type="password" className="w-full p-3 border rounded-xl" value={recPass} onChange={e => setRecPass(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Contraseña</label>
                                            <input type="password" className="w-full p-3 border rounded-xl" value={recConfirm} onChange={e => setRecConfirm(e.target.value)} required />
                                        </div>
                                        {recError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={16} /> {recError}</div>}
                                        <Boton type="submit" variante="primario" className="w-full" disabled={recLoading}>{recLoading ? 'Guardando...' : 'Finalizar'}</Boton>
                                    </form>
                                )
                            }
                        </div >
                    ) : (
                        modoRegistro ? (
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

                                    // Validar Respuesta Secreta
                                    if (!regRespuesta.trim()) nuevosErrores.respuesta = "La respuesta secreta es obligatoria.";

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
                                        nacionalidad: regNacionalidad,
                                        preguntaSecreta: regPregunta,
                                        respuestaSecreta: regRespuesta
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
                                        <div className="relative">
                                            <input
                                                type={showRegPass ? "text" : "password"}
                                                className={`w-full p-2 pr-10 border rounded ${erroresRegistro.password ? 'border-red-500 bg-red-50' : ''}`}
                                                value={regPass}
                                                onChange={e => setRegPass(e.target.value)}
                                                placeholder="********"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowRegPass(!showRegPass)}
                                            >
                                                {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {erroresRegistro.password && <p className="text-xs text-red-500 mt-1">{erroresRegistro.password}</p>}
                                    </div>

                                    {/* Pregunta Secreta */}
                                    <div className="grid md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <div className="md:col-span-2">
                                            <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide flex items-center gap-1">
                                                <CheckCircle size={12} /> Recuperación de Cuenta
                                            </h4>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Pregunta Secreta</label>
                                            <select
                                                className="w-full p-2 border rounded text-sm bg-white"
                                                value={regPregunta}
                                                onChange={e => setRegPregunta(e.target.value)}
                                            >
                                                {PREGUNTAS_SECRETAS.map(p => (
                                                    <option key={p.id} value={p.id}>{p.texto}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Respuesta</label>
                                            <input
                                                className={`w-full p-2 border rounded text-sm ${erroresRegistro.respuesta ? 'border-red-500 bg-red-50' : ''}`}
                                                value={regRespuesta}
                                                onChange={e => {
                                                    setRegRespuesta(e.target.value);
                                                    setErroresRegistro(prev => ({ ...prev, respuesta: '' }));
                                                }}
                                                placeholder="Ej. Fido"
                                            />
                                            {erroresRegistro.respuesta && <p className="text-xs text-red-500 mt-1">{erroresRegistro.respuesta}</p>}
                                        </div>
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
                                <div className="text-right">
                                    <button type="button" onClick={() => setRecoveryMode(true)} className="text-xs text-blue-600 hover:underline">¿Olvidaste tu contraseña?</button>
                                </div>
                                {errorLogin && <div className="text-red-500 text-sm bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle size={16} />{errorLogin}</div>}
                                <Boton type="submit" variante="primario" className="w-full">Iniciar Sesión</Boton>
                                <p className="text-center text-sm text-gray-600">¿No tienes cuenta? <button type="button" onClick={() => setModoRegistro(true)} className="text-blue-600 font-bold">Regístrate</button></p>

                            </form>
                        ))}
            </Modal >
        </>
    );
};

export default App;
