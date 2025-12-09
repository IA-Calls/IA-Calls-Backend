const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const knowledgeItemsController = require('../controllers/knowledgeItems');

// Todas las rutas requieren autenticación
router.use(authenticate);

// POST /api/knowledge-items - Crear nuevo elemento de conocimiento (link)
router.post('/', knowledgeItemsController.createKnowledgeItem.bind(knowledgeItemsController));

// POST /api/knowledge-items/upload - Subir documento
router.post('/upload', knowledgeItemsController.upload, knowledgeItemsController.uploadDocument.bind(knowledgeItemsController));

// GET /api/knowledge-items - Listar elementos del usuario
router.get('/', knowledgeItemsController.listKnowledgeItems.bind(knowledgeItemsController));

// GET /api/knowledge-items/search - Buscar conocimiento por palabras clave
router.get('/search', knowledgeItemsController.searchKnowledge.bind(knowledgeItemsController));

// GET /api/knowledge-items/:id - Obtener elemento específico
router.get('/:id', knowledgeItemsController.getKnowledgeItem.bind(knowledgeItemsController));

// PUT /api/knowledge-items/:id - Actualizar elemento
router.put('/:id', knowledgeItemsController.updateKnowledgeItem.bind(knowledgeItemsController));

// POST /api/knowledge-items/:id/process - Procesar elemento
router.post('/:id/process', knowledgeItemsController.triggerProcess.bind(knowledgeItemsController));

// POST /api/knowledge-items/:id/sync - Sincronizar elemento con agente
router.post('/:id/sync', knowledgeItemsController.syncWithAgent.bind(knowledgeItemsController));

// POST /api/knowledge-items/sync-agent/:agentId - Sincronizar todos los elementos de un agente
router.post('/sync-agent/:agentId', knowledgeItemsController.syncAllAgentKnowledge.bind(knowledgeItemsController));

// DELETE /api/knowledge-items/:id - Eliminar elemento
router.delete('/:id', knowledgeItemsController.deleteKnowledgeItem.bind(knowledgeItemsController));

module.exports = router;

