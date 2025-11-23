import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraNavegacionPanel from './BarraNavegacionPanel';
import BarraLateralPanel from './BarraLateralPanel';

const DisenoPanel = () => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            <BarraNavegacionPanel />
            <div className="flex flex-grow overflow-hidden">
                <BarraLateralPanel />
                <main className="flex-grow p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DisenoPanel;
