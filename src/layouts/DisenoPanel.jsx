import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraNavegacionPanel from '../components/layout/BarraNavegacionPanel';
import BarraLateralPanel from '../components/layout/BarraLateralPanel';
import PieDePagina from '../components/layout/PieDePagina';

const DisenoPanel = () => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            <BarraNavegacionPanel />

            <div className="flex-grow flex">
                <BarraLateralPanel />

                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

            <PieDePagina />
        </div>
    );
};

export default DisenoPanel;
