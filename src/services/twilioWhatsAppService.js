const dotenv = require('dotenv');
dotenv.config();

class TwilioWhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC332953b4c00211a282b4c59d45faf749';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || 'cfd6638b2384981c48edfe84835219da';
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    
    // Inicializar cliente de Twilio
    this.client = require('twilio')(this.accountSid, this.authToken);
    
    console.log('✅ TwilioWhatsAppService inicializado');
    console.log(`📱 Número de envío: ${this.fromNumber}`);
  }

  /**
   * Enviar mensaje de WhatsApp usando Twilio
   * @param {string} to - Número de destino (sin prefijo whatsapp:)
   * @param {string} message - Mensaje a enviar
   * @param {string} clientName - Nombre del cliente (para logs)
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendMessage(to, message, clientName = 'Cliente') {
    try {
      // Formatear número de destino con prefijo whatsapp:
      let formattedTo = to;
      
      // Si el número no tiene el prefijo whatsapp:, agregarlo
      if (!formattedTo.startsWith('whatsapp:')) {
        // Asegurarse de que tenga el +
        if (!formattedTo.startsWith('+')) {
          formattedTo = '+' + formattedTo;
        }
        formattedTo = 'whatsapp:' + formattedTo;
      }

      // Enviar mensaje usando Twilio
      const twilioMessage = await this.client.messages.create({
        from: this.fromNumber,
        body: message,
        to: formattedTo
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        data: {
          sid: twilioMessage.sid,
          status: twilioMessage.status,
          to: twilioMessage.to,
          from: twilioMessage.from,
          dateCreated: twilioMessage.dateCreated,
          dateSent: twilioMessage.dateSent,
          direction: twilioMessage.direction,
          numSegments: twilioMessage.numSegments,
          price: twilioMessage.price,
          priceUnit: twilioMessage.priceUnit
        }
      };

    } catch (error) {
      console.error(`❌ Twilio error: ${error.code} - ${error.message}`);
      
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
          moreInfo: error.moreInfo
        },
        statusCode: error.status || 500
      };
    }
  }

  /**
   * Enviar mensaje con template de contenido
   * @param {string} to - Número de destino
   * @param {string} contentSid - ID del template de contenido
   * @param {Object} variables - Variables del template
   * @param {string} clientName - Nombre del cliente
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendTemplateMessage(to, contentSid, variables = {}, clientName = 'Cliente') {
    try {
      console.log(`📱 Enviando template WhatsApp a ${to} (${clientName})`);
      console.log(`📋 Content SID: ${contentSid}`);
      console.log(`📝 Variables:`, variables);
      
      // Formatear número de destino
      let formattedTo = to;
      if (!formattedTo.startsWith('whatsapp:')) {
        if (!formattedTo.startsWith('+')) {
          formattedTo = '+' + formattedTo;
        }
        formattedTo = 'whatsapp:' + formattedTo;
      }

      // Convertir variables a string JSON
      const contentVariables = JSON.stringify(variables);

      const twilioMessage = await this.client.messages.create({
        from: this.fromNumber,
        contentSid: contentSid,
        contentVariables: contentVariables,
        to: formattedTo
      });

      console.log('✅ Template enviado exitosamente');
      console.log(`📨 Message SID: ${twilioMessage.sid}`);

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        data: twilioMessage
      };

    } catch (error) {
      console.error('❌ Error enviando template WhatsApp:', error.message);
      
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status
        },
        statusCode: error.status || 500
      };
    }
  }

  /**
   * Enviar mensaje con contexto de conversación
   * @param {string} to - Número de destino
   * @param {string} clientName - Nombre del cliente
   * @param {string} conversationSummary - Resumen de la conversación
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendConversationContext(to, clientName, conversationSummary) {
    try {
      const message = this.formatConversationMessage(clientName, conversationSummary);
      return await this.sendMessage(to, message, clientName);
    } catch (error) {
      console.error('❌ Error enviando contexto de conversación:', error.message);
      throw error;
    }
  }

  /**
   * Formatear mensaje con contexto de conversación
   * @param {string} clientName - Nombre del cliente
   * @param {string} conversationSummary - Resumen de la conversación
   * @returns {string} - Mensaje formateado
   */
  formatConversationMessage(clientName, conversationSummary) {
    return `Hola ${clientName}! 👋

Basándome en nuestra conversación anterior, aquí tienes un resumen:

${conversationSummary}

¿Hay algo más en lo que pueda ayudarte? Estoy aquí para asistirte. 😊

---
*Mensaje enviado por IA Calls*`;
  }

  /**
   * Verificar estado de un mensaje
   * @param {string} messageSid - SID del mensaje de Twilio
   * @returns {Promise<Object>} - Estado del mensaje
   */
  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        success: true,
        data: {
          sid: message.sid,
          status: message.status,
          to: message.to,
          from: message.from,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          dateUpdated: message.dateUpdated,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado del mensaje:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar número de teléfono
   * @param {string} phoneNumber - Número a validar
   * @returns {Object} - Resultado de la validación
   */
  validatePhoneNumber(phoneNumber) {
    // Remover espacios y caracteres especiales
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Verificar que sea un número válido
    if (!/^\+?\d+$/.test(cleaned)) {
      return { valid: false, error: 'El número debe contener solo dígitos' };
    }

    // Verificar longitud mínima
    if (cleaned.length < 10) {
      return { valid: false, error: 'El número debe tener al menos 10 dígitos' };
    }

    // Verificar longitud máxima
    if (cleaned.length > 15) {
      return { valid: false, error: 'El número no puede tener más de 15 dígitos' };
    }

    return { valid: true, cleaned };
  }

  /**
   * Formatear número de teléfono para WhatsApp
   * @param {string} phoneNumber - Número a formatear
   * @returns {string} - Número formateado con prefijo whatsapp:
   */
  formatPhoneNumber(phoneNumber) {
    const validation = this.validatePhoneNumber(phoneNumber);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let formatted = validation.cleaned;

    // Asegurar que tenga el símbolo +
    if (!formatted.startsWith('+')) {
      // Si no tiene código de país, agregar código por defecto (Colombia +57)
      if (formatted.length === 10 && formatted.startsWith('3')) {
        formatted = '+57' + formatted;
      } else {
        formatted = '+' + formatted;
      }
    }

    // Agregar prefijo whatsapp:
    return 'whatsapp:' + formatted;
  }
}

module.exports = TwilioWhatsAppService;

