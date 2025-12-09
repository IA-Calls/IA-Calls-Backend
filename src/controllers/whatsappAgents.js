const WhatsAppAgent = require('../models/WhatsAppAgent');
const vertexAIAgentService = require('../services/vertexAIDialogflowService');

class WhatsAppAgentsController {
  /**
   * Crear un nuevo agente para WhatsApp
   * POST /api/whatsapp/agents
   * 
   * MIGRACIÓN: Agent Builder (Generative AI)
   * - Ya no crea agentes en Dialogflow CX
   * - Solo guarda configuración en la BD local
   * - El instructor se usa como system instruction de Gemini
   */
  async createAgent(req, res) {
    try {
      // Validar autenticación
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const {
        name,
        instructor,
        language = 'es',
        initial_message,
        metadata = {}
      } = req.body;

      // Validaciones
      if (!name || !instructor) {
        return res.status(400).json({
          success: false,
          error: 'Los campos "name" e "instructor" son requeridos'
        });
      }

      console.log('🤖 Creando agente de WhatsApp con Agent Builder (Generative AI)...');
      console.log('👤 Usuario:', req.user?.username || 'No autenticado');
      console.log('🆔 User ID:', userId);
      console.log('📋 Configuración:', {
        name,
        language,
        instructor_length: instructor.length
      });

      // Generar ID único para el agente
      // En Agent Builder, el agente es solo configuración local
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Guardar agente en la base de datos con user_id
      const agent = await WhatsAppAgent.create({
        name,
        agent_id: agentId,
        instructor,
        text_only: true, // Siempre texto para WhatsApp
        voice_id: null,
        language,
        initial_message,
        created_by: userId, // Siempre usar el user_id del usuario autenticado
        metadata: {
          ...metadata,
          platform: 'agent-builder',
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
          created_via: 'api'
        }
      });

      console.log(`✅ Agente creado exitosamente: ${agent.id}`);

      res.status(201).json({
        success: true,
        message: 'Agente creado exitosamente con Agent Builder (Generative AI)',
        data: {
          id: agent.id,
          name: agent.name,
          agent_id: agent.agentId,
          instructor: agent.instructor,
          text_only: agent.textOnly,
          language: agent.language,
          initial_message: agent.initialMessage,
          platform: 'agent-builder',
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
          created_at: agent.createdAt
        },
        info: {
          note: 'Agent Builder no requiere entrenamiento. El agente está listo para usar inmediatamente.',
          usage: 'Asigna este agente a una conversación y comienza a enviar mensajes.'
        }
      });

    } catch (error) {
      console.error('❌ Error creando agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error creando agente',
        details: error.message
      });
    }
  }

  /**
   * Listar todos los agentes del usuario autenticado
   * GET /api/whatsapp/agents
   * Solo muestra agentes que pertenecen al usuario
   */
  async listAgents(req, res) {
    try {
      // Validar autenticación
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { active_only = 'true' } = req.query;
      const activeOnly = active_only === 'true';

      console.log('📋 Listando agentes de WhatsApp...');
      console.log('👤 Usuario:', req.user?.username || 'No autenticado');
      console.log('🆔 User ID:', userId);

      // Filtrar solo agentes del usuario autenticado
      const agents = await WhatsAppAgent.findByUserId(userId, activeOnly);

      res.status(200).json({
        success: true,
        data: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          agent_id: agent.agentId,
          instructor: agent.instructor,
          text_only: agent.textOnly,
          voice_id: agent.voiceId,
          language: agent.language,
          initial_message: agent.initialMessage,
          is_active: agent.isActive,
          created_by: agent.createdBy,
          created_at: agent.createdAt,
          updated_at: agent.updatedAt
        })),
        total: agents.length
      });

    } catch (error) {
      console.error('❌ Error listando agentes:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo agentes',
        details: error.message
      });
    }
  }

  /**
   * Obtener un agente específico
   * GET /api/whatsapp/agents/:id
   * Valida que el agente pertenezca al usuario autenticado
   */
  async getAgent(req, res) {
    try {
      // Validar autenticación
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;

      console.log('🔍 Obteniendo agente de WhatsApp...');
      console.log('👤 Usuario:', req.user?.username || 'No autenticado');
      console.log('🆔 User ID:', userId);
      console.log('🆔 Agent ID:', id);

      const agent = await WhatsAppAgent.findById(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agente no encontrado'
        });
      }

      // Validar ownership
      const belongsToUser = await WhatsAppAgent.belongsToUser(id, userId);
      
      if (!belongsToUser) {
        console.warn(`⚠️ Intento de acceso no autorizado: Usuario ${userId} intentó acceder al agente ${id}`);
        
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: El agente no pertenece al usuario autenticado'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          agent_id: agent.agentId,
          instructor: agent.instructor,
          text_only: agent.textOnly,
          voice_id: agent.voiceId,
          language: agent.language,
          initial_message: agent.initialMessage,
          is_active: agent.isActive,
          created_by: agent.createdBy,
          metadata: agent.metadata,
          created_at: agent.createdAt,
          updated_at: agent.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo agente',
        details: error.message
      });
    }
  }

  /**
   * Actualizar un agente
   * PUT /api/whatsapp/agents/:id
   * Valida que el agente pertenezca al usuario autenticado
   */
  async updateAgent(req, res) {
    try {
      // Validar autenticación
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const updates = req.body;

      console.log('🔄 Actualizando agente de WhatsApp...');
      console.log('👤 Usuario:', req.user?.username || 'No autenticado');
      console.log('🆔 User ID:', userId);
      console.log('🆔 Agent ID:', id);

      // Validar que el agente existe y pertenece al usuario
      const belongsToUser = await WhatsAppAgent.belongsToUser(id, userId);
      
      if (!belongsToUser) {
        // Verificar si existe pero no pertenece al usuario
        const agent = await WhatsAppAgent.findById(id);
        if (agent) {
          console.warn(`⚠️ Intento de actualización no autorizada: Usuario ${userId} intentó actualizar el agente ${id}`);
          
          return res.status(403).json({
            success: false,
            error: 'Acceso denegado: El agente no pertenece al usuario autenticado'
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'Agente no encontrado'
          });
        }
      }

      // Si se actualiza el instructor, también actualizar en Vertex AI
      if (updates.instructor) {
        // Nota: Vertex AI Agent Builder usa el instructor como system instruction
        // Por ahora solo actualizamos en la BD
        console.log('⚠️ Actualización de instructor: Se actualizará en la próxima conversación');
      }

      // Actualizar con validación de user_id
      const updatedAgent = await WhatsAppAgent.update(id, updates, userId);

      if (!updatedAgent) {
        return res.status(404).json({
          success: false,
          error: 'Agente no encontrado o no se pudo actualizar'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Agente actualizado exitosamente',
        data: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          agent_id: updatedAgent.agentId,
          instructor: updatedAgent.instructor,
          text_only: updatedAgent.textOnly,
          updated_at: updatedAgent.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error actualizando agente',
        details: error.message
      });
    }
  }

  /**
   * Eliminar (desactivar) un agente
   * DELETE /api/whatsapp/agents/:id
   * Valida que el agente pertenezca al usuario autenticado
   */
  async deleteAgent(req, res) {
    try {
      // Validar autenticación
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;

      console.log('🗑️ Eliminando agente de WhatsApp...');
      console.log('👤 Usuario:', req.user?.username || 'No autenticado');
      console.log('🆔 User ID:', userId);
      console.log('🆔 Agent ID:', id);

      // Validar que el agente existe y pertenece al usuario
      const belongsToUser = await WhatsAppAgent.belongsToUser(id, userId);
      
      if (!belongsToUser) {
        // Verificar si existe pero no pertenece al usuario
        const agent = await WhatsAppAgent.findById(id);
        if (agent) {
          console.warn(`⚠️ Intento de eliminación no autorizada: Usuario ${userId} intentó eliminar el agente ${id}`);
          
          return res.status(403).json({
            success: false,
            error: 'Acceso denegado: El agente no pertenece al usuario autenticado'
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'Agente no encontrado'
          });
        }
      }

      // Desactivar con validación de user_id
      const deletedAgent = await WhatsAppAgent.delete(id, userId);

      if (!deletedAgent) {
        return res.status(404).json({
          success: false,
          error: 'Agente no encontrado o no se pudo desactivar'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Agente desactivado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error eliminando agente',
        details: error.message
      });
    }
  }
}

module.exports = WhatsAppAgentsController;

