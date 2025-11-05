/**
 * Test directo de Twilio para verificar el envío de WhatsApp
 */

require('dotenv').config();
const twilio = require('twilio');

// Obtener credenciales desde variables de entorno (requeridas)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Validar que las credenciales estén configuradas
if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ ERROR: Faltan credenciales de Twilio en las variables de entorno');
  console.error('   Configura las siguientes variables en tu archivo .env:');
  console.error('   - TWILIO_ACCOUNT_SID');
  console.error('   - TWILIO_AUTH_TOKEN');
  console.error('   - TWILIO_WHATSAPP_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testTwilioDirect() {
  console.log('🧪 ===== TEST DIRECTO DE TWILIO WHATSAPP =====\n');

  try {
    // Número de prueba
    const phoneNumber = '3138539155';
    
    // Formatear número
    let formattedTo = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    const cleanNumber = formattedTo.replace(/\D/g, '');
    
    if (cleanNumber.length === 10 && cleanNumber.startsWith('3')) {
      formattedTo = '+57' + cleanNumber;
    } else {
      formattedTo = '+' + cleanNumber;
    }
    
    formattedTo = 'whatsapp:' + formattedTo;

    console.log(`📞 Número original: ${phoneNumber}`);
    console.log(`📞 Número formateado: ${formattedTo}`);
    console.log(`📨 From: ${fromNumber}`);
    console.log(`💬 Mensaje: "Hola Dr. Alejandro Silgado te mandaré la información del evento de manera inmediata"\n`);

    const message = 'Hola Dr. Alejandro Silgado te mandaré la información del evento de manera inmediata';

    // Preparar payload
    const payload = {
      from: fromNumber,
      body: message,
      to: formattedTo
    };

    console.log('📤 Payload que se enviará a Twilio:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n🚀 Enviando mensaje...\n');

    // Enviar mensaje
    const twilioMessage = await client.messages.create(payload);

    console.log('✅ MENSAJE ENVIADO EXITOSAMENTE:\n');
    console.log(`   SID: ${twilioMessage.sid}`);
    console.log(`   Status: ${twilioMessage.status}`);
    console.log(`   To: ${twilioMessage.to}`);
    console.log(`   From: ${twilioMessage.from}`);
    console.log(`   Date Created: ${twilioMessage.dateCreated}`);
    console.log(`   Date Sent: ${twilioMessage.dateSent || 'No enviado aún'}`);
    console.log(`   Direction: ${twilioMessage.direction}`);
    console.log(`   Error Code: ${twilioMessage.errorCode || 'Ninguno'}`);
    console.log(`   Error Message: ${twilioMessage.errorMessage || 'Ninguno'}`);

    if (twilioMessage.status === 'queued' || twilioMessage.status === 'sent') {
      console.log('\n✅ El mensaje fue aceptado por Twilio');
      console.log('📱 Verifica en tu teléfono si llegó el mensaje');
    } else {
      console.log(`\n⚠️  Estado del mensaje: ${twilioMessage.status}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR AL ENVIAR MENSAJE:\n');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Status: ${error.status}`);
    console.error(`   More Info: ${error.moreInfo || 'N/A'}`);
    
    if (error.code === 21211) {
      console.error('\n💡 Error 21211: Número de destino inválido');
      console.error('   - Verifica que el número esté en formato E.164');
      console.error('   - Debe incluir código de país (ej: +573138539155)');
    } else if (error.code === 21608) {
      console.error('\n💡 Error 21608: El número no está habilitado para WhatsApp');
      console.error('   - El usuario debe iniciar una conversación primero');
    } else if (error.code === 20003) {
      console.error('\n💡 Error 20003: Credenciales de autenticación inválidas');
      console.error('   - Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN');
    }
    
    process.exit(1);
  }
}

testTwilioDirect()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test falló:', error.message);
    process.exit(1);
  });

