/**
 * Servicio de Gestión de Conversaciones por WhatsApp
 * Maneja todo el flujo de conversación después de una llamada
 */

const TwilioWhatsAppService = require('./twilioWhatsAppService');
const elevenlabsWebSocketService = require('./elevenlabsWebSocketService');
const { elevenlabsService } = require('../agents');
const { query } = require('../config/database');

class ConversationService {
  constructor() {
    this.whatsappService = new TwilioWhatsAppService();
    this.wsService = elevenlabsWebSocketService;
    // Agente por defecto para nuevas conversaciones
    this.defaultAgentId = process.env.DEFAULT_AGENT_ID || 'agent_4701k8fcsvhaes5s1h6tw894g98s';
    console.log('💬 ConversationService inicializado');
    console.log(`🤖 Agente por defecto: ${this.defaultAgentId}`);
  }

  /**
   * Manejar llamada completada - Enviar mensaje inicial por WhatsApp
   */
  async handleCallCompleted(recipient, batchData) {
    try {
      const phoneNumber = recipient.phone_number;
      const clientName = recipient.name || 
                        recipient.variables?.name || 
                        'Cliente';

      // 1. Formatear número
      let formattedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      // 2. Iniciar conversación WebSocket con ElevenLabs
      const agentId = batchData.agent_id || this.defaultAgentId;
      
      console.log(`🔌 Iniciando WebSocket con agente ${agentId} para ${clientName}...`);
      
      let wsResult;
      let websocketConversationId = null;
      
      try {
        wsResult = await this.wsService.startConversation(
          agentId,
          formattedPhone,
          clientName
        );

        if (wsResult.success) {
          websocketConversationId = wsResult.conversationId;
          console.log(`✅ WebSocket iniciado: ${websocketConversationId}`);
        } else {
          console.warn(`⚠️  WebSocket falló: ${wsResult.error || 'Unknown error'}`);
          console.log(`   📝 Continuando con envío de mensaje básico...`);
        }
      } catch (wsError) {
        console.error(`⚠️  Excepción al iniciar WebSocket:`, wsError.message);
        console.log(`   📝 Continuando con envío de mensaje básico...`);
      }

      // 3. Guardar estado de conversación en BD
      const conversationState = await this.saveConversationState(
        recipient, 
        batchData, 
        websocketConversationId || recipient.conversation_id || null
      );

      // 4. Obtener resumen de la llamada (opcional)
      let conversationSummary = 'Hemos completado una breve conversación contigo.';
      
      if (recipient.conversation_id) {
        try {
          const conversationDetails = await elevenlabsService.getConversationDetails(
            recipient.conversation_id
          );
          
          if (conversationDetails.success && conversationDetails.data) {
            const summary = conversationDetails.data.analysis?.transcript_summary ||
                          conversationDetails.data.metadata?.summary ||
                          conversationDetails.data.summary;
            
            if (summary) {
              conversationSummary = `Hemos completado una conversación sobre: ${summary}`;
            }
          }
        } catch (error) {
          console.log(`  ⚠️ No se pudo obtener resumen de llamada: ${error.message}`);
        }
      }

      // 5. Formatear mensaje inicial
      const message = this.formatInitialMessage(clientName, conversationSummary);

      // 6. Enviar mensaje por WhatsApp
      const result = await this.whatsappService.sendMessage(
        formattedPhone,
        message,
        clientName
      );

      if (result.success) {
        // 7. Guardar mensaje en BD
        await this.saveMessage(conversationState.id, 'outbound', message, result.messageId);
        
        return {
          success: true,
          conversation_id: conversationState.id,
          elevenlabs_conversation_id: websocketConversationId,
          whatsapp_message_id: result.messageId,
          status: 'message_sent',
          websocket_active: websocketConversationId !== null
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      console.error(`❌ Error en handleCallCompleted:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manejar mensaje entrante de WhatsApp (del cliente)
   */
  async handleIncomingWhatsAppMessage(from, body, messageId) {
    try {
      // Limpiar número
      const phoneNumber = from.replace('whatsapp:', '');
      
      console.log(`📩 Mensaje recibido de ${phoneNumber.substring(0, 15)}...`);

      // 1. Buscar conversación activa
      let conversation = await this.getConversationByPhone(phoneNumber);

      // 2. SIEMPRE cerrar y reabrir WebSocket para cada mensaje
      // Esto es necesario porque ElevenLabs solo responde al primer mensaje por WebSocket
      console.log(`🔌 Cerrando WebSocket previo (si existe)...`);
      this.wsService.closeConnection(phoneNumber);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms
      
      console.log(`🔌 Iniciando nueva conversación WebSocket...`);
      
      try {
        const agentId = conversation?.agent_id || this.defaultAgentId;
        
        const wsResult = await this.wsService.startConversation(
          agentId,
          phoneNumber,
          'Cliente'
        );
        
        if (!wsResult.success) {
          console.error(`❌ Error iniciando WebSocket: ${wsResult.error}`);
          
          const fallbackMessage = `Hola! 👋 Disculpa, tengo un problema técnico. Intenta de nuevo en unos momentos.`;
          await this.whatsappService.sendMessage(phoneNumber, fallbackMessage);
          
          return {
            success: false,
            error: 'No se pudo iniciar conversación WebSocket'
          };
        }
        
        // Guardar o actualizar en BD
        if (conversation) {
          await query(
            `UPDATE conversation_state 
             SET elevenlabs_conversation_id = $1,
                 status = 'active',
                 started_at = NOW()
             WHERE id = $2`,
            [wsResult.conversationId, conversation.id]
          );
        } else {
          const result = await query(
            `INSERT INTO conversation_state 
             (phone_number, client_name, elevenlabs_conversation_id, agent_id, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [phoneNumber, 'Cliente', wsResult.conversationId, agentId, 'active']
          );
          conversation = result.rows[0];
        }
        
        console.log(`✅ WebSocket iniciado: ${wsResult.conversationId}`);
        
        // Esperar y consumir el mensaje de bienvenida automático del agente (si existe)
        console.log(`⏳ Esperando mensaje de bienvenida del agente...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
        
        // Limpiar cualquier respuesta pendiente (mensaje de bienvenida)
        const connection = this.wsService.activeConnections.get(phoneNumber);
        if (connection) {
          connection.pendingResponses = [];
          connection.audioChunks = [];
          console.log(`🧹 Buffer de bienvenida limpiado`);
        }
        
      } catch (error) {
        console.error(`❌ Error al iniciar WebSocket:`, error);
        
        const fallbackMessage = `Hola! 👋 Disculpa, tengo un problema técnico. Intenta de nuevo en unos momentos.`;
        await this.whatsappService.sendMessage(phoneNumber, fallbackMessage);
        
        return {
          success: false,
          error: error.message
        };
      }

      // 3. Enviar mensaje REAL del usuario al agente vía WebSocket
      try {
        console.log(`📤 Enviando pregunta del usuario: "${body.substring(0, 50)}..."`);
        const agentResponse = await this.wsService.sendMessage(phoneNumber, body);

        if (!agentResponse.success) {
          console.error(`❌ Agente no respondió: ${agentResponse.error}`);
          
          const fallbackMessage = `Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?`;
          await this.whatsappService.sendMessage(phoneNumber, fallbackMessage);
          
          return {
            success: false,
            error: agentResponse.error
          };
        }

        // Validar que la respuesta no esté vacía
        if (!agentResponse.response || agentResponse.response.trim() === '') {
          console.error(`❌ Respuesta del agente vacía`);
          
          const fallbackMessage = `Disculpa, no pude generar una respuesta. ¿Puedes reformular tu pregunta?`;
          await this.whatsappService.sendMessage(phoneNumber, fallbackMessage);
          
          return {
            success: false,
            error: 'Respuesta vacía del agente'
          };
        }

        console.log(`🤖 Agente respondió: "${agentResponse.response.substring(0, 100)}..."`);

        // 4. Enviar respuesta por WhatsApp
        const sendResult = await this.whatsappService.sendMessage(
          phoneNumber,
          agentResponse.response
        );

        if (sendResult.success) {
          // 5. Guardar mensajes en BD
          await this.saveMessage(conversation.id, 'inbound', body, messageId);
          await this.saveMessage(conversation.id, 'outbound', agentResponse.response, sendResult.messageId);
          
          // 6. Actualizar timestamp de última interacción
          await this.updateLastMessage(conversation.id);
          
          // 7. Cerrar WebSocket después de enviar mensaje
          // Se reabrirá en el próximo mensaje
          console.log(`🔌 Cerrando WebSocket después de respuesta...`);
          this.wsService.closeConnection(phoneNumber);
          
          console.log(`✅ Respuesta enviada → ${phoneNumber.substring(0, 15)}...`);
          
          return {
            success: true,
            response: agentResponse.response,
            whatsapp_message_id: sendResult.messageId
          };
        } else {
          // Cerrar WebSocket incluso si falla el envío
          this.wsService.closeConnection(phoneNumber);
          
          return {
            success: false,
            error: sendResult.error
          };
        }
      } catch (error) {
        console.error(`❌ Error enviando mensaje:`, error);
        
        // Cerrar WebSocket en caso de error
        this.wsService.closeConnection(phoneNumber);
        
        return {
          success: false,
          error: error.message
        };
      }

    } catch (error) {
      console.error(`❌ Error en handleIncomingWhatsAppMessage:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Guardar estado de conversación en BD
   */
  async saveConversationState(recipient, batchData, wsConversationId) {
    try {
      const clientName = recipient.name || recipient.variables?.name || 'Cliente';
      
      const result = await query(
        `INSERT INTO conversation_state 
         (phone_number, client_name, elevenlabs_conversation_id, agent_id, 
          batch_id, recipient_id, call_duration_secs, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (phone_number) 
         DO UPDATE SET 
           elevenlabs_conversation_id = EXCLUDED.elevenlabs_conversation_id,
           agent_id = EXCLUDED.agent_id,
           batch_id = EXCLUDED.batch_id,
           recipient_id = EXCLUDED.recipient_id,
           status = 'active',
           started_at = NOW()
         RETURNING *`,
        [
          recipient.phone_number,
          clientName,
          wsConversationId, // ID de WebSocket, no de la llamada
          batchData.agent_id,
          batchData.id,
          recipient.id,
          null, // call_duration_secs
          'active'
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error guardando conversation_state:', error);
      throw error;
    }
  }

  /**
   * Buscar conversación por número de teléfono
   */
  async getConversationByPhone(phoneNumber) {
    try {
      // Limpiar número
      let cleanPhone = phoneNumber.replace('whatsapp:', '').trim();
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }

      const result = await query(
        `SELECT * FROM conversation_state 
         WHERE phone_number = $1 
         AND status = 'active'
         ORDER BY started_at DESC 
         LIMIT 1`,
        [cleanPhone]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error buscando conversación:', error);
      return null;
    }
  }

  /**
   * Guardar mensaje en BD
   */
  async saveMessage(conversationId, direction, content, messageId = null) {
    try {
      await query(
        `INSERT INTO conversation_messages 
         (conversation_id, direction, content, twilio_message_id, sent_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [conversationId, direction, content, messageId]
      );
    } catch (error) {
      console.error('Error guardando mensaje:', error);
    }
  }

  /**
   * Actualizar timestamp de último mensaje
   */
  async updateLastMessage(conversationId) {
    try {
      await query(
        `UPDATE conversation_state 
         SET last_message_at = NOW(),
             message_count = message_count + 2
         WHERE id = $1`,
        [conversationId]
      );
    } catch (error) {
      console.error('Error actualizando last_message_at:', error);
    }
  }

  /**
   * Formatear mensaje inicial de WhatsApp
   */
  formatInitialMessage(clientName, conversationSummary) {
    let message = `¡Hola ${clientName}! 👋\n\n`;
    message += `${conversationSummary}\n\n`;
    message += `¿En qué más puedo ayudarte? Puedo responder tus preguntas por aquí. 😊`;
    
    return message;
  }

  /**
   * Obtener historial de conversación
   */
  async getConversationHistory(phoneNumber) {
    try {
      const conversation = await this.getConversationByPhone(phoneNumber);
      
      if (!conversation) {
        return null;
      }

      const messages = await query(
        `SELECT * FROM conversation_messages 
         WHERE conversation_id = $1 
         ORDER BY sent_at ASC`,
        [conversation.id]
      );

      return {
        conversation: conversation,
        messages: messages.rows
      };
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return null;
    }
  }
}

module.exports = ConversationService;

