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
    const storage = new Storage({
      credentials: credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });

    const bucketName = 'ia_calls_documents';
    const bucket = storage.bucket(bucketName);

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
    
    // Generar nombre único para el archivo
    const uniqueFileName = generateUniqueFileName(fileName);
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

    // Subir el archivo
    await file.save(buffer, fileMetadata);

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
    console.error('Error subiendo documento a GCP:', error);
    throw new Error(`Error subiendo documento: ${error.message}`);
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

module.exports = {
  sendResponse,
  sendError,
  isValidEmail,
  sanitizeInput,
  generateId,
  formatDate,
  validateRequired,
  uploadDocumentToGCP,
  generateAndUploadExcel
}; 