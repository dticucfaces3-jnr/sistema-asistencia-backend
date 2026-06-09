import * as reportesService from '../services/reportesService.js';
import { generarExcel, generarPDF } from '../utils/reportUtils.js';

export async function getReporteAsistencia(req, res) {
  try {
    const { tipo = 'excel', rango = 'semanal', fecha, semana, mes } = req.query;

    // Obtener datos del token del usuario inyectados por verifyToken
    const id_direccion = req.user.id_direccion;
    const isDeveloper = req.user.isDeveloper;

    // Si es Developer, permitimos que filtre por una direccion especificada en query params
    const filterDireccion = isDeveloper ? req.query.id_direccion : id_direccion;

    // Obtener los datos del reporte a través del servicio
    const result = await reportesService.getReporteAsistencia({
      rango,
      fecha,
      semana,
      mes,
      id_direccion: filterDireccion,
      isDeveloper
    });

    if (tipo.toLowerCase() === 'excel') {
      const buffer = generarExcel(result);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_asistencia_${rango}.xlsx`);
      return res.send(buffer);
    } else if (tipo.toLowerCase() === 'pdf') {
      return generarPDF(result, res);
    } else {
      return res.status(400).json({ status: 'error', message: 'Tipo de reporte inválido (use pdf o excel)' });
    }
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno al generar el reporte' });
  }
}
