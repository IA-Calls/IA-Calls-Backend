const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups');

// Middleware para autenticación (opcional, descomentar si se requiere)
// const { authenticate } = require('../middleware/auth');
// router.use(authenticate);

// Rutas para gestión de batch calls

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

// Listar todos los batch calls del workspace (debe ir primero para evitar conflictos)
router.get('/', groupsController.listBatchCalls);

// Consultar estado de un batch call con Server-Sent Events (SSE)
router.get('/:batchId/status/stream', groupsController.getBatchCallStatusSSE);

// Consultar estado de un batch call específico (versión tradicional)
router.get('/:batchId/status', groupsController.getBatchCallStatus);

// Reintentar llamadas fallidas de un batch call
router.post('/:batchId/retry', groupsController.retryBatchCall);

// Cancelar un batch call en curso
router.post('/:batchId/cancel', groupsController.cancelBatchCall);

// Rutas para gestión de audios

// Listar audios de conversaciones de un usuario
router.get('/audios/user/:userId', groupsController.listUserConversationAudios);

// Generar URL de descarga para un audio específico
router.get('/audios/download/:fileName', groupsController.generateAudioDownloadUrl);

module.exports = router;
