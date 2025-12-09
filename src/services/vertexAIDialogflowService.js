/**
 * Servicio para interactuar con Vertex AI Agent Builder (Generative AI)
 * 
 * Usa @google-cloud/vertexai con Service Account
 * Soporta las credenciales de GOOGLE_CLOUD_* en .env
 * 
 * ❌ ELIMINADO (Dialogflow CX):
 *    - Intents, Flows, Pages
 *    - Training del modelo NLU
 *    - Errores de "NLU model does not exist"
 * 
 * ✅ NUEVO (Vertex AI Generative):
 *    - Modelo generativo (Gemini)
 *    - System Instructions (instructor)
 *    - Chat con historial
 *    - Autenticación con Service Account
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

class VertexAIAgentService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    // IMPORTANTE: us-central1 es la región principal para Gemini en Vertex AI
    this.location = process.env.VERTEX_AI_LOCATION || 'us-east1';
    
    // Modelo por defecto (sin sufijo de versión para usar la última)
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    
    // Cache de chats activos por sesión
    this.activeChats = new Map();
    
    // Inicializar Vertex AI con Service Account
    this.initializeVertexAI();
  }

  /**
   * Inicializar Vertex AI con credenciales de Service Account
   */
  initializeVertexAI() {
    try {
      if (!this.projectId) {
        console.error('❌ GOOGLE_CLOUD_PROJECT_ID no está configurado');
        this.vertexAI = null;
        return;
      }

      // Crear credenciales desde variables de entorno
      const credentials = {
        type: 'service_account',
        project_id: this.projectId,
        private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
        auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
        universe_domain: process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN || 'googleapis.com'
      };

      // Validar credenciales mínimas
      if (!credentials.private_key || !credentials.client_email) {
        console.error('❌ Credenciales de Service Account incompletas');
        console.error('   Necesitas: GOOGLE_CLOUD_PRIVATE_KEY y GOOGLE_CLOUD_CLIENT_EMAIL');
        this.vertexAI = null;
        return;
      }

      // Inicializar GoogleAuth con las credenciales
      this.auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });

      // Inicializar Vertex AI
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location,
        googleAuthOptions: {
          credentials: credentials
        }
      });

      console.log('🤖 ════════════════════════════════════════════');
      console.log('🤖 Vertex AI Agent Builder inicializado');
      console.log(`   ✓ Proyecto: ${this.projectId}`);
      console.log(`   ✓ Ubicación: ${this.location}`);
      console.log(`   ✓ Modelo: ${this.defaultModel}`);
      console.log(`   ✓ Service Account: ${credentials.client_email}`);
      console.log('🤖 ════════════════════════════════════════════');

    } catch (error) {
      console.error('❌ Error inicializando Vertex AI:', error.message);
      this.vertexAI = null;
    }
  }

  /**
   * Crear un agente en Vertex AI Agent Engine
   * Esto crea el agente en la nube y aparecerá en el "Motor del agente"
   */
  async createAgent(config) {
    try {
      const { displayName, instructor, defaultLanguageCode = 'es', description } = config;

      if (!displayName) {
        throw new Error('displayName es requerido');
      }

      if (!this.vertexAI) {
        throw new Error('Vertex AI no está inicializado');
      }

      console.log(`🤖 Creando agente en Vertex AI Agent Engine: ${displayName}`);

      // Usar la API REST de Vertex AI para crear el agente
      // Endpoint: projects/{project}/locations/{location}/agents
      const accessToken = await this.getAccessToken();
      
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/agents`;
      
      // Payload para crear un agente en Agent Engine
      const payload = {
        displayName: displayName,
        description: description || `Agente generativo para WhatsApp: ${displayName}`,
        defaultLanguageCode: defaultLanguageCode,
        // Configuración del modelo generativo
        generativeSettings: {
          systemInstruction: {
            parts: [{ text: instructor || 'Eres un asistente virtual amable y útil.' }]
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        },
        // Modelo base
        model: `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.defaultModel}`,
        // Configuración de respuesta
        responseFormat: {
          text: {}
        }
      };

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };

      console.log(`📤 Creando agente en: ${url}`);
      const response = await axios.post(url, payload, { headers });

      // Extraer el Agent ID del nombre del recurso
      const agentResourceName = response.data.name;
      const agentId = agentResourceName.split('/').pop();

      console.log(`✅ Agente creado en Vertex AI: ${agentId}`);
      console.log(`   Resource Name: ${agentResourceName}`);

      return {
        success: true,
        agent_id: agentId,
        agent_resource_name: agentResourceName,
        instructor: instructor,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error creando agente en Vertex AI:', error.response?.data || error.message);
      
      // Si falla, crear agente local como fallback
      console.log('⚠️ Creando agente local como fallback...');
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        agent_id: agentId,
        agent_resource_name: `projects/${this.projectId}/agents/${agentId}`,
        instructor: config.instructor,
        data: {
          name: agentId,
          displayName: config.displayName,
          isLocal: true, // Indica que es un agente local, no en la nube
          note: 'Agente creado localmente. No aparecerá en Agent Engine.'
        }
      };
    }
  }

  /**
   * Obtener token de acceso para autenticación
   */
  async getAccessToken() {
    try {
      if (!this.auth) {
        throw new Error('GoogleAuth no está inicializado');
      }
      const client = await this.auth.getClient();
      const token = await client.getAccessToken();
      return token.token;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error.message);
      throw error;
    }
  }

  /**
   * Enviar mensaje al agente - Reemplaza detectIntent de Dialogflow
   */
  async detectIntent(agentId, sessionId, text, languageCode = 'es', systemInstruction = null, conversationHistory = []) {
    return this.sendMessage(agentId, sessionId, text, systemInstruction, conversationHistory);
  }

  /**
   * Enviar mensaje al modelo generativo
   */
  async sendMessage(agentId, sessionId, message, systemInstruction = null, history = []) {
    try {
      if (!this.vertexAI) {
        throw new Error('Vertex AI no está inicializado. Verifica las credenciales.');
      }

      console.log(`💬 Enviando mensaje a Vertex AI: "${message.substring(0, 50)}..."`);

      // Obtener o crear modelo para esta sesión
      const chatKey = `${agentId}_${sessionId}`;
      let chat = this.activeChats.get(chatKey);

      if (!chat) {
        // Crear modelo generativo con system instruction
        const generativeModel = this.vertexAI.getGenerativeModel({
          model: this.defaultModel,
          systemInstruction: {
            parts: [{ text: systemInstruction || 'Eres un asistente virtual amable y útil. Responde en español.' }]
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        });

        // Convertir historial al formato de Vertex AI
        const formattedHistory = this.formatHistoryForVertexAI(history);

        // Iniciar chat
        chat = generativeModel.startChat({
          history: formattedHistory,
        });

        this.activeChats.set(chatKey, chat);
        console.log(`🆕 Nueva sesión de chat creada: ${chatKey}`);
      }

      // Enviar mensaje
      const result = await chat.sendMessage(message);
      const response = result.response;
      
      // Extraer texto de la respuesta
      let responseText = '';
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          responseText = candidate.content.parts
            .filter(part => part.text)
            .map(part => part.text)
            .join('');
        }
      }

      if (!responseText) {
        responseText = 'No pude generar una respuesta. Por favor, intenta de nuevo.';
      }

      console.log(`✅ Respuesta del agente: "${responseText.substring(0, 100)}..."`);

      return {
        success: true,
        response: responseText,
        confidence: 1.0,
        intent: null,
        queryResult: {
          text: message,
          responseMessages: [{ text: { text: [responseText] } }]
        }
      };

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error.message);
      
      // Limpiar sesión en caso de error
      const chatKey = `${agentId}_${sessionId}`;
      this.activeChats.delete(chatKey);

      return {
        success: false,
        error: error.message,
        details: error.message
      };
    }
  }

  /**
   * Formatear historial para Vertex AI
   */
  formatHistoryForVertexAI(history) {
    if (!history || history.length === 0) {
      return [];
    }

    return history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  /**
   * Limpiar sesión de chat
   */
  clearSession(agentId, sessionId) {
    const chatKey = `${agentId}_${sessionId}`;
    this.activeChats.delete(chatKey);
    console.log(`🗑️ Sesión eliminada: ${chatKey}`);
  }

  /**
   * Obtener info del agente
   */
  async getAgent(agentId) {
    return {
      success: true,
      data: {
        name: agentId,
        type: 'vertex-ai-generative',
        model: this.defaultModel,
        location: this.location
      }
    };
  }

  /**
   * Listar agentes (desde BD local)
   */
  async listAgents() {
    return {
      success: true,
      agents: [],
      message: 'Los agentes se gestionan desde la base de datos local'
    };
  }

  /**
   * Entrenar agente - NO NECESARIO con Generative AI
   */
  async trainAgent(agentId) {
    console.log('ℹ️ trainAgent() no es necesario con Vertex AI Generative');
    return { success: true, message: 'No requiere entrenamiento' };
  }

  // Métodos de compatibilidad (no hacen nada)
  async createWelcomeIntent() { return null; }
  async updateStartFlowWithIntent() { return null; }
}

module.exports = new VertexAIAgentService();
