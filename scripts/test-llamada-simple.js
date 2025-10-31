/**
 * Test Simple - Solo Hacer Llamada
 * (Sin verificaciones extra)
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NUMERO_PRUEBA = '+573138539155';

console.log('\n📞 ===== HACIENDO LLAMADA DE PRUEBA =====\n');
console.log(`📱 Número: ${NUMERO_PRUEBA}`);
console.log(`👤 Nombre: Alejandro\n`);

async function hacerLlamada() {
  try {
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    console.log('1️⃣ Obteniendo agentes...');
    const agents = await elevenlabsService.listAgents();
    
    if (!agents.success || !agents.data) {
      console.error('❌ Error obteniendo agentes:', agents.error || 'Sin datos');
      process.exit(1);
    }
    
    // Manejar diferentes formatos de respuesta
    let agentsList = agents.data;
    if (!Array.isArray(agentsList)) {
      if (agentsList.agents) {
        agentsList = agentsList.agents;
      } else {
        console.error('❌ Formato de respuesta de agentes no reconocido');
        console.error('   Datos recibidos:', agentsList);
        process.exit(1);
      }
    }
    
    if (agentsList.length === 0) {
      console.error('❌ No hay agentes disponibles');
      console.error('   Crea un agente en: https://elevenlabs.io/app/conversational-ai');
      process.exit(1);
    }
    
    const agentId = agentsList[0].agent_id || agentsList[0].id;
    const agentName = agentsList[0].name || 'Sin nombre';
    console.log(`   ✅ Agente: ${agentId}`);
    console.log(`   📝 Nombre: ${agentName}\n`);
    
    console.log('2️⃣ Obteniendo números de teléfono...');
    const phones = await elevenlabsService.getPhoneNumbers();
    
    if (!phones.success) {
      console.error('❌ Error obteniendo números:', phones.error || 'Sin datos');
      process.exit(1);
    }
    
    // Manejar diferentes formatos de respuesta
    let phonesList = phones.phoneNumbers || phones.data;
    
    if (!phonesList || phonesList.length === 0) {
      console.error('❌ No hay números configurados');
      console.error('   Configura un número en: https://elevenlabs.io/app/conversational-ai');
      process.exit(1);
    }
    
    const phoneNumberId = phonesList[0].phone_number_id || phonesList[0].id;
    const phoneNumber = phonesList[0].phone_number || phonesList[0].number || 'N/A';
    console.log(`   ✅ Phone ID: ${phoneNumberId}`);
    console.log(`   📞 Número: ${phoneNumber}\n`);
    
    console.log('3️⃣ Iniciando llamada...\n');
    
    const batchData = {
      agentId: agentId,  // camelCase, no snake_case
      agentPhoneNumberId: phoneNumberId,  // camelCase, no snake_case
      callName: `Test - ${new Date().toLocaleString()}`,  // camelCase
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

    const batchId = result.data.batch_id || result.data.id;
    
    console.log('✅ ¡LLAMADA INICIADA EXITOSAMENTE!\n');
    console.log(`📊 Batch ID: ${batchId}`);
    console.log(`📱 Llamando a: ${NUMERO_PRUEBA}\n`);
    console.log('📞 Tu teléfono debería sonar en unos segundos...');
    console.log('💬 Habla con el agente y luego cuelga\n');
    console.log('⚡ El sistema detectará automáticamente cuando termines');
    console.log('📲 En ~30 segundos recibirás un WhatsApp automáticamente\n');
    console.log('🔍 Para ver el estado de la llamada, revisa los logs del servidor');
    console.log('   Deberías ver: "🔍 Batch: completed | Recipients: 1"\n');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('⚠️  Este test hará una llamada REAL');
console.log('   Contesta cuando suene el teléfono\n');

setTimeout(() => {
  hacerLlamada();
}, 3000);

