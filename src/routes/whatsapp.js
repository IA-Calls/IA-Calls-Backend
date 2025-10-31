const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/whatsapp');

const whatsappController = new WhatsAppController();

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

// POST /api/whatsapp/send - Enviar mensaje WhatsApp con contexto
router.post('/send', validateWhatsAppData, async (req, res) => {
  await whatsappController.sendConversationMessage(req, res);
});

// GET /api/whatsapp/conversations/:phoneNumber - Obtener conversaciones por teléfono
router.get('/conversations/:phoneNumber', async (req, res) => {
  await whatsappController.getConversationsByPhone(req, res);
});

// GET /api/whatsapp/conversations - Obtener todas las conversaciones
router.get('/conversations', async (req, res) => {
  await whatsappController.getAllConversations(req, res);
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

// POST /api/whatsapp/webhook - Webhook para recibir actualizaciones de Vonage
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
      conversations: 'GET /api/whatsapp/conversations',
      conversationsByPhone: 'GET /api/whatsapp/conversations/:phoneNumber',
      stats: 'GET /api/whatsapp/stats',
      status: 'GET /api/whatsapp/status',
      detailedStatus: 'GET /api/whatsapp/detailed-status',
      webhook: 'POST /api/whatsapp/webhook'
    }
  });
});

module.exports = router;
