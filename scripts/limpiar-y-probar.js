/**
 * Limpiar Conversación y Probar de Nuevo
 * Elimina la conversación actual y la recrea para probar el fix
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NUMERO_PRUEBA = '+573138539155';

console.log('\n🧹 ===== LIMPIAR Y PROBAR =====\n');

async function limpiarYProbar() {
  try {
    const { query } = require('../src/config/database');
    
    console.log('1️⃣ Limpiando conversaciones antiguas...\n');
    
    // Eliminar mensajes
    const messagesDeleted = await query(
      `DELETE FROM conversation_messages 
       WHERE conversation_id IN (
         SELECT id FROM conversation_state WHERE phone_number = $1
       )`,
      [NUMERO_PRUEBA]
    );
    
    console.log(`   ✅ ${messagesDeleted.rowCount} mensajes eliminados`);
    
    // Eliminar conversaciones
    const conversationsDeleted = await query(
      `DELETE FROM conversation_state 
       WHERE phone_number = $1`,
      [NUMERO_PRUEBA]
    );
    
    console.log(`   ✅ ${conversationsDeleted.rowCount} conversaciones eliminadas\n`);
    
    console.log('2️⃣ Forzando nuevo procesamiento de última llamada...\n');
    
    // Obtener última llamada
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    const batches = await elevenlabsService.listBatchCalls();
    let batchList = batches.data;
    
    if (!Array.isArray(batchList)) {
      if (batchList.batches) batchList = batchList.batches;
      else if (batchList.batch_calls) batchList = batchList.batch_calls;
      else if (batchList.data) batchList = batchList.data;
    }
    
    // Ordenar y tomar el más reciente
    batchList.sort((a, b) => {
      const timeA = a.last_updated_at_unix || a.created_at_unix || 0;
      const timeB = b.last_updated_at_unix || b.created_at_unix || 0;
      return timeB - timeA;
    });
    
    const latestBatch = batchList[0];
    const batchId = latestBatch.id || latestBatch.batch_id;
    
    console.log(`   📊 Última llamada: ${batchId}`);
    console.log(`   📋 Nombre: ${latestBatch.name || 'Sin nombre'}`);
    console.log(`   🤖 Agente: ${latestBatch.agent_id}\n`);
    
    // Obtener detalles
    const details = await elevenlabsService.getBatchCallStatus(batchId);
    
    if (details.success && details.data) {
      const recipients = details.data.recipients || [];
      
      if (recipients.length > 0) {
        const recipient = recipients[0];
        
        console.log(`   👤 Recipient:`);
        console.log(`      Teléfono: ${recipient.phone_number}`);
        console.log(`      Estado: ${recipient.status}`);
        console.log(`      Conv ID: ${recipient.conversation_id}\n`);
        
        if (recipient.status === 'completed' || 
            recipient.status === 'finished' || 
            recipient.status === 'ended') {
          
          console.log('3️⃣ Procesando llamada manualmente...\n');
          
          const ConversationService = require('../src/services/conversationService');
          const conversationService = new ConversationService();
          
          const result = await conversationService.handleCallCompleted(
            recipient,
            {
              id: batchId,
              agent_id: latestBatch.agent_id,
              name: latestBatch.name
            }
          );
          
          if (result.success) {
            console.log('   ✅ Llamada procesada exitosamente');
            console.log(`   📱 WhatsApp enviado: ${result.whatsapp_message_id}`);
            console.log(`   💬 Conversación ID: ${result.conversation_id}\n`);
            
            console.log('━'.repeat(60));
            console.log('📱 REVISA TU WHATSAPP');
            console.log('   Deberías tener un mensaje nuevo');
            console.log('━'.repeat(60));
            console.log('');
            
            console.log('4️⃣ Ahora responde el WhatsApp para probar el fix del error 404...\n');
            console.log('   El sistema debería:');
            console.log('   1. Intentar usar la conversación de la llamada');
            console.log('   2. Detectar que expiró (404)');
            console.log('   3. Crear una nueva conversación automáticamente');
            console.log('   4. Responderte correctamente\n');
            
          } else {
            console.log(`   ❌ Error: ${result.error}\n`);
          }
          
        } else {
          console.log(`   ⚠️  La llamada no está completada (estado: ${recipient.status})\n`);
        }
      } else {
        console.log('   ⚠️  No hay recipients en este batch\n');
      }
    } else {
      console.log(`   ❌ Error obteniendo detalles: ${details.error}\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

limpiarYProbar().then(() => process.exit(0));

