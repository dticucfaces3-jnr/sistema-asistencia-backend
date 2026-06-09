import express from 'express';
import * as asistenciaController from '../controllers/asistenciaController.js';
import { verifyToken } from '../utils/authMiddleware.js';

const router = express.Router();

// Operaciones del lector BioMini (llamadas operativas del agente local o frontend de registro)
router.post('/marcar', asistenciaController.marcar);
router.post('/sincronizar-lote', asistenciaController.sincronizarLote);

// Consulta de asistencias protegida por token
router.get('/', verifyToken(['Developer', 'Administrador', 'Supervisor']), asistenciaController.getAsistencias);

export default router;
