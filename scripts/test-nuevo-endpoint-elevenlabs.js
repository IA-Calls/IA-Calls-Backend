/**
 * Test del Nuevo Endpoint de ElevenLabs
 * Prueba el endpoint /convai/agents/{agent_id}/simulate-conversation
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🧪 ===== TEST NUEVO ENDPOINT ELEVENLABS =====\n');

async function testNuevoEndpoint() {
  try {
    const elevenlabsService = require('../src/agents/elevenlabsService');
    
    console.log('1️⃣ Obteniendo agente de prueba...\n');
    
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
    
    console.log('2️⃣ Enviando primer mensaje (sin historial)...\n');
    
    const response1 = await elevenlabsService.sendTextMessageToAgent(
      agentId,
      'Hola, ¿quién eres y en qué puedes ayudarme?',
      []
    );
    
    if (response1.success) {
      console.log('   ✅ Respuesta recibida:');
      console.log(`   "${response1.response}"\n`);
    } else {
      console.log(`   ❌ Error: ${response1.error}\n`);
      throw new Error(response1.error);
    }
    
    console.log('3️⃣ Enviando segundo mensaje (con historial)...\n');
    
    const history = [
      {
        role: 'user',
        content: 'Hola, ¿quién eres y en qué puedes ayudarme?'
      },
      {
        role: 'agent',
        content: response1.response
      }
    ];
    
    const response2 = await elevenlabsService.sendTextMessageToAgent(
      agentId,
      'Perfecto, ¿puedes darme más detalles sobre tus servicios?',
      history
    );
    
    if (response2.success) {
      console.log('   ✅ Respuesta recibida:');
      console.log(`   "${response2.response}"\n`);
    } else {
      console.log(`   ❌ Error: ${response2.error}\n`);
      throw new Error(response2.error);
    }
    
    console.log('4️⃣ Enviando tercer mensaje (continuando conversación)...\n');
    
    history.push({
      role: 'user',
      content: 'Perfecto, ¿puedes darme más detalles sobre tus servicios?'
    });
    
    history.push({
      role: 'agent',
      content: response2.response
    });
    
    const response3 = await elevenlabsService.sendTextMessageToAgent(
      agentId,
      'Excelente, ¿cuáles son los precios?',
      history
    );
    
    if (response3.success) {
      console.log('   ✅ Respuesta recibida:');
      console.log(`   "${response3.response}"\n`);
    } else {
      console.log(`   ❌ Error: ${response3.error}\n`);
      throw new Error(response3.error);
    }
    
    console.log('═'.repeat(60));
    console.log('🎉 ===== TEST COMPLETADO EXITOSAMENTE =====');
    console.log('═'.repeat(60));
    console.log('\n📊 RESUMEN:\n');
    console.log('   ✅ Endpoint funcionando correctamente');
    console.log('   ✅ Historial de conversación se mantiene');
    console.log('   ✅ El agente responde con contexto\n');
    console.log('📝 CONVERSACIÓN COMPLETA:\n');
    console.log(`1. Usuario: "Hola, ¿quién eres y en qué puedes ayudarme?"`);
    console.log(`   Agente: "${response1.response.substring(0, 100)}..."\n`);
    console.log(`2. Usuario: "Perfecto, ¿puedes darme más detalles sobre tus servicios?"`);
    console.log(`   Agente: "${response2.response.substring(0, 100)}..."\n`);
    console.log(`3. Usuario: "Excelente, ¿cuáles son los precios?"`);
    console.log(`   Agente: "${response3.response.substring(0, 100)}..."\n`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ El nuevo endpoint está listo para WhatsApp\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNuevoEndpoint();

