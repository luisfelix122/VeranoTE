import React, { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Package,
    Users,
    Tag,
    FileText,
    ShoppingCart,
    Home,
    Wrench,
    TrendingUp,
    MessageSquare,

    Mail,
    Calendar
} from 'lucide-react';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';
import { ContextoSoporte } from '../../contexts/ContextoSoporte';
import Boton from '../ui/Boton';

const BarraLateralPanel = () => {
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const location = useLocation();
    const [mostrarModalContacto, setMostrarModalContacto] = useState(false);
    const [mensaje, setMensaje] = useState('');

    const obtenerClaseEnlace = (ruta) => {
        const esActivo = location.pathname === ruta || location.pathname.startsWith(ruta + '/');
        return `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${esActivo
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
            }`;
    };

    const enlacesAdmin = [
        { to: '/admin/inventario', icon: Package, label: 'Inventario' },
        { to: '/admin/cobros', icon: Calendar, label: 'Cobros' },
        { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
        { to: '/admin/promociones', icon: Tag, label: 'Promociones' },
        { to: '/admin/punto-venta', icon: ShoppingCart, label: 'Punto de Venta', adminOnly: true },
        { to: '/admin/reportes', icon: FileText, label: 'Reportes' }
    ];

    const enlacesDueno = [
        { to: '/admin/reportes', icon: FileText, label: 'Reportes' },
        { to: '/admin/usuarios', icon: Users, label: 'Usuarios' }
    ];

    const enlacesVendedor = [
        { to: '/vendedor/operaciones', icon: TrendingUp, label: 'Operaciones' },
        { to: '/vendedor/reservas', icon: Calendar, label: 'Cobros' },
        { to: '/vendedor/punto-venta', icon: ShoppingCart, label: 'Punto de Venta' },
        { to: '/vendedor/reportes', icon: FileText, label: 'Reportes' }
    ];

    const enlacesMecanico = [
        { to: '/mecanico', icon: Wrench, label: 'Taller' },
        { to: '/mecanico/reportes', icon: FileText, label: 'Reportes' }
    ];

    const obtenerEnlaces = () => {
        if (usuario?.rol === 'admin') {
            return enlacesAdmin.filter(link => !link.adminOnly || usuario.rol === 'admin');
        }
        if (usuario?.rol === 'dueno') return enlacesDueno;
        if (usuario?.rol === 'vendedor') return enlacesVendedor;
        if (usuario?.rol === 'mecanico') return enlacesMecanico;
        return [];
    };

    const enlaces = obtenerEnlaces();

    const { crearTicket } = useContext(ContextoSoporte);

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        const rolDestino = usuario.rol === 'vendedor' ? 'admin' : 'dueno';
        const usuarioDestino = usuarios.find(u => u.rol === rolDestino);
        const nombreDestinatario = usuario.rol === 'vendedor' ? 'Administrador' : 'Dueño';

        crearTicket({
            asunto: `Mensaje Interno de ${usuario.nombre} (${usuario.rol})`,
            mensaje: mensaje,
            telefono: usuario.telefono || 'N/A',
            remitente: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            },
            destinatario: usuarioDestino ? {
                id: usuarioDestino.id,
                nombre: usuarioDestino.nombre,
                rol: usuarioDestino.rol
            } : { rol: rolDestino }
        });

        alert(`Mensaje enviado al ${nombreDestinatario} correctamente.`);
        setMostrarModalContacto(false);
        setMensaje('');
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full">
            <nav className="space-y-2 flex-1">
                {enlaces.map((enlace) => (
                    <NavLink
                        key={enlace.to}
                        to={enlace.to}
                        className={obtenerClaseEnlace(enlace.to)}
                    >
                        <enlace.icon size={20} />
                        <span>{enlace.label}</span>
                    </NavLink>
                ))}
            </nav>

            {(usuario?.rol === 'vendedor' || usuario?.rol === 'admin') && (
                <div className="mt-auto pt-4 border-t border-gray-100">
                    <button
                        onClick={() => setMostrarModalContacto(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                        <MessageSquare size={20} />
                        <span>Contactar {usuario.rol === 'vendedor' ? 'Admin' : 'Dueño'}</span>
                    </button>
                </div>
            )}

            {mostrarModalContacto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-xl font-bold mb-4">Contactar al {usuario.rol === 'vendedor' ? 'Administrador' : 'Dueño'}</h3>
                        <form onSubmit={enviarMensaje} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg h-32 resize-none"
                                    placeholder="Escribe tu mensaje aquí..."
                                    value={mensaje}
                                    onChange={(e) => setMensaje(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <Boton type="button" variante="secundario" onClick={() => setMostrarModalContacto(false)} className="flex-1">Cancelar</Boton>
                                <Boton type="submit" variante="primario" className="flex-1">Enviar</Boton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default BarraLateralPanel;
