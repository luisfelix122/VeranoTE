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
import Boton from '../ui/Boton';

const BarraLateralPanel = () => {
    const { usuario, usuarios } = useContext(ContextoAutenticacion);
    const location = useLocation();

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


    const manejarContacto = () => {
        if (!usuario) return;

        let destino = null;
        let rolBuscado = '';

        if (usuario.rol === 'vendedor') {
            rolBuscado = 'admin';
            // Buscar admin de la misma sede
            destino = usuarios.find(u => u.rol === 'admin' && u.sede_id === usuario.sede_id);
        } else if (usuario.rol === 'admin') {
            rolBuscado = 'dueno';
            // Buscar dueño
            destino = usuarios.find(u => u.rol === 'dueno');
        }

        if (destino && destino.telefono) {
            const numero = destino.telefono.replace(/\s+/g, '');
            const mensajeWa = encodeURIComponent(`¡Hola ${destino.nombre}! Soy ${usuario.nombre} (${usuario.rol}) de la sede ${usuario.sede_id || 'Principal'}. Necesito soporte con el sistema.`);
            window.open(`https://wa.me/51${numero}?text=${mensajeWa}`, '_blank');
        } else {
            alert(`No se encontró un número de WhatsApp para el ${rolBuscado === 'dueno' ? 'Dueño' : 'Administrador'}. Por favor, contacte soporte técnico.`);
        }
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
                        onClick={manejarContacto}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-green-50 hover:text-green-600 transition-all font-medium"
                    >
                        <MessageSquare size={20} />
                        <span>Contactar {usuario.rol === 'vendedor' ? 'Admin' : 'Dueño'}</span>
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center px-2">
                        Redirección directa a WhatsApp para soporte inmediato.
                    </p>
                </div>
            )}
        </aside>
    );
};

export default BarraLateralPanel;
