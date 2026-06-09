import sequelize from '../config/db.js';
import Direccion from './direccion.js';
import Cargo from './cargo.js';
import Horario from './horario.js';
import Empleado from './empleado.js';
import UsuarioSistema from './usuarioSistema.js';
import Huella from './huella.js';
import Asistencia from './asistencia.js';
import PlanificacionExcepcion from './planificacionExcepcion.js';
import Desarrollador from './desarrollador.js';
import Auditoria from './auditoria.js';

// ==========================================
// RELACIONES (ASOCIACIONES)
// ==========================================

// Empleados -> Departamentos/Direcciones, Cargos, Horarios
Empleado.belongsTo(Direccion, { foreignKey: 'id_direccion' });
Direccion.hasMany(Empleado, { foreignKey: 'id_direccion' });

Empleado.belongsTo(Cargo, { foreignKey: 'id_cargo' });
Cargo.hasMany(Empleado, { foreignKey: 'id_cargo' });

Empleado.belongsTo(Horario, { foreignKey: 'id_horario' });
Horario.hasMany(Empleado, { foreignKey: 'id_horario' });

// Usuarios_Sistema -> Empleados
UsuarioSistema.belongsTo(Empleado, { foreignKey: 'id_empleado' });
Empleado.hasOne(UsuarioSistema, { foreignKey: 'id_empleado' });

// Huellas -> Empleados
Huella.belongsTo(Empleado, { foreignKey: 'id_empleado' });
Empleado.hasMany(Huella, { foreignKey: 'id_empleado' });

// Asistencias -> Empleados
Asistencia.belongsTo(Empleado, { foreignKey: 'id_empleado' });
Empleado.hasMany(Asistencia, { foreignKey: 'id_empleado' });

// Asistencias -> Usuarios_Sistema (Auditoría)
Asistencia.belongsTo(UsuarioSistema, { foreignKey: 'modificado_por' });
UsuarioSistema.hasMany(Asistencia, { foreignKey: 'modificado_por' });

// Planificacion_Excepciones -> Empleados
PlanificacionExcepcion.belongsTo(Empleado, { foreignKey: 'id_empleado' });
Empleado.hasMany(PlanificacionExcepcion, { foreignKey: 'id_empleado' });

// Planificacion_Excepciones -> Usuarios_Sistema (Auditoría)
PlanificacionExcepcion.belongsTo(UsuarioSistema, { foreignKey: 'registrado_por' });
UsuarioSistema.hasMany(PlanificacionExcepcion, { foreignKey: 'registrado_por' });

// Auditoria -> Usuarios_Sistema y Desarrolladores
Auditoria.belongsTo(UsuarioSistema, { foreignKey: 'usuario_id' });
UsuarioSistema.hasMany(Auditoria, { foreignKey: 'usuario_id' });

Auditoria.belongsTo(Desarrollador, { foreignKey: 'desarrollador_id' });
Desarrollador.hasMany(Auditoria, { foreignKey: 'desarrollador_id' });

export {
  sequelize,
  Direccion,
  Cargo,
  Horario,
  Empleado,
  UsuarioSistema,
  Huella,
  Asistencia,
  PlanificacionExcepcion,
  Desarrollador,
  Auditoria
};

