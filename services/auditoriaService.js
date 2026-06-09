import Auditoria from '../models/auditoria.js';

/**
 * Registra una acción de auditoría en la base de datos.
 * Explica cada parte del código:
 * - tabla: Nombre de la tabla de la BD que se modifica.
 * - registroId: El ID del registro insertado, modificado o eliminado.
 * - accion: INSERT, UPDATE o DELETE.
 * - valoresAnteriores: Los datos del registro antes de ser modificado/eliminado (o null si es inserción).
 * - valoresNuevos: Los datos del registro que se guardan (o null si es eliminación).
 * - req: La petición Express para obtener la identidad de quien realiza el cambio desde req.user (inyectado por el JWT).
 */
export async function registrarAuditoria(tabla, registroId, accion, valoresAnteriores, valoresNuevos, req) {
  try {
    let usuario_id = null;
    let desarrollador_id = null;

    // Si el middleware de auth inyectó la identidad del usuario en req.user
    if (req && req.user) {
      if (req.user.isDeveloper) {
        desarrollador_id = req.user.id_desarrollador;
      } else {
        usuario_id = req.user.id_usuario;
      }
    }

    // Insertar el registro en la tabla Auditorias
    await Auditoria.create({
      tabla_afectada: tabla,
      registro_id: registroId,
      accion: accion,
      valores_anteriores: valoresAnteriores ? JSON.stringify(valoresAnteriores) : null,
      valores_nuevos: valoresNuevos ? JSON.stringify(valoresNuevos) : null,
      usuario_id: usuario_id,
      desarrollador_id: desarrollador_id,
      fecha: new Date()
    });
    console.log(`📝 Auditoría registrada para la tabla ${tabla} (${accion})`);
  } catch (error) {
    console.error('⚠️ Error al registrar auditoría en la base de datos:', error);
  }
}
