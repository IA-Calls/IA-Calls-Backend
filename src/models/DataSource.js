const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * Modelo para gestionar fuentes de información para agentes
 * Permite multiusuario: cada usuario solo puede ver/editar sus propias fuentes
 */
class DataSource {
  constructor(dataSourceData) {
    this.id = dataSourceData.id;
    this.userId = dataSourceData.user_id;
    this.name = dataSourceData.name;
    this.type = dataSourceData.type;
    
    // Configuración de base de datos
    this.dbHost = dataSourceData.db_host;
    this.dbPort = dataSourceData.db_port;
    this.dbName = dataSourceData.db_name;
    this.dbUser = dataSourceData.db_user;
    this.dbPasswordEncrypted = dataSourceData.db_password_encrypted;
    this.dbType = dataSourceData.db_type;
    this.selectedDatabase = dataSourceData.selected_database;
    this.selectedTable = dataSourceData.selected_table;
    
    // Configuración de archivos
    this.fileName = dataSourceData.file_name;
    this.filePath = dataSourceData.file_path;
    this.fileSize = dataSourceData.file_size;
    this.fileMimeType = dataSourceData.file_mime_type;
    this.gcsBucket = dataSourceData.gcs_bucket;
    this.gcsObjectName = dataSourceData.gcs_object_name;
    
    // Configuración de Google Sheets
    this.googleSheetUrl = dataSourceData.google_sheet_url;
    this.sheetId = dataSourceData.sheet_id;
    this.sheetName = dataSourceData.sheet_name;
    
    // Estado y procesamiento
    this.status = dataSourceData.status;
    this.processedData = typeof dataSourceData.processed_data === 'string' 
      ? JSON.parse(dataSourceData.processed_data) 
      : (dataSourceData.processed_data || {});
    this.metadata = typeof dataSourceData.metadata === 'string'
      ? JSON.parse(dataSourceData.metadata)
      : (dataSourceData.metadata || {});
    this.errorMessage = dataSourceData.error_message;
    this.agentId = dataSourceData.agent_id;
    
    // Timestamps
    this.createdAt = dataSourceData.created_at;
    this.updatedAt = dataSourceData.updated_at;
    this.processedAt = dataSourceData.processed_at;
    this.syncedAt = dataSourceData.synced_at;
  }

  toJSON() {
    const json = {
      id: this.id,
      user_id: this.userId,
      name: this.name,
      type: this.type,
      status: this.status,
      processed_data: this.processedData,
      metadata: this.metadata,
      agent_id: this.agentId,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      processed_at: this.processedAt,
      synced_at: this.syncedAt
    };

    // Solo incluir campos según el tipo
    if (this.type === 'database') {
      json.db_host = this.dbHost;
      json.db_port = this.dbPort;
      json.db_name = this.dbName;
      json.db_user = this.dbUser;
      json.db_type = this.dbType;
      json.selected_database = this.selectedDatabase;
      json.selected_table = this.selectedTable;
      // NO incluir contraseña por seguridad
    } else if (this.type === 'excel' || this.type === 'pdf') {
      json.file_name = this.fileName;
      json.file_path = this.filePath;
      json.file_size = this.fileSize;
      json.file_mime_type = this.fileMimeType;
      json.gcs_bucket = this.gcsBucket;
      json.gcs_object_name = this.gcsObjectName;
    } else if (this.type === 'google_sheet') {
      json.google_sheet_url = this.googleSheetUrl;
      json.sheet_id = this.sheetId;
      json.sheet_name = this.sheetName;
    }

    return json;
  }

