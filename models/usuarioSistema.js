import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const UsuarioSistema = sequelize.define('Usuarios_Sistema', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rol: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  id_empleado: {
    type: DataTypes.INTEGER,
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

export default UsuarioSistema;
