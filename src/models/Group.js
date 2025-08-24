const { query } = require('../config/database');

class Group {
  constructor(groupData) {
    this.id = groupData.id;
    this.name = groupData.name;
    this.description = groupData.description;
    this.prompt = groupData.prompt;
    this.color = groupData.color || '#3B82F6';
    this.favorite = groupData.favorite !== undefined ? groupData.favorite : false;
    this.isActive = groupData.is_active !== undefined ? groupData.is_active : true;
    this.createdBy = groupData.created_by;
    this.createdByClient = groupData['created-by']; // Nuevo campo para el ID del cliente
    this.idioma = groupData.idioma || 'es';
    this.variables = groupData.variables || {};
    this.createdAt = groupData.created_at;
    this.updatedAt = groupData.updated_at;
    
    // Campos de tracking de batch calls (NUEVOS)
    this.batchId = groupData.batch_id;
    this.batchStatus = groupData.batch_status || 'none';
    this.batchStartedAt = groupData.batch_started_at;
    this.batchCompletedAt = groupData.batch_completed_at;
    this.batchTotalRecipients = groupData.batch_total_recipients || 0;
    this.batchCompletedCalls = groupData.batch_completed_calls || 0;
    this.batchFailedCalls = groupData.batch_failed_calls || 0;
    this.batchMetadata = groupData.batch_metadata || {};
  }

  // Crear grupo
  static async create(groupData) {
    try {
      const { name, description, prompt, color = '#3B82F6', favorite = false, createdBy, createdByClient, idioma = 'es', variables = {} } = groupData;
      
      const result = await query(
        `INSERT INTO "public"."groups" (name, description, prompt, color, favorite, created_by, "created-by", idioma, variables, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [name, description, prompt, color, favorite, createdBy, createdByClient, idioma, JSON.stringify(variables), true]
      );
      
      return new Group(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un grupo con este nombre');
      }
      throw new Error(`Error creando grupo: ${error.message}`);
    }
  }

  // Buscar grupo por ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM "public"."groups" WHERE id = $1 AND is_active = true', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Group(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando grupo: ${error.message}`);
    }
  }

