const Client = require('../models/Client');
const Group = require('../models/Group');
const ClientInterested = require('../models/ClientInterested');

// Instancia singleton de TwilioWhatsAppService para reutilizar
let twilioWhatsAppService = null;
const getTwilioService = () => {
  if (!twilioWhatsAppService) {
    const TwilioWhatsAppService = require('../services/twilioWhatsAppService');
    twilioWhatsAppService = new TwilioWhatsAppService();
  }
  return twilioWhatsAppService;
};

// Obtener todos los clientes
const getClients = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      search,
      include_groups = false 
    } = req.query;
    
    const offset = (page - 1) * limit;

    const clients = await Client.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      category,
      search
    });

    const totalClients = await Client.count({ status, category });

    // Si se solicita incluir grupos, obtenerlos para cada cliente
    const clientsWithGroups = await Promise.all(
      clients.map(async (client) => {
        const clientData = { ...client };
        
        if (include_groups === 'true') {
          const groups = await client.getGroups();
          clientData.groups = groups;
        }

        return clientData;
      })
    );

    res.json({
      success: true,
      data: clientsWithGroups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalClients,
        totalPages: Math.ceil(totalClients / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes',
      error: error.message
    });
  }
};

// Obtener cliente por ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_groups = false } = req.query;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const clientData = { ...client };

    if (include_groups === 'true') {
      const groups = await client.getGroups();
      clientData.groups = groups;
    }

    res.json({
      success: true,
      data: clientData
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo cliente',
      error: error.message
    });
  }
};

// Crear nuevo cliente
const createClient = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      email, 
      address, 
      category, 
      review, 
      status = 'pending',
      externalId,
      metadata 
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y teléfono son requeridos'
      });
    }

    const client = await Client.create({
      name,
      phone,
      email,
      address,
      category,
      review,
      status,
      externalId,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: client
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando cliente',
      error: error.message
    });
  }
};

// Crear cliente simple (solo nombre y número) y enviar WhatsApp
const createClientSimple = async (req, res) => {
  try {
    const { name, phone_number } = req.body;

    if (!name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y phone_number son requeridos'
      });
    }

    // Crear cliente (convertir phone_number a string)
    const phoneNumberStr = String(phone_number).trim();
    const client = await Client.create({
      name: String(name).trim(),
      phone: phoneNumberStr,
      status: 'pending'
    });

    // Enviar mensaje de WhatsApp
    try {
      const whatsappService = getTwilioService();
      const message = `Hola ${name} te mandaré la información del evento de manera inmediata`;
      
      const whatsappResult = await whatsappService.sendMessage(phoneNumberStr, message, name);
      
      if (whatsappResult.success) {
      } else {
      }
    } catch (whatsappError) {
    }

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando cliente',
      error: error.message
    });
  }
};    

// Actualizar cliente
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await client.update(updateData);

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: client
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando cliente',
      error: error.message
    });
  }
};

// Eliminar cliente
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await client.delete();

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando cliente',
      error: error.message
    });
  }
};

