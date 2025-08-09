const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.role = userData.role || 'user';
    this.isActive = userData.is_active !== undefined ? userData.is_active : true;
    this.time = userData.time; // Campo opcional para deadline
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
  }

  // Crear usuario
  static async create(userData) {
    try {
      const { username, email, password, firstName, lastName, role = 'user', time } = userData;
      
      // Hashear la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const result = await query(
        `INSERT INTO "public"."users" (username, email, password, first_name, last_name, role, is_active, time, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [username, email, hashedPassword, firstName, lastName, role, true, time]
      );
      
      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Duplicate key error en PostgreSQL
        if (error.constraint === 'users_email_key') {
          throw new Error('Ya existe un usuario con este email');
        }
        if (error.constraint === 'users_username_key') {
          throw new Error('Ya existe un usuario con este username');
        }
      }
      throw new Error(`Error creando usuario: ${error.message}`);
    }
  }

  // Buscar usuario por ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM "public"."users" WHERE id = $1 AND is_active = true', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando usuario: ${error.message}`);
    }
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    try {
      const result = await query('SELECT * FROM "public"."users" WHERE email = $1 AND is_active = true', [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando usuario por email: ${error.message}`);
    }
  }

  // Buscar usuario por username
  static async findByUsername(username) {
    try {
      const result = await query('SELECT * FROM "public"."users" WHERE username = $1 AND is_active = true', [username]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando usuario por username: ${error.message}`);
    }
  }

  // Verificar contraseña
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw new Error(`Error verificando contraseña: ${error.message}`);
    }
  }

  // Actualizar usuario
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Construir query dinámicamente
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const dbField = key === 'firstName' ? 'first_name' : 
                         key === 'lastName' ? 'last_name' : 
                         key === 'isActive' ? 'is_active' : key;
          
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
        `UPDATE "public"."users" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar la instancia actual
      Object.assign(this, new User(result.rows[0]));
      return this;
    } catch (error) {
      // Manejar errores específicos de duplicación
      if (error.code === '23505') { // Duplicate key error en PostgreSQL
        if (error.constraint === 'users_username_key') {
          throw new Error('Ya existe un usuario con este username');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Ya existe un usuario con este email');
        }
      }
      throw new Error(`Error actualizando usuario: ${error.message}`);
    }
  }

  // Eliminar usuario (soft delete)
  async delete() {
    try {
      const result = await query(
        'UPDATE "public"."users" SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      this.isActive = false;
      return this;
    } catch (error) {
      throw new Error(`Error eliminando usuario: ${error.message}`);
    }
  }

  // Obtener todos los usuarios activos
  static async findAll(options = {}) {
    try {
      const { limit = 50, offset = 0, includeInactive = false, includeExpired = false } = options;
      
      let whereClause = '';
      const conditions = [];
      
      if (!includeInactive) {
        conditions.push('is_active = true');
      }
      
      if (!includeExpired) {
        conditions.push('(time IS NULL OR time > NOW())');
      }
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
      
      const result = await query(
        `SELECT * FROM "public"."users" ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Error obteniendo usuarios: ${error.message}`);
    }
  }

  // Contar usuarios
  static async count(includeInactive = false) {
    try {
      let whereClause = includeInactive ? '' : 'WHERE is_active = true';
      
      const result = await query(`SELECT COUNT(*) FROM "public"."users" ${whereClause}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error contando usuarios: ${error.message}`);
    }
  }

  // Verificar si existe la tabla de usuarios
  static async checkTableExists() {
    try {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error('Error verificando tabla users:', error.message);
      return false;
    }
  }

  // Verificar si el usuario ha expirado
  isExpired() {
    if (!this.time) return false;
    return new Date() > new Date(this.time);
  }

  // Verificar si el usuario está activo y no ha expirado
  isActiveAndNotExpired() {
    return this.isActive && !this.isExpired();
  }

  // Desactivar usuarios expirados (método estático)
  static async deactivateExpiredUsers() {
    try {
      const result = await query(
        `UPDATE "public"."users" 
         SET is_active = false, updated_at = NOW() 
         WHERE time IS NOT NULL 
           AND time <= NOW() 
           AND is_active = true
         RETURNING *`
      );
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Error desactivando usuarios expirados: ${error.message}`);
    }
  }

  // Obtener usuarios próximos a expirar
  static async getUsersExpiringSoon(daysThreshold = 7) {
    try {
      const result = await query(
        `SELECT * FROM "public"."users" 
         WHERE time IS NOT NULL 
           AND time > NOW() 
           AND time <= NOW() + INTERVAL '${daysThreshold} days'
           AND is_active = true
         ORDER BY time ASC`
      );
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Error obteniendo usuarios próximos a expirar: ${error.message}`);
    }
  }

  // Método para serializar (sin la contraseña)
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User; 