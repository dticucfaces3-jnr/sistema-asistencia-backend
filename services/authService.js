import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UsuarioSistema, Empleado, Desarrollador, Direccion } from '../models/index.js';
import { sendMail } from '../utils/smtpClient.js';

/**
 * Se asegura de que exista el Desarrollador Root Semilla (dticucfaces3@gmail.com).
 * Si no existe en la base de datos, lo crea con la contraseña 'FACES_RootDev_2026!'.
 * Se crea inicialmente con email_confirmado = false para forzar que pase por el flujo
 * de confirmación de correo al iniciar sesión por primera vez.
 */
async function ensureRootDeveloperExists() {
  const rootEmail = 'dticucfaces3@gmail.com';
  try {
    // 1. Limpiar cualquier registro obsoleto en Usuarios_Sistema para evitar colisión de roles
    await UsuarioSistema.destroy({ where: { username: rootEmail } });

    // 2. Buscar en Desarrolladores
    const rootDev = await Desarrollador.findOne({ where: { email: rootEmail } });
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('FACES_RootDev_2026!', salt);

    if (!rootDev) {
      console.log('🌱 Desarrollador Root Semilla no encontrado. Creándolo...');
      await Desarrollador.create({
        email: rootEmail,
        password_hash,
        email_confirmado: false, // Forzar confirmación por correo en el primer login
        codigo_confirmacion: null
      });
      console.log('✅ Desarrollador Root Semilla creado con éxito.');
    } else {
      // Asegurar contraseña semilla por si se cambió y restaurar consistencia
      rootDev.password_hash = password_hash;
      await rootDev.save();
      console.log('✅ Desarrollador Root Semilla actualizado con la contraseña correcta.');
    }
  } catch (error) {
    console.error('⚠️ Error al asegurar existencia de Desarrollador Root:', error);
  }
}

// Se exportará para ser ejecutado en app.js tras realizar sequelize.sync()
export { ensureRootDeveloperExists };

/**
 * Servicio de Inicio de Sesión (Login)
 * Explica cada parte del código:
 * - Valida que se suministren email y contraseña.
 * - Busca primero en la tabla Desarrolladores. Si se encuentra, valida contraseña.
 * - Si no, busca en la tabla Usuarios_Sistema. Valida contraseña y obtiene su empleado/dirección.
 * - Si las credenciales son correctas:
 *   - Si email_confirmado es falso, genera un código de 6 dígitos, lo guarda,
 *     envía el correo con Nodemailer (Resend) y lanza un error indicando 'EMAIL_NOT_CONFIRMED'.
 *   - Si es verdadero, genera y devuelve el JWT conteniendo los roles y claims pertinentes.
 */
