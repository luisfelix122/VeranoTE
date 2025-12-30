import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogOut, Bell, User, ChevronDown } from 'lucide-react';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';
import { ContextoSoporte } from '../../contexts/ContextoSoporte';
import Boton from '../ui/Boton';
import BandejaEntrada from '../../pages/BandejaEntrada';

const BarraNavegacionPanel = () => {
    const navigate = useNavigate();
    const { usuario, cerrarSesion } = useContext(ContextoAutenticacion);
    const { tickets } = useContext(ContextoSoporte);
    const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
    const [mostrarBandeja, setMostrarBandeja] = useState(false);
    const menuRef = useRef(null);
    const bandejaRef = useRef(null);

    // Calcular mensajes no leídos
    const conteoNoLeidos = tickets.filter(ticket => {
        if (ticket.leido) return false;
        if (!usuario) return false;

        if (usuario.rol === 'admin') {
            return (ticket.destinatario?.rol === 'admin') ||
                (ticket.destinatario?.id === usuario.id) ||
                (!ticket.destinatario && ticket.remitente?.rol !== 'admin');
        } else if (usuario.rol === 'dueno') {
            return (ticket.destinatario?.rol === 'dueno') || (ticket.destinatario?.id === usuario.id);
        } else {
            return ticket.destinatario?.id === usuario.id || ticket.destinatario?.rol === usuario.rol;
        }
    }).length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMostrarMenuUsuario(false);
            }
            if (bandejaRef.current && !bandejaRef.current.contains(event.target) && !event.target.closest('.boton-bandeja')) {
                setMostrarBandeja(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const manejarCierreSesion = () => {
        cerrarSesion();
        navigate('/');
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Package size={24} />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                            SummerRent
                        </span>
                        <span className="ml-2 text-sm text-gray-500 font-normal">
                            Panel {usuario?.rol === 'admin' || usuario?.rol === 'dueno' ? 'Administrativo' : usuario?.rol === 'vendedor' ? 'de Vendedor' : 'de Mecánico'}
                            {usuario?.sede && (usuario.rol === 'admin' || usuario.rol === 'vendedor') && (
                                <span className="ml-1 text-blue-600 font-medium">- Sede {usuario.sede.charAt(0).toUpperCase() + usuario.sede.slice(1)}</span>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botón Notificaciones / Bandeja (Campanita) - Visible para TODOS los roles del panel */}
                        <div className="relative">
                            <button
                                onClick={() => setMostrarBandeja(!mostrarBandeja)}
                                className={`boton-bandeja relative p-2 rounded-lg transition-colors ${mostrarBandeja ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                title="Notificaciones"
                            >
                                <Bell size={20} />
                                {conteoNoLeidos > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold px-1">
                                        {conteoNoLeidos > 9 ? '9+' : conteoNoLeidos}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Bandeja de Entrada */}
                            {mostrarBandeja && (
                                <div
                                    ref={bandejaRef}
                                    className="absolute right-0 mt-2 w-[90vw] sm:w-[480px] max-h-[80vh] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col"
                                >
                                    <div className="p-0 h-full overflow-y-auto custom-scrollbar">
                                        <BandejaEntrada modoCompacto={true} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                                className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900">{usuario?.nombre}</p>
                                    <p className="text-xs text-gray-500 capitalize">{usuario?.rol}</p>
                                </div>
                                <div className="bg-gray-100 p-2 rounded-full text-gray-600">
                                    <User size={20} />
                                </div>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            {mostrarMenuUsuario && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                                    <button
                                        onClick={() => { navigate('/perfil'); setMostrarMenuUsuario(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <User size={16} /> Mi Perfil
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                        onClick={() => { manejarCierreSesion(); setMostrarMenuUsuario(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <LogOut size={16} /> Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default BarraNavegacionPanel;
