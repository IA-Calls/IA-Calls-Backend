const whatsappEventService = require('../services/whatsappEventService');

class WhatsAppSSEController {
  /**
   * SSE endpoint para recibir actualizaciones en tiempo real
   * GET /api/whatsapp/events
   */
  async streamEvents(req, res) {
    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Deshabilitar buffering en nginx

    // Enviar mensaje inicial de conexión
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Conectado al stream de eventos' })}\n\n`);

    // Función para enviar eventos al cliente
    const sendEvent = (event) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        console.error('Error enviando evento SSE:', error.message);
      }
    };

    // Escuchar eventos
    const onNewMessage = (data) => {
      sendEvent({
        type: 'new_message',
        ...data
      });
    };

    const onConversationUpdate = (data) => {
      sendEvent({
        type: 'conversation_update',
        ...data
      });
    };

    const onNewConversation = (data) => {
      sendEvent({
        type: 'new_conversation',
        ...data
      });
    };

    // Registrar listeners
    whatsappEventService.on('new_message', onNewMessage);
    whatsappEventService.on('conversation_update', onConversationUpdate);
    whatsappEventService.on('new_conversation', onNewConversation);

    // Limpiar cuando el cliente se desconecta
    req.on('close', () => {
      console.log('🔌 Cliente SSE desconectado');
      whatsappEventService.removeListener('new_message', onNewMessage);
      whatsappEventService.removeListener('conversation_update', onConversationUpdate);
      whatsappEventService.removeListener('new_conversation', onNewConversation);
      res.end();
    });

    // Enviar heartbeat cada 30 segundos para mantener la conexión viva
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}

module.exports = WhatsAppSSEController;

