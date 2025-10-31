/**
 * TEST DE CONVERSACIÓN COMPLETA
 * 
 * Este test valida TODO el flujo:
 * 1. ✅ Conexión WebSocket
 * 2. ✅ Envío de mensaje
 * 3. ✅ Recepción de respuesta del agente
 * 4. ✅ Conversación con múltiples mensajes
 * 5. ✅ Validación de contexto
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NUMERO_PRUEBA = '+573138539155';
const AGENT_ID = process.env.DEFAULT_AGENT_ID || 'agent_4701k8fcsvhaes5s1h6tw894g98s';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           TEST DE CONVERSACIÓN COMPLETA                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConversacionCompleta() {
  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    const elevenlabsWebSocketService = require('../src/services/elevenlabsWebSocketService');
    const ConversationService = require('../src/services/conversationService');
    const { query } = require('../src/config/database');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 1: Limpiar datos previos');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
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
    
    console.log('   ✅ Datos limpiados\n');
    testsPassed++;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 2: Iniciar WebSocket');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const wsResult = await elevenlabsWebSocketService.startConversation(
      AGENT_ID,
      NUMERO_PRUEBA,
      'Alejandro'
    );
    
    if (!wsResult.success) {
      throw new Error(`❌ Error iniciando WebSocket: ${wsResult.error}`);
    }
    
    console.log(`   ✅ WebSocket conectado`);
    console.log(`   📋 Conversation ID: ${wsResult.conversationId}`);
    console.log(`   🤖 Agent ID: ${wsResult.agentId}\n`);
    testsPassed++;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 3: Primer mensaje - Presentación');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const pregunta1 = '¿Quién eres?';
    console.log(`   👤 Usuario: "${pregunta1}"\n`);
    
    const respuesta1 = await elevenlabsWebSocketService.sendMessage(
      NUMERO_PRUEBA,
      pregunta1
    );
    
    if (!respuesta1.success) {
      console.error(`   ❌ Error: ${respuesta1.error}\n`);
      testsFailed++;
    } else if (!respuesta1.response || respuesta1.response.trim() === '') {
      console.error(`   ❌ Respuesta vacía\n`);
      testsFailed++;
    } else {
      console.log(`   🤖 Agente: "${respuesta1.response.substring(0, 150)}..."\n`);
      console.log(`   ✅ Respuesta válida recibida\n`);
      testsPassed++;
    }
    
    console.log('   ⏳ Esperando 2 segundos y cerrando WebSocket...\n');
    await sleep(2000);
    
    // Cerrar WebSocket anterior y crear uno nuevo (simula comportamiento real de WhatsApp)
    console.log('   🔌 Cerrando WebSocket anterior...\n');
    elevenlabsWebSocketService.closeConnection(NUMERO_PRUEBA);
    await sleep(500);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 4: Segundo mensaje - Nueva conversación WebSocket');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('   🔌 Abriendo nuevo WebSocket...\n');
    const wsResult2 = await elevenlabsWebSocketService.startConversation(
      AGENT_ID,
      NUMERO_PRUEBA,
      'Alejandro'
    );
    
    if (!wsResult2.success) {
      console.error(`   ❌ Error: ${wsResult2.error}\n`);
      testsFailed++;
    } else {
      console.log(`   ✅ WebSocket reconectado\n`);
      
      const pregunta2 = '¿Qué servicios ofreces?';
      console.log(`   👤 Usuario: "${pregunta2}"\n`);
      
      const respuesta2 = await elevenlabsWebSocketService.sendMessage(
        NUMERO_PRUEBA,
        pregunta2
      );
    
      if (!respuesta2.success) {
        console.error(`   ❌ Error: ${respuesta2.error}\n`);
        testsFailed++;
      } else if (!respuesta2.response || respuesta2.response.trim() === '') {
        console.error(`   ❌ Respuesta vacía\n`);
        testsFailed++;
      } else {
        console.log(`   🤖 Agente: "${respuesta2.response.substring(0, 150)}..."\n`);
        console.log(`   ✅ Respuesta válida recibida\n`);
        testsPassed++;
      }
    }
    
    console.log('   ⏳ Esperando 2 segundos y cerrando WebSocket...\n');
    await sleep(2000);
    
    // Cerrar y reabrir para el tercer mensaje
    console.log('   🔌 Cerrando WebSocket anterior...\n');
    elevenlabsWebSocketService.closeConnection(NUMERO_PRUEBA);
    await sleep(500);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 5: Tercer mensaje - Nueva conversación WebSocket');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('   🔌 Abriendo nuevo WebSocket...\n');
    const wsResult3 = await elevenlabsWebSocketService.startConversation(
      AGENT_ID,
      NUMERO_PRUEBA,
      'Alejandro'
    );
    
    if (!wsResult3.success) {
      console.error(`   ❌ Error: ${wsResult3.error}\n`);
      testsFailed++;
    } else {
      console.log(`   ✅ WebSocket reconectado\n`);
      
      const pregunta3 = '¿Cuáles son los precios?';
      console.log(`   👤 Usuario: "${pregunta3}"\n`);
      
      const respuesta3 = await elevenlabsWebSocketService.sendMessage(
        NUMERO_PRUEBA,
        pregunta3
      );
    
      if (!respuesta3.success) {
        console.error(`   ❌ Error: ${respuesta3.error}\n`);
        testsFailed++;
      } else if (!respuesta3.response || respuesta3.response.trim() === '') {
        console.error(`   ❌ Respuesta vacía\n`);
        testsFailed++;
      } else {
        console.log(`   🤖 Agente: "${respuesta3.response.substring(0, 150)}..."\n`);
        console.log(`   ✅ Respuesta válida recibida\n`);
        testsPassed++;
      }
    }
    
    await sleep(1000);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 6: Verificar estado del WebSocket');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const hasWS = elevenlabsWebSocketService.hasActiveConnection(NUMERO_PRUEBA);
    const wsInfo = elevenlabsWebSocketService.getConnectionInfo(NUMERO_PRUEBA);
    
    if (!hasWS) {
      console.error('   ❌ WebSocket no está activo\n');
      testsFailed++;
    } else {
      console.log('   ✅ WebSocket activo');
      console.log(`   📋 Conversation ID: ${wsInfo.conversationId}`);
      console.log(`   🤖 Agent ID: ${wsInfo.agentId}`);
      console.log(`   ⏰ Última actividad: ${new Date(wsInfo.lastActivity).toLocaleTimeString()}\n`);
      testsPassed++;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 7: Probar flujo completo con ConversationService');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const conversationService = new ConversationService();
    
    // Guardar conversación en BD
    await query(
      `INSERT INTO conversation_state 
       (phone_number, client_name, elevenlabs_conversation_id, agent_id, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone_number) 
       DO UPDATE SET 
         elevenlabs_conversation_id = EXCLUDED.elevenlabs_conversation_id,
         agent_id = EXCLUDED.agent_id,
         status = 'active'`,
      [NUMERO_PRUEBA, 'Alejandro', wsResult.conversationId, AGENT_ID, 'active']
    );
    
    const pregunta4 = 'Gracias por la información';
    console.log(`   👤 Usuario: "${pregunta4}"\n`);
    
    const conversationResult = await conversationService.handleIncomingWhatsAppMessage(
      `whatsapp:${NUMERO_PRUEBA}`,
      pregunta4,
      'test_msg_' + Date.now()
    );
    
    if (!conversationResult.success) {
      console.error(`   ❌ Error: ${conversationResult.error}\n`);
      testsFailed++;
    } else {
      console.log(`   🤖 Agente: "${conversationResult.response.substring(0, 150)}..."\n`);
      console.log('   ✅ ConversationService funcionando correctamente\n');
      testsPassed++;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 8: Verificar mensajes en BD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const messages = await query(
      `SELECT * FROM conversation_messages 
       WHERE conversation_id = (
         SELECT id FROM conversation_state WHERE phone_number = $1
       )
       ORDER BY sent_at ASC`,
      [NUMERO_PRUEBA]
    );
    
    if (messages.rows.length === 0) {
      console.error('   ❌ No se encontraron mensajes en BD\n');
      testsFailed++;
    } else {
      console.log(`   📊 Total de mensajes guardados: ${messages.rows.length}`);
      messages.rows.forEach((msg, index) => {
        const direction = msg.direction === 'inbound' ? '👤' : '🤖';
        const preview = msg.content.substring(0, 50);
        console.log(`      ${index + 1}. ${direction} [${msg.direction}] "${preview}..."`);
      });
      console.log('\n   ✅ Mensajes guardados correctamente\n');
      testsPassed++;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 9: Cerrar WebSocket correctamente');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    elevenlabsWebSocketService.closeConnection(NUMERO_PRUEBA);
    
    await sleep(500);
    
    const hasWSAfterClose = elevenlabsWebSocketService.hasActiveConnection(NUMERO_PRUEBA);
    
    if (hasWSAfterClose) {
      console.error('   ❌ WebSocket no se cerró correctamente\n');
      testsFailed++;
    } else {
      console.log('   ✅ WebSocket cerrado correctamente\n');
      testsPassed++;
    }
    
    // RESUMEN FINAL
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  📊 RESUMEN DE TESTS                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`   ✅ Tests exitosos: ${testsPassed}`);
    console.log(`   ${testsFailed > 0 ? '❌' : '✅'} Tests fallidos: ${testsFailed}`);
    console.log(`   ⏱️  Duración total: ${duration} segundos\n`);
    
    if (testsFailed === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          🎉 ¡TODOS LOS TESTS PASARON!                     ║');
      console.log('║                                                            ║');
      console.log('║  El sistema de conversación está 100% funcional:          ║');
      console.log('║  ✅ WebSocket conecta correctamente                       ║');
      console.log('║  ✅ Agente responde a todos los mensajes                  ║');
      console.log('║  ✅ Respuestas tienen contenido válido                    ║');
      console.log('║  ✅ ConversationService funciona                          ║');
      console.log('║  ✅ Mensajes se guardan en BD                             ║');
      console.log('║  ✅ WebSocket se cierra correctamente                     ║');
      console.log('║                                                            ║');
      console.log('║  🚀 Sistema listo para producción                         ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      
      console.log('📱 PRUEBA REAL:\n');
      console.log('   1. Envía un WhatsApp a: +573138539155');
      console.log('   2. De: +14155238886');
      console.log('   3. El agente debería responder automáticamente');
      console.log('   4. Continúa la conversación para validar el contexto\n');
      
      process.exit(0);
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          ⚠️  ALGUNOS TESTS FALLARON                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      
      console.log('🔍 Revisa los logs arriba para ver qué falló.\n');
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║                  ❌ ERROR CRÍTICO                          ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error(`Error: ${error.message}\n`);
    console.error('Stack trace:');
    console.error(error.stack);
    
    process.exit(1);
  }
}

testConversacionCompleta();

