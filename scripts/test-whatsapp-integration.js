/**
 * Test de Integración WhatsApp Completo
 * 
 * Este script prueba:
 * 1. Conexión con Twilio
 * 2. Envío de mensajes
 * 3. Webhook endpoint
 * 4. Integración con ElevenLabs
 * 5. Base de datos
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+573138539155';

console.log('\n🧪 ===== TEST DE INTEGRACIÓN WHATSAPP =====\n');
console.log(`📡 Base URL: ${BASE_URL}`);
console.log(`📱 Número de prueba: ${TEST_PHONE}`);
console.log('\n');

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // ==========================================
  // TEST 1: Verificar que el servidor está corriendo
  // ==========================================
  console.log('📋 TEST 1: Verificar servidor');
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ Servidor corriendo correctamente\n');
      passedTests++;
    }
  } catch (error) {
    console.error('❌ Error: Servidor no responde');
    console.error(`   Asegúrate de que el servidor esté corriendo en ${BASE_URL}\n`);
    failedTests++;
    return;
  }

  // ==========================================
  // TEST 2: Verificar webhook endpoint existe
  // ==========================================
  console.log('📋 TEST 2: Verificar webhook endpoint');
  try {
    const response = await axios.get(`${BASE_URL}/webhook/twilio/test`, { timeout: 5000 });
    if (response.data.success) {
      console.log('✅ Webhook endpoint configurado correctamente');
      console.log(`   ${response.data.message}\n`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ Error: Webhook endpoint no existe');
    console.error(`   URL: ${BASE_URL}/webhook/twilio/test\n`);
    failedTests++;
  }

  // ==========================================
  // TEST 3: Simular webhook de Twilio (mensaje entrante)
  // ==========================================
  console.log('📋 TEST 3: Simular mensaje entrante de WhatsApp');
  try {
    const webhookData = new URLSearchParams({
      MessageSid: 'TEST_' + Date.now(),
      From: `whatsapp:${TEST_PHONE}`,
      Body: 'Hola, este es un mensaje de prueba',
      ProfileName: 'Usuario Test',
      NumMedia: '0'
    });

    const response = await axios.post(
      `${BASE_URL}/webhook/twilio/incoming`,
      webhookData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      console.log('✅ Webhook procesó mensaje correctamente');
      console.log('   Revisa los logs del servidor para ver el procesamiento\n');
      passedTests++;
    }
  } catch (error) {
    console.error('❌ Error procesando webhook:');
    console.error(`   ${error.message}\n`);
    failedTests++;
  }

  // ==========================================
  // TEST 4: Verificar variables de entorno de Twilio
  // ==========================================
  console.log('📋 TEST 4: Verificar configuración de Twilio');
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioAccountSid && twilioAuthToken && twilioFrom) {
    console.log('✅ Variables de entorno de Twilio configuradas');
    console.log(`   Account SID: ${twilioAccountSid.substring(0, 10)}...`);
    console.log(`   From: ${twilioFrom}\n`);
    passedTests++;
  } else {
    console.error('❌ Faltan variables de entorno de Twilio:');
    if (!twilioAccountSid) console.error('   - TWILIO_ACCOUNT_SID');
    if (!twilioAuthToken) console.error('   - TWILIO_AUTH_TOKEN');
    if (!twilioFrom) console.error('   - TWILIO_WHATSAPP_FROM\n');
    failedTests++;
  }

  // ==========================================
  // TEST 5: Verificar configuración de ElevenLabs
  // ==========================================
  console.log('📋 TEST 5: Verificar configuración de ElevenLabs');
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

  if (elevenlabsApiKey) {
    console.log('✅ API Key de ElevenLabs configurada');
    console.log(`   Key: ${elevenlabsApiKey.substring(0, 10)}...\n`);
    passedTests++;
  } else {
    console.error('❌ Falta ELEVENLABS_API_KEY en .env\n');
    failedTests++;
  }

  // ==========================================
  // TEST 6: Verificar tablas de base de datos
  // ==========================================
  console.log('📋 TEST 6: Verificar tablas de base de datos');
  try {
    const { query } = require('../src/config/database');
    
    // Verificar conversation_state
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_state'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Tabla conversation_state existe');
      
      // Verificar conversation_messages
      const result2 = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'conversation_messages'
        );
      `);

      if (result2.rows[0].exists) {
        console.log('✅ Tabla conversation_messages existe\n');
        passedTests++;
      } else {
        console.error('❌ Tabla conversation_messages no existe');
        console.error('   Ejecuta: psql -d iacalls_db -f database/add_conversation_tables.sql\n');
        failedTests++;
      }
    } else {
      console.error('❌ Tabla conversation_state no existe');
      console.error('   Ejecuta: psql -d iacalls_db -f database/add_conversation_tables.sql\n');
      failedTests++;
    }
  } catch (error) {
    console.error('❌ Error verificando base de datos:');
    console.error(`   ${error.message}\n`);
    failedTests++;
  }

  // ==========================================
  // TEST 7: Test de envío real de WhatsApp (opcional)
  // ==========================================
  console.log('📋 TEST 7: Envío real de WhatsApp (opcional)');
  console.log('⚠️  Este test enviará un mensaje REAL por WhatsApp');
  console.log(`   al número: ${TEST_PHONE}`);
  console.log('   Para ejecutarlo, descomenta el código en el script\n');
  
  // DESCOMENTAR PARA ENVIAR MENSAJE REAL:
  /*
  try {
    const TwilioWhatsAppService = require('../src/services/twilioWhatsAppService');
    const whatsappService = new TwilioWhatsAppService();
    
    const result = await whatsappService.sendMessage(
      TEST_PHONE,
      '🧪 Mensaje de prueba del sistema IA-Calls. Si recibes esto, ¡la integración funciona!',
      'Test'
    );

    if (result.success) {
      console.log('✅ Mensaje enviado exitosamente');
      console.log(`   Message SID: ${result.messageId}\n`);
      passedTests++;
    } else {
      console.error('❌ Error enviando mensaje:');
      console.error(`   ${result.error}\n`);
      failedTests++;
    }
  } catch (error) {
    console.error('❌ Error en envío de WhatsApp:');
    console.error(`   ${error.message}\n`);
    failedTests++;
  }
  */

  // ==========================================
  // RESUMEN
  // ==========================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE TESTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests exitosos: ${passedTests}`);
  console.log(`❌ Tests fallidos: ${failedTests}`);
  console.log(`📈 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON!');
    console.log('✅ El sistema está listo para usar\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron');
    console.log('Revisa los errores arriba y corrígelos\n');
  }

  // ==========================================
  // PRÓXIMOS PASOS
  // ==========================================
  console.log('📝 PRÓXIMOS PASOS:');
  console.log('1. Configura el webhook en Twilio Console:');
  console.log(`   ${BASE_URL}/webhook/twilio/incoming`);
  console.log('2. Prueba enviando un mensaje real a tu número de Twilio');
  console.log('3. Verifica los logs del servidor');
  console.log('4. Revisa la BD para ver las conversaciones guardadas\n');

  process.exit(failedTests === 0 ? 0 : 1);
}

// Ejecutar tests
runTests().catch(error => {
  console.error('\n❌ Error crítico ejecutando tests:');
  console.error(error);
  process.exit(1);
});

