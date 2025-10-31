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
  origin: function (origin, callback) {
    // Lista de orígenes permitidos desde variables de entorno
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://ia-calls.vercel.app',
      'https://gb334706-5000.use2.devtunnels.ms', // Agregar la URL del backend también
      // Agregar más URLs aquí si es necesario
      ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : [])
    ];
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Middleware específico para manejar OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔍 OPTIONS request detectado para: ${req.path}`);
    console.log(`📋 Headers de la request:`, req.headers);
    
    // Configurar headers de CORS para OPTIONS
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Responder inmediatamente a OPTIONS
    return res.status(200).end();
  }
  next();
});

// Logging simplificado - solo endpoint y método
app.use(morgan(':method :url :status'));

// Parsear JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, '../public')));

// Servir archivos locales en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  console.log('📁 Servidor de archivos locales habilitado: /uploads');
}

// Función para obtener clientes pendientes sin filtro
const getPendingClients = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  try {
    const Group = require('./models/Group');
    const Client = require('./models/Client');
    
    // Obtener el ID del usuario autenticado
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Obtener grupos del usuario autenticado
    const groups = await Group.findAll({ userId: userId });
    
    if (groups.length > 0) {
      // Para cada grupo del usuario, obtener sus clientes pendientes
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
            createdByClient: group.createdByClient, // Incluir el campo created-by
            clientCount: pendingClients.length,
            clients: pendingClients
          };
        })
      );

      // Mostrar solo los grupos del usuario
      const userGroups = groupsWithClients;

      // Solo contar clientes de los grupos del usuario
      const totalPendingClients = userGroups.reduce((total, group) => total + group.clientCount, 0);

      return res.json({
        success: true,
        data: userGroups,
        totalGroups: userGroups.length,
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
        createdByClient: null, // Campo created-by para datos externos
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
};

// Función para obtener clientes pendientes con filtro de cliente
const getPendingClientsByClientId = async (req, res) => {
  const { clientId } = req.params;
  const { page = 1, limit = 5 } = req.query;
  try {
    const Group = require('./models/Group');
    const Client = require('./models/Client');
    
    // Obtener todos los grupos activos
    const groups = await Group.findAll();
    
    if (groups.length > 0) {
      // Filtrar grupos que fueron creados por el cliente específico
      const groupsByClient = groups.filter(group => group.createdByClient === clientId);
      
      // Para cada grupo del cliente, obtener sus clientes pendientes
      const groupsWithClients = await Promise.all(
        groupsByClient.map(async (group) => {
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
            createdByClient: group.createdByClient, // Incluir el campo created-by
            clientCount: pendingClients.length,
            clients: pendingClients
          };
        })
      );

      // Solo contar clientes de los grupos del cliente específico
      const totalPendingClients = groupsWithClients.reduce((total, group) => total + group.clientCount, 0);

      return res.json({
        success: true,
        data: groupsWithClients,
        totalGroups: groupsWithClients.length,
        totalClients: totalPendingClients,
        clientId: clientId, // Incluir el ID del cliente en la respuesta
        message: `Datos locales organizados por grupos para el cliente ${clientId}`,
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
        createdByClient: clientId, // Incluir el campo created-by
        clientCount: data.clients ? data.clients.length : 0,
        clients: data.clients || []
      }],
      totalGroups: 1,
      totalClients: data.total || 0,
      clientId: clientId, // Incluir el ID del cliente en la respuesta
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
};

// Middleware de autenticación para rutas de clientes pendientes
const { authenticate } = require('./middleware/auth');

// Rutas para clientes pendientes - disponibles en ambas ubicaciones
app.get('/clients/pending', authenticate, getPendingClients);
app.get('/clients/pending/:clientId', authenticate, getPendingClientsByClientId);

app.post('/calls/outbound', async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido' });
  }

  // Validar formato del número
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(number)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Formato de número inválido',
      detail: 'El número debe tener entre 10 y 15 dígitos'
    });
  }

  try {
    console.log(`[proxy] Iniciando llamada saliente al número: ${number}`);
    
    // URL de la API externa (puede ser configurada por variable de entorno)
    const externalApiUrl = process.env.OUTBOUND_CALL_API_URL || 'https://369bbe0501eb.ngrok-free.app/outbound-call';
    
    console.log(`[proxy] Usando API externa: ${externalApiUrl}`);
    
    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IA-Calls-Backend/1.0.0',
        'Accept': 'application/json',
        // Si tu API necesita autenticación:
        // Authorization: `Bearer ${process.env.TWILIO_API_KEY}`
      },
      body: JSON.stringify({ number }),
      timeout: 10000 // 10 segundos de timeout
    });

    console.log(`[proxy] Status de respuesta: ${response.status}`);
    console.log(`[proxy] Headers de respuesta:`, Object.fromEntries(response.headers.entries()));

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('[proxy] Respuesta no es JSON:', textResponse.substring(0, 200));
      
      // Si la API externa no funciona, devolver un mensaje informativo
      return res.status(503).json({
        success: false,
        message: 'Servicio de llamadas temporalmente no disponible',
        detail: 'La API externa no está respondiendo correctamente',
        status: response.status,
        contentType: contentType,
        suggestion: 'Verificar la configuración de la API externa o contactar al administrador'
      });
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[proxy] Error en API externa:', result);
      return res.status(response.status).json({
        success: false,
        message: result.message || 'Error en la API externa',
        detail: result,
        status: response.status
      });
    }

    console.log(`[proxy] Llamada exitosa:`, result);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[proxy] Error al hacer llamada saliente:', err);
    
    // Determinar el tipo de error
    let errorMessage = 'Error en el proxy';
    let errorDetail = err.message;
    let statusCode = 500;
    
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMessage = 'Error de conexión con la API externa';
      errorDetail = 'No se pudo conectar con el servicio de llamadas';
      statusCode = 503;
    } else if (err.name === 'AbortError') {
      errorMessage = 'Timeout en la conexión';
      errorDetail = 'La API externa tardó demasiado en responder';
      statusCode = 504;
    } else if (err.message.includes('Unexpected token')) {
      errorMessage = 'Respuesta inválida de la API externa';
      errorDetail = 'La API externa devolvió datos no válidos';
      statusCode = 502;
    }
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      detail: errorDetail,
      errorType: err.name,
      suggestion: 'Verificar la configuración de la API externa'
    });
  }
});

// Endpoint alternativo para desarrollo (simula llamadas)
app.post('/calls/outbound-dev', async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido' });
  }

  // Validar formato del número
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(number)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Formato de número inválido',
      detail: 'El número debe tener entre 10 y 15 dígitos'
    });
  }

  // Simular procesamiento de llamada
  console.log(`[dev] Simulando llamada al número: ${number}`);
  
  // Simular delay de procesamiento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simular respuesta exitosa
  const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return res.status(200).json({
    success: true,
    message: 'Llamada iniciada exitosamente',
    data: {
      callId: callId,
      number: number,
      status: 'initiated',
      timestamp: new Date().toISOString(),
      estimatedDuration: '30-60 segundos'
    },
    note: 'Esta es una simulación para desarrollo. La API externa no está disponible.'
  });
});

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
    const storageService = require('./services/storage');
    const UploadedFile = require('./models/UploadedFile');
    
    // Validar que el archivo se subió
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Archivo Excel requerido'
      });
    }

    const { groupId } = req.body;
    const filename = req.file.originalname;
    const userId = req.user ? req.user.id : 1; // Usuario por defecto si no hay autenticación

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

    // Subir archivo al bucket de Google Cloud Storage
    let uploadResult = null;
    try {
      uploadResult = await storageService.uploadFile(
        req.file.buffer,
        filename,
        {
          extractedClients: extractedClients.length,
          successfullyProcessed: createdClients.length,
          processingErrors: creationErrors.length,
          parsingErrors: errors.length,
          groupId: targetGroup ? targetGroup.id : null,
          groupName: targetGroup ? targetGroup.name : null,
          uploadedBy: userId
        }
      );

      // Guardar registro en la base de datos
      await UploadedFile.create({
        originalName: filename,
        fileName: uploadResult.fileName,
        bucketUrl: uploadResult.bucketUrl,
        publicUrl: uploadResult.publicUrl,
        downloadUrl: uploadResult.downloadUrl,
        fileSize: uploadResult.size,
        contentType: uploadResult.contentType,
        uploadedBy: userId,
        groupId: targetGroup ? targetGroup.id : null,
        metadata: {
          extractedClients: extractedClients.length,
          successfullyProcessed: createdClients.length,
          processingErrors: creationErrors.length,
          parsingErrors: errors.length,
          groupName: targetGroup ? targetGroup.name : null,
          uploadMethod: 'excel_extraction'
        }
      });

    } catch (uploadError) {
      console.error('Error subiendo archivo al bucket:', uploadError);
      // Continuar sin fallar la extracción si hay error en el upload
    }

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
        } : null,
        fileStorage: uploadResult ? {
          uploaded: true,
          fileName: uploadResult.fileName,
          bucketUrl: uploadResult.bucketUrl,
          downloadUrl: uploadResult.downloadUrl,
          size: uploadResult.size
        } : {
          uploaded: false,
          error: uploadError ? uploadError.message : 'Error desconocido'
        }
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


// Rutas de webhook (ANTES de /api, sin autenticación, para Twilio)
const webhookRoutes = require('./routes/webhook');
app.use('/webhook', webhookRoutes);

// Rutas principales
app.use('/api', indexRoutes);

// Agregar las rutas de clientes pendientes también en la API
// IMPORTANTE: Las rutas específicas deben ir ANTES que las rutas con parámetros
app.get('/api/clients/pending', authenticate, getPendingClients);
app.get('/api/clients/pending/:clientId', authenticate, getPendingClientsByClientId);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: '🚀 IA Calls Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      monitoring: 'active',
      whatsapp: 'configured'
    }
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



// Endpoint específico para documentos por cliente
app.get('/documents/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10, documentType } = req.query;
    
    const offset = (page - 1) * limit;
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (documentType) options.documentType = documentType;

    // Importar el modelo GCPDocument
    const GCPDocument = require('./models/GCPDocument');

    // Obtener documentos del cliente con información de grupos
    const [documents, total] = await Promise.all([
      GCPDocument.findByClientIdWithGroups(parseInt(clientId), options),
      GCPDocument.countByClientId(parseInt(clientId))
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Documentos del cliente encontrados',
      data: documents.map(doc => doc.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        clientId: parseInt(clientId),
        documentType: documentType || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos del cliente',
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

// ============================================
// INICIAR SERVICIOS DE FONDO
// ============================================

// Iniciar el servicio de monitoreo de llamadas
try {
  const BatchMonitoringService = require('./services/batchMonitoringService');
  const batchMonitoringService = new BatchMonitoringService();
  batchMonitoringService.start();
  
  console.log('✅ Servicio de monitoreo de llamadas iniciado');
} catch (error) {
  console.error('❌ Error iniciando servicio de monitoreo:', error.message);
}

module.exports = app;
