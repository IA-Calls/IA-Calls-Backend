const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

class VonageWhatsAppService {
  constructor() {
    this.apiKey = process.env.VENDOR_API_KEY || '1a44ecfa';
    this.apiSecret = process.env.VENDOR_API_SECRET || 'OUHU8GfT3LpkwIJF';
    this.fromNumber = process.env.NUMBER_API || '14157386102';
    this.baseUrl = 'https://messages-sandbox.nexmo.com/v1/messages';
  }

  // Enviar mensaje de WhatsApp
  async sendMessage(to, message, clientName = 'Cliente') {
    try {
      console.log(`📱 Enviando mensaje WhatsApp a ${to} (${clientName})`);
      console.log(`🔑 API Key: ${this.apiKey}`);
      console.log(`🔐 API Secret: ${this.apiSecret}`);
      console.log(`📞 From Number: ${this.fromNumber}`);
      console.log(`🌐 Base URL: ${this.baseUrl}`);
      
      const payload = {
        from: this.fromNumber,
        to: to,
        message_type: 'text',
        text: message,
        channel: 'whatsapp'
      };

      console.log('📤 Payload completo de Vonage:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('🔐 Credenciales de autenticación:');
      console.log(`   Username: ${this.apiKey}`);
      console.log(`   Password: ${this.apiSecret}`);

      const requestConfig = {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      };

      console.log('📡 Configuración de la petición:');
      console.log(JSON.stringify(requestConfig, null, 2));

      const response = await axios.post(this.baseUrl, payload, requestConfig);

      console.log('✅ Respuesta exitosa de Vonage:');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Data:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        messageId: response.data.message_uuid,
        status: response.data.status,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error enviando mensaje WhatsApp:');
      console.error('Error completo:', error);
      console.error('Status Code:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Headers:', error.response?.headers);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        fullError: error
      };
    }
  }

  // Enviar mensaje con contexto de conversación
  async sendConversationContext(to, clientName, conversationSummary) {
    try {
      // Formatear el mensaje con el contexto de la conversación
      const message = this.formatConversationMessage(clientName, conversationSummary);
      
      return await this.sendMessage(to, message, clientName);
    } catch (error) {
      console.error('❌ Error enviando contexto de conversación:', error.message);
      throw error;
    }
  }

  // Formatear mensaje con contexto de conversación
  formatConversationMessage(clientName, conversationSummary) {
    return `Hola ${clientName}! 👋

Basándome en nuestra conversación anterior, aquí tienes un resumen:

${conversationSummary}

¿Hay algo más en lo que pueda ayudarte? Estoy aquí para asistirte. 😊

---
*Mensaje enviado por IA Calls*
`;
  }

  // Verificar estado de la API
  async checkApiStatus() {
    try {
      // Intentar hacer una consulta simple para verificar la conectividad
      const response = await axios.get('https://messages-sandbox.nexmo.com/v1/messages', {
        auth: {
          username: this.apiKey,
          password: this.apiSecret
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        status: 'API disponible',
        statusCode: response.status
      };
    } catch (error) {
      console.error('❌ Error verificando API de Vonage:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 500
      };
    }
  }

  // Validar número de teléfono
  validatePhoneNumber(phoneNumber) {
    // Remover espacios y caracteres especiales
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Verificar que sea un número válido
    if (!/^\d+$/.test(cleaned)) {
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

  // Formatear número de teléfono para WhatsApp
  formatPhoneNumber(phoneNumber) {
    const validation = this.validatePhoneNumber(phoneNumber);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let formatted = validation.cleaned;

    // Si no tiene código de país, agregar el código por defecto (Colombia +57)
    if (formatted.length === 10 && formatted.startsWith('3')) {
      formatted = '57' + formatted;
    }

    return formatted;
  }
}

module.exports = VonageWhatsAppService;
