const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dataSourcesController = require('../controllers/dataSources');

// Todas las rutas requieren autenticación
router.use(authenticate);

// POST /api/data-sources - Crear nueva fuente de información
router.post('/', dataSourcesController.createDataSource.bind(dataSourcesController));

// POST /api/data-sources/upload - Subir archivo (Excel o PDF)
router.post('/upload', dataSourcesController.upload, dataSourcesController.uploadFile.bind(dataSourcesController));

// GET /api/data-sources - Listar fuentes del usuario
router.get('/', dataSourcesController.listDataSources.bind(dataSourcesController));

// GET /api/data-sources/:id - Obtener fuente específica
router.get('/:id', dataSourcesController.getDataSource.bind(dataSourcesController));

// PUT /api/data-sources/:id - Actualizar fuente de información
router.put('/:id', dataSourcesController.updateDataSource.bind(dataSourcesController));

// POST /api/data-sources/:id/process - Procesar fuente de información
router.post('/:id/process', dataSourcesController.triggerProcess.bind(dataSourcesController));

// GET /api/data-sources/:id/databases - Obtener bases de datos disponibles (solo para tipo database)
router.get('/:id/databases', dataSourcesController.getDatabases.bind(dataSourcesController));

// POST /api/data-sources/:id/sync - Sincronizar fuente con agente
router.post('/:id/sync', dataSourcesController.syncWithAgent.bind(dataSourcesController));

// POST /api/data-sources/sync-agent/:agentId - Sincronizar todas las fuentes de un agente
router.post('/sync-agent/:agentId', dataSourcesController.syncAllAgentSources.bind(dataSourcesController));

// DELETE /api/data-sources/:id - Eliminar fuente de información
router.delete('/:id', dataSourcesController.deleteDataSource.bind(dataSourcesController));

module.exports = router;

