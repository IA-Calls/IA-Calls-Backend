const express = require('express');
const router = express.Router();
const storageService = require('../services/storage');
const UploadedFile = require('../models/UploadedFile');
const { authenticate } = require('../middleware/auth');

// Middleware para verificar que el usuario está autenticado
router.use(authenticate);

// GET /api/storage/files - Listar archivos subidos
router.get('/files', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      groupId,
      contentType,
      uploadedBy
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    // Opciones de filtrado
    const options = {
      limit: parseInt(limit),
      offset,
      uploadedBy: uploadedBy || userId, // Por defecto mostrar solo archivos del usuario
      groupId: groupId ? parseInt(groupId) : null,
      contentType: contentType || null
    };

    // Obtener archivos de la base de datos
    const files = await UploadedFile.findAll(options);
    const total = await UploadedFile.count(options);

    // Generar URLs de descarga actualizadas para cada archivo
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const urlResult = await storageService.generateDownloadUrl(file.fileName, 1);
          return {
            ...file.toJSON(),
            downloadUrl: urlResult.downloadUrl,
            downloadUrlExpiresAt: urlResult.expiresAt
          };
        } catch (error) {
          console.error(`Error generando URL para ${file.fileName}:`, error);
          return file.toJSON();
        }
      })
    );

    res.json({
      success: true,
      data: filesWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error listando archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando archivos',
      error: error.message
    });
  }
});

// GET /api/storage/files/:id - Obtener información de un archivo específico
router.get('/files/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const file = await UploadedFile.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario puede acceder al archivo
    if (file.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este archivo'
      });
    }

    // Generar URL de descarga actualizada
    let downloadUrl = null;
    let downloadUrlExpiresAt = null;
    
    try {
      const urlResult = await storageService.generateDownloadUrl(file.fileName, 1);
      downloadUrl = urlResult.downloadUrl;
      downloadUrlExpiresAt = urlResult.expiresAt;
    } catch (error) {
      console.error(`Error generando URL para ${file.fileName}:`, error);
    }

    res.json({
      success: true,
      data: {
        ...file.toJSON(),
        downloadUrl,
        downloadUrlExpiresAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo archivo',
      error: error.message
    });
  }
});

// GET /api/storage/files/:id/download - Descargar archivo (redirige a GCP)
router.get('/files/:id/download', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const file = await UploadedFile.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario puede acceder al archivo
    if (file.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este archivo'
      });
    }

    // Generar URL de descarga directa desde GCP (válida por 1 hora)
    const urlResult = await storageService.generateDownloadUrl(file.fileName, 1);
    
    if (urlResult.success) {
      // Redirigir al usuario a la URL de descarga de GCP
      res.redirect(urlResult.downloadUrl);
    } else {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en GCP'
      });
    }

  } catch (error) {
    console.error('Error generando URL de descarga:', error);
    res.status(500).json({
      success: false,
      message: 'Error accediendo al archivo',
      error: error.message
    });
  }
});

// GET /api/storage/files/:id/url - Generar URL de descarga temporal
router.get('/files/:id/url', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const { expiresIn = 1 } = req.query; // Horas de validez
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const file = await UploadedFile.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario puede acceder al archivo
    if (file.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este archivo'
      });
    }

    // Generar URL de descarga
    const urlResult = await storageService.generateDownloadUrl(file.fileName, parseInt(expiresIn));

    res.json({
      success: true,
      data: {
        downloadUrl: urlResult.downloadUrl,
        expiresAt: urlResult.expiresAt,
        fileName: file.originalName,
        fileSize: file.fileSize
      }
    });

  } catch (error) {
    console.error('Error generando URL de descarga:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando URL de descarga',
      error: error.message
    });
  }
});

// DELETE /api/storage/files/:id - Eliminar archivo
router.delete('/files/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const file = await UploadedFile.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario puede eliminar el archivo
    if (file.uploadedBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este archivo'
      });
    }

    // Eliminar archivo del bucket
    await storageService.deleteFile(file.fileName);

    // Eliminar registro de la base de datos (soft delete)
    await file.delete();

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente',
      data: file.toJSON()
    });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando archivo',
      error: error.message
    });
  }
});

// GET /api/storage/test - Probar conexión al bucket
router.get('/test', async (req, res) => {
  try {
    const testResult = await storageService.testConnection();
    
    res.json({
      success: true,
      message: 'Conexión al bucket exitosa',
      data: testResult
    });

  } catch (error) {
    console.error('Error probando conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error de conexión al bucket',
      error: error.message
    });
  }
});

// GET /api/storage/stats - Estadísticas de archivos
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener estadísticas
    const totalFiles = await UploadedFile.count({ uploadedBy: userId });
    const excelFiles = await UploadedFile.count({ 
      uploadedBy: userId, 
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const csvFiles = await UploadedFile.count({ 
      uploadedBy: userId, 
      contentType: 'text/csv' 
    });

    // Obtener archivos por grupo
    const filesByGroup = await UploadedFile.findAll({ 
      uploadedBy: userId,
      limit: 1000 // Obtener todos para hacer el análisis
    });

    const groupStats = {};
    filesByGroup.forEach(file => {
      if (file.groupId) {
        if (!groupStats[file.groupId]) {
          groupStats[file.groupId] = 0;
        }
        groupStats[file.groupId]++;
      }
    });

    res.json({
      success: true,
      data: {
        totalFiles,
        excelFiles,
        csvFiles,
        otherFiles: totalFiles - excelFiles - csvFiles,
        filesByGroup: groupStats
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
});

module.exports = router; 