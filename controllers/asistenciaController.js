import * as asistenciaService from '../services/asistenciaService.js';

export async function marcar(req, res) {
  try {
    const { trabajador_id } = req.body;
    const result = await asistenciaService.marcarAsistencia(trabajador_id, req);
    
    return res.json({
      status: 'success',
      tipo_marcaje: result.tipo_marcaje,
      hora: result.hora
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error al marcar asistencia:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor al marcar asistencia' });
  }
}

export async function sincronizarLote(req, res) {
  try {
    const { registros } = req.body;
    const result = await asistenciaService.sincronizarLote(registros, req);
    
    return res.json({
      status: 'success',
      message: `Sincronización completada. ${result.insertados} entradas registradas, ${result.actualizados} salidas actualizadas.`
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error al sincronizar lote de asistencias:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno en la sincronización por lotes' });
  }
}

export async function getAsistencias(req, res) {
  try {
    const asistencias = await asistenciaService.getAsistencias(req);
    return res.json(asistencias);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
