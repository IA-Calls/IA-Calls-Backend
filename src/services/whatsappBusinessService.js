const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Servicio para interactuar con la API de Facebook Graph para WhatsApp Business
 */
class WhatsAppBusinessService {
  constructor(wabaId = null, accessToken = null) {
    // En modo producción, el usuario puede enviar el WABA ID y Access Token
    // En modo desarrollo/prueba, se usan las variables del .env
    // Si se pasan valores explícitos y no vacíos, se usan esos
    // Si son null/undefined o strings vacíos, se intenta usar las variables de entorno
    const hasWabaId = wabaId !== null && wabaId !== undefined && wabaId !== '';
    const hasAccessToken = accessToken !== null && accessToken !== undefined && accessToken !== '';
    
    this.wabaId = hasWabaId ? wabaId : process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.accessToken = hasAccessToken ? accessToken : process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiVersion = 'v23.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    // Solo mostrar warning si realmente no hay valores configurados
    if (!this.wabaId || !this.accessToken) {
      const source = (hasWabaId || hasAccessToken) ? 'parámetros' : 'variables de entorno';
      console.warn(`⚠️ WhatsApp Business Account ID o Access Token no configurados (fuente: ${source})`);
    } else {
      const source = (hasWabaId || hasAccessToken) ? 'parámetros del frontend' : 'variables de entorno';
      console.log(`✅ WhatsApp Business Service configurado correctamente (fuente: ${source})`);
    }
  }

