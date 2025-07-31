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

// Ruta personalizada mejorada con grupos
app.get('/clients/pending', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  try {
    const Group = require('./models/Group');
    const Client = require('./models/Client');
    
    // Obtener todos los grupos activos
    const groups = await Group.findAll();
    
    if (groups.length > 0) {
      // Para cada grupo, obtener sus clientes pendientes
      const groupsWithClients = await Promise.all(
        groups.map(async (group) => {
          // Obtener clientes pendientes del grupo
          const groupClients = await group.getClients({ 
            limit: 100 // Obtener todos los clientes del grupo
          });
          
          // Filtrar solo los clientes con status pending
          const pendingClients = groupClients.filter(client => client.status === 'pending');
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            color: group.color,
            clientCount: pendingClients.length,
            clients: pendingClients
          };
        })
      );

      // Filtrar grupos que tienen clientes pendientes
      const groupsWithPendingClients = groupsWithClients.filter(group => group.clientCount > 0);

      // También obtener clientes pendientes que no están en ningún grupo
      const allPendingClients = await Client.findAll({ status: 'pending' });
      const clientsInGroups = new Set();
      
      groupsWithPendingClients.forEach(group => {
        group.clients.forEach(client => clientsInGroups.add(client.id));
      });

      const ungroupedClients = allPendingClients.filter(client => !clientsInGroups.has(client.id));

      // Si hay clientes sin grupo, agregarlos como un grupo especial
      if (ungroupedClients.length > 0) {
        groupsWithPendingClients.push({
          id: null,
          name: "Sin Grupo",
          description: "Clientes pendientes sin asignar a grupos",
          color: "#6B7280",
          clientCount: ungroupedClients.length,
          clients: ungroupedClients
        });
      }

      const totalPendingClients = allPendingClients.length;

      return res.json({
        success: true,
        groups: groupsWithPendingClients,
        totalGroups: groupsWithPendingClients.length,
        totalClients: totalPendingClients,
        message: 'Datos locales organizados por grupos',
        source: 'local'
      });
    }

    // Si no hay grupos, usar el servicio externo como fallback
    const response = await fetch(`https://calls-service-754698887417.us-central1.run.app/clients/pending?page=${page}&limit=${limit}`);
    const data = await response.json();
    
    // Transformar la respuesta externa al formato esperado
    const transformedData = {
      success: true,
      groups: [{
        id: null,
        name: "Clientes Externos",
        description: "Clientes obtenidos del servicio externo",
        color: "#3B82F6",
        clientCount: data.clients ? data.clients.length : 0,
        clients: data.clients || []
      }],
      totalGroups: 1,
      totalClients: data.total || 0,
      message: 'Datos del servicio externo',
      source: 'external',
      pagination: {
        page: parseInt(page),
        size: parseInt(limit),
        total: data.total || 0
      }
    };
    
    res.json(transformedData);
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

// Ruta temporal para probar actualización de usuarios (sin autenticación)
app.put('/test-user-update/:id', async (req, res) => {
  try {
    const User = require('./models/User');
    const userId = parseInt(req.params.id);
    const updateData = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Validar campos únicos SOLO si se están cambiando
    if (updateData.username !== undefined && updateData.username !== user.username) {
      const existingUser = await User.findByUsername(updateData.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ success: false, message: 'Ya existe un usuario con este username' });
      }
    }

    if (updateData.email !== undefined && updateData.email !== user.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ success: false, message: 'Ya existe un usuario con este email' });
      }
    }

    // Actualizar usuario
    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser.toJSON()
    });

  } catch (error) {
    console.error('Error en test-user-update:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
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
