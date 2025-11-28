const { VertexAI } = require('@google-cloud/vertexai');

/**
 * Servicio para interactuar con Vertex AI usando Google Cloud Service Account
 * Usa Gemini 2.5 Flash Lite (modelo más económico disponible)
 */
class VertexAIService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.model = 'gemini-2.5-flash-lite'; // Modelo más económico disponible
    
    // Configurar credenciales de servicio
    this.credentials = this.getServiceAccountCredentials();
    
    // Inicializar Vertex AI con las credenciales
    this.vertexAI = null;
    
    if (this.projectId && this.credentials) {
      try {
        this.vertexAI = new VertexAI({
          project: this.projectId,
          location: this.location,
          googleAuthOptions: {
            credentials: this.credentials
          }
        });
        console.log(`✅ Vertex AI Service inicializado para proyecto: ${this.projectId}`);
      } catch (error) {
        console.error('❌ Error inicializando Vertex AI:', error.message);
      }
    } else {
      if (!this.projectId) {
        console.warn('⚠️ GOOGLE_CLOUD_PROJECT_ID no está configurado');
      }
      if (!this.credentials) {
        console.warn('⚠️ Credenciales de Google Cloud Service Account no configuradas');
      }
    }
  }

  /**
   * Obtener credenciales de Service Account desde variables de entorno
   * @returns {Object|null} - Credenciales de Google Cloud o null si no están configuradas
   */
  getServiceAccountCredentials() {
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
      return null;
    }

    return {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN || 'googleapis.com'
    };
  }

  /**
   * Generar configuración de agente basada en un prompt usando Vertex AI
   * @param {string} userPrompt - Prompt del usuario describiendo el agente
   * @param {Object} providedValues - Valores proporcionados por el usuario (name, tts_voice_id)
   * @returns {Promise<Object>} - Configuración generada para el agente
   */
  async generateAgentConfig(userPrompt, providedValues = {}) {
    try {
      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
        throw new Error('El prompt es requerido y debe ser un string no vacío');
      }

      if (!this.vertexAI) {
        throw new Error('Vertex AI no está inicializado. Verifica las credenciales de Google Cloud Service Account.');
      }

      console.log('🤖 === GENERANDO CONFIGURACIÓN DE AGENTE CON VERTEX AI ===');
      console.log(`📝 Prompt del usuario: ${userPrompt.substring(0, 200)}...`);

      // Obtener system instructions
      const systemInstructions = this.getSystemInstructions();

      // Construir el prompt completo
      // Construir el prompt con los valores proporcionados
      const providedInfo = providedValues.name 
        ? `\n\nVALORES PROPORCIONADOS POR EL USUARIO (usa estos exactamente):
- name: "${providedValues.name}"
- tts_voice_id: "${providedValues.tts_voice_id || 'WOSzFvlJRm2hkYb3KA5w'}"`
        : '';

      const fullPrompt = `Basándote en la siguiente descripción del usuario, genera la configuración completa del agente conversacional en formato JSON válido.

Descripción del usuario:
${userPrompt}${providedInfo}

IMPORTANTE: 
- Responde SOLO con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones
- Usa EXACTAMENTE los valores proporcionados para "name" y "tts_voice_id"
- Genera valores apropiados para los demás campos basándote en la descripción

El JSON debe tener exactamente esta estructura:
{
  "name": "${providedValues.name || 'Agente Conversacional'}",
  "asr_quality": "high" | "medium" | "low",
  "tts_optimize_streaming_latency": 1-5,
  "tts_stability": 0.0-1.0,
  "tts_speed": 0.5-2.0,
  "tts_similarity_boost": 0.0-1.0,
  "tts_voice_id": "${providedValues.tts_voice_id || 'WOSzFvlJRm2hkYb3KA5w'}",
  "agent_first_message": "string",
  "agent_language": "es" | "en" | "fr" | etc,
  "prompt_text": "string (instrucciones detalladas para el agente basadas en la descripción)",
  "prompt_temperature": 0.0-1.0,
  "prompt_ignore_default_personality": boolean,
  "prompt_knowledge_base": []
}`;

      // Obtener el modelo generativo
      const model = this.vertexAI.getGenerativeModel({
        model: this.model,
        systemInstruction: {
          parts: [{ text: systemInstructions }]
        }
      });

      console.log('🔄 Enviando prompt a Gemini 2.5 Flash Lite vía Vertex AI SDK...');

      // Generar contenido
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: fullPrompt }]
        }]
      });

      const response = await result.response;
      const text = response.candidates[0].content.parts[0].text;

      console.log('📥 Respuesta de Vertex AI recibida');
      console.log('📋 Respuesta completa:', text.substring(0, 300) + '...');
      
      // Extraer JSON de la respuesta (puede venir con markdown o texto adicional)
      let jsonText = text.trim();
      
      // Remover markdown code blocks si existen
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Buscar el objeto JSON en la respuesta
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      console.log('📋 JSON extraído:', jsonText.substring(0, 200) + '...');

      const agentConfig = JSON.parse(jsonText);

      // Asegurar que los valores proporcionados se usen exactamente
      if (providedValues.name) {
        agentConfig.name = providedValues.name;
      }
      if (providedValues.tts_voice_id) {
        agentConfig.tts_voice_id = providedValues.tts_voice_id;
      }

      // Validar y normalizar la configuración
      const validatedConfig = this.validateAndNormalizeConfig(agentConfig);

      console.log('✅ Configuración generada y validada exitosamente');

      return {
        success: true,
        config: validatedConfig,
        rawResponse: text
      };

    } catch (error) {
      console.error('❌ Error generando configuración con Vertex AI:', error);
      console.error('Stack trace:', error.stack);
      
      return {
        success: false,
        error: error.message,
        message: 'Error al generar configuración del agente con Vertex AI',
        details: error.stack
      };
    }
  }

  /**
   * Obtener system instructions para Vertex AI
   * @returns {string} - System instructions
   */
  getSystemInstructions() {
    return `Eres un experto en configuración de agentes conversacionales para ElevenLabs. Tu tarea es analizar la descripción de un usuario y generar una configuración completa y optimizada para un agente conversacional.

REGLAS IMPORTANTES:
1. Debes generar SOLO un objeto JSON válido, sin texto adicional
2. El JSON debe tener exactamente los campos especificados
3. SI el usuario proporciona valores específicos (como "name" o "tts_voice_id"), DEBES usar esos valores EXACTAMENTE como se proporcionan
4. Los valores que NO se proporcionan deben ser generados apropiadamente y de forma realista
5. El prompt_text debe ser detallado y específico basado en la descripción del usuario
6. El agent_first_message debe ser profesional y apropiado para el contexto
7. El agent_language debe coincidir con el idioma de la descripción
8. Los valores numéricos deben estar en los rangos válidos

CAMPOS REQUERIDOS Y SUS FORMATOS:
- name: string (nombre descriptivo del agente)
- asr_quality: "high" | "medium" | "low" (calidad de reconocimiento de voz)
- tts_optimize_streaming_latency: número entero entre 1-5 (1=más latencia pero mejor calidad, 5=menos latencia)
- tts_stability: número decimal entre 0.0-1.0 (estabilidad de la voz)
- tts_speed: número decimal entre 0.5-2.0 (velocidad del habla, 1.0 es normal)
- tts_similarity_boost: número decimal entre 0.0-1.0 (similitud con la voz original)
- tts_voice_id: string (ID de voz de ElevenLabs, default: "WOSzFvlJRm2hkYb3KA5w")
- agent_first_message: string (primer mensaje que dirá el agente, debe ser profesional y contextual)
- agent_language: string código de idioma ISO (es, en, fr, etc.)
- prompt_text: string (instrucciones detalladas para el comportamiento del agente, mínimo 100 caracteres)
- prompt_temperature: número decimal entre 0.0-1.0 (creatividad, 0.5 es balanceado)
- prompt_ignore_default_personality: boolean (false por defecto)
- prompt_knowledge_base: array vacío [] (puede llenarse después)

EJEMPLOS DE PROMPTS Y CONFIGURACIONES:
- Si el usuario quiere un agente de ventas: prompt_text debe incluir instrucciones sobre cómo vender, ser persuasivo, cerrar ventas
- Si el usuario quiere un agente de soporte: prompt_text debe incluir instrucciones sobre cómo ayudar, resolver problemas, ser empático
- Si el usuario quiere un agente médico: prompt_text debe incluir instrucciones sobre profesionalismo médico, ética, precisión

IMPORTANTE: Siempre genera valores realistas y apropiados. El prompt_text debe ser específico y detallado basado en la descripción del usuario.`;
  }

  /**
   * Validar y normalizar la configuración generada
   * @param {Object} config - Configuración generada
   * @returns {Object} - Configuración validada y normalizada
   */
  validateAndNormalizeConfig(config) {
    const validated = {};

    // name
    validated.name = config.name || 'Agente Conversacional';
    if (typeof validated.name !== 'string' || validated.name.trim().length === 0) {
      validated.name = 'Agente Conversacional';
    }

    // asr_quality
    validated.asr_quality = config.asr_quality || 'high';
    if (!['high', 'medium', 'low'].includes(validated.asr_quality)) {
      validated.asr_quality = 'high';
    }

    // tts_optimize_streaming_latency
    validated.tts_optimize_streaming_latency = parseInt(config.tts_optimize_streaming_latency) || 3;
    if (validated.tts_optimize_streaming_latency < 1 || validated.tts_optimize_streaming_latency > 5) {
      validated.tts_optimize_streaming_latency = 3;
    }

    // tts_stability
    validated.tts_stability = parseFloat(config.tts_stability) || 0.5;
    if (validated.tts_stability < 0 || validated.tts_stability > 1) {
      validated.tts_stability = 0.5;
    }

    // tts_speed
    validated.tts_speed = parseFloat(config.tts_speed) || 1.0;
    if (validated.tts_speed < 0.5 || validated.tts_speed > 2.0) {
      validated.tts_speed = 1.0;
    }

    // tts_similarity_boost
    validated.tts_similarity_boost = parseFloat(config.tts_similarity_boost) || 0.8;
    if (validated.tts_similarity_boost < 0 || validated.tts_similarity_boost > 1) {
      validated.tts_similarity_boost = 0.8;
    }

    // tts_voice_id
    validated.tts_voice_id = config.tts_voice_id || 'WOSzFvlJRm2hkYb3KA5w';
    if (typeof validated.tts_voice_id !== 'string' || validated.tts_voice_id.trim().length === 0) {
      validated.tts_voice_id = 'WOSzFvlJRm2hkYb3KA5w';
    }

    // agent_first_message
    validated.agent_first_message = config.agent_first_message || 'Hola, ¿en qué puedo ayudarte hoy?';
    if (typeof validated.agent_first_message !== 'string' || validated.agent_first_message.trim().length === 0) {
      validated.agent_first_message = 'Hola, ¿en qué puedo ayudarte hoy?';
    }

    // agent_language
    validated.agent_language = config.agent_language || 'es';
    if (typeof validated.agent_language !== 'string' || validated.agent_language.trim().length === 0) {
      validated.agent_language = 'es';
    }

    // prompt_text
    validated.prompt_text = config.prompt_text || 'Eres un asistente virtual profesional y amigable.';
    if (typeof validated.prompt_text !== 'string' || validated.prompt_text.trim().length < 20) {
      validated.prompt_text = 'Eres un asistente virtual profesional y amigable. Ayuda a los usuarios de manera clara y efectiva.';
    }

    // prompt_temperature
    validated.prompt_temperature = parseFloat(config.prompt_temperature) || 0.5;
    if (validated.prompt_temperature < 0 || validated.prompt_temperature > 1) {
      validated.prompt_temperature = 0.5;
    }

    // prompt_ignore_default_personality
    validated.prompt_ignore_default_personality = config.prompt_ignore_default_personality === true || config.prompt_ignore_default_personality === 'true';

    // prompt_knowledge_base
    validated.prompt_knowledge_base = Array.isArray(config.prompt_knowledge_base) ? config.prompt_knowledge_base : [];

    return validated;
  }
}

// Exportar instancia singleton
const vertexAIService = new VertexAIService();
module.exports = vertexAIService;
