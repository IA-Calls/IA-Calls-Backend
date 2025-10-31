/**
 * Test de WhatsApp sin llamada previa
 * Simula un mensaje de WhatsApp de un usuario que NO tuvo llamada
 * El sistema debería crear una conversación nueva con el agente por defecto
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n📱 ===== TEST WHATSAPP SIN LLAMADA PREVIA =====\n');

async function testWhatsAppSinLlamada() {
  try {
    const { query } = require('../src/config/database');
    
    const testPhone = '+573138539155';
    const testMessage = 'Hola, quiero información sobre sus servicios';
    
    console.log('📋 Configuración del test:');
    console.log(`   Teléfono: ${testPhone}`);
    console.log(`   Mensaje: "${testMessage}"`);
    console.log(`   Agente por defecto: ${process.env.DEFAULT_AGENT_ID || 'agent_4701k8fcsvhaes5s1h6tw894g98s'}\n`);
    
    // 1. Limpiar conversaciones previas de este número
    console.log('1️⃣ Limpiando conversaciones previas...');
    
    await query(
      `DELETE FROM conversation_messages 
       WHERE conversation_id IN (
         SELECT id FROM conversation_state WHERE phone_number = $1
       )`,
      [testPhone]
    );
    
    await query(
      `DELETE FROM conversation_state WHERE phone_number = $1`,
      [testPhone]
    );
    
    console.log('   ✅ Base de datos limpia\n');
    
    // 2. Cargar el servicio de conversación
    console.log('2️⃣ Cargando servicio de conversación...');
    
    const ConversationService = require('../src/services/conversationService');
    const conversationService = new ConversationService();
    
    console.log('   ✅ Servicio cargado\n');
    
    // 3. Simular mensaje entrante (como viene de Twilio)
    console.log('3️⃣ Simulando mensaje entrante de WhatsApp...\n');
    
    const result = await conversationService.handleIncomingWhatsAppMessage(
      `whatsapp:${testPhone}`,
      testMessage,
      'TEST_MSG_' + Date.now()
    );
    
    console.log('\n📊 RESULTADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.success) {
      console.log('✅ ¡ÉXITO! El sistema procesó el mensaje correctamente\n');
      
      // 4. Verificar en BD
      console.log('4️⃣ Verificando en base de datos...\n');
      
      const dbResult = await query(
        `SELECT * FROM conversation_state 
         WHERE phone_number = $1 
         ORDER BY started_at DESC 
         LIMIT 1`,
        [testPhone]
      );
      
      if (dbResult.rows.length > 0) {
        const conversation = dbResult.rows[0];
        
        console.log('✅ CONVERSACIÓN CREADA:');
        console.log(`   ID: ${conversation.id}`);
        console.log(`   Teléfono: ${conversation.phone_number}`);
        console.log(`   Cliente: ${conversation.client_name}`);
        console.log(`   Agente ID: ${conversation.agent_id}`);
        console.log(`   Conversation ID: ${conversation.elevenlabs_conversation_id}`);
        console.log(`   Estado: ${conversation.status}`);
        console.log('');
        
        // Ver mensajes
        const messages = await query(
          `SELECT * FROM conversation_messages 
           WHERE conversation_id = $1 
           ORDER BY sent_at ASC`,
          [conversation.id]
        );
        
        if (messages.rows.length > 0) {
          console.log(`✅ ${messages.rows.length} MENSAJE(S) GUARDADO(S):`);
          messages.rows.forEach((msg, i) => {
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
        
        console.log('🎉 ===== TEST COMPLETADO EXITOSAMENTE =====\n');
        console.log('📱 Ahora puedes:');
        console.log('   1. Revisar tu WhatsApp para ver la respuesta');
        console.log('   2. Responder para continuar la conversación');
        console.log('   3. El agente IA seguirá respondiendo automáticamente\n');
        
      } else {
        console.log('⚠️  No se encontró conversación en BD');
        console.log('   Pero el mensaje se procesó correctamente\n');
      }
      
      process.exit(0);
      
    } else {
      console.log('❌ ERROR:');
      console.log(`   ${result.error}\n`);
      
      if (result.details) {
        console.log('📋 Detalles:');
        console.log(JSON.stringify(result.details, null, 2));
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error crítico:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testWhatsAppSinLlamada();