async function login(email, password) {
  if (!email || !password) {
    const error = new Error('Faltan credenciales');
    error.statusCode = 400;
    throw error;
  }

  let user = null;
  let isDev = false;
  let userRole = 'Supervisor';
  let userName = 'Usuario';
  let idDireccion = null;
  let cedulaEmpleado = null;

  // 1. Intentar buscar en Desarrolladores
  const devUser = await Desarrollador.findOne({ where: { email } });
  if (devUser) {
    user = devUser;
    isDev = true;
    userRole = 'Developer';
    userName = 'Desarrollador Tecnológico';
  } else {
    // 2. Si no es desarrollador, buscar en Usuarios_Sistema
    const sysUser = await UsuarioSistema.findOne({
      where: { username: email },
      include: [{
        model: Empleado,
        include: [Direccion]
      }]
    });
    if (sysUser) {
      user = sysUser;
      userRole = sysUser.rol;
      if (sysUser.Empleado) {
        userName = `${sysUser.Empleado.primer_nombre} ${sysUser.Empleado.primer_apellido}`;
        idDireccion = sysUser.Empleado.id_direccion;
        cedulaEmpleado = sysUser.Empleado.cedula;
      } else {
        userName = sysUser.username;
      }
    }
  }

  // Si no se encontró ningún usuario o desarrollador, verificar contraseña semilla antigua como fallback temporal
  if (!user) {
    if (email === 'admin@uc.edu.ve' && password === 'admin123') {
      // Registrar un admin semilla en base de datos si no existe, o permitir acceso
      const error = new Error('Credenciales inválidas. Por favor, registre un usuario válido.');
      error.statusCode = 401;
      throw error;
    }
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }

  // Comparar contraseñas
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }

  // Verificar si el correo está confirmado
  if (!user.email_confirmado) {
    // Generar un código de verificación de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.codigo_confirmacion = code;
    await user.save();

    // Enviar el correo de confirmación de forma asíncrona
    const mailSubject = 'Código de Verificación - Sistema de Asistencia BioMini';
    const mailText = `Hola, tu código de verificación de 6 dígitos para ingresar al Sistema de Asistencia de FaCES es: ${code}`;
    const mailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #000661; border-bottom: 2px solid #000661; padding-bottom: 10px;">Verificación de Correo Electrónico</h2>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Para completar tu inicio de sesión y activar tu cuenta, ingresa el siguiente código de verificación de 6 dígitos:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; border: 1px solid #e5e7eb; color: #000661; letter-spacing: 2px;">
          ${code}
        </div>
        <p style="color: #555; font-size: 13px;">⚠️ Este código expirará tras su uso. No compartas este correo con nadie.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #777;">&copy; ${new Date().getFullYear()} Dirección de Tecnología, Información y Comunicación (DTIC). FaCES - Universidad de Carabobo.</p>
      </div>
    `;

    try {
      await sendMail({ to: email, subject: mailSubject, text: mailText, html: mailHtml });
    } catch (mailError) {
      console.log(`[DESARROLLO] Falló envío SMTP. Código de confirmación para ${email} es: ${code}`);
    }

    const error = new Error('EMAIL_NOT_CONFIRMED');
    error.statusCode = 403;
    throw error;
  }

  // Generar JWT Token
  const token = jwt.sign(
    {
      id_usuario: !isDev ? user.id_usuario : null,
      id_desarrollador: isDev ? user.id_desarrollador : null,
      username: email,
      rol: userRole,
      isDeveloper: isDev,
      id_direccion: idDireccion,
      cedula_empleado: cedulaEmpleado,
      id_empleado: !isDev ? user.id_empleado : null
    },
    process.env.JWT_SECRET || 'super_secret_token_12345',
    { expiresIn: '8h' }
  );

  return { token, userName, userRole, idDireccion, email, cedulaEmpleado, id_empleado: !isDev ? user.id_empleado : null };
}

/**
 * Confirma el correo electrónico usando el código de 6 dígitos.
 */
async function confirmEmail(email, code) {
  if (!email || !code) {
    const error = new Error('Email y código requeridos');
    error.statusCode = 400;
    throw error;
  }

  // Buscar en desarrolladores
  let user = await Desarrollador.findOne({ where: { email } });
  if (!user) {
    // Buscar en usuarios normales
    user = await UsuarioSistema.findOne({ where: { username: email } });
  }

  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (user.codigo_confirmacion !== code) {
    const error = new Error('Código de verificación inválido');
    error.statusCode = 400;
    throw error;
  }

  user.email_confirmado = true;
  user.codigo_confirmacion = null;
  await user.save();

  return { message: 'Email confirmado correctamente. Ya puede iniciar sesión.' };
}

/**
 * Servicio de Recuperación de Contraseña
 * Explica cada parte del código:
 * - Genera una contraseña temporal legible de tipo 'FACES-XXXXXX'.
 * - Actualiza la contraseña hasheada en la BD.
 * - Envía un correo con la contraseña temporal usando nodemailer con Resend.
 * - Si es Desarrollador, busca en Desarrolladores. Si es Administrador/Supervisor, busca en Usuarios_Sistema.
 */
async function recoverPassword(email) {
  if (!email) {
    const error = new Error('Email requerido');
    error.statusCode = 400;
    throw error;
  }

  let user = await Desarrollador.findOne({ where: { email } });
  let isDev = true;

  if (!user) {
    user = await UsuarioSistema.findOne({
      where: { username: email },
      include: [Empleado]
    });
    isDev = false;
  }

  if (!user) {
    // Por seguridad, respondemos genérico
    return { message: 'Si el correo está registrado, se enviará una clave temporal' };
  }

  const tempPassword = `FACES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const salt = await bcrypt.genSalt(10);
  const hashedTemp = await bcrypt.hash(tempPassword, salt);

  user.password_hash = hashedTemp;
  // Al recuperar la contraseña, permitimos que inicien sesión con ella,
  // pero forzamos a que confirmen correo de nuevo para validar identidad si lo deseas.
  // Para comodidad de los usuarios, mantengamos email_confirmado como true si ya estaba confirmado,
  // pero modifiquemos la contraseña.
  await user.save();

  const userName = isDev ? 'Desarrollador' : (user.Empleado ? user.Empleado.primer_nombre : user.username);

  const mailSubject = 'Recuperación de Contraseña - Sistema de Asistencia BioMini';
  const mailText = `Hola ${userName},\n\nHemos recibido una solicitud de recuperación de contraseña.\nTu contraseña temporal de acceso es: ${tempPassword}\n\nPor favor, inicia sesión con esta contraseña y cámbiala de inmediato.\n\nAtentamente,\nDirección de Tecnología (DTIC)\nUniversidad de Carabobo`;
  const mailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #000661; border-bottom: 2px solid #000661; padding-bottom: 10px;">Recuperación de Contraseña</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Hemos recibido una solicitud para restablecer tu contraseña de acceso al Sistema de Asistencia de FaCES.</p>
      <p>Tu contraseña temporal de acceso es la siguiente:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; border: 1px solid #e5e7eb; color: #d32f2f; letter-spacing: 1px;">
        ${tempPassword}
      </div>
      <p style="color: #555; font-size: 13px;">⚠️ Te sugerimos iniciar sesión con esta clave temporal y cambiarla de inmediato desde el panel de administración.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #777;">&copy; ${new Date().getFullYear()} Dirección de Tecnología, Información y Comunicación (DTIC). FaCES - Universidad de Carabobo.</p>
    </div>
  `;

  try {
    await sendMail({ to: email, subject: mailSubject, text: mailText, html: mailHtml });
    return { message: 'Correo de recuperación enviado con éxito' };
  } catch (mailError) {
    console.log(`[DESARROLLO] Falló envío SMTP. Clave temporal para ${email} es: ${tempPassword}`);
    return { message: 'Contraseña temporal generada (verifique la consola del servidor)' };
  }
}

/**
 * Registro de Administradores y Supervisores por parte de Desarrolladores/Admins.
 * Explica cada parte del código:
 * - Valida campos obligatorios.
 * - Si es Administrador, verifica que la dirección del empleado no tenga ya otro Administrador registrado.
 * - Registra el usuario con email_confirmado = false y le genera un código de confirmación.
 * - Envía el código de confirmación al email registrado (username).
 */
async function register(username, password, rol, id_empleado) {
  if (!username || !password || !rol || !id_empleado) {
    const error = new Error('Faltan campos obligatorios para el registro');
    error.statusCode = 400;
    throw error;
  }

  if (rol !== 'Administrador' && rol !== 'Supervisor') {
    const error = new Error('Rol inválido. Debe ser Administrador o Supervisor');
    error.statusCode = 400;
    throw error;
  }

  // Verificar que el empleado exista en la nómina
  const empleado = await Empleado.findByPk(id_empleado, {
    include: [Direccion]
  });
  if (!empleado) {
    const error = new Error(`El empleado con ID ${id_empleado} no existe en el sistema`);
    error.statusCode = 404;
    throw error;
  }

  // Regla: Un único administrador por cada Dirección y límite total de administradores
  if (rol === 'Administrador') {
    // 1. Validar límite total de administradores
    const totalAdmins = await UsuarioSistema.count({ where: { rol: 'Administrador' } });
    const totalDirecciones = await Direccion.count();
    if (totalAdmins >= totalDirecciones) {
      const error = new Error(`Límite total de administradores alcanzado (${totalDirecciones}). No podés registrar más administradores que direcciones en el sistema.`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Validar que no haya ya un administrador asignado a esta dirección
    const existingAdmin = await UsuarioSistema.findOne({
      where: { rol: 'Administrador' },
      include: [{
        model: Empleado,
        where: { id_direccion: empleado.id_direccion }
      }]
    });
    if (existingAdmin) {
      const nomDireccion = empleado.Direccione ? empleado.Direccione.nombre_direccion : 'asignada';
      const error = new Error(`La dirección "${nomDireccion}" ya cuenta con un Administrador registrado en el sistema. Sólo se permite uno por dirección.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Verificar que el empleado no tenga una cuenta ya asociada
  const usuarioExistente = await UsuarioSistema.findOne({ where: { id_empleado } });
  if (usuarioExistente) {
    const error = new Error(`El empleado con ID ${id_empleado} ya posee una cuenta registrada`);
    error.statusCode = 409;
    throw error;
  }

  // Verificar que el nombre de usuario (email) no esté tomado
  const usernameDuplicado = await UsuarioSistema.findOne({ where: { username } });
  if (usernameDuplicado) {
    const error = new Error(`El correo/usuario "${username}" ya está registrado`);
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const nuevoUsuario = await UsuarioSistema.create({
    username,
    password_hash,
    rol,
    id_empleado,
    email_confirmado: false,
    codigo_confirmacion: null
  });

  return nuevoUsuario;
}

/**
 * Gestión de Desarrolladores (máximo 5)
 */
async function createDeveloper(email, password) {
  if (!email || !password) {
    const error = new Error('Email y contraseña requeridos');
    error.statusCode = 400;
    throw error;
  }

  // Validar límite de 5 desarrolladores
  const count = await Desarrollador.count();
  if (count >= 5) {
    const error = new Error('Límite de desarrolladores alcanzado (Máximo 5 desarrolladores activos)');
    error.statusCode = 400;
    throw error;
  }

  // Verificar si ya existe
  const existDev = await Desarrollador.findOne({ where: { email } });
  if (existDev) {
    const error = new Error('El desarrollador ya existe');
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const dev = await Desarrollador.create({
    email,
    password_hash,
    email_confirmado: false,
    codigo_confirmacion: null
  });

  return dev;
}

async function deleteDeveloper(id, requesterEmail) {
  if (requesterEmail !== 'dticucfaces3@gmail.com') {
    const error = new Error('Solo el Desarrollador Root del sistema puede eliminar desarrolladores');
    error.statusCode = 403;
    throw error;
  }

  const dev = await Desarrollador.findByPk(id);
  if (!dev) {
    const error = new Error('Desarrollador no encontrado');
    error.statusCode = 404;
    throw error;
  }

  // Impedir eliminar el Root Developer semilla
  if (dev.email === 'dticucfaces3@gmail.com') {
    const error = new Error('No es posible eliminar al Desarrollador Root del sistema');
    error.statusCode = 400;
    throw error;
  }

  await dev.destroy();
  return { message: 'Desarrollador eliminado exitosamente' };
}

async function listDevelopers() {
  return await Desarrollador.findAll({
    attributes: ['id_desarrollador', 'email', 'email_confirmado']
  });
}

async function listAdmins() {
  return await UsuarioSistema.findAll({
    where: { rol: 'Administrador' },
    include: [{
      model: Empleado,
      include: [Direccion]
    }],
    attributes: ['id_usuario', 'username', 'email_confirmado']
  });
}

async function deleteAdmin(id, requesterEmail) {
  if (requesterEmail !== 'dticucfaces3@gmail.com') {
    const error = new Error('Solo el Desarrollador Root del sistema puede eliminar administradores');
    error.statusCode = 403;
    throw error;
  }

  const admin = await UsuarioSistema.findByPk(id);
  if (!admin) {
    const error = new Error('Administrador no encontrado');
    error.statusCode = 404;
    throw error;
  }

  await admin.destroy();
  return { message: 'Administrador eliminado exitosamente' };
}

export {
  login,
  confirmEmail,
  recoverPassword,
  register,
  createDeveloper,
  deleteDeveloper,
  listDevelopers,
  listAdmins,
  deleteAdmin
};
