import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

/**
 * Retorna el lunes y sábado correspondiente a una fecha YYYY-MM-DD.
 */
function getMondayAndSaturday(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay(); // 0 = Domingo, 1 = Lunes...
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diffToMonday));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    mondayStr: monday.toISOString().split('T')[0],
    saturdayStr: saturday.toISOString().split('T')[0]
  };
}

/**
 * Retorna el nombre del día en español a partir de una fecha YYYY-MM-DD.
 */
function getDayName(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const dayNum = date.getDay();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dayNames[dayNum];
}

/**
 * Genera un archivo de Excel para el reporte de asistencia con estructura dinámica por rango.
 */
export function generarExcel({ asistencias, nombreDireccion, periodoStr, rango }) {
  const wb = XLSX.utils.book_new();
  
  // Encabezado institucional en el Excel
  const wsData = [
    ['UNIVERSIDAD DE CARABOBO'],
    ['FACULTAD DE CIENCIAS ECONÓMICAS Y SOCIALES (FaCES)'],
    [`Dirección: ${nombreDireccion}`],
    [periodoStr],
    [] // Fila vacía de separación
  ];
  
  if (rango === 'mensual') {
    // 1. Agrupar por semana y día (Lunes a Sábado)
    const weeks = {};
    asistencias.forEach(a => {
      const { mondayStr, saturdayStr } = getMondayAndSaturday(a.Fecha);
      const weekKey = `Semana: Del ${mondayStr} al ${saturdayStr}`;
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          'Lunes': [],
          'Martes': [],
          'Miércoles': [],
          'Jueves': [],
          'Viernes': [],
          'Sábado': []
        };
      }
      const dayName = getDayName(a.Fecha);
      if (dayName !== 'Domingo') {
        weeks[weekKey][dayName].push(a);
      }
    });

    const sortedWeekKeys = Object.keys(weeks).sort();

    if (sortedWeekKeys.length === 0) {
      wsData.push(['No se registraron asistencias en este período mensual.']);
    } else {
      sortedWeekKeys.forEach(weekKey => {
        wsData.push([weekKey.toUpperCase()]);
        wsData.push(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']);
        
        const weekData = weeks[weekKey];
        // Encontrar el número máximo de personas en algún día de esta semana
        const maxRows = Math.max(
          weekData['Lunes'].length,
          weekData['Martes'].length,
          weekData['Miércoles'].length,
          weekData['Jueves'].length,
          weekData['Viernes'].length,
          weekData['Sábado'].length
        );

        if (maxRows === 0) {
          wsData.push(['Sin marcajes esta semana']);
        } else {
          for (let i = 0; i < maxRows; i++) {
            const row = [];
            ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].forEach(day => {
              const item = weekData[day][i];
              row.push(item ? `${item.Nombre} ${item.Apellido} (${item.Cedula})` : '');
            });
            wsData.push(row);
          }
        }
        wsData.push([]); // Fila vacía de separación
      });
    }
  } 
  else if (rango === 'semanal') {
    // 2. Reporte semanal: filas de empleados, columnas de lunes a sábado con entrada/salida
    const employees = {};
    asistencias.forEach(a => {
      const key = a.Cedula;
      if (!employees[key]) {
        employees[key] = {
          Cedula: a.Cedula,
          Nombre: a.Nombre,
          Apellido: a.Apellido,
          days: {
            'Lunes': '',
            'Martes': '',
            'Miércoles': '',
            'Jueves': '',
            'Viernes': '',
            'Sábado': ''
          }
        };
      }
      const dayName = getDayName(a.Fecha);
      if (dayName !== 'Domingo') {
        const entrada = a.Entrada ? a.Entrada.substring(0, 5) : '--:--';
        const salida = a.Salida && a.Salida !== 'Sin registrar' ? a.Salida.substring(0, 5) : '--:--';
        employees[key].days[dayName] = `${entrada} - ${salida}`;
      }
    });

    wsData.push(['Cédula', 'Nombre', 'Apellido', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']);
    
    const list = Object.values(employees);
    if (list.length === 0) {
      wsData.push(['No se registraron asistencias en este período semanal.']);
    } else {
      list.forEach(emp => {
        wsData.push([
          emp.Cedula,
          emp.Nombre,
          emp.Apellido,
          emp.days['Lunes'],
          emp.days['Martes'],
          emp.days['Miércoles'],
          emp.days['Jueves'],
          emp.days['Viernes'],
          emp.days['Sábado']
        ]);
      });
    }
  } 
  else {
    // 3. Reporte diario: solo usuarios que marcaron
    wsData.push(['Cédula', 'Nombre', 'Apellido', 'Hora Entrada', 'Hora Salida']);
    if (asistencias.length === 0) {
      wsData.push(['No se registraron asistencias en este día.']);
    } else {
      asistencias.forEach(item => {
        wsData.push([item.Cedula, item.Nombre, item.Apellido, item.Entrada, item.Salida]);
      });
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Ajustar anchos de columnas
  if (rango === 'mensual') {
    ws['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 }
    ];
  } else if (rango === 'semanal') {
    ws['!cols'] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
  } else {
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ];
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Asistencia');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Genera un archivo PDF con un diseño formal de reporte y estructura por rango.
 */
export function generarPDF({ asistencias, nombreDireccion, periodoStr, rango }, res) {
  const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=reporte_asistencia_${rango}.pdf`);
  
  doc.pipe(res);

  // Ubicación de los logos en el public de la app
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
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000661').text('UNIVERSIDAD DE CARABOBO', 90, 20, { align: 'center', width: 432 });
    doc.fontSize(9).font('Helvetica').fillColor('#333333').text('FACULTAD DE CIENCIAS ECONÓMICAS Y SOCIALES (FaCES)', 90, 35, { align: 'center', width: 432 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(nombreDireccion.toUpperCase(), 90, 48, { align: 'center', width: 432 });
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text(periodoStr, 90, 63, { align: 'center', width: 432 });
    
    // Línea divisoria del header
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(30, 80).lineTo(582, 80).stroke();
  }

  // Dibujar encabezado en la primera página
  drawHeader();

  let y = 95;

  if (rango === 'mensual') {
    // --- FORMATO MENSUAL (Por semanas, Lunes a Sábado) ---
    const weeks = {};
    asistencias.forEach(a => {
      const { mondayStr, saturdayStr } = getMondayAndSaturday(a.Fecha);
      const weekKey = `${mondayStr} al ${saturdayStr}`;
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          mondayStr,
          saturdayStr,
          days: {
            'Lunes': [],
            'Martes': [],
            'Miércoles': [],
            'Jueves': [],
            'Viernes': [],
            'Sábado': []
          }
        };
      }
      const dayName = getDayName(a.Fecha);
      if (dayName !== 'Domingo') {
        weeks[weekKey].days[dayName].push(a);
      }
    });

    const sortedWeekKeys = Object.keys(weeks).sort();

    if (sortedWeekKeys.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#777777').text('No se registraron asistencias en este período mensual.', 40, y);
    } else {
      sortedWeekKeys.forEach((weekKey) => {
        const weekData = weeks[weekKey];
        const maxRows = Math.max(
          weekData.days['Lunes'].length,
          weekData.days['Martes'].length,
          weekData.days['Miércoles'].length,
          weekData.days['Jueves'].length,
          weekData.days['Viernes'].length,
          weekData.days['Sábado'].length
        );

        // Altura de tabla: título (15) + cabeceras (15) + filas (maxRows * 24) + separación (15)
        const tableHeight = 35 + (maxRows > 0 ? maxRows * 24 : 20);

        if (y + tableHeight > 730) {
          doc.addPage();
          drawHeader();
          y = 95;
        }

        // Título de la semana
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000661').text(`SEMANA: DEL ${weekKey}`, 30, y);
        y += 14;

        // Dibujar cabeceras de columnas
        const colWidth = 92;
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
        days.forEach((day, idx) => {
          doc.text(day, 30 + idx * colWidth, y, { width: colWidth, align: 'center' });
        });
        
        y += 12;
        doc.strokeColor('#dddddd').lineWidth(1).moveTo(30, y).lineTo(582, y).stroke();
        y += 5;

        if (maxRows === 0) {
          doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#777777').text('Sin marcajes esta semana', 30, y, { align: 'center', width: 552 });
          y += 20;
        } else {
          for (let r = 0; r < maxRows; r++) {
            doc.font('Helvetica');
            days.forEach((day, cIdx) => {
              const item = weekData.days[day][r];
              if (item) {
                const nameStr = `${item.Nombre.charAt(0)}. ${item.Apellido}`;
                doc.fontSize(7.5).fillColor('#333333').text(nameStr, 30 + cIdx * colWidth, y, { width: colWidth - 4, align: 'center', height: 10, ellipsis: true });
                doc.fontSize(6.5).fillColor('#666666').text(item.Cedula.toString(), 30 + cIdx * colWidth, y + 10, { width: colWidth - 4, align: 'center' });
              }
            });
            y += 24;
          }
        }

        doc.strokeColor('#cccccc').lineWidth(1).moveTo(30, y).lineTo(582, y).stroke();
        y += 15;
      });
    }
  } 
  else if (rango === 'semanal') {
    // --- FORMATO SEMANAL (Matriz Empleado vs Día) ---
    const employees = {};
    asistencias.forEach(a => {
      const key = a.Cedula;
      if (!employees[key]) {
        employees[key] = {
          Cedula: a.Cedula,
          Nombre: a.Nombre,
          Apellido: a.Apellido,
          days: {
            'Lunes': '',
            'Martes': '',
            'Miércoles': '',
            'Jueves': '',
            'Viernes': '',
            'Sábado': ''
          }
        };
      }
      const dayName = getDayName(a.Fecha);
      if (dayName !== 'Domingo') {
        const entrada = a.Entrada ? a.Entrada.substring(0, 5) : '--:--';
        const salida = a.Salida && a.Salida !== 'Sin registrar' ? a.Salida.substring(0, 5) : '--:--';
        employees[key].days[dayName] = `${entrada}\n${salida}`;
      }
    });

    // Dibujar cabeceras
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Cédula', 35, y, { width: 55 });
    doc.text('Empleado', 90, y, { width: 95 });
    
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    days.forEach((day, idx) => {
      doc.text(day, 190 + idx * 65, y, { width: 60, align: 'center' });
    });

    y += 14;
    doc.strokeColor('#888888').lineWidth(1.2).moveTo(30, y).lineTo(582, y).stroke();
    y += 8;

    const employeesList = Object.values(employees);

    if (employeesList.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#777777').text('No se registraron asistencias esta semana.', 40, y);
    } else {
      employeesList.forEach(emp => {
        if (y > 700) {
          doc.addPage();
          drawHeader();
          y = 95;
          
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text('Cédula', 35, y, { width: 55 });
          doc.text('Empleado', 90, y, { width: 95 });
          days.forEach((day, idx) => {
            doc.text(day, 190 + idx * 65, y, { width: 60, align: 'center' });
          });
          y += 14;
          doc.strokeColor('#888888').lineWidth(1.2).moveTo(30, y).lineTo(582, y).stroke();
          y += 8;
        }

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(emp.Cedula.toString(), 35, y, { width: 55 });
        
        const fullName = `${emp.Nombre} ${emp.Apellido}`;
        doc.fontSize(7.5).font('Helvetica').fillColor('#333333').text(fullName, 90, y, { width: 95, height: 18, ellipsis: true });

        days.forEach((day, idx) => {
          const mark = emp.days[day] || '-\n-';
          doc.fontSize(6.5).fillColor(mark === '-\n-' ? '#aaaaaa' : '#333333').text(mark, 190 + idx * 65, y, { width: 60, align: 'center' });
        });

        y += 24;
        doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(30, y).lineTo(582, y).stroke();
        y += 6;
      });
    }
  } 
  else {
    // --- FORMATO DIARIO ---
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Cédula', 45, y);
    doc.text('Empleado', 145, y);
    doc.text('Hora Entrada', 375, y, { width: 90, align: 'center' });
    doc.text('Hora Salida', 475, y, { width: 90, align: 'center' });

    y += 14;
    doc.strokeColor('#888888').lineWidth(1.2).moveTo(30, y).lineTo(582, y).stroke();
    y += 8;

    doc.font('Helvetica');

    if (asistencias.length === 0) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#777777').text('No se registraron asistencias en este día.', 45, y);
    } else {
      asistencias.forEach(item => {
        if (y > 700) {
          doc.addPage();
          drawHeader();
          y = 95;

          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text('Cédula', 45, y);
          doc.text('Empleado', 145, y);
          doc.text('Hora Entrada', 375, y, { width: 90, align: 'center' });
          doc.text('Hora Salida', 475, y, { width: 90, align: 'center' });
          y += 14;
          doc.strokeColor('#888888').lineWidth(1.2).moveTo(30, y).lineTo(582, y).stroke();
          y += 8;
        }

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text(item.Cedula.toString(), 45, y);
        doc.fontSize(8.5).font('Helvetica').fillColor('#333333').text(`${item.Nombre} ${item.Apellido}`, 145, y, { width: 220, height: 14, ellipsis: true });
        doc.fontSize(8.5).text(item.Entrada, 375, y, { width: 90, align: 'center' });
        doc.fontSize(8.5).text(item.Salida, 475, y, { width: 90, align: 'center' });

        y += 20;
        doc.strokeColor('#f0f0f0').lineWidth(0.5).moveTo(30, y).lineTo(582, y).stroke();
        y += 6;
      });
    }
  }

  doc.end();
}
