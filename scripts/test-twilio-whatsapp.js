/**
 * Test de WhatsApp con Twilio
 */

require('dotenv').config();
const TwilioWhatsAppService = require('../src/services/twilioWhatsAppService');

async function testTwilioWhatsApp() {
  console.log('🚀 ===== TEST DE WHATSAPP CON TWILIO =====\n');

  try {
    // 1. Inicializar servicio
    console.log('📱 1. Inicializando TwilioWhatsAppService...');
    const whatsappService = new TwilioWhatsAppService();
    console.log(`   Account SID: ${whatsappService.accountSid.substring(0, 10)}...`);
    console.log(`   From Number: ${whatsappService.fromNumber}\n`);

    // 2. Preparar datos de prueba
    console.log('📋 2. Preparando datos de prueba...');
    const testPhone = '573138539155'; // Tu número
    const clientName = 'Alejandro';
    console.log(`   Número: ${testPhone}`);
    console.log(`   Nombre: ${clientName}\n`);

    // 3. Crear mensaje de prueba
    console.log('📝 3. Creando mensaje...');
    const message = `¡Hola ${clientName}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls - Test con Twilio*
Fecha: ${new Date().toLocaleString('es-ES')}`;
    
    console.log('Mensaje creado:\n');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
    console.log('\n');

    // 4. Enviar mensaje
    console.log('📤 4. Enviando mensaje real con Twilio...\n');
    
    const startTime = Date.now();
    const result = await whatsappService.sendMessage(testPhone, message, clientName);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  Tiempo de respuesta: ${duration}ms\n`);

    // 5. Mostrar resultado
    console.log('📨 RESULTADO DEL ENVÍO:');
    console.log('═'.repeat(50));
    
    if (result.success) {
      console.log('✅ ¡MENSAJE ENVIADO EXITOSAMENTE!\n');
      console.log(`   Message SID: ${result.messageId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   To: ${result.data.to}`);
      console.log(`   From: ${result.data.from}`);
      console.log(`   Date Created: ${result.data.dateCreated}`);
      console.log(`   Segments: ${result.data.numSegments}`);
      if (result.data.price) {
        console.log(`   Price: ${result.data.price} ${result.data.priceUnit}`);
      }
    } else {
      console.log('❌ ERROR AL ENVIAR MENSAJE\n');
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Error Code: ${result.error.code}`);
      console.log(`   Error Message: ${result.error.message}`);
      console.log(`   More Info: ${result.error.moreInfo}`);
      
      if (result.error.code === 21211) {
        console.log('\n💡 Error 21211: Número de destino inválido');
      } else if (result.error.code === 21608) {
        console.log('\n💡 Error 21608: El número no está habilitado para WhatsApp');
      } else if (result.error.code === 20003) {
        console.log('\n💡 Error 20003: Credenciales de autenticación inválidas');
      }
    }
    
    console.log('═'.repeat(50));

    // 6. Test de formateo de número
    console.log('\n📋 5. Test de formateo de números...\n');
    
    const testNumbers = [
      '573138539155',
      '+573138539155',
      '3138539155'
    ];

    testNumbers.forEach(num => {
      try {
        const formatted = whatsappService.formatPhoneNumber(num);
        console.log(`   ${num} → ${formatted}`);
      } catch (error) {
        console.log(`   ${num} → Error: ${error.message}`);
      }
    });

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN LA PRUEBA:');
    console.error(`   Tipo: ${error.name}`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }

  console.log('\n🚀 ===== FIN DEL TEST =====');
}

// Ejecutar test
console.log('Iniciando en 2 segundos...\n');
setTimeout(() => {
  testTwilioWhatsApp();
}, 2000);

