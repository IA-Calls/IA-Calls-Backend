const { query, getClient } = require('../config/database');

class ConversationPG {
  static async findByPhone(phone) {
    const result = await query(
      'SELECT * FROM conversations WHERE user_phone = $1',
      [phone]
    );
    return result.rows[0] || null;
  }

  static async create(phone, lastMessage = null, hasStarted = false) {
    const result = await query(
      `INSERT INTO conversations (user_phone, last_message, has_started)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [phone, lastMessage, hasStarted]
    );
    return result.rows[0];
  }

  static async update(phone, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.lastMessage !== undefined) {
      fields.push(`last_message = $${paramCount++}`);
      values.push(updates.lastMessage);
    }
    if (updates.hasStarted !== undefined) {
      fields.push(`has_started = $${paramCount++}`);
      values.push(updates.hasStarted);
    }
    if (updates.agentId !== undefined) {
      fields.push(`agent_id = $${paramCount++}`);
      values.push(updates.agentId);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return null;

    values.push(phone);
    const result = await query(
      `UPDATE conversations SET ${fields.join(', ')} WHERE user_phone = $${paramCount} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (row && row.metadata && typeof row.metadata === 'string') {
      try {
        row.metadata = JSON.parse(row.metadata);
      } catch (e) {
        row.metadata = {};
      }
    }
    return row || null;
  }

  static async findByPhoneWithAgent(phone) {
    const result = await query(
      `SELECT c.*, wa.agent_id as elevenlabs_agent_id, wa.instructor, wa.text_only, wa.language
       FROM conversations c
       LEFT JOIN whatsapp_agents wa ON c.agent_id = wa.id
       WHERE c.user_phone = $1`,
      [phone]
    );
    const row = result.rows[0];
    if (row && row.metadata) {
      // Parsear metadata si es string
      if (typeof row.metadata === 'string') {
        try {
          row.metadata = JSON.parse(row.metadata);
        } catch (e) {
          row.metadata = {};
        }
      }
    }
    return row || null;
  }

  static async createOrUpdate(phone, data = {}) {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return this.update(phone, data);
    }
    return this.create(phone, data.lastMessage || null, data.hasStarted || false);
  }

  static async findAllWithClientInfo(limit = 50, offset = 0) {
    // Usar DISTINCT ON para obtener solo el registro más reciente por user_phone
    const result = await query(
      `SELECT DISTINCT ON (c.user_phone)
        c.id,
        c.user_phone,
        c.last_message,
        c.has_started,
        c.created_at,
        c.updated_at,
        cl.name as client_name,
        cl.email as client_email
      FROM conversations c
      LEFT JOIN clients cl ON c.user_phone = cl.phone
      ORDER BY c.user_phone, c.updated_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async countAll() {
    // Contar solo conversaciones únicas por user_phone
    const result = await query(
      `SELECT COUNT(DISTINCT user_phone) as total FROM conversations`
    );
    return parseInt(result.rows[0].total);
  }

  static async search(searchTerm, limit = 50) {
    const searchPattern = `%${searchTerm}%`;
    // Usar DISTINCT ON para evitar duplicados
    const result = await query(
      `SELECT DISTINCT ON (c.user_phone)
        c.id,
        c.user_phone,
        c.last_message,
        c.has_started,
        c.created_at,
        c.updated_at,
        cl.name as client_name,
        cl.email as client_email
      FROM conversations c
      LEFT JOIN clients cl ON c.user_phone = cl.phone
      WHERE c.user_phone LIKE $1 
         OR cl.name ILIKE $1
         OR c.last_message ILIKE $1
      ORDER BY c.user_phone, c.updated_at DESC
      LIMIT $2`,
      [searchPattern, limit]
    );
    return result.rows;
  }
}

module.exports = ConversationPG;

