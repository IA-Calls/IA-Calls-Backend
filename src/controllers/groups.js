const Group = require('../models/Group');
const Client = require('../models/Client');
const FileProcessor = require('../services/fileProcessor');

// Obtener todos los grupos
const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, include_clients = false, clientId } = req.query;
    const offset = (page - 1) * limit;

    // Obtener todos los grupos
    const allGroups = await Group.findAll({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });

    // Filtrar por clientId si se proporciona
    let filteredGroups = allGroups;
    if (clientId) {
      filteredGroups = allGroups.filter(group => group.createdByClient === clientId);
    }

    // Si se solicita incluir clientes, obtenerlos para cada grupo
    const groupsWithDetails = await Promise.all(
      filteredGroups.map(async (group) => {
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
        total: filteredGroups.length,
        totalAllGroups: allGroups.length
      },
      filters: {
        clientId: clientId || null,
        applied: !!clientId
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
    const { name, description, prompt, color, favorite, base64, document_name, createdByClient } = req.body;
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
      createdBy,
      createdByClient // Nuevo campo para el ID del cliente
    };

    // Crear el grupo
    const group = await Group.create(groupData);
    const groupId = group.id;

    let processingResult = null;
    let createdClients = [];
    let gcpUploadResult = null;

    // Procesar archivo si se proporciona base64 y document_name
    if (base64 && document_name) {
      try {
        console.log('Procesando archivo adjunto...');
        
        // Procesar el archivo y extraer datos
        processingResult = await FileProcessor.processFile(base64, document_name);
        
        if (processingResult.success && processingResult.clientsData.length > 0) {
          console.log(`Procesados ${processingResult.clientsData.length} clientes del archivo`);
          
          // Crear todos los clientes en carga masiva (sin verificar duplicados)
          const newClients = await Client.createBatch(processingResult.clientsData, 100);
          
          if (newClients.length > 0) {
            // Extraer IDs de los clientes creados
            const clientIds = newClients.map(client => client.id);
            
            // Asignar todos los clientes al grupo en carga masiva
            const assignedCount = await group.addClientsBatch(clientIds, createdBy, 100);
            
            console.log(`Asignados ${assignedCount} clientes al grupo ${groupId}`);
            
            // Agregar clientes creados a la respuesta
            createdClients = newClients.map(client => client.toJSON());

            // Subir archivo original a GCP
            try {
              const { uploadDocumentToGCP } = require('../utils/helpers');
              const GCPDocument = require('../models/GCPDocument');
              
              gcpUploadResult = await uploadDocumentToGCP(base64, document_name, {
                groupId: groupId,
                groupName: name,
                totalClients: newClients.length,
                documentType: 'original_upload',
                source: 'group_creation',
                processedClients: newClients.length
              });
              
              // Guardar en base de datos
              const savedDocument = await GCPDocument.create({
                fileName: gcpUploadResult.fileName,
                originalName: gcpUploadResult.originalName,
                bucketUrl: gcpUploadResult.bucketUrl,
                publicUrl: gcpUploadResult.publicUrl,
                downloadUrl: gcpUploadResult.downloadUrl,
                fileSize: gcpUploadResult.size,
                contentType: gcpUploadResult.contentType,
                documentType: 'original_upload',
                groupId: groupId,
                uploadedBy: createdBy,
                metadata: {
                  groupName: name,
                  totalClients: newClients.length,
                  source: 'group_creation',
                  processedClients: newClients.length
                }
              });
              
              console.log('Archivo original subido a GCP y guardado en BD exitosamente');
            } catch (gcpError) {
              console.error('Error subiendo archivo original a GCP:', gcpError);
              // Continuar sin fallar si hay error en GCP
            }

            // Generar y subir Excel procesado a GCP
            try {
              const { generateAndUploadExcel } = require('../utils/helpers');
              const GCPDocument = require('../models/GCPDocument');
              
              const excelUploadResult = await generateAndUploadExcel(newClients, name, groupId);
              
              // Guardar en base de datos
              const savedExcelDocument = await GCPDocument.create({
                fileName: excelUploadResult.fileName,
                originalName: excelUploadResult.originalName,
                bucketUrl: excelUploadResult.bucketUrl,
                publicUrl: excelUploadResult.publicUrl,
                downloadUrl: excelUploadResult.downloadUrl,
                fileSize: excelUploadResult.size,
                contentType: excelUploadResult.contentType,
                documentType: 'processed_excel',
                groupId: groupId,
                uploadedBy: createdBy,
                metadata: {
                  groupName: name,
                  totalClients: newClients.length,
                  source: 'group_creation',
                  documentType: 'processed_excel'
                }
              });
              
              console.log('Excel procesado subido a GCP y guardado en BD exitosamente');
              
              // Agregar resultado del Excel procesado
              if (!gcpUploadResult) {
                gcpUploadResult = {};
              }
              gcpUploadResult.processedExcel = excelUploadResult;
            } catch (excelError) {
              console.error('Error generando y subiendo Excel procesado:', excelError);
              // Continuar sin fallar si hay error en el Excel procesado
            }
          }
        }
        
      } catch (fileError) {
        console.error('Error procesando archivo:', fileError);
        // Continuar con la creación del grupo aunque falle el procesamiento del archivo
      }
    }

    // Preparar respuesta
    const response = {
      success: true,
      message: 'Grupo creado exitosamente',
      data: {
        ...group.toJSON(),
        fileProcessing: processingResult ? {
          processed: true,
          totalClientsFound: processingResult.clientsData.length,
          clientsCreated: createdClients.length,
          processedFile: processingResult.processedFile
        } : {
          processed: false
        },
        gcpStorage: gcpUploadResult ? {
          uploaded: true,
          originalFile: gcpUploadResult,
          processedExcel: gcpUploadResult.processedExcel || null
        } : {
          uploaded: false
        }
      }
    };

    // Agregar información de clientes creados si hay alguno
    if (createdClients.length > 0) {
      response.data.createdClients = createdClients;
    }

    res.status(201).json(response);
    
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

// Actualizar cliente en el grupo
const updateClientInGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;
    const updateData = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Verificar que el cliente esté en el grupo
    const clientInGroup = await group.getClients({ limit: 1000 });
    const clientExists = clientInGroup.find(client => client.id === parseInt(client_id));
    
    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    // Actualizar el cliente
    const client = await Client.findById(client_id);
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
      data: client.toJSON()
    });
  } catch (error) {
    console.error('Error actualizando cliente en el grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando cliente en el grupo',
      error: error.message
    });
  }
};

// Obtener cliente específico del grupo
const getClientInGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener todos los clientes del grupo
    const clients = await group.getClients({ limit: 1000 });
    const client = clients.find(c => c.id === parseInt(client_id));
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error obteniendo cliente del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo cliente del grupo',
      error: error.message
    });
  }
};

// Descargar archivo procesado
const downloadProcessedFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del archivo es requerido'
      });
    }

    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(__dirname, '../../uploads', fileName);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Enviar archivo
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error descargando archivo',
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
  removeClientFromGroup,
  updateClientInGroup,
  getClientInGroup,
  downloadProcessedFile
}; 