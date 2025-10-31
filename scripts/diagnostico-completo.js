/**
 * Diagnóstico Completo del Sistema
 * Identifica por qué no está funcionando el flujo
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 ===== DIAGNÓSTICO COMPLETO DEL SISTEMA =====\n');

async function diagnosticar() {
  const { query } = require('../src/config/database');
  const elevenlabsService = require('../src/agents/elevenlabsService');
  
  console.log('📋 1. VERIFICANDO ÚLTIMAS LLAMADAS EN ELEVENLABS...\n');
  
  try {
    const batches = await elevenlabsService.listBatchCalls();
    
    if (!batches.success) {
      console.error('❌ Error obteniendo batches:', batches.error);
      return;
    }
    
    let batchList = batches.data;
    if (!Array.isArray(batchList)) {
      if (batchList.batches) batchList = batchList.batches;
      else if (batchList.batch_calls) batchList = batchList.batch_calls;
      else if (batchList.data) batchList = batchList.data;
    }
    
    // Ordenar por fecha
    batchList.sort((a, b) => {
      const timeA = a.last_updated_at_unix || a.created_at_unix || 0;
      const timeB = b.last_updated_at_unix || b.created_at_unix || 0;
      return timeB - timeA;
    });
    
    console.log(`✅ ${batchList.length} batches encontrados\n`);
    
    // Mostrar los últimos 3
    console.log('📊 ÚLTIMOS 3 BATCHES:\n');
    
    for (let i = 0; i < Math.min(3, batchList.length); i++) {
      const batch = batchList[i];
      const batchId = batch.id || batch.batch_id;
      
      console.log(`${i + 1}. Batch: ${batchId}`);
      console.log(`   Estado: ${batch.status}`);
      console.log(`   Nombre: ${batch.name || 'Sin nombre'}`);
      console.log(`   Agente: ${batch.agent_id}`);
      
      // Obtener detalles
      const details = await elevenlabsService.getBatchCallStatus(batchId);
      
      if (details.success && details.data) {
        const recipients = details.data.recipients || [];
        console.log(`   Recipients: ${recipients.length}`);
        
        recipients.forEach((r, idx) => {
          console.log(`      ${idx + 1}. ${r.phone_number} - ${r.status}`);
          if (r.conversation_id) {
            console.log(`         Conv ID: ${r.conversation_id}`);
          }
        });
      }
      console.log('');
    }
    
    console.log('\n📋 2. VERIFICANDO CONVERSACIONES EN BD...\n');
    
    const conversationsResult = await query(
      `SELECT * FROM conversation_state 
       ORDER BY started_at DESC 
       LIMIT 5`
    );
    
    if (conversationsResult.rows.length === 0) {
      console.log('❌ NO HAY CONVERSACIONES EN BD');
      console.log('   Esto significa que el monitoreo NO ha procesado ninguna llamada\n');
    } else {
      console.log(`✅ ${conversationsResult.rows.length} conversaciones encontradas\n`);
      
      conversationsResult.rows.forEach((conv, i) => {
        console.log(`${i + 1}. Conversación ID: ${conv.id}`);
        console.log(`   Teléfono: ${conv.phone_number}`);
        console.log(`   Cliente: ${conv.client_name}`);
        console.log(`   Agente: ${conv.agent_id}`);
        console.log(`   ElevenLabs Conv ID: ${conv.elevenlabs_conversation_id}`);
        console.log(`   Batch ID: ${conv.batch_id}`);
        console.log(`   Estado: ${conv.status}`);
        console.log(`   Mensajes: ${conv.message_count || 0}`);
        console.log(`   Iniciada: ${conv.started_at}`);
        console.log('');
      });
    }
    
    console.log('\n📋 3. VERIFICANDO MONITOREO DEL SERVIDOR...\n');
    
    // Verificar si el monitoreo está activo
    try {
      const BatchMonitoringService = require('../src/services/batchMonitoringService');
      console.log('✅ BatchMonitoringService existe');
      console.log(`   Procesados: ${BatchMonitoringService.processedCalls.size} llamadas\n`);
    } catch (error) {
      console.log('❌ Error cargando BatchMonitoringService:', error.message);
    }
    
    console.log('\n📋 4. VERIFICANDO LLAMADAS COMPLETADAS NO PROCESADAS...\n');
    
    let foundUnprocessed = false;
    
    for (const batch of batchList.slice(0, 10)) {
      const batchId = batch.id || batch.batch_id;
      const details = await elevenlabsService.getBatchCallStatus(batchId);
      
      if (details.success && details.data) {
        const recipients = details.data.recipients || [];
        
        for (const recipient of recipients) {
          if (recipient.status === 'completed' || 
              recipient.status === 'finished' || 
              recipient.status === 'ended') {
            
            // Verificar si está en BD
            const bdCheck = await query(
              `SELECT * FROM conversation_state 
               WHERE phone_number = $1 
               AND elevenlabs_conversation_id = $2`,
              [recipient.phone_number, recipient.conversation_id]
            );
            
            if (bdCheck.rows.length === 0) {
              foundUnprocessed = true;
              console.log('⚠️  LLAMADA COMPLETADA NO PROCESADA:');
              console.log(`   Batch: ${batchId}`);
              console.log(`   Teléfono: ${recipient.phone_number}`);
              console.log(`   Estado: ${recipient.status}`);
              console.log(`   Conv ID: ${recipient.conversation_id}`);
              console.log('');
            }
          }
        }
      }
    }
    
    if (!foundUnprocessed) {
      console.log('✅ No hay llamadas completadas sin procesar\n');
    }
    
    console.log('\n📋 5. RECOMENDACIONES:\n');
    
    if (conversationsResult.rows.length === 0) {
      console.log('🔧 SOLUCIÓN 1: El monitoreo no está procesando');
      console.log('   → Ejecuta: node scripts/forzar-monitoreo.js\n');
    }
    
    if (foundUnprocessed) {
      console.log('🔧 SOLUCIÓN 2: Hay llamadas sin procesar');
      console.log('   → Ejecuta: node scripts/forzar-monitoreo.js\n');
    }
    
    console.log('🔧 SOLUCIÓN 3: Verificar que el servidor esté corriendo');
    console.log('   → Debe mostrar: 🔄 X batch(es) activo(s) - HH:MM:SS');
    console.log('   → Si no lo ves, reinicia: npm run dev\n');
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error(error.stack);
  }
}

diagnosticar().then(() => process.exit(0));