  // Buscar grupo por batch_id (NUEVO - para flujo optimizado)
  static async findByBatchId(batchId) {
    try {
      const result = await query('SELECT * FROM "public"."groups" WHERE batch_id = $1 AND is_active = true', [batchId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Group(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando grupo por batch_id: ${error.message}`);
    }
  }

  // Obtener todos los grupos activos
  static async findAll(options = {}) {
    try {
      const { limit = 50, offset = 0, includeInactive = false } = options;
      
      let whereClause = includeInactive ? '' : 'WHERE is_active = true';
      
      const result = await query(
        `SELECT * FROM "public"."groups" ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      return result.rows.map(row => new Group(row));
    } catch (error) {
      throw new Error(`Error obteniendo grupos: ${error.message}`);
    }
  }

  // Actualizar grupo
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const dbField = key === 'isActive' ? 'is_active' : 
                         key === 'createdBy' ? 'created_by' : key;
          
          fields.push(`${dbField} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push(`updated_at = NOW()`);
      values.push(this.id);

      const result = await query(
        `UPDATE "public"."groups" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Grupo no encontrado');
      }

      Object.assign(this, new Group(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Error actualizando grupo: ${error.message}`);
    }
  }

  // Eliminar grupo (soft delete)
  async delete() {
    try {
      const result = await query(
        'UPDATE "public"."groups" SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Grupo no encontrado');
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw new Error(`Error eliminando grupo: ${error.message}`);
    }
  }

  // Obtener clientes del grupo
  async getClients(options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const result = await query(
        `SELECT c.*, cg.assigned_at, cg.assigned_by 
         FROM "public"."clients" c
         JOIN "public"."client_groups" cg ON c.id = cg.client_id
         WHERE cg.group_id = $1 AND c.is_active = true
         ORDER BY cg.assigned_at DESC
         LIMIT $2 OFFSET $3`,
        [this.id, limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      throw new Error(`Error obteniendo clientes del grupo: ${error.message}`);
    }
  }

  // Agregar cliente al grupo
  async addClient(clientId, assignedBy) {
    try {
      const result = await query(
        `INSERT INTO "public"."client_groups" (client_id, group_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (client_id, group_id) DO NOTHING
         RETURNING *`,
        [clientId, this.id, assignedBy]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error agregando cliente al grupo: ${error.message}`);
    }
  }

  // Agregar múltiples clientes al grupo en lotes
  async addClientsBatch(clientIds, assignedBy, batchSize = 100) {
    try {
      const totalClients = clientIds.length;
      let assignedCount = 0;
      
      console.log(`Iniciando asignación masiva de ${totalClients} clientes al grupo ${this.id}`);
      
      // Procesar en lotes
      for (let i = 0; i < totalClients; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize);
        console.log(`Asignando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalClients / batchSize)} (${batch.length} clientes)`);
        
        const batchResults = await this.addClientsBatchChunk(batch, assignedBy);
        assignedCount += batchResults;
      }
      
      console.log(`Asignación masiva completada: ${assignedCount} clientes asignados al grupo ${this.id}`);
      return assignedCount;
      
    } catch (error) {
      console.error('Error en asignación masiva:', error);
      throw new Error(`Error en asignación masiva: ${error.message}`);
    }
  }

  // Agregar un lote específico de clientes al grupo
  async addClientsBatchChunk(clientIds, assignedBy) {
    try {
      if (clientIds.length === 0) return 0;
      
      // Construir query dinámico para múltiples inserciones
      const values = [];
      const placeholders = [];
      let paramCount = 1;
      
      for (const clientId of clientIds) {
        placeholders.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, NOW())`);
        values.push(clientId, this.id, assignedBy);
        paramCount += 3;
      }
      
      const queryText = `
        INSERT INTO "public"."client_groups" (client_id, group_id, assigned_by, assigned_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (client_id, group_id) DO NOTHING
        RETURNING *
      `;
      
      const result = await query(queryText, values);
      
      return result.rows.length;
      
    } catch (error) {
      console.error('Error asignando lote de clientes:', error);
      // Continuar con el siguiente lote aunque falle este
      return 0;
    }
  }

  // Remover cliente del grupo
  async removeClient(clientId) {
    try {
      const result = await query(
        'DELETE FROM "public"."client_groups" WHERE client_id = $1 AND group_id = $2 RETURNING *',
        [clientId, this.id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error removiendo cliente del grupo: ${error.message}`);
    }
  }

  // Contar clientes en el grupo
  async countClients() {
    try {
      const result = await query(
        `SELECT COUNT(*) FROM "public"."client_groups" cg
         JOIN "public"."clients" c ON c.id = cg.client_id
         WHERE cg.group_id = $1 AND c.is_active = true`,
        [this.id]
      );
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error contando clientes del grupo: ${error.message}`);
    }
  }

  // ===== MÉTODOS DE TRACKING DE BATCH CALLS =====

  // Iniciar batch call (cuando se presiona "Llamar")
  async startBatchCall(batchId, totalRecipients, metadata = {}) {
    try {
      console.log(`📝 Iniciando batch call para grupo ${this.id}: ${batchId}`);
      
      const result = await query(
        `UPDATE "public"."groups" 
         SET batch_id = $1, 
             batch_status = 'in_progress', 
             batch_started_at = NOW(),
             batch_total_recipients = $2,
             batch_metadata = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [batchId, totalRecipients, JSON.stringify(metadata), this.id]
      );

      if (result.rows.length > 0) {
        // Actualizar propiedades del objeto actual
        Object.assign(this, result.rows[0]);
        console.log(`✅ Batch call iniciado para grupo ${this.id}`);
        return this;
      } else {
        throw new Error('No se pudo actualizar el grupo');
      }
    } catch (error) {
      console.error('❌ Error iniciando batch call:', error);
      throw new Error(`Error iniciando batch call: ${error.message}`);
    }
  }

  // Actualizar estado del batch call (sincronización con ElevenLabs)
  async updateBatchStatus(batchData) {
    try {
      console.log(`📝 Actualizando estado del batch call para grupo ${this.id}`);
      
      const completedCalls = batchData.recipients?.filter(r => r.status === 'completed').length || 0;
      const failedCalls = batchData.recipients?.filter(r => r.status === 'failed').length || 0;
      
      const result = await query(
        `UPDATE "public"."groups" 
         SET batch_status = $1::VARCHAR(50),
             batch_completed_calls = $2,
             batch_failed_calls = $3,
             batch_completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE batch_completed_at END,
             batch_metadata = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          batchData.status,
          completedCalls,
          failedCalls,
          JSON.stringify(batchData),
          this.id
        ]
      );

      if (result.rows.length > 0) {
        // Actualizar propiedades del objeto actual
        Object.assign(this, result.rows[0]);
        console.log(`✅ Estado del batch call actualizado para grupo ${this.id}`);
        return this;
      } else {
        throw new Error('No se pudo actualizar el estado del batch call');
      }
    } catch (error) {
      console.error('❌ Error actualizando estado del batch call:', error);
      throw new Error(`Error actualizando estado: ${error.message}`);
    }
  }

  // Verificar si el grupo tiene un batch call activo
  hasActiveBatchCall() {
    return this.batchId && this.batchStatus === 'in_progress';
  }

  // Verificar si el grupo ha sido llamado alguna vez
  hasBeenCalled() {
    return this.batchId && this.batchStatus !== 'none';
  }

  // Obtener estadísticas del batch call
  getBatchCallStats() {
    if (!this.batchId) {
      return {
        hasBeenCalled: false,
        status: 'none',
        totalRecipients: 0,
        completedCalls: 0,
        failedCalls: 0,
        successRate: 0
      };
    }

    const successRate = this.batchTotalRecipients > 0 
      ? Math.round((this.batchCompletedCalls / this.batchTotalRecipients) * 100) 
      : 0;

    return {
      hasBeenCalled: true,
      status: this.batchStatus,
      totalRecipients: this.batchTotalRecipients,
      completedCalls: this.batchCompletedCalls,
      failedCalls: this.batchFailedCalls,
      successRate,
      startedAt: this.batchStartedAt,
      completedAt: this.batchCompletedAt
    };
  }

  // Método para serializar el grupo
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      prompt: this.prompt,
      color: this.color,
      favorite: this.favorite,
      isActive: this.isActive,
      createdBy: this.createdBy,
      createdByClient: this.createdByClient,
      idioma: this.idioma,
      variables: this.variables,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Campos de tracking de batch calls
      batchId: this.batchId,
      batchStatus: this.batchStatus,
      batchStartedAt: this.batchStartedAt,
      batchCompletedAt: this.batchCompletedAt,
      batchTotalRecipients: this.batchTotalRecipients,
      batchCompletedCalls: this.batchCompletedCalls,
      batchFailedCalls: this.batchFailedCalls,
      batchMetadata: this.batchMetadata,
      batchCallStats: this.getBatchCallStats()
    };
  }
}

module.exports = Group; 