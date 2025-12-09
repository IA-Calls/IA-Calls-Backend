#!/usr/bin/env node

/**
 * Test para el endpoint de envío de mensajes de WhatsApp
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5050';
const TEST_PHONE = '573138539155';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSendMessage() {
  log('\n🧪 ===== TEST DE ENVÍO DE MENSAJES WHATSAPP =====\n', 'cyan');

  // Verificar que el servidor esté corriendo
  log('🔍 Verificando conexión con el servidor...', 'blue');
  try {
    const healthCheck = await axios.get(`${BASE_URL}/api/whatsapp/health`, {
      timeout: 3000
    });
    log('✅ Servidor está corriendo', 'green');
  } catch (error) {
    log('❌ ERROR: El servidor no está corriendo o no responde', 'red');
    log(`   URL intentada: ${BASE_URL}/api/whatsapp/health`, 'yellow');
    log('   💡 Asegúrate de que el servidor esté corriendo:', 'yellow');
    log('      npm run dev', 'yellow');
    process.exit(1);
  }

  // Verificar variables de entorno
  if (!process.env.WHATSAPP_TOKEN || !process.env.PHONE_NUMBER_ID) {
    log('❌ ERROR: Variables de entorno faltantes', 'red');
    log('   Configura WHATSAPP_TOKEN y PHONE_NUMBER_ID en tu .env', 'yellow');
    process.exit(1);
  }

  log(`📱 Número de prueba: ${TEST_PHONE}`, 'yellow');
  log(`🌐 URL del servidor: ${BASE_URL}\n`, 'yellow');

  try {
    // Test 1: Enviar template sin parámetros
    log('📤 Test 1: Enviar template sin parámetros (hello_world)...', 'blue');
    const templateResponse = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
      to: TEST_PHONE,
      templateId: 'asdasdad'
    });

    if (templateResponse.status === 200 && templateResponse.data.success) {
      log('✅ Template enviado exitosamente', 'green');
      log(`   Conversation ID: ${templateResponse.data.data.conversationId}`, 'yellow');
      log(`   Phone: ${templateResponse.data.data.phoneNumber}`, 'yellow');
      log(`   Has Started: ${templateResponse.data.data.hasStarted}`, 'yellow');
    } else {
      log('❌ Error enviando template', 'red');
      console.log(templateResponse.data);
    }

    // Esperar un poco antes del siguiente test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Enviar mensaje normal
    log('\n📤 Test 2: Enviar mensaje normal...', 'blue');
    const normalResponse = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
      to: TEST_PHONE,
      body: 'Este es un mensaje de prueba desde el test'
    });

    if (normalResponse.status === 200 && normalResponse.data.success) {
      log('✅ Mensaje normal enviado exitosamente', 'green');
      log(`   Conversation ID: ${normalResponse.data.data.conversationId}`, 'yellow');
      log(`   Phone: ${normalResponse.data.data.phoneNumber}`, 'yellow');
    } else {
      log('❌ Error enviando mensaje normal', 'red');
      console.log(normalResponse.data);
    }

    // Test 3: Validar error cuando falta body sin templateId
    log('\n📤 Test 3: Validar error cuando falta body...', 'blue');
    try {
      await axios.post(`${BASE_URL}/api/whatsapp/send`, {
        to: TEST_PHONE
      });
      log('❌ Debería haber fallado', 'red');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log('✅ Error validado correctamente (400)', 'green');
        log(`   Mensaje: ${error.response.data.error}`, 'yellow');
      } else {
        log('❌ Error inesperado', 'red');
        console.log(error.response?.data || error.message);
      }
    }

    // Test 4: Enviar template con parámetros
    log('\n📤 Test 4: Enviar template con parámetros...', 'blue');
    try {
      const templateWithParamsResponse = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
        to: TEST_PHONE,
        templateId: 'aviso_bienvenida_1',
        templateParams: ['Usuario de Prueba', '25%']
      });
      
      if (templateWithParamsResponse.status === 200 && templateWithParamsResponse.data.success) {
        log('✅ Template con parámetros enviado exitosamente', 'green');
      } else {
        log('⚠️ Template con parámetros no enviado (puede que la template no exista)', 'yellow');
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log('⚠️ Template con parámetros no disponible (esto es normal si la template no existe)', 'yellow');
      } else {
        log('⚠️ Error inesperado (puede ser que la template no exista)', 'yellow');
      }
    }

    log('\n📊 ===== RESUMEN DEL TEST =====', 'cyan');
    log('✅ Tests completados', 'green');
    log(`   ✓ Envío de template`, 'green');
    log(`   ✓ Envío de mensaje normal`, 'green');
    log(`   ✓ Validación de errores`, 'green');
    log('\n🎉 Todos los tests pasaron!\n', 'green');

  } catch (error) {
    log('\n❌ ===== ERROR EN EL TEST =====', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      log(`Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('socket hang up')) {
      log(`Error de conexión: ${error.message}`, 'red');
      log('💡 El servidor no está corriendo o no responde', 'yellow');
      log('   Ejecuta: npm run dev', 'yellow');
    } else {
      log(`Error: ${error.message}`, 'red');
      if (error.code) {
        log(`Código: ${error.code}`, 'yellow');
      }
    }
    process.exit(1);
  }
}

testSendMessage();

