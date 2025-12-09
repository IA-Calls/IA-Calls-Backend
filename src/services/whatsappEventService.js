const EventEmitter = require('events');

/**
 * Servicio de eventos para WhatsApp
 * Maneja eventos en tiempo real para notificar a clientes conectados
 */
class WhatsAppEventService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Permitir hasta 100 clientes conectados
    console.log('✅ WhatsAppEventService inicializado');
  }

  /**
   * Emitir evento de nuevo mensaje
   * @param {string} phoneNumber - Número de teléfono
   * @param {Object} messageData - Datos del mensaje
   */
  emitNewMessage(phoneNumber, messageData) {
    this.emit('new_message', {
      phoneNumber,
      ...messageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento de conversación actualizada
   * @param {string} phoneNumber - Número de teléfono
   * @param {Object} conversationData - Datos de la conversación
   */
  emitConversationUpdate(phoneNumber, conversationData) {
    this.emit('conversation_update', {
      phoneNumber,
      ...conversationData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento de nueva conversación
   * @param {Object} conversationData - Datos de la nueva conversación
   */
  emitNewConversation(conversationData) {
    this.emit('new_conversation', {
      ...conversationData,
      timestamp: new Date().toISOString()
    });
  }
}

// Singleton
const whatsappEventService = new WhatsAppEventService();

module.exports = whatsappEventService;

