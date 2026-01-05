import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearFecha } from './formatters';

// Configuración de la Empresa
const EMPRESA = {
    nombre: "VERANO RENTAL S.A.C.",
    ruc: "20601234567", // Mock RUC
    direccion_fiscal: "Av. Principal 123, Lima, Perú",
    sedes: {
        'costa': "Av. Costanera 123, Playa Costa, Lima",
        'rural': "Carretera Central Km 40, Zona Camping, Lima",
        'default': "Sede Principal"
    },
    // Logo en Base64 para evitar problemas de CORS/Red
    logo_base64: "data:image/png;base64,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",
    logo_width: 20,
    logo_height: 20
};

/**
 * Genera un PDF tamaño boleta/ticket (A5 o similar, o A4 ajustado)
 * @param {Object} alquiler - Objeto completo del alquiler
 * @param {String} tipo - 'boleta' | 'factura'
 */
export const generarComprobante = (alquiler, tipo = 'boleta') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Logo (Vectorial) ---
    // Dibujo manual de un sol y olas para asegurar que siempre se vea sin depender de imágenes externas o base64
    try {
        const logoX = 15;
        const logoY = 15;

        // Sol (Círculo amarillo)
        doc.setFillColor(255, 204, 0); // Amarillo
        doc.circle(logoX + 10, logoY + 10, 8, 'F');

        // Rayos del sol simples
        doc.setDrawColor(255, 153, 0); // Naranja
        doc.setLineWidth(0.5);
        doc.line(logoX + 10, logoY, logoX + 10, logoY - 3); // Arriba
        doc.line(logoX + 10, logoY + 20, logoX + 10, logoY + 23); // Abajo
        doc.line(logoX, logoY + 10, logoX - 3, logoY + 10); // Izquierda
        doc.line(logoX + 20, logoY + 10, logoX + 23, logoY + 10); // Derecha

        // Ola (Curvas azules simplificadas)
        doc.setDrawColor(0, 102, 204); // Azul
        doc.setLineWidth(1);
        doc.line(logoX + 2, logoY + 14, logoX + 6, logoY + 18);
        doc.line(logoX + 6, logoY + 18, logoX + 10, logoY + 14);
        doc.line(logoX + 10, logoY + 14, logoX + 14, logoY + 18);
        doc.line(logoX + 14, logoY + 18, logoX + 18, logoY + 14);

    } catch (e) {
        console.warn("Error al renderizar logo vectorial", e);
    }

    // --- Cabecera ---
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // Azul corporativo
    doc.text(EMPRESA.nombre, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`RUC: ${EMPRESA.ruc}`, pageWidth / 2, 26, { align: 'center' });

    const direccionSede = EMPRESA.sedes[alquiler.sede_id || 'costa'] || EMPRESA.sedes.default;
    doc.text(direccionSede, pageWidth / 2, 31, { align: 'center' });

    // --- Título del Documento ---
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`${tipo.toUpperCase()} ELECTRÓNICA`, pageWidth / 2, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Nro: ${alquiler.codigo_reserva || alquiler.id?.slice(0, 8).toUpperCase()}`, pageWidth / 2, 51, { align: 'center' });

    // --- Datos del Cliente ---
    const startY = 65;
    doc.setFontSize(10);
    doc.text(`Cliente:`, 15, startY);
    doc.text(`${alquiler.cliente || 'Consumidor Final'}`, 40, startY);

    doc.text(`Doc:`, 15, startY + 6);
    doc.text(`${alquiler.clienteDni || alquiler.numero_documento || alquiler.numeroDocumento || alquiler.documento || '-'}`, 40, startY + 6);

    // --- Datos de Factura (Si aplica) ---
    const datosFactura = alquiler.datos_factura || alquiler.datosFactura;

    if (tipo === 'factura' && datosFactura) {
        // Soporte snake_case y camelCase
        const ruc = datosFactura.ruc || datosFactura.RUC || '';
        const razon = datosFactura.razonSocial || datosFactura.razon_social || '';
        const dir = datosFactura.direccion || datosFactura.direccion_fiscal || '';

        if (ruc) {
            doc.text(`RUC Cliente:`, 15, startY + 12);
            doc.text(`${ruc}`, 40, startY + 12);
            doc.text(`Razón Social:`, 15, startY + 18);
            doc.text(`${razon}`, 40, startY + 18);
            doc.text(`Dirección:`, 15, startY + 24);
            doc.text(`${dir}`, 40, startY + 24);
        }
    }

    doc.text(`Fecha:`, 120, startY);
    // Soporte para fechaInicio (objeto local) o fecha_inicio (DB)
    const fechaEmision = alquiler.fecha_inicio || alquiler.fechaInicio || new Date();
    doc.text(`${formatearFecha(fechaEmision)}`, 140, startY);

    // --- Tabla de Items ---
    const items = alquiler.items?.map(item => [
        item.cantidad,
        item.nombre,
        `${item.horas}h`,
        `S/ ${(item.cantidad * item.horas * Number(item.precioPorHora)).toFixed(2)}`
    ]) || [];

    // Ajustar posición de la tabla según si hubo datos extra de factura
    let tableStartY = startY + 15;
    if (tipo === 'factura' && datosFactura && datosFactura.ruc) {
        tableStartY = startY + 35; // Dejar espacio para las 3 líneas extra (12, 18, 24)
    }

    autoTable(doc, {
        startY: tableStartY,
        head: [['Cant', 'Descripción', 'Tiempo', 'Total']],
        body: items,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    // --- Totales ---
    // Soporte camelCase (frontend) y snake_case (DB)
    const totalServicio = Number(alquiler.total_servicio || alquiler.totalServicio || alquiler.total || 0);
    const garantia = Number(alquiler.garantia || 0);
    const totalFinal = Number(alquiler.total_final || alquiler.totalFinal || 0);

    doc.setFontSize(10);

    // Total Servicio
    doc.text(`Total Servicio:`, 140, finalY, { align: 'right' });
    doc.text(`S/ ${totalServicio.toFixed(2)}`, 190, finalY, { align: 'right' });

    // Garantía
    if (garantia > 0) {
        doc.setTextColor(100);
        doc.text(`Garantía (Reembolsable):`, 140, finalY + 6, { align: 'right' });
        doc.text(`S/ ${garantia.toFixed(2)}`, 190, finalY + 6, { align: 'right' });
        doc.setTextColor(0);
        finalY += 6;
    }

    // Total a Pagar
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL PAGADO:`, 140, finalY + 10, { align: 'right' });
    doc.text(`S/ ${totalFinal.toFixed(2)}`, 190, finalY + 10, { align: 'right' });

    // --- Pie de Página ---
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Gracias por su preferencia. Conserve este comprobante para cualquier reclamo o devolución de garantía.", 15, 280);

    doc.save(`Comprobante_${alquiler.id?.slice(0, 8)}.pdf`);
};