// Sincronizar clientes desde servicio externo
const syncClients = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Obtener clientes del servicio externo
    const response = await fetch(`https://calls-service-754698887417.us-central1.run.app/clients/pending?page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Error del servicio externo: ${response.status}`);
    }

    const externalData = await response.json();
    
    if (!externalData.clients || !Array.isArray(externalData.clients)) {
      throw new Error('Formato de respuesta inválido del servicio externo');
    }

    // Sincronizar cada cliente
    const syncResults = await Promise.all(
      externalData.clients.map(async (externalClient) => {
        try {
          const client = await Client.syncFromExternal(externalClient);
          return { success: true, client: client.name, action: 'synced' };
        } catch (error) {
          return { success: false, client: externalClient.name, error: error.message };
        }
      })
    );

    const successCount = syncResults.filter(r => r.success).length;
    const errorCount = syncResults.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Sincronización completada: ${successCount} exitosos, ${errorCount} errores`,
      data: {
        totalProcessed: syncResults.length,
        successful: successCount,
        errors: errorCount,
        details: syncResults
      }
    });
  } catch (error) {
    console.error('Error sincronizando clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error sincronizando clientes',
      error: error.message
    });
  }
};

// Obtener clientes pendientes por ID de cliente específico
const getPendingClientsByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 5 } = req.query;
    
    const Group = require('../models/Group');
    const Client = require('../models/Client');    
    // Convertir clientId a número para comparación
    const clientIdNum = parseInt(clientId);
    
    // Obtener todos los grupos directamente de la BD con query SQL para mayor control
    const { query } = require('../config/database');
    const groupsResult = await query(`
      SELECT * FROM "public"."groups" 
      WHERE created_by = $1
      ORDER BY created_at DESC
    `, [clientIdNum]);
    
    const groupsData = groupsResult.rows;
    
    if (groupsData.length > 0) {
      // Convertir datos de BD a objetos Group
      const groups = groupsData.map(groupData => new Group(groupData));
      
      // Procesar todos los grupos encontrados
      const groupsByClient = groups;
      
      // Si hay grupos que coinciden con el clientId, procesarlos
      if (groupsByClient.length > 0) {
        // Para cada grupo del cliente, obtener sus clientes pendientes
        const groupsWithClients = await Promise.all(
          groupsByClient.map(async (group) => {
            try {
              // Obtener clientes del grupo usando la relación client_groups
              const { query } = require('../config/database');
              const clientsResult = await query(`
                SELECT c.* 
                FROM "public"."clients" c
                INNER JOIN "public"."client_groups" cg ON c.id = cg.client_id
                WHERE cg.group_id = $1
                ORDER BY c.created_at DESC
              `, [group.id]);
              
              // Convertir a objetos Client
              const Client = require('../models/Client');
              const groupClients = clientsResult.rows.map(row => new Client(row));
              
              // Filtrar solo los clientes con status pending
              const pendingClients = groupClients
                .filter(client => client.status === 'pending')
                .map(client => client.toJSON ? client.toJSON() : client);
              
              return {
                id: group.id,
                name: group.name,
                description: group.description,
                prompt: group.prompt,
                color: group.color,
                favorite: group.favorite,
                createdBy: group.createdBy,
                createdByClient: group.createdByClient,
                agentId: group.agentId,
                prefix: group.prefix,
                selectedCountryCode: group.selectedCountryCode,
                firstMessage: group.firstMessage,
                phoneNumberId: group.phoneNumberId,
                batchStatus: group.batchStatus,
                batchId: group.batchId,
                isActive: group.isActive,
                clientCount: pendingClients.length,
                totalClientCount: groupClients.length,
                clients: pendingClients
              };
            } catch (error) {
              return {
                id: group.id,
                name: group.name,
                description: group.description,
                prompt: group.prompt,
                color: group.color,
                favorite: group.favorite,
                createdBy: group.createdBy,
                createdByClient: group.createdByClient,
                agentId: group.agentId,
                clientCount: 0,
                totalClientCount: 0,
                clients: [],
                error: error.message
              };
            }
          })
        );

        // También obtener clientes pendientes que no están en ningún grupo
        const allPendingClients = await Client.findAll({ status: 'pending' });
        const clientsInGroups = new Set();
        
        groupsWithClients.forEach(group => {
          group.clients.forEach(client => clientsInGroups.add(client.id));
        });

        const ungroupedClients = allPendingClients.filter(client => !clientsInGroups.has(client.id));

        // Si hay clientes sin grupo, agregarlos como un grupo especial
        if (ungroupedClients.length > 0) {
          groupsWithClients.push({
            id: null,
            name: "Sin Grupo",
            description: "Clientes pendientes sin asignar a grupos",
            prompt: null,
            color: "#6B7280",
            favorite: false,
            createdByClient: clientId, // Incluir el campo created-by
            clientCount: ungroupedClients.length,
            clients: ungroupedClients
          });
        }

        // Calcular total de clientes pendientes de todos los grupos
        const totalPendingClients = groupsWithClients.reduce((sum, group) => sum + group.clientCount, 0);
        const totalAllClients = groupsWithClients.reduce((sum, group) => sum + group.totalClientCount, 0);

        // Agregar headers para evitar caché
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        return res.json({
          success: true,
          data: groupsWithClients,
          totalGroups: groupsWithClients.length,
          totalClients: totalPendingClients,
          totalAllClients: totalAllClients,
          clientId: clientId,
          message: `Datos locales organizados por grupos para el cliente ${clientId}`,
          source: 'local',
          timestamp: new Date().toISOString()
        });
      }
      // Si no hay grupos que coincidan, continuar con el servicio externo
    }

    // Si no hay grupos, intentar usar el servicio externo como fallback
    try {
      const response = await fetch(`https://calls-service-754698887417.us-central1.run.app/clients/pending?page=${page}&limit=${limit}`);
      
      // Verificar que la respuesta sea exitosa
      if (!response.ok) {
        // No es un error crítico, solo un fallback que no está disponible
        throw new Error(`Servicio externo no disponible (${response.status})`);
      }
      
      // Verificar que el Content-Type sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Servicio externo devolvió formato no-JSON');
      }
      
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
        source: 'external'
      };

      return res.json(transformedData);
      
    } catch (fetchError) {
      // Esto es esperado cuando el servicio externo no está disponible
      // No es un error crítico, solo un fallback
      
      // Si el servicio externo falla, devolver respuesta vacía en lugar de error
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      return res.json({
        success: true,
        data: [],
        totalGroups: 0,
        totalClients: 0,
        clientId: clientId,
        message: 'No hay clientes pendientes disponibles en este momento',
        source: 'local',
        info: 'Servicio externo temporalmente no disponible',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error obteniendo clientes pendientes por cliente ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes pendientes',
      error: error.message
    });
  }
};

