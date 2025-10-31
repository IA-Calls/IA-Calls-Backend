/**
 * Test Directo del Servicio de Conversación
 * Simula lo que debería pasar cuando termina una llamada
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🧪 ===== TEST DIRECTO DE CONVERSACIÓN =====\n');

async function testConversacion() {
  try {
    console.log('1️⃣ Cargando servicio de conversación...\n');
    
    const ConversationService = require('../src/services/conversationService');
    const conversationService = new ConversationService();
    
    console.log('✅ Servicio cargado\n');
    
    console.log('2️⃣ Simulando llamada finalizada...\n');
    
    // Simular el recipient como viene de ElevenLabs
    const recipient = {
      phone_number: '+573138539155',
      name: 'Alejandro',
      conversation_id: 'conv_9701k8rjfhjyef9s7vbqzdbpyypq',
      status: 'completed',
      call_duration_secs: 30
    };
    
    const batchData = {
      id: 'btcal_0101k8rjf5neff886g69ws7bws3t',
      agent_id: 'agent_4701k8fcsvhaes5s1h6tw894g98s',
      name: 'Test - Manual'
    };
    
    console.log('📋 Datos del recipient:');
    console.log(JSON.stringify(recipient, null, 2));
    console.log('');
    
    console.log('3️⃣ Llamando a handleCallCompleted...\n');
    
    const result = await conversationService.handleCallCompleted(recipient, batchData);
    
    console.log('📊 RESULTADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.success) {
      console.log('✅ ¡ÉXITO! El WhatsApp debería haberse enviado');
      console.log('📱 Revisa tu teléfono\n');
      
      // Verificar en BD
      console.log('4️⃣ Verificando en base de datos...\n');
      
      const { query } = require('../src/config/database');
      
      const dbResult = await query(
        `SELECT * FROM conversation_state 
         WHERE phone_number = $1 
         ORDER BY started_at DESC 
         LIMIT 1`,
        ['+573138539155']
      );
      
      if (dbResult.rows.length > 0) {
        console.log('✅ CONVERSACIÓN GUARDADA EN BD:');
        console.log(JSON.stringify(dbResult.rows[0], null, 2));
      } else {
        console.log('❌ NO se guardó en BD (aún con success: true)');
      }
      
    } else {
      console.log('❌ ERROR:');
      console.log(`   ${result.error}`);
      console.log('');
      
      if (result.details) {
        console.log('📋 Detalles:');
        console.log(JSON.stringify(result.details, null, 2));
      }
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Error crítico:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConversacion();

