import React, { useContext } from 'react';
import { CheckSquare, Wrench, Sparkles, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { formatearFecha } from '../utils/formatters';
import Boton from '../components/ui/Boton';

const PanelMecanico = () => {
    const { alquileres, inventario, aprobarParaEntrega, enviarAMantenimiento, finalizarMantenimiento, finalizarLimpiezaAlquiler, marcarFueraDeServicio, sedeActual } = useContext(ContextoInventario);

    // 1. Revisiones Pre-Entrega: Solo 'en_preparacion' (Activado por Vendedor)
    const pendientes = alquileres.filter(a => {
        const est = (a.estado_id || a.estado || '').toLowerCase();

        // Estricto: Solo ver lo que el vendedor ya habilitó ('en_preparacion')
        if (est !== 'en_preparacion') return false;

        // Filtro por Sede (Mecánico solo ve su sede)
        const normalize = (s) => String(s || '').toLowerCase();
        if (normalize(a.sedeId) !== normalize(sedeActual)) return false;

        // OJO: Relajamos el filtro de MOTOR para que veas la reserva aunque no tenga items cargados aún
        // const tieneMotor = a.items.some(i => i.categoria === 'Motor');
        // if (!tieneMotor) return false;

        const inicio = new Date(a.fechaInicio);
        const ahora = new Date();
        // Reset hora de 'ahora' para comparar solo fecha si quisiéramos, 
        // pero mejor comparamos timestamps para ver futuros.

        // Criterio: Mostrar TODO lo que sea HOY o FUTURO
        const esPasado = inicio < new Date(ahora.getTime() - 24 * 60 * 60 * 1000); // Ocultar cosas de hace más de 1 día

        return !esPasado;
    }).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

    // Helper para renderizado de items
    const renderItemPendiente = (a) => {
        const inicio = new Date(a.fechaInicio);
        const ahora = new Date();
        const diffMs = inicio.getTime() - ahora.getTime();
        const diffMin = Math.ceil(diffMs / (1000 * 60));

        const est = (a.estado_id || a.estado || '').toLowerCase();
        const esPendientePago = est.includes('pendiente') || (a.saldoPendiente > 0);

        // Bloqueado si: Falta Pago O Faltan más de 15 min
        const estaBloqueado = esPendientePago || (diffMin > 15);

        let mensajeBloqueo = '';
        if (esPendientePago) {
            mensajeBloqueo = 'Falta Pago Saldo';
        } else if (diffMin > 15) {
            // Mostrar días si falta mucho
            if (diffMin > 1440) { // +24h
                const dias = Math.ceil(diffMin / 1440);
                mensajeBloqueo = `Habilitado en ${dias} días`;
            } else if (diffMin > 60) {
                const horas = Math.ceil(diffMin / 60);
                mensajeBloqueo = `Habilitado en ${horas}h`;
            } else {
                mensajeBloqueo = `Habilitado en ${diffMin - 15} min`;
            }
        }

        return (
            <div key={a.id} className={`flex justify-between items-center p-4 rounded-lg border border-gray-200 transition-all ${estaBloqueado ? 'bg-gray-100 opacity-75' : 'bg-white shadow-sm border-blue-200'}`}>
                <div>
                    <div className="flex items-center gap-2">
                        <p className={`font-bold ${estaBloqueado ? 'text-gray-500' : 'text-gray-900'}`}>{a.cliente}</p>

                        {/* Badges de Estado */}
                        {estaBloqueado ? (
                            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${esPendientePago ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                                {esPendientePago ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                {mensajeBloqueo}
                            </span>
                        ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold animate-pulse">
                                ¡Listo para revisión!
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <span className="text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-blue-100">
                            {a.sedeId || sedeActual}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span>{a.items.length} items</span>
                        <span className="text-gray-400">|</span>
                        <span>Fecha: {formatearFecha(a.fechaInicio)}</span>
                    </p>
                </div>

                <Boton
                    variante={estaBloqueado ? 'secundario' : 'primario'}
                    onClick={() => !estaBloqueado && aprobarParaEntrega(a.id)}
                    disabled={estaBloqueado}
                    className={estaBloqueado ? 'cursor-not-allowed text-gray-400 bg-gray-200 border-gray-200' : ''}
                >
                    {estaBloqueado ? (
                        <span className="flex items-center gap-1">
                            {esPendientePago ? <DollarSign size={14} /> : <Clock size={14} />}
                            Esperando
                        </span>
                    ) : 'Aprobar Entrega'}
                </Boton>
            </div>
        );
    };

    // 2. Limpieza y Triaje: Equipos devueltos que están en estado 'limpieza'
    const enLimpieza = alquileres.filter(a => (a.estado_id || a.estado) === 'limpieza');

    // 3. Gestión de Recursos: Lista de todos los recursos para mantenimiento manual
    const todosLosRecursos = inventario.filter(r => r.sedeId === sedeActual);

    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Taller Mecánico</h1>

            {/* 1. Revisiones Pre-Entrega */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="text-blue-600" /> 1. Revisiones Pre-Entrega
                </h2>
                <div className="grid gap-4">
                    {pendientes.length === 0 ? (
                        <p className="text-gray-500">Todo revisado.</p>
                    ) : (
                        pendientes.map(a => renderItemPendiente(a))
                    )}
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
                        const estaMantenimiento = (r.estado_id || r.estado) === 'mantenimiento' || !r.activo;
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
