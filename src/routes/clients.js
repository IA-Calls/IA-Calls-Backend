const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients');
const groupsController = require('../controllers/groups');

// Middleware para autenticación (opcional, descomentar si se requiere)
// const { authenticate } = require('../middleware/auth');
// router.use(authenticate);

// Rutas de tracking para clientes específicos (deben ir antes de rutas generales)
router.get('/:clientId/call-history', groupsController.getClientCallHistory);
router.get('/:clientId/call-status', groupsController.checkClientCallStatus);

// Rutas de clientes interesados (DEBEN IR ANTES de /:id para evitar conflictos)
router.get('/interested', clientsController.getClientsInterested); // GET todos los clientes interesados
router.get('/interested/:id', clientsController.getClientInterestedById); // GET cliente interesado por ID
router.post('/interested', clientsController.createClientInterested); // POST crear cliente interesado

// Rutas de clientes
router.get('/', clientsController.getClients);
router.get('/stats', clientsController.getClientStats);
router.get('/pending/:clientId', clientsController.getPendingClientsByClientId); // Nueva ruta
router.get('/:id', clientsController.getClientById);
router.post('/', clientsController.createClient);
router.post('/simple', clientsController.createClientSimple); // Endpoint simple: solo nombre y número
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

// Ruta para sincronizar clientes desde servicio externo
router.post('/sync', clientsController.syncClients);

module.exports = router; 