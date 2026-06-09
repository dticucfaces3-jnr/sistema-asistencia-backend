import express from 'express';
import * as authController from '../controllers/authController.js';
import { verifyToken } from '../utils/authMiddleware.js';

const router = express.Router();

// Rutas Públicas
router.post('/login', authController.login);
router.post('/confirm-email', authController.confirmEmail);
router.post('/recover-password', authController.recoverPassword);

// Registro de usuarios de sistema (Permitido para Developer y Administradores)
router.post('/register', verifyToken(['Developer', 'Administrador']), authController.register);

// Rutas exclusivas para el rol Desarrollador (Developer)
router.post('/dev/create-developer', verifyToken(['Developer']), authController.createDeveloper);
router.delete('/dev/delete-developer/:id', verifyToken(['Developer']), authController.deleteDeveloper);
router.get('/dev/developers', verifyToken(['Developer']), authController.listDevelopers);
router.get('/dev/admins', verifyToken(['Developer']), authController.listAdmins);
router.delete('/dev/delete-admin/:id', verifyToken(['Developer']), authController.deleteAdmin);

export default router;
