const { Pool } = require('pg');
const db = require('../config/database');

class GCPDocument {
  constructor(data) {
    this.id = data.id;
    // Manejar ambas estructuras: nueva (file_name) y antigua (filename)
    this.fileName = data.file_name || data.filename;
    this.originalName = data.original_name || data.fileName || data.filename;
    // Manejar bucket_url (nueva) vs bucket_name + file_path (antigua)
    if (data.bucket_url) {
      this.bucketUrl = data.bucket_url;
    } else if (data.bucket_name && data.file_path) {
      this.bucketUrl = `gs://${data.bucket_name}/${data.file_path}`;
    } else {
      this.bucketUrl = null;
    }
    this.publicUrl = data.public_url || null;
    this.downloadUrl = data.download_url || null;
    this.fileSize = data.file_size;
    // Manejar content_type (nueva) vs mime_type (antigua)
    this.contentType = data.content_type || data.mime_type;
    this.documentType = data.document_type || 'general';
    this.groupId = data.group_id || null;
    this.uploadedBy = data.uploaded_by;
    this.metadata = data.metadata;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Crear un nuevo documento
  static async create(data) {
    try {
      // Intentar primero con la estructura nueva (schema.sql)
      let query, values;
      
      try {
        query = `
          INSERT INTO gcp_documents (
            file_name, original_name, bucket_url, public_url, download_url, 
            file_size, content_type, document_type, group_id, uploaded_by, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        values = [
          data.fileName,
          data.originalName,
          data.bucketUrl,
          data.publicUrl,
          data.downloadUrl,
          data.fileSize,
          data.contentType,
          data.documentType || 'general',
          data.groupId,
          data.uploadedBy,
          JSON.stringify(data.metadata || {})
        ];

        const result = await db.query(query, values);
        return new GCPDocument(result.rows[0]);
      } catch (newStructureError) {
        // Si falla, intentar con la estructura antigua (migrate.js)
        if (newStructureError.message && newStructureError.message.includes('column') && 
            (newStructureError.message.includes('file_name') || newStructureError.message.includes('bucket_url'))) {
          
          console.log('⚠️ Usando estructura antigua de gcp_documents (migrate.js)');
          
          // Estructura antigua: filename, bucket_name, file_path, mime_type
          query = `
            INSERT INTO gcp_documents (
              filename, bucket_name, file_path, file_size, mime_type, 
              uploaded_by, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;

          // Extraer bucket_name del bucket_url (gs://bucket-name/path)
          const bucketName = data.bucketUrl ? data.bucketUrl.replace('gs://', '').split('/')[0] : 'ia_calls_documents';
          const filePath = data.bucketUrl ? data.bucketUrl.replace(`gs://${bucketName}/`, '') : data.fileName;

          values = [
            data.fileName,
            bucketName,
            filePath,
            data.fileSize,
            data.contentType || 'application/octet-stream',
            data.uploadedBy,
            JSON.stringify(data.metadata || {})
          ];

          const result = await db.query(query, values);
          
          // Adaptar la respuesta a la estructura esperada
          const adaptedRow = {
            ...result.rows[0],
            file_name: result.rows[0].filename,
            original_name: data.originalName || result.rows[0].filename,
            bucket_url: `gs://${result.rows[0].bucket_name}/${result.rows[0].file_path}`,
            public_url: data.publicUrl || null,
            download_url: data.downloadUrl || null,
            content_type: result.rows[0].mime_type,
            document_type: data.documentType || 'general',
            group_id: data.groupId || null
          };
          
          return new GCPDocument(adaptedRow);
        } else {
          // Si no es un error de columna, re-lanzar el error original
          throw newStructureError;
        }
      }
    } catch (error) {
      console.error('Error creando documento GCP:', error);
      throw error;
    }
  }

  // Buscar por ID
  static async findById(id) {
    const query = 'SELECT * FROM gcp_documents WHERE id = $1';
    
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) return null;
      return new GCPDocument(result.rows[0]);
    } catch (error) {
      console.error('Error buscando documento GCP por ID:', error);
      throw error;
    }
  }

  // Buscar por nombre de archivo
  static async findByFileName(fileName) {
    try {
      // Intentar primero con file_name (estructura nueva)
      let query = 'SELECT * FROM gcp_documents WHERE file_name = $1';
      let result = await db.query(query, [fileName]);
      
      if (result.rows.length === 0) {
        // Si no encuentra, intentar con filename (estructura antigua)
        query = 'SELECT * FROM gcp_documents WHERE filename = $1';
        result = await db.query(query, [fileName]);
      }
      
      if (result.rows.length === 0) return null;
      return new GCPDocument(result.rows[0]);
    } catch (error) {
      // Si falla con file_name, intentar con filename
      if (error.message && error.message.includes('column') && error.message.includes('file_name')) {
        try {
          const query = 'SELECT * FROM gcp_documents WHERE filename = $1';
          const result = await db.query(query, [fileName]);
          if (result.rows.length === 0) return null;
          return new GCPDocument(result.rows[0]);
        } catch (fallbackError) {
          console.error('Error buscando documento GCP por nombre:', fallbackError);
          throw fallbackError;
        }
      }
      console.error('Error buscando documento GCP por nombre:', error);
      throw error;
    }
  }

  // Buscar por grupo
  static async findByGroupId(groupId, options = {}) {
    let query = 'SELECT * FROM gcp_documents WHERE group_id = $1';
    const values = [groupId];
    let paramIndex = 2;

    // Agregar filtros opcionales
    if (options.documentType) {
      query += ` AND document_type = $${paramIndex}`;
      values.push(options.documentType);
      paramIndex++;
    }

    // Ordenar
    query += ' ORDER BY created_at DESC';

    // Paginación
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    try {
      const result = await db.query(query, values);
      return result.rows.map(row => new GCPDocument(row));
    } catch (error) {
      console.error('Error buscando documentos GCP por grupo:', error);
      throw error;
    }
  }

  // Buscar por usuario
  static async findByUserId(userId, options = {}) {
    let query = 'SELECT * FROM gcp_documents WHERE uploaded_by = $1';
    const values = [userId];
    let paramIndex = 2;

    // Agregar filtros opcionales
    if (options.documentType) {
      query += ` AND document_type = $${paramIndex}`;
      values.push(options.documentType);
      paramIndex++;
    }

    // Ordenar
    query += ' ORDER BY created_at DESC';

    // Paginación
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    try {
      const result = await db.query(query, values);
      return result.rows.map(row => new GCPDocument(row));
    } catch (error) {
      console.error('Error buscando documentos GCP por usuario:', error);
      throw error;
    }
  }

  // Obtener todos los documentos con filtros
  static async findAll(options = {}) {
    let query = 'SELECT * FROM gcp_documents WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Filtros
    if (options.groupId) {
      query += ` AND group_id = $${paramIndex}`;
      values.push(options.groupId);
      paramIndex++;
    }

    if (options.uploadedBy) {
      query += ` AND uploaded_by = $${paramIndex}`;
      values.push(options.uploadedBy);
      paramIndex++;
    }

    if (options.documentType) {
      query += ` AND document_type = $${paramIndex}`;
      values.push(options.documentType);
      paramIndex++;
    }

    // Ordenar
    query += ' ORDER BY created_at DESC';

    // Paginación
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    try {
      const result = await db.query(query, values);
      return result.rows.map(row => new GCPDocument(row));
    } catch (error) {
      console.error('Error obteniendo documentos GCP:', error);
      throw error;
    }
  }

  // Contar documentos
  static async count(options = {}) {
    let query = 'SELECT COUNT(*) FROM gcp_documents WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Filtros
    if (options.groupId) {
      query += ` AND group_id = $${paramIndex}`;
      values.push(options.groupId);
      paramIndex++;
    }

    if (options.uploadedBy) {
      query += ` AND uploaded_by = $${paramIndex}`;
      values.push(options.uploadedBy);
      paramIndex++;
    }

    if (options.documentType) {
      query += ` AND document_type = $${paramIndex}`;
      values.push(options.documentType);
      paramIndex++;
    }

    try {
      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error contando documentos GCP:', error);
      throw error;
    }
  }

  // Actualizar documento
  async update(data) {
    const query = `
      UPDATE gcp_documents 
      SET 
        file_name = COALESCE($1, file_name),
        original_name = COALESCE($2, original_name),
        bucket_url = COALESCE($3, bucket_url),
        public_url = COALESCE($4, public_url),
        download_url = COALESCE($5, download_url),
        file_size = COALESCE($6, file_size),
        content_type = COALESCE($7, content_type),
        document_type = COALESCE($8, document_type),
        group_id = COALESCE($9, group_id),
        metadata = COALESCE($10, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      data.fileName,
      data.originalName,
      data.bucketUrl,
      data.publicUrl,
      data.downloadUrl,
      data.fileSize,
      data.contentType,
      data.documentType,
      data.groupId,
      JSON.stringify(data.metadata || {}),
      this.id
    ];

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) return null;
      
      // Actualizar instancia
      Object.assign(this, new GCPDocument(result.rows[0]));
      return this;
    } catch (error) {
      console.error('Error actualizando documento GCP:', error);
      throw error;
    }
  }

  // Eliminar documento
  async delete() {
    const query = 'DELETE FROM gcp_documents WHERE id = $1 RETURNING *';
    
    try {
      const result = await db.query(query, [this.id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error eliminando documento GCP:', error);
      throw error;
    }
  }

  // Obtener documentos por cliente con información de grupos
  static async findByClientIdWithGroups(clientId, options = {}) {
    const query = `
      SELECT 
        gd.*,
        g.name as group_name,
        g.description as group_description,
        g.color as group_color,
        g.is_active as group_is_active,
        g.created_by as group_created_by,
        g.created_at as group_created_at,
        g.updated_at as group_updated_at,
        g.prompt as group_prompt,
        g.favorite as group_favorite
      FROM gcp_documents gd
      LEFT JOIN groups g ON gd.group_id = g.id
      WHERE gd.uploaded_by = $1
      ${options.documentType ? 'AND gd.document_type = $2' : ''}
      ORDER BY gd.created_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
      ${options.offset ? `OFFSET ${options.offset}` : ''}
    `;

    const values = [clientId];
    if (options.documentType) {
      values.push(options.documentType);
    }

    try {
      const result = await db.query(query, values);
      return result.rows.map(row => {
        const document = new GCPDocument(row);
        // Agregar información del grupo si existe
        if (row.group_id) {
          document.groupInfo = {
            id: row.group_id,
            name: row.group_name,
            description: row.group_description,
            color: row.group_color,
            isActive: row.group_is_active,
            createdBy: row.group_created_by,
            createdAt: row.group_created_at,
            updatedAt: row.group_updated_at,
            prompt: row.group_prompt,
            favorite: row.group_favorite
          };
        }
        return document;
      });
    } catch (error) {
      console.error('Error obteniendo documentos del cliente con grupos:', error);
      throw error;
    }
  }

  // Contar documentos por cliente
  static async countByClientId(clientId) {
    const query = 'SELECT COUNT(*) FROM gcp_documents WHERE uploaded_by = $1';
    
    try {
      const result = await db.query(query, [clientId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error contando documentos del cliente:', error);
      throw error;
    }
  }

  // Convertir a JSON
  toJSON() {
    const json = {
      id: this.id,
      fileName: this.fileName,
      originalName: this.originalName,
      bucketUrl: this.bucketUrl,
      publicUrl: this.publicUrl,
      downloadUrl: this.downloadUrl,
      fileSize: this.fileSize,
      contentType: this.contentType,
      documentType: this.documentType,
      groupId: this.groupId,
      uploadedBy: this.uploadedBy,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    // Agregar información del grupo si existe
    if (this.groupInfo) {
      json.groupInfo = this.groupInfo;
    }

    return json;
  }
}

module.exports = GCPDocument;
