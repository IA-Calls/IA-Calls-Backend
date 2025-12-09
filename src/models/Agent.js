const { query } = require('../config/database');

/**
 * Modelo para gestionar agentes de ElevenLabs
 * Permite multiusuario: cada usuario solo puede ver/editar sus propios agentes
 */
class Agent {
  constructor(agentData) {
    this.id = agentData.id;
    this.agentId = agentData.agent_id;
    this.userId = agentData.user_id;
    this.name = agentData.name;
    this.metadata = typeof agentData.metadata === 'string' 
      ? JSON.parse(agentData.metadata) 
      : (agentData.metadata || {});
    this.createdAt = agentData.created_at;
    this.updatedAt = agentData.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      agent_id: this.agentId,
      user_id: this.userId,
      name: this.name,
      metadata: this.metadata,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Crear un nuevo agente
   * @param {Object} agentData - Datos del agente
   * @param {string} agentData.agent_id - ID del agente en ElevenLabs
   * @param {number} agentData.user_id - ID del usuario propietario
   * @param {string} agentData.name - Nombre del agente
   * @param {Object} agentData.metadata - Metadatos adicionales
   * @returns {Promise<Agent>}
   */
  static async create(agentData) {
    const {
      agent_id,
      user_id,
      name,
      metadata = {}
    } = agentData;

    if (!agent_id || !user_id || !name) {
      throw new Error('agent_id, user_id y name son requeridos');
    }

    const result = await query(
      `INSERT INTO agents (agent_id, user_id, name, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [agent_id, user_id, name, JSON.stringify(metadata)]
    );

    return new Agent(result.rows[0]);
  }

  /**
   * Buscar un agente por ID de ElevenLabs y user_id
   * @param {string} agentId - ID del agente en ElevenLabs
   * @param {number} userId - ID del usuario
   * @returns {Promise<Agent|null>}
   */
  static async findByAgentIdAndUserId(agentId, userId) {
    const result = await query(
      `SELECT * FROM agents 
       WHERE agent_id = $1 AND user_id = $2`,
      [agentId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Agent(result.rows[0]);
  }

  /**
   * Buscar un agente por ID de ElevenLabs (sin validar usuario)
   * Útil para validaciones internas
   * @param {string} agentId - ID del agente en ElevenLabs
   * @returns {Promise<Agent|null>}
   */
  static async findByAgentId(agentId) {
    const result = await query(
      `SELECT * FROM agents WHERE agent_id = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Agent(result.rows[0]);
  }

  /**
   * Listar todos los agentes de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Agent[]>}
   */
  static async findByUserId(userId) {
    const result = await query(
      `SELECT * FROM agents 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => new Agent(row));
  }

  /**
   * Verificar si un agente pertenece a un usuario
   * @param {string} agentId - ID del agente en ElevenLabs
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>}
   */
  static async belongsToUser(agentId, userId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM agents 
       WHERE agent_id = $1 AND user_id = $2`,
      [agentId, userId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Actualizar metadatos de un agente
   * @param {string} agentId - ID del agente en ElevenLabs
   * @param {number} userId - ID del usuario (para validar ownership)
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Agent>}
   */
  static async update(agentId, userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(updates.metadata));
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Agregar user_id y agent_id a los valores para el WHERE
    values.push(agentId, userId);

    const result = await query(
      `UPDATE agents 
       SET ${fields.join(', ')}
       WHERE agent_id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Agente no encontrado o no pertenece al usuario');
    }

    return new Agent(result.rows[0]);
  }

  /**
   * Eliminar un agente
   * @param {string} agentId - ID del agente en ElevenLabs
   * @param {number} userId - ID del usuario (para validar ownership)
   * @returns {Promise<boolean>}
   */
  static async delete(agentId, userId) {
    const result = await query(
      `DELETE FROM agents 
       WHERE agent_id = $1 AND user_id = $2
       RETURNING id`,
      [agentId, userId]
    );

    return result.rows.length > 0;
  }
}

module.exports = Agent;

