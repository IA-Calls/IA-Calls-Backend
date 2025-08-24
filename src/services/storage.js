const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor() {
    // Verificar configuración antes de inicializar
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      console.warn('⚠️ GOOGLE_CLOUD_BUCKET_NAME no configurado. Servicio de storage no disponible.');
      this.configured = false;
      return;
    }

    try {
      // Configuración de Google Cloud Storage
      const storageConfig = {};
      
      // Usar archivo de credenciales si está especificado, sino usar variables de entorno
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        storageConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      } else if (process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
        // Usar variables de entorno si no hay archivo de credenciales
        storageConfig.credentials = {
          client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
        storageConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      } else {
        throw new Error('No se encontraron credenciales de Google Cloud (ni archivo ni variables de entorno)');
      }
      
      // Inicializar Google Cloud Storage
      this.storage = new Storage(storageConfig);
      
      this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
      this.bucket = this.storage.bucket(this.bucketName);
      this.configured = true;
    } catch (error) {
      console.error('❌ Error inicializando Google Cloud Storage:', error.message);
      this.configured = false;
    }
  }

  // Verificar si el servicio está configurado
  _checkConfiguration() {
    if (!this.configured) {
      throw new Error('Servicio de Google Cloud Storage no configurado. Verifica las variables de entorno.');
    }
  }

  // Generar nombre único para el archivo
  generateUniqueFileName(originalName, prefix = 'excel-uploads') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Estructura: excel-uploads/YYYY/MM/DD/filename_timestamp_random.ext
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${prefix}/${year}/${month}/${day}/${baseName}_${timestamp}_${randomString}${extension}`;
  }

  // Subir archivo al bucket
  async uploadFile(buffer, originalName, metadata = {}) {
    try {
      this._checkConfiguration();
      const fileName = this.generateUniqueFileName(originalName);
      const file = this.bucket.file(fileName);

      // Configurar metadatos del archivo
      const fileMetadata = {
        contentType: this.getContentType(originalName),
        metadata: {
          originalName,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      };

      // Subir el archivo
      await file.save(buffer, fileMetadata);

      // Obtener URL pública
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

      // Generar URL firmada para descarga (válida por 10 años - prácticamente ilimitada)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (10 * 365 * 24 * 60 * 60 * 1000), // 10 años
      });

      return {
        success: true,
        fileName,
        originalName,
        bucketUrl: `gs://${this.bucketName}/${fileName}`,
        publicUrl,
        downloadUrl: signedUrl,
        size: buffer.length,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error subiendo archivo a GCS:', error);
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }
  }

  // Descargar archivo del bucket
  async downloadFile(fileName) {
    try {
      const file = this.bucket.file(fileName);
      
      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Archivo no encontrado en el bucket');
      }

      // Obtener metadatos del archivo
      const [metadata] = await file.getMetadata();
      
      // Descargar el archivo
      const [buffer] = await file.download();

      return {
        success: true,
        buffer,
        metadata,
        fileName,
        size: buffer.length
      };

    } catch (error) {
      console.error('Error descargando archivo de GCS:', error);
      throw new Error(`Error descargando archivo: ${error.message}`);
    }
  }

  // Generar URL de descarga temporal
  async generateDownloadUrl(fileName, expiresInHours = 1) {
    try {
      const file = this.bucket.file(fileName);
      
      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Archivo no encontrado en el bucket');
      }

      // Generar URL firmada (usar tiempo especificado o 10 años por defecto)
      const expirationTime = expiresInHours === 1 ? 
        Date.now() + (10 * 365 * 24 * 60 * 60 * 1000) : // 10 años si es valor por defecto
        Date.now() + (expiresInHours * 60 * 60 * 1000);   // Tiempo especificado si es personalizado

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expirationTime,
      });

      return {
        success: true,
        downloadUrl: signedUrl,
        expiresAt: new Date(expirationTime).toISOString(),
        fileName
      };

    } catch (error) {
      console.error('Error generando URL de descarga:', error);
      throw new Error(`Error generando URL: ${error.message}`);
    }
  }

  // Listar archivos en el bucket
  async listFiles(prefix = 'excel-uploads', maxResults = 50) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix,
        maxResults
      });

      const fileList = await Promise.all(
        files.map(async (file) => {
          const [metadata] = await file.getMetadata();
          return {
            name: file.name,
            originalName: metadata.metadata?.originalName || file.name,
            size: parseInt(metadata.size),
            contentType: metadata.contentType,
            uploadedAt: metadata.metadata?.uploadedAt || metadata.timeCreated,
            bucketUrl: `gs://${this.bucketName}/${file.name}`,
            publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`
          };
        })
      );

      return {
        success: true,
        files: fileList,
        total: fileList.length
      };

    } catch (error) {
      console.error('Error listando archivos de GCS:', error);
      throw new Error(`Error listando archivos: ${error.message}`);
    }
  }

  // Eliminar archivo del bucket
  async deleteFile(fileName) {
    try {
      const file = this.bucket.file(fileName);
      
      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Archivo no encontrado en el bucket');
      }

      // Eliminar el archivo
      await file.delete();

      return {
        success: true,
        message: 'Archivo eliminado exitosamente',
        fileName
      };

    } catch (error) {
      console.error('Error eliminando archivo de GCS:', error);
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }
  }

  // Obtener información del archivo
  async getFileInfo(fileName) {
    try {
      const file = this.bucket.file(fileName);
      
      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Archivo no encontrado en el bucket');
      }

      // Obtener metadatos
      const [metadata] = await file.getMetadata();

      return {
        success: true,
        fileName,
        originalName: metadata.metadata?.originalName || fileName,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        uploadedAt: metadata.metadata?.uploadedAt || metadata.timeCreated,
        bucketUrl: `gs://${this.bucketName}/${fileName}`,
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${fileName}`,
        metadata: metadata.metadata
      };

    } catch (error) {
      console.error('Error obteniendo información del archivo:', error);
      throw new Error(`Error obteniendo información: ${error.message}`);
    }
  }

  // Subir audio de conversación con estructura específica
  async uploadConversationAudio(buffer, conversationId, userId, metadata = {}) {
    try {
      this._checkConfiguration();
      // Generar nombre de archivo específico para audios de conversación
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Estructura: conversation-audios/{userId}/{year}/{month}/{day}/{conversationId}_{timestamp}.mp3
      const fileName = `conversation-audios/${userId}/${year}/${month}/${day}/${conversationId}_${timestamp}.mp3`;
      const file = this.bucket.file(fileName);

      // Configurar metadatos del archivo
      const fileMetadata = {
        contentType: metadata.contentType || 'audio/mpeg',
        metadata: {
          conversationId,
          userId,
          source: metadata.source || 'elevenlabs',
          originalSize: metadata.originalSize || buffer.length,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      };

      console.log(`📁 Subiendo audio a GCS: ${fileName}`);

      // Subir el archivo
      await file.save(buffer, fileMetadata);

      // Obtener URL pública
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

      // Generar URL firmada para descarga (válida por 10 años - prácticamente ilimitada)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (10 * 365 * 24 * 60 * 60 * 1000), // 10 años
      });

      console.log(`✅ Audio subido exitosamente a GCS: ${fileName}`);

      return {
        success: true,
        fileName,
        conversationId,
        userId,
        bucketUrl: `gs://${this.bucketName}/${fileName}`,
        publicUrl,
        downloadUrl: signedUrl,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        contentType: fileMetadata.contentType
      };

    } catch (error) {
      console.error('❌ Error subiendo audio de conversación a GCS:', error);
      throw new Error(`Error subiendo audio: ${error.message}`);
    }
  }

  // Listar audios de conversaciones de un usuario específico
  async listConversationAudios(userId, maxResults = 50) {
    try {
      const prefix = `conversation-audios/${userId}/`;
      
      console.log(`🔍 Listando audios para usuario ${userId} con prefijo: ${prefix}`);

      const [files] = await this.bucket.getFiles({
        prefix,
        maxResults
      });

      const audioList = await Promise.all(
        files.map(async (file) => {
          const [metadata] = await file.getMetadata();
          return {
            name: file.name,
            conversationId: metadata.metadata?.conversationId || 'unknown',
            userId: metadata.metadata?.userId || userId,
            size: parseInt(metadata.size),
            contentType: metadata.contentType,
            uploadedAt: metadata.metadata?.uploadedAt || metadata.timeCreated,
            bucketUrl: `gs://${this.bucketName}/${file.name}`,
            publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`
          };
        })
      );

      console.log(`✅ Se encontraron ${audioList.length} audios para el usuario ${userId}`);

      return {
        success: true,
        audios: audioList,
        total: audioList.length
      };

    } catch (error) {
      console.error(`❌ Error listando audios para usuario ${userId}:`, error);
      return {
        success: false,
        error: error.message,
        audios: [],
        total: 0
      };
    }
  }

  // Generar URL de descarga para un audio específico  
  async generateAudioDownloadUrl(fileName, expiresInHours = null) {
    try {
      const file = this.bucket.file(fileName);
      
      // Verificar si el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Archivo de audio no encontrado en el bucket');
      }

      // Generar URL firmada (usar 10 años por defecto o tiempo especificado)
      const expirationTime = expiresInHours === null ? 
        Date.now() + (10 * 365 * 24 * 60 * 60 * 1000) : // 10 años por defecto
        Date.now() + (expiresInHours * 60 * 60 * 1000);   // Tiempo especificado

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expirationTime,
      });

      const expiresAt = new Date(expirationTime).toISOString();

      console.log(`🔗 URL de descarga generada para ${fileName}, expira: ${expiresAt}`);

      return {
        success: true,
        downloadUrl: signedUrl,
        expiresAt,
        fileName
      };

    } catch (error) {
      console.error(`❌ Error generando URL de descarga para ${fileName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Determinar el tipo de contenido basado en la extensión
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  // Verificar configuración del servicio
  async testConnection() {
    try {
      // Intentar listar archivos para verificar la conexión
      await this.bucket.getFiles({ maxResults: 1 });
      
      return {
        success: true,
        message: 'Conexión a Google Cloud Storage exitosa',
        bucketName: this.bucketName,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      };

    } catch (error) {
      console.error('Error probando conexión a GCS:', error);
      throw new Error(`Error de conexión: ${error.message}`);
    }
  }
}

module.exports = new StorageService(); 