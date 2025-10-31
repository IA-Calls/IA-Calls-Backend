/**
 * Test Simple - Enviar Mensaje de WhatsApp
 * 
 * Este script envía un mensaje de prueba por WhatsApp
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Número de teléfono para prueba
const NUMERO_PRUEBA = process.env.TEST_PHONE_NUMBER || '+573138539155';

console.log('\n📱 ===== TEST DE ENVÍO DE WHATSAPP =====\n');

async function testEnviarWhatsApp() {
  try {
    // Cargar el servicio
    const TwilioWhatsAppService = require('../src/services/twilioWhatsAppService');
    const whatsappService = new TwilioWhatsAppService();

    console.log(`📞 Enviando mensaje de prueba a: ${NUMERO_PRUEBA}`);
    console.log('⏳ Espera un momento...\n');

    // Enviar mensaje
    const resultado = await whatsappService.sendMessage(
      NUMERO_PRUEBA,
      '🧪 ¡Hola! Este es un mensaje de prueba del sistema IA-Calls.\n\n' +
      'Si recibes este mensaje, significa que:\n' +
      '✅ La integración con Twilio funciona\n' +
      '✅ El servicio de WhatsApp está operativo\n' +
      '✅ Todo está listo para usar\n\n' +
      '¡Responde este mensaje para probar la conversación bidireccional!',
      'Test System'
    );

    if (resultado.success) {
      console.log('✅ ¡MENSAJE ENVIADO EXITOSAMENTE!\n');
      console.log('📊 Detalles:');
      console.log(`   Message SID: ${resultado.messageId}`);
      console.log(`   Status: ${resultado.status}`);
      console.log(`   To: ${resultado.data.to}`);
      console.log(`   From: ${resultado.data.from}\n`);
      
      console.log('📱 Revisa tu WhatsApp, deberías recibir el mensaje');
      console.log('💬 Responde el mensaje para probar la conversación bidireccional\n');
      
      console.log('📝 Si respondes, verás en los logs del servidor:');
      console.log('   📱 Webhook Twilio: ...');
      console.log('   📩 Mensaje recibido de ...');
      console.log('   🤖 Agente respondió ...');
      console.log('   ✅ Respuesta enviada → ...\n');
      
      process.exit(0);
    } else {
      console.error('❌ ERROR ENVIANDO MENSAJE:\n');
      console.error('Detalles del error:');
      console.error(JSON.stringify(resultado.error, null, 2));
      console.error('\n');
      
      console.error('🔍 Posibles causas:');
      console.error('1. Credenciales de Twilio incorrectas');
      console.error('2. Número no autorizado en Sandbox de Twilio');
      console.error('3. Número de origen incorrecto');
      console.error('4. Problema de red\n');
      
      console.error('✅ Soluciones:');
      console.error('1. Verifica tu .env tenga:');
      console.error('   TWILIO_ACCOUNT_SID=AC...');
      console.error('   TWILIO_AUTH_TOKEN=...');
      console.error('   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
      console.error('2. Autoriza tu número en Twilio Sandbox:');
      console.error('   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
      console.error('3. Envía "join <tu-sandbox-code>" al número de Twilio\n');
      
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:\n');
    console.error(error.message);
    console.error('\n');
    console.error(error.stack);
    console.error('\n');
    process.exit(1);
  }
}

// Verificar que existan las variables de entorno
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ ERROR: Faltan variables de entorno de Twilio\n');
  console.error('Asegúrate de tener en tu .env:');
  console.error('');
  console.error('TWILIO_ACCOUNT_SID=AC...');
  console.error('TWILIO_AUTH_TOKEN=...');
  console.error('TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
  console.error('');
  console.error('Encuentra tus credenciales en:');
  console.error('https://console.twilio.com/\n');
  process.exit(1);
}

console.log('✅ Variables de entorno encontradas');
console.log(`   Account SID: ${accountSid.substring(0, 10)}...`);
console.log(`   From: ${fromNumber}\n`);

// Ejecutar test
testEnviarWhatsApp();

