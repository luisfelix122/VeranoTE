import React from 'react';
import PanelPromociones from '../components/admin/PanelPromociones';

const GestionPromociones = () => {
    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Promociones</h1>
                <p className="text-gray-600">Configura descuentos automáticos y reglas de precios.</p>
            </div>
            <PanelPromociones />
        </div>
    );
};

export default GestionPromociones;
