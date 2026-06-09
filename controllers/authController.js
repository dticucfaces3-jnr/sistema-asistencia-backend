import * as authService from '../services/authService.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    return res.json({
      status: 'success',
      token: result.token,
      userName: result.userName,
      userRole: result.userRole,
      idDireccion: result.idDireccion,
      email: result.email,
      cedulaEmpleado: result.cedulaEmpleado
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en login:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function confirmEmail(req, res) {
  try {
    const { email, code } = req.body;
    const result = await authService.confirmEmail(email, code);
    return res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en confirmEmail:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function recoverPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await authService.recoverPassword(email);
    return res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en recover-password:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function register(req, res) {
  try {
    const { username, password, rol, cedula_empleado } = req.body;
    const result = await authService.register(username, password, rol, cedula_empleado);
    return res.status(201).json({
      status: 'success',
      message: 'Usuario registrado con éxito. Código de activación enviado por correo.',
      id_usuario: result.id_usuario
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en register:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor al registrar usuario' });
  }
}

// ==========================================
// CONTROLADORES EXCLUSIVOS DE DESARROLLADOR
// ==========================================

export async function createDeveloper(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.createDeveloper(email, password);
    return res.status(201).json({
      status: 'success',
      message: 'Desarrollador registrado. Código enviado al correo.',
      id_desarrollador: result.id_desarrollador
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en createDeveloper:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function deleteDeveloper(req, res) {
  try {
    const { id } = req.params;
    const result = await authService.deleteDeveloper(id);
    return res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en deleteDeveloper:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function listDevelopers(req, res) {
  try {
    const devs = await authService.listDevelopers();
    return res.json({
      status: 'success',
      data: devs
    });
  } catch (error) {
    console.error('Error en listDevelopers:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function listAdmins(req, res) {
  try {
    const admins = await authService.listAdmins();
    return res.json({
      status: 'success',
      data: admins
    });
  } catch (error) {
    console.error('Error en listAdmins:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}

export async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;
    const result = await authService.deleteAdmin(id);
    return res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error en deleteAdmin:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
}
