import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, BarChart3, User, LogIn, LifeBuoy } from 'lucide-react';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';

const BarraNavegacionMovil = ({ setMostrarLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useContext(ContextoAutenticacion);

    const isActive = (path) => location.pathname === path;

    const navItems = [
        {
            icon: Home,
            label: 'Inicio',
            path: '/',
            action: () => {
                navigate('/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        {
            icon: LifeBuoy,
            label: 'Soporte',
            path: '/soporte',
            visible: usuario?.rol === 'cliente',
            action: () => navigate('/soporte')
        },
        {
            icon: BarChart3,
            label: usuario?.rol === 'cliente' ? 'Reportes' : 'Panel',
            path: usuario?.rol === 'cliente' ? '/mis-gastos' : '/admin/inventario', // Default admin path
            visible: !!usuario, // Only visible if logged in
            action: () => {
                if (usuario) {
                    if (usuario.rol === 'cliente') navigate('/mis-gastos');
                    else if (usuario.rol === 'admin' || usuario.rol === 'dueno') navigate('/admin/inventario');
                    else if (usuario.rol === 'vendedor') navigate('/vendedor/operaciones');
                    else if (usuario.rol === 'mecanico') navigate('/mecanico');
                }
            }
        },
        {
            icon: User,
            label: 'Perfil',
            path: '/perfil',
            visible: !!usuario,
            action: () => navigate('/perfil')
        },
        {
            icon: LogIn,
            label: 'Entrar',
            visible: !usuario,
            action: () => setMostrarLogin(true)
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center z-50 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {navItems.filter(item => item.visible !== false).map((item, index) => {
                const active = isActive(item.path) && (item.path !== '/' || window.scrollY < 100); // Simple heuristic

                return (
                    <button
                        key={index}
                        onClick={item.action}
                        className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default BarraNavegacionMovil;
