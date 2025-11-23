import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion';
import PieDePagina from './PieDePagina';
import { usarUI } from '../../contexts/ContextoUI';

const DisenoPrincipal = () => {
    const { setMostrarLogin } = usarUI();

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            <BarraNavegacion setMostrarLogin={setMostrarLogin} />
            <main className="flex-grow max-w-7xl mx-auto w-full py-8">
                <Outlet />
            </main>
            <PieDePagina />
        </div>
    );
};

export default DisenoPrincipal;
