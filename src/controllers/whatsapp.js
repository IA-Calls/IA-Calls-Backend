const WhatsAppConversation = require('../models/WhatsAppConversation');
const VonageWhatsAppService = require('../services/vonageWhatsAppService');

class WhatsAppController {
  constructor() {
    this.vonageService = new VonageWhatsAppService();
  }

  // Enviar mensaje WhatsApp con contexto de conversación
  async sendConversationMessage(req, res) {
    try {
      const { phoneNumber, clientName, conversationSummary } = req.body;

      // Validar datos requeridos
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'El número de teléfono es requerido'
        });
      }

      if (!conversationSummary) {
        return res.status(400).json({
          success: false,
          error: 'El resumen de conversación es requerido'
        });
      }

      // Formatear número de teléfono
      let formattedPhoneNumber;
      try {
        formattedPhoneNumber = this.vonageService.formatPhoneNumber(phoneNumber);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Número de teléfono inválido: ${error.message}`
        });
      }

      console.log(`📱 Procesando mensaje WhatsApp para ${formattedPhoneNumber} (${clientName || 'Cliente'})`);

      // Crear registro en la base de datos
      const conversation = await WhatsAppConversation.create({
        phoneNumber: formattedPhoneNumber,
        clientName: clientName || 'Cliente',
        conversationSummary: conversationSummary
      });

      console.log(`💾 Conversación creada con ID: ${conversation.id}`);

      // Enviar mensaje a través de Vonage
      const messageResult = await this.vonageService.sendConversationContext(
        formattedPhoneNumber,
        clientName || 'Cliente',
        conversationSummary
      );

      // Actualizar el registro con el resultado
      if (messageResult.success) {
        await conversation.updateStatus('sent', {
          vonageMessageId: messageResult.messageId,
          messageSent: messageResult.data,
          sentAt: new Date()
        });

        console.log(`✅ Mensaje enviado exitosamente. ID: ${messageResult.messageId}`);

        res.status(200).json({
          success: true,
          message: 'Mensaje enviado exitosamente',
          data: {
            conversationId: conversation.id,
            messageId: messageResult.messageId,
            phoneNumber: formattedPhoneNumber,
            status: 'sent',
            sentAt: new Date()
          }
        });
      } else {
        // Marcar como error
        await conversation.updateStatus('failed', {
          errorMessage: messageResult.error?.message || 'Error desconocido',
          messageSent: messageResult
        });

        console.log(`❌ Error enviando mensaje: ${messageResult.error?.message || 'Error desconocido'}`);

        res.status(500).json({
          success: false,
          error: 'Error enviando mensaje',
          details: messageResult.error,
          conversationId: conversation.id
        });
      }

    } catch (error) {
      console.error('❌ Error en sendConversationMessage:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  // Obtener conversaciones por número de teléfono
  async getConversationsByPhone(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { limit = 10 } = req.query;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'El número de teléfono es requerido'
        });
      }

      const conversations = await WhatsAppConversation.findByPhoneNumber(phoneNumber, parseInt(limit));

      res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo conversaciones:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo conversaciones',
        details: error.message
      });
    }
  }

  // Obtener todas las conversaciones
  async getAllConversations(req, res) {
    try {
      const { limit = 50, offset = 0, status } = req.query;

      const conversations = await WhatsAppConversation.findAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        status: status || null
      });

      const totalCount = await WhatsAppConversation.count(status || null);

      res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + conversations.length) < totalCount
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo todas las conversaciones:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo conversaciones',
        details: error.message
      });
    }
  }

  // Obtener estadísticas de conversaciones
  async getConversationStats(req, res) {
    try {
      const totalConversations = await WhatsAppConversation.count();
      const sentConversations = await WhatsAppConversation.count('sent');
      const failedConversations = await WhatsAppConversation.count('failed');
      const pendingConversations = await WhatsAppConversation.count('pending');

      const stats = {
        total: totalConversations,
        sent: sentConversations,
        failed: failedConversations,
        pending: pendingConversations,
        successRate: totalConversations > 0 ? Math.round((sentConversations / totalConversations) * 100) : 0
      };

      res.status(200).json({
        success: true,
        data: stats
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

  // Verificar estado de la API de Vonage
  async checkApiStatus(req, res) {
    try {
      const status = await this.vonageService.checkApiStatus();

      res.status(status.success ? 200 : 500).json({
        success: status.success,
        data: status
      });

    } catch (error) {
      console.error('❌ Error verificando API:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error verificando API',
        details: error.message
      });
    }
  }

  // Endpoint de estado detallado
  async getDetailedStatus(req, res) {
    try {
      console.log('🔍 Obteniendo estado detallado del servicio WhatsApp...');
      
      // Obtener configuración actual
      const config = {
        apiKey: process.env.VENDOR_API_KEY || '1a44ecfa',
        apiSecret: process.env.VENDOR_API_SECRET || 'OUHU8GfT3LpkwIJF',
        fromNumber: process.env.NUMBER_API || '14157386102',
        baseUrl: 'https://messages-sandbox.nexmo.com/v1/messages',
        environment: process.env.NODE_ENV || 'development'
      };

      // Obtener estadísticas de la base de datos
      const totalConversations = await WhatsAppConversation.count();
      const sentConversations = await WhatsAppConversation.count('sent');
      const failedConversations = await WhatsAppConversation.count('failed');
      const pendingConversations = await WhatsAppConversation.count('pending');

      // Probar conectividad con Vonage
      let vonageStatus = { success: false, error: 'No probado' };
      try {
        vonageStatus = await this.vonageService.checkApiStatus();
      } catch (error) {
        vonageStatus = { success: false, error: error.message };
      }

      // Obtener últimas conversaciones
      const recentConversations = await WhatsAppConversation.findAll({ limit: 5 });

      const detailedStatus = {
        service: 'WhatsApp API Service',
        timestamp: new Date().toISOString(),
        environment: config.environment,
        configuration: {
          apiKey: config.apiKey,
          apiSecret: config.apiSecret ? `${config.apiSecret.substring(0, 4)}****` : 'No configurado',
          fromNumber: config.fromNumber,
          baseUrl: config.baseUrl,
          hasApiKey: !!process.env.VENDOR_API_KEY,
          hasApiSecret: !!process.env.VENDOR_API_SECRET,
          hasFromNumber: !!process.env.NUMBER_API
        },
        vonageApi: {
          status: vonageStatus.success ? 'Disponible' : 'No disponible',
          details: vonageStatus
        },
        database: {
          status: 'Conectado',
          totalConversations,
          sentConversations,
          failedConversations,
          pendingConversations,
          successRate: totalConversations > 0 ? Math.round((sentConversations / totalConversations) * 100) : 0
        },
        recentActivity: recentConversations.map(conv => ({
          id: conv.id,
          phoneNumber: conv.phoneNumber,
          clientName: conv.clientName,
          status: conv.status,
          createdAt: conv.createdAt
        })),
        endpoints: {
          send: 'POST /api/whatsapp/send',
          conversations: 'GET /api/whatsapp/conversations',
          conversationsByPhone: 'GET /api/whatsapp/conversations/:phoneNumber',
          stats: 'GET /api/whatsapp/stats',
          status: 'GET /api/whatsapp/status',
          detailedStatus: 'GET /api/whatsapp/detailed-status',
          health: 'GET /api/whatsapp/health',
          webhook: 'POST /api/whatsapp/webhook'
        },
        samplePayload: {
          phoneNumber: '573138539155',
          clientName: 'Juan Pérez',
          conversationSummary: 'Cliente interesado en servicios de IA...'
        }
      };

      console.log('📊 Estado detallado generado:', JSON.stringify(detailedStatus, null, 2));

      res.status(200).json({
        success: true,
        data: detailedStatus
      });

    } catch (error) {
      console.error('❌ Error obteniendo estado detallado:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estado detallado',
        details: error.message
      });
    }
  }

  // Webhook para recibir actualizaciones de Vonage (opcional)
  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      
      console.log('📨 Webhook recibido de Vonage:', JSON.stringify(webhookData, null, 2));

      // Procesar el webhook según el tipo de evento
      if (webhookData.message_uuid) {
        // Buscar la conversación por message_uuid
        const conversations = await WhatsAppConversation.findAll();
        const conversation = conversations.find(conv => 
          conv.vonageMessageId === webhookData.message_uuid
        );

        if (conversation) {
          // Actualizar estado según el tipo de evento
          let newStatus = 'sent';
          if (webhookData.status === 'delivered') {
            newStatus = 'delivered';
          } else if (webhookData.status === 'read') {
            newStatus = 'read';
          } else if (webhookData.status === 'failed') {
            newStatus = 'failed';
          }

          await conversation.updateStatus(newStatus, {
            messageReceived: webhookData,
            receivedAt: new Date()
          });

          console.log(`✅ Estado actualizado para conversación ${conversation.id}: ${newStatus}`);
        }
      }

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('❌ Error procesando webhook:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error procesando webhook',
        details: error.message
      });
    }
  }
}

module.exports = WhatsAppController;
