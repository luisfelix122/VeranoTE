import React, { useContext } from 'react';
import { Truck, CheckCircle, AlertTriangle, Clock, Play, RotateCcw, ClipboardList, DollarSign, Printer } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { formatearFecha } from '../utils/formatters';
import { generarComprobantePenalidad } from '../utils/pdfGenerator';
import Boton from '../components/ui/Boton';

const PanelVendedor = () => {
    const { alquileres, entregarAlquiler, devolverAlquiler: devolverAlquilerContext, aprobarParaEntrega, solicitarPreparacion, anularAlquiler, sedeActual } = useContext(ContextoInventario);
    const { usuario } = useContext(ContextoAutenticacion);

    // Filtrar por ID de vendedor (del usuario logueado) O por Sede (si al vendedor no se le asignó pero está en la misma sede)
    const misAlquileres = alquileres.filter(a => {
        const esVendedor = a.vendedorId === usuario?.id;
        // Lógica Multisede: Solo mostramos alquileres de la sede del usuario
        // Si no hay sede asignada al usuario (ej: Admin global or error), usamos sedeActual del contexto
        const sedeUsuario = usuario?.sede || sedeActual;
        const esSede = a.sedeId === sedeUsuario;

        // Dueño ve todo lo de la sede seleccionada o todo
        if (usuario?.rol === 'dueno') return a.sedeId === sedeActual;

        return esVendedor || esSede;
    });

    // Próximas Entregas: Confirmado, Pendiente (Cobros) o Listo para Entrega
    const entregasPendientes = misAlquileres.filter(a => {
        const est = String(a.estado_id || a.estado || '').toLowerCase();
        return est === 'listo_para_entrega' ||
            est === 'confirmado' ||
            est === 'en_preparacion' ||
            est.includes('pendiente'); // Mostrar también pendientes de pago para iniciar gestión
    }).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

    // Devoluciones: En Uso (Filtrado)
    const enUso = misAlquileres.filter(a => {
        const est = String(a.estado_id || a.estado).toLowerCase();
        return est === 'en_uso' || est === 'en uso';
    });

    // DEBUG: Ver qué está pasando
    const debugInfo = {
        usuarioId: usuario?.id,
        usuarioSede: usuario?.sede,
        sedeActualContext: sedeActual,
        totalAlquileres: alquileres.length,
        misAlquileresCount: misAlquileres.length,
        estadosEncontrados: [...new Set(alquileres.map(a => a.estado_id || a.estado))],
        sedesEncontradas: [...new Set(alquileres.map(a => a.sedeId))],
        vendedorIdsEncontrados: [...new Set(alquileres.map(a => a.vendedorId))],
        ejemploAlquiler: alquileres[0] || 'No hay alquileres'
    };

    // Función para manejar la solicitud de preparación
    const handleSolicitarPreparacion = async (id) => {
        if (window.confirm("¿Solicitar al Mecánico que prepare los equipos?")) {
            await solicitarPreparacion(id);
        }
    };

    // Función para manejar la devolución de un alquiler
    const devolverAlquiler = async (id, vendedorId, devolverGarantia) => {
        if (!window.confirm("¿Confirmar recepción del equipo?")) return;

        await devolverAlquilerContext(id, vendedorId, devolverGarantia);

        // Si NO se devuelve la garantía, generamos el comprobante de penalidad
        if (!devolverGarantia) {
            const alquiler = enUso.find(a => a.id === id);
            if (alquiler && alquiler.garantia > 0) {
                if (window.confirm("Has retenido la garantía. ¿Deseas imprimir el Comprobante de Penalidad/Retención?")) {
                    generarComprobantePenalidad(alquiler, alquiler.garantia, "Retención por daños o incumplimiento (Decisión Vendedor)");
                }
            }
        }
    };


    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                Dashboard Vendedor
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Próximas Entregas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Truck className="text-blue-600" /> Próximas Entregas</h2>
                    <div className="grid gap-4">
                        {entregasPendientes.length === 0 ? <p className="text-gray-500">No hay entregas pendientes.</p> : entregasPendientes.map(a => {
                            const est = String(a.estado_id || a.estado || '').toLowerCase();
                            const esListo = est === 'listo_para_entrega';
                            const esPreparacion = est === 'en_preparacion';
                            const debePlata = a.saldoPendiente > 0 || est.includes('pendiente');

                            return (
                                <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <p className="font-bold text-gray-900">{a.cliente}</p>
                                        <p className="text-sm text-gray-600">
                                            {a.items.length} items • <span className="font-mono text-xs">{formatearFecha(a.fechaInicio)}</span>
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded-full ${esListo ? 'bg-green-100 text-green-800' : esPreparacion ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {esListo ? 'Listo para Entregar' : esPreparacion ? 'En Preparación (Mec)' : 'Pendiente de Revisión'}
                                            </span>
                                            {debePlata && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold flex items-center gap-1">
                                                    ⚠️ Falta Pago
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        {esListo ? (
                                            <div className="flex gap-2">
                                                <Boton variante="primario" onClick={() => entregarAlquiler(a.id, usuario?.id)}>Entregar Cliente</Boton>
                                                <Boton variante="peligro" className="px-2" onClick={() => anularAlquiler(a.id)}>Anular</Boton>
                                            </div>
                                        ) : esPreparacion ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs text-gray-400 italic text-center">Esperando Mecánico...</span>
                                                <Boton variante="fantasma" className="text-[10px] text-red-500 py-0" onClick={() => anularAlquiler(a.id)}>Cancelar Reserva</Boton>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Boton
                                                    variante={debePlata ? 'deshabilitado' : 'secundario'}
                                                    className={debePlata ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500' : ''}
                                                    disabled={debePlata}
                                                    onClick={() => !debePlata && handleSolicitarPreparacion(a.id)}
                                                >
                                                    Solicitar Revisión
                                                </Boton>
                                                <Boton variante="fantasma" className="text-[10px] text-red-500" onClick={() => anularAlquiler(a.id)}>Anular</Boton>
                                            </div>
                                        )}
                                        {debePlata && !esListo && !esPreparacion && (
                                            <span className="text-[10px] text-red-600 font-medium">Cobrar antes de solicitar</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><ClipboardList className="text-green-600" /> Recepcionar Devoluciones</h2>
                    <div className="grid gap-4">
                        {enUso.length === 0 ? <p className="text-gray-500">No hay equipos fuera.</p> : enUso.map(a => (
                            <div key={a.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-900">{a.cliente}</p>
                                        <p className="text-sm text-gray-600">Entrega: {formatearFecha(a.fechaEntrega)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Boton
                                                variante="exito"
                                                onClick={() => devolverAlquiler(a.id, usuario?.id, true)}
                                                className="text-xs py-1.5"
                                            >
                                                ✅ Todo Conforme: Devolver S/ {Number(a.garantia || 0).toFixed(2)}
                                            </Boton>
                                            <Boton
                                                variante="peligro"
                                                onClick={() => devolverAlquiler(a.id, usuario?.id, false)}
                                                className="text-xs py-1.5"
                                            >
                                                ⚠️ Retener Garantía: S/ {Number(a.garantia || 0).toFixed(2)}
                                            </Boton>
                                        </div>
                                    </div>
                                </div>
                                {/* Detalle de items para devoluciones */}
                                <div className="text-sm text-gray-600 mt-2 border-t pt-2">
                                    {a.items.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span>{i.cantidad}x {i.nombre}</span>
                                            <span>{i.horas}h</span>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-gray-400 mt-1 italic">
                                        * La retención de garantía se registra como ingreso extra por daños o multas.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanelVendedor;
