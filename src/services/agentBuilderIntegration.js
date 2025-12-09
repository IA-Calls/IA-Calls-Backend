/**
 * Servicio para integrar fuentes de información con Vertex AI Agent Builder
 * Agrega herramientas y contexto a los agentes de WhatsApp
 */

const { VertexAI } = require('@google-cloud/vertexai');
const axios = require('axios');

class AgentBuilderIntegration {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.vertexAI = null;
    this.initializeVertexAI();
  }

  initializeVertexAI() {
    try {
      if (!this.projectId) {
        console.error('❌ GOOGLE_CLOUD_PROJECT_ID no está configurado');
        return;
      }

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

      if (!credentials.private_key || !credentials.client_email) {
        console.error('❌ Credenciales de Service Account incompletas');
        return;
      }

      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location,
        googleAuthOptions: {
          credentials: credentials
        }
      });

      console.log('✅ Agent Builder Integration inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Agent Builder Integration:', error.message);
    }
  }

  /**
   * Agregar fuente de información como herramienta al agente
   * En Agent Builder, esto se hace agregando el contenido al system instruction
   * o como parte del contexto del agente
   * @param {string} agentId - UUID del agente (id de la tabla whatsapp_agents)
   * @param {Object} normalizedData - Datos normalizados de la fuente
   * @param {string} dataSourceName - Nombre de la fuente
   * @param {number} userId - ID del usuario (para validar ownership)
   */
  async addDataSourceToAgent(agentId, normalizedData, dataSourceName, userId) {
    try {
      console.log(`🔧 Agregando fuente de información al agente ${agentId}...`);

      // Obtener el agente de WhatsApp por UUID (id de la tabla)
      const WhatsAppAgent = require('../models/WhatsAppAgent');
      const agent = await WhatsAppAgent.findById(agentId);

      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      // Validar ownership
      if (agent.createdBy !== userId) {
        throw new Error('El agente no pertenece al usuario');
      }

      // Construir el nuevo instructor con la información de la fuente
      const dataSourceContext = `
=== Fuente de Información: ${dataSourceName} ===
Tipo: ${normalizedData.source_type}
Extraído: ${normalizedData.extracted_at}

Contenido:
${normalizedData.content}

${normalizedData.metadata ? `\nMetadatos:\n${JSON.stringify(normalizedData.metadata, null, 2)}` : ''}
=== Fin de Fuente de Información ===

`;

      // Agregar al instructor existente
      const updatedInstructor = agent.instructor + '\n\n' + dataSourceContext;

      // Actualizar el agente con el nuevo instructor
      await WhatsAppAgent.update(agent.id, {
        instructor: updatedInstructor
      }, userId);

      console.log(`✅ Fuente de información agregada al agente`);

      return {
        success: true,
        message: 'Fuente de información agregada exitosamente al agente'
      };
    } catch (error) {
      console.error('❌ Error agregando fuente al agente:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sincronizar todas las fuentes de un agente
   */
  async syncAgentDataSources(agentId, userId) {
    try {
      const DataSource = require('../models/DataSource');
      const dataSources = await DataSource.findByUserId(userId, {
        agent_id: agentId,
        status: 'completed'
      });

      console.log(`🔄 Sincronizando ${dataSources.length} fuentes con el agente ${agentId}...`);

      // Obtener el agente por UUID (id de la tabla whatsapp_agents)
      const WhatsAppAgent = require('../models/WhatsAppAgent');
      const agent = await WhatsAppAgent.findById(agentId);

      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      // Validar ownership
      if (agent.createdBy !== userId) {
        throw new Error('El agente no pertenece al usuario');
      }

      // Construir contexto consolidado de todas las fuentes
      let consolidatedContext = '\n\n=== Fuentes de Información Vinculadas ===\n\n';

      for (const dataSource of dataSources) {
        if (dataSource.processedData && dataSource.processedData.normalized) {
          const normalized = dataSource.processedData.normalized;
          consolidatedContext += `--- ${dataSource.name} (${normalized.source_type}) ---\n`;
          consolidatedContext += `${normalized.content}\n\n`;
        }
      }

      consolidatedContext += '=== Fin de Fuentes de Información ===\n';

      // Actualizar instructor del agente
      const updatedInstructor = agent.instructor + consolidatedContext;
      await WhatsAppAgent.update(agent.id, {
        instructor: updatedInstructor
      }, userId);

      // Actualizar synced_at de todas las fuentes
      for (const dataSource of dataSources) {
        await DataSource.update(dataSource.id, userId, {
          synced_at: new Date()
        });
      }

      console.log(`✅ ${dataSources.length} fuentes sincronizadas con el agente`);

      return {
        success: true,
        synced_count: dataSources.length,
        message: `${dataSources.length} fuentes sincronizadas exitosamente`
      };
    } catch (error) {
      console.error('❌ Error sincronizando fuentes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener token de acceso para API REST
   */
  async getAccessToken() {
    try {
      const { GoogleAuth } = require('google-auth-library');
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
        client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
      };

      const auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });

      const client = await auth.getClient();
      const token = await client.getAccessToken();
      return token.token;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error.message);
      throw error;
    }
  }
}

module.exports = new AgentBuilderIntegration();

