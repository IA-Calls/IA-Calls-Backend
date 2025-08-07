const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware de autenticación con JWT
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido',
        message: 'Debe proporcionar un token de autenticación'
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token no existe'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Cuenta desactivada',
        message: 'La cuenta del usuario está desactivada'
      });
    }

    // Agregar usuario al request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: 'El token proporcionado no es válido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        message: 'El token ha expirado'
      });
    }

    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      error: 'Error de autenticación',
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          message: 'Debe estar autenticado para acceder a este recurso'
        });
      }

      // Verificar roles (simulado)
      const userRole = req.user.role || 'user';
      
      if (roles.length && !roles.includes(userRole)) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No tiene permisos para acceder a este recurso'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Error de autorización',
        message: error.message
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize
}; 