import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Auditoria = sequelize.define('Auditorias', {
  id_auditoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tabla_afectada: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  registro_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  accion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  valores_anteriores: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  valores_nuevos: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  desarrollador_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

export default Auditoria;
