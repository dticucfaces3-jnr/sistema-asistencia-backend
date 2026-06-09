import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Horario = sequelize.define('Horarios', {
  id_horario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descripcion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  hora_entrada_esperada: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_salida_esperada: {
    type: DataTypes.TIME,
    allowNull: false
  },
  tolerancia_minutos: {
    type: DataTypes.INTEGER,
    defaultValue: 15
  }
});

export default Horario;
