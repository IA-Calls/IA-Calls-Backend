const { query } = require('../config/database');

/**
 * Modelo para gestionar elementos de conocimiento para agentes
 * Permite multiusuario: cada usuario solo puede ver/editar sus propios elementos
 */
class KnowledgeItem {
  constructor(itemData) {
    this.id = itemData.id;
    this.userId = itemData.user_id;
    this.name = itemData.name;
    this.type = itemData.type;
    
    // Configuración de enlaces
    this.url = itemData.url;
    this.linkType = itemData.link_type;
    this.linkTitle = itemData.link_title;
    this.linkDescription = itemData.link_description;
    this.linkMetadata = typeof itemData.link_metadata === 'string'
      ? JSON.parse(itemData.link_metadata)
      : (itemData.link_metadata || {});
    
    // Configuración de documentos
    this.fileName = itemData.file_name;
    this.filePath = itemData.file_path;
    this.fileSize = itemData.file_size;
    this.fileMimeType = itemData.file_mime_type;
    this.gcsBucket = itemData.gcs_bucket;
    this.gcsObjectName = itemData.gcs_object_name;
    this.documentType = itemData.document_type;
    
    // Contenido procesado
    this.processedContent = itemData.processed_content;
    this.processedData = typeof itemData.processed_data === 'string'
      ? JSON.parse(itemData.processed_data)
      : (itemData.processed_data || {});
    this.extractionStatus = itemData.extraction_status;
    
    // Parámetros de uso
    this.triggers = typeof itemData.triggers === 'string'
      ? JSON.parse(itemData.triggers)
      : (itemData.triggers || []);
    this.conversationTypes = typeof itemData.conversation_types === 'string'
      ? JSON.parse(itemData.conversation_types)
      : (itemData.conversation_types || []);
    this.priority = itemData.priority || 5;
    this.usageContext = itemData.usage_context;
    this.usageInstructions = itemData.usage_instructions;
    
    // Vinculación
    this.agentId = itemData.agent_id;
    this.isActive = itemData.is_active;
    this.metadata = typeof itemData.metadata === 'string'
      ? JSON.parse(itemData.metadata)
      : (itemData.metadata || {});
    this.errorMessage = itemData.error_message;
    
    // Timestamps
    this.createdAt = itemData.created_at;
    this.updatedAt = itemData.updated_at;
    this.processedAt = itemData.processed_at;
    this.syncedAt = itemData.synced_at;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      name: this.name,
      type: this.type,
      url: this.url,
      link_type: this.linkType,
      link_title: this.linkTitle,
      link_description: this.linkDescription,
      link_metadata: this.linkMetadata,
      file_name: this.fileName,
      file_path: this.filePath,
      file_size: this.fileSize,
      file_mime_type: this.fileMimeType,
      gcs_bucket: this.gcsBucket,
      gcs_object_name: this.gcsObjectName,
      document_type: this.documentType,
      processed_content: this.processedContent,
      processed_data: this.processedData,
      extraction_status: this.extractionStatus,
      triggers: this.triggers,
      conversation_types: this.conversationTypes,
      priority: this.priority,
      usage_context: this.usageContext,
      usage_instructions: this.usageInstructions,
      agent_id: this.agentId,
      is_active: this.isActive,
      metadata: this.metadata,
      error_message: this.errorMessage,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      processed_at: this.processedAt,
      synced_at: this.syncedAt
    };
  }

  /**
   * Crear un nuevo elemento de conocimiento
   */
  static async create(itemData) {
    const {
      user_id,
      name,
      type,
      url,
      link_type,
      link_title,
      link_description,
      link_metadata = {},
      file_name,
      file_path,
      file_size,
      file_mime_type,
      gcs_bucket,
      gcs_object_name,
      document_type,
      triggers = [],
      conversation_types = [],
      priority = 5,
      usage_context,
      usage_instructions,
      agent_id,
      metadata = {}
    } = itemData;

    if (!user_id || !name || !type) {
      throw new Error('user_id, name y type son requeridos');
    }

    if (!['link', 'document'].includes(type)) {
      throw new Error('type debe ser "link" o "document"');
    }

    const result = await query(
      `INSERT INTO knowledge_items (
        user_id, name, type,
        url, link_type, link_title, link_description, link_metadata,
        file_name, file_path, file_size, file_mime_type, gcs_bucket, gcs_object_name, document_type,
        triggers, conversation_types, priority, usage_context, usage_instructions,
        agent_id, metadata
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22
      ) RETURNING *`,
      [
        user_id, name, type,
        url || null, link_type || null, link_title || null, link_description || null, JSON.stringify(link_metadata),
        file_name || null, file_path || null, file_size || null, file_mime_type || null, gcs_bucket || null, gcs_object_name || null, document_type || null,
        JSON.stringify(triggers), JSON.stringify(conversation_types), priority, usage_context || null, usage_instructions || null,
        agent_id || null, JSON.stringify(metadata)
      ]
    );

    return new KnowledgeItem(result.rows[0]);
  }

  /**
   * Listar elementos de conocimiento de un usuario
   */
  static async findByUserId(userId, filters = {}) {
    let sql = 'SELECT * FROM knowledge_items WHERE user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (filters.type) {
      sql += ` AND type = $${paramCount++}`;
      params.push(filters.type);
    }

    if (filters.agent_id) {
      sql += ` AND agent_id = $${paramCount++}`;
      params.push(filters.agent_id);
    }

    if (filters.is_active !== undefined) {
      sql += ` AND is_active = $${paramCount++}`;
      params.push(filters.is_active);
    }

    if (filters.extraction_status) {
      sql += ` AND extraction_status = $${paramCount++}`;
      params.push(filters.extraction_status);
    }

    if (filters.search) {
      sql += ` AND (name ILIKE $${paramCount} OR processed_content ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    sql += ' ORDER BY priority DESC, created_at DESC';

    const result = await query(sql, params);
    return result.rows.map(row => new KnowledgeItem(row));
  }

  /**
   * Buscar elementos por palabras clave (triggers)
   */
  static async findByTriggers(userId, keywords, agentId = null) {
    let sql = `
      SELECT * FROM knowledge_items 
      WHERE user_id = $1 
        AND is_active = true
        AND extraction_status = 'completed'
    `;
    const params = [userId];
    let paramCount = 2;

    if (agentId) {
      sql += ` AND (agent_id = $${paramCount} OR agent_id IS NULL)`;
      params.push(agentId);
      paramCount++;
    }

    // Buscar elementos cuyos triggers coincidan con las palabras clave
    const keywordConditions = [];
    keywords.forEach(keyword => {
      keywordConditions.push(`$${paramCount} = ANY(triggers)`);
      params.push(keyword.toLowerCase());
      paramCount++;
    });

    if (keywordConditions.length > 0) {
      sql += ` AND (${keywordConditions.join(' OR ')})`;
    }

    sql += ' ORDER BY priority DESC';

    const result = await query(sql, params);
    return result.rows.map(row => new KnowledgeItem(row));
  }

  /**
   * Obtener elemento por ID y validar ownership
   */
  static async findByIdAndUserId(id, userId) {
    const result = await query(
      'SELECT * FROM knowledge_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new KnowledgeItem(result.rows[0]);
  }

  /**
   * Verificar si un elemento pertenece a un usuario
   */
  static async belongsToUser(id, userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM knowledge_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Actualizar elemento de conocimiento
   */
  static async update(id, userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.url !== undefined) {
      fields.push(`url = $${paramCount++}`);
      values.push(updates.url);
    }

    if (updates.link_type !== undefined) {
      fields.push(`link_type = $${paramCount++}`);
      values.push(updates.link_type);
    }

    if (updates.link_title !== undefined) {
      fields.push(`link_title = $${paramCount++}`);
      values.push(updates.link_title);
    }

    if (updates.link_description !== undefined) {
      fields.push(`link_description = $${paramCount++}`);
      values.push(updates.link_description);
    }

    if (updates.triggers !== undefined) {
      fields.push(`triggers = $${paramCount++}`);
      values.push(JSON.stringify(updates.triggers));
    }

    if (updates.conversation_types !== undefined) {
      fields.push(`conversation_types = $${paramCount++}`);
      values.push(JSON.stringify(updates.conversation_types));
    }

    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }

    if (updates.usage_context !== undefined) {
      fields.push(`usage_context = $${paramCount++}`);
      values.push(updates.usage_context);
    }

    if (updates.usage_instructions !== undefined) {
      fields.push(`usage_instructions = $${paramCount++}`);
      values.push(updates.usage_instructions);
    }

    if (updates.processed_content !== undefined) {
      fields.push(`processed_content = $${paramCount++}`);
      values.push(updates.processed_content);
      fields.push(`processed_at = NOW()`);
    }

    if (updates.processed_data !== undefined) {
      fields.push(`processed_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.processed_data));
    }

    if (updates.extraction_status !== undefined) {
      fields.push(`extraction_status = $${paramCount++}`);
      values.push(updates.extraction_status);
    }

    if (updates.agent_id !== undefined) {
      fields.push(`agent_id = $${paramCount++}`);
      values.push(updates.agent_id);
    }

    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }

    if (updates.error_message !== undefined) {
      fields.push(`error_message = $${paramCount++}`);
      values.push(updates.error_message);
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
      `UPDATE knowledge_items 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Elemento no encontrado o no pertenece al usuario');
    }

    return new KnowledgeItem(result.rows[0]);
  }

  /**
   * Eliminar elemento de conocimiento
   */
  static async delete(id, userId) {
    const result = await query(
      'DELETE FROM knowledge_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    return result.rows.length > 0;
  }
}

module.exports = KnowledgeItem;

