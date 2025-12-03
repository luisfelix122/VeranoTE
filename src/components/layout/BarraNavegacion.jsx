    import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, ShoppingCart, LogOut, MapPin, User, ChevronDown, CreditCard, Bell } from 'lucide-react';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';
import { ContextoCarrito } from '../../contexts/ContextoCarrito';
import { ContextoInventario } from '../../contexts/ContextoInventario';
import { ContextoSoporte } from '../../contexts/ContextoSoporte';
import { sedes } from '../../utils/constants';
import Boton from '../ui/Boton';

import BandejaEntrada from '../../pages/BandejaEntrada';

const BarraNavegacion = ({ setMostrarLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario, cerrarSesion } = useContext(ContextoAutenticacion);
    const { carrito, setEsVisible } = useContext(ContextoCarrito);
    const { sedeActual, setSedeActual } = useContext(ContextoInventario);
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

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain hover:scale-105 transition-transform" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                            Alquiler de Verano
                        </span>
                    </div>

                    {/* Selector de Sede */}
                    <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                        <MapPin size={16} className="text-gray-500" />
                        <select
                            value={sedeActual}
                            onChange={(e) => setSedeActual(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                        >
                            {sedes.map(sede => (
                                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        {usuario ? (
                            <>
                                {(usuario.rol === 'admin' || usuario.rol === 'dueno') && (
                                    <div className="hidden md:flex gap-2">
                                        {usuario.rol === 'admin' && (
                                            <>
                                                <Boton variante="fantasma" onClick={() => navigate('/admin/inventario')} className="text-sm">Inventario</Boton>
                                                <Boton variante="fantasma" onClick={() => navigate('/admin/promociones')} className="text-sm">Promociones</Boton>
                                                <Boton variante="fantasma" onClick={() => navigate('/admin/punto-venta')} className="text-sm">Punto de Venta</Boton>
                                            </>
                                        )}
                                        <Boton variante="fantasma" onClick={() => navigate('/admin/usuarios')} className="text-sm">Usuarios</Boton>
                                        <Boton variante="fantasma" onClick={() => navigate('/admin/reportes')} className="text-sm">Reportes</Boton>
                                    </div>
                                )}
                                {usuario.rol === 'vendedor' && (
                                    <div className="hidden md:flex gap-2">
                                        <Boton variante="fantasma" onClick={() => navigate('/vendedor/operaciones')} className="text-sm">Operaciones</Boton>
                                        <Boton variante="fantasma" onClick={() => navigate('/vendedor/punto-venta')} className="text-sm">Punto de Venta</Boton>
                                        <Boton variante="fantasma" onClick={() => navigate('/vendedor/reportes')} className="text-sm">Reportes</Boton>
                                    </div>
                                )}
                                {usuario.rol === 'mecanico' && (
                                    <div className="hidden md:flex gap-2">
                                        <Boton variante="fantasma" onClick={() => navigate('/mecanico')} className="text-sm">Taller</Boton>
                                        <Boton variante="fantasma" onClick={() => navigate('/mecanico/reportes')} className="text-sm">Reportes</Boton>
                                    </div>
                                )}
                                {usuario.rol === 'cliente' && (
                                    <div className="hidden md:flex items-center gap-1 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
                                        <button
                                            onClick={() => navigate('/')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Tienda
                                        </button>
                                        <button
                                            onClick={() => navigate('/mis-gastos')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/mis-gastos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Mis Reportes
                                        </button>
                                        <button
                                            onClick={() => navigate('/soporte')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/soporte' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Soporte
                                        </button>
                                    </div>
                                )}

                                {/* Botón Notificaciones / Bandeja (Campanita) */}
                                <div className="relative">
                                    <button
                                        onClick={() => setMostrarBandeja(!mostrarBandeja)}
                                        className={`boton-bandeja relative p-2 rounded-lg transition-colors ${mostrarBandeja ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                                        title="Notificaciones"
                                    >
                                        <Bell size={24} />
                                        {conteoNoLeidos > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold px-1">
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

                                <div className="relative ml-2" ref={menuRef}>
                                    <button
                                        onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
                                        className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                    >
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                                            <p className="text-xs text-gray-500 capitalize">{usuario.rol}</p>
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
                                            {usuario.rol === 'cliente' && (
                                                <button
                                                    onClick={() => { navigate('/perfil'); setMostrarMenuUsuario(false); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <CreditCard size={16} /> Mis Tarjetas
                                                </button>
                                            )}
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <button
                                                onClick={() => { cerrarSesion(); setMostrarMenuUsuario(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <LogOut size={16} /> Cerrar Sesión
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <Boton variante="secundario" onClick={() => setMostrarLogin(true)}>
                                Iniciar Sesión
                            </Boton>
                        )}

                        {(!usuario || usuario.rol === 'cliente') && (
                            <button
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                onClick={() => setEsVisible(true)}
                            >
                                <ShoppingCart size={24} />
                                {carrito.length > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
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
