import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PlanificacionExcepcion = sequelize.define('Planificacion_Excepciones', {
  id_excepcion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_empleado: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  registrado_por: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

export default PlanificacionExcepcion;
