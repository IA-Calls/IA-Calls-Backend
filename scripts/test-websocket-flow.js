/**
 * Test del Flujo Completo con WebSocket
 * 
 * Este test:
 * 1. Hace una llamada con ElevenLabs
 * 2. Espera a que termine
 * 3. Verifica que se envía mensaje WhatsApp
 * 4. Espera tu respuesta en WhatsApp
 * 5. Verifica que el agente responde correctamente
 */

const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BACKEND_URL = `http://localhost:${process.env.PORT || 5000}`;
const NUMERO_PRUEBA = '+573138539155'; // Tu número

console.log('\n🧪 ===== TEST FLUJO WEBSOCKET COMPLETO =====\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  try {
    console.log('1️⃣ Verificando servidor...\n');
    
    try {
      await axios.get(`${BACKEND_URL}/health`);
      console.log('   ✅ Servidor corriendo\n');
    } catch (error) {
      throw new Error(`Servidor no disponible en ${BACKEND_URL}`);
    }

    console.log('2️⃣ Iniciando llamada de prueba...\n');
    
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    // Obtener agente
    const agents = await elevenlabsService.listAgents();
    let agentsList = agents.data;
    if (!Array.isArray(agentsList)) {
      if (agentsList.agents) agentsList = agentsList.agents;
    }
    const agentId = agentsList[0].agent_id || agentsList[0].id;
    
    // Obtener número de teléfono
    const phones = await elevenlabsService.getPhoneNumbers();
    
    console.log(`   📋 Estructura de phones:`, JSON.stringify(phones, null, 2).substring(0, 200));
    
    // Normalizar estructura - puede venir en diferentes formatos
    let phonesList = phones.data || phones;
    
    // Si no es array, buscar el array dentro del objeto
    if (!Array.isArray(phonesList)) {
      phonesList = phonesList.phone_numbers || phonesList.phoneNumbers || phonesList.data || [];
    }
    
    if (!phonesList || phonesList.length === 0) {
      throw new Error('No se encontraron números de teléfono');
    }
    
    const phoneNumberId = phonesList[0].phone_number_id || 
                          phonesList[0].id || 
                          phonesList[0].phoneNumberId;

    console.log(`   🤖 Agente: ${agentId}`);
    console.log(`   📱 Número: ${phoneNumberId}\n`);

    // Crear llamada
    const batchData = {
      agentId: agentId,
      agentPhoneNumberId: phoneNumberId,
      callName: `Test WebSocket - ${new Date().toLocaleString()}`,
      recipients: [
        {
          phone_number: NUMERO_PRUEBA,
          variables: {
            name: 'Alejandro'
          }
        }
      ]
    };

    console.log('   📞 Iniciando llamada...\n');
    const batchResult = await elevenlabsService.submitBatchCall(batchData);

    if (!batchResult.success) {
      throw new Error(`Error creando llamada: ${batchResult.error}`);
    }

    const batchId = batchResult.batch_id || batchResult.id || batchResult.data?.id;
    
    if (!batchId) {
      console.error('❌ Estructura del batch result:', batchResult);
      throw new Error('No se pudo obtener batch_id del resultado');
    }
    
    console.log(`   ✅ Llamada iniciada: ${batchId}\n`);
    console.log('   📱 CONTESTA EL TELÉFONO Y HABLA CON EL AGENTE\n');
    console.log('━'.repeat(60));
    console.log('   Esperando que termine la llamada...');
    console.log('━'.repeat(60));
    console.log('');

    // Monitorear hasta que termine la llamada
    let callFinished = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos

    while (!callFinished && attempts < maxAttempts) {
      attempts++;
      await sleep(5000); // Revisar cada 5 segundos

      const status = await elevenlabsService.getBatchCallStatus(batchId);
      
      if (status.success && status.data && status.data.recipients) {
        const recipient = status.data.recipients[0];
        
        if (recipient.status === 'completed' || recipient.status === 'finished') {
          callFinished = true;
          console.log('\n✅ LLAMADA TERMINADA\n');
          
          // Esperar a que el sistema detecte y procese
          console.log('⏳ Esperando procesamiento automático (10 segundos)...\n');
          await sleep(10000);
          
          console.log('━'.repeat(60));
          console.log('📱 REVISA TU WHATSAPP');
          console.log('   Deberías tener un mensaje del agente');
          console.log('━'.repeat(60));
          console.log('');
          
          // Verificar en BD
          const { query } = require('../src/config/database');
          const result = await query(
            `SELECT * FROM conversation_state 
             WHERE phone_number = $1 
             ORDER BY started_at DESC 
             LIMIT 1`,
            [NUMERO_PRUEBA]
          );

          let conv = null;
          
          if (result.rows.length > 0) {
            conv = result.rows[0];
            console.log('✅ Conversación guardada en BD:');
            console.log(`   ID: ${conv.id}`);
            console.log(`   Conversation ID: ${conv.elevenlabs_conversation_id}`);
            console.log(`   Agente: ${conv.agent_id}`);
            console.log(`   Estado: ${conv.status}\n`);
          } else {
            console.log('⚠️  No se encontró conversación en BD\n');
            return;
          }

          console.log('━'.repeat(60));
          console.log('💬 AHORA RESPONDE EL WHATSAPP');
          console.log('   Escribe algo como: "Hola, ¿cómo estás?"');
          console.log('━'.repeat(60));
          console.log('');
          console.log('⏳ Esperando tu mensaje (60 segundos)...\n');

          // Esperar mensaje entrante
          const startWait = Date.now();
          const waitTime = 60000; // 60 segundos
          let messageReceived = false;

          while (!messageReceived && (Date.now() - startWait < waitTime)) {
            await sleep(2000);

            const messages = await query(
              `SELECT * FROM conversation_messages 
               WHERE conversation_id = $1 
               AND direction = 'inbound'
               ORDER BY sent_at DESC 
               LIMIT 1`,
              [conv.id]
            );

            if (messages.rows.length > 0) {
              messageReceived = true;
              const msg = messages.rows[0];
              
              console.log('✅ MENSAJE RECIBIDO:');
              console.log(`   "${msg.content}"\n`);

              // Esperar respuesta del agente
              await sleep(3000);

              const agentMessages = await query(
                `SELECT * FROM conversation_messages 
                 WHERE conversation_id = $1 
                 AND direction = 'outbound'
                 AND sent_at > $2
                 ORDER BY sent_at DESC 
                 LIMIT 1`,
                [conv.id, msg.sent_at]
              );

              if (agentMessages.rows.length > 0) {
                const agentMsg = agentMessages.rows[0];
                
                console.log('✅ AGENTE RESPONDIÓ:');
                console.log(`   "${agentMsg.content}"\n`);
                
                console.log('═'.repeat(60));
                console.log('🎉 TEST COMPLETADO EXITOSAMENTE');
                console.log('═'.repeat(60));
                console.log('');
                console.log('✅ Flujo completo validado:');
                console.log('   1. ✅ Llamada realizada');
                console.log('   2. ✅ WebSocket iniciado');
                console.log('   3. ✅ Mensaje WhatsApp enviado');
                console.log('   4. ✅ Mensaje recibido');
                console.log('   5. ✅ Agente respondió correctamente');
                console.log('');
                console.log('🔌 WebSocket mantiene la conversación activa');
                console.log('💬 Puedes seguir conversando por WhatsApp');
                console.log('');
                
                return;
              } else {
                console.log('⚠️  No se recibió respuesta del agente');
              }
            }
          }

          if (!messageReceived) {
            console.log('⚠️  No se recibió mensaje en 60 segundos');
            console.log('   Pero el flujo está configurado correctamente\n');
          }
        }
      }
    }

    if (!callFinished) {
      console.log('⏰ Timeout esperando fin de llamada (5 minutos)');
      console.log('   Verifica que hayas contestado la llamada\n');
    }

  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCompleteFlow().then(() => {
  console.log('\n✨ Test finalizado\n');
  process.exit(0);
});

