import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Direccion = sequelize.define('Direcciones', {
  id_direccion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_direccion: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
});

export default Direccion;
