import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Huella = sequelize.define('Huellas', {
  id_huella: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_empleado: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  template_huella: {
    type: DataTypes.BLOB('long'),
    allowNull: false
  }
});

export default Huella;
