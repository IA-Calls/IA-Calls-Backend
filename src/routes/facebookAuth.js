/**
 * Rutas para autenticación con Facebook/Meta OAuth 2.0
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const facebookAuthController = require('../controllers/facebookAuth');

/**
 * @route   GET /api/auth/facebook/start
 * @desc    Generar URL de autorización OAuth de Facebook
 * @access  Private (requiere autenticación)
 */
router.get('/start', authenticate, facebookAuthController.startAuth);

/**
 * @route   GET /api/auth/facebook/callback
 * @desc    Callback de OAuth - recibe el code de Facebook
 * @access  Public (Facebook redirige aquí)
 */
router.get('/callback', facebookAuthController.handleCallback);

/**
 * @route   GET /api/auth/facebook/session/:sessionToken
 * @desc    Obtener datos de sesión OAuth temporal
 * @access  Private
 */
router.get('/session/:sessionToken', authenticate, facebookAuthController.getSessionData);

/**
 * @route   POST /api/auth/facebook/storePageToken
 * @desc    Almacenar el Page Access Token seleccionado
 * @access  Private
 * @body    { sessionToken, pageId }
 */
router.post('/storePageToken', authenticate, facebookAuthController.storePageToken);

/**
 * @route   GET /api/auth/facebook/pages
 * @desc    Listar todas las páginas conectadas del usuario
 * @access  Private
 */
router.get('/pages', authenticate, facebookAuthController.listConnectedPages);

/**
 * @route   DELETE /api/auth/facebook/pages/:id
 * @desc    Desconectar (desactivar) una página
 * @access  Private
 */
router.delete('/pages/:id', authenticate, facebookAuthController.disconnectPage);

/**
 * @route   GET /api/auth/facebook/pages/:id/validate
 * @desc    Validar token de una página
 * @access  Private
 */
router.get('/pages/:id/validate', authenticate, facebookAuthController.validatePageToken);

module.exports = router;

