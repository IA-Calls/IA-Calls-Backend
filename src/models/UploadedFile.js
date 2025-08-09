const { query } = require('../config/database');

class UploadedFile {
  constructor(fileData) {
    this.id = fileData.id;
    this.originalName = fileData.original_name;
    this.fileName = fileData.file_name;
    this.bucketUrl = fileData.bucket_url;
    this.publicUrl = fileData.public_url;
    this.downloadUrl = fileData.download_url;
    this.fileSize = fileData.file_size;
    this.contentType = fileData.content_type;
    this.uploadedBy = fileData.uploaded_by;
    this.groupId = fileData.group_id;
    this.metadata = fileData.metadata;
    this.isActive = fileData.is_active !== undefined ? fileData.is_active : true;
    this.createdAt = fileData.created_at;
    this.updatedAt = fileData.updated_at;
  }

  // Crear registro de archivo subido
  static async create(fileData) {
    try {
      const {
        originalName,
        fileName,
        bucketUrl,
        publicUrl,
        downloadUrl,
        fileSize,
        contentType,
        uploadedBy,
        groupId,
        metadata
      } = fileData;

      const result = await query(
        `INSERT INTO "public"."uploaded_files" 
         (original_name, file_name, bucket_url, public_url, download_url, file_size, content_type, uploaded_by, group_id, metadata, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         RETURNING *`,
        [originalName, fileName, bucketUrl, publicUrl, downloadUrl, fileSize, contentType, uploadedBy, groupId, JSON.stringify(metadata), true]
      );

      return new UploadedFile(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creando registro de archivo: ${error.message}`);
    }
  }

  // Buscar archivo por ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM "public"."uploaded_files" WHERE id = $1 AND is_active = true',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new UploadedFile(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando archivo: ${error.message}`);
    }
  }

  // Buscar archivo por nombre en el bucket
  static async findByFileName(fileName) {
    try {
      const result = await query(
        'SELECT * FROM "public"."uploaded_files" WHERE file_name = $1 AND is_active = true',
        [fileName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new UploadedFile(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando archivo por nombre: ${error.message}`);
    }
  }

  // Obtener todos los archivos
  static async findAll(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        uploadedBy = null,
        groupId = null,
        contentType = null,
        includeInactive = false
      } = options;

      let whereConditions = [];
      let params = [];
      let paramCount = 1;

      if (!includeInactive) {
        whereConditions.push('is_active = true');
      }

      if (uploadedBy) {
        whereConditions.push(`uploaded_by = $${paramCount}`);
        params.push(uploadedBy);
        paramCount++;
      }

      if (groupId) {
        whereConditions.push(`group_id = $${paramCount}`);
        params.push(groupId);
        paramCount++;
      }

      if (contentType) {
        whereConditions.push(`content_type = $${paramCount}`);
        params.push(contentType);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      params.push(limit, offset);

      const result = await query(
        `SELECT * FROM "public"."uploaded_files" ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );

      return result.rows.map(row => new UploadedFile(row));
    } catch (error) {
      throw new Error(`Error obteniendo archivos: ${error.message}`);
    }
  }

  // Actualizar archivo
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const dbField = key === 'originalName' ? 'original_name' :
                         key === 'fileName' ? 'file_name' :
                         key === 'bucketUrl' ? 'bucket_url' :
                         key === 'publicUrl' ? 'public_url' :
                         key === 'downloadUrl' ? 'download_url' :
                         key === 'fileSize' ? 'file_size' :
                         key === 'contentType' ? 'content_type' :
                         key === 'uploadedBy' ? 'uploaded_by' :
                         key === 'groupId' ? 'group_id' :
                         key === 'isActive' ? 'is_active' : key;

          if (key === 'metadata') {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${dbField} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push(`updated_at = NOW()`);
      values.push(this.id);

      const result = await query(
        `UPDATE "public"."uploaded_files" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Archivo no encontrado');
      }

      Object.assign(this, new UploadedFile(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Error actualizando archivo: ${error.message}`);
    }
  }

  // Eliminar archivo (soft delete)
  async delete() {
    try {
      const result = await query(
        'UPDATE "public"."uploaded_files" SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Archivo no encontrado');
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }
  }

  // Contar archivos
  static async count(options = {}) {
    try {
      const {
        uploadedBy = null,
        groupId = null,
        contentType = null,
        includeInactive = false
      } = options;

      let whereConditions = [];
      let params = [];
      let paramCount = 1;

      if (!includeInactive) {
        whereConditions.push('is_active = true');
      }

      if (uploadedBy) {
        whereConditions.push(`uploaded_by = $${paramCount}`);
        params.push(uploadedBy);
        paramCount++;
      }

      if (groupId) {
        whereConditions.push(`group_id = $${paramCount}`);
        params.push(groupId);
        paramCount++;
      }

      if (contentType) {
        whereConditions.push(`content_type = $${paramCount}`);
        params.push(contentType);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT COUNT(*) FROM "public"."uploaded_files" ${whereClause}`,
        params
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error contando archivos: ${error.message}`);
    }
  }

  // Método toJSON para serialización
  toJSON() {
    return {
      id: this.id,
      originalName: this.originalName,
      fileName: this.fileName,
      bucketUrl: this.bucketUrl,
      publicUrl: this.publicUrl,
      downloadUrl: this.downloadUrl,
      fileSize: this.fileSize,
      contentType: this.contentType,
      uploadedBy: this.uploadedBy,
      groupId: this.groupId,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = UploadedFile; 