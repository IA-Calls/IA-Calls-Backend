const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook');
const twilioWebhookController = require('../controllers/twilioWebhook');

// Webhook de ElevenLabs para conversaciones completadas
router.post('/elevenlabs/conversation-complete', webhookController.handleConversationComplete);

// Webhooks de Twilio WhatsApp (NUEVO)
// Usar bind para preservar el contexto de 'this'
router.post('/twilio/incoming', twilioWebhookController.receiveMessage.bind(twilioWebhookController));
router.post('/twilio/status', twilioWebhookController.statusCallback.bind(twilioWebhookController));
router.get('/twilio/test', twilioWebhookController.test.bind(twilioWebhookController));

// Endpoint de prueba/ping
router.get('/ping', webhookController.handleWebhookPing);

module.exports = router;

