const vertexAIAgentService = require('./vertexAIDialogflowService');
const ConversationPG = require('../models/ConversationPG');
const ConversationWhatsApp = require('../models/ConversationWhatsApp');
const WhatsAppAgent = require('../models/WhatsAppAgent');

/**
 * Servicio para manejar agentes de WhatsApp en conversaciones de chat
 * Utiliza Vertex AI Agent Builder (Generative AI) para procesar mensajes
 * 
 * MIGRACIÓN: De Dialogflow CX a Agent Builder
 * - Ya no usa intents, flows, ni training
 * - Usa el instructor como system instruction
 * - Mantiene historial de conversación para contexto
 */
class WhatsAppAgentService {
  /**
   * Procesar mensaje entrante con el agente asignado
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} messageContent - Contenido del mensaje
   * @returns {Promise<Object>} - Respuesta del agente
   */
  async processMessageWithAgent(phoneNumber, messageContent) {
    try {
      // 1. Obtener conversación con agente asignado
      const conversation = await ConversationPG.findByPhoneWithAgent(phoneNumber);
      
      if (!conversation || !conversation.agent_id) {
        return {
          success: false,
          error: 'No hay agente asignado a esta conversación',
          shouldRespond: false
        };
      }

      // 2. Obtener información del agente
      const agent = await WhatsAppAgent.findById(conversation.agent_id);
      if (!agent || !agent.isActive) {
        return {
          success: false,
          error: 'Agente no encontrado o inactivo',
          shouldRespond: false
        };
      }

      console.log(`🤖 Procesando mensaje para ${phoneNumber} con agente ${agent.name}`);

      // 3. Obtener historial de conversación de MongoDB para contexto
      const conversationHistory = await this.getConversationHistory(phoneNumber);
      
      // 4. Usar el número de teléfono como sessionId
      const sessionId = phoneNumber.replace(/\+/g, '');
      
      // 5. Obtener el instructor del agente (system instruction)
      const systemInstruction = agent.instructor || 'Eres un asistente virtual amable y útil.';
      
      console.log(`📤 Enviando mensaje a Agent Builder: "${messageContent.substring(0, 50)}..."`);
      console.log(`📋 Instructor: "${systemInstruction.substring(0, 50)}..."`);
      console.log(`📚 Historial: ${conversationHistory.length} mensajes previos`);
      
      // 6. Enviar mensaje al agente generativo
      const response = await vertexAIAgentService.sendMessage(
        agent.agentId,
        sessionId,
        messageContent,
        systemInstruction,
        conversationHistory
      );

      if (!response.success) {
        console.error(`❌ Error en Agent Builder:`, response.error);
        return {
          success: false,
          error: 'Error obteniendo respuesta del agente',
          details: response.error,
          shouldRespond: false
        };
      }

      console.log(`📥 Respuesta recibida: "${response.response.substring(0, 100)}..."`);

      // 7. Actualizar metadata de la sesión
      const currentMetadata = conversation.metadata || {};
      await ConversationPG.update(phoneNumber, {
        metadata: {
          ...currentMetadata,
          agent_session_id: sessionId,
          last_response_at: new Date().toISOString(),
          agent_type: 'generative-ai'
        }
      });

      return {
        success: true,
        response: response.response,
        confidence: 1.0, // Agent Builder no usa confidence
        intent: null, // No hay intents
        shouldRespond: true
      };

    } catch (error) {
      console.error('❌ Error procesando mensaje con agente:', error.message);
      return {
        success: false,
        error: error.message,
        shouldRespond: false
      };
    }
  }

  /**
   * Obtener historial de conversación de MongoDB
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<Array>} - Historial en formato [{role, content}]
   */
  async getConversationHistory(phoneNumber) {
    try {
      const mongoConversation = await ConversationWhatsApp.findByPhoneNumber(phoneNumber);
      
      if (!mongoConversation || !mongoConversation.messages) {
        return [];
      }

      // Convertir mensajes al formato requerido por Gemini
      // Limitar a los últimos 10 mensajes para no exceder el contexto
      const recentMessages = mongoConversation.messages.slice(-10);
      
      return recentMessages.map(msg => ({
        role: msg.direction === 'outgoing' ? 'assistant' : 'user',
        content: msg.content || msg.body || ''
      })).filter(msg => msg.content); // Filtrar mensajes vacíos

    } catch (error) {
      console.error('❌ Error obteniendo historial de conversación:', error.message);
      return [];
    }
  }

  /**
   * Verificar si una conversación tiene agente asignado
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<boolean>}
   */
  async hasAgent(phoneNumber) {
    try {
      const conversation = await ConversationPG.findByPhoneWithAgent(phoneNumber);
      return !!(conversation && conversation.agent_id);
    } catch (error) {
      return false;
    }
  }

  /**
   * Reiniciar sesión de chat con el agente
   * Útil para comenzar una nueva conversación desde cero
   * @param {string} phoneNumber - Número de teléfono
   */
  async resetAgentSession(phoneNumber) {
    try {
      const conversation = await ConversationPG.findByPhoneWithAgent(phoneNumber);
      
      if (conversation && conversation.agent_id) {
        const agent = await WhatsAppAgent.findById(conversation.agent_id);
        if (agent) {
          const sessionId = phoneNumber.replace(/\+/g, '');
          vertexAIAgentService.clearSession(agent.agentId, sessionId);
          console.log(`🔄 Sesión reiniciada para ${phoneNumber}`);
        }
      }
    } catch (error) {
      console.error('❌ Error reiniciando sesión:', error.message);
    }
  }
}

module.exports = new WhatsAppAgentService();
