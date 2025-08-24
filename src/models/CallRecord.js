const pool = require('../config/database');

class CallRecord {
  constructor(callRecordData) {
    this.id = callRecordData.id;
    this.batchCallId = callRecordData.batch_call_id;
    this.clientId = callRecordData.client_id;
    this.phoneNumber = callRecordData.phone_number;
    this.recipientId = callRecordData.recipient_id;
    this.conversationId = callRecordData.conversation_id;
    this.status = callRecordData.status;
    
    // Datos de la conversación
    this.callDurationSecs = callRecordData.call_duration_secs;
    this.transcriptSummary = callRecordData.transcript_summary;
    this.fullTranscript = callRecordData.full_transcript;
    
    // Datos del audio
    this.audioUrl = callRecordData.audio_url;
    this.audioFileName = callRecordData.audio_file_name;
    this.audioSize = callRecordData.audio_size;
    this.audioContentType = callRecordData.audio_content_type;
    this.audioUploadedAt = callRecordData.audio_uploaded_at;
    
    // Timestamps
    this.callStartedAt = callRecordData.call_started_at;
    this.callEndedAt = callRecordData.call_ended_at;
    this.createdAt = callRecordData.created_at;
    this.updatedAt = callRecordData.updated_at;
  }

  // Crear un nuevo registro de llamada
  static async create(callRecordData) {
    try {
      console.log('📝 Creando registro de llamada para:', callRecordData.phone_number);
      
      const query = `
        INSERT INTO call_records (
          batch_call_id, client_id, phone_number, recipient_id, 
          conversation_id, status, call_duration_secs, transcript_summary,
          full_transcript, audio_url, audio_file_name, audio_size,
          audio_content_type, audio_uploaded_at, call_started_at, call_ended_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const values = [
        callRecordData.batch_call_id,
        callRecordData.client_id,
        callRecordData.phone_number,
        callRecordData.recipient_id || null,
        callRecordData.conversation_id || null,
        callRecordData.status || 'pending',
        callRecordData.call_duration_secs || null,
        callRecordData.transcript_summary || null,
        callRecordData.full_transcript ? JSON.stringify(callRecordData.full_transcript) : null,
        callRecordData.audio_url || null,
        callRecordData.audio_file_name || null,
        callRecordData.audio_size || null,
        callRecordData.audio_content_type || null,
        callRecordData.audio_uploaded_at || null,
        callRecordData.call_started_at || null,
        callRecordData.call_ended_at || null
      ];

      const result = await pool.query(query, values);
      console.log('✅ Registro de llamada creado con ID:', result.rows[0].id);
      
      return new CallRecord(result.rows[0]);
    } catch (error) {
      console.error('❌ Error creando registro de llamada:', error);
      throw new Error(`Error creando registro de llamada: ${error.message}`);
    }
  }

  // Crear múltiples registros de llamada
  static async createMany(callRecordsData) {
    try {
      console.log(`📝 Creando ${callRecordsData.length} registros de llamadas...`);
      
      if (callRecordsData.length === 0) {
        return [];
      }

      // Construir query para inserción múltiple
      const placeholders = callRecordsData.map((_, index) => {
        const baseIndex = index * 6;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      }).join(', ');

      const query = `
        INSERT INTO call_records (
          batch_call_id, client_id, phone_number, status, call_started_at, recipient_id
        ) VALUES ${placeholders}
        RETURNING *
      `;

      const values = [];
      callRecordsData.forEach(data => {
        values.push(
          data.batch_call_id,
          data.client_id,
          data.phone_number,
          data.status || 'pending',
          data.call_started_at || new Date(),
          data.recipient_id || null
        );
      });

      const result = await pool.query(query, values);
      console.log(`✅ ${result.rows.length} registros de llamadas creados`);
      
      return result.rows.map(row => new CallRecord(row));
    } catch (error) {
      console.error('❌ Error creando registros de llamadas múltiples:', error);
      throw new Error(`Error creando registros: ${error.message}`);
    }
  }

  // Buscar por batch call
  static async findByBatchCallId(batchCallId) {
    try {
      const query = `
        SELECT cr.*, c.name as client_name, c.email as client_email
        FROM call_records cr
        LEFT JOIN clients c ON cr.client_id = c.id
        WHERE cr.batch_call_id = $1
        ORDER BY cr.created_at ASC
      `;
      const result = await pool.query(query, [batchCallId]);
      
      return result.rows.map(row => {
        const callRecord = new CallRecord(row);
        callRecord.clientName = row.client_name;
        callRecord.clientEmail = row.client_email;
        return callRecord;
      });
    } catch (error) {
      console.error('❌ Error buscando registros por batch call:', error);
      throw new Error(`Error buscando registros: ${error.message}`);
    }
  }

  // Buscar por cliente
  static async findByClientId(clientId, limit = 10) {
    try {
      const query = `
        SELECT cr.*, bc.call_name, bc.batch_id, bc.started_at as batch_started_at
        FROM call_records cr
        JOIN batch_calls bc ON cr.batch_call_id = bc.id
        WHERE cr.client_id = $1
        ORDER BY cr.created_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [clientId, limit]);
      
      return result.rows.map(row => {
        const callRecord = new CallRecord(row);
        callRecord.callName = row.call_name;
        callRecord.batchId = row.batch_id;
        callRecord.batchStartedAt = row.batch_started_at;
        return callRecord;
      });
    } catch (error) {
      console.error('❌ Error buscando registros por cliente:', error);
      throw new Error(`Error buscando registros: ${error.message}`);
    }
  }

  // Buscar por número de teléfono
  static async findByPhoneNumber(phoneNumber, limit = 10) {
    try {
      const query = `
        SELECT cr.*, c.name as client_name, bc.call_name
        FROM call_records cr
        LEFT JOIN clients c ON cr.client_id = c.id
        JOIN batch_calls bc ON cr.batch_call_id = bc.id
        WHERE cr.phone_number = $1
        ORDER BY cr.created_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [phoneNumber, limit]);
      
      return result.rows.map(row => {
        const callRecord = new CallRecord(row);
        callRecord.clientName = row.client_name;
        callRecord.callName = row.call_name;
        return callRecord;
      });
    } catch (error) {
      console.error('❌ Error buscando registros por teléfono:', error);
      throw new Error(`Error buscando registros: ${error.message}`);
    }
  }

  // Actualizar registro con datos de ElevenLabs
  static async updateByPhoneAndBatch(batchCallId, phoneNumber, updateData) {
    try {
      console.log(`📝 Actualizando registro: ${phoneNumber} en batch ${batchCallId}`);
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Campos que se pueden actualizar
      if (updateData.recipient_id !== undefined) {
        updateFields.push(`recipient_id = $${paramCount++}`);
        values.push(updateData.recipient_id);
      }
      if (updateData.conversation_id !== undefined) {
        updateFields.push(`conversation_id = $${paramCount++}`);
        values.push(updateData.conversation_id);
      }
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }
      if (updateData.call_duration_secs !== undefined) {
        updateFields.push(`call_duration_secs = $${paramCount++}`);
        values.push(updateData.call_duration_secs);
      }
      if (updateData.transcript_summary !== undefined) {
        updateFields.push(`transcript_summary = $${paramCount++}`);
        values.push(updateData.transcript_summary);
      }
      if (updateData.full_transcript !== undefined) {
        updateFields.push(`full_transcript = $${paramCount++}`);
        values.push(JSON.stringify(updateData.full_transcript));
      }
      if (updateData.audio_url !== undefined) {
        updateFields.push(`audio_url = $${paramCount++}`);
        values.push(updateData.audio_url);
      }
      if (updateData.audio_file_name !== undefined) {
        updateFields.push(`audio_file_name = $${paramCount++}`);
        values.push(updateData.audio_file_name);
      }
      if (updateData.audio_size !== undefined) {
        updateFields.push(`audio_size = $${paramCount++}`);
        values.push(updateData.audio_size);
      }
      if (updateData.audio_content_type !== undefined) {
        updateFields.push(`audio_content_type = $${paramCount++}`);
        values.push(updateData.audio_content_type);
      }
      if (updateData.audio_uploaded_at !== undefined) {
        updateFields.push(`audio_uploaded_at = $${paramCount++}`);
        values.push(updateData.audio_uploaded_at);
      }
      if (updateData.call_ended_at !== undefined) {
        updateFields.push(`call_ended_at = $${paramCount++}`);
        values.push(updateData.call_ended_at);
      }

      if (updateFields.length === 0) {
        console.log('⚠️ No hay campos para actualizar');
        return null;
      }

      // Siempre actualizar updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Agregar parámetros de WHERE
      values.push(batchCallId, phoneNumber);

      const query = `
        UPDATE call_records 
        SET ${updateFields.join(', ')} 
        WHERE batch_call_id = $${paramCount++} AND phone_number = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        console.log('✅ Registro de llamada actualizado exitosamente');
        return new CallRecord(result.rows[0]);
      } else {
        console.log('⚠️ No se encontró el registro para actualizar');
        return null;
      }
    } catch (error) {
      console.error('❌ Error actualizando registro de llamada:', error);
      throw new Error(`Error actualizando registro: ${error.message}`);
    }
  }

  // Verificar si un cliente ya fue llamado exitosamente
  static async hasClientBeenCalled(clientId) {
    try {
      const query = `
        SELECT cr.*, bc.call_name, bc.started_at as batch_started_at
        FROM call_records cr
        JOIN batch_calls bc ON cr.batch_call_id = bc.id
        WHERE cr.client_id = $1 AND cr.status = 'completed'
        ORDER BY cr.created_at DESC
        LIMIT 1
      `;
      const result = await pool.query(query, [clientId]);
      
      if (result.rows.length > 0) {
        const callRecord = new CallRecord(result.rows[0]);
        callRecord.callName = result.rows[0].call_name;
        callRecord.batchStartedAt = result.rows[0].batch_started_at;
        return callRecord;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error verificando llamadas del cliente:', error);
      throw new Error(`Error verificando llamadas: ${error.message}`);
    }
  }

  // Convertir a JSON para API
  toJSON() {
    return {
      id: this.id,
      batchCallId: this.batchCallId,
      clientId: this.clientId,
      phoneNumber: this.phoneNumber,
      recipientId: this.recipientId,
      conversationId: this.conversationId,
      status: this.status,
      callDurationSecs: this.callDurationSecs,
      transcriptSummary: this.transcriptSummary,
      fullTranscript: this.fullTranscript,
      audioUrl: this.audioUrl,
      audioFileName: this.audioFileName,
      audioSize: this.audioSize,
      audioContentType: this.audioContentType,
      audioUploadedAt: this.audioUploadedAt,
      callStartedAt: this.callStartedAt,
      callEndedAt: this.callEndedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Campos adicionales que pueden estar disponibles
      clientName: this.clientName,
      clientEmail: this.clientEmail,
      callName: this.callName,
      batchId: this.batchId,
      batchStartedAt: this.batchStartedAt
    };
  }
}

module.exports = CallRecord;
