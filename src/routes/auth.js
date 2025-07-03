const express = require('express');
const router = express.Router();

// Importar controladores
const {
  register,
  login,
  verifyToken,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/auth');

// Importar middleware
const { authenticate } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.post('/register', register);
router.post('/login', login);
router.post('/verify-token', verifyToken);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// Ruta para logout (opcional, para limpiar en el frontend)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

module.exports = router; 