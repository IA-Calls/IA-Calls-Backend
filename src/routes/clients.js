const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients');

// Middleware para autenticación (opcional, descomentar si se requiere)
// const { authenticate } = require('../middleware/auth');
// router.use(authenticate);

// Rutas de clientes
router.get('/', clientsController.getClients);
router.get('/stats', clientsController.getClientStats);
router.get('/pending/:clientId', clientsController.getPendingClientsByClientId); // Nueva ruta
router.get('/:id', clientsController.getClientById);
router.post('/', clientsController.createClient);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

// Ruta para sincronizar clientes desde servicio externo
router.post('/sync', clientsController.syncClients);

module.exports = router; 