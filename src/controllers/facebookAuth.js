/**
 * Controlador para manejar autenticación con Facebook/Meta
 */

const metaApiService = require('../services/metaApiService');
const FacebookPageToken = require('../models/FacebookPageToken');

/**
 * Iniciar flujo OAuth - Generar URL de autorización
 * GET /api/auth/facebook/start
 */
const startAuth = async (req, res) => {
  try {
    // Verificar que el usuario esté autenticado
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Generar URL de autorización
    const redirectUrl = metaApiService.generateAuthUrl();
    
    console.log('✅ URL de autorización generada para usuario:', userId);
    
    return res.status(200).json({
      success: true,
      redirectUrl: redirectUrl,
      message: 'Redirige al usuario a esta URL para autorizar'
    });
  } catch (error) {
    console.error('❌ Error en startAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar URL de autorización',
      error: error.message
    });
  }
};

/**
 * Manejar callback de Facebook OAuth
 * GET /api/auth/facebook/callback?code=xxx
 */
const handleCallback = async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    
    // Manejar errores de autorización
    if (error) {
      console.error('❌ Error en autorización de Facebook:', error_description);
      
      // Redirigir al frontend con error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error_description || error)}`);
    }
    
    // Validar que tengamos el code
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorización no recibido'
      });
    }
    
    console.log('🔄 Procesando callback de Facebook...');
    
    // Ejecutar flujo OAuth completo
    const oauthData = await metaApiService.completeOAuthFlow(code);
    
    // Preparar datos para enviar al frontend
    const responseData = {
      user: oauthData.user,
      pages: oauthData.pages.map(page => ({
        page_id: page.page_id,
        page_name: page.page_name,
        page_category: page.page_category,
        tasks: page.tasks
      })),
      // Tokens sensibles para almacenar temporalmente en sesión o enviar de forma segura
      user_access_token: oauthData.user_access_token,
      token_expires_at: oauthData.token_expires_at
    };
    
    // Codificar datos para pasar por URL (solo IDs y nombres, no tokens)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const pagesSummary = encodeURIComponent(JSON.stringify(
      oauthData.pages.map(p => ({
        id: p.page_id,
        name: p.page_name,
        category: p.page_category
      }))
    ));
    
    // Generar un token temporal de sesión para validar la siguiente petición
    const sessionToken = Buffer.from(
      `${oauthData.user.facebook_user_id}:${Date.now()}:${code.substring(0, 10)}`
    ).toString('base64');
    
    // Guardar datos temporalmente en memoria o cache (aquí simplificado)
    // En producción, usar Redis o similar
    global.tempOAuthData = global.tempOAuthData || {};
    global.tempOAuthData[sessionToken] = {
      ...oauthData,
      expiresAt: Date.now() + 600000 // 10 minutos
    };
    
    console.log('✅ OAuth completado, redirigiendo al frontend...');
    
    // Redirigir al frontend con los datos
    return res.redirect(
      `${frontendUrl}/auth/facebook/selection?session=${sessionToken}&pages=${pagesSummary}`
    );
    
  } catch (error) {
    console.error('❌ Error en handleCallback:', error);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(
      `${frontendUrl}/auth/error?message=${encodeURIComponent('Error al procesar autorización')}`
    );
  }
};

/**
 * Obtener datos de sesión OAuth temporal
 * GET /api/auth/facebook/session/:sessionToken
 */
const getSessionData = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Recuperar datos de sesión temporal
    const sessionData = global.tempOAuthData?.[sessionToken];
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada o expirada'
      });
    }
    
    // Verificar expiración
    if (Date.now() > sessionData.expiresAt) {
      delete global.tempOAuthData[sessionToken];
      return res.status(410).json({
        success: false,
        message: 'Sesión expirada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        user: sessionData.user,
        pages: sessionData.pages,
        token_expires_at: sessionData.token_expires_at
      }
    });
  } catch (error) {
    console.error('❌ Error en getSessionData:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de sesión',
      error: error.message
    });
  }
};

/**
 * Almacenar Page Access Token seleccionado
 * POST /api/auth/facebook/storePageToken
 * Body: { sessionToken, pageId }
 */
