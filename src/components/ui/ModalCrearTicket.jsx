import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Phone } from 'lucide-react';

const ModalCrearTicket = ({ isOpen, onClose, onSubmit, usuario }) => {
    const [asunto, setAsunto] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(false);

    // Lista de Contactos de Emergencia (Datos Estáticos solicitados)
    const contactosEmergencia = [
        { nombre: 'Policía Nacional', numero: '105', icono: '🚔' },
        { nombre: 'Bomberos', numero: '116', icono: '🚒' },
        { nombre: 'Atención Médica (SAMU)', numero: '106', icono: '🚑' },
        { nombre: 'Soporte Verano 24/7', numero: '+51 999-888-777', icono: '🏖️' }
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!asunto.trim() || !mensaje.trim()) return;

        setCargando(true);
        try {
            await onSubmit({
                asunto,
                mensaje,
                telefono: usuario?.telefono || '',
                remitente: {
                    id: usuario?.id,
                    nombre: usuario?.nombre,
                    rol: usuario?.rol
                },
                destinatario: { rol: 'admin' } // Por defecto a admin
            });
            setAsunto('');
            setMensaje('');
            onClose();
        } catch (error) {
            console.error('Error enviando ticket:', error);
            alert('Error al enviar el mensaje');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">

                {/* Panel Izquierdo: Formulario */}
                <div className="flex-1 p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Send size={20} className="text-blue-600" />
                            Nuevo Ticket de Soporte
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Asunto</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ej: Problema con mi reserva, Consulta de pago..."
                                value={asunto}
                                onChange={(e) => setAsunto(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensaje Detallado</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Describe tu consulta o problema aquí..."
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                required
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={cargando}
                                className={`w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 ${cargando ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {cargando ? 'Enviando...' : 'Enviar Consulta'} <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Panel Derecho: Información de Emergencia (Visible desktop) */}
                <div className="bg-blue-50 p-6 md:p-8 w-full md:w-80 border-l border-blue-100 hidden md:block">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>

                    <h4 className="text-blue-800 font-bold mb-4 flex items-center gap-2">
                        <AlertCircle size={18} /> ¿Emergencia?
                    </h4>

                    <div className="space-y-4">
                        <p className="text-sm text-blue-600 mb-4">
                            Si tienes una emergencia real durante tu alquiler, contáctanos inmediatamente:
                        </p>

                        {contactosEmergencia.map((contacto, index) => (
                            <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                                <span className="text-2xl">{contacto.icono}</span>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">{contacto.nombre}</p>
                                    <p className="text-lg font-bold text-gray-800">{contacto.numero}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-blue-100 rounded-lg text-xs text-blue-700">
                        <p className="font-bold mb-1">Horario de Atención Soporte:</p>
                        <p>Lunes a Domingo</p>
                        <p>8:00 AM - 8:00 PM</p>
                    </div>
                </div>
            </div>

            {/* Versión móvil de emergencia (Solo visible si es 'md:hidden' arriba, pero aquí lo pongo abajo para mobile) */}
            {/* Nota: En mobile el modal ocupa toda la pantalla con el form, la info de emergencia podría ir debajo o en otro tab, 
                pero por simplicidad en este modal centrado, lo dejo solo visible en desktop lateral o abajo en mobile si se desea. 
                Agregaré una pequeña alerta en mobile */}
            <div className="md:hidden absolute bottom-4 left-4 right-4 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-3 text-red-800 text-xs">
                <Phone size={16} />
                <span>Emergencia: <strong>+51 999-888-777</strong></span>
            </div>
        </div>
    );
};

export default ModalCrearTicket;