  /**
   * Crear una template de mensaje en WhatsApp Business
   * @param {Object} templateData - Datos de la template
   * @param {string} templateData.name - Nombre de la template
   * @param {string} templateData.language - Idioma (ej: 'es', 'en')
   * @param {string} templateData.category - Categoría ('marketing', 'utility', 'authentication')
   * @param {string} templateData.parameterFormat - Formato de parámetros
   * @param {Array} templateData.components - Componentes de la template (header, body, footer, buttons)
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async createTemplate(templateData) {
    try {
      // Validar que tengamos los valores necesarios
      if (!this.wabaId || !this.accessToken) {
        const missing = [];
        if (!this.wabaId) missing.push('WhatsApp Business Account ID');
        if (!this.accessToken) missing.push('Access Token');
        throw new Error(`${missing.join(' y ')} ${missing.length > 1 ? 'son' : 'es'} requerido(s). Por favor, envía wabaId y accessToken en el body o configura las variables de entorno WHATSAPP_BUSINESS_ACCOUNT_ID y WHATSAPP_ACCESS_TOKEN`);
      }

      const url = `${this.baseUrl}/${this.wabaId}/message_templates`;

      // El formato del lenguaje puede ser string ("es", "en_US") u objeto { code: "es" }
      // Facebook acepta ambos formatos para crear templates
      const payload = {
        name: templateData.name,
        language: templateData.language, // Puede ser string o objeto
        category: templateData.category || 'marketing',
        ...(templateData.parameterFormat && { parameter_format: templateData.parameterFormat }),
        components: templateData.components || []
      };

      console.log(`📤 Creando template de WhatsApp: ${templateData.name}`);
      console.log(`🔗 URL: ${url}`);
      console.log(`🔑 WABA ID: ${this.wabaId}`);
      console.log(`🔐 Access Token: ${this.accessToken ? `${this.accessToken.substring(0, 20)}...` : 'NO CONFIGURADO'}`);
      console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 30000
      });

      console.log('✅ Template creada exitosamente');
      console.log('📦 Respuesta:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data,
        templateId: response.data.id,
        status: response.data.status || 'PENDING'
      };

    } catch (error) {
      console.error('❌ Error creando template de WhatsApp:', error.message);
      
      if (error.response) {
        console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
        
        const errorData = error.response.data?.error || {};
        const errorCode = errorData.code;
        const errorType = errorData.type;
        const errorMessage = errorData.message || 'Error desconocido';
        
        // Mensajes más descriptivos para errores comunes
        let userFriendlyMessage = errorMessage;
        let troubleshooting = null;
        
        if (errorCode === 190) {
          // Error 190: Bad signature - Token inválido
          userFriendlyMessage = 'El access token de Facebook es inválido o tiene una firma incorrecta.';
          troubleshooting = {
            possibleCauses: [
              'El access token está mal formateado o corrupto',
              'El access token ha expirado',
              'El access token no es un token válido de Facebook Graph API',
              'Se está usando un JWT de autenticación en lugar del access token de Facebook'
            ],
            solutions: [
              'Verifica que la variable WHATSAPP_ACCESS_TOKEN en el .env contenga un token válido de Facebook',
              'Genera un nuevo access token desde Facebook Business Manager',
              'Asegúrate de que el token sea un System User Token o Page Access Token válido',
              'NO uses tokens JWT de tu aplicación, usa tokens de Facebook Graph API'
            ],
            documentation: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started'
          };
        } else if (error.response.status === 400) {
          // Errores de validación
          if (errorMessage.includes('name') || errorMessage.includes('language')) {
            userFriendlyMessage = `Error de validación: ${errorMessage}`;
            troubleshooting = {
              solutions: [
                'Verifica que el nombre de la template sea único y siga las reglas de nomenclatura',
                'Asegúrate de que el código de idioma sea válido (ej: es, en_US)',
                'Revisa que los componentes sigan el formato correcto según la documentación de Facebook'
              ]
            };
          }
        } else if (error.response.status === 403) {
          userFriendlyMessage = 'No tienes permisos para crear templates. El access token no tiene los permisos necesarios.';
          troubleshooting = {
            solutions: [
              'Verifica que el access token tenga los permisos: whatsapp_business_management',
              'Asegúrate de que el token tenga acceso al WABA ID especificado'
            ]
          };
        }
        
        return {
          success: false,
          error: userFriendlyMessage,
          errorCode: errorCode,
          errorType: errorType,
          httpStatus: error.response.status,
          details: error.response.data,
          troubleshooting: troubleshooting
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al crear template'
      };
    }
  }

  /**
   * Obtener todas las templates de mensaje
   * @param {Object} options - Opciones de búsqueda
   * @param {string} options.name - Filtrar por nombre
   * @param {string} options.status - Filtrar por estado (APPROVED, PENDING, REJECTED)
   * @param {string} options.language - Filtrar por idioma
   * @returns {Promise<Object>} - Lista de templates
   */
  async getTemplates(options = {}) {
    try {
      // Validar que tengamos los valores necesarios
      if (!this.wabaId || !this.accessToken) {
        const missing = [];
        if (!this.wabaId) missing.push('WhatsApp Business Account ID (wabaId)');
        if (!this.accessToken) missing.push('Access Token');
        
        let errorMessage = `${missing.join(' y ')} ${missing.length > 1 ? 'son' : 'es'} requerido(s).`;
        
        if (!this.wabaId) {
          errorMessage += ' Por favor, envía wabaId como query param: ?wabaId=XXX';
        }
        if (!this.accessToken) {
          errorMessage += ' O configura la variable de entorno WHATSAPP_ACCESS_TOKEN en el .env';
        }
        
        throw new Error(errorMessage);
      }

      const url = `${this.baseUrl}/${this.wabaId}/message_templates`;

      const params = {};
      if (options.name) params.name = options.name;
      if (options.status) params.status = options.status;
      if (options.language) params.language = options.language;

      console.log(`📥 Obteniendo templates de WhatsApp`);
      console.log(`🔗 URL: ${url}`);
      if (Object.keys(params).length > 0) {
        console.log(`🔍 Filtros:`, params);
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: params,
        timeout: 30000
      });

      console.log(`✅ Templates obtenidas: ${response.data.data?.length || 0}`);

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging || null,
        total: response.data.data?.length || 0
      };

    } catch (error) {
      console.error('❌ Error obteniendo templates de WhatsApp:', error.message);
      
      if (error.response) {
        console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
        
        const errorData = error.response.data?.error || {};
        const errorCode = errorData.code;
        const errorType = errorData.type;
        const errorMessage = errorData.message || 'Error desconocido';
        
        // Mensajes más descriptivos para errores comunes
        let userFriendlyMessage = errorMessage;
        let troubleshooting = null;
        
        if (error.response.status === 403) {
          if (errorCode === 200) {
            userFriendlyMessage = 'No tienes permisos para acceder a este recurso. El access token no tiene los permisos necesarios o no tiene acceso al WABA ID especificado.';
            troubleshooting = {
              possibleCauses: [
                'El access token no tiene los permisos (scopes) necesarios para WhatsApp Business API',
                'El access token no está asociado con el WABA ID proporcionado',
                'El access token es de tipo incorrecto (necesita ser System User Token o Page Access Token)',
                'El access token ha expirado o es inválido'
              ],
              solutions: [
                'Verifica que el access token tenga los permisos: whatsapp_business_management, whatsapp_business_messaging',
                'Asegúrate de que el WABA ID sea correcto y esté asociado con tu cuenta',
                'Genera un nuevo access token desde Facebook Business Manager',
                'Verifica que el access token sea un System User Token con permisos de administrador en el WABA'
              ],
              documentation: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started'
            };
          }
        } else if (error.response.status === 401) {
          userFriendlyMessage = 'El access token es inválido o ha expirado.';
          troubleshooting = {
            solutions: [
              'Verifica que el access token sea correcto',
              'Genera un nuevo access token desde Facebook Business Manager'
            ]
          };
        } else if (error.response.status === 404) {
          userFriendlyMessage = 'El WABA ID no fue encontrado o no tienes acceso a él.';
          troubleshooting = {
            solutions: [
              'Verifica que el WABA ID sea correcto',
              'Asegúrate de que el access token tenga acceso a este WABA ID'
            ]
          };
        }
        
        return {
          success: false,
          error: userFriendlyMessage,
          errorCode: errorCode,
          errorType: errorType,
          httpStatus: error.response.status,
          details: error.response.data,
          troubleshooting: troubleshooting
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al obtener templates'
      };
    }
  }

  /**
   * Obtener una template específica por ID
   * @param {string} templateId - ID de la template
   * @returns {Promise<Object>} - Datos de la template
   */
  async getTemplateById(templateId) {
    try {
      // Validar que tengamos los valores necesarios
      if (!this.wabaId || !this.accessToken) {
        const missing = [];
        if (!this.wabaId) missing.push('WhatsApp Business Account ID');
        if (!this.accessToken) missing.push('Access Token');
        throw new Error(`${missing.join(' y ')} ${missing.length > 1 ? 'son' : 'es'} requerido(s). Por favor, envía wabaId y accessToken como query params o configura las variables de entorno WHATSAPP_BUSINESS_ACCOUNT_ID y WHATSAPP_ACCESS_TOKEN`);
      }

      const url = `${this.baseUrl}/${templateId}`;

      console.log(`📥 Obteniendo template: ${templateId}`);
      console.log(`🔗 URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 30000
      });

      console.log('✅ Template obtenida exitosamente');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error obteniendo template:', error.message);
      
      if (error.response) {
        console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
        return {
          success: false,
          error: error.response.data.error?.message || 'Error desconocido',
          errorCode: error.response.data.error?.code,
          errorType: error.response.data.error?.type,
          details: error.response.data
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al obtener template'
      };
    }
  }

  /**
   * Eliminar una template
   * @param {string} templateId - ID de la template a eliminar
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteTemplate(templateId) {
    try {
      // Validar que tengamos los valores necesarios
      if (!this.wabaId || !this.accessToken) {
        const missing = [];
        if (!this.wabaId) missing.push('WhatsApp Business Account ID');
        if (!this.accessToken) missing.push('Access Token');
        throw new Error(`${missing.join(' y ')} ${missing.length > 1 ? 'son' : 'es'} requerido(s). Por favor, envía wabaId y accessToken como query params o configura las variables de entorno WHATSAPP_BUSINESS_ACCOUNT_ID y WHATSAPP_ACCESS_TOKEN`);
      }

      const url = `${this.baseUrl}/${templateId}`;

      console.log(`🗑️ Eliminando template: ${templateId}`);
      console.log(`🔗 URL: ${url}`);

      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 30000
      });

      console.log('✅ Template eliminada exitosamente');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error eliminando template:', error.message);
      
      if (error.response) {
        console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
        return {
          success: false,
          error: error.response.data.error?.message || 'Error desconocido',
          errorCode: error.response.data.error?.code,
          errorType: error.response.data.error?.type,
          details: error.response.data
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al eliminar template'
      };
    }
  }
}

module.exports = WhatsAppBusinessService;

