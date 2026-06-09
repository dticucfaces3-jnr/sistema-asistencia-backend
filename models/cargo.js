import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Cargo = sequelize.define('Cargos', {
  id_cargo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_cargo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
});

export default Cargo;
