import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ titulo, abierto, alCerrar, children, zIndex = 50, ancho = 'max-w-md' }) => {
    if (!abierto) return null;
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            style={{ zIndex }}
        >
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${ancho} overflow-hidden animate-in zoom-in duration-200`}>
                <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
                    <button
                        onClick={alCerrar}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
