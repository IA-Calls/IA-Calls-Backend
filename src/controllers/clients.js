const Client = require('../models/Client');
const Group = require('../models/Group');

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
    
    // Obtener todos los grupos activos que fueron creados por el cliente específico
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

      const totalPendingClients = allPendingClients.length;

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
      source: 'external'
    };

    res.json(transformedData);
    
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

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  syncClients,
  getClientStats,
  getPendingClientsByClientId
}; 