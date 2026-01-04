import React, { useState, useContext } from 'react';
import { CreditCard, UserPlus, Search, X, Clock, Calendar } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import Boton from '../components/ui/Boton';
import Modal from '../components/ui/Modal';

const PuntoVenta = () => {
    const { inventario, registrarAlquiler, buscarClientes, registrarCliente, cotizarReserva, horarios } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);
    const [carritoVenta, setCarritoVenta] = useState([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Estados para búsqueda de clientes
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [mostrandoResultados, setMostrandoResultados] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', email: '', password: '123', numeroDocumento: '' });
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [modalCrearClienteAbierto, setModalCrearClienteAbierto] = useState(false);
    const [modalTerminosAbierto, setModalTerminosAbierto] = useState(false);

    // Estado para modal de configuración de alquiler
    const [productoAAnadir, setProductoAAnadir] = useState(null);
    const [configuracionAlquiler, setConfiguracionAlquiler] = useState({
        horas: 1,
        fechaInicio: new Date().toISOString().slice(0, 16), // Formato datetime-local
        tipoReserva: 'inmediata' // 'inmediata' | 'anticipada'
    });

    // Estado contrato
    const [contratoAceptado, setContratoAceptado] = useState(false);

    // Nuevos estados para pagos
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [tipoComprobante, setTipoComprobante] = useState('boleta');
    const [datosFactura, setDatosFactura] = useState({ ruc: '', razonSocial: '', direccion: '' });

    // Estado para totales calculados por backend
    const [totales, setTotales] = useState({
        totalServicio: 0,
        garantia: 0,
        totalFinal: 0,
        totalFinal: 0,
        descuento: 0
    });

    // Cupones
    const [codigoCupon, setCodigoCupon] = useState('');

    // Efecto para cotizar cada vez que cambia el carrito
    React.useEffect(() => {
        const actualizarCotizacion = async () => {
            if (carritoVenta.length === 0) {
                setTotales({ totalServicio: 0, garantia: 0, totalFinal: 0, descuento: 0 });
                return;
            }

            // Llamar al backend para calcular
            const resultado = await cotizarReserva(carritoVenta, new Date(), codigoCupon); // Usar fecha actual o la del primer item

            if (resultado) {
                setTotales({
                    totalServicio: resultado.total_servicio || 0,
                    garantia: resultado.garantia || 0,
                    totalFinal: resultado.total_a_pagar || 0,
                    descuento: resultado.descuento_total || 0
                });
            }
        };

        actualizarCotizacion();
    }, [carritoVenta, cotizarReserva, codigoCupon]);

    const manejarBusquedaCliente = async (texto) => {
        setClienteNombre(texto);
        if (clienteSeleccionado && texto !== clienteSeleccionado.nombre) {
            setClienteSeleccionado(null);
        }

        if (texto.length > 2) {
            const res = await buscarClientes(texto);
            setResultadosBusqueda(res || []);
            setMostrandoResultados(true);
        } else {
            setResultadosBusqueda([]);
            setMostrandoResultados(false);
        }
    };

    const seleccionarCliente = (cliente) => {
        setClienteSeleccionado(cliente);
        setClienteNombre(cliente.nombre);
        setMostrandoResultados(false);
    };

    const guardarNuevoCliente = async () => {
        if (!nuevoCliente.nombre || !nuevoCliente.email || !nuevoCliente.numeroDocumento) {
            return alert("Complete todos los campos obligatorios");
        }

        const res = await registrarCliente(nuevoCliente);
        if (res.success) {
            alert("Cliente creado correctamente");
            setModalCrearClienteAbierto(false);
            setNuevoCliente({ nombre: '', email: '', password: '123', numeroDocumento: '' });
            // Auto-seleccionar
            seleccionarCliente({ ...res.data, nombre: nuevoCliente.nombre }); // Optimista o usar respuesta
        } else {
            alert(res.error?.message || "Error al crear cliente");
        }
    };

    const abrirModalProducto = (producto) => {
        if (!clienteSeleccionado) {
            return alert("⚠️ Por favor, seleccione un cliente primero antes de agregar productos.");
        }
        setProductoAAnadir(producto);
        setConfiguracionAlquiler({
            horas: 1,
            fechaInicio: new Date().toISOString().slice(0, 16),
            tipoReserva: 'inmediata'
        });
    };

    const confirmarAgregarProducto = () => {
        if (!productoAAnadir) return;

        const inicio = configuracionAlquiler.tipoReserva === 'inmediata' ? new Date() : new Date(configuracionAlquiler.fechaInicio);
        const fin = new Date(inicio.getTime() + (Number(configuracionAlquiler.horas) * 60 * 60 * 1000));

        // 🟢 VALIDACIÓN DE HORARIO DE CIERRE
        const diaSemana = inicio.getDay(); // 0 = Domingo
        const sedeId = usuario?.sede || 'costa';
        const horarioHoy = horarios.find(h => h.sede_id === sedeId && h.dia_semana === diaSemana);

        if (horarioHoy && !horarioHoy.cerrado) {
            const [hCierre, mCierre] = horarioHoy.hora_cierre.split(':').map(Number);
            const horaCierre = new Date(inicio);
            horaCierre.setHours(hCierre, mCierre, 0, 0);

            if (fin > horaCierre) {
                return alert(`⚠️ No se puede alquilar por ${configuracionAlquiler.horas}h. El local cierra a las ${horarioHoy.hora_cierre.slice(0, 5)} y el alquiler terminaría a las ${fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
            }
        }

        const nuevoItem = {
            ...productoAAnadir,
            cantidad: 1,
            horas: Number(configuracionAlquiler.horas),
            fechaInicio: inicio,
            tipoReserva: configuracionAlquiler.tipoReserva
        };

        setCarritoVenta(prev => [...prev, { ...nuevoItem, idTemp: Date.now() }]);
        setProductoAAnadir(null);
    };

    // Cálculos locales eliminados, ahora usamos 'totales' del backend
    // const totalVenta = carritoVenta.reduce((acc, item) => acc + (item.precioPorHora * item.horas * item.cantidad), 0);
    // const garantiaVenta = totalVenta * 0.20;
    // const totalFinalVenta = totalVenta + garantiaVenta;

    const procesarVenta = () => {
        if (carritoVenta.length === 0) return alert('Carrito vacío');
        if (!clienteSeleccionado) return alert('Por favor seleccione un cliente de la lista o registre uno nuevo.');
        if (!contratoAceptado) return alert('Debe aceptar los Términos y Condiciones del Contrato Digital.');

        if (tipoComprobante === 'factura' && (!datosFactura.ruc || !datosFactura.razonSocial)) {
            return alert("Por favor complete los datos de facturación (RUC y Razón Social)");
        }

        // Determinar si es mixta o predominante (simplificación: si hay al menos una anticipada, todo el cart se trata como anticipado? 
        // Mejor: Si todos son inmediata -> Inmediata. Si hay mezclado -> Error o forzar anticipada?
        // User request logic: "si decide anticipada... se clasifique como pendiente".
        // ASUMPTION: El carrito entero se procesa junto. Si hay items anticipados, tratamos como 'confirmado' (pendiente entrega).
        // Si TODOS son inmediata, entonces 'en_uso'.

        const tieneAnticipada = carritoVenta.some(i => i.tipoReserva === 'anticipada');
        const tieneMotor = carritoVenta.some(i => i.categoria === 'Motor');
        const estadoFinal = (tieneAnticipada || tieneMotor) ? 'confirmado' : 'en_uso';

        // Calcular montos
        const totalPagar = totales.totalFinal;
        const adelanto = tieneAnticipada ? totalPagar * 0.60 : totalPagar;
        const saldo = totalPagar - adelanto;

        const nuevoAlquiler = {
            id: crypto.randomUUID(),
            cliente: clienteNombre,
            clienteId: clienteSeleccionado.id,
            vendedorId: usuario ? usuario.id : null,
            items: carritoVenta,
            total: totales.totalServicio,
            garantia: totales.garantia,
            totalFinal: totales.totalFinal,

            montoPagado: adelanto,
            saldoPendiente: saldo,

            fechaInicio: tieneAnticipada ? carritoVenta[0].fechaInicio : new Date(), // Usar fecha del primero si es anticipada
            tipoReserva: tieneAnticipada ? 'anticipada' : 'inmediata',
            metodoPago,
            tipoComprobante,
            datosFactura: tipoComprobante === 'factura' ? datosFactura : null,
            estado: estadoFinal,
            penalizacion: 0,
            sedeId: usuario?.sede || 'costa'
        };

        registrarAlquiler(nuevoAlquiler);
        setCarritoVenta([]);
        setClienteNombre('');
        setDatosFactura({ ruc: '', razonSocial: '', direccion: '' });
        setContratoAceptado(false);

        const mensaje = tieneAnticipada
            ? `Reserva Anticipada Registrada.\n\nAdelanto (60%): S/ ${adelanto.toFixed(2)}\nSaldo Pendiente: S/ ${saldo.toFixed(2)}`
            : `Venta Inmediata Registrada.\n\nTotal Cobrado: S/ ${totalPagar.toFixed(2)}`;

        alert(mensaje);
    };

    const productosFiltrados = inventario.filter(p => {
        const coincideSede = (usuario?.rol === 'admin' || usuario?.rol === 'vendedor') ? p.sedeId === usuario.sede : true;
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.categoria.toLowerCase().includes(busqueda.toLowerCase());
        return coincideSede && coincideBusqueda;
    });

    return (
        <div className="grid md:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 h-[calc(100vh-100px)]">
            <div className="md:col-span-2 flex flex-col gap-4 h-full">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Catálogo</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2">
                    {productosFiltrados.map(prod => (
                        <div key={prod.id} onClick={() => prod.stock > 0 && abrirModalProducto(prod)} className={`bg-white p-3 rounded-lg border cursor-pointer hover:border-blue-500 transition-all ${prod.stock === 0 ? 'opacity-50 grayscale' : 'hover:shadow-md'} ${!clienteSeleccionado ? 'opacity-70' : ''}`}>
                            <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                <img src={prod.imagen} alt={prod.nombre} className="object-cover w-full h-full" onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                            </div>
                            <p className="font-bold text-sm truncate">{prod.nombre}</p>
                            <p className="text-xs text-gray-500">{prod.categoria}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="font-bold text-blue-600">S/ {prod.precioPorHora}/h</span>
                                <div className="flex flex-col items-end">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${prod.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {prod.stock} unid.
                                    </span>
                                    {prod.stock === 0 && prod.detalleDisponibilidad?.proximosLiberados?.length > 0 && (
                                        <span className="text-[10px] text-orange-600 font-medium mt-1">
                                            Libre: {(() => {
                                                const d = new Date(prod.detalleDisponibilidad.proximosLiberados[0].hora || prod.detalleDisponibilidad.proximosLiberados[0]);
                                                // Añadir buffer de limpieza (10 min motores, 2 min otros)
                                                const buffer = prod.categoria === 'Motor' ? 10 : 2;
                                                d.setMinutes(d.getMinutes() + buffer);
                                                const hoy = new Date();
                                                const horaStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                return d.toDateString() === hoy.toDateString() ? `Hoy ${horaStr}` : `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${horaStr}`;
                                            })()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard size={20} /> Ticket de Venta</h2>

                <div className="space-y-3 mb-4 flex-shrink-0">
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="Ingrese DNI del cliente..."
                                className={`w-full p-2 border rounded text-sm ${clienteSeleccionado ? 'border-green-500 bg-green-50' : ''}`}
                                value={clienteNombre}
                                onChange={e => manejarBusquedaCliente(e.target.value)}
                                onFocus={() => clienteNombre.length > 2 && setMostrandoResultados(true)}
                            />
                            <Boton
                                variante="secundario"
                                className="!px-2"
                                onClick={() => {
                                    setNuevoCliente(prev => ({ ...prev, numeroDocumento: clienteNombre.replace(/\D/g, '') }));
                                    setModalCrearClienteAbierto(true);
                                }}
                                title="Nuevo Cliente"
                            >
                                <UserPlus size={18} />
                            </Boton>
                        </div>
                        {mostrandoResultados && (
                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                                {resultadosBusqueda.length > 0 ? (
                                    resultadosBusqueda.map(c => (
                                        <div key={c.id} className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0" onClick={() => seleccionarCliente(c)}>
                                            <p className="font-bold">{c.nombre}</p>
                                            <p className="text-xs text-gray-500">DNI: {c.numero_documento}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-sm text-gray-400 text-center flex flex-col items-end">
                                        <p className="w-full text-center mb-1">No se encontraron resultados</p>
                                        <div className="flex items-center gap-1 text-blue-500 font-medium animate-pulse">
                                            <span>Crear nuevo</span>
                                            <span className="text-lg">↗</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {clienteSeleccionado && <p className="text-xs text-green-600 mt-1">✓ Cliente seleccionado: {clienteSeleccionado.nombre}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="w-full p-2 border rounded text-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="yape">Yape/Plin</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                        <div className="flex gap-2 items-center justify-center border rounded bg-gray-50 px-2">
                            <label className="flex items-center gap-1 text-xs cursor-pointer mr-2">
                                <input type="radio" name="posComprobante" value="boleta" checked={tipoComprobante === 'boleta'} onChange={() => setTipoComprobante('boleta')} /> Boleta
                            </label>
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input type="radio" name="posComprobante" value="factura" checked={tipoComprobante === 'factura'} onChange={() => setTipoComprobante('factura')} /> Factura
                            </label>
                        </div>
                    </div>

                    {tipoComprobante === 'factura' && (
                        <div className="space-y-2 bg-gray-50 p-2 rounded animate-fadeIn">
                            <input
                                placeholder="RUC (11 dígitos)"
                                className="w-full p-1 border rounded text-xs"
                                value={datosFactura.ruc}
                                maxLength={11}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 11) setDatosFactura({ ...datosFactura, ruc: val });
                                }}
                            />
                            <input
                                placeholder="Razón Social"
                                className="w-full p-1 border rounded text-xs"
                                value={datosFactura.razonSocial}
                                onChange={e => setDatosFactura({ ...datosFactura, razonSocial: e.target.value })}
                            />
                            <input
                                placeholder="Dirección Fiscal"
                                className="w-full p-1 border rounded text-xs"
                                value={datosFactura.direccion}
                                onChange={e => setDatosFactura({ ...datosFactura, direccion: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* Contrato Digital */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm">
                        <span className="p-1 bg-blue-100 rounded">📄</span> Contrato Digital
                    </div>
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-1"
                            checked={contratoAceptado}
                            onChange={(e) => setContratoAceptado(e.target.checked)}
                        />
                        <span className="text-xs">
                            He leído y acepto los <button onClick={() => setModalTerminosAbierto(true)} className="text-blue-600 underline font-medium">Términos y Condiciones</button>,
                            incluyendo la responsabilidad por daños y el depósito de garantía reembolsable.
                        </span>
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="border-t border-b py-2 space-y-2">
                        {carritoVenta.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">Carrito vacío</p>
                        ) : (
                            carritoVenta.map(item => (
                                <div key={item.idTemp} className="flex justify-between text-sm pb-2 border-b border-dashed last:border-0 p-2">
                                    <div>
                                        <p className="font-medium">{item.nombre}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={10} /> {item.horas}h x S/ {item.precioPorHora}
                                        </p>
                                        <p className="text-xs text-gray-400">Inicio: {new Date(item.fechaInicio).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-between">
                                        <p className="font-bold">S/ {(item.precioPorHora * item.horas * item.cantidad).toFixed(2)}</p>
                                        <button onClick={() => setCarritoVenta(prev => prev.filter(p => p.idTemp !== item.idTemp))} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                                            <X size={12} /> Quitar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex-shrink-0 pt-4 space-y-2 px-2 pb-4">
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span className="">Subtotal Base</span>
                            <span>S/ {(Number(totales.totalServicio) || 0).toFixed(2)}</span>
                        </div>

                        {/* Input Cupón */}
                        <div className="flex items-center gap-2 py-1">
                            <input
                                type="text"
                                placeholder="CUPÓN"
                                className="w-full text-xs p-1 border rounded uppercase"
                                value={codigoCupon}
                                onChange={e => setCodigoCupon(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span className="">IGV (18%)</span>
                            <span>S/ {((Number(totales.totalServicio) || 0) * 0.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 font-bold border-t border-gray-100 pt-1">
                            <span className="">Total Servicio</span>
                            <span>S/ {(Number(totales.totalServicio) || 0).toFixed(2)}</span>
                        </div>
                        {totales.descuento > 0 && <div className="flex justify-between items-center text-sm text-green-600"><span className="">Descuento</span><span>- S/ {totales.descuento.toFixed(2)}</span></div>}
                        <div className="flex justify-between items-center text-sm text-green-600"><span className="">Garantía (20% Reembolsable)</span><span>S/ {totales.garantia.toFixed(2)}</span></div>

                        <div className="flex justify-between items-center border-t border-dashed pt-2 mt-2">
                            <span className="font-bold text-lg">Total a Pagar</span>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-blue-600">S/ {totales.totalFinal.toFixed(2)}</span>
                                <p className="text-xs text-gray-400">approx. $ {(totales.totalFinal / 3.8).toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Desglose para Anticipada */}
                        {carritoVenta.some(i => i.tipoReserva === 'anticipada') && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 space-y-1 mt-2">
                                <div className="flex justify-between text-sm font-bold text-blue-800">
                                    <span>Adelanto a Pagar (60%)</span>
                                    <span>S/ {(totales.totalFinal * 0.60).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-orange-800">
                                    <span>Saldo Pendiente (40%)</span>
                                    <span>S/ {(totales.totalFinal * 0.40).toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <Boton className="w-full mt-4 py-3 text-lg" onClick={procesarVenta} disabled={carritoVenta.length === 0}>
                            {carritoVenta.some(i => i.tipoReserva === 'anticipada')
                                ? `Pagar Adelanto S/ ${(totales.totalFinal * 0.60).toFixed(2)}`
                                : `Cobrar S/ ${totales.totalFinal.toFixed(2)}`
                            }
                        </Boton>
                    </div>
                </div>

                <Modal titulo={`Agregar ${productoAAnadir?.nombre || ''}`} abierto={!!productoAAnadir} alCerrar={() => setProductoAAnadir(null)}>
                    <div className="space-y-4">
                        {/* Selector Tipo Reserva */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                            <button
                                className={`p-2 rounded text-sm font-medium transition-colors ${configuracionAlquiler.tipoReserva === 'inmediata' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setConfiguracionAlquiler({ ...configuracionAlquiler, tipoReserva: 'inmediata' })}
                            >
                                ⚡ Inmediata
                            </button>
                            <button
                                className={`p-2 rounded text-sm font-medium transition-colors ${configuracionAlquiler.tipoReserva === 'anticipada' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setConfiguracionAlquiler({ ...configuracionAlquiler, tipoReserva: 'anticipada' })}
                            >
                                📅 Anticipada
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora de Inicio</label>
                            <input
                                type="datetime-local"
                                className={`w-full p-2 border rounded-lg ${configuracionAlquiler.tipoReserva === 'inmediata' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                value={configuracionAlquiler.tipoReserva === 'inmediata' ? new Date().toISOString().slice(0, 16) : configuracionAlquiler.fechaInicio}
                                onChange={e => setConfiguracionAlquiler({ ...configuracionAlquiler, fechaInicio: e.target.value })}
                                disabled={configuracionAlquiler.tipoReserva === 'inmediata'}
                            />
                            {configuracionAlquiler.tipoReserva === 'inmediata' && <p className="text-xs text-green-600 mt-1">Se registrará con fecha actual</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Horas)</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded-lg"
                                value={configuracionAlquiler.horas}
                                onChange={e => setConfiguracionAlquiler({ ...configuracionAlquiler, horas: e.target.value })}
                            />
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-800 flex justify-between">
                                <span>Precio por hora:</span>
                                <span className="font-bold">S/ {productoAAnadir?.precioPorHora}</span>
                            </p>
                            <p className="text-sm text-blue-800 flex justify-between mt-1">
                                <span>Total Estimado:</span>
                                <span className="font-bold">S/ {(productoAAnadir?.precioPorHora * configuracionAlquiler.horas).toFixed(2)}</span>
                            </p>
                        </div>
                        <Boton className="w-full" onClick={confirmarAgregarProducto}>
                            Agregar al Ticket
                        </Boton>
                    </div>
                </Modal>

                {/* Modal Crear Cliente */}
                <Modal titulo="Registrar Nuevo Cliente" abierto={modalCrearClienteAbierto} alCerrar={() => setModalCrearClienteAbierto(false)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                            <input className="w-full p-2 border rounded" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" className="w-full p-2 border rounded" value={nuevoCliente.email} onChange={e => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">DNI / Documento</label>
                            <input className="w-full p-2 border rounded" value={nuevoCliente.numeroDocumento} onChange={e => setNuevoCliente({ ...nuevoCliente, numeroDocumento: e.target.value })} />
                        </div>
                        <Boton className="w-full" onClick={guardarNuevoCliente}>Guardar Cliente</Boton>
                    </div>
                </Modal>
                {/* Modal Términos y Condiciones */}
                <Modal titulo="Términos y Condiciones del Servicio" abierto={modalTerminosAbierto} alCerrar={() => setModalTerminosAbierto(false)}>
                    <div className="space-y-4 text-sm text-gray-600 max-h-96 overflow-y-auto pr-2">
                        <section>
                            <h4 className="font-bold text-gray-800">1. Objeto del Contrato</h4>
                            <p>El presente documento establece las condiciones para el alquiler de recursos recreativos (bicicletas, botes, equipos de montaña, etc.) en las sedes de Verano Rental System.</p>
                        </section>
                        <section>
                            <h4 className="font-bold text-gray-800">2. Responsabilidad del Cliente</h4>
                            <p>El cliente se hace plenamente responsable de la integridad física del recurso alquilado durante el periodo de uso. Cualquier daño, pérdida o robo será cubierto mediante el depósito de garantía o cobro adicional según tasación.</p>
                        </section>
                        <section>
                            <h4 className="font-bold text-gray-800">3. Garantía Reembolsable</h4>
                            <p>Se requiere un depósito del 20% sobre el valor del servicio como garantía. Este monto será devuelto íntegramente al momento de la entrega del recurso en las mismas condiciones en que fue recibido.</p>
                        </section>
                        <section>
                            <h4 className="font-bold text-gray-800">4. Horarios y Penalidades</h4>
                            <p>La devolución fuera de la hora pactada generará penalidades automáticas. El servicio debe concluir dentro del horario de atención de la sede seleccionada.</p>
                        </section>
                        <p className="text-xs text-gray-400 mt-4 italic">Al marcar la casilla en el ticket de venta, usted acepta estas condiciones de forma legal y vinculante.</p>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default PuntoVenta;
