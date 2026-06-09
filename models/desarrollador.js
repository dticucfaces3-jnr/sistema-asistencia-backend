import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Desarrollador = sequelize.define('Desarrolladores', {
  id_desarrollador: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email_confirmado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  codigo_confirmacion: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  token_recuperacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
});

export default Desarrollador;
