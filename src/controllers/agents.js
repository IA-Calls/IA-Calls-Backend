const { elevenlabsService } = require('../agents');
const Agent = require('../models/Agent');

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
 * Listar todos los agentes del usuario autenticado
 * Solo muestra agentes que pertenecen al usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const listAgents = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🤖 === SOLICITUD DE LISTA DE AGENTES ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 User ID:', userId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Obtener agentes del usuario desde la BD
    const userAgents = await Agent.findByUserId(userId);
    
    if (userAgents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay agentes registrados para este usuario',
        data: {
          agents: [],
          count: 0,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Obtener información detallada de cada agente desde ElevenLabs
    const agentsWithDetails = [];
    
    for (const agent of userAgents) {
      try {
        const elevenLabsResult = await elevenlabsService.getAgent(agent.agentId);
        
        if (elevenLabsResult.success) {
          agentsWithDetails.push({
            id: agent.id,
            agent_id: agent.agentId,
            name: agent.name,
            created_at: agent.createdAt,
            updated_at: agent.updatedAt,
            // Datos de ElevenLabs
            elevenlabs_data: elevenLabsResult.data,
            language: elevenLabsResult.data?.conversation_config?.agent?.language || 'N/A',
            voice_id: elevenLabsResult.data?.conversation_config?.tts?.voice_id || 'N/A',
            status: elevenLabsResult.data?.status || 'N/A'
          });
        } else {
          // Si no se puede obtener de ElevenLabs, incluir solo datos locales
          console.warn(`⚠️ No se pudo obtener información de ElevenLabs para agente ${agent.agentId}`);
          agentsWithDetails.push({
            id: agent.id,
            agent_id: agent.agentId,
            name: agent.name,
            created_at: agent.createdAt,
            updated_at: agent.updatedAt,
            error: 'No se pudo obtener información de ElevenLabs'
          });
        }
      } catch (error) {
        console.error(`❌ Error obteniendo detalles del agente ${agent.agentId}:`, error.message);
        // Incluir agente con error
        agentsWithDetails.push({
          id: agent.id,
          agent_id: agent.agentId,
          name: agent.name,
          created_at: agent.createdAt,
          updated_at: agent.updatedAt,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Agentes obtenidos exitosamente: ${agentsWithDetails.length} agentes encontrados`);
    
    return res.status(200).json({
      success: true,
      message: 'Agentes obtenidos exitosamente',
      data: {
        agents: agentsWithDetails,
        count: agentsWithDetails.length,
        timestamp: new Date().toISOString()
      }
    });

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

    // Validar que el usuario esté autenticado
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Llamar a ElevenLabs
    const result = await elevenlabsService.createAgentWithConfig(mergedConfig);

    if (result.success) {
      console.log(`✅ Agente creado exitosamente en ElevenLabs con ID: ${result.agent_id}`);
      
      // Guardar el agente en la BD con el user_id
      try {
        const agentName = mergedConfig.name || 'Agente sin nombre';
        const savedAgent = await Agent.create({
          agent_id: result.agent_id,
          user_id: userId,
          name: agentName,
          metadata: {
            merged_config: mergedConfig,
            created_via: 'api',
            created_at: new Date().toISOString()
          }
        });
        
        console.log(`✅ Agente guardado en BD con ID local: ${savedAgent.id}`);
        
        return res.status(201).json({
          success: true,
          message: 'Agente creado exitosamente en ElevenLabs y registrado en el sistema',
          data: {
            id: savedAgent.id,
            agent_id: result.agent_id,
            name: agentName,
            user_id: userId,
            agent_data: result.data,
            merged_config: mergedConfig,
            timestamp: new Date().toISOString()
          }
        });
      } catch (dbError) {
        console.error('❌ Error guardando agente en BD:', dbError.message);
        
        // Si el agente ya existe en BD (duplicado), devolver éxito pero con advertencia
        if (dbError.message.includes('duplicate') || dbError.message.includes('UNIQUE')) {
          console.warn('⚠️ El agente ya existe en BD, intentando recuperarlo...');
          
          const existingAgent = await Agent.findByAgentIdAndUserId(result.agent_id, userId);
          
          if (existingAgent) {
            return res.status(200).json({
              success: true,
              message: 'Agente creado en ElevenLabs (ya existía en BD)',
              data: {
                id: existingAgent.id,
                agent_id: result.agent_id,
                name: existingAgent.name,
                user_id: userId,
                agent_data: result.data,
                warning: 'El agente ya estaba registrado en el sistema'
              }
            });
          }
        }
        
        // Si hay otro error, devolver el error pero el agente ya está en ElevenLabs
        return res.status(201).json({
          success: true,
          message: 'Agente creado en ElevenLabs pero hubo un error al guardarlo en BD',
          warning: dbError.message,
          data: {
            agent_id: result.agent_id,
            agent_data: result.data,
            merged_config: mergedConfig,
            timestamp: new Date().toISOString()
          }
        });
      }
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
 * Valida que el agente pertenezca al usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user?.id;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🤖 === SOLICITUD DE INFORMACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 User ID:', userId);
    console.log('🆔 Agent ID:', agentId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Validar que el agente pertenezca al usuario
    const belongsToUser = await Agent.belongsToUser(agentId, userId);
    
    if (!belongsToUser) {
      console.warn(`⚠️ Intento de acceso no autorizado: Usuario ${userId} intentó acceder al agente ${agentId}`);
      
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El agente no pertenece al usuario autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener información del agente desde ElevenLabs
    const result = await elevenlabsService.getAgent(agentId);

    if (result.success) {
      console.log('✅ Información del agente obtenida exitosamente');
      
      // Obtener también los datos locales del agente
      const localAgent = await Agent.findByAgentIdAndUserId(agentId, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Agente obtenido exitosamente',
        data: {
          ...result.data,
          local_data: localAgent ? localAgent.toJSON() : null
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Error obteniendo información del agente:', result.error);
      
      return res.status(404).json({
        success: false,
        message: 'Agente no encontrado en ElevenLabs o error obteniendo información',
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
 * Valida que el agente pertenezca al usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔄 === ACTUALIZACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 User ID:', userId);
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

    // Validar que el agente pertenezca al usuario
    const belongsToUser = await Agent.belongsToUser(agentId, userId);
    
    if (!belongsToUser) {
      console.warn(`⚠️ Intento de actualización no autorizada: Usuario ${userId} intentó actualizar el agente ${agentId}`);
      
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El agente no pertenece al usuario autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Actualizar en ElevenLabs
    const result = await elevenlabsService.updateAgent(agentId, updateData);

    if (result.success) {
      console.log(`✅ Agente ${agentId} actualizado exitosamente en ElevenLabs`);
      
      // Actualizar también en BD local si hay cambios en name o metadata
      try {
        const localUpdates = {};
        if (updateData.name) {
          localUpdates.name = updateData.name;
        }
        if (updateData.metadata) {
          localUpdates.metadata = updateData.metadata;
        }
        
        if (Object.keys(localUpdates).length > 0) {
          await Agent.update(agentId, userId, localUpdates);
          console.log(`✅ Agente ${agentId} actualizado en BD local`);
        }
      } catch (dbError) {
        console.warn(`⚠️ Error actualizando agente en BD local: ${dbError.message}`);
        // No fallar la operación si solo falla la actualización local
      }
      
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
    // createAgent ya maneja el guardado en BD con user_id
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

/**
 * Eliminar un agente
 * Valida que el agente pertenezca al usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user?.id;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🗑️ === ELIMINACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 User ID:', userId);
    console.log('🆔 Agent ID:', agentId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Validar que el agente pertenezca al usuario
    const belongsToUser = await Agent.belongsToUser(agentId, userId);
    
    if (!belongsToUser) {
      console.warn(`⚠️ Intento de eliminación no autorizada: Usuario ${userId} intentó eliminar el agente ${agentId}`);
      
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El agente no pertenece al usuario autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Eliminar de ElevenLabs
    const result = await elevenlabsService.deleteAgent(agentId);

    if (result.success) {
      // Eliminar también de la BD local
      const deleted = await Agent.delete(agentId, userId);
      
      if (deleted) {
        console.log(`✅ Agente ${agentId} eliminado exitosamente de ElevenLabs y BD local`);
        
        return res.status(200).json({
          success: true,
          message: 'Agente eliminado exitosamente',
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`⚠️ Agente eliminado de ElevenLabs pero no se pudo eliminar de BD local`);
        
        return res.status(200).json({
          success: true,
          message: 'Agente eliminado de ElevenLabs (hubo un problema al eliminarlo de BD local)',
          warning: 'El agente fue eliminado de ElevenLabs pero puede quedar registro en BD local',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error('❌ Error eliminando agente:', result.error);
      
      return res.status(400).json({
        success: false,
        message: 'Error al eliminar agente en ElevenLabs',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en deleteAgentById:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Endpoint para prueba rápida de llamada
 * POST /api/agents/test-call
 * Permite hacer una llamada de prueba rápida con un agente
 */
const testCall = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    const {
      agent_id,
      agent_phone_number_id,
      recipient_name,
      recipient_phone_number,
      dynamic_variables = {}
    } = req.body;

    console.log('📞 === PRUEBA RÁPIDA DE LLAMADA ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 User ID:', userId);
    console.log('📥 Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Validaciones
    if (!agent_id) {
      return res.status(400).json({
        success: false,
        message: 'El campo "agent_id" es requerido',
        timestamp: new Date().toISOString()
      });
    }

    if (!recipient_phone_number) {
      return res.status(400).json({
        success: false,
        message: 'El campo "recipient_phone_number" es requerido',
        timestamp: new Date().toISOString()
      });
    }

    // Validar que el agente pertenezca al usuario
    const Agent = require('../models/Agent');
    const belongsToUser = await Agent.belongsToUser(agent_id, userId);
    
    if (!belongsToUser) {
      console.warn(`⚠️ Intento de uso no autorizado: Usuario ${userId} intentó usar el agente ${agent_id}`);
      
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El agente no pertenece al usuario autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener número de teléfono del agente si no se proporciona
    let finalPhoneNumberId = agent_phone_number_id;
    
    if (!finalPhoneNumberId) {
      console.log('⚠️ No se proporcionó agent_phone_number_id, obteniendo uno disponible...');
      const phoneResult = await elevenlabsService.getPhoneNumbers();
      
      if (phoneResult.success && phoneResult.phoneNumbers && phoneResult.phoneNumbers.length > 0) {
        const selectedPhone = phoneResult.phoneNumbers[0];
        finalPhoneNumberId = selectedPhone.phone_number_id || selectedPhone.id;
        console.log(`✅ Usando número disponible con ID: ${finalPhoneNumberId}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'No hay números de teléfono disponibles. Por favor, proporciona "agent_phone_number_id"',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Preparar datos para la llamada
    const callName = `Prueba Rápida - ${recipient_name || 'Sin nombre'} - ${new Date().toLocaleString()}`;
    
    const batchData = {
      callName: callName,
      agentId: agent_id,
      agentPhoneNumberId: finalPhoneNumberId,
      recipients: [
        {
          phone_number: recipient_phone_number,
          variables: {
            name: recipient_name || 'Cliente',
            ...dynamic_variables
          }
        }
      ],
      scheduledTimeUnix: null // Llamada inmediata
    };

    console.log('📤 Iniciando llamada de prueba...');
    console.log(`   Agente: ${agent_id}`);
    console.log(`   Número del agente: ${finalPhoneNumberId}`);
    console.log(`   Destinatario: ${recipient_phone_number}`);
    console.log(`   Nombre: ${recipient_name || 'Sin nombre'}`);
    console.log(`   Variables:`, JSON.stringify(batchData.recipients[0].variables));

    // Realizar la llamada
    const result = await elevenlabsService.submitBatchCall(batchData);

    if (result.success) {
      const batchId = result.data?.batch_id || result.data?.id;
      
      console.log(`✅ Llamada de prueba iniciada exitosamente`);
      console.log(`   Batch ID: ${batchId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Llamada de prueba iniciada exitosamente',
        data: {
          batch_id: batchId,
          agent_id: agent_id,
          agent_phone_number_id: finalPhoneNumberId,
          recipient: {
            name: recipient_name || 'Sin nombre',
            phone_number: recipient_phone_number,
            variables: batchData.recipients[0].variables
          },
          call_name: callName,
          scheduled_time: null, // Inmediata
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Error iniciando llamada de prueba:', result.error);
      
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar la llamada de prueba',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en testCall:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al realizar prueba de llamada',
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
  updateAgentById,
  deleteAgentById,
  testCall
};

