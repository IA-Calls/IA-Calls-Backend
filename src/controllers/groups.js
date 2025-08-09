const Group = require('../models/Group');
const Client = require('../models/Client');

// Obtener todos los grupos
const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, include_clients = false } = req.query;
    const offset = (page - 1) * limit;

    const groups = await Group.findAll({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });

    // Si se solicita incluir clientes, obtenerlos para cada grupo
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const clientCount = await group.countClients();
        const groupData = {
          ...group.toJSON(),
          clientCount
        };

        if (include_clients === 'true') {
          const clients = await group.getClients({ limit: 5 });
          groupData.recentClients = clients;
        }

        return groupData;
      })
    );

    res.json({
      success: true,
      data: groupsWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: groups.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo grupos',
      error: error.message
    });
  }
};

// Obtener grupo por ID
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_clients = false, client_page = 1, client_limit = 10 } = req.query;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const groupData = group.toJSON();
    groupData.clientCount = await group.countClients();

    if (include_clients === 'true') {
      const clientOffset = (client_page - 1) * client_limit;
      const clients = await group.getClients({ 
        limit: parseInt(client_limit), 
        offset: parseInt(clientOffset) 
      });
      groupData.clients = clients;
      groupData.clientPagination = {
        page: parseInt(client_page),
        limit: parseInt(client_limit)
      };
    }

    res.json({
      success: true,
      data: groupData
    });
  } catch (error) {
    console.error('Error obteniendo grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo grupo',
      error: error.message
    });
  }
};

// Crear nuevo grupo
const createGroup = async (req, res) => {
  try {
    const { name, description, prompt, color, favorite } = req.body;
    const createdBy = req.user?.id || 1; // Usar ID del usuario autenticado o admin por defecto

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del grupo es requerido'
      });
    }

    const groupData = {
      name,
      description,
      prompt,
      color,
      favorite: favorite || false,
      createdBy
    };

    const group = await Group.create(groupData);

    res.status(201).json({
      success: true,
      message: 'Grupo creado exitosamente',
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error creando grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando grupo',
      error: error.message
    });
  }
};

// Actualizar grupo
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, prompt, color, favorite } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    await group.update({ name, description, prompt, color, favorite });

    res.json({
      success: true,
      message: 'Grupo actualizado exitosamente',
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error actualizando grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando grupo',
      error: error.message
    });
  }
};

// Eliminar grupo
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    await group.delete();

    res.json({
      success: true,
      message: 'Grupo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando grupo',
      error: error.message
    });
  }
};

// Agregar cliente al grupo
const addClientToGroup = async (req, res) => {
  try {
    const { id } = req.params; // ID del grupo
    const { client_id } = req.body;
    const assignedBy = req.user?.id || 1;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'ID del cliente es requerido'
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const client = await Client.findById(client_id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const result = await group.addClient(client_id, assignedBy);

    res.json({
      success: true,
      message: result ? 'Cliente agregado al grupo exitosamente' : 'Cliente ya está en el grupo',
      data: result
    });
  } catch (error) {
    console.error('Error agregando cliente al grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando cliente al grupo',
      error: error.message
    });
  }
};

// Remover cliente del grupo
const removeClientFromGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const result = await group.removeClient(client_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    res.json({
      success: true,
      message: 'Cliente removido del grupo exitosamente'
    });
  } catch (error) {
    console.error('Error removiendo cliente del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error removiendo cliente del grupo',
      error: error.message
    });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addClientToGroup,
  removeClientFromGroup
}; 