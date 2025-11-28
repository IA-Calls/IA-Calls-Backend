const { elevenlabsService } = require('../agents');

/**
 * Obtener números de teléfono disponibles en ElevenLabs
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPhoneNumbers = async (req, res) => {
  try {
    console.log('📞 === SOLICITUD DE NÚMEROS DE TELÉFONO ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getPhoneNumbers();

    if (result.success) {
      console.log(`✅ Números obtenidos exitosamente: ${result.count} números disponibles`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          phoneNumbers: result.phoneNumbers,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo números:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getPhoneNumbers:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener números de teléfono',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtener información de un agente específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAgentInfo = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🤖 === SOLICITUD DE INFORMACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 Agent ID:', agentId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getAgentInfo(agentId);

    if (result.success) {
      console.log('✅ Información del agente obtenida exitosamente');
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          agent: result.agent,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo información del agente:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getAgentInfo:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener información del agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Listar todos los agentes del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const listAgents = async (req, res) => {
  try {
    console.log('🤖 === SOLICITUD DE LISTA DE AGENTES ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.listAgents();

    if (result.success) {
      // Formatear respuesta para mejor legibilidad
      const agents = result.data?.agents || result.data || [];
      const count = Array.isArray(agents) ? agents.length : 0;
      
      console.log(`✅ Agentes obtenidos exitosamente: ${count} agentes encontrados`);
      
      // Formatear agentes para respuesta más clara
      const formattedAgents = Array.isArray(agents) ? agents.map(agent => ({
        agent_id: agent.agent_id || agent.id,
        name: agent.name,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        status: agent.status,
        language: agent.conversation_config?.agent?.language || 'N/A',
        voice_id: agent.conversation_config?.tts?.voice_id || 'N/A'
      })) : [];
      
      return res.status(200).json({
        success: true,
        message: 'Agentes obtenidos exitosamente',
        data: {
          agents: formattedAgents,
          raw_data: result.data, // Incluir datos completos también
          count: count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo agentes:', result.error);
      
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo agentes de ElevenLabs',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en listAgents:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al listar agentes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Crear un agente conversacional en ElevenLabs
 * Fusiona el payload del usuario con el JSON base
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createAgent = async (req, res) => {
  try {
    console.log('🤖 === CREACIÓN DE AGENTE EN ELEVENLABS ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('📥 Payload recibido:', JSON.stringify(req.body, null, 2));
    console.log('🕐 Timestamp:', new Date().toISOString());

    const { deepMerge } = require('../utils/helpers');

    // JSON Base (Plantilla del Agente)
    const baseAgentConfig = {
      "name": "Nombre del Nuevo Agente",
      "conversation_config": {
        "asr": {
          "quality": "high",
          "provider": "elevenlabs",
          "user_input_audio_format": "pcm_16000",
          "keywords": []
        },
        "turn": {
          "turn_timeout": 20,
          "silence_end_call_timeout": -1,
          "mode": "turn",
          "turn_eagerness": "normal"
        },
        "tts": {
          "model_id": "eleven_turbo_v2_5",
          "voice_id": "WOSzFvlJRm2hkYb3KA5w",
          "agent_output_audio_format": "pcm_48000",
          "optimize_streaming_latency": 3,
          "stability": 0.5,
          "speed": 1.04,
          "similarity_boost": 0.8
        },
        "conversation": {
          "text_only": false,
          "max_duration_seconds": 600,
          "client_events": [
            "audio",
            "interruption",
            "user_transcript",
            "agent_response",
            "agent_response_correction"
          ]
        },
        "vad": {
          "background_voice_detection": false
        },
        "agent": {
          "first_message": "Hola muy buenas noches, hablo con el {{name}} en el área de {{category}}?",
          "language": "es",
          "dynamic_variables": {
            "dynamic_variable_placeholders": {
              "name": "alejandro",
              "category": "nutricionista"
            }
          },
          "disable_first_message_interruptions": false,
          "prompt": {
            "prompt": "Eres Edwin .",
            "llm": "gemini-2.0-flash",
            "temperature": 0.45,
            "max_tokens": -1,
            "built_in_tools": {
              "end_call": {
                "type": "system",
                "name": "end_call",
                "params": {
                  "system_tool_type": "end_call"
                }
              },
              "voicemail_detection": {
                "type": "system",
                "name": "voicemail_detection",
                "params": {
                  "system_tool_type": "voicemail_detection",
                  "voicemail_message": ""
                }
              }
            },
            "knowledge_base": [
              {
                "type": "file",
                "name": "Contexto para Ai",
                "id": "b338JDWWVIHIsmgu28D5",
                "usage_mode": "auto"
              },
              {
                "type": "file",
                "name": "Dr. Daniel Quiroz PhD Pionero en Innovación Científica y Nutracéutica.",
                "id": "MbMhQ68hdUDiaSfsk0ig",
                "usage_mode": "auto"
              }
            ],
            "ignore_default_personality": false,
            "rag": {
              "enabled": false,
              "embedding_model": "e5_mistral_7b_instruct",
              "max_vector_distance": 0.6,
              "max_documents_length": 50000,
              "max_retrieved_rag_chunks_count": 20
            },
            "backup_llm_config": {
              "preference": "default"
            }
          }
        }
      },
      "platform_settings": {
        "privacy": {
          "record_voice": true,
          "retention_days": -1,
          "delete_transcript_and_pii": false,
          "delete_audio": false,
          "apply_to_existing_conversations": false,
          "zero_retention_mode": false
        }
      },
      "tags": []
    };

    // Mapear campos del request del usuario al JSON base
    const userInput = req.body;
    const mergedConfig = JSON.parse(JSON.stringify(baseAgentConfig)); // Deep copy

    // Aplicar mapeo de campos
    if (userInput.name !== undefined) {
      mergedConfig.name = userInput.name;
    }

    if (userInput.asr_quality !== undefined) {
      mergedConfig.conversation_config.asr.quality = userInput.asr_quality;
    }

    if (userInput.tts_optimize_streaming_latency !== undefined) {
      mergedConfig.conversation_config.tts.optimize_streaming_latency = userInput.tts_optimize_streaming_latency;
    }

    if (userInput.tts_stability !== undefined) {
      mergedConfig.conversation_config.tts.stability = userInput.tts_stability;
    }

    if (userInput.tts_speed !== undefined) {
      mergedConfig.conversation_config.tts.speed = userInput.tts_speed;
    }

    if (userInput.tts_similarity_boost !== undefined) {
      mergedConfig.conversation_config.tts.similarity_boost = userInput.tts_similarity_boost;
    }

    if (userInput.tts_voice_id !== undefined) {
      mergedConfig.conversation_config.tts.voice_id = userInput.tts_voice_id;
    }

    if (userInput.agent_first_message !== undefined) {
      mergedConfig.conversation_config.agent.first_message = userInput.agent_first_message;
    }

    if (userInput.agent_language !== undefined) {
      mergedConfig.conversation_config.agent.language = userInput.agent_language;
    }

    if (userInput.dynamic_variable_placeholders !== undefined) {
      mergedConfig.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders = userInput.dynamic_variable_placeholders;
    }

    if (userInput.prompt_text !== undefined) {
      mergedConfig.conversation_config.agent.prompt.prompt = userInput.prompt_text;
    }

    if (userInput.prompt_temperature !== undefined) {
      mergedConfig.conversation_config.agent.prompt.temperature = userInput.prompt_temperature;
    }

    if (userInput.prompt_knowledge_base !== undefined) {
      mergedConfig.conversation_config.agent.prompt.knowledge_base = userInput.prompt_knowledge_base;
    }

    if (userInput.prompt_ignore_default_personality !== undefined) {
      mergedConfig.conversation_config.agent.prompt.ignore_default_personality = userInput.prompt_ignore_default_personality;
    }

    // Manejar tools: solo permitir tool_ids O tools, no ambos
    if (userInput.tool_ids !== undefined) {
      // Si el usuario especifica tool_ids, usar solo eso y eliminar tools
      mergedConfig.conversation_config.agent.prompt.tool_ids = userInput.tool_ids;
      delete mergedConfig.conversation_config.agent.prompt.tools;
      console.log('📋 Usando tool_ids especificados por el usuario');
    } else if (userInput.tools !== undefined) {
      // Si el usuario especifica tools completos, usar solo eso y eliminar tool_ids
      mergedConfig.conversation_config.agent.prompt.tools = userInput.tools;
      delete mergedConfig.conversation_config.agent.prompt.tool_ids;
      console.log('📋 Usando tools especificados por el usuario');
    } else {
      // Si el usuario no especifica ninguno, eliminar ambos para evitar conflicto
      delete mergedConfig.conversation_config.agent.prompt.tool_ids;
      delete mergedConfig.conversation_config.agent.prompt.tools;
      console.log('📋 No se especificaron tools, creando agente sin herramientas personalizadas');
    }

    console.log('📋 JSON fusionado que se enviará a ElevenLabs:');
    console.log(JSON.stringify(mergedConfig, null, 2));

    // Llamar a ElevenLabs
    const result = await elevenlabsService.createAgentWithConfig(mergedConfig);

    if (result.success) {
      console.log(`✅ Agente creado exitosamente con ID: ${result.agent_id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Agente creado exitosamente en ElevenLabs',
        data: {
          agent_id: result.agent_id,
          agent_data: result.data,
          merged_config: mergedConfig,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error creando agente:', result.error);
      
      return res.status(500).json({
        success: false,
        message: 'Error al crear agente en ElevenLabs',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en createAgent:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtener información de un agente específico por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🤖 === SOLICITUD DE INFORMACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 Agent ID:', agentId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getAgent(agentId);

    if (result.success) {
      console.log('✅ Información del agente obtenida exitosamente');
      
      return res.status(200).json({
        success: true,
        message: 'Agente obtenido exitosamente',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Error obteniendo información del agente:', result.error);
      
      return res.status(404).json({
        success: false,
        message: 'Agente no encontrado o error obteniendo información',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getAgentById:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener información del agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Actualizar configuración de un agente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    const updateData = req.body;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔄 === ACTUALIZACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 Agent ID:', agentId);
    console.log('📥 Datos de actualización:', JSON.stringify(updateData, null, 2));
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Si el body está vacío, retornar error
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un campo para actualizar',
        timestamp: new Date().toISOString()
      });
    }

    const result = await elevenlabsService.updateAgent(agentId, updateData);

    if (result.success) {
      console.log(`✅ Agente ${agentId} actualizado exitosamente`);
      
      return res.status(200).json({
        success: true,
        message: 'Agente actualizado exitosamente',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Error actualizando agente:', result.error);
      
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar agente en ElevenLabs',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en updateAgentById:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Crear agente usando Vertex AI para generar la configuración desde un prompt
 * Recibe: name, prompt, tts_voice_id
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createAgentWithPrompt = async (req, res) => {
  try {
    console.log('🤖 === CREACIÓN DE AGENTE CON VERTEX AI ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('📥 Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.log('🕐 Timestamp:', new Date().toISOString());

    const { name, prompt, tts_voice_id } = req.body;

    // Validar campos requeridos
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El prompt es requerido y debe ser un string no vacío',
        timestamp: new Date().toISOString()
      });
    }

    if (!tts_voice_id || typeof tts_voice_id !== 'string' || tts_voice_id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID de voz (tts_voice_id) es requerido',
        timestamp: new Date().toISOString()
      });
    }

    // Importar servicio de Vertex AI
    const vertexAIService = require('../services/vertexAIService');

    // Generar configuración usando Vertex AI con los valores proporcionados
    console.log('🔄 Generando configuración con Vertex AI...');
    const configResult = await vertexAIService.generateAgentConfig(prompt, {
      name: name.trim(),
      tts_voice_id: tts_voice_id.trim()
    });

    if (!configResult.success) {
      console.error('❌ Error generando configuración:', configResult.error);
      return res.status(500).json({
        success: false,
        message: 'Error al generar configuración del agente con Vertex AI',
        error: configResult.error,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Configuración generada exitosamente');
    console.log('📋 Configuración generada:', JSON.stringify(configResult.config, null, 2));

    // Usar la configuración generada para crear el agente
    // Simular el request body con la configuración generada
    req.body = configResult.config;

    // Llamar a la función createAgent existente
    console.log('🔄 Creando agente en ElevenLabs con la configuración generada...');
    
    // Llamar directamente a createAgent con la configuración
    return await createAgent(req, res);

  } catch (error) {
    console.error('❌ Error inesperado en createAgentWithPrompt:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear agente con prompt',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getPhoneNumbers,
  getAgentInfo,
  listAgents,
  createAgent,
  createAgentWithPrompt,
  getAgentById,
  updateAgentById
};

