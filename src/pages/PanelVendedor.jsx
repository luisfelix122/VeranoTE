import React, { useContext } from 'react';
import { Truck, ClipboardList } from 'lucide-react';
import { ContextoInventario } from '../contexts/ContextoInventario';
import { formatearFecha } from '../utils/formatters';
import Boton from '../components/ui/Boton';

const PanelVendedor = () => {
    const { alquileres, entregarAlquiler, devolverAlquiler } = useContext(ContextoInventario);
    const listos = alquileres.filter(a => a.estado === 'listo_para_entrega');
    const enUso = alquileres.filter(a => a.estado === 'en_uso');

    return (
        <div className="space-y-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Vendedor</h1>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Truck className="text-blue-600" /> Entregas (Ya Revisadas)</h2>
                    <div className="grid gap-4">
                        {listos.length === 0 ? <p className="text-gray-500">No hay entregas listas.</p> : listos.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div><p className="font-bold text-gray-900">{a.cliente}</p><p className="text-sm text-gray-600">{a.items.length} items</p></div>
                                <Boton variante="primario" onClick={() => entregarAlquiler(a.id)}>Entregar Cliente</Boton>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><ClipboardList className="text-green-600" /> Recepcionar Devoluciones</h2>
                    <div className="grid gap-4">
                        {enUso.length === 0 ? <p className="text-gray-500">No hay equipos fuera.</p> : enUso.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div><p className="font-bold text-gray-900">{a.cliente}</p><p className="text-sm text-gray-600">Entrega: {formatearFecha(a.fechaEntrega)}</p></div>
                                <Boton variante="secundario" onClick={() => devolverAlquiler(a.id)}>Recibir y Enviar a Taller</Boton>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanelVendedor;
