import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Empleado = sequelize.define('Empleados', {
  id_empleado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  cedula: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  primer_nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  segundo_nombre: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  primer_apellido: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  segundo_apellido: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  id_direccion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_cargo: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_horario: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  motivo_inactividad: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
});

export default Empleado;
