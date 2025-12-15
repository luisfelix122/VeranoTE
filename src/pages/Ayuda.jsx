import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { obtenerFaqs } from '../services/db';

const Ayuda = () => {
    const [faqs, setFaqs] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [abierto, setAbierto] = useState(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            setCargando(true);
            const data = await obtenerFaqs();
            setFaqs(data || []);
            setCargando(false);
        };
        fetchFaqs();
    }, []);

    const toggle = (id) => {
        setAbierto(abierto === id ? null : id);
    };

    if (cargando) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
                        <HelpCircle size={32} className="text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Centro de Ayuda</h1>
                    <p className="mt-4 text-lg text-gray-500">
                        Encuentra respuestas a las preguntas más frecuentes sobre nuestros servicios.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq) => (
                        <div key={faq.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 transition-all duration-200 hover:shadow-md">
                            <button
                                onClick={() => toggle(faq.id)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none bg-white hover:bg-gray-50"
                            >
                                <span className="font-medium text-gray-900">{faq.pregunta}</span>
                                {abierto === faq.id ? (
                                    <ChevronUp size={20} className="text-blue-500" />
                                ) : (
                                    <ChevronDown size={20} className="text-gray-400" />
                                )}
                            </button>
                            {abierto === faq.id && (
                                <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                                    <p className="text-gray-600 mt-2">{faq.respuesta}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {faqs.length === 0 && (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                            No hay preguntas frecuentes disponibles en este momento.
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center bg-blue-600 rounded-2xl p-8 shadow-xl text-white">
                    <h3 className="text-xl font-bold mb-2">¿No encontraste lo que buscabas?</h3>
                    <p className="mb-6 text-blue-100">Si necesitas asistencia personalizada, nuestro equipo de soporte está listo para ayudarte.</p>
                    <a href="mailto:soporte@alquileresperuanos.pe" className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors">
                        Contactar Soporte
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Ayuda;
