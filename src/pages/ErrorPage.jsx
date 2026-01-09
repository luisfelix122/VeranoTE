import React, { useEffect } from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertOctagon, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import Boton from '../components/ui/Boton';

const ErrorPage = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    useEffect(() => {
        console.error("Error capturado por ErrorBoundary:", error);
    }, [error]);

    const handleReset = () => {
        // Intentar recargar la página limpia el estado fallido en algunos casos
        window.location.reload();
    };

    const handleGoHome = () => {
        navigate('/', { replace: true });
        // Forzamos un reload suave si es necesario para limpiar estados globales corruptos
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <AlertOctagon size={40} />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        ¡Ups! Algo salió mal
                    </h1>

                    <p className="text-gray-600 mb-6">
                        Lo sentimos, ha ocurrido un error inesperado al procesar tu solicitud.
                    </p>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 text-left overflow-auto max-h-40">
                        <p className="font-mono text-xs text-red-800 break-words">
                            {error?.statusText || error?.message || "Error desconocido"}
                        </p>
                        {error?.stack && (
                            <p className="font-mono text-[10px] text-red-600 mt-2 whitespace-pre-wrap opacity-70">
                                {error.stack.slice(0, 150)}...
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <Boton onClick={handleReset} variant="outline" className="w-full justify-center">
                            <RefreshCw size={18} className="mr-2" />
                            Intentar recargar
                        </Boton>

                        <Boton onClick={handleGoHome} className="w-full justify-center bg-blue-600 text-white hover:bg-blue-700">
                            <Home size={18} className="mr-2" />
                            Ir al Inicio
                        </Boton>
                    </div>
                </div>

                <div className="bg-gray-50 border-t border-gray-100 p-4 text-center">
                    <p className="text-xs text-gray-400">
                        Si el problema persiste, contacta a soporte.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
