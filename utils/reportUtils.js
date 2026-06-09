import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

/**
 * Genera un archivo de Excel para el reporte de asistencia.
 * Explica cada parte del código:
 * - Crea un nuevo libro de trabajo (workbook) y define la data estructurada en AOA (Array of Arrays).
 * - Agrega un bloque de encabezado con los títulos de la Universidad, Facultad, la Dirección y el período.
 * - Mapea los registros de asistencia debajo de la cabecera.
 * - Formatea las columnas con anchos legibles.
 */
export function generarExcel({ asistencias, nombreDireccion, periodoStr }) {
  const wb = XLSX.utils.book_new();
  
  // Encabezado institucional en el Excel
  const wsData = [
    ['UNIVERSIDAD DE CARABOBO'],
    ['FACULTAD DE CIENCIAS ECONÓMICAS Y SOCIALES (FaCES)'],
    [`Dirección: ${nombreDireccion}`],
    [periodoStr],
    [], // Fila vacía de separación
    ['Cédula', 'Nombre', 'Apellido', 'Fecha', 'Hora Entrada', 'Hora Salida']
  ];
  
  asistencias.forEach(item => {
    wsData.push([item.Cedula, item.Nombre, item.Apellido, item.Fecha, item.Entrada, item.Salida]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Asistencia');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Genera un archivo PDF con un diseño formal de reporte.
 * Explica cada parte del código:
 * - Inicializa un documento PDFKit de tamaño carta (Letter) con márgenes de 30px.
 * - Dibuja el logo de la UC a la izquierda y el logo de la Facultad a la derecha (si los archivos existen en la PC).
 * - Imprime el encabezado institucional y el nombre de la dirección en el medio.
 * - Dibuja la tabla de asistencias con cabeceras fijas y gestiona saltos de página repitiendo el header.
 */
export function generarPDF({ asistencias, nombreDireccion, periodoStr }, res) {
  const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=reporte_asistencia.pdf');
  
  doc.pipe(res);

  // Ubicación de los logos en el public de la app (el backend y frontend están en el mismo monorepo)
  const ucLogoPath = path.join(process.cwd(), '../frontend/public/logo-uc.png');
  const facesLogoPath = path.join(process.cwd(), '../frontend/public/faces.png');

  // Función interna para reutilizar la cabecera en cada nueva página
  function drawHeader() {
    // Logo Universidad (Izquierda)
    try {
      if (fs.existsSync(ucLogoPath)) {
        doc.image(ucLogoPath, 30, 20, { width: 50, height: 50 });
      }
    } catch (e) {
      console.error('No se pudo cargar el logo de la UC:', e.message);
    }

    // Logo Facultad (Derecha)
    try {
      if (fs.existsSync(facesLogoPath)) {
        doc.image(facesLogoPath, 532, 20, { width: 50, height: 50 });
      }
    } catch (e) {
      console.error('No se pudo cargar el logo de FaCES:', e.message);
    }

    // Textos del encabezado
    doc.fontSize(12).font('Helvetica-Bold').text('UNIVERSIDAD DE CARABOBO', 90, 20, { align: 'center', width: 432 });
    doc.fontSize(9).font('Helvetica').text('FACULTAD DE CIENCIAS ECONÓMICAS Y SOCIALES (FaCES)', 90, 35, { align: 'center', width: 432 });
    doc.fontSize(11).font('Helvetica-Bold').text(nombreDireccion.toUpperCase(), 90, 48, { align: 'center', width: 432 });
    doc.fontSize(9).font('Helvetica-Oblique').text(periodoStr, 90, 63, { align: 'center', width: 432 });
    
    // Línea divisoria del header
    doc.moveTo(30, 80).lineTo(582, 80).stroke();
  }

  // Dibujar encabezado en la primera página
  drawHeader();

  const tableTop = 95;
  
  // Dibujar cabeceras de columnas
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Cédula', 40, tableTop);
  doc.text('Empleado', 120, tableTop);
  doc.text('Fecha', 300, tableTop);
  doc.text('Entrada', 385, tableTop);
  doc.text('Salida', 475, tableTop);
  
  // Línea divisoria de la cabecera de la tabla
  doc.moveTo(30, tableTop + 15).lineTo(582, tableTop + 15).stroke();
  
  let y = tableTop + 25;
  doc.font('Helvetica');

  asistencias.forEach(item => {
    // Si la fila sobrepasa el límite vertical inferior de la hoja (márgenes), saltar página
    if (y > 700) {
      doc.addPage();
      drawHeader();
      
      // Repetir cabeceras de tabla en la nueva hoja
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Cédula', 40, tableTop);
      doc.text('Empleado', 120, tableTop);
      doc.text('Fecha', 300, tableTop);
      doc.text('Entrada', 385, tableTop);
      doc.text('Salida', 475, tableTop);
      doc.moveTo(30, tableTop + 15).lineTo(582, tableTop + 15).stroke();
      
      y = tableTop + 25;
      doc.font('Helvetica');
    }

    doc.text(item.Cedula.toString(), 40, y);
    doc.text(`${item.Nombre} ${item.Apellido}`, 120, y);
    doc.text(item.Fecha, 300, y);
    doc.text(item.Entrada, 385, y);
    doc.text(item.Salida, 475, y);
    
    y += 20;
  });

  doc.end();
}
