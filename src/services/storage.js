const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor() {
    // Inicializar Google Cloud Storage
    this.storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
    this.bucket = this.storage.bucket(this.bucketName);
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

      // Generar URL firmada para descarga (válida por 1 hora)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hora
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

      // Generar URL firmada
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (expiresInHours * 60 * 60 * 1000),
      });

      return {
        success: true,
        downloadUrl: signedUrl,
        expiresAt: new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString(),
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

  // Determinar el tipo de contenido basado en la extensión
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
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