const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups');

// Middleware para autenticación

// Ruta para descargar archivos procesados (debe ir antes de /:id para evitar conflictos)
router.get('/download/:fileName', groupsController.downloadProcessedFile);

// Ruta para preparar agente con información del grupo (debe ir antes de /:id para evitar conflictos)
router.post('/:id/prepare-agent', groupsController.prepareAgent);

// Rutas para batch calling (deben ir antes de /:id para evitar conflictos)
router.post('/:id/call', groupsController.startBatchCall);

// Rutas de tracking de llamadas (deben ir antes de /:id para evitar conflictos)
router.get('/:id/call-history', groupsController.getGroupCallHistory);
router.get('/:id/call-stats', groupsController.getGroupCallStats);
router.get('/:id/uncalled-clients', groupsController.getUncalledClients);
router.get('/:id/batch-status', groupsController.getGroupBatchStatus); // FLUJO OPTIMIZADO

// Rutas de grupos
router.get('/', groupsController.getGroups);
router.get('/:id', groupsController.getGroupById);
router.post('/', groupsController.createGroup);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

// Rutas para manejo de clientes en grupos
router.post('/:id/clients', groupsController.addClientToGroup);
router.get('/:id/clients/:client_id', groupsController.getClientInGroup);
router.put('/:id/clients/:client_id', groupsController.updateClientInGroup);
router.delete('/:id/clients/:client_id', groupsController.removeClientFromGroup);

module.exports = router; 