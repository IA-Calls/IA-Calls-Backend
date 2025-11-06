const { query } = require('../config/database');

class ClientInterested {
  constructor(data) {
    this.id = data.id;
    this.data = data.data; // JSONB que contiene { client: { name, phone_number } }
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Obtener el nombre del cliente desde el JSON
  get name() {
    return this.data?.client?.name || null;
  }

  // Obtener el número de teléfono del cliente desde el JSON
  get phoneNumber() {
    return this.data?.client?.phone_number || null;
  }

  // Crear un nuevo cliente interesado
  static async create(clientData) {
    try {
      const { name, phone_number } = clientData;

      if (!name || !phone_number) {
        throw new Error('name y phone_number son requeridos');
      }

      // Construir el objeto JSON según el formato especificado
      const dataJson = {
        client: {
          name: String(name).trim(),
          phone_number: String(phone_number).trim()
        }
      };

      const result = await query(
        `INSERT INTO "public"."clients_interested" 
         (data, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         RETURNING *`,
        [JSON.stringify(dataJson)]
      );

      return new ClientInterested(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creando cliente interesado: ${error.message}`);
    }
  }

  // Obtener todos los clientes interesados
  static async findAll(options = {}) {
    try {
      const { limit, offset, orderBy = 'created_at', order = 'DESC' } = options;

      let sql = `SELECT * FROM "public"."clients_interested"`;
      const params = [];
      let paramCount = 0;

      // Ordenamiento
      const validOrderBy = ['id', 'created_at', 'updated_at'];
      const validOrder = ['ASC', 'DESC'];
      const orderByField = validOrderBy.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

      sql += ` ORDER BY ${orderByField} ${orderDirection}`;

      // Límite y offset
      if (limit) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        params.push(parseInt(limit));
      }

      if (offset) {
        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        params.push(parseInt(offset));
      }

      const result = await query(sql, params);
      return result.rows.map(row => new ClientInterested(row));
    } catch (error) {
      throw new Error(`Error obteniendo clientes interesados: ${error.message}`);
    }
  }

  // Obtener un cliente interesado por ID
  static async findById(id) {
    try {
      const result = await query(
        `SELECT * FROM "public"."clients_interested" WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ClientInterested(result.rows[0]);
    } catch (error) {
      throw new Error(`Error obteniendo cliente interesado: ${error.message}`);
    }
  }

  // Buscar por nombre o número de teléfono
  static async search(searchTerm) {
    try {
      const searchPattern = `%${searchTerm}%`;
      const result = await query(
        `SELECT * FROM "public"."clients_interested" 
         WHERE (data->'client'->>'name' ILIKE $1 
         OR data->'client'->>'phone_number' ILIKE $1)
         ORDER BY created_at DESC`,
        [searchPattern]
      );

      return result.rows.map(row => new ClientInterested(row));
    } catch (error) {
      throw new Error(`Error buscando clientes interesados: ${error.message}`);
    }
  }

  // Contar total de clientes interesados
  static async count() {
    try {
      const result = await query(`SELECT COUNT(*) as total FROM "public"."clients_interested"`);
      return parseInt(result.rows[0].total);
    } catch (error) {
      throw new Error(`Error contando clientes interesados: ${error.message}`);
    }
  }

  // Convertir a JSON
  toJSON() {
    return {
      id: this.id,
      data: this.data,
      name: this.name,
      phoneNumber: this.phoneNumber,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ClientInterested;

