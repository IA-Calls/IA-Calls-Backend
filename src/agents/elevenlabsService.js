const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.activeBatchMonitors = new Map(); // Almacenar monitores activos
    
    // Lazy load TwilioWhatsAppService cuando sea necesario
    this._whatsappService = null;
    
    if (!this.apiKey) {
      console.warn('⚠️ ELEVENLABS_API_KEY no está configurada en las variables de entorno');
    }
  }

  // Getter para TwilioWhatsAppService (lazy loading)
  get whatsappService() {
    if (!this._whatsappService) {
      const TwilioWhatsAppService = require('../services/twilioWhatsAppService');
      this._whatsappService = new TwilioWhatsAppService();
    }
    return this._whatsappService;
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

      const { callName, agentId, agentPhoneNumberId, recipients} = batchData;

      console.log('📞 Iniciando batch call en ElevenLabs...');
      console.log(`📋 Nombre: ${callName}`);
      console.log(`🤖 Agente: ${agentId}`);
      console.log(`📱 Número: ${agentPhoneNumberId}`);
      console.log(`👥 Destinatarios: ${recipients.length}`);

      const payload = {
        call_name: callName,
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        scheduled_time_unix: Math.floor(Date.now() / 1000),
        recipients: recipients.map(recipient => ({
          phone_number: recipient.phone_number,
          ...recipient.variables || {}
        }))
      };

      console.log('📋 Payload del batch call:', JSON.stringify(payload, null, 2));

      // Intentar con ElevenLabs real primero
      try {
        const response = await axios.post(`${this.baseUrl}/convai/batch-calling/submit`, payload, {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'IA-Calls-Backend/1.0.0'
          },
          timeout: 10000
        });

        console.log(`📡 Respuesta de ElevenLabs: ${response.status} ${response.statusText}`);
        const result = response.data;
        console.log('✅ Batch call iniciado exitosamente:', result);

        // El monitoreo global del servidor detectará automáticamente este batch
        const batchId = result.batch_id || result.id;
        if (batchId) {
          console.log(`📊 Batch ID: ${batchId}`);
          console.log(`⚡ El servicio de monitoreo global detectará y procesará este batch automáticamente`);
        }

        return {
          success: true,
          data: result,
          message: `Batch call "${callName}" iniciado exitosamente`,
          environment: 'production'
        };

      } catch (elevenLabsError) {
        console.error('❌ Error de ElevenLabs:', elevenLabsError.response?.data || elevenLabsError.message);
        throw new Error(elevenLabsError.message);
      }

    } catch (error) {
      console.error('❌ Error crítico en batch call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error crítico al procesar batch call'
      };
    }
  }

  /**
   * Monitorear llamadas de un batch y enviar WhatsApp cuando se completen
   * @param {string} batchId - ID del batch call
   * @param {Array} recipients - Lista de destinatarios con sus variables
   */
  async startBatchMonitoring(batchId, recipients) {
    console.log(`📊 ===== INICIANDO MONITOREO DE BATCH =====`);
    console.log(`📊 Batch ID: ${batchId}`);
    console.log(`📊 Total destinatarios originales: ${recipients?.length || 0}`);
    console.log(`📊 Intervalo de verificación: 15 segundos`);
    console.log(`📊 Timeout máximo: 4 horas`);
    console.log(`📊 Hora de inicio: ${new Date().toLocaleString('es-ES')}`);
    console.log(`📊 ⚠️ El monitoreo continuará hasta que TODOS los recipients estén finalizados`);
    
    // Mapa para trackear llamadas completadas y evitar duplicados
    const completedCalls = new Map();
    let checkCount = 0;
    const totalRecipientsExpected = recipients?.length || 0;
    
    // PRIMERA VERIFICACIÓN INMEDIATA (después de 10 segundos para dar tiempo)
    console.log(`⏱️  Programando primera verificación en 10 segundos...`);
    setTimeout(async () => {
      console.log(`🔄 ===== VERIFICACIÓN INMEDIATA DEL BATCH ${batchId} =====`);
      await checkBatchStatus();
    }, 10000);
    
    // Función para verificar el estado del batch
    const checkBatchStatus = async () => {
      try {
        checkCount++;
        console.log(`🔄 ===== VERIFICACIÓN #${checkCount} DEL BATCH ${batchId} =====`);
        console.log(`🕐 Hora: ${new Date().toLocaleString('es-ES')}`);
        
        // Obtener estado actual del batch
        const statusResult = await this.getBatchCallStatus(batchId);
        
        if (!statusResult.success) {
          console.log(`⚠️ No se pudo obtener estado del batch: ${statusResult.error}`);
          return;
        }

        const batchData = statusResult.data;
        console.log(`📊 Estado del batch: ${batchData.status || 'unknown'}`);
        
        // Log de estructura completa del batch para debugging
        if (checkCount === 1) {
          console.log(`📋 Estructura completa del batch (primera vez):`);
          console.log(JSON.stringify(batchData, null, 2));
        }
        
        // Verificar si el batch tiene recipients con estado
        if (batchData.recipients && Array.isArray(batchData.recipients)) {
          console.log(`📋 Procesando ${batchData.recipients.length} recipients...`);
          
          // Log de todos los estados
          const statusSummary = {};
          batchData.recipients.forEach(r => {
            const st = r.status || 'unknown';
            statusSummary[st] = (statusSummary[st] || 0) + 1;
          });
          console.log(`📊 Resumen de estados:`, statusSummary);
          
          for (const recipient of batchData.recipients) {
            const key = recipient.phone_number || recipient.recipient_id;
            const status = recipient.status;
            
            console.log(`📞 Recipient: ${key}, Status: ${status}`);
            
            // ⚠️ IMPORTANTE: Verificar si la llamada está FINALIZADA (finished es el estado final)
            // Estados posibles: initiated → in_progress → finished/failed
            if (key && 
                (status === 'completed' || status === 'finished' || status === 'ended') && 
                !completedCalls.has(key)) {
              
              console.log(`✅✅✅ LLAMADA FINALIZADA DETECTADA para: ${key} ✅✅✅`);
              console.log(`📋 Estado: ${status}`);
              console.log(`📋 Datos completos del recipient:`);
              console.log(JSON.stringify(recipient, null, 2));
              
              // Marcar como procesada
              completedCalls.set(key, true);
              
              // Enviar WhatsApp
              console.log(`📱 Iniciando envío de WhatsApp para ${key}...`);
              const whatsappResult = await this.sendWhatsAppAfterCall(recipient, batchData);
              
              if (whatsappResult.success) {
                console.log(`✅ WhatsApp enviado exitosamente a ${key}`);
                console.log(`📨 Message SID: ${whatsappResult.messageId}`);
              } else {
                console.error(`❌ Error enviando WhatsApp a ${key}:`, whatsappResult.error);
              }
            } else if (key && completedCalls.has(key)) {
              console.log(`⏭️  ${key} ya fue procesado, saltando...`);
            }
          }

          // Contar llamadas en estados finales
          const totalRecipients = batchData.recipients.length;
          const finishedCount = batchData.recipients.filter(r => 
            r.status === 'completed' || r.status === 'finished' || r.status === 'ended' || r.status === 'failed'
          ).length;
          const processedCount = completedCalls.size;
          
          console.log(`📊 Progreso del batch:`);
          console.log(`   - Total recipients: ${totalRecipients}`);
          console.log(`   - Finalizados: ${finishedCount}/${totalRecipients}`);
          console.log(`   - WhatsApps enviados: ${processedCount}/${totalRecipients}`);

          // ⚠️ IMPORTANTE: Solo detener cuando TODOS los recipients estén en estado final Y procesados
          const allFinished = finishedCount >= totalRecipients;
          const allProcessed = processedCount >= totalRecipientsExpected;
          
          if (allFinished && allProcessed) {
            console.log(`✅✅✅ TODOS LOS RECIPIENTS FINALIZADOS Y PROCESADOS ✅✅✅`);
            console.log(`⏹️ Deteniendo monitoreo del batch ${batchId}...`);
            clearInterval(interval);
            this.activeBatchMonitors.delete(batchId);
          } else if (allFinished && !allProcessed) {
            console.log(`⚠️ Todos finalizados pero faltan WhatsApps por enviar (${processedCount}/${totalRecipientsExpected})`);
          } else {
            console.log(`⏳ Esperando... (${finishedCount}/${totalRecipients} finalizados)`);
          }
        } else {
          console.log(`⚠️ No hay recipients en el batch data (todavía)`);
          console.log(`⏳ Esperando a que aparezcan los recipients...`);
          // NO detener el monitoreo, seguir esperando
        }
      } catch (error) {
        console.error(`❌ Error monitoreando batch ${batchId}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
      }
    };
    
    // Intervalo de verificación cada 15 segundos
    const interval = setInterval(checkBatchStatus, 15000);

    // Almacenar el intervalo para poder cancelarlo si es necesario
    this.activeBatchMonitors.set(batchId, interval);
    
    console.log(`✅ Monitoreo configurado exitosamente para batch ${batchId}`);
    console.log(`⏱️ El sistema verificará cada 15 segundos hasta que todos terminen`);
    
    // Timeout de seguridad: detener monitoreo después de 4 horas (por si acaso)
    setTimeout(() => {
      if (this.activeBatchMonitors.has(batchId)) {
        console.log(`⏱️ Timeout de seguridad (4 horas) alcanzado para batch: ${batchId}`);
        console.log(`📊 WhatsApps enviados: ${completedCalls.size}/${totalRecipientsExpected}`);
        clearInterval(interval);
        this.activeBatchMonitors.delete(batchId);
      }
    }, 14400000); // 4 horas
  }

  /**
   * Enviar mensaje de WhatsApp después de que se complete una llamada
   * @param {Object} recipient - Datos del destinatario completado
   * @param {Object} batchData - Datos del batch call
   */
  async sendWhatsAppAfterCall(recipient, batchData) {
    try {
      console.log(`📱 ===== INICIANDO ENVÍO DE WHATSAPP =====`);
      console.log(`📋 Datos completos del recipient:`, JSON.stringify(recipient, null, 2));
      
      const phoneNumber = recipient.phone_number;
      const clientName = recipient.name || 
                        recipient.variables?.name || 
                        'Cliente';
      
      console.log(`📱 Número original: ${phoneNumber}`);
      console.log(`📱 Nombre del cliente: ${clientName}`);

      // Formatear número de teléfono para WhatsApp (Twilio necesita el + pero sin el prefijo whatsapp:)
      let formattedPhone = phoneNumber;
      
      console.log(`📱 Número antes de formatear: ${formattedPhone}`);
      
      // Twilio necesita el formato: +573138539155 (sin el prefijo whatsapp:)
      // El servicio de Twilio agrega el prefijo automáticamente
      if (!formattedPhone) {
        console.error(`❌ No hay número de teléfono disponible para enviar WhatsApp`);
        return {
          success: false,
          error: 'Número de teléfono no disponible'
        };
      }
      
      // Remover espacios y caracteres especiales
      formattedPhone = formattedPhone.trim().replace(/[\s\-\(\)]/g, '');
      
      // Asegurar que tenga el +
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      console.log(`📱 Número formateado para Twilio: ${formattedPhone}`);

      // Obtener detalles de la conversación si está disponible
      let conversationSummary = 'Hemos completado una breve conversación contigo.';
      let transcriptSummary = null;
      
      if (recipient.conversation_id) {
        console.log(`📝 Obteniendo detalles de la conversación: ${recipient.conversation_id}`);
        
        try {
          const conversationResult = await this.getConversationDetails(recipient.conversation_id);
          
          if (conversationResult.success && conversationResult.data) {
            const convData = conversationResult.data;
            
            // Intentar obtener el resumen de diferentes formas
            transcriptSummary = convData.analysis?.transcript_summary || 
                              convData.metadata?.summary || 
                              convData.summary ||
                              null;
            
            if (transcriptSummary) {
              conversationSummary = `Hemos completado una conversación y me gustaría seguir hablando contigo sobre: ${transcriptSummary}`;
            }
          }
        } catch (error) {
          console.log(`⚠️ No se pudieron obtener detalles de la conversación: ${error.message}`);
        }
      }

      // Preparar mensaje personalizado
      const message = this.formatPostCallMessage(clientName, conversationSummary, transcriptSummary);
      
      console.log(`📝 Mensaje preparado:`);
      console.log(message);

      console.log(`📤 Enviando mensaje de WhatsApp a ${formattedPhone}...`);
      
      // Enviar mensaje usando Twilio
      const result = await this.whatsappService.sendMessage(formattedPhone, message, clientName);

      console.log(`📨 Resultado del envío de WhatsApp:`, JSON.stringify(result, null, 2));

      if (result.success) {
        console.log(`✅ Mensaje de WhatsApp enviado exitosamente a ${clientName} (${formattedPhone})`);
        
        // Aquí puedes agregar lógica adicional para crear/conectar con conversación de WhatsApp
        // Por ejemplo, registrar en la base de datos o continuar con el flujo de conversación
        
        return result;
      } else {
        console.error(`❌ Error enviando WhatsApp a ${clientName}:`, result.error);
        return result;
      }

    } catch (error) {
      console.error(`❌ Error crítico enviando WhatsApp:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Formatear mensaje de WhatsApp post-llamada
   * @param {string} clientName - Nombre del cliente
   * @param {string} conversationSummary - Resumen de la conversación
   * @param {string} transcriptSummary - Resumen del transcript (si está disponible)
   */
  formatPostCallMessage(clientName, conversationSummary, transcriptSummary = null) {
    let message = `¡Hola ${clientName}! 👋\n\n`;
    
    if (transcriptSummary) {
      message += `${conversationSummary}\n\n`;
    } else {
      message += `Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.\n\n`;
    }
    
    message += `Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊\n\n`;
    message += `---\n*IA Calls*`;
    
    return message;
  }

  /**
   * Detener el monitoreo de un batch específico
   * @param {string} batchId - ID del batch call
   */
  stopBatchMonitoring(batchId) {
    if (this.activeBatchMonitors.has(batchId)) {
      const interval = this.activeBatchMonitors.get(batchId);
      clearInterval(interval);
      this.activeBatchMonitors.delete(batchId);
      console.log(`⏹️ Monitoreo detenido para batch: ${batchId}`);
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
