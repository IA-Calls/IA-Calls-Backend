/**
 * Test simple para WhatsApp y monitoreo de llamadas
 */

require('dotenv').config();
const VonageWhatsAppService = require('../src/services/vonageWhatsAppService');

async function testWhatsApp() {
  console.log('🧪 ===== TEST DE WHATSAPP =====\n');

  try {
    // 1. Inicializar servicio
    console.log('📱 1. Inicializando VonageWhatsAppService...');
    const whatsappService = new VonageWhatsAppService();
    console.log(`✅ Servicio inicializado`);
    console.log(`   API Key: ${whatsappService.apiKey}`);
    console.log(`   From Number: ${whatsappService.fromNumber}\n`);

    // 2. Preparar datos de prueba
    console.log('📋 2. Preparando datos de prueba...');
    const testPhone = process.env.TEST_PHONE_NUMBER || '573138539155';
    const clientName = 'Alejandro';
    console.log(`   Número: ${testPhone}`);
    console.log(`   Nombre: ${clientName}\n`);

    // 3. Crear mensaje de prueba
    console.log('📝 3. Creando mensaje...');
    const message = `¡Hola ${clientName}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls - Mensaje de Prueba*`;
    
    console.log('Mensaje creado:\n');
    console.log(message);
    console.log('\n');

    // 4. Enviar mensaje
    if (process.env.ENABLE_REAL_SEND === 'true') {
      console.log('📤 4. Enviando mensaje real...');
      const result = await whatsappService.sendMessage(testPhone, message, clientName);
      
      console.log('\n📨 Resultado del envío:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ ¡Mensaje enviado exitosamente!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Status: ${result.status}`);
      } else {
        console.log('\n❌ Error al enviar mensaje:');
        console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
        console.log(`   Status Code: ${result.statusCode}`);
      }
    } else {
      console.log('💡 4. Modo de prueba (sin envío real)');
      console.log('   Para enviar mensajes reales:');
      console.log('   1. Agrega ENABLE_REAL_SEND=true al archivo .env');
      console.log('   2. Agrega TEST_PHONE_NUMBER=tu_numero al archivo .env');
    }

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }

  console.log('\n🧪 ===== FIN DEL TEST =====');
}

// Ejecutar test
testWhatsApp();

