/**
 * Controller para Webhooks de Twilio WhatsApp
 */

const ConversationService = require('../services/conversationService');

class TwilioWebhookController {
  constructor() {
    this.conversationService = new ConversationService();
  }

  /**
   * Recibir mensaje entrante de WhatsApp
   * Este endpoint es llamado por Twilio cuando un cliente responde por WhatsApp
   */
  async receiveMessage(req, res) {
    try {
      const { From, Body, MessageSid, ProfileName } = req.body;

      console.log(`📱 Webhook Twilio: ${From} → "${Body.substring(0, 50)}..."`);

      // Capturar conversationService antes del setImmediate para preservar el contexto
      const conversationService = this.conversationService;

      // Procesar el mensaje asíncronamente (no bloquear respuesta a Twilio)
      setImmediate(async () => {
        try {
          await conversationService.handleIncomingWhatsAppMessage(
            From,
            Body,
            MessageSid
          );
        } catch (error) {
          console.error('❌ Error procesando mensaje entrante:', error.message);
        }
      });

      // Responder inmediatamente a Twilio con 200 OK
      // (Es importante responder rápido para que Twilio no reintente)
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error en webhook de Twilio:', error);
      res.status(500).send('Error');
    }
  }

  /**
   * Status callback de Twilio
   * Twilio notifica el estado de los mensajes enviados
   */
  async statusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

      console.log(`📊 Status callback de Twilio:`);
      console.log(`   MessageSid: ${MessageSid}`);
      console.log(`   Status: ${MessageStatus}`);
      console.log(`   To: ${To}`);

      if (ErrorCode) {
        console.error(`   ❌ Error: ${ErrorCode} - ${ErrorMessage}`);
      }

      // Aquí podrías actualizar el estado del mensaje en la BD si lo necesitas
      // await query('UPDATE conversation_messages SET status = $1 WHERE twilio_message_id = $2', 
      //             [MessageStatus, MessageSid]);

      res.status(200).send('OK');

    } catch (error) {
      console.error('Error en status callback:', error);
      res.status(500).send('Error');
    }
  }

  /**
   * Endpoint de prueba (opcional)
   */
  async test(req, res) {
    try {
      res.json({
        success: true,
        message: 'Webhook de Twilio funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TwilioWebhookController();

