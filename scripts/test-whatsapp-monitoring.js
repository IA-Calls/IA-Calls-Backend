/**
 * Script de prueba para verificar el envío de WhatsApp después de llamadas
 * 
 * Este script simula:
 * 1. Un batch call completado
 * 2. El monitoreo de llamadas
 * 3. El envío de mensajes de WhatsApp
 */

require('dotenv').config();
const axios = require('axios');
const VonageWhatsAppService = require('../src/services/vonageWhatsAppService');
const elevenlabsService = require('../src/agents/elevenlabsService');

// Función para simular un recipient completado
function createMockRecipient(phoneNumber, clientName) {
  return {
    phone_number: phoneNumber,
    name: clientName,
    status: 'completed',
    conversation_id: 'test_conv_123',
    variables: {
      name: clientName
    }
  };
}

// Función para simular datos de batch
function createMockBatchData() {
  return {
    status: 'in_progress',
    batch_id: 'test_batch_123',
    recipients: []
  };
}

// Función principal de prueba
async function testWhatsAppSending() {
  console.log('🧪 ===== INICIO DE PRUEBA DE WHATSAPP =====\n');

  try {
    // Test 1: Verificar servicio de WhatsApp
    console.log('📱 Test 1: Verificando VonageWhatsAppService...');
    const whatsappService = new VonageWhatsAppService();
    
    console.log('✅ VonageWhatsAppService inicializado');
    console.log(`📋 API Key: ${whatsappService.apiKey}`);
    console.log(`📋 Base URL: ${whatsappService.baseUrl}`);
    console.log(`📋 From Number: ${whatsappService.fromNumber}\n`);

    // Test 2: Intentar enviar un mensaje de prueba
    console.log('📱 Test 2: Enviando mensaje de prueba...');
    
    // Número de prueba (reemplaza con tu número para pruebas)
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '573138539155';
    const testClientName = 'Test Cliente';
    
    console.log(`📞 Número de prueba: ${testPhoneNumber}`);
    console.log(`👤 Nombre de prueba: ${testClientName}\n`);

    const testMessage = `¡Hola ${testClientName}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls - Mensaje de Prueba*`;

    console.log('📤 Enviando mensaje...');
    const result = await whatsappService.sendMessage(testPhoneNumber, testMessage, testClientName);
    
    if (result.success) {
      console.log('✅ Mensaje enviado exitosamente!');
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`📊 Status: ${result.status}`);
    } else {
      console.log('❌ Error enviando mensaje:');
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
      console.log(`   Status Code: ${result.statusCode}`);
    }

    console.log('\n📋 Resultado completo:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }

  console.log('\n🧪 ===== FIN DE PRUEBA DE WHATSAPP =====');
}

// Función para probar el formateo de mensajes
async function testMessageFormatting() {
  console.log('\n🧪 ===== INICIO DE PRUEBA DE FORMATEO =====\n');

  try {
    const mockRecipient = createMockRecipient('+573138539155', 'Alejandro Silgado');
    const mockBatchData = createMockBatchData();
    
    console.log('📋 Probando formateo de mensaje...');
    console.log('📋 Recipient:', JSON.stringify(mockRecipient, null, 2));
    
    // Simular el envío como lo haría el sistema
    const formattedPhone = mockRecipient.phone_number.replace('+', '');
    console.log(`📞 Número formateado: ${formattedPhone}`);
    
    const message = `¡Hola ${mockRecipient.variables.name}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls*`;

    console.log('\n📝 Mensaje formateado:');
    console.log(message);
    console.log('\n✅ Formateo exitoso');

  } catch (error) {
    console.error('❌ Error en formateo:', error.message);
  }

  console.log('\n🧪 ===== FIN DE PRUEBA DE FORMATEO =====');
}

// Función para probar el formato de número
function testPhoneNumberFormatting() {
  console.log('\n🧪 ===== INICIO DE PRUEBA DE FORMATEO DE NÚMEROS =====\n');

  const testNumbers = [
    '+573138539155',
    '573138539155',
    '3138539155',
    '03138539155'
  ];

  testNumbers.forEach(num => {
    console.log(`📞 Número original: ${num}`);
    
    let formatted = num;
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    
    console.log(`📱 Número formateado: ${formatted}`);
    console.log('');
  });

  console.log('🧪 ===== FIN DE PRUEBA DE FORMATEO DE NÚMEROS =====');
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 ===========================================');
  console.log('🚀 INICIANDO PRUEBAS DE WHATSAPP');
  console.log('🚀 ===========================================\n');

  // Test 1: Formateo de números
  testPhoneNumberFormatting();

  // Test 2: Formateo de mensajes
  await testMessageFormatting();

  // Test 3: Envío real (comentar si no quieres enviar)
  if (process.env.ENABLE_REAL_SEND === 'true') {
    console.log('\n⚠️  Envío real habilitado, se enviará un mensaje real.');
    console.log('⚠️  Para deshabilitar, no establezcas ENABLE_REAL_SEND=true\n');
    await testWhatsAppSending();
  } else {
    console.log('\n💡 Para enviar mensajes reales, establece ENABLE_REAL_SEND=true');
    console.log('💡 Y configura TEST_PHONE_NUMBER en tu archivo .env\n');
  }

  console.log('\n✅ ===========================================');
  console.log('✅ TODAS LAS PRUEBAS COMPLETADAS');
  console.log('✅ ===========================================');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  testWhatsAppSending,
  testMessageFormatting,
  testPhoneNumberFormatting,
  runAllTests
};

