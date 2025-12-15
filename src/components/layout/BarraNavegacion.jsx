import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, ShoppingCart, LogOut, MapPin, User, ChevronDown, CreditCard, Bell, Sun, Waves } from 'lucide-react';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';
import { ContextoCarrito } from '../../contexts/ContextoCarrito';
import { ContextoInventario } from '../../contexts/ContextoInventario';
import { ContextoSoporte } from '../../contexts/ContextoSoporte';

import Boton from '../ui/Boton';
import BandejaEntrada from '../../pages/BandejaEntrada';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../ui/LanguageSelector';

const BarraNavegacion = ({ setMostrarLogin }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario, cerrarSesion } = useContext(ContextoAutenticacion);
    const { carrito, setEsVisible } = useContext(ContextoCarrito);
    const { sedeActual, setSedeActual, sedes } = useContext(ContextoInventario);
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

    const esHome = location.pathname === '/';

    return (
        <nav className={`${esHome
            ? 'fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl rounded-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl'
            : 'sticky top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'
            } z-50 transition-all duration-500 ease-in-out`}>
            <div className={`mx-auto px-6 ${esHome ? 'py-2' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
                <div className="flex justify-between h-14 items-center">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl shadow-lg shadow-blue-200/50 transform group-hover:scale-105 transition-all duration-300 overflow-hidden">
                            <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-400 blur-md opacity-40 rounded-full translate-x-1 -translate-y-1"></div>
                            <Sun className="text-yellow-100 absolute top-1.5 right-1.5 opacity-90" size={14} fill="currentColor" />
                            <Waves className="text-white relative z-10 mt-1" size={22} strokeWidth={2.5} />
                        </div>
                        <span className={`text-xl font-extrabold tracking-tight ${esHome ? 'text-gray-800' : 'bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500'}`}>
                            {t('nav.app_name', 'Alquiler de Verano')}
                        </span>
                    </div>

                    {/* Selector de Sede (Solo visible si no es home o si se desea mostrar discreto) */}
                    {!esHome && (
                        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 transition-all hover:border-gray-300 hover:shadow-sm">
                            <MapPin size={14} className="text-gray-400" />
                            <select
                                value={sedeActual}
                                onChange={(e) => setSedeActual(e.target.value)}
                                className="bg-transparent border-none text-xs font-semibold text-gray-600 focus:ring-0 cursor-pointer p-0"
                            >
                                {sedes.map(sede => (
                                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Actions Section */}
                    <div className="flex items-center gap-3 md:gap-5">
                        <LanguageSelector />

                        {usuario ? (
                            <>
                                {/* Menus por Rol */}
                                <div className="hidden lg:flex items-center gap-1">
                                    {(usuario.rol === 'admin' || usuario.rol === 'dueno') && (
                                        <>
                                            {usuario.rol === 'admin' && (
                                                <>
                                                    <Boton variante="fantasma" onClick={() => navigate('/admin/inventario')} className="text-xs font-medium">{t('nav.inventario')}</Boton>
                                                    <Boton variante="fantasma" onClick={() => navigate('/admin/promociones')} className="text-xs font-medium">{t('nav.promociones')}</Boton>
                                                </>
                                            )}
                                            <Boton variante="fantasma" onClick={() => navigate('/admin/usuarios')} className="text-xs font-medium">{t('nav.usuarios')}</Boton>
                                            <Boton variante="fantasma" onClick={() => navigate('/admin/reportes')} className="text-xs font-medium">{t('nav.reportes')}</Boton>
                                        </>
                                    )}
                                    {usuario.rol === 'vendedor' && (
                                        <>
                                            <Boton variante="fantasma" onClick={() => navigate('/vendedor/operaciones')} className="text-xs font-medium">{t('nav.operaciones')}</Boton>
                                            <Boton variante="fantasma" onClick={() => navigate('/vendedor/punto-venta')} className="text-xs font-medium">{t('nav.punto_venta')}</Boton>
                                        </>
                                    )}
                                    {usuario.rol === 'cliente' && (
                                        <>
                                            <button onClick={() => navigate('/')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${location.pathname === '/' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                {t('nav.tienda')}
                                            </button>
                                            <button onClick={() => navigate('/mis-gastos')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${location.pathname === '/mis-gastos' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                {t('nav.mis_reportes')}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Inbox & Profile */}
                                <div className="flex items-center gap-2 pl-2 border-l border-gray-200/50">
                                    <div className="relative">
                                        <button
                                            onClick={() => setMostrarBandeja(!mostrarBandeja)}
                                            className={`relative p-2 rounded-full transition-all duration-300 ${mostrarBandeja ? 'bg-gray-900 text-white shadow-lg rotate-12' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                                        >
                                            <Bell size={20} />
                                            {conteoNoLeidos > 0 && (
                                                <span className="absolute top-0 right-0 bg-red-500 border-2 border-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] text-white font-bold">
                                                    {conteoNoLeidos}
                                                </span>
                                            )}
                                        </button>
                                        {/* Dropdown Bandeja */}
                                        {mostrarBandeja && (
                                            <div ref={bandejaRef} className="absolute right-0 mt-4 w-[380px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                                                <BandejaEntrada modoCompacto={true} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative" ref={menuRef}>
                                        <button
                                            onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 p-[2px]">
                                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                                    <User size={16} className="text-gray-700" />
                                                </div>
                                            </div>
                                        </button>

                                        {mostrarMenuUsuario && (
                                            <div className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-4 py-3 border-b border-gray-100 mb-2">
                                                    <p className="text-sm font-bold text-gray-900">{usuario.nombre}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{usuario.rol}</p>
                                                </div>
                                                <button onClick={() => { navigate('/perfil'); setMostrarMenuUsuario(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors">
                                                    <User size={16} /> {t('nav.mi_perfil')}
                                                </button>
                                                <button onClick={() => { cerrarSesion(); setMostrarMenuUsuario(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors mt-1">
                                                    <LogOut size={16} /> {t('nav.cerrar_sesion')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => setMostrarLogin(true)}
                                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg shadow-gray-200 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                {t('nav.iniciar_sesion')}
                            </button>
                        )}

                        {(!usuario || usuario.rol === 'cliente') && (
                            <button
                                className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors"
                                onClick={() => setEsVisible(true)}
                            >
                                <ShoppingCart size={22} />
                                {carrito.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                        {carrito.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default BarraNavegacion;
