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

// Router
import { crearRouterApp } from './router';

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
    const { registrarAlquiler, verificarDisponibilidad } = useContext(ContextoInventario);
    const { calcularDescuentos } = useContext(ContextoPromociones);
    const { mostrarLogin, setMostrarLogin, modoRegistro, setModoRegistro } = usarUI();
    const { sedeActual, setSedeActual } = useContext(ContextoInventario);

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
    const [regDoc, setRegDoc] = useState('');
    const [regNacimiento, setRegNacimiento] = useState('');
    const [regLicencia, setRegLicencia] = useState(false);

    // Checkout State
    const [fechaReserva, setFechaReserva] = useState(new Date().toISOString().split('T')[0]);
    const [horaReserva, setHoraReserva] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
    const [tipoReserva, setTipoReserva] = useState('inmediata'); // inmediata, anticipada
    const [metodoPago, setMetodoPago] = useState('transferencia');
    const [tipoComprobante, setTipoComprobante] = useState('boleta');
    const [datosFactura, setDatosFactura] = useState({ ruc: '', razonSocial: '', direccion: '' });
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [mostrarTerminos, setMostrarTerminos] = useState(false);

    // Estados para descuentos y promociones en el carrito
    const [descuentoTotal, setDescuentoTotal] = useState(0);
    const [promocionesAplicadas, setPromocionesAplicadas] = useState([]);
    const [alertas, setAlertas] = useState([]);

    // Calcular descuentos cuando cambie el carrito
    React.useEffect(() => {
        if (carrito.length > 0) {
            calcularDescuentos(carrito).then(({ descuentoTotal, promocionesAplicadas, alertas }) => {
                setDescuentoTotal(descuentoTotal || 0);
                setPromocionesAplicadas(promocionesAplicadas || []);
                setAlertas(alertas || []);
            }).catch(err => {
                console.error('Error al calcular descuentos:', err);
                setDescuentoTotal(0);
                setPromocionesAplicadas([]);
                setAlertas([]);
            });
        } else {
            setDescuentoTotal(0);
            setPromocionesAplicadas([]);
            setAlertas([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrito]); // Solo depende de carrito, no de calcularDescuentos

    // Total con descuento
    const totalConDescuento = total - descuentoTotal;

    // Cálculos para mostrar en el carrito
    const garantiaUI = totalConDescuento * 0.20; // 20% de garantía
    const totalFinalUI = totalConDescuento + garantiaUI;

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
        if (!usuario.numeroDocumento || !usuario.fechaNacimiento) {
            return { valido: false, mensaje: "Por favor completa tu perfil (DNI y Fecha Nacimiento) antes de alquilar." };
        }

        // Calcular edad
        const hoy = new Date();
        const nacimiento = new Date(usuario.fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        // Validar productos Motor
        const tieneMotor = carrito.some(item => item.categoria === 'Motor');
        if (tieneMotor) {
            if (edad < 18) return { valido: false, mensaje: "Debes ser mayor de 18 años para alquilar vehículos motorizados." };
            if (!usuario.licenciaConducir) return { valido: false, mensaje: "Se requiere licencia de conducir vigente para vehículos motorizados." };
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
            alert("Debes aceptar los términos y condiciones del contrato.");
            return;
        }

        if (tipoComprobante === 'factura' && (!datosFactura.ruc || !datosFactura.razonSocial)) {
            alert("Por favor completa los datos de facturación.");
            return;
        }

        // Validar disponibilidad
        const fechaInicio = new Date(`${fechaReserva}T${horaReserva}`);

        verificarDisponibilidad(carrito, fechaInicio).then(disponibilidad => {
            if (!disponibilidad.valido) {
                alert(disponibilidad.mensaje);
                return;
            }

            // Preparar datos para la reserva (Cálculos se hacen en DB)
            const datosReserva = {
                clienteId: usuario.id,
                vendedorId: 'WEB',
                sedeId: sedeActual,
                items: carrito,
                fechaInicio: fechaInicio,
                tipoReserva,
                metodoPago,
                tipoComprobante,
                datosFactura: tipoComprobante === 'factura' ? datosFactura : null
            };

            registrarAlquiler(datosReserva).then(exito => {
                if (exito) {
                    limpiarCarrito();
                    setEsVisible(false);
                    setAceptaTerminos(false);
                    alert(`¡Reserva Exitosa!\n\nTu reserva ha sido registrada correctamente en el sistema.\nPuedes ver los detalles y el contrato en tu perfil.`);
                }
            });
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

            {/* Modal Carrito */}
            <Modal titulo="Tu Carrito de Compras" abierto={esVisible} alCerrar={() => setEsVisible(false)}>
                {carrito.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Tu carrito está vacío.</p>
                        <Boton variante="fantasma" onClick={() => setEsVisible(false)} className="mt-4">Seguir Navegando</Boton>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                            {carrito.map(item => (
                                <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg">
                                    <img src={item.imagen} alt={item.nombre} className="w-16 h-16 object-cover rounded-md" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{item.nombre}</h4>
                                        <p className="text-sm text-gray-500">{item.horas}h x S/ {item.precioPorHora}</p>
                                        {item.categoria === 'Motor' && <span className="text-xs text-orange-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Requiere Licencia</span>}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">S/ {item.precioPorHora * item.horas * item.cantidad}</p>
                                        <button onClick={() => removerDelCarrito(item.id)} className="text-red-500 text-xs hover:underline mt-1">Eliminar</button>
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
                                        <input type="time" className="w-full p-2 border rounded text-sm" value={horaReserva} onChange={e => setHoraReserva(e.target.value)} />
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
                                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                                />
                                <label htmlFor="terminos" className="text-sm text-gray-700 cursor-pointer">
                                    He leído y acepto los <button type="button" onClick={() => setMostrarTerminos(true)} className="text-blue-600 underline font-bold hover:text-blue-800">Términos y Condiciones</button>, incluyendo la responsabilidad por daños y el depósito de garantía reembolsable.
                                </label>
                            </div>
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

                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">S/ {total.toFixed(2)}</span>
                            </div>

                            {promocionesAplicadas.length > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span className="text-sm flex items-center gap-1"><CheckCircle size={12} /> Descuentos ({promocionesAplicadas.length})</span>
                                    <span className="font-medium">- S/ {descuentoTotal.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-gray-800 font-medium border-t border-gray-100 pt-1">
                                <span className="text-sm">Total Servicio</span>
                                <span>S/ {totalConDescuento.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-green-700">
                                <span className="text-sm">Garantía (20% Reembolsable)</span>
                                <span className="font-medium">S/ {garantiaUI.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-dashed pt-2">
                                <span className="font-bold text-gray-900">Total a Pagar</span>
                                <div className="text-right">
                                    <span className="block text-xl font-bold text-blue-600">S/ {totalFinalUI.toFixed(2)}</span>
                                    <span className="block text-xs text-gray-500">approx. $ {(totalFinalUI / 3.80).toFixed(2)}</span>
                                </div>
                            </div>

                            {tipoReserva === 'anticipada' && (
                                <div className="bg-orange-50 p-2 rounded text-sm space-y-1 mt-2">
                                    <div className="flex justify-between items-center text-blue-800">
                                        <span className="font-medium">Adelanto a Pagar (60%)</span>
                                        <span className="font-bold">S/ {(totalFinalUI * 0.60).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-orange-800">
                                        <span className="font-medium">Saldo Pendiente (40%)</span>
                                        <span className="font-bold">S/ {(totalFinalUI * 0.40).toFixed(2)}</span>
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

            {/* Modal Términos y Condiciones */}
            {mostrarTerminos && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Términos y Condiciones</h2>
                            <button onClick={() => setMostrarTerminos(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto p-2">
                            <p><strong>1. Objeto del Contrato:</strong> El arrendador entrega en alquiler los equipos descritos, y el arrendatario los recibe en perfecto estado de funcionamiento.</p>
                            <p><strong>2. Duración:</strong> El alquiler se pacta por el periodo seleccionado. Cualquier retraso en la devolución generará penalizaciones automáticas.</p>
                            <p><strong>3. Pagos y Cancelaciones:</strong>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Para reservas inmediatas, se debe cancelar el 100% del servicio.</li>
                                    <li>Para reservas anticipadas, se requiere un adelanto del 60%.</li>
                                    <li><strong>Política de No Reembolso:</strong> En caso de cancelación por parte del cliente, no se realizarán reembolsos. Sin embargo, se permite reprogramar el alquiler sujeto a disponibilidad y condiciones especiales.</li>
                                    <li><strong>Reprogramación por Clima/Contingencias:</strong> En caso de mala climatología o contingencias de fuerza mayor, el cliente podrá reprogramar su alquiler sin costo adicional para una fecha futura, sujeto a disponibilidad.</li>
                                </ul>
                            </p>
                            <p><strong>4. Política de No Show (Ausencia):</strong>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Si el cliente no se presenta a recoger el recurso dentro de los <strong>10 minutos</strong> posteriores a la hora acordada, el sistema liberará automáticamente la reserva.</li>
                                    <li>En este caso, no habrá reembolso del monto pagado.</li>
                                </ul>
                            </p>
                            <p><strong>5. Retrasos por Mantenimiento:</strong>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Si un recurso no puede ser entregado a tiempo debido a mantenimiento imprevisto, se aplicará un descuento proporcional al tiempo de espera o se ofrecerá un descuento para la próxima compra.</li>
                                </ul>
                            </p>
                            <p><strong>6. Depósito de Garantía:</strong>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>Se retendrá un depósito de garantía equivalente al 20% del valor total del servicio.</li>
                                    <li>Este depósito es 100% reembolsable al finalizar el alquiler, siempre que los equipos se devuelvan en las mismas condiciones.</li>
                                </ul>
                            </p>
                            <p><strong>7. Responsabilidad por Daños:</strong>
                                <ul className="list-disc pl-5 mt-1">
                                    <li>El arrendatario es el único responsable del cuidado y custodia de los equipos durante el periodo de alquiler.</li>
                                    <li>En caso de daño, pérdida o robo, el arrendatario deberá cubrir el costo total de reparación o reposición del equipo a valor de mercado.</li>
                                    <li>El depósito de garantía se utilizará para cubrir parcialmente estos costos, sin perjuicio de que el arrendador exija el pago del saldo restante.</li>
                                </ul>
                            </p>
                            <p><strong>8. Uso de Vehículos Motorizados:</strong> El conductor declara tener licencia de conducir vigente y ser mayor de edad. El uso es exclusivo para fines recreativos y bajo su propia responsabilidad.</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => setMostrarTerminos(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Login/Registro */}
            <Modal titulo={modoRegistro ? "Crear Cuenta" : "Bienvenido"} abierto={mostrarLogin} alCerrar={() => setMostrarLogin(false)}>
                {modoRegistro ? (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        registrarUsuario({
                            nombre: regNombre,
                            email: regEmail,
                            password: regPass,
                            numeroDocumento: regDoc,
                            fechaNacimiento: regNacimiento,
                            licenciaConducir: regLicencia,
                            tipoDocumento: 'DNI',
                            nacionalidad: 'Nacional'
                        });
                        setMostrarLogin(false);
                        setModoRegistro(false);
                        alert('Cuenta creada exitosamente. ¡Bienvenido!');
                    }} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input required className="w-full p-2 border rounded" value={regNombre} onChange={e => setRegNombre(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input required type="email" className="w-full p-2 border rounded" value={regEmail} onChange={e => setRegEmail(e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">DNI / Documento</label><input required className="w-full p-2 border rounded" value={regDoc} onChange={e => setRegDoc(e.target.value)} /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={regNacimiento}
                                    onChange={e => {
                                        setRegNacimiento(e.target.value);
                                        if (calcularEdadRegistro(e.target.value) < 18) {
                                            setRegLicencia(false);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input required type="password" className="w-full p-2 border rounded" value={regPass} onChange={e => setRegPass(e.target.value)} /></div>

                        <div className={`flex items-center gap-2 p-2 rounded border ${esMenorRegistro ? 'bg-gray-100 opacity-50' : 'bg-gray-50'}`}>
                            <input
                                type="checkbox"
                                id="regLicencia"
                                checked={regLicencia}
                                onChange={e => setRegLicencia(e.target.checked)}
                                disabled={esMenorRegistro}
                            />
                            <label htmlFor="regLicencia" className="text-sm text-gray-700">
                                Tengo Licencia de Conducir {esMenorRegistro && '(Solo mayores de 18)'}
                            </label>
                        </div>

                        <Boton variante="primario" className="w-full py-3" type="submit">Registrarse</Boton>
                        <p className="text-center text-sm text-gray-600">¿Ya tienes cuenta? <button type="button" onClick={() => setModoRegistro(false)} className="text-blue-600 font-bold">Inicia Sesión</button></p>
                    </form>
                ) : (
                    <form onSubmit={manejarLogin} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-4 py-2 rounded-lg border border-gray-300" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" className="w-full px-4 py-2 rounded-lg border border-gray-300" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                        {errorLogin && <div className="text-red-500 text-sm bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle size={16} />{errorLogin}</div>}
                        <Boton variante="primario" className="w-full py-3" type="submit">Ingresar</Boton>
                        <p className="text-center text-sm text-gray-600">¿No tienes cuenta? <button type="button" onClick={() => setModoRegistro(true)} className="text-blue-600 font-bold">Regístrate</button></p>
                        <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-3 rounded"><p className="font-bold mb-1">Cuentas de prueba:</p><p>Cliente: cliente@demo.com / 123</p><p>Vendedor: vendedor@demo.com / 123</p><p>Admin: admin@demo.com / 123</p><p>Dueño: dueno@demo.com / 123</p><p>Mecánico: mecanico@demo.com / 123</p></div>
                    </form>
                )}
            </Modal>
        </>
    );
};

export default App;
