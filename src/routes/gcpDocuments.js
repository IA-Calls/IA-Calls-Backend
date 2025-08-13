const express = require('express');
const router = express.Router();
const gcpDocumentsController = require('../controllers/gcpDocuments');
const { authenticate } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Obtener todos los documentos (con filtros)
router.get('/', gcpDocumentsController.getAllDocuments);

// Obtener documentos del usuario autenticado
router.get('/my-documents', gcpDocumentsController.getMyDocuments);

// Obtener documentos por grupo
router.get('/group/:groupId', gcpDocumentsController.getDocumentsByGroup);

// Obtener documento por ID
router.get('/:id', gcpDocumentsController.getDocumentById);

// Subir documento sin grupo
router.post('/upload', gcpDocumentsController.uploadDocument);

// Generar y subir Excel procesado
router.post('/generate-excel', gcpDocumentsController.generateExcel);

// Actualizar documento
router.put('/:id', gcpDocumentsController.updateDocument);

// Eliminar documento
router.delete('/:id', gcpDocumentsController.deleteDocument);

module.exports = router;
