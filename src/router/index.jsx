import React, { useContext } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ContextoAutenticacion } from '../contexts/ContextoAutenticacion';

// Layouts
import DisenoPrincipal from '../components/layout/DisenoPrincipal';
import DisenoPanel from '../components/layout/DisenoPanel';

// Pages
import Tienda from '../pages/Tienda';
import DetalleProducto from '../pages/DetalleProducto';
import Perfil from '../pages/Perfil';
import Reportes from '../pages/Reportes';
import Soporte from '../pages/Soporte';
import GestionSedes from '../pages/GestionSedes';
import PanelAdmin from '../pages/PanelAdmin';
import GestionReservas from '../pages/GestionReservas';
import GestionUsuarios from '../pages/GestionUsuarios';
import GestionPromociones from '../pages/GestionPromociones';
import PuntoVenta from '../pages/PuntoVenta';
import PanelVendedor from '../pages/PanelVendedor';
import PanelMecanico from '../pages/PanelMecanico';
import PaginaLegal from '../pages/PaginaLegal';
import Ayuda from '../pages/Ayuda';


import ErrorPage from '../pages/ErrorPage';

// Componente de Ruta Protegida
export const RutaProtegida = ({ children, rolesPermitidos = [] }) => {
    const { usuario } = useContext(ContextoAutenticacion);

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Crear configuración del router
export const crearRouterApp = () => {
    return createBrowserRouter([
        {
            path: '/',
            element: <DisenoPrincipal />,
            errorElement: <ErrorPage />,
            children: [
                {
                    index: true,
                    element: <Tienda />
                },
                {
                    path: 'producto/:id',
                    element: <DetalleProducto />
                },
                {
                    path: 'perfil',
                    element: (
                        <RutaProtegida rolesPermitidos={['cliente', 'vendedor', 'admin', 'dueno', 'mecanico']}>
                            <Perfil />
                        </RutaProtegida>
                    )
                },
                {
                    path: 'soporte',
                    element: <RutaProtegida rolesPermitidos={['cliente', 'vendedor', 'admin', 'dueno', 'mecanico']}><Soporte /></RutaProtegida>
                },
                {
                    path: 'mis-gastos',
                    element: (
                        <RutaProtegida rolesPermitidos={['cliente']}>
                            <Reportes rol="cliente" />
                        </RutaProtegida>
                    )
                },

                {
                    path: 'ayuda',
                    element: <Ayuda />
                },
                {
                    path: 'legal/:slug',
                    element: <PaginaLegal />
                }
            ]
        },
        {
            path: '/admin',
            element: (
                <RutaProtegida rolesPermitidos={['admin', 'dueno']}>
                    <DisenoPanel />
                </RutaProtegida>
            ),
            errorElement: <ErrorPage />,
            children: [
                {
                    index: true,
                    element: <Navigate to="/admin/inventario" replace />
                },
                {
                    path: 'inventario',
                    element: <PanelAdmin />
                },
                {
                    path: 'cobros',
                    element: <RutaProtegida rolesPermitidos={['admin', 'vendedor']}><GestionReservas /></RutaProtegida>
                },
                {
                    path: 'usuarios',
                    element: <GestionUsuarios />
                },
                {
                    path: 'promociones',
                    element: <GestionPromociones />
                },
                {
                    path: 'reportes',
                    element: <Reportes />
                },
                {
                    path: 'sedes',
                    element: <GestionSedes />
                },
                {
                    path: 'punto-venta',
                    element: (
                        <RutaProtegida rolesPermitidos={['admin']}>
                            <PuntoVenta />
                        </RutaProtegida>
                    )
                }
            ]
        },
        {
            path: '/vendedor',
            element: (
                <RutaProtegida rolesPermitidos={['vendedor']}>
                    <DisenoPanel />
                </RutaProtegida>
            ),
            errorElement: <ErrorPage />,
            children: [
                {
                    index: true,
                    element: <Navigate to="/vendedor/operaciones" replace />
                },
                {
                    path: 'operaciones',
                    element: <PanelVendedor />
                },
                {
                    path: 'punto-venta',
                    element: <PuntoVenta />
                },
                {
                    path: 'reportes',
                    element: <Reportes rol="vendedor" />
                },
                {
                    path: 'reservas',
                    element: <GestionReservas />
                }
            ]
        },
        {
            path: '/mecanico',
            element: (
                <RutaProtegida rolesPermitidos={['mecanico']}>
                    <DisenoPanel />
                </RutaProtegida>
            ),
            errorElement: <ErrorPage />,
            children: [
                {
                    index: true,
                    element: <PanelMecanico />
                },
                {
                    path: 'reportes',
                    element: <Reportes rol="mecanico" />
                }
            ]
        },
        {
            path: '*',
            element: <Navigate to="/" replace />
        }
    ]);
};
