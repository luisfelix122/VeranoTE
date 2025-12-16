import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ titulo, abierto, alCerrar, children, zIndex = 50 }) => {
    if (!abierto) return null;
    return (
        <div className={`fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-[${zIndex}]`}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
                    <button onClick={alCerrar} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
