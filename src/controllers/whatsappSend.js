const axios = require('axios');
const Conversation = require('../models/Conversation');
const ConversationPG = require('../models/ConversationPG');
const ConversationWhatsApp = require('../models/ConversationWhatsApp');
const whatsappEventService = require('../services/whatsappEventService');

class WhatsAppSendController {
  async sendMessage(req, res) {
    try {
      const { to, body, templateId, templateParams } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          error: 'El campo "to" (número de teléfono) es requerido'
        });
      }

      const phoneNumber = to.replace(/\D/g, '');
      const accessToken = process.env.WHATSAPP_TOKEN;
      const phoneNumberId = process.env.PHONE_NUMBER_ID;

      if (!accessToken || !phoneNumberId) {
        return res.status(500).json({
          success: false,
          error: 'WHATSAPP_TOKEN y PHONE_NUMBER_ID deben estar configurados en las variables de entorno'
        });
      }

      // Buscar o crear conversación en PostgreSQL
      let conversation = await ConversationPG.findByPhone(phoneNumber);
      if (!conversation) {
        conversation = await ConversationPG.create(phoneNumber, null, false);
        await Conversation.createOrUpdate(phoneNumber, {
          lastMessage: null,
          hasStarted: false
        });
      }

      let payload;
      let response;
      const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;

      // Si viene templateId, enviar template
      if (templateId) {
        // Construir el payload base de template
        const templatePayload = {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: templateId,
            language: { code: 'es' }
          }
        };

        // Si hay templateParams, agregar componentes con parámetros
        if (templateParams && Array.isArray(templateParams) && templateParams.length > 0) {
          templatePayload.template.components = [
            {
              type: 'body',
              parameters: templateParams.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ];
        }

        payload = templatePayload;

        response = await axios.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        // Actualizar en ambas bases de datos
        const lastMessage = `Template enviado: ${templateId}`;
        await ConversationPG.update(phoneNumber, {
          hasStarted: true,
          lastMessage: lastMessage
        });

        await Conversation.createOrUpdate(phoneNumber, {
          hasStarted: true,
          lastMessage: lastMessage
        });

        // Guardar mensaje en MongoDB
        try {
          let mongoConv = await ConversationWhatsApp.findOne({ phoneNumber });
          const isNewConversation = !mongoConv;
          
          if (!mongoConv) {
            mongoConv = new ConversationWhatsApp({
              phoneNumber: phoneNumber,
              clientName: 'Cliente',
              conversationSummary: 'Conversación iniciada con template',
              status: 'active'
            });
          }
          
          const messageId = response.data.messages?.[0]?.id;
          await mongoConv.addMessage('sent', lastMessage, messageId, {
            templateId: templateId,
            templateName: templateId
          });
          
          // Emitir evento SSE
          whatsappEventService.emitNewMessage(phoneNumber, {
            messageId,
            content: lastMessage,
            type: 'sent',
            phoneNumber,
            templateId
          });
          
          if (isNewConversation) {
            whatsappEventService.emitNewConversation({
              phoneNumber,
              clientName: 'Cliente'
            });
          } else {
            whatsappEventService.emitConversationUpdate(phoneNumber, {
              lastMessage: lastMessage,
              messageCount: mongoConv.messages.length
            });
          }
        } catch (mongoError) {
          console.error('Error guardando mensaje en MongoDB:', mongoError.message);
        }

      } else {
        // Si no viene templateId, enviar mensaje normal
        if (!body) {
          return res.status(400).json({
            success: false,
            error: 'El campo "body" es requerido cuando no se envía templateId'
          });
        }

        payload = {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: body }
        };

        response = await axios.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        // Actualizar last_message en ambas bases de datos
        await ConversationPG.update(phoneNumber, {
          lastMessage: body,
          hasStarted: true
        });

        await Conversation.createOrUpdate(phoneNumber, {
          lastMessage: body,
          hasStarted: true
        });

        // Guardar mensaje en MongoDB
        try {
          let mongoConv = await ConversationWhatsApp.findOne({ phoneNumber });
          const isNewConversation = !mongoConv;
          
          if (!mongoConv) {
            mongoConv = new ConversationWhatsApp({
              phoneNumber: phoneNumber,
              clientName: 'Cliente',
              conversationSummary: 'Conversación iniciada',
              status: 'active'
            });
          }
          
          const messageId = response.data.messages?.[0]?.id;
          await mongoConv.addMessage('sent', body, messageId, {
            type: 'text'
          });
          
          // Emitir evento SSE
          whatsappEventService.emitNewMessage(phoneNumber, {
            messageId,
            content: body,
            type: 'sent',
            phoneNumber
          });
          
          if (isNewConversation) {
            whatsappEventService.emitNewConversation({
              phoneNumber,
              clientName: 'Cliente'
            });
          } else {
            whatsappEventService.emitConversationUpdate(phoneNumber, {
              lastMessage: body,
              messageCount: mongoConv.messages.length
            });
          }
        } catch (mongoError) {
          console.error('Error guardando mensaje en MongoDB:', mongoError.message);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: {
          conversationId: conversation.id,
          phoneNumber: phoneNumber,
          hasStarted: conversation.has_started,
          metaResponse: response.data
        }
      });

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error.message);
      
      if (error.response) {
        return res.status(500).json({
          success: false,
          error: 'Error al enviar mensaje a Meta',
          details: error.response.data,
          metaError: error.response.data
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
}

module.exports = WhatsAppSendController;

