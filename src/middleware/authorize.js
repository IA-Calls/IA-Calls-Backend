const { sendError } = require('../utils/helpers');

// Middleware para verificar roles específicos
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado (viene del middleware auth)
      if (!req.user) {
        return sendError(res, 401, 'Usuario no autenticado');
      }

      // Verificar que el usuario tenga uno de los roles permitidos
      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        return sendError(res, 403, 'No tienes permisos para realizar esta acción', {
          requiredRoles: allowedRoles,
          userRole: userRole
        });
      }

      // Si tiene permisos, continuar
      next();
    } catch (error) {
      console.error('Error en middleware authorize:', error);
      return sendError(res, 500, 'Error interno del servidor');
    }
  };
};

// Middleware específico para admins
const requireAdmin = authorize('admin');

// Middleware específico para admins y moderadores
const requireAdminOrModerator = authorize('admin', 'moderator');

// Middleware para verificar si el usuario puede modificar un recurso
// (admin puede todo, user solo sus propios recursos)
const canModifyUser = (req, res, next) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Los admins pueden modificar cualquier usuario
    if (currentUserRole === 'admin') {
      return next();
    }

    // Los moderadores pueden modificar usuarios normales, pero no otros moderadores/admins
    if (currentUserRole === 'moderator') {
      // Necesitamos verificar el rol del usuario objetivo
      req.canModifyAsRole = 'moderator';
      return next();
    }

    // Los usuarios normales solo pueden modificar su propio perfil
    if (currentUserId === requestedUserId) {
      return next();
    }

    return sendError(res, 403, 'No puedes modificar este usuario', {
      reason: 'insufficient_permissions',
      allowedActions: ['modify_own_profile']
    });

  } catch (error) {
    console.error('Error en middleware canModifyUser:', error);
    return sendError(res, 500, 'Error interno del servidor');
  }
};

module.exports = {
  authorize,
  requireAdmin,
  requireAdminOrModerator,
  canModifyUser
}; 