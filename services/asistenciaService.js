import { Asistencia, Empleado } from '../models/index.js';
import { getCurrentDateTime } from '../utils/dateUtils.js';
import { registrarAuditoria } from './auditoriaService.js';

async function marcarAsistencia(trabajador_id, req) {
  if (!trabajador_id) {
    const error = new Error('trabajador_id es requerido');
    error.statusCode = 400;
    throw error;
  }

  const numericId = parseInt(trabajador_id.toString().replace(/\D/g, ''), 10);
  if (isNaN(numericId)) {
    const error = new Error('trabajador_id inválido');
    error.statusCode = 400;
    throw error;
  }

  const empleado = await Empleado.findByPk(numericId);
  if (!empleado) {
    const error = new Error(`El empleado con ID ${numericId} no existe`);
    error.statusCode = 404;
    throw error;
  }

  const { dateStr, timeStr, fullStr } = getCurrentDateTime();

  let asistenciaHoy = await Asistencia.findOne({
    where: {
      id_empleado: numericId,
      fecha: dateStr
    }
  });

  let tipo_marcaje = 'entrada';

  if (!asistenciaHoy) {
    const nuevaAsistencia = await Asistencia.create({
      id_empleado: numericId,
      fecha: dateStr,
      hora_entrada: timeStr,
      hora_salida: null
    });
    tipo_marcaje = 'entrada';
    
    // Registrar auditoría de asistencia
    await registrarAuditoria('Asistencias', nuevaAsistencia.id_asistencia, 'INSERT', null, nuevaAsistencia.toJSON(), req);
  } else {
    const valoresAnteriores = asistenciaHoy.toJSON();
    asistenciaHoy.hora_salida = timeStr;
    await asistenciaHoy.save();
    tipo_marcaje = 'salida';

    // Registrar auditoría de asistencia
    await registrarAuditoria('Asistencias', asistenciaHoy.id_asistencia, 'UPDATE', valoresAnteriores, asistenciaHoy.toJSON(), req);
  }

  return { tipo_marcaje, hora: fullStr };
}

async function sincronizarLote(registros, req) {
  if (!registros || !Array.isArray(registros)) {
    const error = new Error('registros debe ser un array');
    error.statusCode = 400;
    throw error;
  }

  let insertados = 0;
  let actualizados = 0;

  for (const reg of registros) {
    const numericId = parseInt(reg.trabajador_id.toString().replace(/\D/g, ''), 10);
    if (isNaN(numericId)) continue;

    const emp = await Empleado.findByPk(numericId);
    if (!emp) continue;

    const fecha = reg.fecha;
    const hora = reg.hora;

    let asistencia = await Asistencia.findOne({
      where: {
        id_empleado: numericId,
        fecha: fecha
      }
    });

    if (!asistencia) {
      const nuevaAsistencia = await Asistencia.create({
        id_empleado: numericId,
        fecha: fecha,
        hora_entrada: hora,
        hora_salida: null
      });
      insertados++;
      await registrarAuditoria('Asistencias', nuevaAsistencia.id_asistencia, 'INSERT', null, nuevaAsistencia.toJSON(), req);
    } else {
      const valoresAnteriores = asistencia.toJSON();
      asistencia.hora_salida = hora;
      await asistencia.save();
      actualizados++;
      await registrarAuditoria('Asistencias', asistencia.id_asistencia, 'UPDATE', valoresAnteriores, asistencia.toJSON(), req);
    }
  }

  return { insertados, actualizados };
}

async function getAsistencias(req) {
  const queryOptions = {
    include: [{
      model: Empleado,
      attributes: ['primer_nombre', 'primer_apellido', 'cedula', 'id_direccion']
    }],
    order: [['fecha', 'DESC'], ['hora_entrada', 'DESC']]
  };

  // Filtrar las asistencias por dirección según el rol
  if (req && req.user) {
    if (req.user.isDeveloper) {
      const queryDir = req.query.id_direccion;
      if (queryDir) {
        queryOptions.include[0].where = { id_direccion: parseInt(queryDir, 10) };
      } else {
        // Si es desarrollador y no especificó dirección en el filtro, forzamos resultado vacío
        // ya que el panel de desarrollador exige obligatoriamente elegir una dirección
        queryOptions.include[0].where = { id_direccion: 0 };
      }
    } else {
      // Los administradores/supervisores están limitados a su propia dirección
      const idDireccion = req.user.id_direccion;
      if (idDireccion) {
        queryOptions.include[0].where = { id_direccion: idDireccion };
      }
    }
  }

  return await Asistencia.findAll(queryOptions);
}

export {
  marcarAsistencia,
  sincronizarLote,
  getAsistencias
};