  /**
   * Encriptar contraseña de base de datos
   */
  static encryptPassword(password) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!', 'utf8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Desencriptar contraseña de base de datos
   */
  static decryptPassword(encryptedData) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!', 'utf8').slice(0, 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const encrypted = encryptedData.encrypted;
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Error desencriptando contraseña');
    }
  }

  /**
   * Crear una nueva fuente de información
   */
  static async create(dataSourceData) {
    const {
      user_id,
      name,
      type,
      db_host,
      db_port,
      db_name,
      db_user,
      db_password,
      db_type,
      file_name,
      file_path,
      file_size,
      file_mime_type,
      gcs_bucket,
      gcs_object_name,
      google_sheet_url,
      sheet_id,
      sheet_name,
      agent_id,
      metadata = {}
    } = dataSourceData;

    if (!user_id || !name || !type) {
      throw new Error('user_id, name y type son requeridos');
    }

    // Encriptar contraseña si es base de datos
    let db_password_encrypted = null;
    if (type === 'database' && db_password) {
      const encrypted = this.encryptPassword(db_password);
      db_password_encrypted = JSON.stringify(encrypted);
    }

    const result = await query(
      `INSERT INTO data_sources (
        user_id, name, type,
        db_host, db_port, db_name, db_user, db_password_encrypted, db_type,
        file_name, file_path, file_size, file_mime_type, gcs_bucket, gcs_object_name,
        google_sheet_url, sheet_id, sheet_name,
        agent_id, metadata
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20
      ) RETURNING *`,
      [
        user_id, name, type,
        db_host || null, db_port || null, db_name || null, db_user || null, db_password_encrypted, db_type || null,
        file_name || null, file_path || null, file_size || null, file_mime_type || null, gcs_bucket || null, gcs_object_name || null,
        google_sheet_url || null, sheet_id || null, sheet_name || null,
        agent_id || null, JSON.stringify(metadata)
      ]
    );

    return new DataSource(result.rows[0]);
  }

  /**
   * Listar fuentes de información de un usuario
   */
  static async findByUserId(userId, filters = {}) {
    let sql = 'SELECT * FROM data_sources WHERE user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (filters.type) {
      sql += ` AND type = $${paramCount++}`;
      params.push(filters.type);
    }

    if (filters.status) {
      sql += ` AND status = $${paramCount++}`;
      params.push(filters.status);
    }

    if (filters.agent_id) {
      sql += ` AND agent_id = $${paramCount++}`;
      params.push(filters.agent_id);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows.map(row => new DataSource(row));
  }

  /**
   * Obtener fuente por ID y validar ownership
   */
  static async findByIdAndUserId(id, userId) {
    const result = await query(
      'SELECT * FROM data_sources WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new DataSource(result.rows[0]);
  }

  /**
   * Verificar si una fuente pertenece a un usuario
   */
  static async belongsToUser(id, userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM data_sources WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Actualizar fuente de información
   */
  static async update(id, userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (updates.processed_data !== undefined) {
      fields.push(`processed_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.processed_data));
      fields.push(`processed_at = NOW()`);
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updates.error_message !== undefined) {
      fields.push(`error_message = $${paramCount++}`);
      values.push(updates.error_message);
    }

    if (updates.agent_id !== undefined) {
      fields.push(`agent_id = $${paramCount++}`);
      values.push(updates.agent_id);
    }

    if (updates.selected_database !== undefined) {
      fields.push(`selected_database = $${paramCount++}`);
      values.push(updates.selected_database);
    }

    if (updates.selected_table !== undefined) {
      fields.push(`selected_table = $${paramCount++}`);
      values.push(updates.selected_table);
    }

    if (updates.agent_id !== undefined) {
      fields.push(`agent_id = $${paramCount++}`);
      values.push(updates.agent_id);
    }

    if (updates.synced_at !== undefined) {
      fields.push(`synced_at = $${paramCount++}`);
      values.push(updates.synced_at);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE data_sources 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Fuente no encontrada o no pertenece al usuario');
    }

    return new DataSource(result.rows[0]);
  }

  /**
   * Eliminar fuente de información
   */
  static async delete(id, userId) {
    const result = await query(
      'DELETE FROM data_sources WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Obtener contraseña desencriptada (solo para uso interno)
   */
  getDecryptedPassword() {
    if (this.type !== 'database' || !this.dbPasswordEncrypted) {
      return null;
    }

    try {
      const encryptedData = typeof this.dbPasswordEncrypted === 'string'
        ? JSON.parse(this.dbPasswordEncrypted)
        : this.dbPasswordEncrypted;
      
      return DataSource.decryptPassword(encryptedData);
    } catch (error) {
      throw new Error('Error desencriptando contraseña');
    }
  }
}

module.exports = DataSource;

