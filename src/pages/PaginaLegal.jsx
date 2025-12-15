import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { obtenerPagina } from '../services/db';

const PaginaLegal = () => {
    const { slug } = useParams();
    const [pagina, setPagina] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const fetchPagina = async () => {
            setCargando(true);
            const data = await obtenerPagina(slug);
            setPagina(data);
            setCargando(false);
        };
        fetchPagina();
    }, [slug]);

    if (cargando) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!pagina) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Página no encontrada</h1>
                <p className="text-gray-500">Lo sentimos, no pudimos encontrar el documento solicitado.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    {/* <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b">{pagina.titulo}</h1> */}
                    <div
                        className="prose prose-blue max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: pagina.contenido }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PaginaLegal;
