/**
 * Script de prueba para verificar el monitoreo de llamadas y envío automático de WhatsApp
 * 
 * Este script simula el flujo completo de monitoreo después de un batch call
 */

require('dotenv').config();
const VonageWhatsAppService = require('../src/services/vonageWhatsAppService');
const { elevenlabsService } = require('../src/agents');

// Simular un batch call existente
const mockBatchId = 'test_batch_monitoring_123';

// Mock de recipients con diferentes estados
const mockRecipients = [
  {
    phone_number: '+573138539155',
    name: 'Alejandro Silgado',
    variables: { name: 'Alejandro Silgado' },
    status: 'completed',
    conversation_id: 'conv_test_001'
  }
];

// Función para simular el estado del batch desde ElevenLabs
function createMockBatchStatus(status, completedCount = 0) {
  return {
    success: true,
    data: {
      batch_id: mockBatchId,
      status: status, // 'in_progress', 'completed', etc.
      recipients: mockRecipients.map((r, index) => ({
        ...r,
        status: index < completedCount ? 'completed' : 'in_progress'
      }))
    }
  };
}

// Sobrescribir temporalmente el método getBatchCallStatus
const originalGetBatchCallStatus = elevenlabsService.getBatchCallStatus;

// Función para probar el envío de WhatsApp después de llamada
async function testSendWhatsAppAfterCall() {
  console.log('🧪 ===== PRUEBA DE ENVÍO DE WHATSAPP DESPUÉS DE LLAMADA =====\n');

  try {
    const recipient = mockRecipients[0];
    const batchData = createMockBatchStatus('in_progress').data;

    // Simular el método sendWhatsAppAfterCall
    console.log('📋 Simulando envío de WhatsApp...');
    console.log('📞 Teléfono:', recipient.phone_number);
    console.log('👤 Nombre:', recipient.variables.name);
    console.log('📊 Estado:', recipient.status);
    
    // Formatear número
    let formattedPhone = recipient.phone_number;
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    console.log(`📱 Número formateado: ${formattedPhone}`);

    // Crear mensaje
    const clientName = recipient.variables.name;
    const message = `¡Hola ${clientName}! 👋

Acabamos de tener una conversación telefónica y me gustaría continuar el diálogo contigo por aquí.

Por favor, comparte tus dudas o comentarios para que pueda ayudarte mejor. 😊

---
*IA Calls*`;

    console.log('\n📝 Mensaje preparado:');
    console.log(message);

    // Si está habilitado, enviar mensaje real
    if (process.env.ENABLE_REAL_SEND === 'true') {
      console.log('\n📤 Enviando mensaje real...');
      const whatsappService = new VonageWhatsAppService();
      const result = await whatsappService.sendMessage(formattedPhone, message, clientName);
      
      if (result.success) {
        console.log('✅ Mensaje enviado exitosamente!');
        console.log(`📨 Message ID: ${result.messageId}`);
      } else {
        console.log('❌ Error enviando mensaje:', result.error);
      }
    } else {
      console.log('\n💡 Mensaje de prueba (no enviado). Establece ENABLE_REAL_SEND=true para enviar.');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }

  console.log('\n🧪 ===== FIN DE PRUEBA DE ENVÍO DE WHATSAPP =====');
}

// Función para probar la lógica de detección de llamadas completadas
function testCallCompletionDetection() {
  console.log('\n🧪 ===== PRUEBA DE DETECCIÓN DE LLAMADAS COMPLETADAS =====\n');

  const completedCalls = new Map();
  const testRecipients = [
    { phone_number: '+571234567890', status: 'in_progress' },
    { phone_number: '+571234567891', status: 'completed' },
    { phone_number: '+571234567892', status: 'completed' },
    { phone_number: '+571234567893', status: 'failed' }
  ];

  console.log('📋 Probando detección de llamadas completadas...\n');

  testRecipients.forEach((recipient, index) => {
    const key = recipient.phone_number;
    const isCompleted = recipient.status === 'completed' || recipient.status === 'finished';
    const alreadyProcessed = completedCalls.has(key);

    console.log(`Llamada ${index + 1}:`);
    console.log(`  📞 Teléfono: ${key}`);
    console.log(`  📊 Estado: ${recipient.status}`);
    console.log(`  ✅ ¿Completada?: ${isCompleted}`);
    console.log(`  🔄 ¿Ya procesada?: ${alreadyProcessed}`);

    if (key && isCompleted && !alreadyProcessed) {
      console.log(`  ➡️  DEBERÍA ENVIAR WHATSAPP`);
      completedCalls.set(key, true);
    } else if (alreadyProcessed) {
      console.log(`  ⏭️  Ya procesada, saltando`);
    } else if (!isCompleted) {
      console.log(`  ⏳ Aún no completada`);
    }
    console.log('');
  });

  console.log(`📊 Total llamadas procesadas: ${completedCalls.size}`);
  console.log('\n🧪 ===== FIN DE PRUEBA DE DETECCIÓN =====');
}

// Función principal
async function runTests() {
  console.log('🚀 ===========================================');
  console.log('🚀 PRUEBAS DE MONITOREO DE LLAMADAS');
  console.log('🚀 ===========================================\n');

  // Test 1: Detección de llamadas completadas
  testCallCompletionDetection();

  // Test 2: Envío de WhatsApp
  await testSendWhatsAppAfterCall();

  console.log('\n✅ ===========================================');
  console.log('✅ TODAS LAS PRUEBAS COMPLETADAS');
  console.log('✅ ===========================================');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  testSendWhatsAppAfterCall,
  testCallCompletionDetection,
  runTests
};

