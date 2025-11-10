// Funciones de utilidad

// Generar respuesta estándar
const sendResponse = (res, statusCode, data, message = null) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Generar respuesta de error
const sendError = (res, statusCode, message, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : null,
    timestamp: new Date().toISOString()
  });
};

// Validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitizar input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Generar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Formatear fecha
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validar datos requeridos
const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      missing.push(field);
    }
  });

  return {
    isValid: missing.length === 0,
    missing
  };
};

// Función para cargar documentos en el bucket de GCP
const uploadDocumentToGCP = async (base64Data, fileName, metadata = {}) => {
  try {
    const { Storage } = require('@google-cloud/storage');
    const crypto = require('crypto');
    const path = require('path');

    // Validar variables de entorno requeridas
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_PRIVATE_KEY_ID',
      'GOOGLE_CLOUD_PRIVATE_KEY',
      'GOOGLE_CLOUD_CLIENT_EMAIL',
      'GOOGLE_CLOUD_CLIENT_ID',
      'GOOGLE_CLOUD_AUTH_URI',
      'GOOGLE_CLOUD_TOKEN_URI',
      'GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL',
      'GOOGLE_CLOUD_CLIENT_X509_CERT_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Variables de entorno faltantes para GCP: ${missingVars.join(', ')}`);
    }

    // Crear credenciales desde variables de entorno
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI,
      token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
    };

    // Configurar Google Cloud Storage para el bucket de documentos
    console.log(`🔧 Configurando Google Cloud Storage...`);
    console.log(`   Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`   Client Email: ${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}`);
    
    const storage = new Storage({
      credentials: credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ia_calls_documents';
    console.log(`📦 Usando bucket: ${bucketName}`);
    
    const bucket = storage.bucket(bucketName);
    
    // Verificar que el bucket existe y tenemos acceso
    console.log(`🔍 Verificando acceso al bucket...`);
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        throw new Error(`El bucket "${bucketName}" no existe en el proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}". Por favor, crea el bucket o verifica el nombre.`);
      }
      console.log(`✅ Bucket "${bucketName}" existe y es accesible`);
    } catch (bucketError) {
      console.error(`❌ Error verificando bucket:`, bucketError);
      // Si el error es de facturación, dar un mensaje más claro
      if (bucketError.message && bucketError.message.includes('billing')) {
        throw new Error(`Error de facturación de Google Cloud: La cuenta de facturación del proyecto está deshabilitada. Por favor, habilita la facturación en Google Cloud Console para el proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}".`);
      }
      throw bucketError;
    }

    // Generar nombre único para el archivo
    const generateUniqueFileName = (originalName, prefix = 'group-documents') => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomString = crypto.randomBytes(8).toString('hex');
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      
      // Estructura: group-documents/YYYY/MM/DD/filename_timestamp_random.ext
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${prefix}/${year}/${month}/${day}/${baseName}_${timestamp}_${randomString}${extension}`;
    };

    // Determinar el tipo de contenido basado en la extensión
    const getContentType = (fileName) => {
      const ext = path.extname(fileName).toLowerCase();
      const contentTypes = {
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.csv': 'text/csv',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif'
      };
      
      return contentTypes[ext] || 'application/octet-stream';
    };

    // Convertir base64 a buffer
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Generar nombre único para el archivo
    const uniqueFileName = generateUniqueFileName(fileName);
    console.log(`📝 Nombre del archivo en GCS: ${uniqueFileName}`);
    const file = bucket.file(uniqueFileName);

    // Configurar metadatos del archivo
    const fileMetadata = {
      contentType: getContentType(fileName),
      metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };

    // Subir el archivo con manejo de errores mejorado
    console.log(`⬆️ Subiendo archivo a GCS...`);
    try {
      await file.save(buffer, fileMetadata);
      console.log(`✅ Archivo subido exitosamente a GCS`);
    } catch (uploadError) {
      console.error(`❌ Error durante la subida:`, uploadError);
      
      // Manejar errores específicos de GCP
      if (uploadError.code === 403) {
        if (uploadError.message && uploadError.message.includes('billing')) {
          throw new Error(`Error de facturación: La cuenta de facturación del proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}" está deshabilitada. Por favor, habilita la facturación en Google Cloud Console.`);
        } else {
          throw new Error(`Error de permisos (403): La cuenta de servicio "${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}" no tiene permisos para escribir en el bucket "${bucketName}". Verifica que la cuenta tenga el rol "Storage Object Admin" o "Storage Object Creator".`);
        }
      } else if (uploadError.code === 404) {
        throw new Error(`Bucket no encontrado (404): El bucket "${bucketName}" no existe en el proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}".`);
      } else if (uploadError.code === 401) {
        throw new Error(`Error de autenticación (401): Las credenciales de Google Cloud no son válidas. Verifica las variables de entorno.`);
      }
      
      // Re-lanzar el error original si no es uno de los casos conocidos
      throw uploadError;
    }

    // Obtener URL pública
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;

    // Generar URL firmada para descarga (válida por 24 horas)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    });

    return {
      success: true,
      fileName: uniqueFileName,
      originalName: fileName,
      bucketUrl: `gs://${bucketName}/${uniqueFileName}`,
      publicUrl,
      downloadUrl: signedUrl,
      size: buffer.length,
      contentType: getContentType(fileName),
      uploadedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ ========== ERROR SUBIENDO DOCUMENTO A GCP ==========');
    console.error('Error completo:', error);
    
    // Extraer información útil del error
    let errorMessage = error.message || 'Error desconocido al subir documento';
    let errorDetails = null;
    
    // Si es un error de GCP con respuesta, extraer más detalles
    if (error.response && error.response.data) {
      let errorData = error.response.data;
      
      // Si errorData es un string, intentar parsearlo como JSON
      if (typeof errorData === 'string') {
        try {
          errorData = JSON.parse(errorData);
        } catch (parseError) {
          // Si no se puede parsear, usar el string directamente
          console.error('No se pudo parsear la respuesta de error como JSON');
        }
      }
      
      if (errorData && errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        if (errorData.error.errors && errorData.error.errors.length > 0) {
          errorDetails = errorData.error.errors.map(e => e.message || e).join('; ');
        }
        
        // Detectar específicamente errores de facturación
        if (errorData.error.message && errorData.error.message.includes('billing')) {
          errorMessage = `Error de facturación de Google Cloud: La cuenta de facturación del proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}" está deshabilitada. Por favor, habilita la facturación en Google Cloud Console (https://console.cloud.google.com/billing).`;
        } else if (errorData.error.code === 403) {
          if (errorData.error.message && errorData.error.message.includes('billing')) {
            errorMessage = `Error de facturación (403): La cuenta de facturación del proyecto "${process.env.GOOGLE_CLOUD_PROJECT_ID}" está deshabilitada. Habilita la facturación en Google Cloud Console.`;
          } else {
            errorMessage = `Error de permisos (403): La cuenta de servicio "${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}" no tiene permisos suficientes. Verifica los roles IAM.`;
          }
        }
      }
    }
    
    // Si el error ya tiene un mensaje claro (de nuestros throws anteriores), usarlo
    if (error.message && (error.message.includes('facturación') || error.message.includes('permisos') || error.message.includes('no existe'))) {
      errorMessage = error.message;
    }
    
    console.error(`Mensaje: ${errorMessage}`);
    if (errorDetails) {
      console.error(`Detalles: ${errorDetails}`);
    }
    console.error('===================================================\n');
    
    throw new Error(errorMessage);
  }
};

