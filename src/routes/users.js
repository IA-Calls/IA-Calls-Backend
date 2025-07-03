const express = require('express');
const router = express.Router();

// Middlewares
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdminOrModerator, canModifyUser } = require('../middleware/authorize');

// Controladores
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/users');

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================
// (Ninguna - todos los endpoints de usuarios requieren autenticación)

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

// ========================================
// RUTAS ESPECÍFICAS (deben ir ANTES que las rutas con parámetros)
// ========================================

// GET /api/users/stats - Obtener estadísticas de usuarios
// Acceso: Solo administradores
router.get('/stats', authenticate, requireAdmin, getUserStats);

// ========================================
// RUTAS GENERALES
// ========================================

// GET /api/users - Obtener todos los usuarios (con paginación y filtros)
// Acceso: Todos los usuarios autenticados
router.get('/', authenticate, getAllUsers);

// POST /api/users - Crear nuevo usuario
// Acceso: Solo administradores
router.post('/', authenticate, requireAdmin, createUser);

// ========================================
// RUTAS CON PARÁMETROS (deben ir DESPUÉS de las rutas específicas)
// ========================================

// GET /api/users/:id/activity - Obtener logs de actividad de un usuario
// Acceso: Solo administradores y el propio usuario
router.get('/:id/activity', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { sendResponse, sendError } = require('../utils/helpers');
    
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return sendError(res, 403, 'No tienes permisos para ver esta información');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Obtener logs de actividad
    const logsResult = await query(
      `SELECT action, description, ip_address, user_agent, metadata, created_at
       FROM "public"."activity_logs" 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    // Contar total
    const countResult = await query(
      'SELECT COUNT(*) FROM "public"."activity_logs" WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNum);

    sendResponse(res, 200, {
      activities: logsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    }, 'Actividades obtenidas exitosamente');

  } catch (error) {
    console.error('Error obteniendo actividades:', error);
    const { sendError } = require('../utils/helpers');
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
});

// PUT /api/users/:id/password - Cambiar contraseña de otro usuario (solo admins)
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const { sendResponse, sendError, validateRequired } = require('../utils/helpers');
    const bcrypt = require('bcryptjs');
    
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    const validation = validateRequired(req.body, ['newPassword']);
    if (!validation.isValid) {
      return sendError(res, 400, 'Nueva contraseña es requerida');
    }

    if (newPassword.length < 6) {
      return sendError(res, 400, 'La contraseña debe tener al menos 6 caracteres');
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await user.update({ password: hashedPassword });

    // Registrar actividad
    const { query } = require('../config/database');
    await query(
      `INSERT INTO "public"."activity_logs" (user_id, action, description, ip_address, user_agent, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'admin_password_reset',
        `Contraseña resetada para usuario ${user.username}`,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
        JSON.stringify({
          targetUserId: userId,
          targetUsername: user.username,
          timestamp: new Date().toISOString()
        })
      ]
    );

    sendResponse(res, 200, null, 'Contraseña actualizada exitosamente');

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    const { sendError } = require('../utils/helpers');
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
});

// POST /api/users/:id/activate - Activar usuario desactivado (solo admins)
router.post('/:id/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const { sendResponse, sendError } = require('../utils/helpers');
    
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    // Buscar usuario (incluyendo inactivos)
    const { query } = require('../config/database');
    const result = await query('SELECT * FROM "public"."users" WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    const userData = result.rows[0];
    const user = new User(userData);

    if (user.isActive) {
      return sendError(res, 400, 'El usuario ya está activo');
    }

    // Activar usuario
    await user.update({ isActive: true });

    sendResponse(res, 200, user.toJSON(), 'Usuario activado exitosamente');

  } catch (error) {
    console.error('Error activando usuario:', error);
    const { sendError } = require('../utils/helpers');
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
});

// ========================================
// RUTAS BÁSICAS CRUD (al final para evitar conflictos)
// ========================================

// GET /api/users/:id - Obtener usuario por ID
// Acceso: 
// - Admins y moderadores: pueden ver cualquier usuario
// - Usuarios normales: pueden ver información limitada de otros y completa de sí mismos
router.get('/:id', authenticate, getUserById);

// PUT /api/users/:id - Actualizar usuario
// Acceso: 
// - Admins: pueden modificar cualquier usuario
// - Moderadores: pueden modificar usuarios normales
// - Usuarios: solo pueden modificar su propio perfil
router.put('/:id', authenticate, canModifyUser, updateUser);

// DELETE /api/users/:id - Eliminar usuario (soft delete)
// Acceso: Solo administradores
router.delete('/:id', authenticate, requireAdmin, deleteUser);

module.exports = router; 