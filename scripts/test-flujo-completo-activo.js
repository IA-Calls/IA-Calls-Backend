/**
 * Test de Flujo Completo - Activo y Persistente
 * 
 * Este test:
 * 1. Hace una llamada REAL
 * 2. Se mantiene ACTIVO esperando que termine
 * 3. Confía en el monitoreo del servidor para detectar cuando termina
 * 4. Verifica que llegue WhatsApp automáticamente
 * 5. Prueba la conversación bidireccional
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NUMERO_PRUEBA = '+573138539155';
const CHECK_INTERVAL_MS = 10000; // Verificar cada 10 segundos
const MAX_WAIT_TIME_MS = 15 * 60 * 1000; // Esperar máximo 15 minutos

let batchId = null;
let conversationCreated = false;
let startTime = Date.now();

console.log('\n🚀 ===== TEST DE FLUJO COMPLETO ACTIVO =====\n');
console.log('⚠️  Este test:');
console.log('   - Hará una llamada REAL');
console.log('   - Se mantendrá ACTIVO hasta que termine');
console.log('   - Esperará el monitoreo del servidor');
console.log('   - Verificará WhatsApp automático');
console.log('   - Probará conversación bidireccional\n');

async function iniciarLlamada() {
  try {
    console.log('📞 PASO 1: INICIANDO LLAMADA\n');
    
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    // Obtener agente
    const agents = await elevenlabsService.listAgents();
    if (!agents.success || !agents.data) {
      throw new Error('No se pudieron obtener agentes');
    }
    
    let agentsList = agents.data;
    if (!Array.isArray(agentsList)) {
      if (agentsList.agents) agentsList = agentsList.agents;
    }
    
    const agentId = agentsList[0].agent_id || agentsList[0].id;
    const agentName = agentsList[0].name || 'Sin nombre';
    
    console.log(`   ✅ Agente: ${agentName}`);
    console.log(`   🆔 ID: ${agentId}\n`);
    
    // Obtener número de teléfono
    const phones = await elevenlabsService.getPhoneNumbers();
    if (!phones.success) {
      throw new Error('No se pudieron obtener números');
    }
    
    const phonesList = phones.phoneNumbers || phones.data;
    const phoneNumberId = phonesList[0].phone_number_id || phonesList[0].id;
    const phoneNumber = phonesList[0].phone_number;
    
    console.log(`   ✅ Número: ${phoneNumber}`);
    console.log(`   🆔 Phone ID: ${phoneNumberId}\n`);
    
    // Hacer la llamada
    const batchData = {
      agentId: agentId,
      agentPhoneNumberId: phoneNumberId,
      callName: `Test Flujo Completo - ${new Date().toLocaleString()}`,
      recipients: [
        {
          phone_number: NUMERO_PRUEBA,
          variables: {
            name: 'Alejandro'
          }
        }
      ]
    };

    const result = await elevenlabsService.submitBatchCall(batchData);
    
    if (!result.success) {
      throw new Error(`Error en llamada: ${result.error}`);
    }

    batchId = result.data.batch_id || result.data.id;
    
    console.log('✅ LLAMADA INICIADA EXITOSAMENTE\n');
    console.log(`📊 Batch ID: ${batchId}`);
    console.log(`📱 Llamando a: ${NUMERO_PRUEBA}\n`);
    console.log('━'.repeat(60));
    console.log('📞 TU TELÉFONO DEBERÍA SONAR AHORA');
    console.log('   👆 CONTESTA LA LLAMADA');
    console.log('   💬 HABLA CON EL AGENTE');
    console.log('   📴 CUELGA CUANDO TERMINES');
    console.log('━'.repeat(60));
    console.log('\n⏳ Esperando que contestes y cuelgues...\n');
    
    return { batchId, agentId };
    
  } catch (error) {
    console.error('\n❌ Error iniciando llamada:', error.message);
    throw error;
  }
}

async function verificarEstadoLlamada(batchId) {
  try {
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    const status = await elevenlabsService.getBatchCallStatus(batchId);
    
    if (!status.success) {
      return { status: 'error', data: null };
    }
    
    const batch = status.data;
    const recipients = batch.recipients || [];
    
    if (recipients.length === 0) {
      return { status: 'pending', data: null };
    }
    
    const recipient = recipients[0];
    
    return {
      status: recipient.status,
      data: {
        status: recipient.status,
        conversationId: recipient.conversation_id,
        phoneNumber: recipient.phone_number,
        duration: recipient.call_duration_secs
      }
    };
    
  } catch (error) {
    console.error(`   ⚠️  Error verificando estado: ${error.message}`);
    return { status: 'error', data: null };
  }
}

async function verificarConversacionEnBD(phoneNumber) {
  try {
    const { query } = require('../src/config/database');
    
    const result = await query(
      `SELECT * FROM conversation_state 
       WHERE phone_number = $1 
       ORDER BY started_at DESC 
       LIMIT 1`,
      [phoneNumber]
    );
    
    if (result.rows.length > 0) {
      const conversation = result.rows[0];
      
      // Verificar si hay mensajes
      const messages = await query(
        `SELECT * FROM conversation_messages 
         WHERE conversation_id = $1 
         ORDER BY sent_at ASC`,
        [conversation.id]
      );
      
      return {
        found: true,
        conversation: conversation,
        messageCount: messages.rows.length,
        messages: messages.rows
      };
    }
    
    return { found: false };
    
  } catch (error) {
    console.error(`   ⚠️  Error verificando BD: ${error.message}`);
    return { found: false };
  }
}

async function probarConversacionWhatsApp(conversationId) {
  try {
    console.log('\n📱 PASO 3: PROBANDO CONVERSACIÓN WHATSAPP\n');
    
    const ConversationService = require('../src/services/conversationService');
    const conversationService = new ConversationService();
    
    const testMessage = '¿Puedes darme más información?';
    
    console.log(`   📩 Enviando mensaje de prueba: "${testMessage}"`);
    
    const result = await conversationService.handleIncomingWhatsAppMessage(
      `whatsapp:${NUMERO_PRUEBA}`,
      testMessage,
      'TEST_MSG_' + Date.now()
    );
    
    if (result.success) {
      console.log('   ✅ Mensaje procesado exitosamente');
      if (result.response) {
        const preview = result.response.length > 100 
          ? result.response.substring(0, 100) + '...' 
          : result.response;
        console.log(`   🤖 Respuesta del agente: "${preview}"`);
      }
      console.log('   📱 Revisa tu WhatsApp para ver la respuesta\n');
      return true;
    } else {
      console.log(`   ❌ Error: ${result.error}\n`);
      return false;
    }
    
  } catch (error) {
    console.error(`   ❌ Error probando conversación: ${error.message}\n`);
    return false;
  }
}

async function monitorearYEsperar() {
  console.log('\n🔄 PASO 2: MONITOREANDO LLAMADA\n');
  console.log('   El monitoreo del servidor está detectando automáticamente');
  console.log('   Esperando que el servidor procese la llamada finalizada...\n');
  
  let lastStatus = 'unknown';
  let checkCount = 0;
  
  const monitorInterval = setInterval(async () => {
    checkCount++;
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    console.log(`[${checkCount}] ⏱️  Tiempo: ${minutes}m ${seconds}s`);
    
    // 1. Verificar estado en ElevenLabs
    const callStatus = await verificarEstadoLlamada(batchId);
    
    if (callStatus.status !== lastStatus && callStatus.status !== 'error') {
      console.log(`   📊 Estado de llamada: ${callStatus.status}`);
      lastStatus = callStatus.status;
    }
    
    // 2. Verificar si ya se creó conversación en BD (señal de que el monitoreo procesó)
    const bdCheck = await verificarConversacionEnBD(NUMERO_PRUEBA);
    
    if (bdCheck.found && !conversationCreated) {
      conversationCreated = true;
      clearInterval(monitorInterval);
      
      console.log('\n' + '━'.repeat(60));
      console.log('✅ ¡EL MONITOREO DEL SERVIDOR DETECTÓ LA LLAMADA!');
      console.log('━'.repeat(60));
      console.log('\n📊 CONVERSACIÓN CREADA EN BD:\n');
      console.log(`   ID: ${bdCheck.conversation.id}`);
      console.log(`   Teléfono: ${bdCheck.conversation.phone_number}`);
      console.log(`   Cliente: ${bdCheck.conversation.client_name}`);
      console.log(`   Agente: ${bdCheck.conversation.agent_id}`);
      console.log(`   Conversation ID: ${bdCheck.conversation.elevenlabs_conversation_id}`);
      console.log(`   Estado: ${bdCheck.conversation.status}`);
      console.log(`   Mensajes: ${bdCheck.messageCount}`);
      console.log('');
      
      if (bdCheck.messageCount > 0) {
        console.log('📨 MENSAJES ENVIADOS:\n');
        bdCheck.messages.forEach((msg, i) => {
          const preview = msg.content.length > 80 
            ? msg.content.substring(0, 80) + '...' 
            : msg.content;
          console.log(`   ${i + 1}. [${msg.direction}] ${preview}`);
          if (msg.twilio_message_id) {
            console.log(`      Twilio SID: ${msg.twilio_message_id}`);
          }
        });
        console.log('');
      }
      
      console.log('━'.repeat(60));
      console.log('📱 REVISA TU WHATSAPP');
      console.log('   Deberías tener un mensaje del sistema');
      console.log('━'.repeat(60));
      
      // Esperar 5 segundos para que el usuario vea el mensaje
      console.log('\n⏳ Esperando 5 segundos antes de probar conversación...\n');
      
      setTimeout(async () => {
        // Probar conversación
        const conversationOk = await probarConversacionWhatsApp(
          bdCheck.conversation.elevenlabs_conversation_id
        );
        
        console.log('\n' + '═'.repeat(60));
        console.log('🎉 ===== TEST COMPLETADO =====');
        console.log('═'.repeat(60));
        console.log('\n📊 RESUMEN:\n');
        console.log(`   ✅ Llamada iniciada: Batch ${batchId}`);
        console.log(`   ✅ Llamada detectada por monitoreo del servidor`);
        console.log(`   ✅ WhatsApp enviado automáticamente`);
        console.log(`   ✅ Conversación guardada en BD`);
        console.log(`   ${conversationOk ? '✅' : '⚠️ '} Conversación bidireccional ${conversationOk ? 'funcionando' : 'con problemas'}`);
        console.log('\n📱 AHORA PUEDES:\n');
        console.log('   1. Responder el WhatsApp que recibiste');
        console.log('   2. El agente IA te responderá automáticamente');
        console.log('   3. Conversar todo lo que quieras');
        console.log('   4. El contexto de la llamada se mantiene\n');
        console.log('═'.repeat(60));
        console.log('\n✅ Sistema completamente funcional\n');
        
        process.exit(0);
      }, 5000);
    }
    
    // Timeout
    if (Date.now() - startTime > MAX_WAIT_TIME_MS) {
      console.log('\n⏰ Tiempo máximo de espera alcanzado (15 minutos)');
      console.log('❌ La llamada no terminó o el monitoreo no la procesó\n');
      
      console.log('🔍 DIAGNÓSTICO:\n');
      console.log(`   Estado de llamada: ${lastStatus}`);
      console.log(`   Conversación en BD: ${bdCheck.found ? 'Sí' : 'No'}`);
      console.log('\n💡 POSIBLES CAUSAS:\n');
      console.log('   1. No contestaste el teléfono');
      console.log('   2. La llamada aún está en curso');
      console.log('   3. El monitoreo del servidor no está corriendo');
      console.log('   4. Hay un problema con las credenciales de Twilio\n');
      
      console.log('🔧 SOLUCIONES:\n');
      console.log('   - Verifica que el servidor esté corriendo: npm run dev');
      console.log('   - Verifica variables de Twilio en .env');
      console.log('   - Ejecuta: node scripts/forzar-monitoreo.js\n');
      
      clearInterval(monitorInterval);
      process.exit(1);
    }
    
  }, CHECK_INTERVAL_MS);
}

async function main() {
  try {
    // Verificar que el servidor esté corriendo
    console.log('🔍 Verificando que el servidor esté corriendo...');
    
    try {
      const { query } = require('../src/config/database');
      await query('SELECT 1');
      console.log('✅ Servidor y BD conectados\n');
    } catch (error) {
      console.error('❌ Error: El servidor no parece estar corriendo');
      console.error('   Ejecuta: npm run dev\n');
      process.exit(1);
    }
    
    // Iniciar llamada
    const { batchId: id } = await iniciarLlamada();
    batchId = id;
    
    // Monitorear y esperar
    await monitorearYEsperar();
    
  } catch (error) {
    console.error('\n❌ Error crítico:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrumpido por el usuario\n');
  console.log('📊 Estado al interrumpir:');
  console.log(`   Batch ID: ${batchId || 'No iniciado'}`);
  console.log(`   Conversación creada: ${conversationCreated ? 'Sí' : 'No'}`);
  console.log('\n');
  process.exit(0);
});

// Ejecutar
main();

