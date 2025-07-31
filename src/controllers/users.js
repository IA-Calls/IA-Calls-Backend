const User = require('../models/User');
const { sendResponse, sendError, isValidEmail, validateRequired } = require('../utils/helpers');
const { query } = require('../config/database');

// Obtener todos los usuarios con paginación y filtros
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      isActive, 
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Validar parámetros
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Máximo 50 por página
    const offset = (pageNum - 1) * limitNum;

    // Construir condiciones WHERE
    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Filtro por estado activo/inactivo (por defecto solo activos)
    if (isActive !== undefined && req.user.role === 'admin') {
      conditions.push(`is_active = $${paramCount}`);
      params.push(isActive === 'true');
      paramCount++;
    } else {
      conditions.push(`is_active = $${paramCount}`);
      params.push(true);
      paramCount++;
    }

    // Filtro por rol
    if (role && ['user', 'admin', 'moderator'].includes(role)) {
      conditions.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    // Búsqueda por texto
    if (search) {
      conditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Validar campos de ordenamiento
    const allowedSortFields = ['created_at', 'updated_at', 'username', 'email', 'role'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Query para obtener usuarios
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Guardar parámetros originales para count query
    const originalParams = [...params];
    
    const usersQuery = `
      SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at
      FROM "public"."users" 
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    // Agregar LIMIT y OFFSET a los parámetros
    params.push(limitNum, offset);

    const usersResult = await query(usersQuery, params);

    // Query para contar total (usar parámetros originales sin LIMIT/OFFSET)
    const countQuery = `SELECT COUNT(*) FROM "public"."users" ${whereClause}`;
    const countResult = await query(countQuery, originalParams);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNum);

    sendResponse(res, 200, {
      users: usersResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: { role, isActive, search, sortBy: sortField, sortOrder: order }
    }, 'Usuarios obtenidos exitosamente');

  } catch (error) {
    console.error('Error en getAllUsers:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Los usuarios normales solo pueden ver su propio perfil completo
    // Otros usuarios ven información limitada
    if (req.user.role === 'user' && req.user.id !== userId) {
      const limitedInfo = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      };
      return sendResponse(res, 200, limitedInfo, 'Información pública del usuario');
    }

    sendResponse(res, 200, user.toJSON(), 'Usuario obtenido exitosamente');

  } catch (error) {
    console.error('Error en getUserById:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Crear nuevo usuario (solo admins)
const createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'user' } = req.body;

    // Validar campos requeridos
    const validation = validateRequired(req.body, ['username', 'email', 'password']);
    if (!validation.isValid) {
      return sendError(res, 400, 'Campos requeridos faltantes', {
        missing: validation.missing
      });
    }

    // Validaciones
    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Formato de email inválido');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'La contraseña debe tener al menos 6 caracteres');
    }

    if (username.length < 3) {
      return sendError(res, 400, 'El username debe tener al menos 3 caracteres');
    }

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return sendError(res, 400, 'Rol inválido');
    }

    // Solo admins pueden crear otros admins
    if (role === 'admin' && req.user.role !== 'admin') {
      return sendError(res, 403, 'Solo los administradores pueden crear otros administradores');
    }

    // Crear usuario
    const newUser = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role
    });

    // Registrar actividad
    await logActivity(req.user.id, 'user_created', `Usuario ${username} creado`, req, { createdUserId: newUser.id });

    sendResponse(res, 201, newUser.toJSON(), 'Usuario creado exitosamente');

  } catch (error) {
    console.error('Error en createUser:', error);
    
    if (error.message.includes('Ya existe un usuario')) {
      return sendError(res, 409, error.message);
    }
    
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, firstName, lastName, role, isActive } = req.body;

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Verificar permisos para cambio de rol
    if (role && role !== user.role) {
      if (req.user.role !== 'admin') {
        return sendError(res, 403, 'Solo los administradores pueden cambiar roles');
      }
      
      if (!['user', 'admin', 'moderator'].includes(role)) {
        return sendError(res, 400, 'Rol inválido');
      }

      // No permitir que se quite el único admin
      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.count(false); // Incluir inactivos
        const activeAdmins = await query('SELECT COUNT(*) FROM "public"."users" WHERE role = $1 AND is_active = true', ['admin']);
        
        if (parseInt(activeAdmins.rows[0].count) <= 1) {
          return sendError(res, 400, 'No se puede cambiar el rol del único administrador activo');
        }
      }
    }

    // Verificar permisos para cambio de estado
    if (isActive !== undefined && req.user.role !== 'admin') {
      return sendError(res, 403, 'Solo los administradores pueden cambiar el estado de usuarios');
    }

    // VALIDAR CAMPOS ÚNICOS SOLO SI SE ESTÁN CAMBIANDO
    if (username !== undefined && username !== user.username) {
      // Verificar si el nuevo username ya existe
      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername && existingUserByUsername.id !== userId) {
        return sendError(res, 409, 'Ya existe un usuario con este username');
      }
    }

    if (email !== undefined && email !== user.email) {
      // Verificar si el nuevo email ya existe
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        return sendError(res, 409, 'Ya existe un usuario con este email');
      }
      
      if (!isValidEmail(email)) {
        return sendError(res, 400, 'Formato de email inválido');
      }
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Actualizar usuario
    const updatedUser = await user.update(updateData);

    // Registrar actividad
    await logActivity(req.user.id, 'user_updated', `Usuario ${user.username} actualizado`, req, { 
      updatedUserId: userId,
      changes: Object.keys(updateData)
    });

    sendResponse(res, 200, updatedUser.toJSON(), 'Usuario actualizado exitosamente');

  } catch (error) {
    console.error('Error en updateUser:', error);
    
    // Manejar errores específicos de duplicación
    if (error.message.includes('Ya existe un usuario') || 
        error.message.includes('duplicate key value violates unique constraint')) {
      if (error.message.includes('users_username_key')) {
        return sendError(res, 409, 'Ya existe un usuario con este username');
      }
      if (error.message.includes('users_email_key')) {
        return sendError(res, 409, 'Ya existe un usuario con este email');
      }
      return sendError(res, 409, 'Ya existe un usuario con estos datos');
    }
    
    // Si es un error de validación del modelo, devolver el mensaje específico
    if (error.message.includes('Error actualizando usuario:')) {
      const specificError = error.message.replace('Error actualizando usuario: ', '');
      return sendError(res, 400, specificError);
    }
    
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Eliminar usuario (soft delete)
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return sendError(res, 400, 'ID de usuario inválido');
    }

    // No permitir auto-eliminación
    if (userId === req.user.id) {
      return sendError(res, 400, 'No puedes eliminar tu propia cuenta');
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // No permitir eliminar el último admin
    if (user.role === 'admin') {
      const activeAdmins = await query('SELECT COUNT(*) FROM "public"."users" WHERE role = $1 AND is_active = true', ['admin']);
      
      if (parseInt(activeAdmins.rows[0].count) <= 1) {
        return sendError(res, 400, 'No se puede eliminar el único administrador activo');
      }
    }

    // Eliminar usuario (soft delete)
    await user.delete();

    // Registrar actividad
    await logActivity(req.user.id, 'user_deleted', `Usuario ${user.username} eliminado`, req, { deletedUserId: userId });

    sendResponse(res, 200, null, 'Usuario eliminado exitosamente');

  } catch (error) {
    console.error('Error en deleteUser:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Obtener estadísticas de usuarios (solo admins)
const getUserStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'moderator' THEN 1 END) as moderators,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_registrations
      FROM "public"."users"
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    // Convertir strings a números
    Object.keys(stats).forEach(key => {
      stats[key] = parseInt(stats[key]);
    });

    sendResponse(res, 200, stats, 'Estadísticas obtenidas exitosamente');

  } catch (error) {
    console.error('Error en getUserStats:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Función para registrar actividad
const logActivity = async (userId, action, description, req, metadata = {}) => {
  try {
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);

    if (tableExists.rows[0].exists) {
      await query(
        `INSERT INTO "public"."activity_logs" (user_id, action, description, ip_address, user_agent, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          userId,
          action,
          description,
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent'),
          JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date().toISOString(),
            ...metadata
          })
        ]
      );
    }
  } catch (error) {
    console.error('Error registrando actividad:', error.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
}; 