const ConversationPG = require('../models/ConversationPG');
const ConversationWhatsApp = require('../models/ConversationWhatsApp');
const WhatsAppAgent = require('../models/WhatsAppAgent');
const { query } = require('../config/database');

class WhatsAppConversationsController {
  /**
   * Listar todas las conversaciones (sistema de mensajería)
   * GET /api/whatsapp/conversations/list
   * Query params: limit, offset, search
   */
  async listConversations(req, res) {
    try {
      const { limit = 50, offset = 0, search } = req.query;

      let conversations;
      let total;

      if (search) {
        // Búsqueda con filtro
        conversations = await ConversationPG.search(search, parseInt(limit));
        total = conversations.length;
      } else {
        // Listar todas
        conversations = await ConversationPG.findAllWithClientInfo(
          parseInt(limit),
          parseInt(offset)
        );
        total = await ConversationPG.countAll();
      }

      // Obtener mensajes de MongoDB para cada conversación
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          try {
            // Buscar en MongoDB por phoneNumber
            const mongoConv = await ConversationWhatsApp.findOne({
              phoneNumber: conv.user_phone
            }).sort({ lastMessageAt: -1 });

            return {
              id: conv.id,
              phoneNumber: conv.user_phone,
              clientName: conv.client_name || 'Sin nombre',
              clientEmail: conv.client_email || null,
              lastMessage: conv.last_message || mongoConv?.messages?.[mongoConv.messages.length - 1]?.content || null,
              hasStarted: conv.has_started,
              messageCount: mongoConv?.messages?.length || 0,
              lastMessageAt: mongoConv?.lastMessageAt || conv.updated_at,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at
            };
          } catch (error) {
            console.error(`Error obteniendo mensajes para ${conv.user_phone}:`, error.message);
            return {
              id: conv.id,
              phoneNumber: conv.user_phone,
              clientName: conv.client_name || 'Sin nombre',
              clientEmail: conv.client_email || null,
              lastMessage: conv.last_message,
              hasStarted: conv.has_started,
              messageCount: 0,
              lastMessageAt: conv.updated_at,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at
            };
          }
        })
      );

      // Eliminar duplicados por phoneNumber (tomar el más reciente)
      const uniqueConversations = new Map();
      conversationsWithMessages.forEach(conv => {
        const existing = uniqueConversations.get(conv.phoneNumber);
        if (!existing || new Date(conv.lastMessageAt) > new Date(existing.lastMessageAt)) {
          uniqueConversations.set(conv.phoneNumber, conv);
        }
      });

      // Convertir Map a Array y ordenar por último mensaje
      const finalConversations = Array.from(uniqueConversations.values());
      finalConversations.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt);
        const dateB = new Date(b.lastMessageAt);
        return dateB - dateA;
      });

      res.status(200).json({
        success: true,
        data: finalConversations,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + finalConversations.length) < total
        }
      });

    } catch (error) {
      console.error('❌ Error listando conversaciones:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo conversaciones',
        details: error.message
      });
    }
  }

  /**
   * Obtener una conversación específica con todos sus mensajes
   * GET /api/whatsapp/conversations/:phoneNumber
   */
  async getConversation(req, res) {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'El número de teléfono es requerido'
        });
      }

      // Obtener información de PostgreSQL
      const pgConversation = await ConversationPG.findByPhone(phoneNumber);

      if (!pgConversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversación no encontrada'
        });
      }

      // Obtener información del cliente
      const clientResult = await query(
        'SELECT name, email, phone FROM clients WHERE phone = $1 AND is_active = true LIMIT 1',
        [phoneNumber]
      );
      const client = clientResult.rows[0] || null;

      // Obtener información del agente si está asignado
      let agent = null;
      if (pgConversation.agent_id) {
        agent = await WhatsAppAgent.findById(pgConversation.agent_id);
      }

      // Obtener mensajes de MongoDB
      const mongoConversation = await ConversationWhatsApp.findOne({
        phoneNumber: phoneNumber
      }).sort({ lastMessageAt: -1 });

      const messages = mongoConversation?.messages || [];

      res.status(200).json({
        success: true,
        data: {
          id: pgConversation.id,
          phoneNumber: pgConversation.user_phone,
          clientName: client?.name || 'Sin nombre',
          clientEmail: client?.email || null,
          hasStarted: pgConversation.has_started,
          lastMessage: pgConversation.last_message,
          agent: agent ? {
            id: agent.id,
            name: agent.name,
            agent_id: agent.agentId,
            text_only: agent.textOnly
          } : null,
          messages: messages.map(msg => ({
            id: msg.messageId || msg._id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata || {}
          })),
          messageCount: messages.length,
          createdAt: pgConversation.created_at,
          updatedAt: pgConversation.updated_at,
          lastMessageAt: mongoConversation?.lastMessageAt || pgConversation.updated_at
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo conversación:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo conversación',
        details: error.message
      });
    }
  }

  /**
   * Buscar conversaciones
   * GET /api/whatsapp/conversations/search?q=termino
   */
  async searchConversations(req, res) {
    try {
      const { q, limit = 50 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'El parámetro de búsqueda "q" es requerido'
        });
      }

      const conversations = await ConversationPG.search(q, parseInt(limit));

      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const mongoConv = await ConversationWhatsApp.findOne({
              phoneNumber: conv.user_phone
            }).sort({ lastMessageAt: -1 });

            return {
              id: conv.id,
              phoneNumber: conv.user_phone,
              clientName: conv.client_name || 'Sin nombre',
              clientEmail: conv.client_email || null,
              lastMessage: conv.last_message || mongoConv?.messages?.[mongoConv.messages.length - 1]?.content || null,
              hasStarted: conv.has_started,
              messageCount: mongoConv?.messages?.length || 0,
              lastMessageAt: mongoConv?.lastMessageAt || conv.updated_at,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at
            };
          } catch (error) {
            return {
              id: conv.id,
              phoneNumber: conv.user_phone,
              clientName: conv.client_name || 'Sin nombre',
              clientEmail: conv.client_email || null,
              lastMessage: conv.last_message,
              hasStarted: conv.has_started,
              messageCount: 0,
              lastMessageAt: conv.updated_at,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at
            };
          }
        })
      );

      // Eliminar duplicados por phoneNumber
      const uniqueConversations = new Map();
      conversationsWithMessages.forEach(conv => {
        const existing = uniqueConversations.get(conv.phoneNumber);
        if (!existing || new Date(conv.lastMessageAt) > new Date(existing.lastMessageAt)) {
          uniqueConversations.set(conv.phoneNumber, conv);
        }
      });

      const finalConversations = Array.from(uniqueConversations.values());

      res.status(200).json({
        success: true,
        data: finalConversations,
        total: finalConversations.length
      });

    } catch (error) {
      console.error('❌ Error buscando conversaciones:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error buscando conversaciones',
        details: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de conversaciones
   * GET /api/whatsapp/conversations/stats
   */
  async getStats(req, res) {
    try {
      const total = await ConversationPG.countAll();
      
      const startedResult = await query(
        'SELECT COUNT(*) as count FROM conversations WHERE has_started = true'
      );
      const started = parseInt(startedResult.rows[0].count);

      const notStartedResult = await query(
        'SELECT COUNT(*) as count FROM conversations WHERE has_started = false'
      );
      const notStarted = parseInt(notStartedResult.rows[0].count);

      // Contar mensajes en MongoDB
      let totalMessages = 0;
      try {
        const conversations = await ConversationWhatsApp.find({});
        totalMessages = conversations.reduce((sum, conv) => {
          return sum + (conv.messages?.length || 0);
        }, 0);
      } catch (error) {
        console.error('Error contando mensajes:', error.message);
      }

      res.status(200).json({
        success: true,
        data: {
          totalConversations: total,
          startedConversations: started,
          notStartedConversations: notStarted,
          totalMessages: totalMessages
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas',
        details: error.message
      });
    }
  }

  /**
   * Asignar un agente a una conversación
   * PUT /api/whatsapp/conversations/:phoneNumber/agent
   * 
   * Una vez asignado, el agente responderá automáticamente a todos los mensajes futuros
   * y mantendrá el contexto de la conversación en ElevenLabs
   */
  async assignAgent(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { agent_id } = req.body;

      if (!agent_id) {
        return res.status(400).json({
          success: false,
          error: 'El campo "agent_id" es requerido'
        });
      }

      // Verificar que el agente existe
      const agent = await WhatsAppAgent.findById(agent_id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agente no encontrado'
        });
      }

      if (!agent.isActive) {
        return res.status(400).json({
          success: false,
          error: 'El agente está inactivo'
        });
      }

      // Buscar o crear conversación
      let conversation = await ConversationPG.findByPhone(phoneNumber);
      if (!conversation) {
        // Crear conversación si no existe
        conversation = await ConversationPG.create(phoneNumber, null, false);
      }

      // Asignar agente
      await ConversationPG.update(phoneNumber, {
        agentId: agent_id
      });

      console.log(`✅ Agente "${agent.name}" asignado a conversación ${phoneNumber}`);
      console.log(`   A partir de ahora, el agente responderá automáticamente a todos los mensajes`);

      res.status(200).json({
        success: true,
        message: 'Agente asignado exitosamente. El agente responderá automáticamente a los mensajes futuros.',
        data: {
          phoneNumber,
          agent: {
            id: agent.id,
            name: agent.name,
            agent_id: agent.agentId,
            text_only: agent.textOnly
          },
          note: 'El agente mantendrá el contexto de la conversación y responderá automáticamente a todos los mensajes entrantes'
        }
      });

    } catch (error) {
      console.error('❌ Error asignando agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error asignando agente',
        details: error.message
      });
    }
  }
}

module.exports = WhatsAppConversationsController;

