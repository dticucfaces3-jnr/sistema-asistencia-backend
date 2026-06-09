import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'x',
  process.env.DB_USER || 'x',
  process.env.DB_PASS || 'x',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Desactivar logs SQL en consola para mantenerla limpia
    define: {
      timestamps: false, // Las tablas no tienen createdAt y updatedAt según el script SQL
      freezeTableName: true // Evita que Sequelize pluralice automáticamente los nombres de las tablas
    }
  }
);

export default sequelize;
