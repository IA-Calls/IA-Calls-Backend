/**
 * Servicio para integrar elementos de conocimiento con Vertex AI Agent Builder
 * Agrega conocimiento estructurado a los agentes de WhatsApp
 */

const WhatsAppAgent = require('../models/WhatsAppAgent');

class KnowledgeAgentIntegration {
  /**
   * Agregar elemento de conocimiento al agente
   * @param {string} agentId - UUID del agente (id de la tabla whatsapp_agents)
   * @param {Object} normalizedData - Datos normalizados del elemento
   * @param {Object} knowledgeItem - Elemento de conocimiento completo
   * @param {number} userId - ID del usuario
   */
  async addKnowledgeToAgent(agentId, normalizedData, knowledgeItem, userId) {
    try {
      console.log(`🔧 Agregando conocimiento al agente ${agentId}...`);

      // Obtener el agente por UUID
      const agent = await WhatsAppAgent.findById(agentId);

      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      // Validar ownership
      if (agent.createdBy !== userId) {
        throw new Error('El agente no pertenece al usuario');
      }

      // Construir contexto de conocimiento estructurado
      const knowledgeContext = this.buildKnowledgeContext(normalizedData, knowledgeItem);

      // Agregar al instructor existente
      const updatedInstructor = agent.instructor + '\n\n' + knowledgeContext;

      // Actualizar el agente
      await WhatsAppAgent.update(agent.id, {
        instructor: updatedInstructor
      }, userId);

      console.log(`✅ Conocimiento agregado al agente`);

      return {
        success: true,
        message: 'Elemento de conocimiento agregado exitosamente al agente'
      };
    } catch (error) {
      console.error('❌ Error agregando conocimiento al agente:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Construir contexto estructurado para el agente
   */
  buildKnowledgeContext(normalizedData, knowledgeItem) {
    let context = `\n=== Conocimiento: ${knowledgeItem.name} ===\n`;
    context += `Tipo: ${knowledgeItem.type}\n`;
    context += `Prioridad: ${normalizedData.priority}/10\n`;

    if (normalizedData.triggers && normalizedData.triggers.length > 0) {
      context += `Palabras clave: ${normalizedData.triggers.join(', ')}\n`;
    }

    if (normalizedData.conversation_types && normalizedData.conversation_types.length > 0) {
      context += `Usar en: ${normalizedData.conversation_types.join(', ')}\n`;
    }

    if (knowledgeItem.type === 'link') {
      context += `URL: ${normalizedData.url}\n`;
      context += `Tipo de enlace: ${normalizedData.link_type}\n`;
    }

    context += `\nContenido:\n${normalizedData.content}\n`;

    if (normalizedData.usage_instructions) {
      context += `\nInstrucciones de uso:\n${normalizedData.usage_instructions}\n`;
    }

    if (normalizedData.usage_context) {
      context += `\nContexto:\n${normalizedData.usage_context}\n`;
    }

    context += `=== Fin de Conocimiento ===\n`;

    return context;
  }

  /**
   * Sincronizar todos los elementos de conocimiento de un agente
   */
  async syncAgentKnowledge(agentId, userId) {
    try {
      const KnowledgeItem = require('../models/KnowledgeItem');
      const knowledgeItems = await KnowledgeItem.findByUserId(userId, {
        agent_id: agentId,
        extraction_status: 'completed',
        is_active: true
      });

      console.log(`🔄 Sincronizando ${knowledgeItems.length} elementos de conocimiento con el agente ${agentId}...`);

      // Obtener el agente por UUID
      const agent = await WhatsAppAgent.findById(agentId);

      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      // Validar ownership
      if (agent.createdBy !== userId) {
        throw new Error('El agente no pertenece al usuario');
      }

      // Construir contexto consolidado
      let consolidatedContext = '\n\n=== Base de Conocimiento Vinculada ===\n\n';

      // Ordenar por prioridad
      const sortedItems = knowledgeItems.sort((a, b) => b.priority - a.priority);

      for (const item of sortedItems) {
        if (item.processedData && item.processedData.normalized) {
          const normalized = item.processedData.normalized;
          consolidatedContext += this.buildKnowledgeContext(normalized, item);
          consolidatedContext += '\n';
        }
      }

      consolidatedContext += '=== Fin de Base de Conocimiento ===\n';

      // Actualizar instructor del agente
      const updatedInstructor = agent.instructor + consolidatedContext;
      await WhatsAppAgent.update(agent.id, {
        instructor: updatedInstructor
      }, userId);

      // Actualizar synced_at de todos los elementos
      for (const item of knowledgeItems) {
        await KnowledgeItem.update(item.id, userId, {
          synced_at: new Date()
        });
      }

      console.log(`✅ ${knowledgeItems.length} elementos sincronizados con el agente`);

      return {
        success: true,
        synced_count: knowledgeItems.length,
        message: `${knowledgeItems.length} elementos de conocimiento sincronizados exitosamente`
      };
    } catch (error) {
      console.error('❌ Error sincronizando conocimiento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar conocimiento relevante basado en palabras clave
   * Útil para sugerir conocimiento durante conversaciones
   */
  async findRelevantKnowledge(userId, keywords, agentId = null) {
    try {
      const KnowledgeItem = require('../models/KnowledgeItem');
      const relevantItems = await KnowledgeItem.findByTriggers(userId, keywords, agentId);

      return {
        success: true,
        items: relevantItems.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          priority: item.priority,
          content: item.processedContent?.substring(0, 200) || '', // Preview
          url: item.url,
          triggers: item.triggers
        })),
        count: relevantItems.length
      };
    } catch (error) {
      console.error('❌ Error buscando conocimiento relevante:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new KnowledgeAgentIntegration();

