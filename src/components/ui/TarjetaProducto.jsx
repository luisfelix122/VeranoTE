import React, { useContext } from 'react';
import Boton from './Boton';
import { ContextoAutenticacion } from '../../contexts/ContextoAutenticacion';

const TarjetaProducto = ({ producto, alSeleccionar }) => {
    const { usuario } = useContext(ContextoAutenticacion);
    // DEBUG: Verificar qué llega en usuario
    // console.log("Usuario en Tarjeta:", usuario);

    // Normalizar acceso a la propiedad de licencia (snake_case o camelCase)
    const tieneLicencia = usuario?.licenciaConducir === true || usuario?.licencia_conducir === true;
    const requiereLicencia = producto.categoria === 'Motor';
    const bloqueadoPorLicencia = usuario && requiereLicencia && !tieneLicencia;

    const { detalleDisponibilidad } = producto;
    const proximosLiberados = detalleDisponibilidad?.proximosLiberados || [];
    const siguienteLiberacion = proximosLiberados.length > 0 ? proximosLiberados[0] : null;

    const formatearHora = (dateObj) => {
        if (!dateObj) return '';
        // Asegurarse de que sea objeto Date
        const d = new Date(dateObj.hora || dateObj);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${bloqueadoPorLicencia ? 'grayscale opacity-70' : ''}`}
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-gray-700">
                    {producto.categoria}
                </div>
            </div>
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{producto.nombre}</h3>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-blue-600 font-bold">S/ {producto.precioPorHora}/h</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${producto.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {producto.stock > 0 ? `${producto.stock} disp.` : 'Agotado'}
                    </span>
                </div>

                {/* Información detallada de disponibilidad */}
                {siguienteLiberacion && (
                    <p className="text-xs text-orange-600 mb-2 font-medium bg-orange-50 px-2 py-1 rounded-lg">
                        {producto.stock === 0
                            ? `Próximo disponible a las ${formatearHora(siguienteLiberacion)}`
                            : `+${siguienteLiberacion.cantidad} disponible(s) a las ${formatearHora(siguienteLiberacion)}`
                        }
                    </p>
                )}

                {/* Fallback si está agotado y no hay próxima liberación calculada (ej. fin del día) */}
                {producto.stock === 0 && !siguienteLiberacion && (
                    <p className="text-xs text-red-500 mb-2 font-medium">
                        No disponible por hoy
                    </p>
                )}
                {bloqueadoPorLicencia && (
                    <p className="text-xs text-red-600 mb-2 font-bold flex items-center gap-1">
                        ⚠️ Tu perfil indica que NO tienes licencia.
                    </p>
                )}
                <Boton
                    onClick={() => alSeleccionar(producto)}
                    variante="primario"
                    className="w-full"
                    disabled={producto.stock === 0 || bloqueadoPorLicencia}
                >
                    {producto.stock === 0 ? 'No Disponible' : (bloqueadoPorLicencia ? 'Requiere Licencia' : 'Ver Detalles')}
                </Boton>
            </div>
        </div>
    );
};

export default TarjetaProducto;
