import React, { createContext, useState, useEffect } from 'react';
import { obtenerUsuarios, registrarUsuarioDB, actualizarUsuarioDB, obtenerUsuarioPorId, cambiarPassword, obtenerPreguntaRecuperacion, verificarRespuestaRecuperacion, loginDB } from '../services/db';

import { supabase } from '../supabase/client';

export const ContextoAutenticacion = createContext();

export const ProveedorAutenticacion = ({ children }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    const formatearUsuario = (u) => ({
        ...u,
        numeroDocumento: u.numero_documento,
        fechaNacimiento: u.fecha_nacimiento,
        licenciaConducir: u.licencia_conducir,
        tipoDocumento: u.tipo_documento,
        contactoEmergencia: u.contacto_emergencia,
        codigoEmpleado: u.codigo_empleado,
        preguntaSecreta: u.pregunta_secreta,
        respuestaSecreta: u.respuesta_secreta,
        nombres: u.nombres,
        apellidos: u.apellidos,
        nacionalidad: u.nacionalidad
    });

    // 1. Efecto de Inicialización de Sesión (Capa Crítica)
    useEffect(() => {
        const restaurarSesion = async () => {
            try {
                // Restaurar sesión usando la fuente de verdad: Supabase
                const { data: { session: sessionInicial } } = await supabase.auth.getSession();

                if (sessionInicial?.user) {
                    const usuarioFresco = await obtenerUsuarioPorId(sessionInicial.user.id);
                    if (usuarioFresco) {
                        setUsuario(formatearUsuario(usuarioFresco));
                        localStorage.setItem('usuario_verano_id', sessionInicial.user.id);
                    }
                } else {
                    localStorage.removeItem('usuario_verano_id');
                }
            } catch (err) {
                console.error("Error restaurando sesión:", err);
            } finally {
                setCargando(false);
            }
        };

        restaurarSesion();

        // Suscribirse a cambios de Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const eventosDeInicio = ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'];

            if (eventosDeInicio.includes(event) && session) {
                const usuarioFresco = await obtenerUsuarioPorId(session.user.id);
                if (usuarioFresco) {
                    setUsuario(formatearUsuario(usuarioFresco));
                    localStorage.setItem('usuario_verano_id', session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                setUsuario(null);
                localStorage.removeItem('usuario_verano_id');
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // 2. Efecto para cargar lista de usuarios (Capa Secundaria - No bloquea App)
    useEffect(() => {
        const cargarUsuarios = async () => {
            try {
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
            } catch (err) {
                console.warn("Error no crítico cargando lista de usuarios:", err);
            }
        };

        if (usuario && (usuario.rol === 'admin' || usuario.rol === 'dueno')) {
            cargarUsuarios();
        }
    }, [usuario]);





    const iniciarSesion = async (email, password) => {
        console.log("Iniciando sesión (Contexto)...");
        try {
            const resultado = await loginDB(email, password);
            console.log("Resultado LoginDB:", resultado);

            if (resultado.success && resultado.data) {
                // Actualización optimista inmediata
                setUsuario(formatearUsuario(resultado.data));
                localStorage.setItem('usuario_verano_id', resultado.data.id);
            }
            console.log("Resultado final de loginDB en Contexto:", resultado);
            return resultado;
        } catch (e) {
            console.error("Excepcion iniciarSesion:", e);
            return { success: false, error: e.message || 'Error inesperado' };
        }
    };

    const registrarUsuario = async (datos) => {
        // Mapear camelCase a snake_case para DB
        const datosParaDB = {
            ...datos,
            rol: datos.rol || 'cliente',
            sede_id: datos.sede || datos.sede_id || null
        };

        const resultado = await registrarUsuarioDB(datosParaDB);
        if (resultado.success) {
            // El registro exitoso a menudo hace auto-login en Supabase, lo que disparará el listener.
            // Si no, podríamos setear manualmente, pero confiemos en el flujo.
            return true;
        } else {
            return resultado.error?.message || resultado.error || 'Error';
        }
    };

    const cerrarSesion = async () => {
        // 1. Limpieza local inmediata para respuesta instantánea de la UI
        setUsuario(null);
        localStorage.removeItem('usuario_verano_id');

        try {
            // 2. Notificar al servidor (sin bloquear la UI si tarda)
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error al cerrar sesión formalmente:", error);
        }
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

    const eliminarUsuario = async (id) => {
        const { eliminarUsuarioDB } = await import('../services/db');
        const resultado = await eliminarUsuarioDB(id);

        if (resultado.success) {
            setUsuarios(prev => prev.filter(u => u.id !== id));
            if (resultado.tipo === 'soft') {
                alert("🗑️ El usuario tenía historial, así que se ha desactivado (Borrado Lógico) para mantener la integridad.");
            } else {
                alert("🗑️ Usuario eliminado permanentemente.");
            }
            return true;
        } else {
            alert("⚠️ Error al eliminar: " + (resultado.error || "Desconocido"));
            return false;
        }
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
            actualizarPassword: actualizarPasswordWrapper,
            recuperarPregunta: obtenerPreguntaRecuperacion,
            verificarRespuesta: verificarRespuestaRecuperacion,
            restablecerPassword: actualizarUsuarioDB // Usar wrapper si se necesita mapeo, pero directo funciona para {password}
        }}>
            {children}
        </ContextoAutenticacion.Provider>
    );
};
