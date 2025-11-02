/**
 * Test para el endpoint POST /api/clients/simple
 * Simula cómo llega la información desde la IA (con phone_number como número)
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testEndpointSimple() {
  console.log('🧪 ===== TEST ENDPOINT /api/clients/simple =====\n');

  try {
    // Simular datos como llegan desde la IA (phone_number como número)
    const testData = {
      name: "Dr. Alejandro Silgado",
      phone_number: 3138539155  // Sin comillas, como número
    };

    console.log('📤 Datos enviados (phone_number como número):');
    console.log(JSON.stringify(testData, null, 2));
    console.log(`\n📥 Tipo de phone_number: ${typeof testData.phone_number}`);
    console.log(`📥 Tipo de name: ${typeof testData.name}\n`);

    // Hacer la petición POST
    console.log(`🚀 Enviando POST a ${BASE_URL}/api/clients/simple...\n`);
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/clients/simple`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    const endTime = Date.now();

    console.log(`⏱️  Tiempo de respuesta: ${endTime - startTime}ms\n`);

    // Mostrar respuesta
    console.log('✅ RESPUESTA DEL SERVIDOR:');
    console.log('═'.repeat(60));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    console.log('═'.repeat(60));

    // Verificar respuesta
    if (response.status === 201 && response.data.success) {
      console.log('\n✅ Test exitoso: Cliente creado correctamente');
      console.log(`   - ID del cliente: ${response.data.data.id}`);
      console.log(`   - Nombre: ${response.data.data.name}`);
      console.log(`   - Teléfono: ${response.data.data.phone}`);
      console.log('\n📱 Verifica en los logs del servidor que el WhatsApp se envió correctamente');
    } else {
      console.log('\n⚠️  Test completado pero respuesta inesperada');
    }

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:');
    console.error('═'.repeat(60));
    
    if (error.response) {
      // El servidor respondió con un código de error
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('No se recibió respuesta del servidor');
      console.error('¿Está el servidor corriendo?');
    } else {
      // Error al configurar la petición
      console.error('Error:', error.message);
    }
    console.error('═'.repeat(60));
    process.exit(1);
  }
}

// Ejecutar test
testEndpointSimple()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test falló:', error.message);
    process.exit(1);
  });

