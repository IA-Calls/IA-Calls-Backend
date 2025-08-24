const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups');

// Middleware para autenticación (opcional, descomentar si se requiere)
// const { authenticate } = require('../middleware/auth');
// router.use(authenticate);

// Rutas para gestión de batch calls

// Consultar estado de un batch call específico (versión tradicional)
router.get('/:batchId/status', groupsController.getBatchCallStatus);

// Consultar estado de un batch call con Server-Sent Events (SSE)
router.get('/:batchId/status/stream', groupsController.getBatchCallStatusSSE);

// Listar todos los batch calls del workspace
router.get('/', groupsController.listBatchCalls);

// Reintentar llamadas fallidas de un batch call
router.post('/:batchId/retry', groupsController.retryBatchCall);

// Cancelar un batch call en curso
router.post('/:batchId/cancel', groupsController.cancelBatchCall);

module.exports = router;
