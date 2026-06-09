import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Empleado = sequelize.define('Empleados', {
  cedula: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
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
  }
});

export default Empleado;
