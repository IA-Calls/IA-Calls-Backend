require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testCreateClientInterested() {
  try {
    console.log('🧪 Probando endpoint POST /api/clients/interested\n');
    
    const testData = {
      name: 'Juan Pérez',
      phone_number: '+573001234567'
    };

    console.log('📤 Enviando petición:');
    console.log(`   URL: ${BASE_URL}/api/clients/interested`);
    console.log(`   Método: POST`);
    console.log(`   Body:`, JSON.stringify(testData, null, 2));
    console.log('');

    const response = await axios.post(
      `${BASE_URL}/api/clients/interested`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Respuesta exitosa:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      console.log('\n📋 Datos guardados:');
      console.log(`   - ID: ${response.data.data.id}`);
      console.log(`   - Nombre: ${response.data.data.name}`);
      console.log(`   - Teléfono: ${response.data.data.phoneNumber}`);
      console.log(`   - Data JSON:`, JSON.stringify(response.data.data.data, null, 2));
      console.log(`   - Creado: ${response.data.data.createdAt}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testCreateClientInterested();
}

module.exports = { testCreateClientInterested };

