import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { usarUI } from '../../contexts/ContextoUI';
import { obtenerPagina } from '../../services/db';

const ModalInfoGlobal = () => {
    const { modalInfo, cerrarModalInfo } = usarUI();
    const [contenido, setContenido] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (modalInfo.abierto && modalInfo.slug) {
            setCargando(true);
            obtenerPagina(modalInfo.slug)
                .then(data => {
                    let htmlContent = data?.contenido || '<p class="text-center text-gray-500 my-8">Información no disponible.</p>';

                    // Inyección de Cláusula de "No Devolución por falta de pago"
                    if (modalInfo.slug.includes('terminos')) {
                        htmlContent += `
                            <div class="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <h4 class="text-red-700 font-bold mb-2 flex items-center gap-2">⚠️ Política de Pagos y Recojo</h4>
                                <p class="text-red-600 text-sm font-medium">
                                    Si al momento del recojo no ha completado el pago total de la reserva, 
                                    <strong>se perderá la reserva automáticamente sin lugar a devoluciones</strong>. 
                                    El pago completo es requisito indispensable para la entrega de los equipos.
                                </p>
                            </div>
                        `;
                    }

                    setContenido(htmlContent);
                    setCargando(false);
                })
                .catch(err => {
                    console.error("Error obteniendo página:", err);
                    setContenido('<p class="text-center text-red-500 my-8">Ocurrió un error al cargar la información.</p>');
                    setCargando(false);
                });
        }
    }, [modalInfo.abierto, modalInfo.slug]);

    if (!modalInfo.abierto) return null;

    return (
        <Modal
            titulo={modalInfo.titulo}
            abierto={modalInfo.abierto}
            alCerrar={cerrarModalInfo}
            zIndex={70}
        >
            <div className="p-4">
                {cargando ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-sm animate-pulse">Cargando contenido...</p>
                    </div>
                ) : (
                    <div
                        className="prose prose-sm max-w-none text-gray-700 overflow-y-auto max-h-[60vh] custom-scrollbar"
                        dangerouslySetInnerHTML={{ __html: contenido }}
                    />
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={cerrarModalInfo}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalInfoGlobal;
