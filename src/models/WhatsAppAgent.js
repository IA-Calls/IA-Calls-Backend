const { query } = require('../config/database');

class WhatsAppAgent {
  constructor(agentData) {
    this.id = agentData.id;
    this.name = agentData.name;
    this.agentId = agentData.agent_id; // ID de ElevenLabs
    this.instructor = agentData.instructor;
    this.textOnly = agentData.text_only;
    this.voiceId = agentData.voice_id;
    this.language = agentData.language;
    this.initialMessage = agentData.initial_message;
    this.isActive = agentData.is_active;
    this.createdBy = agentData.created_by;
    this.metadata = agentData.metadata || {};
    this.createdAt = agentData.created_at;
    this.updatedAt = agentData.updated_at;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM whatsapp_agents WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new WhatsAppAgent(result.rows[0]) : null;
  }

  static async findByAgentId(agentId) {
    const result = await query(
      'SELECT * FROM whatsapp_agents WHERE agent_id = $1',
      [agentId]
    );
    return result.rows[0] ? new WhatsAppAgent(result.rows[0]) : null;
  }

  static async findAll(activeOnly = true, userId = null) {
    let sql = 'SELECT * FROM whatsapp_agents';
    const params = [];
    const conditions = [];
    let paramCount = 1;
    
    if (userId !== null) {
      conditions.push(`created_by = $${paramCount++}`);
      params.push(userId);
    }
    
    if (activeOnly) {
      conditions.push(`is_active = true`);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    return result.rows.map(row => new WhatsAppAgent(row));
  }

  /**
   * Listar agentes de un usuario específico
   * @param {number} userId - ID del usuario
   * @param {boolean} activeOnly - Solo agentes activos
   * @returns {Promise<WhatsAppAgent[]>}
   */
  static async findByUserId(userId, activeOnly = true) {
    return this.findAll(activeOnly, userId);
  }

  /**
   * Verificar si un agente pertenece a un usuario
   * @param {string} agentId - ID del agente (UUID)
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>}
   */
  static async belongsToUser(agentId, userId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM whatsapp_agents 
       WHERE id = $1 AND created_by = $2`,
      [agentId, userId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  static async create(agentData) {
    const {
      name,
      agent_id,
      instructor,
      text_only = false,
      voice_id,
      language = 'es',
      initial_message,
      created_by,
      metadata = {}
    } = agentData;

    const result = await query(
      `INSERT INTO whatsapp_agents 
       (name, agent_id, instructor, text_only, voice_id, language, initial_message, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, agent_id, instructor, text_only, voice_id, language, initial_message, created_by, JSON.stringify(metadata)]
    );

    return new WhatsAppAgent(result.rows[0]);
  }

  static async update(id, updates, userId = null) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.instructor !== undefined) {
      fields.push(`instructor = $${paramCount++}`);
      values.push(updates.instructor);
    }
    if (updates.text_only !== undefined) {
      fields.push(`text_only = $${paramCount++}`);
      values.push(updates.text_only);
    }
    if (updates.voice_id !== undefined) {
      fields.push(`voice_id = $${paramCount++}`);
      values.push(updates.voice_id);
    }
    if (updates.language !== undefined) {
      fields.push(`language = $${paramCount++}`);
      values.push(updates.language);
    }
    if (updates.initial_message !== undefined) {
      fields.push(`initial_message = $${paramCount++}`);
      values.push(updates.initial_message);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return null;

    // Agregar condición de user_id si se proporciona
    let whereClause = `id = $${paramCount++}`;
    values.push(id);
    
    if (userId !== null) {
      whereClause += ` AND created_by = $${paramCount++}`;
      values.push(userId);
    }

    const result = await query(
      `UPDATE whatsapp_agents SET ${fields.join(', ')} WHERE ${whereClause} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new WhatsAppAgent(result.rows[0]);
  }

  static async delete(id, userId = null) {
    let sql = 'UPDATE whatsapp_agents SET is_active = false WHERE id = $1';
    const params = [id];
    
    if (userId !== null) {
      sql += ' AND created_by = $2';
      params.push(userId);
    }
    
    sql += ' RETURNING *';
    
    const result = await query(sql, params);
    return result.rows[0] ? new WhatsAppAgent(result.rows[0]) : null;
  }
}

module.exports = WhatsAppAgent;