// Obtener estadísticas de clientes
const getClientStats = async (req, res) => {
  try {
    const totalClients = await Client.count();
    const pendingClients = await Client.count({ status: 'pending' });
    const contactedClients = await Client.count({ status: 'contacted' });
    const convertedClients = await Client.count({ status: 'converted' });

    res.json({
      success: true,
      data: {
        total: totalClients,
        pending: pendingClients,
        contacted: contactedClients,
        converted: convertedClients
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
};

// Crear cliente interesado (nuevo endpoint)
const createClientInterested = async (req, res) => {
  try {
    const { name, phone_number } = req.body;

    // Validar que se reciban los parámetros requeridos
    if (!name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros name y phone_number son requeridos',
        error: 'Parámetros faltantes',
        received: {
          body: req.body,
          hasName: !!name,
          hasPhoneNumber: !!phone_number,
          nameValue: name,
          phoneNumberValue: phone_number
        }
      });
    }

    // Crear el cliente interesado usando el modelo
    const clientInterested = await ClientInterested.create({
      name: String(name).trim(),
      phone_number: String(phone_number).trim()
    });


    res.status(201).json({
      success: true,
      message: 'Cliente interesado guardado exitosamente',
      data: clientInterested.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error guardando cliente interesado',
      error: error.message
    });
  }
};

// Obtener todos los clientes interesados
const getClientsInterested = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let clientsInterested;
    let total;

    // Si hay búsqueda, usar el método search
    if (search) {
      clientsInterested = await ClientInterested.search(search);
      total = clientsInterested.length;
    } else {
      // Obtener todos con paginación
      clientsInterested = await ClientInterested.findAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy,
        order
      });
      total = await ClientInterested.count();
    }

    // Convertir a JSON para el frontend
    const clientsData = clientsInterested.map(client => client.toJSON());

    res.json({
      success: true,
      data: clientsData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      message: 'Clientes interesados obtenidos exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes interesados',
      error: error.message
    });
  }
};

// Obtener un cliente interesado por ID
const getClientInterestedById = async (req, res) => {
  try {
    const { id } = req.params;

    const clientInterested = await ClientInterested.findById(id);

    if (!clientInterested) {
      return res.status(404).json({
        success: false,
        message: 'Cliente interesado no encontrado'
      });
    }

    res.json({
      success: true,
      data: clientInterested.toJSON(),
      message: 'Cliente interesado obtenido exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo cliente interesado',
      error: error.message
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  createClientSimple,
  updateClient,
  deleteClient,
  syncClients,
  getClientStats,
  getPendingClientsByClientId,
  createClientInterested,
  getClientsInterested,
  getClientInterestedById
}; 