export const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

export const calcularPenalizacion = (fechaFinEstimada, fechaDevolucionReal, precioHora, cantidad) => {
    const fin = new Date(fechaFinEstimada);
    const real = new Date(fechaDevolucionReal);

    // Si se devuelve antes o a tiempo, no hay penalización
    if (real <= fin) return 0;

    const diffMs = real - fin;
    const diffMinutos = Math.ceil(diffMs / (1000 * 60));

    // Tolerancia de 10 minutos
    if (diffMinutos <= 10) return 0;

    // Si pasa la tolerancia, se cobra por hora completa de retraso
    const diffHoras = Math.ceil(diffMs / (1000 * 60 * 60));
    return diffHoras * precioHora * 2 * cantidad;
};
