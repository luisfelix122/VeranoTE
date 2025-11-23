import React, { useContext } from 'react';
import { CheckSquare, Wrench, Sparkles, AlertTriangle } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { formatearFecha } from '../utils/formatters';
import Boton from '../components/ui/Boton';

const PanelMecanico = () => {
    const { alquileres, aprobarParaEntrega, enviarAMantenimiento, finalizarMantenimiento, marcarFueraDeServicio } = useContext(ContextoInventario);
    const pendientes = alquileres.filter(a => a.estado === 'pendiente');
    const enLimpieza = alquileres.filter(a => a.estado === 'limpieza');
    const enMantenimiento = alquileres.filter(a => a.estado === 'en_mantenimiento');

    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Taller Mecánico</h1>

            {/* 1. Revisiones Pre-Entrega */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckSquare className="text-blue-600" /> 1. Revisiones Pre-Entrega</h2>
                <div className="grid gap-4">
                    {pendientes.length === 0 ? <p className="text-gray-500">Todo revisado.</p> : pendientes.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div><p className="font-bold text-gray-900">{a.cliente}</p><p className="text-sm text-gray-600">{a.items.length} items</p></div>
                            <Boton variante="primario" onClick={() => aprobarParaEntrega(a.id)}>Aprobar</Boton>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Limpieza y Triaje (Nuevo) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Sparkles className="text-cyan-600" /> 2. Limpieza y Triaje Post-Devolución</h2>
                <div className="grid gap-4">
                    {enLimpieza.length === 0 ? <p className="text-gray-500">Sin equipos en limpieza.</p> : enLimpieza.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div><p className="font-bold text-gray-900">{a.cliente}</p><p className="text-sm text-gray-600">Devuelto: {formatearFecha(a.fechaDevolucionReal)}</p></div>
                            <div className="flex gap-2">
                                <Boton variante="exito" onClick={() => finalizarMantenimiento(a.id)}>Todo OK (Habilitar)</Boton>
                                <Boton variante="secundario" onClick={() => enviarAMantenimiento(a.id)}>Requiere Mantenimiento</Boton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Mantenimiento Mayor */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Wrench className="text-orange-600" /> 3. Mantenimiento Mayor</h2>
                <div className="grid gap-4">
                    {enMantenimiento.length === 0 ? <p className="text-gray-500">Sin equipos en reparación.</p> : enMantenimiento.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div><p className="font-bold text-gray-900">{a.cliente}</p><p className="text-sm text-gray-600">En taller desde: {formatearFecha(a.fechaDevolucionReal)}</p></div>
                            <div className="flex gap-2">
                                <Boton variante="exito" onClick={() => finalizarMantenimiento(a.id)}>Reparado (Habilitar)</Boton>
                                <Boton variante="peligro" onClick={() => marcarFueraDeServicio(a.id)}>Dar de Baja</Boton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PanelMecanico;