// Función para generar Excel procesado y subirlo a GCP
const generateAndUploadExcel = async (clientsData, groupName, groupId) => {
  try {
    const XLSX = require('xlsx');
    
    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    
    // Preparar datos para Excel
    const excelData = clientsData.map(client => ({
      'Nombre': client.name || '',
      'Teléfono': client.phone || '',
      'Email': client.email || '',
      'Dirección': client.address || '',
      'Categoría': client.category || 'General',
      'Estado': client.status || 'pending',
      'Fecha de Creación': client.createdAt ? new Date(client.createdAt).toLocaleDateString('es-ES') : ''
    }));

    // Crear worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 30 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 30 }, // Email
      { wch: 40 }, // Dirección
      { wch: 15 }, // Categoría
      { wch: 12 }, // Estado
      { wch: 15 }  // Fecha de Creación
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Convertir a base64
    const base64Data = excelBuffer.toString('base64');
    
    // Generar nombre del archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `clientes_procesados_${timestamp}.xlsx`;
    
    // Subir a GCP
    const uploadResult = await uploadDocumentToGCP(base64Data, fileName, {
      groupId: groupId,
      groupName: groupName,
      totalClients: clientsData.length,
      documentType: 'processed_excel',
      source: 'group_creation'
    });

    return {
      success: true,
      ...uploadResult,
      documentType: 'processed_excel'
    };

  } catch (error) {
    console.error('Error generando y subiendo Excel:', error);
    throw new Error(`Error procesando Excel: ${error.message}`);
  }
};

