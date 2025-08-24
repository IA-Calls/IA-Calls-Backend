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
            model_id: "eleven_turbo_v2"
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

      const response = await axios.put(`${this.baseUrl}/convai/agents/${agentId}`, updateData, {
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
      console.error('Error actualizando agente:', error);
      
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
}

module.exports = new ElevenLabsService();
