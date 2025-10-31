/**
 * Debug - Ver estado del último batch call
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 ===== DEBUG DEL ÚLTIMO BATCH CALL =====\n');

async function debugBatch() {
  try {
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    console.log('1️⃣ Obteniendo lista de batch calls...\n');
    
    const batches = await elevenlabsService.listBatchCalls();
    
    if (!batches.success) {
      console.error('❌ Error obteniendo batches:', batches.error);
      process.exit(1);
    }
    
    // Obtener el array de batches
    let batchList = batches.data;
    if (!Array.isArray(batchList)) {
      if (batchList.batches) batchList = batchList.batches;
      else if (batchList.batch_calls) batchList = batchList.batch_calls;
      else if (batchList.data) batchList = batchList.data;
    }
    
    if (!batchList || batchList.length === 0) {
      console.log('⚠️  No hay batch calls registrados\n');
      process.exit(0);
    }
    
    // Ordenar por fecha y tomar el más reciente
    batchList.sort((a, b) => {
      const timeA = a.created_at_unix || a.last_updated_at_unix || 0;
      const timeB = b.created_at_unix || b.last_updated_at_unix || 0;
      return timeB - timeA;
    });
    
    const ultimoBatch = batchList[0];
    const batchId = ultimoBatch.id || ultimoBatch.batch_id;
    
    console.log('📊 ÚLTIMO BATCH CALL:');
    console.log(`   ID: ${batchId}`);
    console.log(`   Nombre: ${ultimoBatch.name || 'Sin nombre'}`);
    console.log(`   Estado: ${ultimoBatch.status}`);
    console.log(`   Creado: ${new Date((ultimoBatch.created_at_unix || 0) * 1000).toLocaleString()}`);
    console.log('');
    
    console.log('2️⃣ Obteniendo detalles completos...\n');
    
    const detalles = await elevenlabsService.getBatchCallStatus(batchId);
    
    if (!detalles.success) {
      console.error('❌ Error obteniendo detalles:', detalles.error);
      process.exit(1);
    }
    
    const batch = detalles.data;
    
    console.log('📋 DETALLES DEL BATCH:');
    console.log(`   Estado general: ${batch.status}`);
    console.log(`   Total llamadas: ${batch.total_calls_scheduled || 0}`);
    console.log(`   Llamadas despachadas: ${batch.total_calls_dispatched || 0}`);
    console.log('');
    
    console.log('👥 DESTINATARIOS:\n');
    
    const recipients = batch.recipients || [];
    
    if (recipients.length === 0) {
      console.log('   ⚠️  No hay destinatarios en este batch\n');
    } else {
      recipients.forEach((recipient, index) => {
        console.log(`   ${index + 1}. ${recipient.name || 'Sin nombre'}`);
        console.log(`      📱 Teléfono: ${recipient.phone_number}`);
        console.log(`      📊 Estado: ${recipient.status}`);
        console.log(`      🆔 Conversation ID: ${recipient.conversation_id || 'N/A'}`);
        
        if (recipient.call_started_at_unix) {
          console.log(`      ⏰ Inicio: ${new Date(recipient.call_started_at_unix * 1000).toLocaleString()}`);
        }
        
        if (recipient.call_ended_at_unix) {
          console.log(`      🏁 Fin: ${new Date(recipient.call_ended_at_unix * 1000).toLocaleString()}`);
        }
        
        if (recipient.call_duration_secs) {
          const minutos = Math.floor(recipient.call_duration_secs / 60);
          const segundos = recipient.call_duration_secs % 60;
          console.log(`      ⏱️  Duración: ${minutos}m ${segundos}s`);
        }
        
        console.log('');
      });
    }
    
    // Verificar si debería haber enviado WhatsApp
    console.log('🔍 ANÁLISIS:\n');
    
    const recipientFinalizado = recipients.find(r => 
      r.status === 'completed' || 
      r.status === 'finished' || 
      r.status === 'ended'
    );
    
    if (recipientFinalizado) {
      console.log('✅ Hay llamadas finalizadas que deberían haber generado WhatsApp\n');
      
      // Verificar en la BD
      console.log('3️⃣ Verificando en base de datos...\n');
      
      const { query } = require('../src/config/database');
      
      const phoneNumber = recipientFinalizado.phone_number;
      
      const result = await query(
        `SELECT * FROM conversation_state 
         WHERE phone_number = $1 
         ORDER BY started_at DESC 
         LIMIT 1`,
        [phoneNumber]
      );
      
      if (result.rows.length > 0) {
        const conversation = result.rows[0];
        console.log('✅ CONVERSACIÓN ENCONTRADA EN BD:');
        console.log(`   ID: ${conversation.id}`);
        console.log(`   Teléfono: ${conversation.phone_number}`);
        console.log(`   Cliente: ${conversation.client_name}`);
        console.log(`   Estado: ${conversation.status}`);
        console.log(`   Iniciada: ${conversation.started_at}`);
        console.log('');
        
        // Ver mensajes
        const messages = await query(
          `SELECT * FROM conversation_messages 
           WHERE conversation_id = $1 
           ORDER BY sent_at ASC`,
          [conversation.id]
        );
        
        if (messages.rows.length > 0) {
          console.log('✅ MENSAJES ENVIADOS:');
          messages.rows.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.direction}] ${msg.content.substring(0, 60)}...`);
            console.log(`      Twilio SID: ${msg.twilio_message_id || 'N/A'}`);
            console.log(`      Enviado: ${msg.sent_at}`);
          });
          console.log('');
        } else {
          console.log('⚠️  NO HAY MENSAJES REGISTRADOS');
          console.log('   Esto significa que el WhatsApp NO se envió\n');
        }
      } else {
        console.log('❌ NO HAY CONVERSACIÓN EN BD');
        console.log('   Esto significa que el monitoreo NO detectó la llamada finalizada\n');
        
        console.log('🔍 POSIBLES CAUSAS:');
        console.log('   1. El servicio de monitoreo no está corriendo');
        console.log('   2. Las variables de Twilio no están configuradas');
        console.log('   3. Hay un error en el servicio de conversación');
        console.log('   4. El monitoreo no ha ejecutado su ciclo aún\n');
      }
      
    } else {
      console.log('⚠️  No hay llamadas en estado finalizado (completed/finished/ended)');
      console.log('   Estado actual de los recipients:');
      recipients.forEach(r => {
        console.log(`   - ${r.name}: ${r.status}`);
      });
      console.log('');
    }
    
    // Verificar variables de entorno
    console.log('4️⃣ Verificando configuración de Twilio...\n');
    
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
    
    if (twilioSid && twilioToken && twilioFrom) {
      console.log('✅ Variables de Twilio configuradas:');
      console.log(`   TWILIO_ACCOUNT_SID: ${twilioSid.substring(0, 10)}...`);
      console.log(`   TWILIO_AUTH_TOKEN: ${twilioToken.substring(0, 10)}...`);
      console.log(`   TWILIO_WHATSAPP_FROM: ${twilioFrom}`);
      console.log('');
    } else {
      console.log('❌ FALTAN VARIABLES DE TWILIO:');
      if (!twilioSid) console.log('   - TWILIO_ACCOUNT_SID');
      if (!twilioToken) console.log('   - TWILIO_AUTH_TOKEN');
      if (!twilioFrom) console.log('   - TWILIO_WHATSAPP_FROM');
      console.log('');
      console.log('⚠️  SIN ESTAS VARIABLES, EL WHATSAPP NO SE PUEDE ENVIAR\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugBatch();

