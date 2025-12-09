const KnowledgeItem = require('../models/KnowledgeItem');
const WhatsAppAgent = require('../models/WhatsAppAgent');
const knowledgeProcessor = require('../services/knowledgeProcessor');
const knowledgeAgentIntegration = require('../services/knowledgeAgentIntegration');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de archivos
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, Word, Excel e imágenes'));
    }
  }
});

class KnowledgeItemsController {
  /**
   * Crear nuevo elemento de conocimiento (link)
   * POST /api/knowledge-items
   */
  async createKnowledgeItem(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const {
        name,
        type,
        url,
        link_type,
        link_title,
        link_description,
        triggers = [],
        conversation_types = [],
        priority = 5,
        usage_context,
        usage_instructions,
        agent_id
      } = req.body;

      // Validaciones
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Los campos "name" y "type" son requeridos'
        });
      }

      if (!['link', 'document'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'type debe ser "link" o "document"'
        });
      }

      if (type === 'link' && !url) {
        return res.status(400).json({
          success: false,
          error: 'El campo "url" es requerido para elementos de tipo "link"'
        });
      }

      console.log(`📝 Creando elemento de conocimiento: ${name} (${type})`);
      console.log(`👤 Usuario: ${userId}`);

      // Crear elemento
      const knowledgeItem = await KnowledgeItem.create({
        user_id: userId,
        name,
        type,
        url,
        link_type,
        link_title,
        link_description,
        triggers: Array.isArray(triggers) ? triggers : [],
        conversation_types: Array.isArray(conversation_types) ? conversation_types : [],
        priority: Math.max(1, Math.min(10, parseInt(priority) || 5)),
        usage_context,
        usage_instructions,
        agent_id
      });

      // Si es un link, procesarlo automáticamente
      if (type === 'link') {
        this.processKnowledgeItem(knowledgeItem.id, userId).catch(err => {
          console.error(`❌ Error procesando elemento ${knowledgeItem.id}:`, err);
        });
      }

      res.status(201).json({
        success: true,
        message: type === 'link' 
          ? 'Elemento de conocimiento creado exitosamente. Procesando enlace...'
          : 'Elemento de conocimiento creado exitosamente',
        data: knowledgeItem.toJSON()
      });

    } catch (error) {
      console.error('❌ Error creando elemento de conocimiento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error creando elemento de conocimiento',
        details: error.message
      });
    }
  }

  /**
   * Subir documento
   * POST /api/knowledge-items/upload
   */
  async uploadDocument(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Archivo requerido'
        });
      }

      const { 
        name, 
        triggers = [],
        conversation_types = [],
        priority = 5,
        usage_context,
        usage_instructions,
        agent_id 
      } = req.body;

      const file = req.file;

      // Determinar tipo de documento según extensión
      const ext = path.extname(file.originalname).toLowerCase();
      let documentType;
      if (ext === '.pdf') {
        documentType = 'pdf';
      } else if (ext === '.docx' || ext === '.doc') {
        documentType = 'word';
      } else if (ext === '.xlsx' || ext === '.xls') {
        documentType = 'excel';
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        documentType = 'image';
      } else {
        documentType = 'other';
      }

      console.log(`📤 Subiendo documento: ${file.originalname} (${documentType})`);

      // Subir a Google Cloud Storage
      const destinationName = `${userId}/${Date.now()}_${file.originalname}`;
      const uploadResult = await knowledgeProcessor.uploadToGCS(
        file.path,
        destinationName,
        userId
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Error subiendo archivo a Google Cloud Storage',
          details: uploadResult.error
        });
      }

      // Crear registro en BD
      const knowledgeItem = await KnowledgeItem.create({
        user_id: userId,
        name: name || file.originalname,
        type: 'document',
        file_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        file_mime_type: file.mimetype,
        gcs_bucket: uploadResult.bucket,
        gcs_object_name: uploadResult.objectName,
        document_type: documentType,
        triggers: Array.isArray(triggers) ? triggers : (typeof triggers === 'string' ? JSON.parse(triggers) : []),
        conversation_types: Array.isArray(conversation_types) ? conversation_types : (typeof conversation_types === 'string' ? JSON.parse(conversation_types) : []),
        priority: Math.max(1, Math.min(10, parseInt(priority) || 5)),
        usage_context,
        usage_instructions,
        agent_id
      });

      // Procesar documento en background
      this.processKnowledgeItem(knowledgeItem.id, userId).catch(err => {
        console.error(`❌ Error procesando elemento ${knowledgeItem.id}:`, err);
      });

      res.status(201).json({
        success: true,
        message: 'Documento subido exitosamente. Procesando...',
        data: {
          ...knowledgeItem.toJSON(),
          extraction_status: 'processing'
        }
      });

    } catch (error) {
      console.error('❌ Error subiendo documento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error subiendo documento',
        details: error.message
      });
    }
  }

  /**
   * Listar elementos de conocimiento del usuario
   * GET /api/knowledge-items
   */
  async listKnowledgeItems(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { type, agent_id, is_active, extraction_status, search } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (agent_id) filters.agent_id = agent_id;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (extraction_status) filters.extraction_status = extraction_status;
      if (search) filters.search = search;

      const items = await KnowledgeItem.findByUserId(userId, filters);

      res.status(200).json({
        success: true,
        data: items.map(item => item.toJSON()),
        total: items.length
      });

    } catch (error) {
      console.error('❌ Error listando elementos:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo elementos de conocimiento',
        details: error.message
      });
    }
  }

  /**
   * Obtener elemento específico
   * GET /api/knowledge-items/:id
   */
  async getKnowledgeItem(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const item = await KnowledgeItem.findByIdAndUserId(id, userId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Elemento de conocimiento no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: item.toJSON()
      });

    } catch (error) {
      console.error('❌ Error obteniendo elemento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo elemento de conocimiento',
        details: error.message
      });
    }
  }

  /**
   * Actualizar elemento de conocimiento
   * PUT /api/knowledge-items/:id
   */
  async updateKnowledgeItem(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const updates = req.body;

      // Validar ownership
      const belongsToUser = await KnowledgeItem.belongsToUser(id, userId);
      if (!belongsToUser) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: El elemento no pertenece al usuario autenticado'
        });
      }

      const updated = await KnowledgeItem.update(id, userId, updates);

      res.status(200).json({
        success: true,
        message: 'Elemento de conocimiento actualizado exitosamente',
        data: updated.toJSON()
      });

    } catch (error) {
      console.error('❌ Error actualizando elemento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error actualizando elemento de conocimiento',
        details: error.message
      });
    }
  }

  /**
   * Procesar elemento de conocimiento
   * POST /api/knowledge-items/:id/process
   */
  async processKnowledgeItem(id, userId) {
    try {
      const item = await KnowledgeItem.findByIdAndUserId(id, userId);
      
      if (!item) {
        throw new Error('Elemento de conocimiento no encontrado');
      }

      // Actualizar estado a procesando
      await KnowledgeItem.update(id, userId, {
        extraction_status: 'processing',
        error_message: null
      });

      let processedResult;

      // Procesar según el tipo
      if (item.type === 'link') {
        processedResult = await knowledgeProcessor.processLink(item.url, item.linkType);
      } else if (item.type === 'document') {
        switch (item.documentType) {
          case 'pdf':
            processedResult = await knowledgeProcessor.processPDF(item.filePath, item.gcsObjectName);
            break;
          case 'word':
            processedResult = await knowledgeProcessor.processWord(item.filePath, item.gcsObjectName);
            break;
          case 'excel':
            processedResult = await knowledgeProcessor.processExcel(item.filePath, item.gcsObjectName);
            break;
          case 'image':
            processedResult = await knowledgeProcessor.processImage(item.filePath, item.gcsObjectName);
            break;
          default:
            throw new Error(`Tipo de documento no soportado: ${item.documentType}`);
        }
      } else {
        throw new Error(`Tipo de elemento no soportado: ${item.type}`);
      }

      if (!processedResult.success) {
        throw new Error(processedResult.error);
      }

      // Normalizar para Agent Builder
      const normalizedResult = knowledgeProcessor.normalizeForAgentBuilder(item, processedResult.data);

      if (!normalizedResult.success) {
        throw new Error(normalizedResult.error);
      }

      // Actualizar elemento con datos procesados
      await KnowledgeItem.update(id, userId, {
        extraction_status: 'completed',
        processed_content: processedResult.data.text || processedResult.data.processed_content || '',
        processed_data: {
          raw: processedResult.data,
          normalized: normalizedResult.normalized
        },
        processed_at: new Date()
      });

      console.log(`✅ Elemento ${id} procesado exitosamente`);

      return {
        success: true,
        data: normalizedResult.normalized
      };
    } catch (error) {
      console.error(`❌ Error procesando elemento ${id}:`, error.message);
      
      // Actualizar estado a fallido
      await KnowledgeItem.update(id, userId, {
        extraction_status: 'failed',
        error_message: error.message
      }).catch(() => {});

      throw error;
    }
  }

  /**
   * Endpoint para procesar elemento
   * POST /api/knowledge-items/:id/process
   */
  async triggerProcess(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;

      // Validar ownership
      const belongsToUser = await KnowledgeItem.belongsToUser(id, userId);
      if (!belongsToUser) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: El elemento no pertenece al usuario autenticado'
        });
      }

      // Procesar en background
      this.processKnowledgeItem(id, userId).catch(err => {
        console.error(`❌ Error procesando elemento ${id}:`, err);
      });

      res.status(202).json({
        success: true,
        message: 'Procesamiento iniciado. El elemento se actualizará cuando termine.'
      });

    } catch (error) {
      console.error('❌ Error iniciando procesamiento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error iniciando procesamiento',
        details: error.message
      });
    }
  }

  /**
   * Sincronizar elemento con agente
   * POST /api/knowledge-items/:id/sync
   */
  async syncWithAgent(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const item = await KnowledgeItem.findByIdAndUserId(id, userId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Elemento de conocimiento no encontrado'
        });
      }

      if (item.extractionStatus !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'El elemento debe estar procesado antes de sincronizar'
        });
      }

      if (!item.agentId) {
        return res.status(400).json({
          success: false,
          error: 'El elemento no tiene un agente asignado'
        });
      }

      // Obtener datos normalizados
      const normalized = item.processedData?.normalized;
      if (!normalized) {
        return res.status(400).json({
          success: false,
          error: 'El elemento no tiene datos normalizados'
        });
      }

      // Agregar al agente
      const result = await knowledgeAgentIntegration.addKnowledgeToAgent(
        item.agentId,
        normalized,
        item,
        userId
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      // Actualizar synced_at
      await KnowledgeItem.update(id, userId, {
        synced_at: new Date()
      });

      res.status(200).json({
        success: true,
        message: 'Elemento sincronizado exitosamente con el agente'
      });

    } catch (error) {
      console.error('❌ Error sincronizando elemento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error sincronizando elemento con agente',
        details: error.message
      });
    }
  }

  /**
   * Sincronizar todos los elementos de un agente
   * POST /api/knowledge-items/sync-agent/:agentId
   */
  async syncAllAgentKnowledge(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { agentId } = req.params;

      // Validar que el agente pertenezca al usuario
      const agent = await WhatsAppAgent.findById(agentId);
      
      if (!agent || agent.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: El agente no pertenece al usuario autenticado'
        });
      }

      const result = await knowledgeAgentIntegration.syncAgentKnowledge(agentId, userId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
        synced_count: result.synced_count
      });

    } catch (error) {
      console.error('❌ Error sincronizando conocimiento del agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error sincronizando conocimiento del agente',
        details: error.message
      });
    }
  }

  /**
   * Buscar conocimiento relevante por palabras clave
   * GET /api/knowledge-items/search
   */
  async searchKnowledge(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { keywords, agent_id } = req.query;

      if (!keywords) {
        return res.status(400).json({
          success: false,
          error: 'El parámetro "keywords" es requerido'
        });
      }

      // Convertir keywords a array
      const keywordsArray = typeof keywords === 'string' 
        ? keywords.split(',').map(k => k.trim().toLowerCase())
        : (Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()) : []);

      const result = await knowledgeAgentIntegration.findRelevantKnowledge(
        userId,
        keywordsArray,
        agent_id || null
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: result.items,
        count: result.count
      });

    } catch (error) {
      console.error('❌ Error buscando conocimiento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error buscando conocimiento relevante',
        details: error.message
      });
    }
  }

  /**
   * Eliminar elemento de conocimiento
   * DELETE /api/knowledge-items/:id
   */
  async deleteKnowledgeItem(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const deleted = await KnowledgeItem.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Elemento de conocimiento no encontrado o no pertenece al usuario'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Elemento de conocimiento eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando elemento:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error eliminando elemento de conocimiento',
        details: error.message
      });
    }
  }
}

module.exports = new KnowledgeItemsController();
module.exports.upload = upload.single('file');

