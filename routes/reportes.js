import express from 'express';
import * as reportesController from '../controllers/reportesController.js';
import { verifyToken } from '../utils/authMiddleware.js';

const router = express.Router();

// Generación de reportes protegida por token (Permitido para Developer, Administrador y Supervisor)
router.get('/asistencia', verifyToken(['Developer', 'Administrador', 'Supervisor']), reportesController.getReporteAsistencia);

export default router;
