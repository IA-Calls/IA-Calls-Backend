/**
 * Test de Debug del WebSocket
 * Para ver exactamente qué mensajes recibe el WebSocket
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NUMERO_PRUEBA = '+573138539155';
const AGENT_ID = process.env.DEFAULT_AGENT_ID || 'agent_4701k8fcsvhaes5s1h6tw894g98s';

console.log('\n🔍 ===== DEBUG WEBSOCKET =====\n');

async function debugWebSocket() {
  try {
    const elevenlabsWebSocketService = require('../src/services/elevenlabsWebSocketService');
    
    console.log('1️⃣ Conectando WebSocket...\n');
    
    const wsResult = await elevenlabsWebSocketService.startConversation(
      AGENT_ID,
      NUMERO_PRUEBA,
      'Alejandro'
    );
    
    if (!wsResult.success) {
      throw new Error(`Error conectando: ${wsResult.error}`);
    }
    
    console.log(`✅ WebSocket conectado`);
    console.log(`   Conversation ID: ${wsResult.conversationId}`);
    console.log(`   Agent ID: ${wsResult.agentId}\n`);
    
    console.log('2️⃣ Enviando mensaje de prueba...\n');
    console.log('   Mensaje: "¿Quién eres?"\n');
    
    try {
      const response = await elevenlabsWebSocketService.sendMessage(
        NUMERO_PRUEBA,
        '¿Quién eres?'
      );
      
      if (response.success) {
        console.log('\n✅ RESPUESTA RECIBIDA:');
        console.log(`   "${response.response}"\n`);
      } else {
        console.log(`\n❌ Error: ${response.error}\n`);
      }
    } catch (error) {
      console.error(`\n❌ Excepción: ${error.message}\n`);
    }
    
    console.log('3️⃣ Cerrando conexión...\n');
    elevenlabsWebSocketService.closeConnection(NUMERO_PRUEBA);
    console.log('✅ Conexión cerrada\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugWebSocket();


