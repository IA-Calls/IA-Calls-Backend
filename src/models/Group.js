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
    this.createdAt = groupData.created_at;
    this.updatedAt = groupData.updated_at;
  }

  // Crear grupo
  static async create(groupData) {
    try {
      const { name, description, prompt, color = '#3B82F6', favorite = false, createdBy } = groupData;
      
      const result = await query(
        `INSERT INTO "public"."groups" (name, description, prompt, color, favorite, created_by, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [name, description, prompt, color, favorite, createdBy, true]
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Group; 