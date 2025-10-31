/**
 * Test real de WhatsApp - ESTE SCRIPT ENVIARÁ UN MENSAJE REAL
 */

require('dotenv').config();
const VonageWhatsAppService = require('../src/services/vonageWhatsAppService');

async function testRealWhatsApp() {
  console.log('🚀 ===== TEST REAL DE WHATSAPP =====\n');
  console.log('⚠️  ADVERTENCIA: Este test enviará un mensaje real de WhatsApp\n');

  try {
    // 1. Inicializar servicio
    console.log('📱 Inicializando VonageWhatsAppService...');
    const whatsappService = new VonageWhatsAppService();
    console.log(`✅ Servicio inicializado`);
    console.log(`   API Key: ${whatsappService.apiKey}`);
    console.log(`   API Secret: ${whatsappService.apiSecret ? '***' : 'NO CONFIGURADO'}`);
    console.log(`   From Number: ${whatsappService.fromNumber}`);
    console.log(`   Base URL: ${whatsappService.baseUrl}\n`);

    // 2. Número de destino
    const testPhone = '573138539155'; // Tu número para pruebas
    const clientName = 'Alejandro';
    
    console.log(`📞 Enviando mensaje a: ${testPhone}`);
    console.log(`👤 Nombre: ${clientName}\n`);

    // 3. Crear mensaje
    const message = `¡Hola ${clientName}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls - Test Automático*
Fecha: ${new Date().toLocaleString('es-ES')}`;

    console.log('📝 Mensaje a enviar:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
    console.log('');

    // 4. Enviar mensaje
    console.log('📤 Enviando mensaje...\n');
    
    const startTime = Date.now();
    const result = await whatsappService.sendMessage(testPhone, message, clientName);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Tiempo de respuesta: ${duration}ms\n`);

    // 5. Mostrar resultado
    console.log('📨 RESULTADO DEL ENVÍO:');
    console.log('═'.repeat(50));
    
    if (result.success) {
      console.log('✅ ¡MENSAJE ENVIADO EXITOSAMENTE!\n');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ ERROR AL ENVIAR MENSAJE\n');
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Error:`, JSON.stringify(result.error, null, 2));
      
      if (result.statusCode === 401) {
        console.log('\n💡 Error 401: Credenciales inválidas');
        console.log('   Verifica tu VENDOR_API_KEY y VENDOR_API_SECRET en .env');
      } else if (result.statusCode === 404) {
        console.log('\n💡 Error 404: Endpoint no encontrado');
        console.log('   Verifica la URL base de Vonage');
      } else if (result.statusCode === 422) {
        console.log('\n💡 Error 422: Datos inválidos');
        console.log('   Verifica el formato del número de teléfono');
      }
    }
    
    console.log('═'.repeat(50));

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
  testRealWhatsApp();
}, 2000);

