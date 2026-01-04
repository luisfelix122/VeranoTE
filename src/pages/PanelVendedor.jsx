import React, { useContext } from 'react';
import { Truck, ClipboardList } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';
import { formatearFecha } from '../utils/formatters';
import Boton from '../components/ui/Boton';

const PanelVendedor = () => {
    const { alquileres, entregarAlquiler, devolverAlquiler, aprobarParaEntrega, sedeActual } = useContext(ContextoInventario);
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

    // Próximas Entregas: Confirmado o Listo para Entrega (Filtrado)
    const entregasPendientes = misAlquileres.filter(a => a.estado === 'listo_para_entrega' || a.estado === 'confirmado');

    // Devoluciones: En Uso (Filtrado)
    const enUso = misAlquileres.filter(a => {
        const est = String(a.estado).toLowerCase();
        return est === 'en_uso' || est === 'en uso';
    });

    // DEBUG: Ver qué está pasando
    const debugInfo = {
        usuarioId: usuario?.id,
        usuarioSede: usuario?.sede,
        sedeActualContext: sedeActual,
        totalAlquileres: alquileres.length,
        misAlquileresCount: misAlquileres.length,
        estadosEncontrados: [...new Set(alquileres.map(a => a.estado))],
        sedesEncontradas: [...new Set(alquileres.map(a => a.sedeId))],
        vendedorIdsEncontrados: [...new Set(alquileres.map(a => a.vendedorId))],
        ejemploAlquiler: alquileres[0] || 'No hay alquileres'
    };

    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                Dashboard Vendedor
            </h1>

            {/* DEBUG SECTION - REMOVE AFTER FIXING */}
            <details className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-xs font-mono overflow-auto max-h-60">
                <summary className="cursor-pointer font-bold text-yellow-700">DEBUG INFO (Click para ver por qué no salen datos)</summary>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Próximas Entregas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Truck className="text-blue-600" /> Próximas Entregas</h2>
                    <div className="grid gap-4">
                        {entregasPendientes.length === 0 ? <p className="text-gray-500">No hay entregas pendientes.</p> : entregasPendientes.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <p className="font-bold text-gray-900">{a.cliente}</p>
                                    <p className="text-sm text-gray-600">{a.items.length} items</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${a.estado === 'listo_para_entrega' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {a.estado === 'listo_para_entrega' ? 'Listo para Entregar' : 'Pendiente de Revisión'}
                                    </span>
                                </div>
                                {a.estado === 'confirmado' ? (
                                    <Boton variante="secundario" onClick={() => aprobarParaEntrega(a.id)}>Confirmar Revisión</Boton>
                                ) : (
                                    <Boton variante="primario" onClick={() => entregarAlquiler(a.id, usuario?.id)}>Entregar Cliente</Boton>
                                )}
                            </div>
                        ))}
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
                                    <Boton variante="secundario" onClick={() => devolverAlquiler(a.id, usuario?.id)}>Recibir</Boton>
                                </div>
                                {/* Detalle de items para devoluciones */}
                                <div className="text-sm text-gray-600 mt-2 border-t pt-2">
                                    {a.items.map(i => (
                                        <div key={i.id} className="flex justify-between">
                                            <span>{i.cantidad}x {i.nombre}</span>
                                            <span>{i.horas}h</span>
                                        </div>
                                    ))}
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
