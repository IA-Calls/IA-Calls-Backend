const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const WhatsAppController = require('../controllers/whatsapp');
const WhatsAppTemplatesController = require('../controllers/whatsappTemplates');
const WhatsAppSendController = require('../controllers/whatsappSend');
const WhatsAppConversationsController = require('../controllers/whatsappConversations');
const WhatsAppSSEController = require('../controllers/whatsappSSE');
const WhatsAppAgentsController = require('../controllers/whatsappAgents');

const whatsappController = new WhatsAppController();
const whatsappTemplatesController = new WhatsAppTemplatesController();
const whatsappSendController = new WhatsAppSendController();
const whatsappConversationsController = new WhatsAppConversationsController();
const whatsappSSEController = new WhatsAppSSEController();
const whatsappAgentsController = new WhatsAppAgentsController();

// Middleware para validar datos básicos
const validateWhatsAppData = (req, res, next) => {
  const { phoneNumber, conversationSummary } = req.body;

  if (!phoneNumber || !conversationSummary) {
    return res.status(400).json({
      success: false,
      error: 'Datos requeridos: phoneNumber y conversationSummary'
    });
  }

  next();
};

// POST /api/whatsapp/send - Enviar mensaje WhatsApp (template o mensaje normal)
router.post('/send', async (req, res) => {
  await whatsappSendController.sendMessage(req, res);
});

// ============================================
// RUTAS DE CONVERSACIONES (SISTEMA DE MENSAJERÍA)
// ============================================

// GET /api/whatsapp/conversations/list - Listar todas las conversaciones
router.get('/conversations/list', async (req, res) => {
  await whatsappConversationsController.listConversations(req, res);
});

// GET /api/whatsapp/conversations/search - Buscar conversaciones
router.get('/conversations/search', async (req, res) => {
  await whatsappConversationsController.searchConversations(req, res);
});

// GET /api/whatsapp/conversations/stats - Estadísticas de conversaciones
router.get('/conversations/stats', async (req, res) => {
  await whatsappConversationsController.getStats(req, res);
});

// GET /api/whatsapp/conversations/:phoneNumber - Obtener conversación específica con mensajes
router.get('/conversations/:phoneNumber', async (req, res) => {
  await whatsappConversationsController.getConversation(req, res);
});

// PUT /api/whatsapp/conversations/:phoneNumber/agent - Asignar agente a una conversación
router.put('/conversations/:phoneNumber/agent', async (req, res) => {
  await whatsappConversationsController.assignAgent(req, res);
});

// ============================================
// RUTAS DE AGENTES DE WHATSAPP
// Requieren autenticación para multiusuario
// ============================================

// Middleware de autenticación para todas las rutas de agentes
router.use('/agents', authenticate);

// POST /api/whatsapp/agents - Crear un nuevo agente
router.post('/agents', async (req, res) => {
  await whatsappAgentsController.createAgent(req, res);
});

// GET /api/whatsapp/agents - Listar todos los agentes del usuario autenticado
router.get('/agents', async (req, res) => {
  await whatsappAgentsController.listAgents(req, res);
});

// GET /api/whatsapp/agents/:id - Obtener un agente específico (con validación de ownership)
router.get('/agents/:id', async (req, res) => {
  await whatsappAgentsController.getAgent(req, res);
});

// PUT /api/whatsapp/agents/:id - Actualizar un agente (con validación de ownership)
router.put('/agents/:id', async (req, res) => {
  await whatsappAgentsController.updateAgent(req, res);
});

// DELETE /api/whatsapp/agents/:id - Eliminar (desactivar) un agente (con validación de ownership)
router.delete('/agents/:id', async (req, res) => {
  await whatsappAgentsController.deleteAgent(req, res);
});

// GET /api/whatsapp/stats - Obtener estadísticas de conversaciones
router.get('/stats', async (req, res) => {
  await whatsappController.getConversationStats(req, res);
});

// GET /api/whatsapp/status - Verificar estado de la API de Vonage
router.get('/status', async (req, res) => {
  await whatsappController.checkApiStatus(req, res);
});

// GET /api/whatsapp/detailed-status - Estado detallado del servicio
router.get('/detailed-status', async (req, res) => {
  await whatsappController.getDetailedStatus(req, res);
});

// GET /api/whatsapp/events - SSE para recibir actualizaciones en tiempo real
router.get('/events', async (req, res) => {
  await whatsappSSEController.streamEvents(req, res);
});

// GET /api/whatsapp/webhook - Verificación del webhook de Meta
router.get('/webhook', async (req, res) => {
  await whatsappController.verifyWebhook(req, res);
});

// POST /api/whatsapp/webhook - Webhook para recibir actualizaciones de Meta
router.post('/webhook', async (req, res) => {
  await whatsappController.handleWebhook(req, res);
});

// GET /api/whatsapp/health - Health check del servicio
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WhatsApp service is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      send: 'POST /api/whatsapp/send',
      conversationsList: 'GET /api/whatsapp/conversations/list',
      conversationsSearch: 'GET /api/whatsapp/conversations/search',
      conversationDetail: 'GET /api/whatsapp/conversations/:phoneNumber',
      conversationsStats: 'GET /api/whatsapp/conversations/stats',
      events: 'GET /api/whatsapp/events (SSE - Server-Sent Events)',
      stats: 'GET /api/whatsapp/stats',
      status: 'GET /api/whatsapp/status',
      detailedStatus: 'GET /api/whatsapp/detailed-status',
      webhookVerify: 'GET /api/whatsapp/webhook',
      webhook: 'POST /api/whatsapp/webhook',
      createTemplate: 'POST /api/whatsapp/templates',
      getTemplates: 'GET /api/whatsapp/templates',
      getTemplateById: 'GET /api/whatsapp/templates/:templateId',
      deleteTemplate: 'DELETE /api/whatsapp/templates/:templateId'
    }
  });
});

// ============================================
// RUTAS DE TEMPLATES DE WHATSAPP BUSINESS API
// ============================================

// POST /api/whatsapp/templates - Crear una nueva template
router.post('/templates', async (req, res) => {
  await whatsappTemplatesController.createTemplate(req, res);
});

// GET /api/whatsapp/templates - Obtener todas las templates
router.get('/templates', async (req, res) => {
  await whatsappTemplatesController.getTemplates(req, res);
});

// GET /api/whatsapp/templates/:templateId - Obtener una template específica
router.get('/templates/:templateId', async (req, res) => {
  await whatsappTemplatesController.getTemplateById(req, res);
});

// DELETE /api/whatsapp/templates/:templateId - Eliminar una template
router.delete('/templates/:templateId', async (req, res) => {
  await whatsappTemplatesController.deleteTemplate(req, res);
});

module.exports = router;
