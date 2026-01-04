import React, { useContext } from 'react';
import { CheckSquare, Wrench, Sparkles, AlertTriangle } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { formatearFecha } from '../utils/formatters';
import Boton from '../components/ui/Boton';

const PanelMecanico = () => {
    const { alquileres, inventario, aprobarParaEntrega, enviarAMantenimiento, finalizarMantenimiento, finalizarLimpiezaAlquiler, marcarFueraDeServicio, sedeActual } = useContext(ContextoInventario);

    // 1. Revisiones Pre-Entrega: Solo 'Motor' y 15 min antes del inicio
    const pendientes = alquileres.filter(a => {
        const est = a.estado?.toLowerCase();
        if (est !== 'confirmado' && est !== 'pendiente') return false;

        const tieneMotor = a.items.some(i => i.categoria === 'Motor');
        if (!tieneMotor) return false;

        const inicio = new Date(a.fechaInicio);
        const ahora = new Date();
        const diffMs = inicio.getTime() - ahora.getTime();
        const diffMin = diffMs / (1000 * 60);

        // Aparece 15 min antes y se mantiene hasta 30 min después si no se aprueba
        return diffMin <= 15 && diffMin >= -30;
    });

    // 2. Limpieza y Triaje: Equipos devueltos que están en estado 'limpieza'
    const enLimpieza = alquileres.filter(a => a.estado === 'limpieza');

    // 3. Gestión de Recursos: Lista de todos los recursos para mantenimiento manual
    const todosLosRecursos = inventario.filter(r => r.sedeId === sedeActual);

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
                                <Boton variante="exito" onClick={() => finalizarLimpiezaAlquiler(a.id)}>Todo OK (Habilitar)</Boton>
                                <Boton variante="secundario" onClick={() => enviarAMantenimiento(a.id)}>Requiere Mantenimiento</Boton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Gestión de Inventario y Mantenimiento Mayor */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Wrench className="text-orange-600" /> 3. Gestión de Inventario y Mantenimiento</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todosLosRecursos.map(r => {
                        const estaMantenimiento = r.estado === 'mantenimiento' || !r.activo;
                        return (
                            <div key={r.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900">{r.nombre}</p>
                                        <p className="text-xs text-gray-500">{r.categoria}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${estaMantenimiento ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                        {estaMantenimiento ? 'En Taller' : 'Operativo'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {estaMantenimiento ? (
                                        <Boton variante="exito" className="w-full text-xs" onClick={() => finalizarMantenimiento(r.id)}>
                                            Habilitar (Libre para alquilar)
                                        </Boton>
                                    ) : (
                                        <Boton variante="secundario" className="w-full text-xs" onClick={() => enviarAMantenimiento(r.id, "Mantenimiento Mayor")}>
                                            Mantenimiento Mayor
                                        </Boton>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PanelMecanico;
