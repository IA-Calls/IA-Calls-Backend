const { query } = require('../config/database');

class Client {
  constructor(clientData) {
    this.id = clientData.id;
    this.externalId = clientData.external_id;
    this.name = clientData.name;
    this.phone = clientData.phone;
    this.email = clientData.email;
    this.address = clientData.address;
    this.category = clientData.category;
    this.review = clientData.review;
    this.status = clientData.status || 'pending';
    this.metadata = clientData.metadata;
    this.isActive = clientData.is_active !== undefined ? clientData.is_active : true;
    this.createdAt = clientData.created_at;
    this.updatedAt = clientData.updated_at;
  }

  // Crear cliente
  static async create(clientData) {
    try {
      const { 
        externalId, name, phone, email, address, category, 
        review, status = 'pending', metadata 
      } = clientData;
      
      const result = await query(
        `INSERT INTO "public"."clients" 
         (external_id, name, phone, email, address, category, review, status, metadata, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [externalId, name, phone, email, address, category, review, status, JSON.stringify(metadata), true]
      );
      
      return new Client(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un cliente con este teléfono');
      }
      throw new Error(`Error creando cliente: ${error.message}`);
    }
  }

  // Buscar cliente por ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM "public"."clients" WHERE id = $1 AND is_active = true', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Client(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando cliente: ${error.message}`);
    }
  }

  // Buscar cliente por external_id
  static async findByExternalId(externalId) {
    try {
      const result = await query('SELECT * FROM "public"."clients" WHERE external_id = $1 AND is_active = true', [externalId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Client(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando cliente por external_id: ${error.message}`);
    }
  }

  // Buscar cliente por teléfono
  static async findByPhone(phone) {
    try {
      const result = await query('SELECT * FROM "public"."clients" WHERE phone = $1 AND is_active = true', [phone]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Client(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando cliente por teléfono: ${error.message}`);
    }
  }

  // Obtener todos los clientes
  static async findAll(options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        status = null, 
        category = null,
        search = null,
        includeInactive = false 
      } = options;
      
      let whereConditions = [];
      let params = [];
      let paramCount = 1;

      if (!includeInactive) {
        whereConditions.push('is_active = true');
      }

      if (status) {
        whereConditions.push(`status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }

      if (category) {
        whereConditions.push(`category = $${paramCount}`);
        params.push(category);
        paramCount++;
      }

      if (search) {
        whereConditions.push(`(name ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      params.push(limit, offset);

      const result = await query(
        `SELECT * FROM "public"."clients" ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );
      
      return result.rows.map(row => new Client(row));
    } catch (error) {
      throw new Error(`Error obteniendo clientes: ${error.message}`);
    }
  }

  // Sincronizar cliente desde servicio externo
  static async syncFromExternal(externalClientData) {
    try {
      const { name, phone, review, category, address } = externalClientData;
      
      // Buscar si ya existe
      const existingClient = await Client.findByPhone(phone);
      
      if (existingClient) {
        // Actualizar datos si es necesario
        await existingClient.update({
          name,
          review,
          category,
          address,
          metadata: externalClientData
        });
        return existingClient;
      } else {
        // Crear nuevo cliente
        return await Client.create({
          name,
          phone,
          email: externalClientData.email,
          address,
          category,
          review,
          status: 'pending',
          metadata: externalClientData
        });
      }
    } catch (error) {
      throw new Error(`Error sincronizando cliente: ${error.message}`);
    }
  }

  // Actualizar cliente
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const dbField = key === 'externalId' ? 'external_id' : 
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
        `UPDATE "public"."clients" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      Object.assign(this, new Client(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Error actualizando cliente: ${error.message}`);
    }
  }

  // Obtener grupos del cliente
  async getGroups() {
    try {
      const result = await query(
        `SELECT g.*, cg.assigned_at, cg.assigned_by 
         FROM "public"."groups" g
         JOIN "public"."client_groups" cg ON g.id = cg.group_id
         WHERE cg.client_id = $1 AND g.is_active = true
         ORDER BY cg.assigned_at DESC`,
        [this.id]
      );
      
      return result.rows;
    } catch (error) {
      throw new Error(`Error obteniendo grupos del cliente: ${error.message}`);
    }
  }

  // Eliminar cliente (soft delete)
  async delete() {
    try {
      const result = await query(
        'UPDATE "public"."clients" SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw new Error(`Error eliminando cliente: ${error.message}`);
    }
  }

  // Contar clientes total
  static async count(options = {}) {
    try {
      const { status = null, category = null, includeInactive = false } = options;
      
      let whereConditions = [];
      let params = [];
      let paramCount = 1;

      if (!includeInactive) {
        whereConditions.push('is_active = true');
      }

      if (status) {
        whereConditions.push(`status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }

      if (category) {
        whereConditions.push(`category = $${paramCount}`);
        params.push(category);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const result = await query(`SELECT COUNT(*) FROM "public"."clients" ${whereClause}`, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error contando clientes: ${error.message}`);
    }
  }

  // Método toJSON para serialización
  toJSON() {
    return {
      id: this.id,
      externalId: this.externalId,
      name: this.name,
      phone: this.phone,
      email: this.email,
      address: this.address,
      category: this.category,
      review: this.review,
      status: this.status,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Client; 