/**
 * Genera un comprobante de RETENCIÓN (Penalidad) cuando no se devuelve la garantía
 */
export const generarComprobantePenalidad = (alquiler, montoRetenido, motivo = "Daños o Retraso") => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Cabecera similar
    doc.setFontSize(16);
    doc.setTextColor(204, 0, 0); // Rojo para indicar penalidad/retención
    doc.text("COMPROBANTE DE RETENCIÓN / PENALIDAD", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(EMPRESA.nombre, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Ref. Reserva: ${alquiler.codigo_reserva || alquiler.id?.slice(0, 8)}`, pageWidth / 2, 34, { align: 'center' });

    // Datos
    const startY = 50;
    doc.text(`Cliente: ${alquiler.cliente}`, 20, startY);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, startY + 8);
    doc.text(`Sede: ${EMPRESA.sedes[alquiler.sede_id || 'costa'] || EMPRESA.sedes.default}`, 20, startY + 16);

    // Caja de Detalle
    doc.setFillColor(245, 245, 245);
    doc.rect(20, startY + 25, 170, 40, 'F');

    doc.setFontSize(12);
    doc.text("Concepto:", 25, startY + 35);
    doc.setFont(undefined, 'bold');
    doc.text("Retención de Garantía / Penalidad", 25, startY + 45);

    doc.setFont(undefined, 'normal');
    doc.text(`Motivo: ${motivo}`, 25, startY + 55);

    // Monto
    doc.setFontSize(14);
    doc.text(`Monto Cobrado: S/ ${Number(montoRetenido).toFixed(2)}`, 180, startY + 45, { align: 'right' });

    // Nota legal
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Este documento certifica el cobro de la penalidad o retención de garantía según los términos y condiciones aceptados al inicio del alquiler.", 20, startY + 80, { maxWidth: 170 });

    doc.save(`Penalidad_${alquiler.id?.slice(0, 8)}.pdf`);
};
