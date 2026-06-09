import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Asistencia = sequelize.define('Asistencias', {
  id_asistencia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cedula: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hora_entrada: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_salida: {
    type: DataTypes.TIME,
    allowNull: true
  },
  modificado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  motivo_modificacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
});

export default Asistencia;
