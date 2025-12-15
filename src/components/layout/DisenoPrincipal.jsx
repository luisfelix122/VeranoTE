import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion';
import PieDePagina from './PieDePagina';
import { usarUI } from '../../contexts/ContextoUI';

const DisenoPrincipal = () => {
    const { setMostrarLogin } = usarUI();
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            <BarraNavegacion setMostrarLogin={setMostrarLogin} />
            <main className={`flex-grow w-full ${pathname === '/' ? '' : 'max-w-7xl mx-auto py-8 pt-32 px-4 sm:px-6 lg:px-8'}`}>
                <Outlet />
            </main>
            <PieDePagina />
        </div>
    );
};

export default DisenoPrincipal;
