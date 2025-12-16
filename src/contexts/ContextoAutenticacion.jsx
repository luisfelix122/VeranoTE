import React, { createContext, useState, useEffect } from 'react';
import { obtenerUsuarios, registrarUsuarioDB, actualizarUsuarioDB, obtenerUsuarioPorId, cambiarPassword } from '../services/db';

export const ContextoAutenticacion = createContext();

export const ProveedorAutenticacion = ({ children }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const inicializar = async () => {
            // 1. Cargar lista de usuarios (para login simulado, idealmente esto cambiaría en prod)
            const data = await obtenerUsuarios();
            const usuariosFormateados = data.map(u => ({
                ...u,
                numeroDocumento: u.numero_documento,
                fechaNacimiento: u.fecha_nacimiento,
                licenciaConducir: u.licencia_conducir,
                tipoDocumento: u.tipo_documento,
                contactoEmergencia: u.contacto_emergencia,
                codigoEmpleado: u.codigo_empleado
            }));
            setUsuarios(usuariosFormateados);

            // 2. Restaurar sesión
            const usuarioIdGuardado = localStorage.getItem('usuario_verano_id');
            if (usuarioIdGuardado) {
                try {
                    const usuarioFresco = await obtenerUsuarioPorId(usuarioIdGuardado);
                    if (usuarioFresco) {
                        const usuarioFormateado = {
                            ...usuarioFresco,
                            numeroDocumento: usuarioFresco.numero_documento,
                            fechaNacimiento: usuarioFresco.fecha_nacimiento,
                            licenciaConducir: usuarioFresco.licencia_conducir,
                            tipoDocumento: usuarioFresco.tipo_documento,
                            contactoEmergencia: usuarioFresco.contacto_emergencia,
                            codigoEmpleado: usuarioFresco.codigo_empleado
                        };
                        setUsuario(usuarioFormateado);
                    } else {
                        localStorage.removeItem('usuario_verano_id');
                    }
                } catch (error) {
                    console.error("Error restaurando sesión:", error);
                    localStorage.removeItem('usuario_verano_id');
                }
            }

            // 3. Finalizar carga
            setCargando(false);
        };

        inicializar();
    }, []);

    const iniciarSesion = (email, password) => {
        const usuarioEncontrado = usuarios.find(u => u.email === email && u.password === password);
        if (usuarioEncontrado) {
            setUsuario(usuarioEncontrado);
            localStorage.setItem('usuario_verano_id', usuarioEncontrado.id);
            return true;
        }
        return false;
    };

    const registrarUsuario = async (datos) => {
        // Mapear camelCase a snake_case para DB
        // No necesitamos mapear manualmente a snake_case aquí, porque registrarUsuarioDB en db.js ya hace el mapeo.
        const datosParaDB = {
            ...datos,
            rol: 'cliente'
        };

        const resultado = await registrarUsuarioDB(datosParaDB);
        if (resultado.success) {
            const nuevoUsuario = { ...resultado.data, ...datos, id: resultado.data.id, rol: 'cliente' };
            setUsuarios(prev => [...prev, nuevoUsuario]);
            setUsuario(nuevoUsuario);
            localStorage.setItem('usuario_verano_id', nuevoUsuario.id);
            return true;
        } else {
            // alert("Error al registrar usuario.");
            return resultado.error?.message || resultado.error || 'Error desconocido';
        }
    };

    const cerrarSesion = () => {
        setUsuario(null);
        localStorage.removeItem('usuario_verano_id');
    };

    const actualizarPerfil = async (id, nuevosDatos) => {
        // Mapear camelCase a snake_case para la base de datos
        // Pasamos los datos tal cual (en camelCase), ya que actualizarUsuarioDB en db.js maneja el mapeo.
        const datosDB = { ...nuevosDatos };

        // Actualizar estado local optimista
        setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...nuevosDatos } : u));
        if (usuario && usuario.id === id) setUsuario(prev => ({ ...prev, ...nuevosDatos }));

        // Llamar a DB
        const resultado = await actualizarUsuarioDB(id, datosDB);
        if (!resultado.success) {
            console.error("Error al actualizar perfil:", resultado.error);
            alert("Error al actualizar perfil en base de datos.");
        }
    };

    const cambiarRolUsuario = (id, nuevoRol, sede = null) => {
        setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol: nuevoRol, sede: sede } : u));
        // Actualizar en DB
        actualizarUsuarioDB(id, { rol: nuevoRol, sede_id: sede });
    };

    const eliminarUsuario = (id) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        // Implementar eliminar en DB si es necesario
    };

    const actualizarPasswordWrapper = async (id, actual, nueva) => {
        return await cambiarPassword(id, actual, nueva);
    };

    return (
        <ContextoAutenticacion.Provider value={{
            usuario,
            usuarios,
            iniciarSesion,
            registrarUsuario,
            cerrarSesion,
            actualizarPerfil,
            cambiarRolUsuario,
            eliminarUsuario,
            cargando,
            actualizarPassword: actualizarPasswordWrapper
        }}>
            {children}
        </ContextoAutenticacion.Provider>
    );
};
