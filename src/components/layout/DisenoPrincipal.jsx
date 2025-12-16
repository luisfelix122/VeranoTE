import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion';
import BarraNavegacionMovil from './BarraNavegacionMovil';
import PieDePagina from './PieDePagina';
import { usarUI } from '../../contexts/ContextoUI';

const DisenoPrincipal = () => {
    const { setMostrarLogin } = usarUI();
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col relative pb-20 lg:pb-0">
            <div id="top" className="absolute top-0 w-full h-1" />
            <BarraNavegacion setMostrarLogin={setMostrarLogin} />
            <main className={`flex-grow w-full ${pathname === '/' ? '' : 'max-w-7xl mx-auto py-8 pt-32 px-4 sm:px-6 lg:px-8'}`}>
                <Outlet />
            </main>
            <PieDePagina />
            <BarraNavegacionMovil setMostrarLogin={setMostrarLogin} />
        </div>
    );
};

export default DisenoPrincipal;
