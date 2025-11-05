/**
 * Test para verificar que números de 9 dígitos colombianos se formateen correctamente
 */

require('dotenv').config();
const TwilioWhatsAppService = require('../src/services/twilioWhatsAppService');

async function testNumero9Digitos() {
  console.log('🧪 ===== TEST NÚMERO DE 9 DÍGITOS =====\n');

  try {
    const whatsappService = new TwilioWhatsAppService();
    
    // Test con número de 9 dígitos (como el del error)
    const phoneNumber = '306120261';
    const name = 'Test Usuario';
    const message = 'Hola Test Usuario te mandaré la información del evento de manera inmediata';

    console.log(`📞 Número original: ${phoneNumber}`);
    console.log(`📏 Longitud: ${phoneNumber.length} dígitos`);
    console.log(`🔢 Empieza con 3: ${phoneNumber.startsWith('3')}\n`);

    console.log('🚀 Enviando mensaje...\n');
    
    const result = await whatsappService.sendMessage(phoneNumber, message, name);

    if (result.success) {
      console.log('✅ MENSAJE ENVIADO EXITOSAMENTE:\n');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   To: ${result.data?.to || 'N/A'}`);
      
      // Verificar que el número tiene el formato correcto
      if (result.data?.to && result.data.to.includes('+57306120261')) {
        console.log('\n✅ Número formateado correctamente con +57');
      } else {
        console.log(`\n⚠️  Número formateado: ${result.data?.to}`);
        console.log('   Esperado: whatsapp:+57306120261');
      }
    } else {
      console.error('\n❌ ERROR AL ENVIAR:\n');
      console.error(`   Code: ${result.error?.code}`);
      console.error(`   Message: ${result.error?.message}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

testNumero9Digitos()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test falló:', error.message);
    process.exit(1);
  });