// Función para guardar logs de actividad con información del usuario
const logActivity = async (userId, action, description, req, metadata = {}) => {
  try {
    const { query } = require('../config/database');
    
    // Verificar si existe la tabla activity_logs
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('⚠️ Tabla activity_logs no existe, saltando log de actividad');
      return;
    }

    // Obtener información del usuario si se proporciona userId
    let userName = 'Usuario no identificado';
    let userEmail = null;
    let userRole = null;

    if (userId) {
      try {
        const userResult = await query(
          'SELECT username, email, first_name, last_name, role FROM "public"."users" WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          userName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.username;
          userEmail = user.email;
          userRole = user.role;
        }
      } catch (userError) {
        console.error('Error obteniendo información del usuario:', userError.message);
      }
    }

    // Preparar metadatos completos
    const completeMetadata = {
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
      userName,
      userEmail,
      userRole,
      ...metadata
    };

    // Insertar log de actividad
    await query(
      `INSERT INTO "public"."activity_logs" (user_id, action, description, ip_address, user_agent, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        action,
        description,
        req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
        req.get('User-Agent') || 'unknown',
        JSON.stringify(completeMetadata)
      ]
    );

    console.log(`📝 Log registrado: ${action} - ${description} por ${userName}`);

  } catch (error) {
    console.error('❌ Error registrando actividad:', error.message);
    // No lanzar error para no interrumpir el flujo principal
  }
};

// Función para obtener logs de actividad de un usuario
const getUserActivityLogs = async (userId, options = {}) => {
  try {
    const { query } = require('../config/database');
    
    const { page = 1, limit = 20, action = null } = options;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Construir query base
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramCount = 1;

    // Agregar filtro por acción si se especifica
    if (action) {
      paramCount++;
      whereClause += ` AND action = $${paramCount}`;
      queryParams.push(action);
    }

    // Obtener logs
    const logsResult = await query(
      `SELECT action, description, ip_address, user_agent, metadata, created_at
       FROM "public"."activity_logs" 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limitNum, offset]
    );

    // Contar total
    const countResult = await query(
      `SELECT COUNT(*) FROM "public"."activity_logs" ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNum);

    return {
      activities: logsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };

  } catch (error) {
    console.error('Error obteniendo logs de actividad:', error);
    throw new Error(`Error obteniendo logs: ${error.message}`);
  }
};

// Función para guardar archivos localmente en desarrollo
const saveDocumentLocally = async (base64Data, fileName, metadata = {}) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Crear directorio si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads', 'local-documents');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Generar nombre único para el archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = path.extname(fileName);
    const baseName = path.basename(fileName, fileExtension);
    const uniqueFileName = `${baseName}_${timestamp}${fileExtension}`;
    
    // Ruta completa del archivo
    const filePath = path.join(uploadsDir, uniqueFileName);
    
    // Convertir base64 a buffer y guardar
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);
    
    console.log(`📁 Archivo guardado localmente: ${filePath}`);
    console.log(`📊 Tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // URL local para desarrollo
    const localUrl = `http://localhost:${process.env.PORT || 5000}/uploads/local-documents/${uniqueFileName}`;
    
    return {
      success: true,
      fileName: uniqueFileName,
      originalName: fileName,
      localPath: filePath,
      localUrl: localUrl,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      environment: 'local'
    };

  } catch (error) {
    console.error('Error guardando documento localmente:', error);
    throw new Error(`Error guardando documento localmente: ${error.message}`);
  }
};

// Función para limpiar logs antiguos
const cleanOldActivityLogs = async (daysToKeep = 90) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(
      'DELETE FROM "public"."activity_logs" WHERE created_at < NOW() - INTERVAL $1 days RETURNING id',
      [daysToKeep]
    );

    console.log(`🧹 Limpiados ${result.rows.length} logs antiguos (más de ${daysToKeep} días)`);
    return result.rows.length;

  } catch (error) {
    console.error('Error limpiando logs antiguos:', error);
    throw new Error(`Error limpiando logs: ${error.message}`);
  }
};

// Función de Deep Merge para fusionar objetos anidados
const deepMerge = (target, source) => {
  const output = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else if (Array.isArray(source[key])) {
        // Para arrays, reemplazar completamente si existe en source
        output[key] = source[key];
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
};

// Helper para verificar si es objeto
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

module.exports = {
  sendResponse,
  sendError,
  isValidEmail,
  sanitizeInput,
  generateId,
  formatDate,
  validateRequired,
  uploadDocumentToGCP,
  saveDocumentLocally,
  generateAndUploadExcel,
  logActivity,
  getUserActivityLogs,
  cleanOldActivityLogs,
  deepMerge,
  isObject
}; 