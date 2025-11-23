import React, { useState, useContext } from 'react';
import { Phone, Shield, FileText, AlertTriangle, LifeBuoy, ChevronDown, ChevronUp } from 'lucide-react';
import Boton from '../components/ui/Boton';
import { ContextoSoporte } from '../contexts/ContextoSoporte';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';

const Soporte = () => {
    const [seccionActiva, setSeccionActiva] = useState(null);
    const { crearTicket } = useContext(ContextoSoporte);
    const [formulario, setFormulario] = useState({
        asunto: 'Reporte de Incidente',
        telefono: '',
        mensaje: ''
    });

    const toggleSeccion = (index) => {
        setSeccionActiva(seccionActiva === index ? null : index);
    };

    const { usuario } = useContext(ContextoAutenticacion); // Import usuario

    const manejarEnvio = (e) => {
        e.preventDefault();
        crearTicket({
            asunto: formulario.asunto,
            mensaje: formulario.mensaje,
            telefono: formulario.telefono,
            remitente: {
                id: usuario?.id,
                nombre: usuario?.nombre || 'Usuario',
                rol: usuario?.rol || 'cliente'
            },
            destinatario: { rol: 'admin' } // Default recipient for support form is Admin
        });
        alert('Mensaje enviado. Nos contactaremos contigo a la brevedad.');
        setFormulario({ asunto: 'Reporte de Incidente', telefono: '', mensaje: '' });
    };

    const guiasSeguridad = [
        {
            titulo: "Motos Acuáticas",
            contenido: "Uso obligatorio de chaleco salvavidas. Mantener distancia de 50m de la orilla. No realizar maniobras bruscas cerca de bañistas."
        },
        {
            titulo: "Cuatrimotos",
            contenido: "Uso obligatorio de casco. Circular solo por zonas autorizadas. Velocidad máxima 30km/h en zonas compartidas."
        },
        {
            titulo: "Kayaks",
            contenido: "Uso obligatorio de chaleco. No alejarse más de 200m de la costa. Evitar zonas de fuerte oleaje."
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Centro de Soporte y Seguridad</h1>
                <p className="text-gray-600">Estamos aquí para ayudarte. Tu seguridad es nuestra prioridad.</p>
            </div>

            {/* Contactos de Emergencia */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="font-bold text-red-900 mb-1">Bomberos</h3>
                    <p className="text-2xl font-bold text-red-600 mb-2">116</p>
                    <p className="text-xs text-red-700">Emergencias médicas y rescate</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600">
                        <Shield size={32} />
                    </div>
                    <h3 className="font-bold text-blue-900 mb-1">Policía Nacional</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-2">105</p>
                    <p className="text-xs text-blue-700">Seguridad y denuncias</p>
                </div>
                <div className="bg-green-50 border border-green-100 p-6 rounded-xl flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="bg-green-100 p-3 rounded-full mb-3 text-green-600">
                        <LifeBuoy size={32} />
                    </div>
                    <h3 className="font-bold text-green-900 mb-1">Soporte SummerRent</h3>
                    <p className="text-2xl font-bold text-green-600 mb-2">(01) 555-0123</p>
                    <p className="text-xs text-green-700">Asistencia técnica y reservas</p>
                </div>
            </div>

            {/* Procedimientos de Seguridad */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Guías de Seguridad
                    </h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {guiasSeguridad.map((guia, index) => (
                        <div key={index} className="group">
                            <button
                                onClick={() => toggleSeccion(index)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="font-medium text-gray-700">{guia.titulo}</span>
                                {seccionActiva === index ? (
                                    <ChevronUp size={20} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={20} className="text-gray-400" />
                                )}
                            </button>
                            {seccionActiva === index && (
                                <div className="px-6 pb-4 text-gray-600 text-sm animate-in slide-in-from-top-2 duration-200">
                                    {guia.contenido}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Formulario de Contacto Rápido */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Phone className="text-blue-600" />
                    Reportar Incidente / Contacto
                </h2>
                <form className="space-y-4" onSubmit={manejarEnvio}>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm"
                                value={formulario.asunto}
                                onChange={(e) => setFormulario({ ...formulario, asunto: e.target.value })}
                            >
                                <option>Reporte de Incidente</option>
                                <option>Problema con Reserva</option>
                                <option>Consulta General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                            <input
                                type="tel"
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="+51 999 999 999"
                                required
                                value={formulario.telefono}
                                onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                        <textarea
                            className="w-full p-2 border rounded-lg text-sm h-24"
                            placeholder="Describe tu situación..."
                            required
                            value={formulario.mensaje}
                            onChange={(e) => setFormulario({ ...formulario, mensaje: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end">
                        <Boton type="submit">Enviar Mensaje</Boton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Soporte;
