import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import trabajadoresRoutes from './routes/trabajadores.js';
import asistenciasRoutes from './routes/asistencias.js';
import reportesRoutes from './routes/reportes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api/auth', authRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/asistencia', asistenciasRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta de estado base
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date() });
});

// Inicialización del servidor y base de datos
async function startServer() {
  try {
    // Probar conexión a la base de datos
    await sequelize.authenticate();
    console.log('🔄 Conexión a MySQL establecida correctamente.');

    // Sincronizar modelos con la base de datos (crea tablas si no existen)
    await sequelize.sync({ force: false });
    console.log('✅ Modelos de Sequelize sincronizados con la Base de Datos.');

    // Asegurar columna motivo_inactividad si no existe en la tabla Empleados
    try {
      await sequelize.query(`
        ALTER TABLE Empleados ADD COLUMN IF NOT EXISTS motivo_inactividad VARCHAR(255) NULL;
      `);
      console.log('✅ Columna motivo_inactividad verificada/agregada.');
    } catch (e) {
      try {
        await sequelize.query(`ALTER TABLE Empleados ADD COLUMN motivo_inactividad VARCHAR(255) NULL;`);
        console.log('✅ Columna motivo_inactividad agregada a la tabla Empleados.');
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists') && !err.message.includes('Duplicate column')) {
          console.error('⚠️ Error al verificar/agregar la columna motivo_inactividad:', err.message);
        }
      }
    }

    // Sembrar base de datos con direcciones, cargos, horarios y empleados semilla obligatorios
    const { seedDatabase } = await import('./services/seedService.js');
    await seedDatabase();

    // Inicializar Desarrollador Root semilla si no existe
    const { ensureRootDeveloperExists } = await import('./services/authService.js');
    await ensureRootDeveloperExists();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos MySQL:', error);
    console.log('⚠️  El servidor no se iniciará hasta que la base de datos esté disponible.');
    process.exit(1);
  }
}

startServer();