const storePageToken = async (req, res) => {
  try {
    const { sessionToken, pageId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    if (!sessionToken || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'sessionToken y pageId son requeridos'
      });
    }
    
    // Recuperar datos de sesión
    const sessionData = global.tempOAuthData?.[sessionToken];
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada o expirada'
      });
    }
    
    // Verificar expiración
    if (Date.now() > sessionData.expiresAt) {
      delete global.tempOAuthData[sessionToken];
      return res.status(410).json({
        success: false,
        message: 'Sesión expirada'
      });
    }
    
    // Buscar la página seleccionada
    const selectedPage = sessionData.pages.find(p => p.page_id === pageId);
    
    if (!selectedPage) {
      return res.status(404).json({
        success: false,
        message: 'Página no encontrada en la sesión'
      });
    }
    
    console.log('💾 Almacenando token de página para usuario:', userId);
    
    // Almacenar en base de datos
    const pageData = {
      page_id: selectedPage.page_id,
      page_name: selectedPage.page_name,
      page_category: selectedPage.page_category,
      page_access_token: selectedPage.page_access_token,
      facebook_user_id: sessionData.user.facebook_user_id,
      user_access_token: sessionData.user_access_token,
      token_expires_at: sessionData.token_expires_at,
      scopes: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_manage_metadata',
        'pages_messaging'
      ]
    };
    
    const savedToken = await FacebookPageToken.upsert(userId, pageData);
    
    // Limpiar sesión temporal
    delete global.tempOAuthData[sessionToken];
    
    console.log('✅ Token de página almacenado exitosamente');
    
    return res.status(200).json({
      success: true,
      message: 'Token de página almacenado exitosamente',
      data: {
        id: savedToken.id,
        page_id: savedToken.page_id,
        page_name: savedToken.page_name,
        page_category: savedToken.page_category,
        created_at: savedToken.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error en storePageToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al almacenar token de página',
      error: error.message
    });
  }
};

/**
 * Listar todas las páginas conectadas del usuario
 * GET /api/auth/facebook/pages
 */
const listConnectedPages = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const pages = await FacebookPageToken.findByUserId(userId, true);
    
    return res.status(200).json({
      success: true,
      count: pages.length,
      data: pages.map(page => ({
        id: page.id,
        page_id: page.page_id,
        page_name: page.page_name,
        page_category: page.page_category,
        is_active: page.is_active,
        last_sync: page.last_sync,
        created_at: page.created_at
      }))
    });
  } catch (error) {
    console.error('❌ Error en listConnectedPages:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar páginas conectadas',
      error: error.message
    });
  }
};

/**
 * Desconectar (desactivar) una página
 * DELETE /api/auth/facebook/pages/:id
 */
const disconnectPage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Verificar que la página pertenece al usuario
    const page = await FacebookPageToken.findByIdAndUserId(id, userId);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Página no encontrada o no pertenece al usuario'
      });
    }
    
    // Desactivar (no eliminar para mantener historial)
    await FacebookPageToken.deactivate(id, userId);
    
    console.log('✅ Página desconectada:', page.page_name);
    
    return res.status(200).json({
      success: true,
      message: 'Página desconectada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error en disconnectPage:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al desconectar página',
      error: error.message
    });
  }
};

/**
 * Validar token de una página
 * GET /api/auth/facebook/pages/:id/validate
 */
const validatePageToken = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Obtener página
    const page = await FacebookPageToken.findByIdAndUserId(id, userId);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Página no encontrada o no pertenece al usuario'
      });
    }
    
    // Validar token con Meta API
    const validation = await metaApiService.validateToken(page.page_access_token);
    
    // Actualizar última sincronización si el token es válido
    if (validation.is_valid) {
      await FacebookPageToken.updateLastSync(id, userId);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        page_id: page.page_id,
        page_name: page.page_name,
        is_valid: validation.is_valid,
        expires_at: validation.expires_at,
        scopes: validation.scopes
      }
    });
  } catch (error) {
    console.error('❌ Error en validatePageToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar token',
      error: error.message
    });
  }
};

module.exports = {
  startAuth,
  handleCallback,
  getSessionData,
  storePageToken,
  listConnectedPages,
  disconnectPage,
  validatePageToken
};

