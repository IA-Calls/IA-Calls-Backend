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
  getClientStats
}; 