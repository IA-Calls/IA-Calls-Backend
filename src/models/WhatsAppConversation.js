const { query } = require('../config/database');

class WhatsAppConversation {
  constructor(conversationData) {
    this.id = conversationData.id;
    this.phoneNumber = conversationData.phone_number;
    this.clientName = conversationData.client_name;
    this.conversationSummary = conversationData.conversation_summary;
    this.messageSent = conversationData.message_sent;
    this.messageReceived = conversationData.message_received;
    this.status = conversationData.status || 'pending';
    this.vonageMessageId = conversationData.vonage_message_id;
    this.errorMessage = conversationData.error_message;
    this.sentAt = conversationData.sent_at;
    this.receivedAt = conversationData.received_at;
    this.createdAt = conversationData.created_at;
    this.updatedAt = conversationData.updated_at;
  }

  // Crear nueva conversación
  static async create(conversationData) {
    try {
      const { phoneNumber, clientName, conversationSummary } = conversationData;
      
      const result = await query(
        `INSERT INTO "public"."whatsapp_conversations" 
         (phone_number, client_name, conversation_summary, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [phoneNumber, clientName, conversationSummary, 'pending']
      );
      
      return new WhatsAppConversation(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creando conversación WhatsApp: ${error.message}`);
    }
  }

  // Buscar conversación por ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM "public"."whatsapp_conversations" WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new WhatsAppConversation(result.rows[0]);
    } catch (error) {
      throw new Error(`Error buscando conversación: ${error.message}`);
    }
  }

  // Buscar conversaciones por número de teléfono
  static async findByPhoneNumber(phoneNumber, limit = 10) {
    try {
      const result = await query(
        `SELECT * FROM "public"."whatsapp_conversations" 
         WHERE phone_number = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [phoneNumber, limit]
      );
      
      return result.rows.map(row => new WhatsAppConversation(row));
    } catch (error) {
      throw new Error(`Error buscando conversaciones por teléfono: ${error.message}`);
    }
  }

  // Actualizar estado de la conversación
  async updateStatus(status, additionalData = {}) {
    try {
      const fields = ['status = $1', 'updated_at = NOW()'];
      const values = [status];
      let paramCount = 2;

      // Agregar campos adicionales si se proporcionan
      if (additionalData.vonageMessageId) {
        fields.push(`vonage_message_id = $${paramCount++}`);
        values.push(additionalData.vonageMessageId);
      }
      
      if (additionalData.messageSent) {
        fields.push(`message_sent = $${paramCount++}`);
        values.push(JSON.stringify(additionalData.messageSent));
      }
      
      if (additionalData.messageReceived) {
        fields.push(`message_received = $${paramCount++}`);
        values.push(JSON.stringify(additionalData.messageReceived));
      }
      
      if (additionalData.errorMessage) {
        fields.push(`error_message = $${paramCount++}`);
        values.push(additionalData.errorMessage);
      }
      
      if (additionalData.sentAt) {
        fields.push(`sent_at = $${paramCount++}`);
        values.push(additionalData.sentAt);
      }
      
      if (additionalData.receivedAt) {
        fields.push(`received_at = $${paramCount++}`);
        values.push(additionalData.receivedAt);
      }

      values.push(this.id);

      const result = await query(
        `UPDATE "public"."whatsapp_conversations" 
         SET ${fields.join(', ')} 
         WHERE id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, new WhatsAppConversation(result.rows[0]));
        return this;
      } else {
        throw new Error('No se pudo actualizar la conversación');
      }
    } catch (error) {
      throw new Error(`Error actualizando conversación: ${error.message}`);
    }
  }

  // Obtener todas las conversaciones
  static async findAll(options = {}) {
    try {
      const { limit = 50, offset = 0, status = null } = options;
      
      let whereClause = '';
      let params = [];
      let paramCount = 1;

      if (status) {
        whereClause = `WHERE status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      params.push(limit, offset);

      const result = await query(
        `SELECT * FROM "public"."whatsapp_conversations" 
         ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
      );
      
      return result.rows.map(row => new WhatsAppConversation(row));
    } catch (error) {
      throw new Error(`Error obteniendo conversaciones: ${error.message}`);
    }
  }

  // Contar conversaciones
  static async count(status = null) {
    try {
      let whereClause = status ? 'WHERE status = $1' : '';
      let params = status ? [status] : [];
      
      const result = await query(
        `SELECT COUNT(*) FROM "public"."whatsapp_conversations" ${whereClause}`,
        params
      );
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error contando conversaciones: ${error.message}`);
    }
  }

  // Método para serializar
  toJSON() {
    return {
      id: this.id,
      phoneNumber: this.phoneNumber,
      clientName: this.clientName,
      conversationSummary: this.conversationSummary,
      messageSent: this.messageSent,
      messageReceived: this.messageReceived,
      status: this.status,
      vonageMessageId: this.vonageMessageId,
      errorMessage: this.errorMessage,
      sentAt: this.sentAt,
      receivedAt: this.receivedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = WhatsAppConversation;

