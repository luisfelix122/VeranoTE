const renderModalDetalle = () => {
    if (!alquilerSeleccionado) return null;
    const a = alquilerSeleccionado;
    const igv = a.datos_factura?.igv_calculado || (a.total_servicio - (a.total_bruto - (a.descuento_promociones || 0))); // Fallback calc if missing

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Detalle de Reserva</h3>
                        <p className="text-sm text-gray-500">ID: {a.id}</p>
                    </div>
                    <button
                        onClick={() => setAlquilerSeleccionado(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XCircle className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Lista de Items */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Activity size={16} className="text-blue-600" /> Recursos Alquilados
                        </h4>
                        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-medium">
                                    <tr>
                                        <th className="p-3">Recurso</th>
                                        <th className="p-3 text-center">Cant.</th>
                                        <th className="p-3 text-center">Horas</th>
                                        <th className="p-3 text-right">Precio/h</th>
                                        <th className="p-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {a.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    {item.imagen && <img src={item.imagen} className="w-8 h-8 rounded bg-white object-cover border" alt="" />}
                                                    {item.nombre}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">{item.cantidad}</td>
                                            <td className="p-3 text-center">{item.horas}h</td>
                                            <td className="p-3 text-right">S/ {Number(item.precioPorHora).toFixed(2)}</td>
                                            <td className="p-3 text-right font-medium">S/ {(item.cantidad * item.horas * item.precioPorHora).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Resumen Financiero */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal Base:</span>
                                <span>S/ {Number(a.total_bruto).toFixed(2)}</span>
                            </div>
                            {Number(a.descuento_promociones) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Descuento:</span>
                                    <span>- S/ {Number(a.descuento_promociones).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>IGV (18%):</span>
                                <span>S/ {Number(igv).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 border-t border-dashed">
                                <span>Total Servicio:</span>
                                <span>S/ {Number(a.total_servicio).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-blue-600">
                                <span>Garantía (Reembolsable):</span>
                                <span>S/ {Number(a.garantia).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total Final:</span>
                                <span>S/ {Number(a.total_final).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Estado de Pago */}
                    <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <DollarSign className="text-blue-600" size={18} />
                            <span className="font-medium text-blue-800">Estado del Pago:</span>
                        </div>
                        <div className="font-bold">
                            {Number(a.saldo_pendiente) > 0 ? (
                                <span className="text-red-600">Pendiente (Debe S/ {Number(a.saldo_pendiente).toFixed(2)})</span>
                            ) : (
                                <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Pagado Completo</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
                    <button
                        onClick={() => setAlquilerSeleccionado(null)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

