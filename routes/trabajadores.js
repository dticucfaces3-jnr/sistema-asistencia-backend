import express from 'express';
import * as trabajadoresController from '../controllers/trabajadoresController.js';
import { verifyToken } from '../utils/authMiddleware.js';

const router = express.Router();

// Sincronización de huellas del lector BioMini (público o local)
router.get('/huellas', trabajadoresController.getHuellas);

// Operaciones de trabajadores protegidas por token
router.post('/', verifyToken(['Developer', 'Administrador']), trabajadoresController.registrarTrabajador);
router.put('/:id_empleado', verifyToken(['Developer', 'Administrador']), trabajadoresController.actualizarTrabajador);
router.post('/:id_empleado/huellas', verifyToken(['Developer', 'Administrador']), trabajadoresController.agregarHuella);
router.delete('/huellas/:id_huella', verifyToken(['Developer', 'Administrador']), trabajadoresController.eliminarHuella);
router.get('/departamentos', verifyToken(['Developer', 'Administrador']), trabajadoresController.getDepartamentos);
router.get('/cargos', verifyToken(['Developer', 'Administrador']), trabajadoresController.getCargos);
router.get('/horarios', verifyToken(['Developer', 'Administrador']), trabajadoresController.getHorarios);
router.get('/', verifyToken(['Developer', 'Administrador', 'Supervisor']), trabajadoresController.getTrabajadores);

export default router;
