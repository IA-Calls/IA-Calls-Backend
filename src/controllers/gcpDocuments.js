const GCPDocument = require('../models/GCPDocument');
const { uploadDocumentToGCP, generateAndUploadExcel } = require('../utils/helpers');

// Obtener todos los documentos con filtros y paginación
const getAllDocuments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      groupId, 
      uploadedBy, 
      documentType 
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir opciones de filtro
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (groupId) options.groupId = parseInt(groupId);
    if (uploadedBy) options.uploadedBy = parseInt(uploadedBy);
    if (documentType) options.documentType = documentType;

    // Obtener documentos y contar total
    const [documents, total] = await Promise.all([
      GCPDocument.findAll(options),
      GCPDocument.count(options)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
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
        groupId: groupId ? parseInt(groupId) : null,
        uploadedBy: uploadedBy ? parseInt(uploadedBy) : null,
        documentType: documentType || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos GCP:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos',
      error: error.message
    });
  }
};

// Obtener documentos del usuario autenticado
const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      documentType 
    } = req.query;

    const offset = (page - 1) * limit;
    
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (documentType) options.documentType = documentType;

    // Obtener documentos del usuario y contar total
    const [documents, total] = await Promise.all([
      GCPDocument.findByUserId(userId, options),
      GCPDocument.count({ ...options, uploadedBy: userId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
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
        documentType: documentType || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos',
      error: error.message
    });
  }
};

// Obtener documentos por grupo
const getDocumentsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      documentType 
    } = req.query;

    const offset = (page - 1) * limit;
    
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (documentType) options.documentType = documentType;

    // Obtener documentos del grupo y contar total
    const [documents, total] = await Promise.all([
      GCPDocument.findByGroupId(parseInt(groupId), options),
      GCPDocument.count({ ...options, groupId: parseInt(groupId) })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
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
        groupId: parseInt(groupId),
        documentType: documentType || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documentos del grupo',
      error: error.message
    });
  }
};

// Obtener documentos por cliente con información de grupos
const getDocumentsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      documentType 
    } = req.query;

    const offset = (page - 1) * limit;
    
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (documentType) options.documentType = documentType;

    // Obtener documentos del cliente con información de grupos
    const [documents, total] = await Promise.all([
      GCPDocument.findByClientIdWithGroups(parseInt(clientId), options),
      GCPDocument.countByClientId(parseInt(clientId))
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Documentos del cliente encontrados',
      data: documents,
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
};

// Obtener documento por ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await GCPDocument.findById(parseInt(id));
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    res.json({
      success: true,
      data: document.toJSON()
    });

  } catch (error) {
    console.error('Error obteniendo documento por ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documento',
      error: error.message
    });
  }
};

// Subir documento sin grupo
const uploadDocument = async (req, res) => {
  try {
    const { base64, fileName, documentType, metadata } = req.body;
    const uploadedBy = req.user?.id;

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!base64 || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'base64 y fileName son requeridos'
      });
    }

    // Subir a GCP
    const uploadResult = await uploadDocumentToGCP(base64, fileName, {
      documentType: documentType || 'general',
      uploadedBy,
      ...metadata
    });

    // Guardar en base de datos
    const document = await GCPDocument.create({
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      bucketUrl: uploadResult.bucketUrl,
      publicUrl: uploadResult.publicUrl,
      downloadUrl: uploadResult.downloadUrl,
      fileSize: uploadResult.size,
      contentType: uploadResult.contentType,
      documentType: documentType || 'general',
      groupId: null, // Sin grupo
      uploadedBy,
      metadata: {
        ...metadata,
        source: 'manual_upload'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente',
      data: document.toJSON()
    });

  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error subiendo documento',
      error: error.message
    });
  }
};

// Generar y subir Excel procesado
const generateExcel = async (req, res) => {
  try {
    const { clientsData, groupName, groupId } = req.body;
    const uploadedBy = req.user?.id;

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!clientsData || !Array.isArray(clientsData) || clientsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clientsData debe ser un array no vacío'
      });
    }

    if (!groupName) {
      return res.status(400).json({
        success: false,
        message: 'groupName es requerido'
      });
    }

    // Generar y subir Excel
    const excelResult = await generateAndUploadExcel(clientsData, groupName, groupId);

    // Guardar en base de datos
    const document = await GCPDocument.create({
      fileName: excelResult.fileName,
      originalName: excelResult.originalName,
      bucketUrl: excelResult.bucketUrl,
      publicUrl: excelResult.publicUrl,
      downloadUrl: excelResult.downloadUrl,
      fileSize: excelResult.size,
      contentType: excelResult.contentType,
      documentType: 'processed_excel',
      groupId: groupId || null,
      uploadedBy,
      metadata: {
        groupName,
        totalClients: clientsData.length,
        source: 'manual_excel_generation',
        documentType: 'processed_excel'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Excel generado y subido exitosamente',
      data: document.toJSON()
    });

  } catch (error) {
    console.error('Error generando Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando Excel',
      error: error.message
    });
  }
};

// Actualizar documento
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const document = await GCPDocument.findById(parseInt(id));
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario del documento
    if (document.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este documento'
      });
    }

    // Actualizar documento
    const updatedDocument = await document.update(updateData);

    res.json({
      success: true,
      message: 'Documento actualizado exitosamente',
      data: updatedDocument.toJSON()
    });

  } catch (error) {
    console.error('Error actualizando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando documento',
      error: error.message
    });
  }
};

// Eliminar documento
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const document = await GCPDocument.findById(parseInt(id));
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario del documento
    if (document.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este documento'
      });
    }

    // Eliminar documento
    await document.delete();

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando documento',
      error: error.message
    });
  }
};

module.exports = {
  getAllDocuments,
  getMyDocuments,
  getDocumentsByGroup,
  getDocumentsByClient,
  getDocumentById,
  uploadDocument,
  generateExcel,
  updateDocument,
  deleteDocument
};
