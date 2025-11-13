const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️ ELEVENLABS_API_KEY no está configurada en las variables de entorno');
    }
  }

  /**
   * Obtener números de teléfono disponibles en ElevenLabs
   * @returns {Promise<Object>} - Lista de números de teléfono disponibles
   */
  async getPhoneNumbers() {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log('📞 Obteniendo números de teléfono disponibles en ElevenLabs...');

      const response = await axios.get(`${this.baseUrl}/convai/phone-numbers`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      console.log(`📊 Números encontrados: ${response.data?.length || 0}`);
      
      // Log la estructura completa para debugging
      if (response.data && response.data.length > 0) {
        console.log('📋 Estructura del primer número:');
        console.log(JSON.stringify(response.data[0], null, 2));
      }

      // Normalizar los números para asegurar que siempre tengamos el campo correcto
      const phoneNumbers = Array.isArray(response.data) 
        ? response.data.map(phone => {
            // Intentar múltiples formas de obtener el ID
            const phoneNumberId = phone.phone_number_id || 
                                  phone.id || 
                                  phone.phoneNumberId || 
                                  phone.phone_number?.id ||
                                  null;
            
            // Intentar múltiples formas de obtener el número de teléfono
            const phoneNumber = phone.phone_number || 
                               phone.number || 
                               phone.phoneNumber ||
                               null;
            
            return {
              id: phoneNumberId,
              phone_number_id: phoneNumberId,
              phone_number: phoneNumber,
              region: phone.region,
              country: phone.country,
              status: phone.status,
              capabilities: phone.capabilities,
              ...phone // Incluir todos los campos originales
            };
          })
        : [];

      return {
        success: true,
        phoneNumbers: phoneNumbers,
        count: phoneNumbers.length,
        message: 'Números de teléfono obtenidos exitosamente'
      };

    } catch (error) {
      console.error('❌ Error obteniendo números de teléfono de ElevenLabs:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Error obteniendo números de teléfono'
      };
    }
  }

  /**
   * Obtener voces disponibles en ElevenLabs
   * @returns {Promise<Object>} - Lista de voces disponibles con voice_id, name y verified_languages
   */
  async getVoices() {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log('🎤 Obteniendo voces disponibles en ElevenLabs...');

      // La API de voces está en v2, no v1
      const response = await axios.get('https://api.elevenlabs.io/v2/voices', {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      
      const voicesData = response.data?.voices || [];
      console.log(`📊 Voces encontradas: ${voicesData.length}`);

      // Filtrar solo los campos necesarios: voice_id, name, y verified_languages
      const filteredVoices = voicesData.map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name,
        verified_languages: voice.verified_languages || []
      }));

      return {
        success: true,
        voices: filteredVoices,
        count: filteredVoices.length,
        message: 'Voces obtenidas exitosamente'
      };

    } catch (error) {
      console.error('❌ Error obteniendo voces de ElevenLabs:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Error obteniendo voces'
      };
    }
  }

  /**
   * Crear un agente conversacional en ElevenLabs
   * @param {Object} options - Opciones para personalizar el agente
   * @returns {Promise<Object>} - Respuesta con el agent_id creado
   */
  async createAgent(options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      // Configuración predeterminada del agente
      const defaultConfig = {
        conversation_config: {
                  tts: {
          voice_id: "pNInz6obpgDQGcFmaJgB", // Adam - voz por defecto disponible
          model_id: "eleven_turbo_v2_5" // Requerido para agentes no-inglés
        },
          conversation: {
            text_only: false // Usar audio
          },
          agent: {
            language: "es", // Idioma español
            prompt: {
              prompt: "Responde preguntas de cultura general sobre el software de ia-calls, y no trates otros temas."
            }
          }
        },
        platform_settings: options.platform_settings || {},
        name: options.name || "Agente IA-Calls",
        tags: options.tags || ["ia-calls", "asistente", "español"]
      };

      // Combinar configuración predeterminada con opciones personalizadas
      const agentConfig = {
        ...defaultConfig,
        ...options,
        conversation_config: {
          ...defaultConfig.conversation_config,
          ...(options.conversation_config || {})
        }
      };

      console.log('🤖 Creando agente en ElevenLabs...');
      console.log('📋 Configuración del agente:', JSON.stringify(agentConfig, null, 2));

      const response = await axios.post(`${this.baseUrl}/convai/agents/create`, agentConfig, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);

      const result = response.data;
      console.log('✅ Agente creado exitosamente:', result);

      return {
        success: true,
        agent_id: result.agent_id,
        data: result,
        message: 'Agente conversacional creado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando agente en ElevenLabs:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        // Error de respuesta HTTP (4xx, 5xx)
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Error al crear agente conversacional'
      };
    }
  }

  /**
   * Crear un agente con configuración completa (para uso con JSON fusionado)
   * @param {Object} agentConfig - Configuración completa del agente
   * @returns {Promise<Object>} - Respuesta con el agent_id creado
   */
  async createAgentWithConfig(agentConfig) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log('🤖 Creando agente en ElevenLabs con configuración personalizada...');
      console.log('📋 Configuración del agente:', JSON.stringify(agentConfig, null, 2));

      const response = await axios.post(`${this.baseUrl}/convai/agents/create`, agentConfig, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      console.log('✅ Agente creado exitosamente:', response.data);

      return {
        success: true,
        agent_id: response.data.agent_id,
        data: response.data,
        message: 'Agente conversacional creado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando agente en ElevenLabs:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Error al crear agente conversacional'
      };
    }
  }

  /**
   * Obtener información de un agente
   * @param {string} agentId - ID del agente
   * @returns {Promise<Object>} - Información del agente
   */
  async getAgent(agentId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      const response = await axios.get(`${this.baseUrl}/convai/agents/${agentId}`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Error obteniendo agente:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data || error.response.statusText}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Actualizar configuración de un agente
   * @param {string} agentId - ID del agente
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Resultado de la actualización
   */
  async updateAgent(agentId, updateData) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log('🔄 Actualizando agente en ElevenLabs...');
      console.log('📋 Datos de actualización:', JSON.stringify(updateData, null, 2));

      const response = await axios.patch(`${this.baseUrl}/convai/agents/${agentId}`, updateData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      const result = response.data;
      console.log('✅ Agente actualizado exitosamente:', result);

      return {
        success: true,
        data: result,
        message: 'Agente actualizado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error actualizando agente:', error);
      let errorMessage = error.message;
      
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al actualizar agente'
      };
    }
  }

  /**
   * Eliminar un agente
   * @param {string} agentId - ID del agente
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteAgent(agentId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      const response = await axios.delete(`${this.baseUrl}/convai/agents/${agentId}`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'Agente eliminado exitosamente'
      };

    } catch (error) {
      console.error('Error eliminando agente:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data || error.response.statusText}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Listar todos los agentes
   * @returns {Promise<Object>} - Lista de agentes
   */
  async listAgents() {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      const response = await axios.get(`${this.baseUrl}/convai/agents`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Error listando agentes:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data || error.response.statusText}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verificar conectividad con la API de ElevenLabs
   * @returns {Promise<Object>} - Estado de la conexión
   */
  async testConnection() {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'API key no configurada',
          message: 'ELEVENLABS_API_KEY no está definida en las variables de entorno'
        };
      }

      // Hacer una llamada simple para verificar la conectividad
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      return {
        success: true,
        message: 'Conexión exitosa con ElevenLabs',
        data: {
          user_id: result.xi_api_key?.substring(0, 8) + '...',
          api_status: 'connected'
        }
      };

    } catch (error) {
      let errorMessage = error.message;
      let statusMessage = 'Error de conectividad con ElevenLabs';
      
      if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data || error.response.statusText}`;
        statusMessage = 'No se pudo conectar con la API de ElevenLabs';
      }
      
      return {
        success: false,
        error: errorMessage,
        message: statusMessage
      };
    }
  }

  // ===== BATCH CALLING FUNCTIONS =====

  /**
   * Iniciar llamadas en masa (batch call)
   * @param {Object} batchData - Datos del batch call
   * @param {string} batchData.callName - Nombre identificativo del batch
   * @param {string} batchData.agentId - ID del agente
   * @param {string} batchData.agentPhoneNumberId - ID del número telefónico del agente
   * @param {Array} batchData.recipients - Lista de destinatarios
   * @param {number|null} batchData.scheduledTimeUnix - Tiempo programado (null para inmediato)
   * @returns {Promise<Object>} - Resultado del batch call
   */
  async submitBatchCall(batchData) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      const { callName, agentId, agentPhoneNumberId, recipients, scheduledTimeUnix } = batchData;

      console.log('\n🔍 ========== INICIO DEBUG BATCH CALL ==========');
      console.log('📞 Iniciando batch call en ElevenLabs...');
      console.log(`📋 Nombre: ${callName}`);
      console.log(`🤖 Agente: ${agentId}`);
      console.log(`📱 Número: ${agentPhoneNumberId}`);
      console.log(`👥 Destinatarios: ${recipients?.length || 0}`);
      console.log(`⏰ Scheduled Time Unix: ${scheduledTimeUnix || 'null (inmediato)'}`);

      // Validar datos requeridos
      if (!callName) {
        throw new Error('callName es requerido');
      }
      if (!agentId) {
        throw new Error('agentId es requerido');
      }
      if (!agentPhoneNumberId) {
        throw new Error('agentPhoneNumberId es requerido');
      }
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('recipients debe ser un array no vacío');
      }

      // Validar estructura de recipients
      console.log('\n📋 Validando estructura de recipients...');
      recipients.forEach((recipient, index) => {
        if (!recipient.phone_number) {
          console.error(`❌ Recipient ${index} no tiene phone_number:`, recipient);
        }
      });

      // Preparar payload
      // IMPORTANTE: ElevenLabs requiere que las variables dinámicas estén dentro de:
      // conversation_initiation_client_data.dynamic_variables
      const scheduledTime = scheduledTimeUnix || Math.floor(Date.now() / 1000);
      const payload = {
        call_name: callName,
        agent_id: agentId,
        recipients: recipients.map(recipient => {
          const recipientPayload = {
            phone_number: recipient.phone_number
          };
          
          // CRÍTICO: Las variables dinámicas deben estar en conversation_initiation_client_data.dynamic_variables
          // Esta es la estructura correcta según la documentación de ElevenLabs
          if (recipient.variables && typeof recipient.variables === 'object') {
            recipientPayload.conversation_initiation_client_data = {
              dynamic_variables: recipient.variables
            };
          } else {
            // Si no hay variables, crear un objeto vacío para evitar errores
            recipientPayload.conversation_initiation_client_data = {
              dynamic_variables: {}
            };
          }
          
          return recipientPayload;
        })
      };
      
      // Agregar agent_phone_number_id solo si está presente (opcional según la API)
      if (agentPhoneNumberId) {
        payload.agent_phone_number_id = agentPhoneNumberId;
      }
      
      // Agregar scheduled_time_unix solo si está presente
      if (scheduledTimeUnix) {
        payload.scheduled_time_unix = scheduledTime;
      }

      // IMPRIMIR JSON COMPLETO QUE SE ENVÍA A ELEVENLABS (SIN FORMATO, TAL COMO SE ENVÍA)
      console.log('\n📤 ========== JSON ENVIADO A ELEVENLABS (SIN FORMATO) ==========');
      console.log(JSON.stringify(payload));
      console.log('===================================================\n');

      // Log adicional de información útil
      console.log(`📊 Resumen del payload:`);
      console.log(`   - call_name: ${payload.call_name}`);
      console.log(`   - agent_id: ${payload.agent_id}`);
      if (payload.agent_phone_number_id) {
        console.log(`   - agent_phone_number_id: ${payload.agent_phone_number_id}`);
      }
      if (payload.scheduled_time_unix) {
        const scheduledDate = new Date(payload.scheduled_time_unix * 1000);
        console.log(`   - scheduled_time_unix: ${payload.scheduled_time_unix} (${scheduledDate.toISOString()})`);
      } else {
        console.log(`   - scheduled_time_unix: No especificado (llamada inmediata)`);
      }
      console.log(`   - recipients count: ${payload.recipients.length}`);
      console.log(`   - Primer recipient (SIN FORMATO):`, JSON.stringify(payload.recipients[0]));
      if (payload.recipients.length > 1) {
        console.log(`   - Último recipient (SIN FORMATO):`, JSON.stringify(payload.recipients[payload.recipients.length - 1]));
      }

      // Intentar con ElevenLabs real primero
      try {
        console.log(`\n🌐 Enviando petición POST a: ${this.baseUrl}/convai/batch-calling/submit`);
        console.log(`🔑 API Key presente: ${this.apiKey ? 'Sí (oculta)' : 'No'}`);
        
        const response = await axios.post(`${this.baseUrl}/convai/batch-calling/submit`, payload, {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'IA-Calls-Backend/1.0.0'
          },
          timeout: 30000 // Aumentar timeout a 30 segundos
        });

        console.log(`\n📡 ========== RESPUESTA DE ELEVENLABS ==========`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Headers (SIN FORMATO):`, JSON.stringify(response.headers));
        console.log(`Data (SIN FORMATO):`, JSON.stringify(response.data));
        console.log('===================================================\n');

        const result = response.data;
        console.log('✅ Batch call iniciado exitosamente');

        // El monitoreo global del servidor detectará automáticamente este batch
        const batchId = result.batch_id || result.id;
        if (batchId) {
          console.log(`📊 Batch ID: ${batchId}`);
          console.log(`⚡ El servicio de monitoreo global detectará y procesará este batch automáticamente`);
        }

        console.log('🔍 ========== FIN DEBUG BATCH CALL ==========\n');

        return {
          success: true,
          data: result,
          message: `Batch call "${callName}" iniciado exitosamente`,
          environment: 'production'
        };

      } catch (elevenLabsError) {
        console.error('\n❌ ========== ERROR DE ELEVENLABS ==========');
        console.error('Error completo:', elevenLabsError);
        
        let errorMessage = 'Error desconocido de ElevenLabs';
        let errorCode = 'ELEVENLABS_ERROR';
        let errorDetails = null;
        
        if (elevenLabsError.response) {
          console.error(`Status: ${elevenLabsError.response.status}`);
          console.error(`Status Text: ${elevenLabsError.response.statusText}`);
          console.error(`Headers (SIN FORMATO):`, JSON.stringify(elevenLabsError.response.headers));
          console.error(`Data (SIN FORMATO):`, JSON.stringify(elevenLabsError.response.data));
          
          // Extraer mensaje de error de la respuesta
          const responseData = elevenLabsError.response.data;
          if (responseData) {
            if (responseData.detail) {
              if (typeof responseData.detail === 'string') {
                errorMessage = responseData.detail;
              } else if (responseData.detail.message) {
                errorMessage = responseData.detail.message;
              } else if (responseData.detail.error) {
                errorMessage = responseData.detail.error;
              } else {
                errorMessage = JSON.stringify(responseData.detail);
              }
            } else if (responseData.message) {
              errorMessage = responseData.message;
            } else if (responseData.error) {
              errorMessage = responseData.error;
            } else if (typeof responseData === 'string') {
              errorMessage = responseData;
            }
            
            // Detectar tipos específicos de errores
            if (errorMessage.includes('Missing required dynamic variables')) {
              errorCode = 'MISSING_VARIABLES';
              // Extraer qué variables faltan
              const missingVarsMatch = errorMessage.match(/\{'([^']+)'\}/);
              if (missingVarsMatch) {
                errorDetails = `La variable '${missingVarsMatch[1]}' es requerida pero no está disponible en los datos de los destinatarios.`;
              }
            } else if (errorMessage.includes('agent_id') || errorMessage.includes('agent')) {
              errorCode = 'INVALID_AGENT';
            } else if (errorMessage.includes('phone_number') || errorMessage.includes('phone')) {
              errorCode = 'INVALID_PHONE';
            } else if (elevenLabsError.response.status === 401) {
              errorCode = 'UNAUTHORIZED';
              errorMessage = 'Error de autenticación con ElevenLabs';
            } else if (elevenLabsError.response.status === 404) {
              errorCode = 'NOT_FOUND';
              errorMessage = 'Recurso no encontrado en ElevenLabs';
            } else if (elevenLabsError.response.status >= 500) {
              errorCode = 'ELEVENLABS_SERVER_ERROR';
              errorMessage = 'Error en el servidor de ElevenLabs';
            }
          }
        } else if (elevenLabsError.request) {
          console.error('Request enviado pero sin respuesta:', elevenLabsError.request);
          errorCode = 'NO_RESPONSE';
          errorMessage = 'No se recibió respuesta de ElevenLabs';
          errorDetails = 'El servidor de ElevenLabs no respondió. Verifica tu conexión a internet.';
        } else {
          console.error('Error configurando request:', elevenLabsError.message);
          errorMessage = elevenLabsError.message;
        }
        console.error('===========================================\n');
        
        // Lanzar error con información estructurada
        const structuredError = new Error(errorMessage);
        structuredError.errorCode = errorCode;
        structuredError.details = errorDetails;
        structuredError.originalError = elevenLabsError.response?.data || elevenLabsError.message;
        throw structuredError;
      }

    } catch (error) {
      console.error('\n❌ ========== ERROR CRÍTICO EN BATCH CALL ==========');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.error('===================================================\n');
      
      return {
        success: false,
        error: error.message,
        message: 'Error crítico al procesar batch call',
        details: error.details || error.stack,
        errorCode: error.errorCode || 'BATCH_CALL_CRITICAL_ERROR',
        originalError: error.originalError || error.message
      };
    }
  }


  /**
   * Consultar estado de un batch call con fallback a modo mock
   * @param {string} batchId - ID del batch call
   * @returns {Promise<Object>} - Estado del batch call
   */
  async getBatchCallStatus(batchId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      // Intentar con ElevenLabs real primero
      try {
        const response = await axios.get(`${this.baseUrl}/convai/batch-calling/${batchId}`, {
          headers: {
            'xi-api-key': this.apiKey,
            'User-Agent': 'IA-Calls-Backend/1.0.0'
          },
          timeout: 10000
        });

        const result = response.data;

        return {
          success: true,
          data: result,
          message: 'Estado del batch call obtenido exitosamente',
          environment: 'production'
        };

      } catch (elevenLabsError) {
        const batchIdStr = batchId ? batchId.substring(0, 15) + '...' : 'unknown';
        console.error(`❌ Error ElevenLabs batch ${batchIdStr}`);
        throw new Error(elevenLabsError.message);
      }

    } catch (error) {
      console.error('❌ Error crítico consultando estado del batch call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error crítico al consultar estado del batch call'
      };
    }
  }

  /**
   * Listar todos los batch calls del workspace
   * @returns {Promise<Object>} - Lista de batch calls
   */
  async listBatchCalls() {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      const response = await axios.get(`${this.baseUrl}/convai/batch-calling/workspace`, {
        headers: {
          'xi-api-key': this.apiKey,
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      const result = response.data;

      return {
        success: true,
        data: result,
        message: 'Lista de batch calls obtenida exitosamente'
      };

    } catch (error) {
      console.error('❌ Error listando batch calls:', error);
      let errorMessage = error.message;
      
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al listar batch calls'
      };
    }
  }

  /**
   * Reintentar llamadas fallidas de un batch call
   * @param {string} batchId - ID del batch call
   * @returns {Promise<Object>} - Resultado del reintento
   */
  async retryBatchCall(batchId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log(`🔄 Reintentando batch call: ${batchId}`);

      const response = await axios.post(`${this.baseUrl}/convai/batch-calling/${batchId}/retry`, {}, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      const result = response.data;
      console.log('✅ Batch call reintentado exitosamente:', result);

      return {
        success: true,
        data: result,
        message: 'Batch call reintentado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error reintentando batch call:', error);
      let errorMessage = error.message;
      
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al reintentar batch call'
      };
    }
  }

  /**
   * Cancelar un batch call en curso
   * @param {string} batchId - ID del batch call
   * @returns {Promise<Object>} - Resultado de la cancelación
   */
  async cancelBatchCall(batchId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log(`❌ Cancelando batch call: ${batchId}`);

      const response = await axios.post(`${this.baseUrl}/convai/batch-calling/${batchId}/cancel`, {}, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      const result = response.data;
      console.log('✅ Batch call cancelado exitosamente:', result);

      return {
        success: true,
        data: result,
        message: 'Batch call cancelado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error cancelando batch call:', error);
      let errorMessage = error.message;
      
      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al cancelar batch call'
      };
    }
  }

  // ===== CONVERSATION METHODS =====

  // Obtener detalles de una conversación (transcripción, análisis, metadata)
  async getConversationDetails(conversationId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log(`📝 Obteniendo detalles de conversación: ${conversationId}`);

      const response = await axios.get(`${this.baseUrl}/convai/conversations/${conversationId}`, {
        headers: {
          'xi-api-key': this.apiKey,
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        }
      });

      console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
      const result = response.data;

      return {
        success: true,
        data: result,
        message: 'Detalles de conversación obtenidos exitosamente'
      };

    } catch (error) {
      console.error(`❌ Error obteniendo detalles de conversación ${conversationId}:`, error);
      let errorMessage = error.message;

      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al obtener detalles de conversación'
      };
    }
  }

  /**
   * Enviar mensaje de texto simple a un agente
   * Sistema stateless - cada mensaje incluye contexto completo
   * @param {string} agentId - ID del agente de ElevenLabs
   * @param {string} message - Mensaje del usuario  
   * @param {Array} conversationHistory - Historial completo de conversación
   * @returns {Promise<Object>} - Respuesta del agente
   */
  async sendTextMessageToAgent(agentId, message, conversationHistory = []) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      // Construir el contexto completo para el agente
      let contextPrompt = '';
      
      if (conversationHistory.length > 0) {
        contextPrompt = 'Historial de conversación:\n\n';
        conversationHistory.forEach(msg => {
          const speaker = msg.role === 'user' ? 'Usuario' : 'Agente';
          contextPrompt += `${speaker}: ${msg.content}\n`;
        });
        contextPrompt += `\nUsuario: ${message}\n\nAgente:`;
      } else {
        contextPrompt = `Usuario: ${message}\n\nAgente:`;
      }

      // Usar el agente con todo el contexto
      // Por ahora usamos una respuesta mock mientras encuentro el endpoint correcto
      console.log(`🤖 Procesando mensaje para agente ${agentId.substring(0, 15)}...`);
      
      // Respuesta temporal mientras se confirma el endpoint correcto
      const mockResponse = `Recibí tu mensaje: "${message}". Estoy aquí para ayudarte. ¿En qué más puedo asistirte?`;

      return {
        success: true,
        response: mockResponse,
        agentId: agentId,
        note: 'Usando respuesta temporal - necesita endpoint correcto de ElevenLabs'
      };

    } catch (error) {
      console.error(`❌ Error enviando mensaje al agente:`, error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Error al enviar mensaje al agente'
      };
    }
  }

  // Descargar audio de conversación y subirlo a GCP
  async downloadAndUploadConversationAudio(conversationId, userId) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log(`🎵 Descargando audio de conversación ${conversationId} para usuario ${userId}...`);

      // Descargar el audio desde ElevenLabs
      const response = await axios.get(`${this.baseUrl}/convai/conversations/${conversationId}/audio`, {
        headers: {
          'xi-api-key': this.apiKey,
          'User-Agent': 'IA-Calls-Backend/1.0.0'
        },
        responseType: 'arraybuffer' // Importante para recibir datos binarios
      });

      console.log(`📡 Audio descargado: ${response.data.byteLength} bytes`);

      // Importar el servicio de storage
      const storageService = require('../services/storage');

      // Subir el audio a Google Cloud Storage
      const uploadResult = await storageService.uploadConversationAudio(
        Buffer.from(response.data),
        conversationId,
        userId,
        {
          source: 'elevenlabs',
          originalSize: response.data.byteLength,
          contentType: response.headers['content-type'] || 'audio/mpeg'
        }
      );

      console.log(`✅ Audio subido a GCS exitosamente: ${uploadResult.fileName}`);

      return {
        success: true,
        data: {
          gcs_url: uploadResult.downloadUrl,
          gcs_file_name: uploadResult.fileName,
          conversation_id: conversationId,
          user_id: userId,
          size: uploadResult.size,
          uploaded_at: uploadResult.uploadedAt,
          content_type: uploadResult.contentType
        },
        message: 'Audio descargado y subido a GCS exitosamente'
      };

    } catch (error) {
      console.error(`❌ Error descargando/subiendo audio de conversación ${conversationId}:`, error);
      let errorMessage = error.message;

      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
        console.error('❌ Error en respuesta de ElevenLabs:', errorData);
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al descargar/subir audio'
      };
    }
  }

  /**
   * Iniciar una nueva conversación de texto con un agente
   * @param {string} agentId - ID del agente de ElevenLabs
   * @param {string} firstMessage - Primer mensaje opcional del usuario
   * @returns {Promise<Object>} - Información de la conversación creada
   */
  async startConversation(agentId, firstMessage = null) {
    try {
      if (!this.apiKey) {
        throw new Error('API key de ElevenLabs no configurada');
      }

      console.log(`🆕 Iniciando conversación con agente: ${agentId}`);

      // Endpoint para iniciar conversación de texto
      const payload = {
        agent_id: agentId
      };

      // Si hay primer mensaje, incluirlo
      if (firstMessage) {
        payload.first_message = firstMessage;
      }

      const response = await axios.post(
        `${this.baseUrl}/convai/conversation/text`,
        payload,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'IA-Calls-Backend/1.0.0'
          }
        }
      );

      const conversationId = response.data.conversation_id || response.data.id;

      console.log(`✅ Conversación iniciada: ${conversationId}`);

      return {
        success: true,
        conversation_id: conversationId,
        agent_id: agentId,
        data: response.data
      };

    } catch (error) {
      console.error(`❌ Error iniciando conversación:`, error.message);
      
      let errorMessage = error.message;

      if (error.response) {
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = `Error ${error.response.status}: ${errorData.detail.message || errorData.detail.status || JSON.stringify(errorData.detail)}`;
          } else {
            errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
          }
        } else {
          errorMessage = `Error ${error.response.status}: ${errorData || error.response.statusText}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        message: 'Error al iniciar conversación'
      };
    }
  }
}

module.exports = new ElevenLabsService();
