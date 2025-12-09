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

  // Verificación del webhook de Meta (GET)
  async verifyWebhook(req, res) {
    try {
      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'miTokenUltraSeguro123';
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('🔍 Verificación de webhook recibida:', {
        mode,
        token: token ? '***' : 'no proporcionado',
        challenge: challenge ? '***' : 'no proporcionado'
      });

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verificado correctamente');
        res.status(200).send(challenge);
      } else {
        console.log('❌ Verificación fallida:', {
          modeMatch: mode === 'subscribe',
          tokenMatch: token === verifyToken
        });
        res.sendStatus(403);
      }
    } catch (error) {
      console.error('❌ Error verificando webhook:', error.message);
      res.sendStatus(500);
    }
  }

  // Webhook para recibir actualizaciones de Meta (POST)
  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      
      console.log('📨 Webhook recibido de Meta:', JSON.stringify(webhookData, null, 2));

      // Responder 200 OK inmediatamente a Meta (importante para que no reintente)
      res.status(200).json({ success: true });

      // Procesar asíncronamente después de responder
      setImmediate(async () => {
        try {
          const ConversationWhatsApp = require('../models/ConversationWhatsApp');
          const ConversationPG = require('../models/ConversationPG');
          const whatsappEventService = require('../services/whatsappEventService');

          // Meta envía los datos en entry[0].changes[0].value
          if (webhookData.entry && webhookData.entry[0] && webhookData.entry[0].changes) {
            const changes = webhookData.entry[0].changes;
            
            for (const change of changes) {
              if (change.value) {
                const value = change.value;
                
                // Procesar mensajes entrantes
                if (value.messages && value.messages.length > 0) {
                  for (const message of value.messages) {
                    const phoneNumber = message.from;
                    const messageContent = message.text?.body || message.type;
                    const messageId = message.id;
                    
                    console.log('📱 Mensaje entrante recibido:', {
                      from: phoneNumber,
                      type: message.type,
                      messageId: messageId,
                      content: messageContent
                    });
                    
                    // Buscar o crear conversación en MongoDB
                    let mongoConv = await ConversationWhatsApp.findOne({ phoneNumber });
                    const isNewConversation = !mongoConv;
                    
                    if (!mongoConv) {
                      // Crear nueva conversación en MongoDB
                      mongoConv = new ConversationWhatsApp({
                        phoneNumber: phoneNumber,
                        clientName: 'Cliente',
                        conversationSummary: 'Conversación iniciada',
                        status: 'active'
                      });
                    }
                    
                    // Agregar mensaje recibido
                    await mongoConv.addMessage('received', messageContent, messageId, {
                      type: message.type,
                      timestamp: new Date(message.timestamp * 1000).toISOString()
                    });
                    
                    // Actualizar last_message en PostgreSQL
                    await ConversationPG.update(phoneNumber, {
                      lastMessage: messageContent,
                      hasStarted: true
                    });
                    
                    console.log(`✅ Mensaje guardado para ${phoneNumber}`);
                    
                    // Procesar mensaje con agente si está asignado
                    const whatsappAgentService = require('../services/whatsappAgentService');
                    const agentResponse = await whatsappAgentService.processMessageWithAgent(
                      phoneNumber,
                      messageContent
                    );
                    
                    // Si el agente respondió, enviar la respuesta por WhatsApp
                    if (agentResponse.success && agentResponse.shouldRespond && agentResponse.response) {
                      try {
                        const axios = require('axios');
                        const accessToken = process.env.WHATSAPP_TOKEN;
                        const phoneNumberId = process.env.PHONE_NUMBER_ID;
                        
                        const responsePayload = {
                          messaging_product: 'whatsapp',
                          to: phoneNumber,
                          type: 'text',
                          text: { body: agentResponse.response }
                        };
                        
                        await axios.post(
                          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
                          responsePayload,
                          {
                            headers: {
                              'Authorization': `Bearer ${accessToken}`,
                              'Content-Type': 'application/json'
                            }
                          }
                        );
                        
                        console.log(`✅ Respuesta del agente enviada a ${phoneNumber}`);
                        
                        // Guardar respuesta del agente en MongoDB
                        await mongoConv.addMessage('sent', agentResponse.response, null, {
                          type: 'agent_response',
                          conversation_id: agentResponse.conversationId
                        });
                        
                        // Actualizar last_message
                        await ConversationPG.update(phoneNumber, {
                          lastMessage: agentResponse.response
                        });
                        
                        // Emitir evento SSE para la respuesta del agente
                        whatsappEventService.emitNewMessage(phoneNumber, {
                          messageId: null,
                          content: agentResponse.response,
                          type: 'sent',
                          phoneNumber,
                          isAgentResponse: true
                        });
                        
                      } catch (sendError) {
                        console.error('❌ Error enviando respuesta del agente:', sendError.message);
                      }
                    }
                    
                    // Emitir evento SSE para notificar a clientes conectados
                    whatsappEventService.emitNewMessage(phoneNumber, {
                      messageId,
                      content: messageContent,
                      type: 'received',
                      phoneNumber
                    });
                    
                    // Si es nueva conversación, emitir evento
                    if (isNewConversation) {
                      whatsappEventService.emitNewConversation({
                        phoneNumber,
                        clientName: 'Cliente'
                      });
                    } else {
                      // Emitir actualización de conversación
                      whatsappEventService.emitConversationUpdate(phoneNumber, {
                        lastMessage: messageContent,
                        messageCount: mongoConv.messages.length
                      });
        }
      }
                }
                
                // Procesar actualizaciones de estado
                if (value.statuses && value.statuses.length > 0) {
                  for (const status of value.statuses) {
                    console.log('📊 Estado de mensaje actualizado:', {
                      messageId: status.id,
                      status: status.status,
                      recipient: status.recipient_id
                    });
                    
                    // Emitir evento de actualización de estado
                    whatsappEventService.emitConversationUpdate(status.recipient_id, {
                      messageStatus: status.status,
                      messageId: status.id
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error procesando webhook asíncronamente:', error.message);
        }
      });

    } catch (error) {
      console.error('❌ Error procesando webhook:', error.message);
      // Aún así responder 200 para que Meta no reintente
      res.status(200).json({ success: false, error: error.message });
    }
  }
}

module.exports = WhatsAppController;
