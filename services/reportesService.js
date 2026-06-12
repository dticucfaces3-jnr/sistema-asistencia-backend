import { Asistencia, Empleado, Direccion } from '../models/index.js';
import { Op } from 'sequelize';

// Helper para formatear un objeto Date a YYYY-MM-DD en hora local
function getLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Servicio para generar la data del reporte de asistencia.
 * Explica cada parte del código:
 * - Parsea el rango (diario, semanal, mensual) y los valores de fecha seleccionados.
 * - Calcula el rango exacto de fechas (inicio y fin) a consultar en MySQL en hora local.
 * - Filtra por id_direccion si el usuario es Administrador (obligatorio por seguridad).
 * - Si es Desarrollador, permite filtrar por id_direccion si se le especifica.
 * - Devuelve la data mapeada junto al nombre de la Dirección y una descripción del período.
 */
export async function getReporteAsistencia({ rango, fecha, semana, mes, id_direccion, isDeveloper }) {
  let dateFilter = {};
  let startStr = '';
  let endStr = '';
  let periodoStr = '';

  const today = new Date();
  
  if (rango === 'diario') {
    let targetDateStr = '';
    if (fecha) {
      // Si ya viene la fecha como string YYYY-MM-DD, se usa directamente
      targetDateStr = fecha;
    } else {
      targetDateStr = getLocalDateStr(today);
    }
    
    dateFilter = targetDateStr;
    startStr = targetDateStr;
    endStr = targetDateStr;
    periodoStr = `Día: ${targetDateStr}`;
  } 
  else if (rango === 'semanal') {
    // Para evitar desfases de zona horaria al parsear, adjuntamos T12:00:00
    const baseDate = semana ? new Date(semana + 'T12:00:00') : today;
    
    // Calcular lunes y sábado de la semana laboral
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // Ajuste si es domingo
    
    const monday = new Date(baseDate);
    monday.setDate(diff);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    
    startStr = getLocalDateStr(monday);
    endStr = getLocalDateStr(saturday);
    
    dateFilter = { [Op.between]: [startStr, endStr] };
    periodoStr = `Semana del ${startStr} al ${endStr}`;
  } 
  else if (rango === 'mensual') {
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-indexed

    if (mes) {
      // mes puede venir como YYYY-MM o YYYY-MM-DD
      const parts = mes.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // 0-indexed
    }

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0); // día 0 del mes siguiente es el último del mes actual

    startStr = getLocalDateStr(startOfMonth);
    endStr = getLocalDateStr(endOfMonth);

    dateFilter = { [Op.between]: [startStr, endStr] };
    
    const nombreMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    periodoStr = `Mes: ${nombreMeses[month]} de ${year}`;
  }

  // Filtrado por Dirección
  let filterDireccionId = null;
  if (!isDeveloper) {
    // Los administradores y supervisores están obligados a filtrar por su propia dirección
    filterDireccionId = id_direccion;
  } else if (id_direccion) {
    // Los desarrolladores pueden opcionalmente filtrar por dirección
    filterDireccionId = parseInt(id_direccion, 10);
  }

  // Obtener nombre de la Dirección
  let nombreDireccion = 'Todas las Direcciones';
  if (filterDireccionId) {
    const dir = await Direccion.findByPk(filterDireccionId);
    if (dir) {
      nombreDireccion = dir.nombre_direccion;
    } else {
      nombreDireccion = `Dirección ID: ${filterDireccionId}`;
    }
  }

  // Construir opciones de consulta
  const queryOptions = {
    where: {
      fecha: dateFilter
    },
    include: [{
      model: Empleado,
      required: true, // Asegura INNER JOIN para filtrar asistencias que tengan empleado
      attributes: ['primer_nombre', 'primer_apellido', 'cedula', 'id_direccion']
    }],
    order: [['fecha', 'DESC'], ['hora_entrada', 'DESC']]
  };

  if (filterDireccionId) {
    queryOptions.include[0].where = { id_direccion: filterDireccionId };
  }

  const asistencias = await Asistencia.findAll(queryOptions);

  const dataMapeada = asistencias.map(a => ({
    Cedula: a.Empleado ? a.Empleado.cedula : 'N/A',
    Nombre: a.Empleado ? a.Empleado.primer_nombre : 'N/A',
    Apellido: a.Empleado ? a.Empleado.primer_apellido : 'N/A',
    Fecha: a.fecha,
    Entrada: a.hora_entrada,
    Salida: a.hora_salida || 'Sin registrar'
  }));

  return {
    asistencias: dataMapeada,
    nombreDireccion,
    periodoStr
  };
}
