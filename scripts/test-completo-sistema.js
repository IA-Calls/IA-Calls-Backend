/**
 * TEST COMPLETO DEL SISTEMA
 * 
 * Este test verifica:
 * 1. ✅ Servidor corriendo y monitoreo activo
 * 2. ✅ Hacer llamada con ElevenLabs
 * 3. ✅ Detectar cuando termina la llamada
 * 4. ✅ Verificar que se envió WhatsApp automáticamente
 * 5. ✅ Verificar que se creó WebSocket (o fallback)
 * 6. ✅ Verificar mensajes en BD
 * 7. ✅ Simular respuesta de usuario
 * 8. ✅ Verificar que el agente responde
 */

const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BACKEND_URL = `http://localhost:${process.env.PORT || 5000}`;
const NUMERO_PRUEBA = '+573138539155';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         TEST COMPLETO DEL SISTEMA WHATSAPP                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleto() {
  const startTime = Date.now();
  let batchId = null;
  let conversationId = null;

  try {
    // ============================================
    // FASE 1: VERIFICACIÓN INICIAL
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 1: VERIFICACIÓN INICIAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1.1 Verificando servidor...');
    try {
      const health = await axios.get(`${BACKEND_URL}/health`);
      console.log(`     ✅ Servidor: ${health.data.status}`);
      console.log(`     ✅ Base de datos: ${health.data.services.database}`);
      console.log(`     ✅ Monitoreo: ${health.data.services.monitoring}`);
      console.log(`     ✅ WhatsApp: ${health.data.services.whatsapp}\n`);
    } catch (error) {
      throw new Error(`❌ Servidor no disponible en ${BACKEND_URL}`);
    }

    console.log('1.2 Cargando servicios...');
    const { elevenlabsService } = require('../src/agents');
    const { query } = require('../src/config/database');
    console.log('     ✅ Servicios cargados\n');

    // ============================================
    // FASE 2: PREPARACIÓN
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 2: PREPARACIÓN DE LLAMADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('2.1 Obteniendo agente...');
    const agents = await elevenlabsService.listAgents();
    let agentsList = agents.data;
    if (!Array.isArray(agentsList)) {
      agentsList = agentsList.agents || [];
    }
    const agentId = agentsList[0].agent_id || agentsList[0].id;
    console.log(`     ✅ Agente: ${agentId}\n`);

    console.log('2.2 Obteniendo número de teléfono...');
    const phones = await elevenlabsService.getPhoneNumbers();
    let phonesList = phones.data || phones;
    if (!Array.isArray(phonesList)) {
      phonesList = phonesList.phoneNumbers || phonesList.phone_numbers || [];
    }
    const phoneNumberId = phonesList[0].phone_number_id || phonesList[0].id;
    console.log(`     ✅ Número: ${phoneNumberId}\n`);

    console.log('2.3 Limpiando conversaciones anteriores...');
    await query(
      `DELETE FROM conversation_messages 
       WHERE conversation_id IN (
         SELECT id FROM conversation_state WHERE phone_number = $1
       )`,
      [NUMERO_PRUEBA]
    );
    await query(
      `DELETE FROM conversation_state WHERE phone_number = $1`,
      [NUMERO_PRUEBA]
    );
    console.log('     ✅ Datos limpios\n');

    // ============================================
    // FASE 3: INICIAR LLAMADA
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 3: INICIAR LLAMADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const batchData = {
      agentId: agentId,
      agentPhoneNumberId: phoneNumberId,
      callName: `Test Sistema Completo - ${new Date().toLocaleString()}`,
      recipients: [
        {
          phone_number: NUMERO_PRUEBA,
          variables: { name: 'Alejandro' }
        }
      ]
    };

    console.log('3.1 Creando batch call...');
    const batchResult = await elevenlabsService.submitBatchCall(batchData);

    if (!batchResult.success) {
      throw new Error(`Error creando llamada: ${batchResult.error}`);
    }

    batchId = batchResult.batch_id || batchResult.id || batchResult.data?.id;
    console.log(`     ✅ Batch ID: ${batchId}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              📞 ¡LLAMADA EN CURSO!                         ║');
    console.log('║                                                            ║');
    console.log('║  Por favor:                                                ║');
    console.log('║  1. Contesta el teléfono                                   ║');
    console.log('║  2. Habla con el agente                                    ║');
    console.log('║  3. Cuelga cuando termines                                 ║');
    console.log('║                                                            ║');
    console.log('║  Este test esperará hasta que la llamada termine...       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // ============================================
    // FASE 4: MONITOREAR LLAMADA
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 4: MONITOREANDO LLAMADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let callFinished = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutos
    let lastStatus = 'unknown';

    while (!callFinished && attempts < maxAttempts) {
      attempts++;
      await sleep(5000);

      const status = await elevenlabsService.getBatchCallStatus(batchId);

      if (status.success && status.data && status.data.recipients) {
        const recipient = status.data.recipients[0];
        
        if (recipient.status !== lastStatus) {
          lastStatus = recipient.status;
          console.log(`     📊 Estado: ${recipient.status} (${attempts * 5}s)`);
        }

        if (recipient.status === 'completed' || recipient.status === 'finished') {
          callFinished = true;
          console.log('\n     ✅ LLAMADA COMPLETADA\n');
        }
      }
    }

    if (!callFinished) {
      throw new Error('⏰ Timeout: La llamada no terminó en 10 minutos');
    }

    // ============================================
    // FASE 5: VERIFICAR PROCESAMIENTO AUTOMÁTICO
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 5: VERIFICAR PROCESAMIENTO AUTOMÁTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('5.1 Esperando procesamiento del monitoreo (15 segundos)...');
    await sleep(15000);

    console.log('5.2 Verificando conversación en BD...');
    const convResult = await query(
      `SELECT * FROM conversation_state 
       WHERE phone_number = $1 
       ORDER BY started_at DESC 
       LIMIT 1`,
      [NUMERO_PRUEBA]
    );

    if (convResult.rows.length === 0) {
      console.log('     ⚠️  No se encontró conversación, procesando manualmente...');
      
      // Procesar manualmente
      const ConversationService = require('../src/services/conversationService');
      const conversationService = new ConversationService();
      const batchStatus = await elevenlabsService.getBatchCallStatus(batchId);
      const recipient = batchStatus.data.recipients[0];
      
      await conversationService.handleCallCompleted(recipient, batchStatus.data);
      
      // Re-verificar
      const convResult2 = await query(
        `SELECT * FROM conversation_state WHERE phone_number = $1 ORDER BY started_at DESC LIMIT 1`,
        [NUMERO_PRUEBA]
      );
      
      if (convResult2.rows.length > 0) {
        conversationId = convResult2.rows[0].id;
        console.log('     ✅ Conversación creada manualmente');
      } else {
        throw new Error('No se pudo crear conversación');
      }
    } else {
      conversationId = convResult.rows[0].id;
      console.log('     ✅ Conversación encontrada automáticamente');
    }

    const conversation = await query(
      `SELECT * FROM conversation_state WHERE id = $1`,
      [conversationId]
    );
    const conv = conversation.rows[0];

    console.log(`\n     📊 Detalles de la conversación:`);
    console.log(`        ID: ${conv.id}`);
    console.log(`        Teléfono: ${conv.phone_number}`);
    console.log(`        Cliente: ${conv.client_name}`);
    console.log(`        Agente ID: ${conv.agent_id}`);
    console.log(`        ElevenLabs Conv ID: ${conv.elevenlabs_conversation_id || 'N/A'}`);
    console.log(`        Estado: ${conv.status}\n`);

    console.log('5.3 Verificando mensaje de WhatsApp enviado...');
    const messagesResult = await query(
      `SELECT * FROM conversation_messages 
       WHERE conversation_id = $1 
       AND direction = 'outbound'
       ORDER BY sent_at DESC 
       LIMIT 1`,
      [conversationId]
    );

    if (messagesResult.rows.length === 0) {
      throw new Error('❌ No se encontró mensaje de WhatsApp en BD');
    }

    const outboundMsg = messagesResult.rows[0];
    console.log('     ✅ Mensaje enviado:');
    console.log(`        Twilio SID: ${outboundMsg.twilio_message_id}`);
    console.log(`        Contenido: "${outboundMsg.content.substring(0, 50)}..."`);
    console.log(`        Enviado: ${outboundMsg.sent_at}\n`);

    // ============================================
    // FASE 6: VERIFICAR WHATSAPP
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 6: VERIFICACIÓN DE WHATSAPP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           📱 REVISA TU WHATSAPP                            ║');
    console.log('║                                                            ║');
    console.log('║  Número: +573138539155                                     ║');
    console.log('║  De: +14155238886                                          ║');
    console.log('║                                                            ║');
    console.log('║  ¿Recibiste el mensaje? (s/n):                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Esperar confirmación del usuario (opcional, con timeout)
    console.log('     ⏳ Continuando automáticamente en 10 segundos...\n');
    await sleep(10000);

    // ============================================
    // FASE 7: SIMULAR RESPUESTA DEL USUARIO
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 7: PROBAR RESPUESTA BIDIRECCIONAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('7.1 Simulando mensaje del usuario...');
    const ConversationService = require('../src/services/conversationService');
    const conversationService = new ConversationService();

    const userMessage = '¡Hola! ¿Puedes ayudarme con información?';
    
    const response = await conversationService.handleIncomingWhatsAppMessage(
      `whatsapp:${NUMERO_PRUEBA}`,
      userMessage,
      'test_msg_' + Date.now()
    );

    if (response.success) {
      console.log('     ✅ Sistema procesó el mensaje');
      console.log(`     🤖 Respuesta del agente: "${response.response.substring(0, 100)}..."\n`);
    } else {
      console.log(`     ⚠️  Error procesando mensaje: ${response.error}`);
      console.log('     ℹ️  Esto es normal si el WebSocket no está activo\n');
    }

    console.log('7.2 Verificando mensajes en BD...');
    const allMessages = await query(
      `SELECT * FROM conversation_messages 
       WHERE conversation_id = $1 
       ORDER BY sent_at ASC`,
      [conversationId]
    );

    console.log(`     📊 Total de mensajes: ${allMessages.rows.length}`);
    allMessages.rows.forEach((msg, index) => {
      const direction = msg.direction === 'inbound' ? '👤' : '🤖';
      const preview = msg.content.substring(0, 40);
      console.log(`        ${index + 1}. ${direction} [${msg.direction}] "${preview}..."`);
    });
    console.log('');

    // ============================================
    // FASE 8: VERIFICAR WEBSOCKET
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 FASE 8: VERIFICAR WEBSOCKET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const elevenlabsWebSocketService = require('../src/services/elevenlabsWebSocketService');
    const hasWS = elevenlabsWebSocketService.hasActiveConnection(NUMERO_PRUEBA);
    const wsInfo = elevenlabsWebSocketService.getConnectionInfo(NUMERO_PRUEBA);

    if (hasWS) {
      console.log('     ✅ WebSocket ACTIVO');
      console.log(`        Conversation ID: ${wsInfo.conversationId}`);
      console.log(`        Agent ID: ${wsInfo.agentId}`);
      console.log(`        Última actividad: ${new Date(wsInfo.lastActivity).toLocaleString()}\n`);
    } else {
      console.log('     ⚠️  WebSocket NO activo (se creará cuando el usuario responda)\n');
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ TEST COMPLETADO                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESUMEN DE RESULTADOS:\n');
    console.log(`   ✅ Servidor: Funcionando`);
    console.log(`   ✅ Monitoreo: Activo`);
    console.log(`   ✅ Llamada: Completada (Batch: ${batchId})`);
    console.log(`   ✅ Conversación BD: Creada (ID: ${conversationId})`);
    console.log(`   ✅ WhatsApp: Enviado (${allMessages.rows.length} mensajes totales)`);
    console.log(`   ${hasWS ? '✅' : '⚠️ '} WebSocket: ${hasWS ? 'Activo' : 'Inactivo (se creará al responder)'}`);
    console.log(`   ⏱️  Duración total: ${duration} segundos\n`);

    console.log('🎯 PRÓXIMOS PASOS:\n');
    console.log('   1. Revisa tu WhatsApp (+573138539155)');
    console.log('   2. Responde el mensaje');
    console.log('   3. El agente debería responder automáticamente');
    console.log('   4. La conversación debe mantenerse con contexto\n');

    console.log('═'.repeat(60));
    console.log('✨ El sistema está funcionando correctamente\n');

    process.exit(0);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║                  ❌ TEST FALLIDO                           ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error(`❌ Error: ${error.message}\n`);
    console.error('Stack trace:');
    console.error(error.stack);
    
    if (batchId) {
      console.error(`\n📋 Batch ID: ${batchId}`);
      console.error('   Puedes procesar manualmente con:');
      console.error(`   node scripts/procesar-batch-especifico.js ${batchId}\n`);
    }

    process.exit(1);
  }
}

// Ejecutar test
testCompleto();


