const express = require('express');
const router = express.Router();

// Importar controladores
const { getStatus, getHealth } = require('../controllers/index');

// Importar rutas de autenticación
const authRoutes = require('./auth');

// Importar rutas de usuarios
const userRoutes = require('./users');

// Importar middleware
const { authenticate } = require('../middleware/auth');

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas públicas
router.get('/status', getStatus);
router.get('/health', getHealth);

// Ejemplo de ruta POST pública
router.post('/example', (req, res) => {
  res.json({
    success: true,
    message: 'Ruta POST de ejemplo (pública)',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Ejemplo de ruta protegida
router.get('/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Ruta protegida - acceso exitoso',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Ruta para obtener información del usuario actual
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Información del usuario actual',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 