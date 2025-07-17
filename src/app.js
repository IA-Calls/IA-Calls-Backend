const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// Importar rutas
const indexRoutes = require('./routes/index');

// Crear aplicación Express
const app = express();

// Middleware de seguridad
app.use(helmet());

// Configurar CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Parsear JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, '../public')));

// Ruta personalizada
app.get('/clients/pending', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  try {
    const response = await fetch(`https://calls-service-754698887417.us-central1.run.app/clients/pending?page=${page}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
});

app.post('/calls/outbound', async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido' });
  }

  try {
    const response = await fetch('https://twilio-call-754698887417.us-central1.run.app/outbound-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Si tu API necesita autenticación:
        // Authorization: `Bearer ${process.env.TWILIO_API_KEY}`
      },
      body: JSON.stringify({ number })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: result.message || 'Error en la API externa',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[proxy] Error al hacer llamada saliente:', err);
    return res.status(500).json({
      success: false,
      message: 'Error en el proxy',
      detail: err.message,
    });
  }
});

// Rutas principales
app.use('/api', indexRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🚀 IA Calls Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

module.exports = app;
