import jwt from 'jsonwebtoken';

/**
 * Middleware para validar el token JWT y autorizar roles.
 * Explica cada parte del código:
 * - Se extrae el token del encabezado 'Authorization' (Bearer <token>)
 *   o de los query parameters de la URL (?token=<token>) para descargas de archivos.
 * - Se verifica y decodifica el token usando la firma JWT_SECRET.
 * - Inyecta la identidad decodificada en req.user.
 * - Permite definir roles específicos autorizados para la ruta.
 */
export function verifyToken(allowedRoles = []) {
  return (req, res, next) => {
    let token = null;
    
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      // Permitir extraer de query params para descargas de archivos (como streams de reportes PDF/Excel)
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Acceso denegado. Token no suministrado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_token_12345');
      req.user = decoded; // Inyecta la información del token decodificado (ej: id_usuario, isDeveloper, rol, id_direccion)

      // Si se especificaron roles permitidos, validar si el rol coincide
      if (allowedRoles.length > 0) {
        const userRole = decoded.rol;
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ status: 'error', message: 'Acceso prohibido. Permisos insuficientes para esta operación' });
        }
      }

      next();
    } catch (error) {
      return res.status(401).json({ status: 'error', message: 'Token inválido o expirado' });
    }
  };
}
