const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
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
            prompt: group.prompt,
            color: group.color,
            favorite: group.favorite,
            clientCount: pendingClients.length,
            clients: pendingClients
          };
        })
      );

      // Mostrar TODOS los grupos (no filtrar por clientes pendientes)
      const allGroups = groupsWithClients;

      // También obtener clientes pendientes que no están en ningún grupo
      const allPendingClients = await Client.findAll({ status: 'pending' });
      const clientsInGroups = new Set();
      
      allGroups.forEach(group => {
        group.clients.forEach(client => clientsInGroups.add(client.id));
      });

      const ungroupedClients = allPendingClients.filter(client => !clientsInGroups.has(client.id));

      // Si hay clientes sin grupo, agregarlos como un grupo especial
      if (ungroupedClients.length > 0) {
        allGroups.push({
          id: null,
          name: "Sin Grupo",
          description: "Clientes pendientes sin asignar a grupos",
          prompt: null,
          color: "#6B7280",
          favorite: false,
          clientCount: ungroupedClients.length,
          clients: ungroupedClients
        });
      }

      const totalPendingClients = allPendingClients.length;

      return res.json({
        success: true,
        data: allGroups,
        totalGroups: allGroups.length,
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
       data: [{
         id: null,
         name: "Clientes Externos",
         description: "Clientes obtenidos del servicio externo",
         prompt: null,
         color: "#3B82F6",
         favorite: false,
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
    const response = await fetch('https://369bbe0501eb.ngrok-free.app/outbound-call', {
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

// Endpoint para carga masiva de clientes desde Excel
app.post('/clients/upload-excel', async (req, res) => {
  const { groupId } = req.body;
  
  try {
    const Group = require('./models/Group');
    const Client = require('./models/Client');
    
    // Validar que el grupo existe si se proporciona
    let targetGroup = null;
    if (groupId) {
      targetGroup = await Group.findById(parseInt(groupId));
      if (!targetGroup) {
        return res.status(404).json({
          success: false,
          message: 'Grupo no encontrado'
        });
      }
    }

    // Hacer la petición al servicio externo
    const response = await fetch('https://excel-api-754698887417.us-central1.run.app/clients/upload-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body) // Reenviar el body original (archivo Excel)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Error en el servicio de carga masiva',
        detail: errorData
      });
    }

    const result = await response.json();
    
    // Si la carga fue exitosa y se especificó un grupo, asignar los clientes
    if (result.success && targetGroup && result.clients && Array.isArray(result.clients)) {
      const assignmentResults = await Promise.all(
        result.clients.map(async (clientData) => {
          try {
            // Buscar o crear el cliente en la base de datos local
            let client = await Client.findByExternalId(clientData.external_id || clientData._id);
            
            if (!client) {
              // Crear el cliente si no existe
              client = await Client.syncFromExternal(clientData);
            }
            
            // Asignar al grupo
            await targetGroup.addClient(client.id);
            
            return {
              success: true,
              clientId: client.id,
              clientName: client.name,
              action: 'assigned_to_group'
            };
          } catch (error) {
            return {
              success: false,
              clientName: clientData.name || 'Cliente desconocido',
              error: error.message
            };
          }
        })
      );

      const successCount = assignmentResults.filter(r => r.success).length;
      const errorCount = assignmentResults.filter(r => !r.success).length;

      return res.json({
        success: true,
        message: `Carga masiva completada y ${successCount} clientes asignados al grupo "${targetGroup.name}"`,
        data: {
          ...result,
          groupAssignment: {
            groupId: targetGroup.id,
            groupName: targetGroup.name,
            totalClients: result.clients.length,
            successfullyAssigned: successCount,
            assignmentErrors: errorCount,
            assignmentDetails: assignmentResults
          }
        }
      });
    }

    // Si no se especificó grupo, solo devolver el resultado original
    return res.json({
      success: true,
      message: 'Carga masiva completada (sin asignación a grupo)',
      data: result
    });

  } catch (error) {
    console.error('Error en carga masiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el proxy de carga masiva',
      detail: error.message
    });
  }
});

// Configurar multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir archivos Excel
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  }
});

