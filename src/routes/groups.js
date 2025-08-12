const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups');

// Middleware para autenticación (opcional, descomentar si se requiere)
// const { authenticate } = require('../middleware/auth');
// router.use(authenticate);

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

// Ruta para descargar archivos procesados
router.get('/download/:fileName', groupsController.downloadProcessedFile);

module.exports = router; 