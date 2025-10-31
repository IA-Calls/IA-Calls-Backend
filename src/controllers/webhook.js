const WhatsAppConversation = require('../models/WhatsAppConversation');

const webhookController = {
  // Manejar webhook de ElevenLabs cuando una conversación se completa
  async handleConversationComplete(req, res) {
    try {
      console.log('📨 Webhook recibido de ElevenLabs:');
      console.log(JSON.stringify(req.body, null, 2));

      const { conversation_id, agent_id, phone_number, status, metadata } = req.body;

      if (!conversation_id) {
        console.error('❌ No se proporcionó conversation_id en el webhook');
        return res.status(400).json({
          success: false,
          message: 'conversation_id es requerido'
        });
      }

      // Procesar el webhook
      console.log(`📞 Conversación completada: ${conversation_id}`);
      console.log(`📱 Número: ${phone_number}`);
      console.log(`📊 Estado: ${status}`);

      // Aquí puedes agregar lógica adicional para procesar el webhook
      // Por ejemplo, enviar un mensaje de WhatsApp automáticamente

      res.status(200).json({
        success: true,
        message: 'Webhook procesado exitosamente',
        data: {
          conversation_id,
          status,
          phone_number
        }
      });

    } catch (error) {
      console.error('❌ Error procesando webhook de ElevenLabs:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error procesando webhook',
        details: error.message
      });
    }
  },

  // Endpoint de ping para verificar que el webhook funciona
  async handleWebhookPing(req, res) {
    try {
      console.log('🏓 Ping recibido en webhook');

      res.status(200).json({
        success: true,
        message: 'Webhook endpoint está funcionando',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error en ping:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error en ping',
        details: error.message
      });
    }
  }
};

module.exports = webhookController;

