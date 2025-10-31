/**
 * Procesar un batch específico manualmente
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const batchId = process.argv[2] || 'btcal_8301k8vjqcbyeyfsjrn9tnjfxj20';

console.log('\n🔧 ===== PROCESANDO BATCH MANUALMENTE =====\n');
console.log(`📋 Batch ID: ${batchId}\n`);

async function processBatch() {
  try {
    const { elevenlabsService } = require('../src/agents');
    const ConversationService = require('../src/services/conversationService');
    const conversationService = new ConversationService();

    console.log('1️⃣ Obteniendo estado del batch...\n');

    const batchStatus = await elevenlabsService.getBatchCallStatus(batchId);

    if (!batchStatus.success) {
      throw new Error(`Error obteniendo batch: ${batchStatus.error}`);
    }

    const batch = batchStatus.data;
    console.log(`   📊 Estado: ${batch.status}`);
    console.log(`   👥 Destinatarios: ${batch.recipients?.length || 0}\n`);

    if (!batch.recipients || batch.recipients.length === 0) {
      console.log('⚠️  No hay destinatarios en este batch\n');
      return;
    }

    console.log('2️⃣ Procesando destinatarios...\n');

    for (const recipient of batch.recipients) {
      console.log(`\n📞 Procesando: ${recipient.phone_number}`);
      console.log(`   Estado: ${recipient.status}`);
      console.log(`   Conversation ID: ${recipient.conversation_id || 'N/A'}`);

      if (recipient.status === 'completed' || recipient.status === 'finished') {
        console.log(`   ✅ Llamada completada, enviando WhatsApp...\n`);

        try {
          const result = await conversationService.handleCallCompleted(
            recipient,
            batch
          );

          if (result.success) {
            console.log(`   ✅ WhatsApp enviado exitosamente`);
            console.log(`   📱 Message ID: ${result.whatsapp_message_id}`);
            console.log(`   💬 Conversation ID: ${result.conversation_id}`);
            console.log(`   🔌 ElevenLabs Conv ID: ${result.elevenlabs_conversation_id || 'N/A'}\n`);
          } else {
            console.log(`   ❌ Error enviando WhatsApp: ${result.error}\n`);
          }
        } catch (error) {
          console.error(`   ❌ Error procesando: ${error.message}`);
          console.error(error.stack);
        }
      } else {
        console.log(`   ⏭️  Estado no procesable: ${recipient.status}\n`);
      }
    }

    console.log('\n✅ Procesamiento completado\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

processBatch();


