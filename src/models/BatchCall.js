const pool = require('../config/database');

class BatchCall {
  constructor(batchCallData) {
    this.id = batchCallData.id;
    this.batchId = batchCallData.batch_id;
    this.groupId = batchCallData.group_id;
    this.userId = batchCallData.user_id;
    this.agentId = batchCallData.agent_id;
    this.callName = batchCallData.call_name;
    this.status = batchCallData.status;
    this.totalRecipients = batchCallData.total_recipients;
    this.completedCalls = batchCallData.completed_calls;
    this.failedCalls = batchCallData.failed_calls;
    this.startedAt = batchCallData.started_at;
    this.completedAt = batchCallData.completed_at;
    this.metadata = batchCallData.metadata;
    this.createdAt = batchCallData.created_at;
    this.updatedAt = batchCallData.updated_at;
  }

  // Crear un nuevo batch call
  static async create(batchCallData) {
    try {
      console.log('📝 Creando registro de batch call:', batchCallData.batch_id);
      
      const query = `
        INSERT INTO batch_calls (
          batch_id, group_id, user_id, agent_id, call_name, 
          status, total_recipients, completed_calls, failed_calls, 
          started_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        batchCallData.batch_id,
        batchCallData.group_id,
        batchCallData.user_id,
        batchCallData.agent_id,
        batchCallData.call_name,
        batchCallData.status || 'pending',
        batchCallData.total_recipients || 0,
        batchCallData.completed_calls || 0,
        batchCallData.failed_calls || 0,
        batchCallData.started_at || new Date(),
        JSON.stringify(batchCallData.metadata || {})
      ];

      const result = await pool.query(query, values);
      console.log('✅ Batch call creado con ID:', result.rows[0].id);
      
      return new BatchCall(result.rows[0]);
    } catch (error) {
      console.error('❌ Error creando batch call:', error);
      throw new Error(`Error creando batch call: ${error.message}`);
    }
  }

  // Buscar por batch_id de ElevenLabs
  static async findByBatchId(batchId) {
    try {
      const query = 'SELECT * FROM batch_calls WHERE batch_id = $1';
      const result = await pool.query(query, [batchId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new BatchCall(result.rows[0]);
    } catch (error) {
      console.error('❌ Error buscando batch call:', error);
      throw new Error(`Error buscando batch call: ${error.message}`);
    }
  }

  // Buscar por ID interno
  static async findById(id) {
    try {
      const query = 'SELECT * FROM batch_calls WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new BatchCall(result.rows[0]);
    } catch (error) {
      console.error('❌ Error buscando batch call por ID:', error);
      throw new Error(`Error buscando batch call: ${error.message}`);
    }
  }

  // Buscar por grupo
  static async findByGroupId(groupId, limit = 50) {
    try {
      const query = `
        SELECT * FROM batch_calls 
        WHERE group_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      const result = await pool.query(query, [groupId, limit]);
      
      return result.rows.map(row => new BatchCall(row));
    } catch (error) {
      console.error('❌ Error buscando batch calls por grupo:', error);
      throw new Error(`Error buscando batch calls: ${error.message}`);
    }
  }

  // Buscar por usuario
  static async findByUserId(userId, limit = 50) {
    try {
      const query = `
        SELECT * FROM batch_calls 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      const result = await pool.query(query, [userId, limit]);
      
      return result.rows.map(row => new BatchCall(row));
    } catch (error) {
      console.error('❌ Error buscando batch calls por usuario:', error);
      throw new Error(`Error buscando batch calls: ${error.message}`);
    }
  }

  // Actualizar estado del batch call
  async updateStatus(updateData) {
    try {
      console.log(`📝 Actualizando batch call ${this.batchId}:`, updateData);
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Campos que se pueden actualizar
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }
      if (updateData.completed_calls !== undefined) {
        updateFields.push(`completed_calls = $${paramCount++}`);
        values.push(updateData.completed_calls);
      }
      if (updateData.failed_calls !== undefined) {
        updateFields.push(`failed_calls = $${paramCount++}`);
        values.push(updateData.failed_calls);
      }
      if (updateData.completed_at !== undefined) {
        updateFields.push(`completed_at = $${paramCount++}`);
        values.push(updateData.completed_at);
      }
      if (updateData.metadata !== undefined) {
        updateFields.push(`metadata = $${paramCount++}`);
        values.push(JSON.stringify(updateData.metadata));
      }

      // Siempre actualizar updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const query = `
        UPDATE batch_calls 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        // Actualizar propiedades del objeto actual
        Object.assign(this, result.rows[0]);
        console.log('✅ Batch call actualizado exitosamente');
        return this;
      } else {
        throw new Error('No se encontró el batch call para actualizar');
      }
    } catch (error) {
      console.error('❌ Error actualizando batch call:', error);
      throw new Error(`Error actualizando batch call: ${error.message}`);
    }
  }

  // Obtener estadísticas del batch call
  async getStats() {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(call_duration_secs) as avg_duration
        FROM call_records 
        WHERE batch_call_id = $1 
        GROUP BY status
      `;
      
      const result = await pool.query(query, [this.id]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // Convertir a JSON para API
  toJSON() {
    return {
      id: this.id,
      batchId: this.batchId,
      groupId: this.groupId,
      userId: this.userId,
      agentId: this.agentId,
      callName: this.callName,
      status: this.status,
      totalRecipients: this.totalRecipients,
      completedCalls: this.completedCalls,
      failedCalls: this.failedCalls,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = BatchCall;