// Endpoint para extracción de datos desde Excel
app.post('/clients/extract-excel', upload.single('file'), async (req, res) => {
  try {
    const Group = require('./models/Group');
    const Client = require('./models/Client');
    
    // Validar que el archivo se subió
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Archivo Excel requerido'
      });
    }

    const { groupId } = req.body;
    const filename = req.file.originalname;

    // Validar que el grupo existe si se proporciona
    let targetGroup = null;
    if (groupId) {
      targetGroup = await Group.findById(parseInt(groupId));
      if (!targetGroup) {
        return res.status(404).json({
          success: false,
          message: 'Grupo no encontrado'
        });
      }
    }

    // Procesar el archivo Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Tomar la primera hoja
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El archivo Excel debe tener al menos una fila de encabezados y una fila de datos'
      });
    }

    // Extraer encabezados (primera fila)
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    // Mapear columnas esperadas
    const columnMapping = {
      name: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('nombre') || h.toLowerCase().includes('name'))
      ),
      phone: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('telefono') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('teléfono'))
      ),
      email: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('email') || h.toLowerCase().includes('correo'))
      ),
      address: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('direccion') || h.toLowerCase().includes('address') || h.toLowerCase().includes('dirección'))
      ),
      category: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('categoria') || h.toLowerCase().includes('category') || h.toLowerCase().includes('categoría'))
      ),
      review: headers.findIndex(h => 
        h && typeof h === 'string' && 
        (h.toLowerCase().includes('review') || h.toLowerCase().includes('comentario') || h.toLowerCase().includes('nota'))
      )
    };

    // Procesar cada fila de datos
    const extractedClients = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Saltar filas vacías
      if (!row || row.every(cell => !cell)) continue;

      try {
        const clientData = {
          name: columnMapping.name >= 0 ? (row[columnMapping.name] || '') : '',
          phone: columnMapping.phone >= 0 ? (row[columnMapping.phone] || '') : '',
          email: columnMapping.email >= 0 ? (row[columnMapping.email] || '') : '',
          address: columnMapping.address >= 0 ? (row[columnMapping.address] || '') : '',
          category: columnMapping.category >= 0 ? (row[columnMapping.category] || 'General') : 'General',
          review: columnMapping.review >= 0 ? (row[columnMapping.review] || '') : '',
          status: 'pending',
          metadata: {
            source: 'excel_upload',
            filename: filename,
            row: i + 2, // +2 porque empezamos desde la fila 2 (después de encabezados)
            extracted_at: new Date().toISOString()
          }
        };

        // Validar datos mínimos
        if (!clientData.name || !clientData.phone) {
          errors.push({
            row: i + 2,
            data: clientData,
            error: 'Nombre y teléfono son requeridos'
          });
          continue;
        }

        extractedClients.push(clientData);
      } catch (error) {
        errors.push({
          row: i + 2,
          data: row,
          error: error.message
        });
      }
    }

    // Crear los clientes en la base de datos
    const createdClients = [];
    const creationErrors = [];

    for (const clientData of extractedClients) {
      try {
        // Verificar si el cliente ya existe por teléfono
        let existingClient = await Client.findByPhone(clientData.phone);
        
        if (existingClient) {
          // Actualizar cliente existente
          await existingClient.update(clientData);
          createdClients.push({
            ...existingClient.toJSON(),
            action: 'updated'
          });
        } else {
          // Crear nuevo cliente
          const newClient = await Client.create(clientData);
          createdClients.push({
            ...newClient.toJSON(),
            action: 'created'
          });
        }
      } catch (error) {
        creationErrors.push({
          clientData,
          error: error.message
        });
      }
    }

    // Si se especificó un grupo, asignar los clientes creados
    let assignmentResults = [];
    if (targetGroup && createdClients.length > 0) {
      assignmentResults = await Promise.all(
        createdClients.map(async (client) => {
          try {
            await targetGroup.addClient(client.id);
            return {
              success: true,
              clientId: client.id,
              clientName: client.name,
              action: 'assigned_to_group'
            };
          } catch (error) {
            return {
              success: false,
              clientId: client.id,
              clientName: client.name,
              error: error.message
            };
          }
        })
      );
    }

    const successCount = assignmentResults.filter(r => r.success).length;
    const assignmentErrors = assignmentResults.filter(r => !r.success).length;

    return res.json({
      success: true,
      message: `Extracción completada: ${createdClients.length} clientes procesados${targetGroup ? `, ${successCount} asignados al grupo "${targetGroup.name}"` : ''}`,
      data: {
        filename,
        totalRows: dataRows.length,
        totalExtracted: extractedClients.length,
        successfullyProcessed: createdClients.length,
        processingErrors: creationErrors.length,
        parsingErrors: errors.length,
        clients: createdClients,
        errors: [...errors, ...creationErrors],
        groupAssignment: targetGroup ? {
          groupId: targetGroup.id,
          groupName: targetGroup.name,
          totalClients: createdClients.length,
          successfullyAssigned: successCount,
          assignmentErrors: assignmentErrors,
          assignmentDetails: assignmentResults
        } : null
      }
    });

  } catch (error) {
    console.error('Error en extracción de Excel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la extracción de datos',
      detail: error.message
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
