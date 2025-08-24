const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResponse, sendError, isValidEmail, validateRequired } = require('../utils/helpers');
const { query } = require('../config/database');
const { elevenlabsService } = require('../agents');

// Generar token JWT
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'ia-calls-backend'
  });
};

// Registrar nuevo usuario
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validar campos requeridos
    const validation = validateRequired(req.body, ['username', 'email', 'password']);
    if (!validation.isValid) {
      return sendError(res, 400, 'Campos requeridos faltantes', {
        missing: validation.missing
      });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Formato de email inválido');
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return sendError(res, 400, 'La contraseña debe tener al menos 6 caracteres');
    }

    // Validar longitud de username
    if (username.length < 3) {
      return sendError(res, 400, 'El username debe tener al menos 3 caracteres');
    }

    // Crear agente conversacional en ElevenLabs
    let agentId = null;
    let agentCreationResult = null;
    
    try {
      console.log(`🤖 Creando agente conversacional para usuario: ${username}`);
      
      agentCreationResult = await elevenlabsService.createAgent({
        name: `Agente ${firstName || username}`,
        tags: ["ia-calls", "usuario", username],
        conversation_config: {
          agent: {
            prompt: {
              prompt: `Eres el asistente personal de ${firstName || username} en IA-Calls. Responde preguntas sobre el software IA-Calls y ayuda con tareas relacionadas. Mantén un tono profesional y amigable.`
            }
          }
        }
      });
      
      if (agentCreationResult.success) {
        agentId = agentCreationResult.agent_id;
        console.log(`✅ Agente creado exitosamente con ID: ${agentId}`);
      } else {
        console.warn(`⚠️ No se pudo crear el agente: ${agentCreationResult.error}`);
      }
    } catch (error) {
      console.error('❌ Error creando agente conversacional:', error);
      // Continuar con la creación del usuario aunque falle el agente
    }

    // Crear nuevo usuario
    const newUser = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      agentId
    });

    // Generar token
    const token = generateToken(newUser);

    // Registrar actividad
    await logActivity(newUser.id, 'register', 'Usuario registrado exitosamente', req);

    // Preparar respuesta
    const responseData = {
      user: newUser.toJSON(),
      token
    };

    // Agregar información del agente si se creó exitosamente
    if (agentCreationResult) {
      responseData.agent = {
        created: agentCreationResult.success,
        agent_id: agentId,
        message: agentCreationResult.message
      };
    }

    // Responder con usuario y token (sin contraseña)
    sendResponse(res, 201, responseData, 'Usuario registrado exitosamente');

  } catch (error) {
    console.error('Error en register:', error);
    
    // Manejar errores específicos de base de datos
    if (error.message.includes('Ya existe un usuario')) {
      return sendError(res, 409, error.message);
    }
    
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    const validation = validateRequired(req.body, ['email', 'password']);
    if (!validation.isValid) {
      return sendError(res, 400, 'Email y contraseña son requeridos', {
        missing: validation.missing
      });
    }

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    if (!user) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return sendError(res, 401, 'Cuenta desactivada');
    }

    // Verificar si el usuario ha expirado por tiempo
    if (user.time && user.isExpired()) {
      console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite. Desactivando cuenta...`);
      
      // Cambiar is_active a false
      await user.update({ is_active: false });
      
      return sendError(res, 401, 'Cuenta expirada por tiempo límite');
    }

    // Verificar contraseña
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    // Generar token
    const token = generateToken(user);

    // Registrar actividad
    await logActivity(user.id, 'login', 'Login exitoso', req);

    // Responder con usuario y token (sin contraseña)
    sendResponse(res, 200, {
      user: user.toJSON(),
      token
    }, 'Login exitoso');

  } catch (error) {
    console.error('Error en login:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Verificar token (middleware-like endpoint)
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return sendError(res, 401, 'Token requerido');
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario actualizado
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return sendError(res, 401, 'Usuario no válido');
    }

    // Verificar si el usuario ha expirado por tiempo
    if (user.time && user.isExpired()) {
      console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite durante verificación de token. Desactivando cuenta...`);
      
      // Cambiar is_active a false
      await user.update({ is_active: false });
      
      return sendError(res, 401, 'Cuenta expirada por tiempo límite');
    }

    sendResponse(res, 200, {
      user: user.toJSON(),
      tokenValid: true
    }, 'Token válido');

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Token inválido');
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expirado');
    }
    
    console.error('Error en verifyToken:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    // El usuario viene del middleware de autenticación
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Verificar si el usuario ha expirado por tiempo
    if (user.time && user.isExpired()) {
      console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite durante obtención de perfil. Desactivando cuenta...`);
      
      // Cambiar is_active a false
      await user.update({ is_active: false });
      
      return sendError(res, 401, 'Cuenta expirada por tiempo límite');
    }

    sendResponse(res, 200, user.toJSON(), 'Perfil obtenido exitosamente');

  } catch (error) {
    console.error('Error en getProfile:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    // Buscar usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return sendError(res, 400, 'Formato de email inválido');
      }
      updateData.email = email;
    }

    // Actualizar usuario
    const updatedUser = await user.update(updateData);

    // Registrar actividad
    await logActivity(user.id, 'profile_update', 'Perfil actualizado', req);

    sendResponse(res, 200, updatedUser.toJSON(), 'Perfil actualizado exitosamente');

  } catch (error) {
    console.error('Error en updateProfile:', error);
    
    // Manejar errores específicos
    if (error.message.includes('Ya existe un usuario')) {
      return sendError(res, 409, error.message);
    }
    
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar campos requeridos
    const validation = validateRequired(req.body, ['currentPassword', 'newPassword']);
    if (!validation.isValid) {
      return sendError(res, 400, 'Contraseña actual y nueva son requeridas');
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 6) {
      return sendError(res, 400, 'La nueva contraseña debe tener al menos 6 caracteres');
    }

    // Buscar usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 404, 'Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return sendError(res, 401, 'Contraseña actual incorrecta');
    }

    // Hashear nueva contraseña
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await user.update({ password: hashedPassword });

    // Registrar actividad
    await logActivity(user.id, 'password_change', 'Contraseña cambiada', req);

    sendResponse(res, 200, null, 'Contraseña cambiada exitosamente');

  } catch (error) {
    console.error('Error en changePassword:', error);
    sendError(res, 500, 'Error interno del servidor', error.message);
  }
};

// Función para registrar actividad
const logActivity = async (userId, action, description, req) => {
  try {
    // Verificar si existe la tabla activity_logs
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
            timestamp: new Date().toISOString()
          })
        ]
      );
    } else {
      console.log('⚠️ Tabla activity_logs no existe, saltando log de actividad');
    }
  } catch (error) {
    console.error('Error registrando actividad:', error.message);
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  getProfile,
  updateProfile,
  changePassword
}; 