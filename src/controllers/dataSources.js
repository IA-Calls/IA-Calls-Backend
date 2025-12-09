const DataSource = require('../models/DataSource');
const dataSourceProcessor = require('../services/dataSourceProcessor');
const agentBuilderIntegration = require('../services/agentBuilderIntegration');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de archivos
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF y Excel (.xlsx, .xls)'));
    }
  }
});

class DataSourcesController {
  /**
   * Crear nueva fuente de información
   * POST /api/data-sources
   */
  async createDataSource(req, res) {
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
        // Base de datos
        db_host,
        db_port,
        db_name,
        db_user,
        db_password,
        db_type,
        // Google Sheet
        google_sheet_url,
        sheet_id,
        sheet_name,
        // Agente
        agent_id
      } = req.body;

      // Validaciones
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Los campos "name" y "type" son requeridos'
        });
      }

      if (!['database', 'excel', 'google_sheet', 'pdf'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo inválido. Debe ser: database, excel, google_sheet o pdf'
        });
      }

      console.log(`📝 Creando fuente de información: ${name} (${type})`);
      console.log(`👤 Usuario: ${userId}`);

      // Crear fuente de información
      const dataSource = await DataSource.create({
        user_id: userId,
        name,
        type,
        db_host,
        db_port: db_port ? parseInt(db_port) : null,
        db_name,
        db_user,
        db_password,
        db_type,
        google_sheet_url,
        sheet_id,
        sheet_name,
        agent_id
      });

      res.status(201).json({
        success: true,
        message: 'Fuente de información creada exitosamente',
        data: dataSource.toJSON()
      });

    } catch (error) {
      console.error('❌ Error creando fuente de información:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error creando fuente de información',
        details: error.message
      });
    }
  }

  /**
   * Subir archivo (Excel o PDF)
   * POST /api/data-sources/upload
   */
  async uploadFile(req, res) {
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

      const { name, agent_id } = req.body;
      const file = req.file;

      // Determinar tipo según extensión
      const ext = path.extname(file.originalname).toLowerCase();
      let type;
      if (ext === '.pdf') {
        type = 'pdf';
      } else if (ext === '.xlsx' || ext === '.xls') {
        type = 'excel';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Tipo de archivo no soportado'
        });
      }

      console.log(`📤 Subiendo archivo: ${file.originalname} (${type})`);

      // Subir a Google Cloud Storage
      const destinationName = `${userId}/${Date.now()}_${file.originalname}`;
      const uploadResult = await dataSourceProcessor.uploadToGCS(
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
      const dataSource = await DataSource.create({
        user_id: userId,
        name: name || file.originalname,
        type: type,
        file_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        file_mime_type: file.mimetype,
        gcs_bucket: uploadResult.bucket,
        gcs_object_name: uploadResult.objectName,
        agent_id
      });

      // Procesar archivo en background
      this.processDataSource(dataSource.id, userId).catch(err => {
        console.error(`❌ Error procesando fuente ${dataSource.id}:`, err);
      });

      res.status(201).json({
        success: true,
        message: 'Archivo subido exitosamente. Procesando...',
        data: {
          ...dataSource.toJSON(),
          status: 'processing'
        }
      });

    } catch (error) {
      console.error('❌ Error subiendo archivo:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error subiendo archivo',
        details: error.message
      });
    }
  }

  /**
   * Listar fuentes de información del usuario
   * GET /api/data-sources
   */
  async listDataSources(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { type, status, agent_id } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (agent_id) filters.agent_id = agent_id;

      const dataSources = await DataSource.findByUserId(userId, filters);

      res.status(200).json({
        success: true,
        data: dataSources.map(ds => ds.toJSON()),
        total: dataSources.length
      });

    } catch (error) {
      console.error('❌ Error listando fuentes:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo fuentes de información',
        details: error.message
      });
    }
  }

  /**
   * Obtener fuente específica
   * GET /api/data-sources/:id
   */
  async getDataSource(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const dataSource = await DataSource.findByIdAndUserId(id, userId);

      if (!dataSource) {
        return res.status(404).json({
          success: false,
          error: 'Fuente de información no encontrada'
        });
      }

      res.status(200).json({
        success: true,
        data: dataSource.toJSON()
      });

    } catch (error) {
      console.error('❌ Error obteniendo fuente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo fuente de información',
        details: error.message
      });
    }
  }

  /**
   * Actualizar fuente de información
   * PUT /api/data-sources/:id
   */
  async updateDataSource(req, res) {
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
      const belongsToUser = await DataSource.belongsToUser(id, userId);
      if (!belongsToUser) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: La fuente no pertenece al usuario autenticado'
        });
      }

      const updated = await DataSource.update(id, userId, updates);

      res.status(200).json({
        success: true,
        message: 'Fuente de información actualizada exitosamente',
        data: updated.toJSON()
      });

    } catch (error) {
      console.error('❌ Error actualizando fuente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error actualizando fuente de información',
        details: error.message
      });
    }
  }

  /**
   * Procesar fuente de información
   * POST /api/data-sources/:id/process
   */
  async processDataSource(id, userId) {
    try {
      const dataSource = await DataSource.findByIdAndUserId(id, userId);
      
      if (!dataSource) {
        throw new Error('Fuente de información no encontrada');
      }

      // Actualizar estado a procesando
      await DataSource.update(id, userId, {
        status: 'processing',
        error_message: null
      });

      let processedResult;

      // Procesar según el tipo
      switch (dataSource.type) {
        case 'pdf':
          processedResult = await dataSourceProcessor.processPDF(
            dataSource.filePath,
            dataSource.gcsObjectName
          );
          break;

        case 'excel':
          processedResult = await dataSourceProcessor.processExcel(
            dataSource.filePath,
            dataSource.gcsObjectName
          );
          break;

        case 'google_sheet':
          processedResult = await dataSourceProcessor.processGoogleSheet(
            dataSource.googleSheetUrl
          );
          break;

        case 'database':
          processedResult = await dataSourceProcessor.processDatabase(dataSource);
          break;

        default:
          throw new Error(`Tipo de fuente no soportado: ${dataSource.type}`);
      }

      if (!processedResult.success) {
        throw new Error(processedResult.error);
      }

      // Normalizar datos para Agent Builder
      const normalizedResult = dataSourceProcessor.normalizeForAgentBuilder(processedResult.data);

      if (!normalizedResult.success) {
        throw new Error(normalizedResult.error);
      }

      // Actualizar fuente con datos procesados
      await DataSource.update(id, userId, {
        status: 'completed',
        processed_data: {
          raw: processedResult.data,
          normalized: normalizedResult.normalized
        },
        processed_at: new Date()
      });

      console.log(`✅ Fuente ${id} procesada exitosamente`);

      return {
        success: true,
        data: normalizedResult.normalized
      };
    } catch (error) {
      console.error(`❌ Error procesando fuente ${id}:`, error.message);
      
      // Actualizar estado a fallido
      await DataSource.update(id, userId, {
        status: 'failed',
        error_message: error.message
      }).catch(() => {});

      throw error;
    }
  }

  /**
   * Endpoint para procesar fuente
   * POST /api/data-sources/:id/process
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
      const belongsToUser = await DataSource.belongsToUser(id, userId);
      if (!belongsToUser) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: La fuente no pertenece al usuario autenticado'
        });
      }

      // Procesar en background
      this.processDataSource(id, userId).catch(err => {
        console.error(`❌ Error procesando fuente ${id}:`, err);
      });

      res.status(202).json({
        success: true,
        message: 'Procesamiento iniciado. La fuente se actualizará cuando termine.'
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
   * Obtener bases de datos disponibles (para tipo database)
   * GET /api/data-sources/:id/databases
   */
  async getDatabases(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const dataSource = await DataSource.findByIdAndUserId(id, userId);

      if (!dataSource) {
        return res.status(404).json({
          success: false,
          error: 'Fuente de información no encontrada'
        });
      }

      if (dataSource.type !== 'database') {
        return res.status(400).json({
          success: false,
          error: 'Esta fuente no es de tipo base de datos'
        });
      }

      // Procesar para obtener bases de datos
      const result = await dataSourceProcessor.processDatabase(dataSource);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('❌ Error obteniendo bases de datos:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo bases de datos',
        details: error.message
      });
    }
  }

  /**
   * Sincronizar fuente con agente
   * POST /api/data-sources/:id/sync
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
      const dataSource = await DataSource.findByIdAndUserId(id, userId);

      if (!dataSource) {
        return res.status(404).json({
          success: false,
          error: 'Fuente de información no encontrada'
        });
      }

      if (dataSource.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'La fuente debe estar procesada antes de sincronizar'
        });
      }

      if (!dataSource.agentId) {
        return res.status(400).json({
          success: false,
          error: 'La fuente no tiene un agente asignado'
        });
      }

      // Agregar al agente
      const normalized = dataSource.processedData?.normalized;
      if (!normalized) {
        return res.status(400).json({
          success: false,
          error: 'La fuente no tiene datos normalizados'
        });
      }

      const result = await agentBuilderIntegration.addDataSourceToAgent(
        dataSource.agentId,
        normalized,
        dataSource.name,
        userId
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      // Actualizar synced_at
      await DataSource.update(id, userId, {
        synced_at: new Date(),
        status: 'synced'
      });

      res.status(200).json({
        success: true,
        message: 'Fuente sincronizada exitosamente con el agente'
      });

    } catch (error) {
      console.error('❌ Error sincronizando fuente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error sincronizando fuente con agente',
        details: error.message
      });
    }
  }

  /**
   * Sincronizar todas las fuentes de un agente
   * POST /api/data-sources/sync-agent/:agentId
   */
  async syncAllAgentSources(req, res) {
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
      const WhatsAppAgent = require('../models/WhatsAppAgent');
      const agent = await WhatsAppAgent.findByAgentId(agentId);
      
      if (!agent || agent.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado: El agente no pertenece al usuario autenticado'
        });
      }

      const result = await agentBuilderIntegration.syncAgentDataSources(agentId, userId);

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
      console.error('❌ Error sincronizando fuentes del agente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error sincronizando fuentes del agente',
        details: error.message
      });
    }
  }

  /**
   * Eliminar fuente de información
   * DELETE /api/data-sources/:id
   */
  async deleteDataSource(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const deleted = await DataSource.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Fuente de información no encontrada o no pertenece al usuario'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Fuente de información eliminada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando fuente:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error eliminando fuente de información',
        details: error.message
      });
    }
  }
}

module.exports = new DataSourcesController();
module.exports.upload = upload.single('file');

