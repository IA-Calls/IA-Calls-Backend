/**
 * Modelo para manejar tokens de Facebook Page Access
 */

const pool = require('../config/database');

class FacebookPageToken {
  /**
   * Crear o actualizar un token de página
   */
  static async upsert(userId, pageData) {
    try {
      const {
        page_id,
        page_name,
        page_category,
        page_access_token,
        facebook_user_id,
        user_access_token,
        token_expires_at,
        scopes
      } = pageData;

      const query = `
        INSERT INTO facebook_page_tokens (
          user_id, page_id, page_name, page_category, page_access_token,
          facebook_user_id, user_access_token, token_expires_at, scopes, is_active, last_sync
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
        ON CONFLICT (user_id, page_id)
        DO UPDATE SET
          page_name = EXCLUDED.page_name,
          page_category = EXCLUDED.page_category,
          page_access_token = EXCLUDED.page_access_token,
          user_access_token = EXCLUDED.user_access_token,
          token_expires_at = EXCLUDED.token_expires_at,
          scopes = EXCLUDED.scopes,
          is_active = true,
          last_sync = NOW(),
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        userId,
        page_id,
        page_name || null,
        page_category || null,
        page_access_token,
        facebook_user_id || null,
        user_access_token || null,
        token_expires_at || null,
        scopes || null
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.upsert:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los tokens de un usuario
   */
  static async findByUserId(userId, activeOnly = true) {
    try {
      let query = 'SELECT * FROM facebook_page_tokens WHERE user_id = $1';
      const values = [userId];

      if (activeOnly) {
        query += ' AND is_active = true';
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.findByUserId:', error);
      throw error;
    }
  }

  /**
   * Obtener un token específico por usuario y página
   */
  static async findByUserAndPage(userId, pageId) {
    try {
      const query = `
        SELECT * FROM facebook_page_tokens
        WHERE user_id = $1 AND page_id = $2
        LIMIT 1
      `;
      const result = await pool.query(query, [userId, pageId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.findByUserAndPage:', error);
      throw error;
    }
  }

  /**
   * Obtener un token por ID validando propiedad
   */
  static async findByIdAndUserId(id, userId) {
    try {
      const query = `
        SELECT * FROM facebook_page_tokens
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `;
      const result = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.findByIdAndUserId:', error);
      throw error;
    }
  }

  /**
   * Desactivar un token
   */
  static async deactivate(id, userId) {
    try {
      const query = `
        UPDATE facebook_page_tokens
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.deactivate:', error);
      throw error;
    }
  }

  /**
   * Eliminar un token
   */
  static async delete(id, userId) {
    try {
      const query = `
        DELETE FROM facebook_page_tokens
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.delete:', error);
      throw error;
    }
  }

  /**
   * Actualizar la última sincronización
   */
  static async updateLastSync(id, userId) {
    try {
      const query = `
        UPDATE facebook_page_tokens
        SET last_sync = NOW(), updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.updateLastSync:', error);
      throw error;
    }
  }

  /**
   * Validar si un token pertenece a un usuario
   */
  static async belongsToUser(id, userId) {
    try {
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM facebook_page_tokens
          WHERE id = $1 AND user_id = $2
        ) as belongs
      `;
      const result = await pool.query(query, [id, userId]);
      return result.rows[0].belongs;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.belongsToUser:', error);
      throw error;
    }
  }

  /**
   * Obtener tokens que están próximos a expirar (7 días antes)
   */
  static async findExpiringTokens(daysBeforeExpiry = 7) {
    try {
      const query = `
        SELECT * FROM facebook_page_tokens
        WHERE is_active = true
          AND token_expires_at IS NOT NULL
          AND token_expires_at <= NOW() + INTERVAL '${daysBeforeExpiry} days'
        ORDER BY token_expires_at ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en FacebookPageToken.findExpiringTokens:', error);
      throw error;
    }
  }
}

module.exports = FacebookPageToken;

