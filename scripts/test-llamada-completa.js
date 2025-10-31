/**
 * Test Completo - Llamada + WhatsApp
 * 
 * Este script:
 * 1. Hace una llamada REAL con ElevenLabs
 * 2. Monitorea hasta que termine
 * 3. Verifica que se envíe el WhatsApp
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuración
const NUMERO_PRUEBA = '+573138539155';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

console.log('\n📞 ===== TEST DE LLAMADA COMPLETA + WHATSAPP =====\n');

async function testLlamadaCompleta() {
  try {
    console.log('🔍 Paso 1: Verificando que el servidor esté corriendo...');
    
    // Verificar servidor
    try {
      const health = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      console.log('✅ Servidor corriendo\n');
    } catch (error) {
      console.error('❌ El servidor no está corriendo');
      console.error('   Ejecuta: npm run dev\n');
      process.exit(1);
    }

    console.log('🔍 Paso 2: Verificando tablas de BD...');
    
    // Verificar tablas
    const { query } = require('../src/config/database');
    
    try {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'conversation_state'
        );
      `);

      if (!result.rows[0].exists) {
        console.error('❌ Tabla conversation_state NO existe');
        console.error('   Ejecuta: psql -d iacalls_db -f database/add_conversation_tables.sql\n');
        process.exit(1);
      }
      
      console.log('✅ Tablas de BD existen\n');
    } catch (error) {
      console.error('❌ Error verificando BD:', error.message);
      process.exit(1);
    }

    console.log('🔍 Paso 3: Obteniendo agentes disponibles...');
    
    // Obtener agentes
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    let agentId;
    try {
      const agents = await elevenlabsService.listAgents();
      
      if (!agents.success || !agents.data || agents.data.length === 0) {
        console.error('❌ No hay agentes disponibles');
        console.error('   Crea un agente en ElevenLabs primero\n');
        process.exit(1);
      }
      
      agentId = agents.data[0].agent_id;
      console.log(`✅ Agente encontrado: ${agentId}`);
      console.log(`   Nombre: ${agents.data[0].name || 'Sin nombre'}\n`);
    } catch (error) {
      console.error('❌ Error obteniendo agentes:', error.message);
      process.exit(1);
    }

    console.log('🔍 Paso 4: Obteniendo números de teléfono...');
    
    // Obtener phone numbers
    let phoneNumberId;
    try {
      const phones = await elevenlabsService.getPhoneNumbers();
      
      if (!phones.success || !phones.data || phones.data.length === 0) {
        console.error('❌ No hay números de teléfono configurados');
        console.error('   Configura un número en ElevenLabs primero\n');
        process.exit(1);
      }
      
      phoneNumberId = phones.data[0].phone_number_id;
      console.log(`✅ Número encontrado: ${phoneNumberId}`);
      console.log(`   Número: ${phones.data[0].phone_number || 'N/A'}\n`);
    } catch (error) {
      console.error('❌ Error obteniendo números:', error.message);
      process.exit(1);
    }

    console.log('📞 Paso 5: Iniciando llamada...');
    console.log(`   Número destino: ${NUMERO_PRUEBA}`);
    console.log(`   Agente: ${agentId}`);
    console.log(`   Phone ID: ${phoneNumberId}\n`);

    // Hacer la llamada
    let batchId;
    try {
      const batchData = {
        agent_id: agentId,
        phone_number_id: phoneNumberId,
        call_name: `Test Automático - ${new Date().toLocaleString()}`,
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
        console.error('❌ Error iniciando llamada:', result.error);
        process.exit(1);
      }

      batchId = result.data.batch_id || result.data.id;
      console.log('✅ Llamada iniciada exitosamente');
      console.log(`   Batch ID: ${batchId}\n`);
    } catch (error) {
      console.error('❌ Error iniciando llamada:', error.message);
      console.error(error.stack);
      process.exit(1);
    }

    console.log('⏳ Paso 6: Esperando que la llamada termine...');
    console.log('   (Esto puede tomar varios minutos)');
    console.log('   Contesta el teléfono y termina la llamada\n');

    // Monitorear la llamada
    let callFinished = false;
    let attempts = 0;
    const maxAttempts = 60; // 15 minutos máximo

    while (!callFinished && attempts < maxAttempts) {
      attempts++;
      
      try {
        const status = await elevenlabsService.getBatchCallStatus(batchId);
        
        if (status.success && status.data) {
          const batchStatus = status.data.status;
          const recipients = status.data.recipients || [];
          
          console.log(`   [${attempts}] Batch: ${batchStatus} | Recipients: ${recipients.length}`);
          
          if (recipients.length > 0) {
            const recipient = recipients[0];
            console.log(`        → Recipient status: ${recipient.status}`);
            
            if (recipient.status === 'completed' || 
                recipient.status === 'finished' || 
                recipient.status === 'ended') {
              callFinished = true;
              console.log('\n✅ ¡Llamada finalizada!\n');
              
              // Guardar info para verificación
              global.testCallInfo = {
                batchId: batchId,
                phoneNumber: NUMERO_PRUEBA,
                conversationId: recipient.conversation_id,
                status: recipient.status
              };
              
              break;
            }
          }
        }
        
        // Esperar 15 segundos antes de verificar de nuevo
        await new Promise(resolve => setTimeout(resolve, 15000));
        
      } catch (error) {
        console.error(`   ❌ Error verificando estado: ${error.message}`);
      }
    }

    if (!callFinished) {
      console.error('\n❌ La llamada no terminó en el tiempo esperado');
      console.error('   Verifica que contestaste y colgaste\n');
      process.exit(1);
    }

    console.log('⏳ Paso 7: Esperando que el sistema detecte y envíe WhatsApp...');
    console.log('   (El monitoreo se ejecuta cada 15 segundos)\n');

    // Esperar a que el sistema procese (2 ciclos de monitoreo)
    await new Promise(resolve => setTimeout(resolve, 35000));

    console.log('🔍 Paso 8: Verificando que se envió el WhatsApp...\n');

    // Verificar en BD
    try {
      const result = await query(
        `SELECT * FROM conversation_state 
         WHERE phone_number = $1 
         ORDER BY started_at DESC 
         LIMIT 1`,
        [NUMERO_PRUEBA]
      );

      if (result.rows.length > 0) {
        const conversation = result.rows[0];
        console.log('✅ Conversación encontrada en BD:');
        console.log(`   ID: ${conversation.id}`);
        console.log(`   Teléfono: ${conversation.phone_number}`);
        console.log(`   Cliente: ${conversation.client_name}`);
        console.log(`   Conversation ID ElevenLabs: ${conversation.elevenlabs_conversation_id}`);
        console.log(`   Estado: ${conversation.status}`);
        console.log(`   Iniciada: ${conversation.started_at}\n`);

        // Verificar mensajes
        const messages = await query(
          `SELECT * FROM conversation_messages 
           WHERE conversation_id = $1 
           ORDER BY sent_at ASC`,
          [conversation.id]
        );

        if (messages.rows.length > 0) {
          console.log('✅ Mensajes enviados:');
          messages.rows.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.direction}] ${msg.content.substring(0, 80)}...`);
            console.log(`      Twilio SID: ${msg.twilio_message_id || 'N/A'}`);
          });
          console.log('');
        } else {
          console.log('⚠️  No hay mensajes en la BD todavía');
          console.log('   El mensaje podría estar en proceso de envío\n');
        }

        console.log('🎉 ===== TEST COMPLETADO EXITOSAMENTE =====\n');
        console.log('📱 Verifica tu WhatsApp, deberías tener un mensaje');
        console.log('💬 Responde el mensaje para probar la conversación bidireccional\n');
        
        process.exit(0);
      } else {
        console.log('⚠️  No se encontró conversación en BD');
        console.log('   Posibles causas:');
        console.log('   1. El monitoreo no detectó la llamada finalizada');
        console.log('   2. El servicio de monitoreo no está corriendo');
        console.log('   3. Hubo un error al enviar el WhatsApp\n');
        
        console.log('🔍 Revisa los logs del servidor para más detalles\n');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error verificando BD:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error crítico:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar test
console.log('⚠️  IMPORTANTE:');
console.log('   - Este test hará una llamada REAL');
console.log('   - Contesta el teléfono cuando suene');
console.log('   - Habla con el agente');
console.log('   - Cuelga para terminar');
console.log('   - El sistema enviará WhatsApp automáticamente\n');

console.log('Presiona Ctrl+C para cancelar o espera 5 segundos...\n');

setTimeout(() => {
  testLlamadaCompleta();
}, 5000);

